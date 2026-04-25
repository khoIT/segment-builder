// Real cfm_vn bindings derived from the schemas pulled by `pnpm refresh-mocks`
// (committed under infra/trino-mock/data/cfm_vn/*.schema.json). Maps each
// metric to a source_table + columnMap so query-svc TrinoDriver knows
// which physical column to aggregate when QUERY_DRIVER=trino.
//
// Only the cfm-eligible metrics (games includes 'CFM' or 'ALL') get
// overrides here — others stay on the category-default placeholders
// until ptg/tfb recon lands. Everything else falls back to the seed's
// generic binding rule.

export type RealBinding = {
  metricId: string;
  gameId: 'cfm';
  sourceTable: string;            // 'iceberg.cfm_vn.<table>' or '<schema>.<table>'
  masterTable: string | null;
  columnMap: Record<string, string>;
};

// columnMap keys are conventional names the SQL builder looks for:
//   timestamp / event_date — the date column in the source
//   amount / value          — the value column to aggregate
//   user                    — the user identifier column
//   column                  — generic predicate column for criteria
export const REAL_CFM_BINDINGS: RealBinding[] = [
  // Engagement → etl_login (per refreshed schema: dteventtime, vopenid, …)
  { metricId: 'm_sessions_7d',     gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.etl_login', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'dteventtime', event_date: 'ds', user: 'vopenid' } },
  { metricId: 'm_sessions_30d',    gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.etl_login', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'dteventtime', event_date: 'ds', user: 'vopenid' } },
  { metricId: 'm_playtime_7d',     gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.etl_logout', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'dteventtime', event_date: 'ds', user: 'vopenid' } },
  { metricId: 'm_days_active_30d', gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.etl_login', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'dteventtime', event_date: 'ds', user: 'vopenid' } },
  { metricId: 'm_last_seen',       gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.etl_login', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'dteventtime', event_date: 'ds', user: 'vopenid' } },

  // Monetization → etl_recharge
  { metricId: 'm_spend_30d',       gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.etl_recharge', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'dteventtime', event_date: 'ds', user: 'vopenid', amount: 'amount_usd', value: 'amount_usd' } },
  { metricId: 'm_spend_7d',        gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.etl_recharge', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'dteventtime', event_date: 'ds', user: 'vopenid', amount: 'amount_usd', value: 'amount_usd' } },
  { metricId: 'm_ltv',             gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.etl_recharge', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'dteventtime', event_date: 'ds', user: 'vopenid', amount: 'amount_usd', value: 'amount_usd' } },
  { metricId: 'm_first_purchase',  gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.etl_recharge', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'dteventtime', event_date: 'ds', user: 'vopenid' } },

  // Match grain → etl_game_detail
  { metricId: 'm_quests_7d',       gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.etl_game_detail', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'dteventtime', event_date: 'ds', user: 'vopenid' } },
  { metricId: 'm_rank_tier',       gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.etl_game_detail', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'dteventtime', event_date: 'ds', user: 'vopenid', column: 'rank_tier' } },

  // Master profile → std_master_user_profile (for retention + propensity)
  { metricId: 'm_d1_retained',     gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.std_master_user_profile', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'install_time', user: 'vopenid', column: 'is_retained_d1' } },
  { metricId: 'm_dormant_days',    gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.etl_login', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'dteventtime', event_date: 'ds', user: 'vopenid' } },

  // Propensity (CFM-specific)
  { metricId: 'm_whale_prob_cfm',  gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.std_master_user_profile', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'install_time', user: 'vopenid', column: 'whale_prob' } },
  { metricId: 'm_churn_cfm',       gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.std_master_user_profile', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'install_time', user: 'vopenid', column: 'churn_prob' } },
  { metricId: 'm_return_prob_cfm', gameId: 'cfm', sourceTable: 'iceberg.cfm_vn.std_master_user_profile', masterTable: 'iceberg.cfm_vn.std_master_user_profile',
    columnMap: { timestamp: 'install_time', user: 'vopenid', column: 'reactivation_prob' } },
];

export const REAL_BINDING_KEYS = new Set(
  REAL_CFM_BINDINGS.map((b) => `${b.metricId}::${b.gameId}`),
);
