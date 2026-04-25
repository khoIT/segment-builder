// 16-table catalog dataset spec. Each spec defines columns, target row
// count, partition keys, category, game, and optional Trino source ref
// (iceberg.cfm_vn.* — drives phase 02 lineage join even though phase 01
// generates rows synthetically).
//
// Total: 195 columns / ~885K rows across all 16 tables.

export type ColType = 'string' | 'int' | 'bigint' | 'double' | 'date' | 'timestamp' | 'boolean' | 'json';

export type CatalogColumnSpec = {
  name: string;
  type: ColType;
  isPii?: boolean;
  description?: string;
};

// `layer` is the conceptual data-pipeline tier:
//   raw_event — atomic, one row per event (sources for metric calc)
//   aggregate — pre-rolled cube / per-user state (already a metric)
//   master    — wide master_table built from raw_event via mappings
// Metric Builder source picker filters to layer === 'raw_event'.
export type CatalogLayer = 'raw_event' | 'aggregate' | 'master';

export type CatalogTableSpec = {
  id: string;
  name: string;
  game: 'PTG' | 'CFM' | 'BLSTR' | 'TFB' | null;
  category: 'ua_ads' | 'monetization' | 'engagement';
  layer: CatalogLayer;
  partitionKeys: string[];
  rowCount: number;
  sourceKind: 'trino-derived' | 'synthetic';
  sourceRef: string | null;
  description: string;
  columns: CatalogColumnSpec[];
};

// Helper to keep rows readable.
const c = (name: string, type: ColType, opts: Partial<CatalogColumnSpec> = {}): CatalogColumnSpec =>
  ({ name, type, ...opts });

