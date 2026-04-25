// Extended mock data for Bedrock (ES module)
// Extended mock data for Bedrock: sources, mappings, master tables, metrics, SLAs
import { topGroupForCategory, goodDirFor } from './metrics-mock-series.jsx';

// ─── Data sources (connectors) — batch + realtime ────────────────
const BR_SOURCES = [
  { id: 'ptg_daily_logs', kind: 'batch', type: 's3_parquet', name: 'ptg-ingame-logs', game: 'PTG', cadence: 'Daily @ 02:00 ICT', volume: '4.8B rows/day',  owner: 'Data Platform', status: 'live',    lastRun: '3h ago',  topics: ['login_logout','moneyflow','itemflow','recharge','quest_progress'], path: 's3://vng-logs/ptg/dt=*/part-*.parquet' },
  { id: 'cfm_daily_logs', kind: 'batch', type: 's3_parquet', name: 'cfm-ingame-logs', game: 'CFM', cadence: 'Daily @ 02:30 ICT', volume: '3.2B rows/day',  owner: 'Data Platform', status: 'live',    lastRun: '3h ago',  topics: ['login_logout','match_result','weapon_unlock','recharge'], path: 's3://vng-logs/cfm/dt=*/part-*.parquet' },
  { id: 'tfb_daily_logs', kind: 'batch', type: 's3_parquet', name: 'tfb-ingame-logs', game: 'TFB', cadence: 'Daily @ 03:00 ICT', volume: '1.4B rows/day',  owner: 'Data Platform', status: 'degraded', lastRun: '12h ago', topics: ['login_logout','match_event','player_transfer','recharge'], path: 's3://vng-logs/tfb/dt=*/part-*.parquet' },
  { id: 'ptg_kafka',      kind: 'realtime', type: 'kafka',   name: 'ptg-events-kafka', game: 'PTG', cadence: 'Streaming',        volume: '82K msg/sec peak', owner: 'Data Platform', status: 'live',    lastRun: '2s ago',  topics: ['ptg.session','ptg.purchase','ptg.social','ptg.inventory'], path: 'kafka://vng-kafka-prod:9092/ptg.*' },
  { id: 'cfm_kafka',      kind: 'realtime', type: 'kafka',   name: 'cfm-events-kafka', game: 'CFM', cadence: 'Streaming',        volume: '104K msg/sec peak',owner: 'Data Platform', status: 'live',    lastRun: '1s ago',  topics: ['cfm.match','cfm.purchase','cfm.social'], path: 'kafka://vng-kafka-prod:9092/cfm.*' },
  { id: 'tfb_kafka',      kind: 'realtime', type: 'kafka',   name: 'tfb-events-kafka', game: 'TFB', cadence: 'Streaming',        volume: '38K msg/sec peak', owner: 'Data Platform', status: 'live',    lastRun: '2s ago',  topics: ['tfb.match','tfb.transfer','tfb.purchase'], path: 'kafka://vng-kafka-prod:9092/tfb.*' },
  { id: 'payments_api',   kind: 'realtime', type: 'webhook', name: 'payment-gateway',   game: 'ALL',cadence: 'Webhook',          volume: '1.8K msg/sec',     owner: 'Monetization',  status: 'live',    lastRun: '4s ago',  topics: ['txn.settled','txn.refund','txn.chargeback'], path: 'https://hooks.vng.internal/payments' },
  { id: 'crm_salesforce', kind: 'batch',    type: 'api',     name: 'salesforce-crm',    game: 'ALL',cadence: 'Hourly',           volume: '420K rows/day',    owner: 'Marketing',     status: 'live',    lastRun: '18m ago', topics: ['contacts','cases','campaigns'], path: 'https://vng.my.salesforce.com' },
];

