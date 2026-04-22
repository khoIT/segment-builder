// Mock data for the LiveOps prototype — VNGGames titles: PTG, CFM, TFB

const GAMES = [
  { id: 'ptg', name: 'Play Together', short: 'PTG', color: '#f05a22', players: '2.4M DAU', genre: 'Social sandbox' },
  { id: 'cfm', name: 'CrossFire Mobile', short: 'CFM', color: '#dc2626', players: '1.8M DAU', genre: 'FPS' },
  { id: 'tfb', name: 'Total Football', short: 'TFB', color: '#059669', players: '920K DAU', genre: 'Sports' },
];

const CONNECTORS = [
  { id: 'pg_prod',   type: 'postgres', name: 'analytics-prod',    status: 'live',    rows: '14.2B', tables: 248, latency: '12ms',  host: 'analytics.prod.vng.internal:5432', owner: 'Data Platform' },
  { id: 'trino_dw',  type: 'trino',    name: 'trino-warehouse',   status: 'live',    rows: '902B',  tables: 1821, latency: '340ms', host: 'trino.warehouse.vng:8080', owner: 'Data Platform' },
  { id: 'iceberg',   type: 'iceberg',  name: 'iceberg-events',    status: 'live',    rows: '4.1T',  tables: 87,   latency: '820ms', host: 's3://vng-iceberg/events', owner: 'Data Platform' },
  { id: 'pg_ptg',    type: 'postgres', name: 'ptg-game-state',    status: 'live',    rows: '812M',  tables: 124,  latency: '8ms',   host: 'ptg.db.vng.internal:5432', owner: 'PTG LiveOps' },
  { id: 'trino_cfm', type: 'trino',    name: 'cfm-warehouse',     status: 'syncing', rows: '201B',  tables: 412,  latency: '410ms', host: 'trino.cfm.vng:8080', owner: 'CFM LiveOps' },
  { id: 'iceberg_tfb', type: 'iceberg',name: 'tfb-match-events',  status: 'error',   rows: '88B',   tables: 34,   latency: '—',     host: 's3://vng-iceberg/tfb', owner: 'TFB LiveOps' },
];

const TABLES = [
  { name: 'events.session_start',     rows: '4.12B',   cols: 18, game: 'PTG', partition: 'event_date', freshness: '2m',  pct: 99.8 },
  { name: 'events.purchase',          rows: '218M',    cols: 26, game: 'PTG', partition: 'event_date', freshness: '3m',  pct: 100 },
  { name: 'features.player_daily',    rows: '1.12B',   cols: 84, game: 'PTG', partition: 'dt',         freshness: '1h',  pct: 99.2 },
  { name: 'events.match_result',      rows: '2.88B',   cols: 31, game: 'CFM', partition: 'event_date', freshness: '4m',  pct: 98.4 },
  { name: 'events.weapon_unlock',     rows: '142M',    cols: 14, game: 'CFM', partition: 'event_date', freshness: '6m',  pct: 99.1 },
  { name: 'features.player_daily',    rows: '920M',    cols: 76, game: 'CFM', partition: 'dt',         freshness: '1h',  pct: 97.9 },
  { name: 'events.match_event',       rows: '1.24B',   cols: 22, game: 'TFB', partition: 'event_date', freshness: '12m', pct: 96.2 },
  { name: 'events.player_transfer',   rows: '48M',     cols: 19, game: 'TFB', partition: 'event_date', freshness: '18m', pct: 98.8 },
];

