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
const BR_RAW_LOGS = {
  'login_logout_ptg': {
    columns: ['ts','uid','evt','dvc','cc','sess_id','app_ver','os'],
    rows: [
      ['1745305812','823119234','login',  'and', 'VN','s_8kx2z','4.12.0','android-14'],
      ['1745305901','823119234','logout', 'and', 'VN','s_8kx2z','4.12.0','android-14'],
      ['1745305823','823119811','login',  'ios', 'TH','s_9p1la','4.12.0','ios-17.3'],
      ['1745305844','823120042','login',  'and', 'PH','s_3bq7w','4.11.9','android-13'],
      ['1745305866','823118778','login',  'ios', 'VN','s_1kk90','4.12.0','ios-17.4'],
      ['1745305891','823119912','login',  'and', 'ID','s_2lm8p','4.12.0','android-14'],
    ],
  },
  'moneyflow_ptg': {
    columns: ['ts','uid','typ','amt','cur','txn','bal_after','item_ref'],
    rows: [
      ['1745305812','823119234','earn',   '120',  'diamond','t_auto',   '4820','quest_reward'],
      ['1745305822','823119234','spend',  '-800', 'diamond','t_purchase','4020','avatar_item_881'],
      ['1745305841','823119811','earn',   '50',   'coin',   't_auto',   '12082','daily_bonus'],
      ['1745305852','823120042','spend',  '-200', 'diamond','t_purchase','180',  'gift_box_01'],
      ['1745305861','823118778','earn',   '300',  'coin',   't_auto',   '9384','match_win'],
    ],
  },
  'recharge_ptg': {
    columns: ['ts','uid','pkg_id','price_vnd','gw','order_id','status','promo'],
    rows: [
      ['1745305812','823119234','pkg_lg','199000','momo',  'o_8812','settled','SPRING10'],
      ['1745305911','823119811','pkg_md','99000', 'vnpay', 'o_8813','settled',''],
      ['1745306001','823118778','pkg_xl','499000','momo',  'o_8814','pending',''],
      ['1745306122','823120042','pkg_sm','49000', 'viettel','o_8815','settled','SPRING10'],
    ],
  },
};

// Standard (mapped) output for those same rows
const BR_STANDARD_LOGS = {
  'login_logout_ptg': {
    columns: ['event_time','user_id','event_type','platform','country','session_id','app_version','os_version','game'],
    rows: [
      ['2026-04-22 10:30:12','u_823119234','session_start','android','VN','s_8kx2z','4.12.0','android-14','PTG'],
      ['2026-04-22 10:31:41','u_823119234','session_end',  'android','VN','s_8kx2z','4.12.0','android-14','PTG'],
      ['2026-04-22 10:30:23','u_823119811','session_start','ios',    'TH','s_9p1la','4.12.0','ios-17.3','PTG'],
      ['2026-04-22 10:30:44','u_823120042','session_start','android','PH','s_3bq7w','4.11.9','android-13','PTG'],
      ['2026-04-22 10:31:06','u_823118778','session_start','ios',    'VN','s_1kk90','4.12.0','ios-17.4','PTG'],
      ['2026-04-22 10:31:31','u_823119912','session_start','android','ID','s_2lm8p','4.12.0','android-14','PTG'],
    ],
  },
  'moneyflow_ptg': {
    columns: ['event_time','user_id','action_type','amount','currency','transaction_ref','balance_after','item_ref','game'],
    rows: [
      ['2026-04-22 10:30:12','u_823119234','currency_earn',  120, 'diamond','t_auto',   4820, 'quest_reward',       'PTG'],
      ['2026-04-22 10:30:22','u_823119234','currency_spend', -800,'diamond','t_purchase',4020,'avatar_item_881',    'PTG'],
      ['2026-04-22 10:30:41','u_823119811','currency_earn',  50,  'coin',   't_auto',   12082,'daily_bonus',        'PTG'],
      ['2026-04-22 10:30:52','u_823120042','currency_spend', -200,'diamond','t_purchase',180, 'gift_box_01',        'PTG'],
      ['2026-04-22 10:31:01','u_823118778','currency_earn',  300, 'coin',   't_auto',   9384,'match_win',          'PTG'],
    ],
  },
  'recharge_ptg': {
    columns: ['event_time','user_id','package_id','amount_vnd','payment_gateway','order_id','status','promo_code','game'],
    rows: [
      ['2026-04-22 10:30:12','u_823119234','pkg_lg',199000,'momo',   'o_8812','settled','SPRING10','PTG'],
      ['2026-04-22 10:31:51','u_823119811','pkg_md', 99000,'vnpay',  'o_8813','settled','',        'PTG'],
      ['2026-04-22 10:33:21','u_823118778','pkg_xl',499000,'momo',   'o_8814','pending','',        'PTG'],
      ['2026-04-22 10:35:22','u_823120042','pkg_sm', 49000,'viettel','o_8815','settled','SPRING10','PTG'],
    ],
  },
};