// ─── Raw log samples per topic (for the "toggle raw/standard" view) ────
// Mapping Studio source samples — mirror the REAL Trino raw schemas we
// have in `infra/trino-mock/data/{cfm_vn,ballistar}/`. CFM rows mirror
// `iceberg.cfm_vn.etl_*`; BLSTR rows mirror `iceberg.ballistar.etl_*`.
// Both map to the same standard schema (see BR_STANDARD_LOGS) so the UI
// demonstrates the cross-game normalisation Bedrock provides.
const BR_RAW_LOGS = {
  'login_logout_cfm': {
    columns: ['vopenid', 'dteventtime', 'country', 'platid', 'clientversion', 'deviceid', 'ds'],
    rows: [
      ['u_823119234', '2026-04-22 10:30:12+00', 'VN', 'android', '4.12.0', 'd_4f1a', '2026-04-22'],
      ['u_823119234', '2026-04-22 10:31:41+00', 'VN', 'android', '4.12.0', 'd_4f1a', '2026-04-22'],
      ['u_823119811', '2026-04-22 10:30:23+00', 'TH', 'ios',     '4.12.0', 'd_9b2e', '2026-04-22'],
      ['u_823120042', '2026-04-22 10:30:44+00', 'PH', 'android', '4.11.9', 'd_3c08', '2026-04-22'],
      ['u_823118778', '2026-04-22 10:31:06+00', 'VN', 'ios',     '4.12.0', 'd_1d77', '2026-04-22'],
    ],
  },
  'login_logout_blstr': {
    columns: ['account_id', 'role_id', 'login_time', 'country_code', 'login_channel', 'os_platform', 'os_version', 'device_id', 'ds'],
    rows: [
      ['3236000389934678016', '23514901', '2025-05-29 17:00:02+00', 'TH', '5', 'Android', 'Android OS 13', '6bc542af', '2025-05-30'],
      ['3228122585430384640', '11099669', '2025-05-29 17:00:03+00', 'TH', '4', 'Android', 'Android OS 13', 'e9019425', '2025-05-30'],
      ['3198440217044299776', '32084412', '2025-05-29 17:00:11+00', 'ID', '5', 'iOS',     'iOS 17.4',      'a7c91120', '2025-05-30'],
      ['3236000389934678017', '23514902', '2025-05-29 17:00:24+00', 'VN', '4', 'Android', 'Android OS 14', '6bc54300', '2025-05-30'],
    ],
  },
  'recharge_cfm': {
    columns: ['vopenid', 'dteventtime', 'imoney_us', 'currency', 'platid', 'productid', 'ds'],
    rows: [
      ['u_823119234', '2026-04-22 10:32:41+00',  9.99, 'USD', 'ios',     'gem_pack_l',  '2026-04-22'],
      ['u_823119811', '2026-04-22 10:34:01+00',  4.99, 'USD', 'android', 'battle_pass', '2026-04-22'],
      ['u_823120042', '2026-04-22 10:36:22+00', 19.99, 'USD', 'ios',     'starter_kit', '2026-04-22'],
      ['u_823118778', '2026-04-22 10:38:55+00',  1.99, 'USD', 'android', 'gem_pack_s',  '2026-04-22'],
    ],
  },
  'recharge_blstr': {
    columns: ['account_id', 'recharge_time', 'charged_value', 'money_type', 'os_platform', 'product_id', 'payment_channel', 'is_first_recharge', 'ds'],
    rows: [
      ['3236000389934678016', '2025-05-29 18:11:02+00',  4.99, 'USD', 'Android', 'pkg_starter',     'google_play', 1, '2025-05-30'],
      ['3228122585430384640', '2025-05-29 18:42:21+00',  9.99, 'USD', 'Android', 'pkg_battle_pass', 'google_play', 0, '2025-05-30'],
      ['3198440217044299776', '2025-05-29 19:01:55+00', 19.99, 'USD', 'iOS',     'pkg_gem_l',       'app_store',   0, '2025-05-30'],
    ],
  },
};