const FEATURES = [
  { id: 'f_sessions_7d',    name: 'sessions_last_7d',          type: 'numeric', game: 'PTG', agg: 'COUNT',   window: '7d rolling', users: '2.4M', last: '1h ago',  q: 'count(session_id) FILTER …', owner: 'data.liveops' },
  { id: 'f_purchase_30d',   name: 'purchase_amount_30d',       type: 'numeric', game: 'PTG', agg: 'SUM',     window: '30d rolling', users: '2.4M', last: '2h ago',  q: 'sum(usd_amount) FILTER …', owner: 'data.liveops' },
  { id: 'f_churn_risk',     name: 'churn_risk_score',          type: 'numeric', game: 'PTG', agg: 'ML',      window: 'daily',       users: '2.4M', last: '32m ago', q: 'propensity_v4.predict …',  owner: 'ds.propensity' },
  { id: 'f_avatar_tier',    name: 'avatar_cosmetic_tier',      type: 'string',  game: 'PTG', agg: 'LATEST',  window: 'realtime',    users: '2.4M', last: '1m ago',  q: 'last(tier) OVER …',       owner: 'data.liveops' },
  { id: 'f_kd_30d',         name: 'kd_ratio_30d',              type: 'numeric', game: 'CFM', agg: 'AVG',     window: '30d rolling', users: '1.8M', last: '1h ago',  q: 'avg(kills/deaths) …',     owner: 'data.liveops' },
  { id: 'f_weapon_pref',    name: 'preferred_weapon_class',    type: 'string',  game: 'CFM', agg: 'MODE',    window: '30d rolling', users: '1.8M', last: '2h ago',  q: 'mode(weapon_class) …',    owner: 'data.liveops' },
  { id: 'f_rank_tier',      name: 'current_rank_tier',         type: 'string',  game: 'CFM', agg: 'LATEST',  window: 'realtime',    users: '1.8M', last: '1m ago',  q: 'last(rank_tier) OVER …',  owner: 'data.liveops' },
  { id: 'f_matches_30d',    name: 'matches_played_30d',        type: 'numeric', game: 'TFB', agg: 'COUNT',   window: '30d rolling', users: '920K', last: '1h ago',  q: 'count(match_id) FILTER …', owner: 'data.liveops' },
  { id: 'f_club_tier',      name: 'club_subscription_tier',    type: 'string',  game: 'TFB', agg: 'LATEST',  window: 'realtime',    users: '920K', last: '1m ago',  q: 'last(club_tier) OVER …',  owner: 'data.liveops' },
  { id: 'f_propensity_pay', name: 'propensity_to_pay',         type: 'numeric', game: 'ALL', agg: 'ML',      window: 'daily',       users: '5.1M', last: '48m ago', q: 'propensity_v7.predict …', owner: 'ds.propensity' },
];

const MODELS = [
  { id: 'm_churn_ptg',       name: 'PTG Churn v4',         target: 'Will churn in 14 days', game: 'PTG', auc: 0.872, samples: '2.4M', trained: '3h ago', status: 'production' },
  { id: 'm_pay_ptg',         name: 'PTG Propensity to Pay v7', target: 'Will spend $5+ in 7d', game: 'PTG', auc: 0.814, samples: '2.4M', trained: '12h ago', status: 'production' },
  { id: 'm_churn_cfm',       name: 'CFM Churn v2',         target: 'Will churn in 7 days',  game: 'CFM', auc: 0.841, samples: '1.8M', trained: '1d ago', status: 'production' },
  { id: 'm_whale_cfm',       name: 'CFM Whale Propensity', target: 'Will spend $50+ in 30d',game: 'CFM', auc: 0.789, samples: '1.8M', trained: '6h ago', status: 'production' },
  { id: 'm_club_tfb',        name: 'TFB Club Upgrade',     target: 'Will upgrade club tier',game: 'TFB', auc: 0.762, samples: '920K', trained: '18h ago', status: 'staging' },
  { id: 'm_return_cfm',      name: 'CFM Reactivation',     target: 'Dormant will return',   game: 'CFM', auc: 0.704, samples: '340K', trained: '2h ago', status: 'training' },
];

const SEGMENTS = [
  { id: 's_ptg_whales',    name: 'PTG High-Value at Risk', game: 'PTG', size: 18420,  sizeTrend: 'up',   delta: '+312', status: 'live',   owner: 'Linh Pham',    updated: '2m ago',  campaigns: 3, desc: 'Top 5% spenders with rising churn risk' },
  { id: 's_cfm_lapsed',    name: 'CFM Lapsed Mid-Core',    game: 'CFM', size: 84120,  sizeTrend: 'down', delta: '-1.2K',status: 'live',   owner: 'An Tran',      updated: '12m ago', campaigns: 2, desc: 'Rank Gold+ dormant 7-14 days' },
  { id: 's_tfb_new_clubs', name: 'TFB New Club Upgrades',  game: 'TFB', size: 6204,   sizeTrend: 'up',   delta: '+184', status: 'live',   owner: 'Mai Nguyen',   updated: '18m ago', campaigns: 1, desc: 'Recently upgraded to Pro club tier' },
  { id: 's_ptg_onboard',   name: 'PTG D1 Onboarding',      game: 'PTG', size: 42890,  sizeTrend: 'up',   delta: '+2.1K',status: 'live',   owner: 'Linh Pham',    updated: '5m ago',  campaigns: 4, desc: 'New installs, hit tutorial step 3' },
  { id: 's_cfm_whales',    name: 'CFM Active Whales',      game: 'CFM', size: 3120,   sizeTrend: 'flat', delta: '+8',   status: 'live',   owner: 'An Tran',      updated: '1h ago',  campaigns: 5, desc: '$50+ spend / 30d, active this week' },
  { id: 's_ptg_cosmetic',  name: 'PTG Cosmetic Collectors',game: 'PTG', size: 22140,  sizeTrend: 'up',   delta: '+420', status: 'draft',  owner: 'Linh Pham',    updated: 'Just now',campaigns: 0, desc: 'Own 20+ avatar items, no purchase 14d' },
  { id: 's_tfb_weekend',   name: 'TFB Weekend Warriors',   game: 'TFB', size: 54210,  sizeTrend: 'up',   delta: '+3.4K',status: 'paused', owner: 'Mai Nguyen',   updated: '3h ago',  campaigns: 2, desc: 'Plays 10+ matches Sat/Sun only' },
];