// Field mapping state for Mapping Studio (raw → standard)
const BR_MAPPINGS = {
  'login_logout_ptg': [
    { raw: 'ts',       rawType: 'epoch_sec', std: 'event_time',   stdType: 'timestamp',  transform: 'to_timestamp(ts)',                confidence: 99, required: true },
    { raw: 'uid',      rawType: 'string',    std: 'user_id',      stdType: 'string',     transform: "concat('u_', uid)",               confidence: 100, required: true },
    { raw: 'evt',      rawType: 'enum',      std: 'event_type',   stdType: 'enum',       transform: "map('login'→'session_start', 'logout'→'session_end')", confidence: 96, required: true },
    { raw: 'dvc',      rawType: 'enum',      std: 'platform',     stdType: 'enum',       transform: "map('and'→'android', 'ios'→'ios')", confidence: 100, required: true },
    { raw: 'cc',       rawType: 'string',    std: 'country',      stdType: 'iso_cc',     transform: 'upper(cc)',                       confidence: 100, required: true },
    { raw: 'sess_id',  rawType: 'string',    std: 'session_id',   stdType: 'string',     transform: 'sess_id',                         confidence: 100, required: true },
    { raw: 'app_ver',  rawType: 'string',    std: 'app_version',  stdType: 'semver',     transform: 'app_ver',                         confidence: 92,  required: false },
    { raw: 'os',       rawType: 'string',    std: 'os_version',   stdType: 'string',     transform: 'os',                              confidence: 88,  required: false },
  ],
  'moneyflow_ptg': [
    { raw: 'ts',        rawType: 'epoch_sec', std: 'event_time',       stdType: 'timestamp', transform: 'to_timestamp(ts)',         confidence: 99,  required: true },
    { raw: 'uid',       rawType: 'string',    std: 'user_id',          stdType: 'string',    transform: "concat('u_', uid)",        confidence: 100, required: true },
    { raw: 'typ',       rawType: 'enum',      std: 'action_type',      stdType: 'enum',      transform: "map('earn'→'currency_earn','spend'→'currency_spend')", confidence: 98, required: true },
    { raw: 'amt',       rawType: 'string',    std: 'amount',           stdType: 'bigint',    transform: 'cast(amt as bigint)',      confidence: 100, required: true },
    { raw: 'cur',       rawType: 'enum',      std: 'currency',         stdType: 'enum',      transform: 'cur',                      confidence: 100, required: true },
    { raw: 'txn',       rawType: 'string',    std: 'transaction_ref',  stdType: 'string',    transform: 'txn',                      confidence: 96,  required: false },
    { raw: 'bal_after', rawType: 'string',    std: 'balance_after',    stdType: 'bigint',    transform: 'cast(bal_after as bigint)',confidence: 100, required: false },
    { raw: 'item_ref',  rawType: 'string',    std: 'item_ref',         stdType: 'string',    transform: 'item_ref',                 confidence: 72,  required: false, warning: 'Sparse · only 34% populated' },
  ],
  'recharge_ptg': [
    { raw: 'ts',        rawType: 'epoch_sec', std: 'event_time',     stdType: 'timestamp', transform: 'to_timestamp(ts)',  confidence: 99,  required: true },
    { raw: 'uid',       rawType: 'string',    std: 'user_id',        stdType: 'string',    transform: "concat('u_', uid)", confidence: 100, required: true },
    { raw: 'pkg_id',    rawType: 'string',    std: 'package_id',     stdType: 'string',    transform: 'pkg_id',            confidence: 100, required: true },
    { raw: 'price_vnd', rawType: 'string',    std: 'amount_vnd',     stdType: 'bigint',    transform: 'cast(price_vnd as bigint)', confidence: 100, required: true },
    { raw: 'gw',        rawType: 'enum',      std: 'payment_gateway',stdType: 'enum',      transform: 'gw',                confidence: 100, required: true },
    { raw: 'order_id',  rawType: 'string',    std: 'order_id',       stdType: 'string',    transform: 'order_id',          confidence: 100, required: true },
    { raw: 'status',    rawType: 'enum',      std: 'status',         stdType: 'enum',      transform: 'status',            confidence: 100, required: true },
    { raw: 'promo',     rawType: 'string',    std: 'promo_code',     stdType: 'string',    transform: 'promo',             confidence: 86,  required: false },
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