// Standard (mapped) output for the rows above. Same target schema for
// every game — that's the whole point of mapping.
const BR_STANDARD_LOGS = {
  'login_logout_cfm': {
    columns: ['event_time', 'user_id', 'event_type', 'platform', 'country', 'session_id', 'app_version', 'game'],
    rows: [
      ['2026-04-22 10:30:12', 'u_823119234', 'session_start', 'android', 'VN', 'sess_4f1a_001', '4.12.0', 'CFM'],
      ['2026-04-22 10:31:41', 'u_823119234', 'session_end',   'android', 'VN', 'sess_4f1a_001', '4.12.0', 'CFM'],
      ['2026-04-22 10:30:23', 'u_823119811', 'session_start', 'ios',     'TH', 'sess_9b2e_001', '4.12.0', 'CFM'],
      ['2026-04-22 10:30:44', 'u_823120042', 'session_start', 'android', 'PH', 'sess_3c08_001', '4.11.9', 'CFM'],
      ['2026-04-22 10:31:06', 'u_823118778', 'session_start', 'ios',     'VN', 'sess_1d77_001', '4.12.0', 'CFM'],
    ],
  },
  'login_logout_blstr': {
    columns: ['event_time', 'user_id', 'event_type', 'platform', 'country', 'session_id', 'app_version', 'game'],
    rows: [
      ['2025-05-29 17:00:02', 'u_3236000389934678016', 'session_start', 'android', 'TH', 'sess_6bc542af_001', 'Android OS 13', 'BLSTR'],
      ['2025-05-29 17:00:03', 'u_3228122585430384640', 'session_start', 'android', 'TH', 'sess_e9019425_001', 'Android OS 13', 'BLSTR'],
      ['2025-05-29 17:00:11', 'u_3198440217044299776', 'session_start', 'ios',     'ID', 'sess_a7c91120_001', 'iOS 17.4',      'BLSTR'],
      ['2025-05-29 17:00:24', 'u_3236000389934678017', 'session_start', 'android', 'VN', 'sess_6bc54300_001', 'Android OS 14', 'BLSTR'],
    ],
  },
  'recharge_cfm': {
    columns: ['event_time', 'user_id', 'amount_usd', 'currency', 'platform', 'product_id', 'game'],
    rows: [
      ['2026-04-22 10:32:41', 'u_823119234',  9.99, 'USD', 'ios',     'gem_pack_l',  'CFM'],
      ['2026-04-22 10:34:01', 'u_823119811',  4.99, 'USD', 'android', 'battle_pass', 'CFM'],
      ['2026-04-22 10:36:22', 'u_823120042', 19.99, 'USD', 'ios',     'starter_kit', 'CFM'],
      ['2026-04-22 10:38:55', 'u_823118778',  1.99, 'USD', 'android', 'gem_pack_s',  'CFM'],
    ],
  },
  'recharge_blstr': {
    columns: ['event_time', 'user_id', 'amount_usd', 'currency', 'platform', 'product_id', 'game'],
    rows: [
      ['2025-05-29 18:11:02', 'u_3236000389934678016',  4.99, 'USD', 'android', 'pkg_starter',     'BLSTR'],
      ['2025-05-29 18:42:21', 'u_3228122585430384640',  9.99, 'USD', 'android', 'pkg_battle_pass', 'BLSTR'],
      ['2025-05-29 19:01:55', 'u_3198440217044299776', 19.99, 'USD', 'ios',     'pkg_gem_l',       'BLSTR'],
    ],
  },
};

