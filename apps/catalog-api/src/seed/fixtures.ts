// Hand-translated subset of apps/web/src/{data.jsx,bedrockData.jsx}.
// Just enough records to populate every page in the prototype with
// realistic shape. Phase 06 (Trino recon) updates `metric_source_bindings`
// with real source_table + column_map values after DESCRIBE-ing the
// real iceberg schemas.

export const GAMES = [
  { id: 'ptg',   code: 'PTG',   name: 'Play Together',    short: 'PTG',   color: '#f05a22', players: '2.4M DAU', genre: 'Social sandbox',  trinoSchema: 'ptg_vn' },
  { id: 'cfm',   code: 'CFM',   name: 'CrossFire Mobile', short: 'CFM',   color: '#dc2626', players: '1.8M DAU', genre: 'FPS',              trinoSchema: 'cfm_vn' },
  { id: 'blstr', code: 'BLSTR', name: 'Ballistar',        short: 'BLSTR', color: '#7c3aed', players: '480K DAU', genre: 'PvP shooter',      trinoSchema: 'ballistar' },
  { id: 'tfb',   code: 'TFB',   name: 'Total Football',   short: 'TFB',   color: '#059669', players: '920K DAU', genre: 'Sports',           trinoSchema: 'tfb_vn' },
];

// Top-group lookup mirrors metrics-mock-series.jsx::METRIC_TOP_GROUPS.
const TOP_GROUP: Record<string, 'engagement' | 'growth' | 'quality' | 'revenue'> = {
  engagement: 'engagement', social: 'engagement',
  retention: 'growth', progression: 'growth',
  technical: 'quality', propensity: 'quality',
  monetization: 'revenue',
};

const GOOD_DOWN = new Set(['m_dormant_days', 'm_crash_rate_7d', 'm_churn_risk_ptg', 'm_churn_cfm']);

const m = (
  id: string, name: string, category: string, type: string, status: string, owner: string,
  games: string[], windowSpec: string, unit: string, freq: string, realtime: boolean,
  formula: string, masterTable: string, source: string,
) => ({
  id, name, category, topGroup: TOP_GROUP[category] ?? 'engagement', type, status, owner,
  games, windowSpec, unit, freq, realtime,
  goodDir: GOOD_DOWN.has(id) ? 'down' : 'up',
  formula, description: null, source, masterTable, deps: null, model: null,
  usedByCount: 0, version: 1,
});

