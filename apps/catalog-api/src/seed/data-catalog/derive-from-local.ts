import type { Pool } from 'pg';

// Per-game raw → catalog SQL. Each derivation is now an explicit
// PipelineSpec (id, name, sources, target, sql) so the orchestrator can
// (a) run the INSERT, (b) record a `pipelines` row that the new
// Pipelines page can render. CFM SQL reads from raw_cfm_*; BLSTR SQL
// reads from raw_blstr_* (different column names — Trino-faithful).

const ID_RE = /^[a-z0-9_]+$/;
function safe(name: string): string {
  if (!ID_RE.test(name)) throw new Error(`unsafe identifier: ${name}`);
  return name;
}

export type PipelineSpec = {
  id: string;                  // 'pipe_cfm_revenue'
  name: string;
  gameId: 'cfm' | 'blstr';
  catalogId: string;           // target catalog_tables.id (e.g. 'revenue', 'blstr_revenue')
  sourceTables: string[];      // raw_<game>_<table>[]
  sql: string;                 // INSERT ... SELECT ... that materialises catalog_<id>
};

const TARGET = (catalogId: string) => `catalog_${safe(catalogId)}`;

// ── CFM derivations ──────────────────────────────────────────────
function cfmRevenue(): PipelineSpec {
  const tgt = TARGET('revenue');
  return {
    id: 'pipe_cfm_revenue',
    name: 'CFM revenue (per-transaction)',
    gameId: 'cfm',
    catalogId: 'revenue',
    sourceTables: ['raw_cfm_etl_recharge', 'raw_cfm_std_master_user_profile'],
    sql: `
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
      FROM raw_cfm_etl_recharge r
      LEFT JOIN raw_cfm_std_master_user_profile p ON p.vopenid = r.vopenid
      LIMIT 100000`.trim(),
  };
}

function cfmSessions(): PipelineSpec {
  const tgt = TARGET('sessions');
  return {
    id: 'pipe_cfm_sessions',
    name: 'CFM sessions (login + logout join)',
    gameId: 'cfm',
    catalogId: 'sessions',
    sourceTables: ['raw_cfm_etl_login', 'raw_cfm_etl_logout'],
    sql: `
      INSERT INTO "${tgt}" (
        session_id, user_id, ts_start, ts_end, duration_min,
        country, platform, device, app_version, build, region, app_locale, churn_flag
      )
      SELECT
        'sess_' || md5(l.vopenid || l.dteventtime::text),
        l.vopenid, l.dteventtime,
        l.dteventtime + interval '1 second' * COALESCE(NULLIF(o.onlinetime,'')::int, 600),
        COALESCE(NULLIF(o.onlinetime,'')::int, 600) / 60.0,
        l.country, l.platid, l.deviceid,
        l.clientversion, l.clientversion,
        CASE l.country WHEN 'VN' THEN 'SEA' WHEN 'TH' THEN 'SEA' WHEN 'PH' THEN 'SEA'
                       WHEN 'KR' THEN 'EAS' WHEN 'JP' THEN 'EAS' ELSE 'OTHER' END,
        'en-US', false
      FROM raw_cfm_etl_login l
      LEFT JOIN LATERAL (
        SELECT onlinetime FROM raw_cfm_etl_logout o2
        WHERE o2.vopenid = l.vopenid AND o2.dteventtime > l.dteventtime
        ORDER BY o2.dteventtime ASC LIMIT 1
      ) o ON true
      LIMIT 80000`.trim(),
  };
}

function cfmDauTrend(): PipelineSpec {
  const tgt = TARGET('dau_trend');
  return {
    id: 'pipe_cfm_dau_trend',
    name: 'CFM DAU trend (daily login rollup)',
    gameId: 'cfm',
    catalogId: 'dau_trend',
    sourceTables: ['raw_cfm_etl_login'],
    sql: `
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
      FROM raw_cfm_etl_login
      GROUP BY ds, country, platid
      ORDER BY ds DESC, country, platid
      LIMIT 5400`.trim(),
  };
}