// Field mapping state for Mapping Studio (raw → standard).
// CFM uses the cfm_vn naming convention (vopenid, dteventtime, platid…).
// BLSTR uses the ballistar convention (account_id, login_time, os_platform…).
// Both normalise into the same target schema — that's the value the
// Mapping Studio surface is meant to communicate.
const BR_MAPPINGS = {
  'login_logout_cfm': [
    { raw: 'vopenid',       rawType: 'string',    std: 'user_id',      stdType: 'string',    transform: "concat('u_', vopenid)",       confidence: 100, required: true },
    { raw: 'dteventtime',   rawType: 'timestamp', std: 'event_time',   stdType: 'timestamp', transform: 'dteventtime',                  confidence: 100, required: true },
    { raw: 'country',       rawType: 'iso_cc',    std: 'country',      stdType: 'iso_cc',    transform: 'upper(country)',               confidence: 100, required: true },
    { raw: 'platid',        rawType: 'enum',      std: 'platform',     stdType: 'enum',      transform: "map('android'→'android','ios'→'ios')", confidence: 100, required: true },
    { raw: 'deviceid',      rawType: 'string',    std: 'session_id',   stdType: 'string',    transform: "concat('sess_', deviceid, '_', date_part('hour', dteventtime))", confidence: 88, required: true, warning: 'Synthesised from deviceid+hour — true session_id not in raw schema' },
    { raw: 'clientversion', rawType: 'string',    std: 'app_version',  stdType: 'semver',    transform: 'clientversion',                confidence: 96,  required: false },
    { raw: '—',             rawType: 'string',    std: 'event_type',   stdType: 'enum',      transform: "literal('session_start')",     confidence: 100, required: true, note: 'Derived from table: etl_login → session_start; etl_logout → session_end' },
  ],
  'login_logout_blstr': [
    { raw: 'account_id',  rawType: 'string',    std: 'user_id',      stdType: 'string',    transform: "concat('u_', account_id)", confidence: 100, required: true },
    { raw: 'login_time',  rawType: 'timestamp', std: 'event_time',   stdType: 'timestamp', transform: 'login_time',                confidence: 100, required: true },
    { raw: 'country_code',rawType: 'iso_cc',    std: 'country',      stdType: 'iso_cc',    transform: 'country_code',              confidence: 100, required: true },
    { raw: 'os_platform', rawType: 'enum',      std: 'platform',     stdType: 'enum',      transform: 'lower(os_platform)',        confidence: 100, required: true },
    { raw: 'role_id',     rawType: 'string',    std: 'session_id',   stdType: 'string',    transform: "concat('sess_', role_id, '_', date_part('hour', login_time))", confidence: 82, required: true, warning: 'Synthesised — ballistar lacks an explicit session_id; role_id+hour is the closest proxy' },
    { raw: 'os_version',  rawType: 'string',    std: 'app_version',  stdType: 'semver',    transform: "regexp_extract(os_version, '\\d+(\\.\\d+)*')", confidence: 78, required: false, warning: 'os_version is OS+device combined — extracts a numeric prefix' },
    { raw: '—',           rawType: 'string',    std: 'event_type',   stdType: 'enum',      transform: "literal('session_start')",  confidence: 100, required: true, note: 'Derived from table: etl_login → session_start; etl_logout → session_end' },
  ],
  'recharge_cfm': [
    { raw: 'vopenid',     rawType: 'string',    std: 'user_id',      stdType: 'string',    transform: "concat('u_', vopenid)",  confidence: 100, required: true },
    { raw: 'dteventtime', rawType: 'timestamp', std: 'event_time',   stdType: 'timestamp', transform: 'dteventtime',             confidence: 100, required: true },
    { raw: 'imoney_us',   rawType: 'double',    std: 'amount_usd',   stdType: 'double',    transform: 'imoney_us',               confidence: 100, required: true },
    { raw: 'currency',    rawType: 'enum',      std: 'currency',     stdType: 'enum',      transform: 'currency',                confidence: 100, required: true },
    { raw: 'platid',      rawType: 'enum',      std: 'platform',     stdType: 'enum',      transform: 'platid',                  confidence: 100, required: true },
    { raw: 'productid',   rawType: 'string',    std: 'product_id',   stdType: 'string',    transform: 'productid',               confidence: 100, required: true },
  ],
  'recharge_blstr': [
    { raw: 'account_id',     rawType: 'string',    std: 'user_id',     stdType: 'string',    transform: "concat('u_', account_id)", confidence: 100, required: true },
    { raw: 'recharge_time',  rawType: 'timestamp', std: 'event_time',  stdType: 'timestamp', transform: 'recharge_time',             confidence: 100, required: true },
    { raw: 'charged_value',  rawType: 'double',    std: 'amount_usd',  stdType: 'double',    transform: 'charged_value',             confidence: 100, required: true },
    { raw: 'money_type',     rawType: 'enum',      std: 'currency',    stdType: 'enum',      transform: 'money_type',                confidence: 100, required: true },
    { raw: 'os_platform',    rawType: 'enum',      std: 'platform',    stdType: 'enum',      transform: 'lower(os_platform)',        confidence: 100, required: true },
    { raw: 'product_id',     rawType: 'string',    std: 'product_id',  stdType: 'string',    transform: 'product_id',                confidence: 100, required: true },
  ],
};

// Playbook templates - pre-built semantic mappings
const BR_PLAYBOOKS = [
  { id: 'login_logout', label: 'Session (login / logout)',  icon: 'log-in',      fields: 8, schema: 'standard.session' },
  { id: 'moneyflow',    label: 'Currency flow (earn/spend)',icon: 'coins',       fields: 9, schema: 'standard.currency' },
  { id: 'itemflow',     label: 'Item flow (grant/consume)', icon: 'package',     fields: 8, schema: 'standard.inventory' },
  { id: 'recharge',     label: 'Paid transaction',          icon: 'credit-card', fields: 9, schema: 'standard.purchase' },
  { id: 'match_result', label: 'Match / session result',    icon: 'swords',      fields: 14,schema: 'standard.match' },
  { id: 'social',       label: 'Social interaction',        icon: 'users',       fields: 7, schema: 'standard.social' },
  { id: 'progression',  label: 'Quest / progression',       icon: 'milestone',   fields: 9, schema: 'standard.progression' },
  { id: 'custom',       label: '＋ Start from scratch',      icon: 'plus',        fields: 0, schema: '—' },
];