const CAMPAIGNS = [
  { id: 'c_ptg_retain', name: 'PTG Retention Bundle Q2', segment: 's_ptg_whales', game: 'PTG', channel: 'push + in-game', status: 'running', sent: '18.4K', reached: 17102, converted: 3821, revenue: '₫ 1.24B',   ctr: '22.4%', start: 'Apr 18', end: 'May 02' },
  { id: 'c_ptg_onboard',name: 'PTG D1 Welcome Offer',    segment: 's_ptg_onboard',game: 'PTG', channel: 'in-game',       status: 'running', sent: '42.8K', reached: 40210, converted: 9421, revenue: '₫ 482M',    ctr: '23.4%', start: 'Ongoing', end: 'Ongoing' },
  { id: 'c_cfm_whale',  name: 'CFM Whale Elite Pass',    segment: 's_cfm_whales', game: 'CFM', channel: 'email + push',  status: 'running', sent: '3.1K',  reached: 3088,  converted: 812,  revenue: '₫ 2.12B',   ctr: '26.3%', start: 'Apr 15', end: 'Apr 29' },
  { id: 'c_cfm_lapsed', name: 'CFM Comeback Rewards',    segment: 's_cfm_lapsed', game: 'CFM', channel: 'push + email',  status: 'paused',  sent: '84.1K', reached: 78222, converted: 4218, revenue: '₫ 188M',    ctr: '5.4%',  start: 'Apr 10', end: 'Apr 24' },
  { id: 'c_tfb_club',   name: 'TFB Pro Club Welcome',    segment: 's_tfb_new_clubs', game: 'TFB',channel: 'in-game',     status: 'running', sent: '6.2K',  reached: 6041,  converted: 1422, revenue: '₫ 92M',     ctr: '23.5%', start: 'Apr 17', end: 'May 15' },
  { id: 'c_tfb_weekend',name: 'TFB Weekend Challenge',   segment: 's_tfb_weekend',game: 'TFB', channel: 'push',          status: 'scheduled',sent: '—',    reached: 0,     converted: 0,    revenue: '—',         ctr: '—',    start: 'Apr 26', end: 'Apr 28' },
];

// ─── Time series helpers ───
function genSeries(n = 60, base = 1000, vol = 0.08, drift = 0.002) {
  let v = base, out = [];
  for (let i = 0; i < n; i++) {
    v = v * (1 + drift) + (Math.random() - 0.5) * base * vol;
    out.push(Math.max(1, Math.round(v)));
  }
  return out;
}
const SEED = (() => {
  // fixed-ish seeds for prototype feel
  const r = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
  return r;
})();
function seededSeries(n, base, vol, drift, seed) {
  const rand = SEED(seed);
  let v = base, out = [];
  for (let i = 0; i < n; i++) {
    v = v * (1 + drift) + (rand() - 0.5) * base * vol;
    out.push(Math.max(1, Math.round(v)));
  }
  return out;
}

const SEGMENT_SERIES = {
  s_ptg_whales:    seededSeries(72, 15000, 0.04, 0.004, 42),
  s_cfm_lapsed:    seededSeries(72, 90000, 0.05, -0.002, 11),
  s_tfb_new_clubs: seededSeries(72, 4800,  0.06, 0.008, 17),
  s_ptg_onboard:   seededSeries(72, 38000, 0.07, 0.006, 23),
  s_cfm_whales:    seededSeries(72, 3000,  0.03, 0.001, 7),
  s_ptg_cosmetic:  seededSeries(72, 21000, 0.05, 0.003, 31),
  s_tfb_weekend:   seededSeries(72, 48000, 0.08, 0.004, 5),
};