function cfmRetentionCurve(): PipelineSpec {
  const tgt = TARGET('retention_curve');
  return {
    id: 'pipe_cfm_retention_curve',
    name: 'CFM retention curve (cohort d0/d1/.../d60)',
    gameId: 'cfm',
    catalogId: 'retention_curve',
    sourceTables: ['raw_cfm_std_master_user_profile'],
    sql: `
      INSERT INTO "${tgt}" (
        cohort_date, country, source, d0, d1, d3, d7, d14, d30, d60
      )
      SELECT
        install_time::date, first_country_code, media_source,
        1.0,
        AVG(CASE WHEN last_login_time > install_time + interval '1 day' THEN 1.0 ELSE 0.0 END),
        AVG(CASE WHEN last_login_time > install_time + interval '3 days' THEN 0.7 ELSE 0.0 END),
        AVG(CASE WHEN last_login_time > install_time + interval '7 days' THEN 0.5 ELSE 0.0 END),
        AVG(CASE WHEN last_login_time > install_time + interval '14 days' THEN 0.4 ELSE 0.0 END),
        AVG(CASE WHEN last_login_time > install_time + interval '30 days' THEN 0.3 ELSE 0.0 END),
        AVG(CASE WHEN last_login_time > install_time + interval '60 days' THEN 0.2 ELSE 0.0 END)
      FROM raw_cfm_std_master_user_profile
      WHERE install_time IS NOT NULL
      GROUP BY install_time::date, first_country_code, media_source
      LIMIT 1200`.trim(),
  };
}

function cfmEngagementAnalysis(): PipelineSpec {
  const tgt = TARGET('engagement_analysis');
  return {
    id: 'pipe_cfm_engagement_analysis',
    name: 'CFM engagement analysis (per-user game-detail rollup)',
    gameId: 'cfm',
    catalogId: 'engagement_analysis',
    sourceTables: ['raw_cfm_etl_game_detail', 'raw_cfm_std_master_user_profile'],
    sql: `
      INSERT INTO "${tgt}" (
        user_id, cohort_date, sessions_d7, sessions_d30, avg_session_min,
        days_active_d7, days_active_d30, matches_d7, matches_d30,
        kills_d7, deaths_d7, kd_ratio, win_rate, churn_score, tier
      )
      SELECT
        g.playeropenid, p.install_time::date,
        COUNT(*) FILTER (WHERE g.dteventtime > NOW() - interval '7 days')::int,
        COUNT(*) FILTER (WHERE g.dteventtime > NOW() - interval '30 days')::int,
        (AVG(NULLIF(g.gameduration, '')::int) / 60)::float8,
        LEAST(7, COUNT(DISTINCT g.dteventtime::date) FILTER (WHERE g.dteventtime > NOW() - interval '7 days'))::int,
        LEAST(30, COUNT(DISTINCT g.dteventtime::date) FILTER (WHERE g.dteventtime > NOW() - interval '30 days'))::int,
        COUNT(*) FILTER (WHERE g.dteventtime > NOW() - interval '7 days')::int,
        COUNT(*) FILTER (WHERE g.dteventtime > NOW() - interval '30 days')::int,
        SUM(NULLIF(g.killflag, '')::int) FILTER (WHERE g.dteventtime > NOW() - interval '7 days')::bigint,
        (COUNT(*) FILTER (WHERE g.gameresult = 'lose' AND g.dteventtime > NOW() - interval '7 days'))::bigint,
        CASE WHEN COUNT(*) FILTER (WHERE g.gameresult = 'lose') > 0
             THEN (SUM(NULLIF(g.killflag,'')::int)::float / NULLIF(COUNT(*) FILTER (WHERE g.gameresult = 'lose'), 0))
             ELSE 0 END,
        (COUNT(*) FILTER (WHERE g.gameresult = 'win'))::float / NULLIF(COUNT(*), 0),
        0.0,
        'free'
      FROM raw_cfm_etl_game_detail g
      LEFT JOIN raw_cfm_std_master_user_profile p ON p.vopenid = g.playeropenid
      GROUP BY g.playeropenid, p.install_time
      LIMIT 50000`.trim(),
  };
}