// Master tables — the standardized per-game schema output of mapping
const BR_MASTER_TABLES = [
  { name: 'master.session',      game: 'PTG', rows: '4.12B', cols: 9,  mappings: 1, coverage: 99.8, lastBuild: '2m ago',  sla: '15m',  slaMet: true,  streams: ['batch','realtime'] },
  { name: 'master.currency',     game: 'PTG', rows: '820M',  cols: 9,  mappings: 1, coverage: 100,  lastBuild: '3m ago',  sla: '15m',  slaMet: true,  streams: ['batch','realtime'] },
  { name: 'master.purchase',     game: 'PTG', rows: '218M',  cols: 9,  mappings: 1, coverage: 100,  lastBuild: '2m ago',  sla: '5m',   slaMet: true,  streams: ['batch','realtime'] },
  { name: 'master.inventory',    game: 'PTG', rows: '1.44B', cols: 8,  mappings: 1, coverage: 98.2, lastBuild: '4m ago',  sla: '1h',   slaMet: true,  streams: ['batch'] },
  { name: 'master.progression',  game: 'PTG', rows: '980M',  cols: 9,  mappings: 1, coverage: 96.4, lastBuild: '1h ago',  sla: '1h',   slaMet: true,  streams: ['batch'] },
  { name: 'master.session',      game: 'CFM', rows: '2.88B', cols: 9,  mappings: 1, coverage: 99.1, lastBuild: '3m ago',  sla: '15m',  slaMet: true,  streams: ['batch','realtime'] },
  { name: 'master.match',        game: 'CFM', rows: '2.88B', cols: 14, mappings: 1, coverage: 98.4, lastBuild: '4m ago',  sla: '15m',  slaMet: true,  streams: ['batch','realtime'] },
  { name: 'master.purchase',     game: 'CFM', rows: '142M',  cols: 9,  mappings: 1, coverage: 99.4, lastBuild: '6m ago',  sla: '5m',   slaMet: true,  streams: ['batch','realtime'] },
  { name: 'master.session',      game: 'TFB', rows: '1.24B', cols: 9,  mappings: 1, coverage: 96.2, lastBuild: '22m ago', sla: '15m',  slaMet: false, streams: ['batch','realtime'] },
  { name: 'master.match',        game: 'TFB', rows: '1.24B', cols: 14, mappings: 1, coverage: 96.2, lastBuild: '22m ago', sla: '15m',  slaMet: false, streams: ['batch','realtime'] },
  { name: 'master.purchase',     game: 'TFB', rows: '48M',   cols: 9,  mappings: 1, coverage: 98.8, lastBuild: '18m ago', sla: '5m',   slaMet: true,  streams: ['batch','realtime'] },
];

// ─── Metrics Catalog — categorized ───────────────────────────────
// Categories chosen for LiveOps: Engagement, Monetization, Progression, Retention, Social, Technical, ML (propensity)
const BR_METRIC_CATEGORIES = [
  { id: 'engagement',   label: 'Engagement',    icon: 'activity',   color: '#3f8dff', desc: 'Sessions, playtime, session depth' },
  { id: 'monetization', label: 'Monetization',  icon: 'dollar-sign',color: '#059669', desc: 'Spend, ARPU, LTV, first purchase' },
  { id: 'progression',  label: 'Progression',   icon: 'trending-up',color: '#f59e0b', desc: 'Levels, ranks, quests, mastery' },
  { id: 'retention',    label: 'Retention',     icon: 'refresh-cw', color: '#ef4444', desc: 'D1/D7/D30, churn risk, reactivation' },
  { id: 'social',       label: 'Social',        icon: 'users',      color: '#db2777', desc: 'Friends, guilds, co-op, chat' },
  { id: 'technical',    label: 'Technical',     icon: 'cpu',        color: '#737373', desc: 'Crashes, latency, device class' },
  { id: 'propensity',   label: 'ML · Propensity',icon: 'sparkles',  color: '#a855f7', desc: 'Model scores — churn, pay, whale, return' },
];

// Per-category default source + master table. Individual metrics may
// override either field explicitly; the .map() below spreads the default
// first so an explicit `source` / `masterTable` on the metric wins.
const METRIC_CATEGORY_SOURCES = {
  engagement:   { source: 'kafka.session_events',     masterTable: 'master.session' },
  monetization: { source: 'kafka.purchase_events',    masterTable: 'master.transaction' },
  progression:  { source: 'kafka.progression_events', masterTable: 'master.progression' },
  retention:    { source: 'master.session',           masterTable: 'master.user_day' },
  social:       { source: 'kafka.social_events',      masterTable: 'master.social_graph' },
  technical:    { source: 'kafka.telemetry',          masterTable: 'master.device' },
  propensity:   { source: 'ml.feature_store',         masterTable: 'ml.scores' },
};

