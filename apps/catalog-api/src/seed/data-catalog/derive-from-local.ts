import type { Pool } from 'pg';

// INSERT...SELECT derivations for the 8 catalog tables sourced from
// the local raw_etl_* tables. Now per-game: each derivation accepts a
// game id (e.g. 'cfm', 'blstr') and writes to the per-game catalog
// table. The first run targets the canonical CFM tables (catalog_revenue,
// catalog_sessions, …); subsequent games target catalog_<game>_<name>.
//
// Tables NOT covered here (still synthetic): ad_impression_events,
// installs, spend_by_channel, ltv_model_accuracy, conversion_funnel,
// ltv_by_cohort, roas_by_cohort, payback_analysis. The first 5 have
// no real source; the last 3 mix real revenue with synthetic spend
// and stay synthetic for KISS — easy upgrade later.

const ID_RE = /^[a-z0-9_]+$/;

function safe(name: string): string {
  if (!ID_RE.test(name)) throw new Error(`unsafe identifier: ${name}`);
  return name;
}

export type DerivationName =
  | 'revenue' | 'sessions' | 'dau_trend' | 'retention_curve'
  | 'engagement_analysis' | 'churn_signals' | 'monthly_revenue_summary'
  | 'arpdau_trend';

export const LOCAL_DERIVATIONS = new Set<DerivationName>([
  'revenue', 'sessions', 'dau_trend', 'retention_curve',
  'engagement_analysis', 'churn_signals', 'monthly_revenue_summary',
  'arpdau_trend',
]);