export const METRICS = [
  m('m_sessions_7d',     'sessions_last_7d',          'engagement',  'standard',   'certified',    'data.liveops',  ['ALL'], '7d rolling',  'count', 'hourly',    true,  'COUNT(DISTINCT session_id) OVER 7d', 'master.session', 'kafka.session_events'),
  m('m_sessions_30d',    'sessions_last_30d',         'engagement',  'standard',   'certified',    'data.liveops',  ['ALL'], '30d rolling', 'count', 'daily',     false, 'COUNT(DISTINCT session_id) OVER 30d', 'master.session', 'kafka.session_events'),
  m('m_playtime_7d',     'playtime_minutes_7d',       'engagement',  'standard',   'certified',    'data.liveops',  ['ALL'], '7d rolling',  'minutes','hourly',   true,  'SUM(session_duration_min) OVER 7d', 'master.session', 'kafka.session_events'),
  m('m_days_active_30d', 'days_active_30d',           'engagement',  'standard',   'certified',    'data.liveops',  ['ALL'], '30d rolling', 'count', 'daily',     false, 'COUNT(DISTINCT date(event_time)) OVER 30d', 'master.session', 'kafka.session_events'),
  m('m_last_seen',       'minutes_since_last_seen',   'engagement',  'standard',   'certified',    'data.liveops',  ['ALL'], 'realtime',    'minutes','streaming',true,  'NOW() - MAX(event_time)', 'master.session', 'kafka.session_events'),
  m('m_spend_30d',       'spend_usd_30d',             'monetization','standard',   'certified',    'data.liveops',  ['ALL'], '30d rolling', 'USD',   'hourly',    true,  'SUM(amount_usd) OVER 30d', 'master.transaction', 'kafka.purchase_events'),
  m('m_spend_7d',        'spend_usd_7d',              'monetization','standard',   'certified',    'data.liveops',  ['ALL'], '7d rolling',  'USD',   'hourly',    true,  'SUM(amount_usd) OVER 7d', 'master.transaction', 'kafka.purchase_events'),
  m('m_ltv',             'lifetime_value_usd',        'monetization','standard',   'certified',    'data.liveops',  ['ALL'], 'all-time',    'USD',   'daily',     false, 'SUM(amount_usd) all-time', 'master.transaction', 'kafka.purchase_events'),
  m('m_first_purchase',  'days_since_first_purchase', 'monetization','standard',   'certified',    'data.liveops',  ['ALL'], 'all-time',    'days',  'daily',     false, 'DATEDIFF(now, MIN(event_time))', 'master.transaction', 'kafka.purchase_events'),
  m('m_arpdau_7d',       'arpdau_7d',                 'monetization','custom',     'experimental', 'khoitn',        ['PTG'], '7d rolling',  'USD',   'daily',     false, 'spend_usd_7d / days_active_7d', 'master.transaction', 'derived.metrics'),
  m('m_rank_tier',       'current_rank_tier',         'progression', 'standard',   'certified',    'data.liveops',  ['CFM','TFB'], 'realtime', 'string','streaming',true,  'LAST(rank_tier)', 'master.progression', 'kafka.progression_events'),
  m('m_level',           'account_level',             'progression', 'standard',   'certified',    'data.liveops',  ['ALL'], 'realtime',    'count', 'streaming', true,  'LAST(account_level)', 'master.progression', 'kafka.progression_events'),
  m('m_quests_7d',       'quests_completed_7d',       'progression', 'standard',   'certified',    'data.liveops',  ['PTG','TFB'], '7d rolling','count','hourly',  true,  'COUNT(*) WHERE event=quest_complete OVER 7d', 'master.progression', 'kafka.progression_events'),
  m('m_d1_retained',     'retained_d1',               'retention',   'standard',   'certified',    'data.liveops',  ['ALL'], 'cohort D1',   'boolean','daily',    false, '1 if active on D1 else 0', 'master.user_day', 'derived.cohorts'),
  m('m_dormant_days',    'dormant_days',              'retention',   'standard',   'certified',    'data.liveops',  ['ALL'], 'realtime',    'days',  'streaming', true,  'FLOOR((NOW() - MAX(event_time)) / 86400)', 'master.session', 'kafka.session_events'),
  m('m_friends_count',   'friends_count',             'social',      'standard',   'certified',    'data.liveops',  ['PTG'], 'realtime',    'count', 'streaming', true,  'COUNT(friend_id) WHERE status=active', 'master.social_graph', 'kafka.social_events'),
  m('m_guild_role',      'guild_role',                'social',      'standard',   'certified',    'data.liveops',  ['CFM','TFB'], 'realtime', 'enum','streaming',true,  'LAST(guild_role)', 'master.social_graph', 'kafka.social_events'),
  m('m_crash_rate_7d',   'crash_rate_7d',             'technical',   'standard',   'experimental', 'sre.platform',  ['ALL'], '7d rolling',  'ratio', 'hourly',    false, 'SUM(crashes) / SUM(sessions) OVER 7d', 'master.device', 'kafka.telemetry'),
  m('m_device_class',    'device_class',              'technical',   'standard',   'certified',    'sre.platform',  ['ALL'], 'realtime',    'enum',  'streaming', true,  'LOOKUP(device_model)', 'master.device', 'kafka.telemetry'),
  m('m_churn_risk_ptg',  'churn_risk_score',          'propensity',  'propensity', 'certified',    'ds.propensity', ['PTG'], 'daily',       'prob',  'daily',     false, 'model ptg_churn_v4(features)', 'ml.scores', 'ml.feature_store'),
  m('m_pay_prob_ptg',    'propensity_to_pay',         'propensity',  'propensity', 'certified',    'ds.propensity', ['PTG'], 'daily',       'prob',  'daily',     false, 'model ptg_pay_v7(features)',   'ml.scores', 'ml.feature_store'),
  m('m_whale_prob_cfm',  'whale_propensity',          'propensity',  'propensity', 'certified',    'ds.propensity', ['CFM'], 'daily',       'prob',  'daily',     false, 'model cfm_whale_v2(features)', 'ml.scores', 'ml.feature_store'),
  m('m_churn_cfm',       'churn_risk_score',          'propensity',  'propensity', 'certified',    'ds.propensity', ['CFM'], 'daily',       'prob',  'daily',     false, 'model cfm_churn_v2(features)', 'ml.scores', 'ml.feature_store'),
  m('m_return_prob_cfm', 'reactivation_propensity',   'propensity',  'propensity', 'experimental', 'ds.propensity', ['CFM'], 'daily',       'prob',  'daily',     false, 'model cfm_return_v1(features)','ml.scores', 'ml.feature_store'),
  m('m_club_up_tfb',     'club_upgrade_propensity',   'propensity',  'propensity', 'experimental', 'ds.propensity', ['TFB'], 'daily',       'prob',  'daily',     false, 'model tfb_club_v1(features)',  'ml.scores', 'ml.feature_store'),
];