// Metric record: type = standard | custom | propensity
//                realtime = true if it can be computed on the streaming path (for realtime segments)
const BR_METRICS_RAW = [
  // Engagement
  { id: 'm_sessions_7d',     name: 'sessions_last_7d',          category: 'engagement',  type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['ALL'], window: '7d rolling',  unit: 'count',    freq: 'hourly',  realtime: true,  usedBy: 42, formula: 'COUNT(DISTINCT session_id) OVER 7d' },
  { id: 'm_sessions_30d',    name: 'sessions_last_30d',         category: 'engagement',  type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['ALL'], window: '30d rolling', unit: 'count',    freq: 'daily',   realtime: false, usedBy: 38, formula: 'COUNT(DISTINCT session_id) OVER 30d' },
  { id: 'm_playtime_7d',     name: 'playtime_minutes_7d',       category: 'engagement',  type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['ALL'], window: '7d rolling',  unit: 'minutes',  freq: 'hourly',  realtime: true,  usedBy: 28, formula: 'SUM(session_duration_min) OVER 7d' },
  { id: 'm_days_active_30d', name: 'days_active_30d',           category: 'engagement',  type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['ALL'], window: '30d rolling', unit: 'count',    freq: 'daily',   realtime: false, usedBy: 31, formula: 'COUNT(DISTINCT date(event_time)) OVER 30d' },
  { id: 'm_last_seen',       name: 'minutes_since_last_seen',   category: 'engagement',  type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['ALL'], window: 'realtime',    unit: 'minutes',  freq: 'streaming',realtime:true,  usedBy: 54, formula: 'NOW() - MAX(event_time)' },
  // Monetization
  { id: 'm_spend_30d',       name: 'spend_usd_30d',             category: 'monetization',type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['ALL'], window: '30d rolling', unit: 'USD',      freq: 'hourly',  realtime: true,  usedBy: 67, formula: 'SUM(amount_usd) OVER 30d WHERE status = settled' },
  { id: 'm_spend_7d',        name: 'spend_usd_7d',              category: 'monetization',type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['ALL'], window: '7d rolling',  unit: 'USD',      freq: 'hourly',  realtime: true,  usedBy: 48, formula: 'SUM(amount_usd) OVER 7d WHERE status = settled' },
  { id: 'm_ltv',             name: 'lifetime_value_usd',        category: 'monetization',type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['ALL'], window: 'all-time',    unit: 'USD',      freq: 'daily',   realtime: false, usedBy: 34, formula: 'SUM(amount_usd) all-time' },
  { id: 'm_first_purchase',  name: 'days_since_first_purchase', category: 'monetization',type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['ALL'], window: 'all-time',    unit: 'days',     freq: 'daily',   realtime: false, usedBy: 22, formula: 'DATEDIFF(now, MIN(event_time))' },
  { id: 'm_arpdau_7d',       name: 'arpdau_7d',                 category: 'monetization',type: 'custom',     status: 'experimental',owner: 'khoitn',     games: ['PTG'], window: '7d rolling',  unit: 'USD',      freq: 'daily',   realtime: false, usedBy: 4,  formula: 'spend_usd_7d / days_active_7d', deps: ['m_spend_7d','m_days_active_30d'] },
  // Progression
  { id: 'm_rank_tier',       name: 'current_rank_tier',         category: 'progression', type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['CFM','TFB'], window: 'realtime', unit: 'string', freq: 'streaming', realtime: true, usedBy: 18, formula: 'LAST(rank_tier)' },
  { id: 'm_level',           name: 'account_level',             category: 'progression', type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['ALL'], window: 'realtime',    unit: 'count',    freq: 'streaming',realtime: true,  usedBy: 14, formula: 'LAST(account_level)' },
  { id: 'm_quests_7d',       name: 'quests_completed_7d',       category: 'progression', type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['PTG','TFB'], window: '7d rolling', unit: 'count', freq: 'hourly', realtime: true, usedBy: 9, formula: 'COUNT(*) WHERE event = quest_complete OVER 7d' },
  // Retention
  { id: 'm_d1_retained',     name: 'retained_d1',               category: 'retention',   type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['ALL'], window: 'cohort D1',   unit: 'boolean',  freq: 'daily',   realtime: false, usedBy: 24, formula: '1 if active on D1 else 0' },
  { id: 'm_dormant_days',    name: 'dormant_days',              category: 'retention',   type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['ALL'], window: 'realtime',    unit: 'days',     freq: 'streaming', realtime: true, usedBy: 33, formula: 'FLOOR((NOW() - MAX(event_time)) / 86400)' },
  // Social
  { id: 'm_friends_count',   name: 'friends_count',             category: 'social',      type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['PTG'], window: 'realtime',    unit: 'count',    freq: 'streaming', realtime: true, usedBy: 11, formula: 'COUNT(friend_id) WHERE status=active' },
  { id: 'm_guild_role',      name: 'guild_role',                category: 'social',      type: 'standard',   status: 'certified',   owner: 'data.liveops',  games: ['CFM','TFB'], window: 'realtime', unit: 'enum', freq: 'streaming', realtime: true, usedBy: 6, formula: 'LAST(guild_role)' },
  // Technical
  { id: 'm_crash_rate_7d',   name: 'crash_rate_7d',             category: 'technical',   type: 'standard',   status: 'experimental',owner: 'sre.platform',  games: ['ALL'], window: '7d rolling',  unit: 'ratio',    freq: 'hourly',  realtime: false, usedBy: 3,  formula: 'SUM(crashes) / SUM(sessions) OVER 7d' },
  { id: 'm_device_class',    name: 'device_class',              category: 'technical',   type: 'standard',   status: 'certified',   owner: 'sre.platform',  games: ['ALL'], window: 'realtime',    unit: 'enum',     freq: 'streaming', realtime: true, usedBy: 17, formula: 'LOOKUP(device_model → class)' },
  // Propensity (ML)
  { id: 'm_churn_risk_ptg',  name: 'churn_risk_score',          category: 'propensity',  type: 'propensity', status: 'certified',   owner: 'ds.propensity', games: ['PTG'], window: 'daily',       unit: 'prob',     freq: 'daily',   realtime: false, usedBy: 52, formula: 'model ptg_churn_v4(features)', model: 'PTG Churn v4' },
  { id: 'm_pay_prob_ptg',    name: 'propensity_to_pay',         category: 'propensity',  type: 'propensity', status: 'certified',   owner: 'ds.propensity', games: ['PTG'], window: 'daily',       unit: 'prob',     freq: 'daily',   realtime: false, usedBy: 41, formula: 'model ptg_pay_v7(features)', model: 'PTG Pay v7' },
  { id: 'm_whale_prob_cfm',  name: 'whale_propensity',          category: 'propensity',  type: 'propensity', status: 'certified',   owner: 'ds.propensity', games: ['CFM'], window: 'daily',       unit: 'prob',     freq: 'daily',   realtime: false, usedBy: 28, formula: 'model cfm_whale_v2(features)', model: 'CFM Whale v2' },
  { id: 'm_churn_cfm',       name: 'churn_risk_score',          category: 'propensity',  type: 'propensity', status: 'certified',   owner: 'ds.propensity', games: ['CFM'], window: 'daily',       unit: 'prob',     freq: 'daily',   realtime: false, usedBy: 36, formula: 'model cfm_churn_v2(features)', model: 'CFM Churn v2' },
  { id: 'm_return_prob_cfm', name: 'reactivation_propensity',   category: 'propensity',  type: 'propensity', status: 'experimental',owner: 'ds.propensity', games: ['CFM'], window: 'daily',       unit: 'prob',     freq: 'daily',   realtime: false, usedBy: 7,  formula: 'model cfm_return_v1(features)', model: 'CFM Reactivation v1' },
  { id: 'm_club_up_tfb',     name: 'club_upgrade_propensity',   category: 'propensity',  type: 'propensity', status: 'experimental',owner: 'ds.propensity', games: ['TFB'], window: 'daily',       unit: 'prob',     freq: 'daily',   realtime: false, usedBy: 4,  formula: 'model tfb_club_v1(features)', model: 'TFB Club v1' },
];