// cohort overlap (symmetric) — percentages
const OVERLAP = [
  ['', 'Whales', 'Onboard', 'Cosmetic', 'Lapsed', 'Weekend', 'Clubs'],
  ['Whales',    100, 6,   42,  2,   8,   12],
  ['Onboard',   6,   100, 18,  1,   22,  4],
  ['Cosmetic',  42,  18,  100, 3,   14,  9],
  ['Lapsed',    2,   1,   3,   100, 8,   4],
  ['Weekend',   8,   22,  14,  8,   100, 31],
  ['Clubs',     12,  4,   9,   4,   31,  100],
];

// drift alerts
const DRIFT_ALERTS = [
  { feature: 'purchase_amount_30d', game: 'PTG', severity: 'high',   psi: 0.28, drift: '+18.2%', ts: '12m ago', note: 'Spike in top decile after event drop' },
  { feature: 'kd_ratio_30d',        game: 'CFM', severity: 'medium', psi: 0.14, drift: '-6.4%',  ts: '42m ago', note: 'Matchmaking pool shifted weekend' },
  { feature: 'churn_risk_score',    game: 'PTG', severity: 'low',    psi: 0.08, drift: '+2.1%',  ts: '1h ago',  note: 'Expected seasonal drift' },
  { feature: 'matches_played_30d',  game: 'TFB', severity: 'high',   psi: 0.32, drift: '+24.8%', ts: '2h ago',  note: 'New tournament driving volume' },
];

// retention curves per segment (day 0..30)
function retentionCurve(d0, decay, seed) {
  const rand = SEED(seed);
  return Array.from({ length: 31 }, (_, i) => {
    const base = d0 * Math.exp(-decay * i);
    return Math.max(0.02, base + (rand() - 0.5) * 0.02);
  });
}
const RETENTION = {
  s_ptg_whales:    retentionCurve(1, 0.03, 42),
  s_ptg_onboard:   retentionCurve(1, 0.12, 17),
  s_cfm_whales:    retentionCurve(1, 0.02, 7),
  s_cfm_lapsed:    retentionCurve(0.22, 0.04, 11),
  s_tfb_weekend:   retentionCurve(1, 0.06, 5),
};

// campaign funnel
const FUNNEL = [
  { step: 'Sent',       value: 18400 },
  { step: 'Delivered',  value: 17980 },
  { step: 'Opened',     value: 12120 },
  { step: 'Clicked',    value: 4120 },
  { step: 'Converted',  value: 3821 },
];

// ARPU over time
const ARPU_SERIES = {
  s_ptg_whales:   seededSeries(30, 42, 0.04, 0.003, 101),
  s_cfm_whales:   seededSeries(30, 68, 0.03, 0.001, 102),
  s_tfb_new_clubs:seededSeries(30, 18, 0.05, 0.004, 103),
  s_ptg_onboard:  seededSeries(30, 3.2,0.08, 0.006, 104),
};

// raw data preview rows for the explorer
const SAMPLE_ROWS = Array.from({ length: 16 }, (_, i) => ({
  user_id: `u_${(823_113_000 + i * 37).toString(36)}`,
  event_date: '2026-04-22',
  country: ['VN','VN','VN','TH','PH','ID','VN','VN','MY','VN','VN','SG','VN','TH','VN','VN'][i],
  platform: ['ios','and','and','ios','and','and','ios','and','ios','and','and','ios','and','ios','and','and'][i],
  sessions: [4,12,1,6,3,2,18,8,5,9,14,2,6,11,3,7][i],
  spend_usd: [0, 8.99, 0, 4.99, 0, 0, 42.50, 0, 1.99, 0, 18.99, 0, 0, 99.99, 0, 2.99][i],
  churn_risk: [0.08, 0.42, 0.91, 0.22, 0.67, 0.88, 0.04, 0.12, 0.34, 0.28, 0.09, 0.72, 0.41, 0.02, 0.56, 0.19][i],
  propensity_pay: [0.12, 0.84, 0.02, 0.68, 0.08, 0.04, 0.92, 0.48, 0.72, 0.18, 0.88, 0.12, 0.22, 0.97, 0.14, 0.64][i],
  rank_tier: ['Gold','Diamond','Bronze','Plat','Silver','Bronze','Master','Gold','Plat','Silver','Diamond','Bronze','Silver','Master','Silver','Gold'][i],
}));

export { GAMES, CONNECTORS, TABLES, FEATURES, MODELS, SEGMENTS, CAMPAIGNS, SEGMENT_SERIES, OVERLAP, DRIFT_ALERTS, RETENTION, FUNNEL, ARPU_SERIES, SAMPLE_ROWS };