function cfmChurnSignals(): PipelineSpec {
  const tgt = TARGET('churn_signals');
  return {
    id: 'pipe_cfm_churn_signals',
    name: 'CFM churn signals (per-user risk score)',
    gameId: 'cfm',
    catalogId: 'churn_signals',
    sourceTables: ['raw_cfm_std_master_user_profile'],
    sql: `
      INSERT INTO "${tgt}" (
        user_id, last_active_at, days_since_active, churn_score,
        churn_prob_d7, churn_prob_d30, sessions_trend_30d, spend_trend_30d,
        social_score, content_consumption, dropoff_reason, tier, intervention_eligible
      )
      SELECT
        vopenid,
        last_login_time,
        GREATEST(0, EXTRACT(DAY FROM NOW() - last_login_time))::int,
        LEAST(1, EXTRACT(DAY FROM NOW() - last_login_time) / 180.0)::float8,
        LEAST(1, EXTRACT(DAY FROM NOW() - last_login_time) / 100.0)::float8,
        LEAST(1, EXTRACT(DAY FROM NOW() - last_login_time) / 180.0)::float8,
        0.0, 0.0, 0.5, 0.5,
        CASE WHEN EXTRACT(DAY FROM NOW() - last_login_time) > 60 THEN 'low_engagement'
             WHEN EXTRACT(DAY FROM NOW() - last_login_time) > 14 THEN 'difficulty'
             ELSE 'social' END,
        CASE WHEN total_rev >= 200 THEN 'whale'
             WHEN total_rev >= 50  THEN 'dolphin'
             WHEN total_rev > 0    THEN 'minnow'
             ELSE 'free' END,
        EXTRACT(DAY FROM NOW() - last_login_time) BETWEEN 14 AND 90
      FROM raw_cfm_std_master_user_profile
      WHERE last_login_time IS NOT NULL
      ORDER BY last_login_time ASC
      LIMIT 30000`.trim(),
  };
}

function cfmMonthlyRevenueSummary(): PipelineSpec {
  const tgt = TARGET('monthly_revenue_summary');
  return {
    id: 'pipe_cfm_monthly_revenue_summary',
    name: 'CFM monthly revenue summary (country × month)',
    gameId: 'cfm',
    catalogId: 'monthly_revenue_summary',
    sourceTables: ['raw_cfm_etl_recharge', 'raw_cfm_std_master_user_profile'],
    sql: `
      INSERT INTO "${tgt}" (
        year, month, country, game, gross_usd, net_usd, refunds_usd,
        transactions, paying_users, arppu, fx_impact, store_share
      )
      SELECT
        EXTRACT(YEAR FROM r.dteventtime)::int,
        EXTRACT(MONTH FROM r.dteventtime)::int,
        p.first_country_code,
        'CFM' AS game,
        SUM(r.imoney_us),
        SUM(r.imoney_us) * 0.7,
        SUM(r.imoney_us) * 0.02,
        COUNT(*)::bigint,
        COUNT(DISTINCT r.vopenid)::bigint,
        SUM(r.imoney_us) / NULLIF(COUNT(DISTINCT r.vopenid), 0),
        0.95::float8,
        AVG(CASE WHEN r.platid = 'ios' THEN 0.4 ELSE 0.6 END)::float8
      FROM raw_cfm_etl_recharge r
      LEFT JOIN raw_cfm_std_master_user_profile p ON p.vopenid = r.vopenid
      GROUP BY 1, 2, 3
      LIMIT 720`.trim(),
  };
}

function cfmArpdauTrend(): PipelineSpec {
  const tgt = TARGET('arpdau_trend');
  return {
    id: 'pipe_cfm_arpdau_trend',
    name: 'CFM ARPDAU trend (daily login × revenue)',
    gameId: 'cfm',
    catalogId: 'arpdau_trend',
    sourceTables: ['raw_cfm_etl_login', 'raw_cfm_etl_recharge', 'raw_cfm_std_master_user_profile'],
    sql: `
      INSERT INTO "${tgt}" (
        date, game, country, dau, paying_users, revenue_usd,
        arpdau, arppu, paid_share, trend_direction
      )
      SELECT
        d.ds, 'CFM', d.country,
        d.dau, COALESCE(r.paying_users, 0), COALESCE(r.revenue_usd, 0),
        COALESCE(r.revenue_usd, 0) / NULLIF(d.dau, 0),
        COALESCE(r.revenue_usd, 0) / NULLIF(r.paying_users, 0),
        COALESCE(r.paying_users::float / NULLIF(d.dau, 0), 0),
        CASE WHEN COALESCE(r.revenue_usd, 0) > 50 THEN 'up'
             WHEN COALESCE(r.revenue_usd, 0) < 10 THEN 'down'
             ELSE 'flat' END
      FROM (
        SELECT ds, country, COUNT(DISTINCT vopenid) AS dau
        FROM raw_cfm_etl_login
        GROUP BY ds, country
      ) d
      LEFT JOIN (
        SELECT r2.ds, p.first_country_code AS country,
               COUNT(DISTINCT r2.vopenid) AS paying_users,
               SUM(r2.imoney_us) AS revenue_usd
        FROM raw_cfm_etl_recharge r2
        LEFT JOIN raw_cfm_std_master_user_profile p ON p.vopenid = r2.vopenid
        GROUP BY r2.ds, p.first_country_code
      ) r ON r.ds = d.ds AND r.country = d.country
      ORDER BY d.ds DESC, d.country
      LIMIT 1830`.trim(),
  };
}