// Per-metric explicit overrides of source/masterTable. Any metric listed
// here wins over the category default. Add entries when a metric truly
// comes from a non-canonical source (e.g. derived metrics, raw overrides).
const METRIC_SOURCE_OVERRIDES = {
  m_arpdau_7d:      { source: 'derived.metrics',       masterTable: 'master.transaction' }, // computed from other metrics
  m_d1_retained:    { source: 'derived.cohorts',       masterTable: 'master.user_day' },
  m_dormant_days:   { source: 'kafka.session_events',  masterTable: 'master.session' },
};

// Resolve source/masterTable for every metric. Precedence (later wins):
//   category default → inline on metric → explicit override by id.
// Then enrich with `topGroup` (filter pill bucket) and `goodDir` (whether
// positive deltas should render green or red).
const BR_METRICS = BR_METRICS_RAW.map(m => {
  const merged = {
    ...METRIC_CATEGORY_SOURCES[m.category],
    ...m,
    ...METRIC_SOURCE_OVERRIDES[m.id],
  };
  return {
    ...merged,
    topGroup: topGroupForCategory(merged.category),
    goodDir: goodDirFor(merged),
  };
});

// Freshness / SLA table — per master table + metric
const BR_FRESHNESS = [
  { target: 'master.session',       game: 'PTG', type: 'table',   sla: '15m', current: '2m',   status: 'healthy',  breaches7d: 0, trend: [2,3,2,4,3,2,2,3,2,2,4,3,2,2,3,2,2,2,3,2,2,2,2,2] },
  { target: 'master.purchase',      game: 'PTG', type: 'table',   sla: '5m',  current: '2m',   status: 'healthy',  breaches7d: 0, trend: [1,2,2,1,3,2,1,2,2,1,2,2,1,2,2,2,3,2,1,2,1,2,2,2] },
  { target: 'master.currency',      game: 'PTG', type: 'table',   sla: '15m', current: '3m',   status: 'healthy',  breaches7d: 0, trend: [3,4,3,2,4,3,3,4,3,2,3,3,2,4,3,3,2,3,3,3,3,2,3,3] },
  { target: 'master.match',         game: 'CFM', type: 'table',   sla: '15m', current: '4m',   status: 'healthy',  breaches7d: 1, trend: [4,5,4,3,18,6,4,5,4,3,5,5,4,6,4,4,3,4,5,5,4,3,4,4] },
  { target: 'master.session',       game: 'TFB', type: 'table',   sla: '15m', current: '22m',  status: 'breach',   breaches7d: 3, trend: [12,14,18,22,14,16,22,18,12,14,16,22,18,14,12,18,22,18,14,18,16,22,18,22] },
  { target: 'master.match',         game: 'TFB', type: 'table',   sla: '15m', current: '22m',  status: 'breach',   breaches7d: 3, trend: [12,14,18,22,14,16,22,18,12,14,16,22,18,14,12,18,22,18,14,18,16,22,18,22] },
  { target: 'churn_risk_score',     game: 'PTG', type: 'metric',  sla: '2h',  current: '32m',  status: 'healthy',  breaches7d: 0, trend: [30,32,28,34,30,29,32,34,30,28,32,30,29,32,30,28,30,32,30,28,30,32,30,32] },
  { target: 'spend_usd_30d',        game: 'ALL', type: 'metric',  sla: '1h',  current: '24m',  status: 'healthy',  breaches7d: 0, trend: [18,22,20,24,22,18,20,22,24,20,18,22,24,20,22,18,20,24,22,18,20,24,22,24] },
  { target: 'master.inventory',     game: 'PTG', type: 'table',   sla: '1h',  current: '42m',  status: 'warning',  breaches7d: 2, trend: [38,42,40,58,62,44,40,42,38,42,60,42,38,42,40,42,38,42,40,42,38,42,40,42] },
];