export const CATALOG_SPECS: CatalogTableSpec[] = [
  // ── UA / Ads ────────────────────────────────────────────────────────
  {
    id: 'ad_impression_events',
    name: 'ad_impression_events',
    game: null,
    category: 'ua_ads',
    layer: 'raw_event',
    partitionKeys: ['ds', 'country'],
    rowCount: 485_700,
    sourceKind: 'synthetic',
    sourceRef: null,
    description: 'Per-impression ad event log across networks. Synthetic — no Trino origin.',
    columns: [
      c('ts', 'timestamp'), c('event_id', 'string'), c('user_id', 'string', { isPii: true }),
      c('campaign_id', 'string'), c('ad_unit_id', 'string'), c('placement', 'string'),
      c('country', 'string'), c('device', 'string'), c('os_version', 'string'),
      c('app_version', 'string'), c('network', 'string'), c('revenue_usd', 'double'),
      c('viewability_score', 'double'), c('engagement_score', 'double'), c('fraud_score', 'double'),
    ],
  },
  {
    id: 'installs',
    name: 'installs',
    game: null,
    category: 'ua_ads',
    layer: 'raw_event',
    partitionKeys: ['install_date', 'country'],
    rowCount: 60_000,
    sourceKind: 'synthetic',
    sourceRef: null,
    description: 'New-user attributed installs. No cfm_vn install table; synthetic.',
    columns: [
      c('install_id', 'string'), c('user_id', 'string', { isPii: true }),
      c('install_at', 'timestamp'), c('country', 'string'), c('platform', 'string'),
      c('source', 'string'), c('campaign', 'string'), c('sub_campaign', 'string'),
      c('ad_creative', 'string'), c('install_cost_usd', 'double'),
      c('attribution_window_h', 'int'), c('fraud_flag', 'boolean'),
    ],
  },
  {
    id: 'spend_by_channel',
    name: 'spend_by_channel',
    game: null,
    category: 'ua_ads',
    layer: 'aggregate',
    partitionKeys: ['date', 'channel'],
    rowCount: 7_000,
    sourceKind: 'synthetic',
    sourceRef: null,
    description: 'Daily UA spend rolled up by channel + sub-channel. Synthetic.',
    columns: [
      c('date', 'date'), c('channel', 'string'), c('country', 'string'),
      c('sub_channel', 'string'), c('campaign', 'string'), c('spend_usd', 'double'),
      c('impressions', 'bigint'), c('clicks', 'bigint'), c('ctr', 'double'),
      c('cpi', 'double'), c('cpa', 'double'), c('frequency', 'double'),
    ],
  },
  // ── Monetization ────────────────────────────────────────────────────
  {
    id: 'revenue',
    name: 'revenue',
    game: 'CFM',
    category: 'monetization',
    layer: 'raw_event',
    partitionKeys: ['ds', 'country'],
    rowCount: 100_000,
    sourceKind: 'trino-derived',
    sourceRef: 'iceberg.cfm_vn.etl_recharge',
    description: 'Per-transaction revenue derived from cfm_vn.etl_recharge.',
    columns: [
      c('transaction_id', 'string'), c('user_id', 'string', { isPii: true }),
      c('ts', 'timestamp'), c('country', 'string'), c('platform', 'string'),
      c('product_id', 'string'), c('sku', 'string'), c('currency', 'string'),
      c('amount_local', 'double'), c('amount_usd', 'double'), c('fx_rate', 'double'),
      c('store', 'string'), c('payment_method', 'string'), c('refund_flag', 'boolean'),
    ],
  },
  {
    id: 'monthly_revenue_summary',
    name: 'monthly_revenue_summary',
    game: 'CFM',
    category: 'monetization',
    layer: 'aggregate',
    partitionKeys: ['year', 'month'],
    rowCount: 720,
    sourceKind: 'trino-derived',
    sourceRef: 'iceberg.cfm_vn.etl_recharge',
    description: 'Monthly rollup of revenue by country + game. Aggregate of `revenue`.',
    columns: [
      c('year', 'int'), c('month', 'int'), c('country', 'string'), c('game', 'string'),
      c('gross_usd', 'double'), c('net_usd', 'double'), c('refunds_usd', 'double'),
      c('transactions', 'bigint'), c('paying_users', 'bigint'), c('arppu', 'double'),
      c('fx_impact', 'double'), c('store_share', 'double'),
    ],
  },
  {
    id: 'arpdau_trend',
    name: 'arpdau_trend',
    game: 'CFM',
    category: 'monetization',
    layer: 'aggregate',
    partitionKeys: ['date', 'country'],
    rowCount: 1_830,
    sourceKind: 'trino-derived',
    sourceRef: 'iceberg.cfm_vn.etl_recharge',
    description: 'Daily ARPDAU/ARPPU trend. Join of dau_trend × revenue.',
    columns: [
      c('date', 'date'), c('game', 'string'), c('country', 'string'),
      c('dau', 'bigint'), c('paying_users', 'bigint'), c('revenue_usd', 'double'),
      c('arpdau', 'double'), c('arppu', 'double'), c('paid_share', 'double'),
      c('trend_direction', 'string'),
    ],
  },
  {
    id: 'ltv_by_cohort',
    name: 'ltv_by_cohort',
    game: 'CFM',
    category: 'monetization',
    layer: 'aggregate',
    partitionKeys: ['cohort_date', 'country'],
    rowCount: 4_500,
    sourceKind: 'trino-derived',
    sourceRef: 'iceberg.cfm_vn.etl_recharge',
    description: 'Cohort LTV at d1/d7/d30/d90/d180. Derived from revenue ⨝ installs.',
    columns: [
      c('cohort_date', 'date'), c('country', 'string'), c('platform', 'string'),
      c('source', 'string'), c('cohort_size', 'bigint'),
      c('ltv_d1', 'double'), c('ltv_d7', 'double'), c('ltv_d30', 'double'),
      c('ltv_d90', 'double'), c('ltv_d180', 'double'),
      c('retention_d30', 'double'), c('payer_share', 'double'),
    ],
  },
  {
    id: 'roas_by_cohort',
    name: 'roas_by_cohort',
    game: 'CFM',
    category: 'monetization',
    layer: 'aggregate',
    partitionKeys: ['cohort_date', 'source'],
    rowCount: 4_500,
    sourceKind: 'trino-derived',
    sourceRef: 'iceberg.cfm_vn.etl_recharge',
    description: 'ROAS by cohort × channel at d7/d30/d90. Derived from ltv × spend.',
    columns: [
      c('cohort_date', 'date'), c('country', 'string'), c('source', 'string'),
      c('campaign', 'string'), c('install_cost_usd', 'double'),
      c('revenue_d7', 'double'), c('revenue_d30', 'double'), c('revenue_d90', 'double'),
      c('roas_d7', 'double'), c('roas_d30', 'double'), c('roas_d90', 'double'),
      c('status', 'string'),
    ],
  },
  {
    id: 'payback_analysis',
    name: 'payback_analysis',
    game: 'CFM',
    category: 'monetization',
    layer: 'aggregate',
    partitionKeys: ['cohort_date'],
    rowCount: 4_500,
    sourceKind: 'trino-derived',
    sourceRef: 'iceberg.cfm_vn.etl_recharge',
    description: 'Days-to-payback per cohort × source. Derived from roas_by_cohort.',
    columns: [
      c('cohort_date', 'date'), c('country', 'string'), c('source', 'string'),
      c('install_cost_usd', 'double'), c('ltv_d180', 'double'),
      c('payback_days', 'int'), c('paid_back_pct', 'double'), c('status', 'string'),
      c('projected_full_payback', 'date'), c('confidence', 'double'),
    ],
  },
  {
    id: 'ltv_model_accuracy',
    name: 'ltv_model_accuracy',
    game: null,
    category: 'monetization',
    layer: 'aggregate',
    partitionKeys: ['cohort_date', 'model_version'],
    rowCount: 60,
    sourceKind: 'synthetic',
    sourceRef: null,
    description: 'Predicted vs actual LTV — model accuracy tracking. Synthetic.',
    columns: [
      c('cohort_date', 'date'), c('model_version', 'string'),
      c('predicted_ltv_d30', 'double'), c('actual_ltv_d30', 'double'),
      c('mae', 'double'), c('rmse', 'double'), c('mape', 'double'),
      c('r2', 'double'), c('sample_size', 'bigint'), c('drift_score', 'double'),
    ],
  },
  // ── Engagement ──────────────────────────────────────────────────────
  {
    id: 'sessions',
    name: 'sessions',
    game: 'CFM',
    category: 'engagement',
    layer: 'raw_event',
    partitionKeys: ['ds'],
    rowCount: 80_000,
    sourceKind: 'trino-derived',
    sourceRef: 'iceberg.cfm_vn.etl_login',
    description: 'Per-session log. Derived from cfm_vn.etl_login + etl_logout.',
    columns: [
      c('session_id', 'string'), c('user_id', 'string', { isPii: true }),
      c('ts_start', 'timestamp'), c('ts_end', 'timestamp'),
      c('duration_min', 'double'), c('country', 'string'), c('platform', 'string'),
      c('device', 'string'), c('app_version', 'string'), c('build', 'string'),
      c('region', 'string'), c('app_locale', 'string'), c('churn_flag', 'boolean'),
    ],
  },
  {
    id: 'dau_trend',
    name: 'dau_trend',
    game: 'CFM',
    category: 'engagement',
    layer: 'aggregate',
    partitionKeys: ['date'],
    rowCount: 5_400,
    sourceKind: 'trino-derived',
    sourceRef: 'iceberg.cfm_vn.etl_login',
    description: 'Daily active user trend by country × platform. From cfm_vn.etl_login.',
    columns: [
      c('date', 'date'), c('country', 'string'), c('platform', 'string'),
      c('dau', 'bigint'), c('mau', 'bigint'), c('dau_mau_ratio', 'double'),
      c('new_users', 'bigint'), c('returning_users', 'bigint'),
      c('dormant_returning', 'bigint'), c('install_cohort', 'string'),
      c('organic_share', 'double'), c('paid_share', 'double'),
    ],
  },
  {
    id: 'retention_curve',
    name: 'retention_curve',
    game: 'CFM',
    category: 'engagement',
    layer: 'aggregate',
    partitionKeys: ['cohort_date'],
    rowCount: 1_200,
    sourceKind: 'trino-derived',
    sourceRef: 'iceberg.cfm_vn.std_master_user_profile',
    description: 'Cohort retention curve d0/d1/d3/d7/d14/d30/d60. From master_user_profile.',
    columns: [
      c('cohort_date', 'date'), c('country', 'string'), c('source', 'string'),
      c('d0', 'double'), c('d1', 'double'), c('d3', 'double'),
      c('d7', 'double'), c('d14', 'double'), c('d30', 'double'), c('d60', 'double'),
    ],
  },
  {
    id: 'engagement_analysis',
    name: 'engagement_analysis',
    game: 'CFM',
    category: 'engagement',
    layer: 'aggregate',
    partitionKeys: ['cohort_date', 'tier'],
    rowCount: 50_000,
    sourceKind: 'trino-derived',
    sourceRef: 'iceberg.cfm_vn.etl_game_detail',
    description: 'Per-user engagement summary. Aggregate of cfm_vn.etl_game_detail.',
    columns: [
      c('user_id', 'string', { isPii: true }), c('cohort_date', 'date'),
      c('sessions_d7', 'int'), c('sessions_d30', 'int'), c('avg_session_min', 'double'),
      c('days_active_d7', 'int'), c('days_active_d30', 'int'),
      c('matches_d7', 'int'), c('matches_d30', 'int'),
      c('kills_d7', 'bigint'), c('deaths_d7', 'bigint'),
      c('kd_ratio', 'double'), c('win_rate', 'double'),
      c('churn_score', 'double'), c('tier', 'string'),
    ],
  },
  {
    id: 'conversion_funnel',
    name: 'conversion_funnel',
    game: null,
    category: 'engagement',
    layer: 'aggregate',
    partitionKeys: ['install_date'],
    rowCount: 50_000,
    sourceKind: 'synthetic',
    sourceRef: null,
    description: 'Install → tutorial → first match → first purchase funnel. Synthetic.',
    columns: [
      c('user_id', 'string', { isPii: true }), c('install_at', 'timestamp'),
      c('viewed_tutorial', 'boolean'), c('completed_tutorial', 'boolean'),
      c('first_match', 'timestamp'), c('first_win', 'timestamp'),
      c('first_purchase', 'timestamp'), c('became_dau', 'boolean'),
      c('became_wau', 'boolean'), c('became_mau', 'boolean'),
      c('churned_d7', 'boolean'), c('churned_d30', 'boolean'), c('ltv_tier', 'string'),
    ],
  },
  {
    id: 'churn_signals',
    name: 'churn_signals',
    game: 'CFM',
    category: 'engagement',
    layer: 'aggregate',
    partitionKeys: ['as_of_date'],
    rowCount: 30_000,
    sourceKind: 'trino-derived',
    sourceRef: 'iceberg.cfm_vn.std_master_user_profile',
    description: 'Per-user churn risk signals. From master_user_profile.churn_prob.',
    columns: [
      c('user_id', 'string', { isPii: true }), c('last_active_at', 'timestamp'),
      c('days_since_active', 'int'), c('churn_score', 'double'),
      c('churn_prob_d7', 'double'), c('churn_prob_d30', 'double'),
      c('sessions_trend_30d', 'double'), c('spend_trend_30d', 'double'),
      c('social_score', 'double'), c('content_consumption', 'double'),
      c('dropoff_reason', 'string'), c('tier', 'string'),
      c('intervention_eligible', 'boolean'),
    ],
  },
];