export const SOURCES = [
  { id: 'ptg_daily_logs', kind: 'batch',    type: 's3_parquet', name: 'ptg-ingame-logs', game: 'PTG', cadence: 'Daily @ 02:00 ICT', volume: '4.8B rows/day',     owner: 'Data Platform', status: 'live',     lastRun: '3h ago',  topics: ['login_logout','moneyflow','itemflow','recharge','quest_progress'], path: 's3://vng-logs/ptg/dt=*/part-*.parquet' },
  { id: 'cfm_daily_logs', kind: 'batch',    type: 's3_parquet', name: 'cfm-ingame-logs', game: 'CFM', cadence: 'Daily @ 02:30 ICT', volume: '3.2B rows/day',     owner: 'Data Platform', status: 'live',     lastRun: '3h ago',  topics: ['login_logout','match_result','weapon_unlock','recharge'], path: 's3://vng-logs/cfm/dt=*/part-*.parquet' },
  { id: 'tfb_daily_logs', kind: 'batch',    type: 's3_parquet', name: 'tfb-ingame-logs', game: 'TFB', cadence: 'Daily @ 03:00 ICT', volume: '1.4B rows/day',     owner: 'Data Platform', status: 'degraded', lastRun: '12h ago', topics: ['login_logout','match_event','player_transfer','recharge'], path: 's3://vng-logs/tfb/dt=*/part-*.parquet' },
  { id: 'ptg_kafka',      kind: 'realtime', type: 'kafka',      name: 'ptg-events-kafka', game: 'PTG', cadence: 'Streaming',         volume: '82K msg/sec peak',  owner: 'Data Platform', status: 'live',     lastRun: '2s ago',  topics: ['ptg.session','ptg.purchase','ptg.social','ptg.inventory'], path: 'kafka://vng-kafka-prod:9092/ptg.*' },
  { id: 'cfm_kafka',      kind: 'realtime', type: 'kafka',      name: 'cfm-events-kafka', game: 'CFM', cadence: 'Streaming',         volume: '104K msg/sec peak', owner: 'Data Platform', status: 'live',     lastRun: '1s ago',  topics: ['cfm.match','cfm.purchase','cfm.social'], path: 'kafka://vng-kafka-prod:9092/cfm.*' },
  { id: 'tfb_kafka',      kind: 'realtime', type: 'kafka',      name: 'tfb-events-kafka', game: 'TFB', cadence: 'Streaming',         volume: '38K msg/sec peak',  owner: 'Data Platform', status: 'live',     lastRun: '2s ago',  topics: ['tfb.match','tfb.transfer','tfb.purchase'], path: 'kafka://vng-kafka-prod:9092/tfb.*' },
];

export const FRESHNESS = [
  { target: 'master.session',   game: 'PTG', type: 'table',  sla: '15m', current: '2m',  status: 'healthy', breaches7d: 0, trend: [2,3,2,4,3,2,2,3,2,2,4,3,2,2,3,2,2,2,3,2,2,2,2,2] },
  { target: 'master.purchase',  game: 'PTG', type: 'table',  sla: '5m',  current: '2m',  status: 'healthy', breaches7d: 0, trend: [1,2,2,1,3,2,1,2,2,1,2,2,1,2,2,2,3,2,1,2,1,2,2,2] },
  { target: 'master.session',   game: 'TFB', type: 'table',  sla: '15m', current: '22m', status: 'breach',  breaches7d: 3, trend: [12,14,18,22,14,16,22,18,12,14,16,22,18,14,12,18,22,18,14,18,16,22,18,22] },
  { target: 'churn_risk_score', game: 'PTG', type: 'metric', sla: '2h',  current: '32m', status: 'healthy', breaches7d: 0, trend: [30,32,28,34,30,29,32,34,30,28,32,30,29,32,30,28,30,32,30,28,30,32,30,32] },
  { target: 'spend_usd_30d',    game: 'ALL', type: 'metric', sla: '1h',  current: '24m', status: 'healthy', breaches7d: 0, trend: [18,22,20,24,22,18,20,22,24,20,18,22,24,20,22,18,20,24,22,18,20,24,22,24] },
];

export const SEGMENTS = [
  { id: 's_ptg_whales', name: 'PTG High-Value at Risk', game: 'PTG', size: 18420, sizeTrend: 'up', delta: '+312', status: 'live', owner: 'Khoi Tran', updated: '2m ago', campaigns: 3,
    description: 'Top 5% spenders with rising churn risk',
    filters: [{ kind: 'feature', ref: 'f_purchase_30d', op: '>=', value: '50 USD' }, { kind: 'feature', ref: 'f_churn_risk', op: '>=', value: '0.6' }],
    criteria: null, version: 1 },
  { id: 's_cfm_lapsed', name: 'CFM Lapsed Mid-Core', game: 'CFM', size: 84120, sizeTrend: 'down', delta: '-1.2K', status: 'live', owner: 'An Tran', updated: '12m ago', campaigns: 2,
    description: 'Rank Gold+ dormant 7-14 days',
    filters: [{ kind: 'feature', ref: 'f_rank_tier', op: 'in', value: 'Gold+' }, { kind: 'metric', ref: 'm_dormant_days', op: 'between', value: '7..14' }],
    criteria: null, version: 1 },
  { id: 's_tfb_new_clubs', name: 'TFB New Club Upgrades', game: 'TFB', size: 6204, sizeTrend: 'up', delta: '+184', status: 'live', owner: 'Mai Nguyen', updated: '18m ago', campaigns: 1,
    description: 'Recently upgraded to Pro club tier',
    filters: [{ kind: 'feature', ref: 'f_club_tier', op: '=', value: 'Pro' }],
    criteria: null, version: 1 },
];