// Models registry (subset for Bedrock use)
const BR_MODELS = [
  { id: 'm_churn_ptg',   name: 'PTG Churn v4',    target: 'Will churn in 14 days',  game: 'PTG', auc: 0.872, samples: '2.4M', trained: '3h ago',  status: 'production', features: 18 },
  { id: 'm_pay_ptg',     name: 'PTG Pay v7',      target: 'Will spend $5+ in 7 days',game: 'PTG',auc: 0.814, samples: '2.4M', trained: '12h ago', status: 'production', features: 22 },
  { id: 'm_churn_cfm',   name: 'CFM Churn v2',    target: 'Will churn in 7 days',   game: 'CFM', auc: 0.841, samples: '1.8M', trained: '1d ago',  status: 'production', features: 16 },
  { id: 'm_whale_cfm',   name: 'CFM Whale v2',    target: 'Will spend $50+ in 30d', game: 'CFM', auc: 0.789, samples: '1.8M', trained: '6h ago',  status: 'production', features: 24 },
  { id: 'm_return_cfm',  name: 'CFM Reactivation',target: 'Dormant will return',    game: 'CFM', auc: 0.704, samples: '340K', trained: '2h ago',  status: 'training',   features: 14 },
  { id: 'm_club_tfb',    name: 'TFB Club v1',     target: 'Will upgrade club tier', game: 'TFB', auc: 0.762, samples: '920K', trained: '18h ago', status: 'staging',    features: 12 },
];

Object.assign(window, {
  BR_SOURCES, BR_RAW_LOGS, BR_STANDARD_LOGS, BR_MAPPINGS, BR_PLAYBOOKS,
  BR_MASTER_TABLES, BR_METRIC_CATEGORIES, BR_METRICS, BR_FRESHNESS, BR_MODELS,
});

export { BR_SOURCES, BR_RAW_LOGS, BR_STANDARD_LOGS, BR_MAPPINGS, BR_PLAYBOOKS, BR_MASTER_TABLES, BR_METRIC_CATEGORIES, BR_METRICS, BR_FRESHNESS, BR_MODELS };