// Build a SQL string for the given derivation, scoped to a game and
// targeting a specific catalog physical table. Identifier-whitelisted
// at every interpolation site.
function sqlFor(name: DerivationName, ctx: { gameId: string; gameCode: string; target: string }): string {
  const gid  = safe(ctx.gameId);     // 'cfm' | 'blstr'
  const code = ctx.gameCode;          // 'CFM' | 'BLSTR' (label, no SQL)
  const tgt  = safe(ctx.target);     // 'catalog_revenue' or 'catalog_blstr_revenue'
  const FILT = `game_id = '${gid}'`; // already-whitelisted

  switch (name) {
    case 'revenue': return `
      INSERT INTO "${tgt}" (
        transaction_id, user_id, ts, country, platform,
        product_id, sku, currency, amount_local, amount_usd, fx_rate,
        store, payment_method, refund_flag
      )
      SELECT
        'txn_' || md5(r.vopenid || r.dteventtime::text),
        r.vopenid, r.dteventtime, p.first_country_code, r.platid,
        r.productid, r.productid, r.currency,
        r.imoney_us * CASE r.currency
          WHEN 'VND' THEN 24500 WHEN 'THB' THEN 35 WHEN 'PHP' THEN 56 ELSE 1 END,
        r.imoney_us,
        CASE r.currency
          WHEN 'VND' THEN 24500 WHEN 'THB' THEN 35 WHEN 'PHP' THEN 56 ELSE 1 END,
        CASE WHEN r.platid = 'ios' THEN 'app_store' ELSE 'play_store' END,
        'card', false
      FROM raw_etl_recharge r
      LEFT JOIN raw_std_master_user_profile p ON p.vopenid = r.vopenid
      WHERE r.${FILT}
      LIMIT 100000`;

    case 'sessions': return `
      INSERT INTO "${tgt}" (
        session_id, user_id, ts_start, ts_end, duration_min,
        country, platform, device, app_version, build, region, app_locale, churn_flag
      )
      SELECT
        'sess_' || md5(l.vopenid || l.dteventtime::text),
        l.vopenid, l.dteventtime,
        l.dteventtime + interval '1 second' * COALESCE(o.onlinetime, 600),
        COALESCE(o.onlinetime, 600) / 60.0,
        l.country, l.platid, l.deviceid,
        l.clientversion, l.clientversion,
        CASE l.country WHEN 'VN' THEN 'SEA' WHEN 'TH' THEN 'SEA' WHEN 'PH' THEN 'SEA'
                       WHEN 'KR' THEN 'EAS' WHEN 'JP' THEN 'EAS' ELSE 'OTHER' END,
        'en-US', false
      FROM raw_etl_login l
      LEFT JOIN LATERAL (
        SELECT onlinetime FROM raw_etl_logout o2
        WHERE o2.vopenid = l.vopenid AND o2.dteventtime > l.dteventtime
          AND o2.${FILT}
        ORDER BY o2.dteventtime ASC LIMIT 1
      ) o ON true
      WHERE l.${FILT}
      LIMIT 80000`;

    case 'dau_trend': return `
      INSERT INTO "${tgt}" (
        date, country, platform, dau, mau, dau_mau_ratio,
        new_users, returning_users, dormant_returning, install_cohort,
        organic_share, paid_share
      )
      SELECT
        ds AS date, country, platid AS platform,
        COUNT(DISTINCT vopenid) AS dau,
        COUNT(DISTINCT vopenid) * 12 AS mau,
        0.083::float8,
        (COUNT(DISTINCT vopenid) * 0.15)::int,
        (COUNT(DISTINCT vopenid) * 0.85)::int,
        (COUNT(DISTINCT vopenid) * 0.05)::int,
        to_char(ds, 'YYYY-MM'), 0.4::float8, 0.6::float8
      FROM raw_etl_login
      WHERE ${FILT}
      GROUP BY ds, country, platid
      ORDER BY ds DESC, country, platid
      LIMIT 5400`;

    case 'retention_curve': return `
      INSERT INTO "${tgt}" (
        cohort_date, country, source, d0, d1, d3, d7, d14, d30, d60
      )
      SELECT
        install_time::date, first_country_code, media_source,
        1.0,
        AVG(CASE WHEN is_retained_d1 THEN 1.0 ELSE 0.0 END),
        AVG(CASE WHEN is_retained_d7 THEN 0.6 ELSE 0.0 END),
        AVG(CASE WHEN is_retained_d7 THEN 1.0 ELSE 0.0 END),
        AVG(CASE WHEN is_retained_d30 THEN 0.6 ELSE 0.0 END),
        AVG(CASE WHEN is_retained_d30 THEN 1.0 ELSE 0.0 END),
        AVG(CASE WHEN is_retained_d30 THEN 0.5 ELSE 0.0 END)
      FROM raw_std_master_user_profile
      WHERE ${FILT}
      GROUP BY install_time::date, first_country_code, media_source
      LIMIT 1200`;

    case 'engagement_analysis': return `
      INSERT INTO "${tgt}" (
        user_id, cohort_date, sessions_d7, sessions_d30, avg_session_min,
        days_active_d7, days_active_d30, matches_d7, matches_d30,
        kills_d7, deaths_d7, kd_ratio, win_rate, churn_score, tier
      )
      SELECT
        g.playeropenid, p.install_time::date,
        COUNT(*) FILTER (WHERE g.dteventtime > NOW() - interval '7 days')::int,
        COUNT(*) FILTER (WHERE g.dteventtime > NOW() - interval '30 days')::int,
        (AVG(g.gameduration) / 60)::float8,
        LEAST(7, COUNT(DISTINCT g.dteventtime::date) FILTER (WHERE g.dteventtime > NOW() - interval '7 days'))::int,
        LEAST(30, COUNT(DISTINCT g.dteventtime::date) FILTER (WHERE g.dteventtime > NOW() - interval '30 days'))::int,
        COUNT(*) FILTER (WHERE g.dteventtime > NOW() - interval '7 days')::int,
        COUNT(*) FILTER (WHERE g.dteventtime > NOW() - interval '30 days')::int,
        SUM(g.killflag) FILTER (WHERE g.dteventtime > NOW() - interval '7 days')::bigint,
        (COUNT(*) FILTER (WHERE g.gameresult = 'lose' AND g.dteventtime > NOW() - interval '7 days'))::bigint,
        CASE WHEN COUNT(*) FILTER (WHERE g.gameresult = 'lose') > 0
             THEN (SUM(g.killflag)::float / COUNT(*) FILTER (WHERE g.gameresult = 'lose'))
             ELSE 0 END,
        (COUNT(*) FILTER (WHERE g.gameresult = 'win'))::float / NULLIF(COUNT(*), 0),
        p.churn_prob,
        CASE WHEN p.total_rev >= 200 THEN 'whale'
             WHEN p.total_rev >= 50  THEN 'dolphin'
             WHEN p.total_rev > 0    THEN 'minnow'
             ELSE 'free' END
      FROM raw_etl_game_detail g
      JOIN raw_std_master_user_profile p ON p.vopenid = g.playeropenid AND p.${FILT}
      WHERE g.${FILT}
      GROUP BY g.playeropenid, p.install_time, p.churn_prob, p.total_rev
      LIMIT 50000`;

    case 'churn_signals': return `
      INSERT INTO "${tgt}" (
        user_id, last_active_at, days_since_active, churn_score,
        churn_prob_d7, churn_prob_d30, sessions_trend_30d, spend_trend_30d,
        social_score, content_consumption, dropoff_reason, tier, intervention_eligible
      )
      SELECT
        vopenid, last_login_time, days_since_active, churn_prob,
        LEAST(1, churn_prob * 1.4), churn_prob,
        0.0 - churn_prob, 0.0 - churn_prob * 0.5,
        (1 - churn_prob), (1 - churn_prob),
        CASE WHEN churn_prob > 0.7 THEN 'low_engagement'
             WHEN churn_prob > 0.4 THEN 'difficulty'
             ELSE 'social' END,
        CASE WHEN total_rev >= 200 THEN 'whale'
             WHEN total_rev >= 50  THEN 'dolphin'
             WHEN total_rev > 0    THEN 'minnow'
             ELSE 'free' END,
        churn_prob > 0.3 AND churn_prob < 0.85
      FROM raw_std_master_user_profile
      WHERE ${FILT} AND churn_prob > 0.1
      ORDER BY churn_prob DESC
      LIMIT 30000`;

    case 'monthly_revenue_summary': return `
      INSERT INTO "${tgt}" (
        year, month, country, game, gross_usd, net_usd, refunds_usd,
        transactions, paying_users, arppu, fx_impact, store_share
      )
      SELECT
        EXTRACT(YEAR FROM r.dteventtime)::int,
        EXTRACT(MONTH FROM r.dteventtime)::int,
        p.first_country_code,
        '${code}' AS game,
        SUM(r.imoney_us),
        SUM(r.imoney_us) * 0.7,
        SUM(r.imoney_us) * 0.02,
        COUNT(*)::bigint,
        COUNT(DISTINCT r.vopenid)::bigint,
        SUM(r.imoney_us) / NULLIF(COUNT(DISTINCT r.vopenid), 0),
        0.95::float8,
        AVG(CASE WHEN r.platid = 'ios' THEN 0.4 ELSE 0.6 END)::float8
      FROM raw_etl_recharge r
      LEFT JOIN raw_std_master_user_profile p ON p.vopenid = r.vopenid
      WHERE r.${FILT}
      GROUP BY 1, 2, 3
      LIMIT 720`;

    case 'arpdau_trend': return `
      INSERT INTO "${tgt}" (
        date, game, country, dau, paying_users, revenue_usd,
        arpdau, arppu, paid_share, trend_direction
      )
      SELECT
        d.ds, '${code}', d.country,
        d.dau, COALESCE(r.paying_users, 0), COALESCE(r.revenue_usd, 0),
        COALESCE(r.revenue_usd, 0) / NULLIF(d.dau, 0),
        COALESCE(r.revenue_usd, 0) / NULLIF(r.paying_users, 0),
        COALESCE(r.paying_users::float / NULLIF(d.dau, 0), 0),
        CASE WHEN COALESCE(r.revenue_usd, 0) > 50 THEN 'up'
             WHEN COALESCE(r.revenue_usd, 0) < 10 THEN 'down'
             ELSE 'flat' END
      FROM (
        SELECT ds, country, COUNT(DISTINCT vopenid) AS dau
        FROM raw_etl_login
        WHERE ${FILT}
        GROUP BY ds, country
      ) d
      LEFT JOIN (
        SELECT r2.ds, p.first_country_code AS country,
               COUNT(DISTINCT r2.vopenid) AS paying_users,
               SUM(r2.imoney_us) AS revenue_usd
        FROM raw_etl_recharge r2
        LEFT JOIN raw_std_master_user_profile p ON p.vopenid = r2.vopenid
        WHERE r2.${FILT}
        GROUP BY r2.ds, p.first_country_code
      ) r ON r.ds = d.ds AND r.country = d.country
      ORDER BY d.ds DESC, d.country
      LIMIT 1830`;
  }
}

export async function deriveFromLocal(
  pool: Pool,
  name: DerivationName,
  ctx: { gameId: string; gameCode: string; target: string },
): Promise<number> {
  const sql = sqlFor(name, ctx);
  const r = await pool.query(sql);
  return r.rowCount ?? 0;
}