// ── BLSTR derivations (ballistar Trino columns: account_id, login_time, …) ──
function blstrRevenue(): PipelineSpec {
  const tgt = TARGET('blstr_revenue');
  return {
    id: 'pipe_blstr_revenue',
    name: 'Ballistar revenue (per-transaction)',
    gameId: 'blstr',
    catalogId: 'blstr_revenue',
    sourceTables: ['raw_blstr_etl_recharge', 'raw_blstr_std_master_user_profile'],
    sql: `
      INSERT INTO "${tgt}" (
        transaction_id, user_id, ts, country, platform,
        product_id, sku, currency, amount_local, amount_usd, fx_rate,
        store, payment_method, refund_flag
      )
      SELECT
        COALESCE(r.transaction_id, 'txn_' || md5(r.account_id || r.recharge_time::text)),
        r.account_id, r.recharge_time, r.country_code, lower(r.os_platform),
        r.product_id, r.product_id, r.money_type,
        r.charged_value, r.charged_value, 1.0,
        CASE WHEN r.os_platform ILIKE 'ios' THEN 'app_store' ELSE 'play_store' END,
        r.payment_channel, false
      FROM raw_blstr_etl_recharge r
      LEFT JOIN raw_blstr_std_master_user_profile p ON p.user_id = r.account_id
      LIMIT 100000`.trim(),
  };
}

function blstrSessions(): PipelineSpec {
  const tgt = TARGET('blstr_sessions');
  return {
    id: 'pipe_blstr_sessions',
    name: 'Ballistar sessions (login + logout join)',
    gameId: 'blstr',
    catalogId: 'blstr_sessions',
    sourceTables: ['raw_blstr_etl_login', 'raw_blstr_etl_logout'],
    sql: `
      INSERT INTO "${tgt}" (
        session_id, user_id, ts_start, ts_end, duration_min,
        country, platform, device, app_version, build, region, app_locale, churn_flag
      )
      SELECT
        'sess_' || md5(l.account_id || l.login_time::text),
        l.account_id, l.login_time,
        l.login_time + interval '1 second' * COALESCE(o.online_time, 600),
        COALESCE(o.online_time, 600) / 60.0,
        l.country_code, lower(l.os_platform), l.device_name,
        l.os_version, l.os_version,
        CASE l.country_code WHEN 'VN' THEN 'SEA' WHEN 'TH' THEN 'SEA' WHEN 'PH' THEN 'SEA'
                            WHEN 'KR' THEN 'EAS' WHEN 'JP' THEN 'EAS' ELSE 'OTHER' END,
        'en-US', false
      FROM raw_blstr_etl_login l
      LEFT JOIN LATERAL (
        SELECT online_time FROM raw_blstr_etl_logout o2
        WHERE o2.account_id = l.account_id AND o2.logout_time > l.login_time
        ORDER BY o2.logout_time ASC LIMIT 1
      ) o ON true
      LIMIT 80000`.trim(),
  };
}

function blstrDauTrend(): PipelineSpec {
  const tgt = TARGET('blstr_dau_trend');
  return {
    id: 'pipe_blstr_dau_trend',
    name: 'Ballistar DAU trend (daily login rollup)',
    gameId: 'blstr',
    catalogId: 'blstr_dau_trend',
    sourceTables: ['raw_blstr_etl_login'],
    sql: `
      INSERT INTO "${tgt}" (
        date, country, platform, dau, mau, dau_mau_ratio,
        new_users, returning_users, dormant_returning, install_cohort,
        organic_share, paid_share
      )
      SELECT
        ds AS date, country_code, lower(os_platform) AS platform,
        COUNT(DISTINCT account_id) AS dau,
        COUNT(DISTINCT account_id) * 12 AS mau,
        0.083::float8,
        (COUNT(DISTINCT account_id) * 0.15)::int,
        (COUNT(DISTINCT account_id) * 0.85)::int,
        (COUNT(DISTINCT account_id) * 0.05)::int,
        to_char(ds, 'YYYY-MM'), 0.4::float8, 0.6::float8
      FROM raw_blstr_etl_login
      GROUP BY ds, country_code, lower(os_platform)
      ORDER BY ds DESC, country_code
      LIMIT 5400`.trim(),
  };
}