// ── Ballistar variants ──────────────────────────────────────────────
// 8 derived tables cloned from CFM (revenue/sessions/dau_trend/...) and
// re-pointed at iceberg.ballistar. Smaller user pool (~15K) → smaller
// row counts, retuned per game-spec defaults. id prefix `blstr_` keeps
// the per-game physical tables (catalog_blstr_*) collision-free.

const BLSTR_DERIVED_IDS = new Set([
  'revenue', 'sessions', 'dau_trend', 'retention_curve',
  'engagement_analysis', 'churn_signals', 'monthly_revenue_summary',
  'arpdau_trend',
]);

const BLSTR_ROW_SCALE = 0.5;  // ~half the row counts of CFM (15K vs 30K users)

function cfmToBlstr(spec: CatalogTableSpec): CatalogTableSpec {
  const newId = `blstr_${spec.id}`;
  return {
    ...spec,
    id: newId,
    name: `blstr_${spec.name}`,
    game: 'BLSTR',
    rowCount: Math.round(spec.rowCount * BLSTR_ROW_SCALE),
    sourceRef: spec.sourceRef
      ? spec.sourceRef.replace('iceberg.cfm_vn.', 'iceberg.ballistar.')
      : null,
    description: spec.description.replace(/cfm_vn/g, 'ballistar'),
  };
}

const BLSTR_SPECS: CatalogTableSpec[] = CATALOG_SPECS
  .filter((s) => s.game === 'CFM' && BLSTR_DERIVED_IDS.has(s.id))
  .map(cfmToBlstr);

CATALOG_SPECS.push(...BLSTR_SPECS);

// Sanity: 16 + 8 = 24 tables, ~270 columns, ~975K rows.
export const TOTAL_COLUMNS = CATALOG_SPECS.reduce((a, t) => a + t.columns.length, 0);
export const TOTAL_ROWS = CATALOG_SPECS.reduce((a, t) => a + t.rowCount, 0);