function blstrRetentionCurve(): PipelineSpec {
  const tgt = TARGET('blstr_retention_curve');
  return {
    id: 'pipe_blstr_retention_curve',
    name: 'Ballistar retention curve (cohort)',
    gameId: 'blstr',
    catalogId: 'blstr_retention_curve',
    sourceTables: ['raw_blstr_std_master_user_profile'],
    sql: `
      INSERT INTO "${tgt}" (
        cohort_date, country, source, d0, d1, d3, d7, d14, d30, d60
      )
      SELECT
        install_time::date, first_country_code, media_source,
        1.0,
        AVG(CASE WHEN last_login_time > install_time + interval '1 day'  THEN 1.0 ELSE 0.0 END),
        AVG(CASE WHEN last_login_time > install_time + interval '3 days' THEN 0.7 ELSE 0.0 END),
        AVG(CASE WHEN last_login_time > install_time + interval '7 days' THEN 0.5 ELSE 0.0 END),
        AVG(CASE WHEN last_login_time > install_time + interval '14 days' THEN 0.4 ELSE 0.0 END),
        AVG(CASE WHEN last_login_time > install_time + interval '30 days' THEN 0.3 ELSE 0.0 END),
        AVG(CASE WHEN last_login_time > install_time + interval '60 days' THEN 0.2 ELSE 0.0 END)
      FROM raw_blstr_std_master_user_profile
      WHERE install_time IS NOT NULL
      GROUP BY install_time::date, first_country_code, media_source
      LIMIT 1200`.trim(),
  };
}

function blstrChurnSignals(): PipelineSpec {
  const tgt = TARGET('blstr_churn_signals');
  return {
    id: 'pipe_blstr_churn_signals',
    name: 'Ballistar churn signals',
    gameId: 'blstr',
    catalogId: 'blstr_churn_signals',
    sourceTables: ['raw_blstr_std_master_user_profile'],
    sql: `
      INSERT INTO "${tgt}" (
        user_id, last_active_at, days_since_active, churn_score,
        churn_prob_d7, churn_prob_d30, sessions_trend_30d, spend_trend_30d,
        social_score, content_consumption, dropoff_reason, tier, intervention_eligible
      )
      SELECT
        user_id,
        last_login_time,
        GREATEST(0, EXTRACT(DAY FROM NOW() - last_login_time))::int,
        LEAST(1, EXTRACT(DAY FROM NOW() - last_login_time) / 180.0)::float8,
        LEAST(1, EXTRACT(DAY FROM NOW() - last_login_time) / 100.0)::float8,
        LEAST(1, EXTRACT(DAY FROM NOW() - last_login_time) / 180.0)::float8,
        0.0, 0.0, 0.5, 0.5,
        CASE WHEN EXTRACT(DAY FROM NOW() - last_login_time) > 60 THEN 'low_engagement'
             WHEN EXTRACT(DAY FROM NOW() - last_login_time) > 14 THEN 'difficulty'
             ELSE 'social' END,
        CASE WHEN COALESCE(total_rev, 0) >= 200 THEN 'whale'
             WHEN COALESCE(total_rev, 0) >= 50  THEN 'dolphin'
             WHEN COALESCE(total_rev, 0) > 0    THEN 'minnow'
             ELSE 'free' END,
        EXTRACT(DAY FROM NOW() - last_login_time) BETWEEN 14 AND 90
      FROM raw_blstr_std_master_user_profile
      WHERE last_login_time IS NOT NULL
      ORDER BY last_login_time ASC
      LIMIT 30000`.trim(),
  };
}

function blstrMonthlyRevenueSummary(): PipelineSpec {
  const tgt = TARGET('blstr_monthly_revenue_summary');
  return {
    id: 'pipe_blstr_monthly_revenue_summary',
    name: 'Ballistar monthly revenue summary',
    gameId: 'blstr',
    catalogId: 'blstr_monthly_revenue_summary',
    sourceTables: ['raw_blstr_etl_recharge', 'raw_blstr_std_master_user_profile'],
    sql: `
      INSERT INTO "${tgt}" (
        year, month, country, game, gross_usd, net_usd, refunds_usd,
        transactions, paying_users, arppu, fx_impact, store_share
      )
      SELECT
        EXTRACT(YEAR FROM r.recharge_time)::int,
        EXTRACT(MONTH FROM r.recharge_time)::int,
        r.country_code,
        'BLSTR' AS game,
        SUM(r.charged_value),
        SUM(r.charged_value) * 0.7,
        SUM(r.charged_value) * 0.02,
        COUNT(*)::bigint,
        COUNT(DISTINCT r.account_id)::bigint,
        SUM(r.charged_value) / NULLIF(COUNT(DISTINCT r.account_id), 0),
        0.95::float8,
        AVG(CASE WHEN r.os_platform ILIKE 'ios' THEN 0.4 ELSE 0.6 END)::float8
      FROM raw_blstr_etl_recharge r
      GROUP BY 1, 2, 3
      LIMIT 720`.trim(),
  };
}

function blstrArpdauTrend(): PipelineSpec {
  const tgt = TARGET('blstr_arpdau_trend');
  return {
    id: 'pipe_blstr_arpdau_trend',
    name: 'Ballistar ARPDAU trend',
    gameId: 'blstr',
    catalogId: 'blstr_arpdau_trend',
    sourceTables: ['raw_blstr_etl_login', 'raw_blstr_etl_recharge'],
    sql: `
      INSERT INTO "${tgt}" (
        date, game, country, dau, paying_users, revenue_usd,
        arpdau, arppu, paid_share, trend_direction
      )
      SELECT
        d.ds, 'BLSTR', d.country,
        d.dau, COALESCE(r.paying_users, 0), COALESCE(r.revenue_usd, 0),
        COALESCE(r.revenue_usd, 0) / NULLIF(d.dau, 0),
        COALESCE(r.revenue_usd, 0) / NULLIF(r.paying_users, 0),
        COALESCE(r.paying_users::float / NULLIF(d.dau, 0), 0),
        CASE WHEN COALESCE(r.revenue_usd, 0) > 50 THEN 'up'
             WHEN COALESCE(r.revenue_usd, 0) < 10 THEN 'down'
             ELSE 'flat' END
      FROM (
        SELECT ds, country_code AS country, COUNT(DISTINCT account_id) AS dau
        FROM raw_blstr_etl_login
        GROUP BY ds, country_code
      ) d
      LEFT JOIN (
        SELECT ds, country_code AS country,
               COUNT(DISTINCT account_id) AS paying_users,
               SUM(charged_value) AS revenue_usd
        FROM raw_blstr_etl_recharge
        GROUP BY ds, country_code
      ) r ON r.ds = d.ds AND r.country = d.country
      ORDER BY d.ds DESC, d.country
      LIMIT 1830`.trim(),
  };
}

// Registry — every catalog table that comes from a real raw → catalog
// derivation. ad_impression_events, installs, spend_by_channel,
// ltv_*, payback, ltv_model_accuracy, conversion_funnel stay synthetic
// (no upstream Trino source today).
export const ALL_PIPELINES: PipelineSpec[] = [
  cfmRevenue(),
  cfmSessions(),
  cfmDauTrend(),
  cfmRetentionCurve(),
  cfmEngagementAnalysis(),
  cfmChurnSignals(),
  cfmMonthlyRevenueSummary(),
  cfmArpdauTrend(),
  blstrRevenue(),
  blstrSessions(),
  blstrDauTrend(),
  blstrRetentionCurve(),
  blstrChurnSignals(),
  blstrMonthlyRevenueSummary(),
  blstrArpdauTrend(),
];

export const PIPELINE_BY_CATALOG_ID = new Map<string, PipelineSpec>(
  ALL_PIPELINES.map((p) => [p.catalogId, p]),
);

// Run a single pipeline's INSERT INTO. Returns rows inserted.
export async function runPipeline(pool: Pool, spec: PipelineSpec): Promise<number> {
  const r = await pool.query(spec.sql);
  return r.rowCount ?? 0;
}
