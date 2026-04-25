// Deterministic mock time-series + delta + value-formatting helpers for
// the Metrics Catalog. Series are seeded by `metric.id` so reloads stay
// stable. Used by both the list view (Last 7D average + delta) and the
// detail view (full chart).
//
// All helpers are pure — no globals, no side effects.

// 32-bit FNV-1a hash → seed for the RNG.
function _hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 — small, fast, deterministic PRNG. One instance per metric
// so multiple metrics don't share state.
function _rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Magnitude per unit so series values feel like real-world metrics.
const _BASE_BY_UNIT = {
  USD: 70_000,
  count: 30_000,
  minutes: 4200,
  days: 12,
  prob: 0.42,
  ratio: 0.012,
  boolean: 0.6,
  enum: 1,
  string: 1,
};

// Anchor "today" for deterministic axis labeling. Matches the demo data
// window in the rest of the prototype.
const _ANCHOR_DATE = '2026-04-22';

// Build a daily time-series for a metric. Series length defaults to ~250
// daily points so the detail chart can show ~Aug 2025 → Apr 2026.
function seriesForMetric(m, days = 250) {
  const rand = _rng(_hash(m.id));
  const base = _BASE_BY_UNIT[m.unit] ?? 100;
  const trend = (rand() - 0.4) * 0.4;          // overall drift across window
  const noise = 0.18;                           // per-point amplitude
  const out = [];
  const today = new Date(_ANCHOR_DATE);
  for (let i = days - 1; i >= 0; i--) {
    const t = (days - 1 - i) / (days - 1);
    const drift = 1 + trend * t;
    const wob = 1 + (rand() - 0.5) * noise;
    let v = base * drift * wob;
    if (m.unit === 'prob' || m.unit === 'ratio') v = Math.max(0, Math.min(1, v / base));
    if (m.unit === 'count') v = Math.round(v);
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), value: v });
  }
  return out;
}

// Average of the last 7 series points.
function last7dAvg(m) {
  const s = seriesForMetric(m);
  const last7 = s.slice(-7);
  return last7.reduce((a, b) => a + b.value, 0) / 7;
}

// Percent change: last 7d average vs prior 7d average.
function delta7d(m) {
  const s = seriesForMetric(m);
  const last = s.slice(-7).reduce((a, b) => a + b.value, 0) / 7;
  const prev = s.slice(-14, -7).reduce((a, b) => a + b.value, 0) / 7;
  if (!prev) return 0;
  return ((last - prev) / prev) * 100;
}

// Resample a daily series into Day / Week / Month buckets by averaging.
function resampleSeries(daily, granularity) {
  if (granularity === 'day') return daily;
  const bucket = granularity === 'week' ? 7 : 30;
  const out = [];
  for (let i = 0; i < daily.length; i += bucket) {
    const slice = daily.slice(i, i + bucket);
    const avg = slice.reduce((a, b) => a + b.value, 0) / slice.length;
    out.push({ date: slice[0].date, value: avg });
  }
  return out;
}

// Human-friendly value rendering — picks scale + suffix from the unit.
function formatMetricValue(v, unit) {
  if (v == null || Number.isNaN(v)) return '—';
  if (unit === 'USD') {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  }
  if (unit === 'count' || unit === 'minutes' || unit === 'days') {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
    return `${Math.round(v)}`;
  }
  if (unit === 'ratio' || unit === 'prob') return `${(v * 100).toFixed(2)}%`;
  if (unit === 'boolean') return `${(v * 100).toFixed(0)}%`;
  if (unit === 'enum' || unit === 'string') return '—';
  return `${v.toFixed(2)}`;
}

// Top-level filter groups for the Metrics Catalog list. Each maps to one
// or more fine-grained categories defined in `bedrockData.jsx`.
const METRIC_TOP_GROUPS = [
  { id: 'engagement', label: 'Engagement', children: ['engagement', 'social'] },
  { id: 'growth',     label: 'Growth',     children: ['retention', 'progression'] },
  { id: 'quality',    label: 'Quality',    children: ['technical', 'propensity'] },
  { id: 'revenue',    label: 'Revenue',    children: ['monetization'] },
];

const _topGroupByCat = Object.fromEntries(
  METRIC_TOP_GROUPS.flatMap(g => g.children.map(c => [c, g.id]))
);

// Returns 'engagement' | 'growth' | 'quality' | 'revenue' for a metric's
// fine-grained category. Defaults to 'engagement' for unknowns.
function topGroupForCategory(category) {
  return _topGroupByCat[category] || 'engagement';
}

// Metrics where higher = bad (so a positive delta should render red).
const _GOOD_DOWN = new Set([
  'm_dormant_days',
  'm_crash_rate_7d',
  'm_churn_risk_ptg',
  'm_churn_cfm',
]);

function goodDirFor(m) {
  return _GOOD_DOWN.has(m.id) ? 'down' : 'up';
}

export {
  seriesForMetric,
  last7dAvg,
  delta7d,
  resampleSeries,
  formatMetricValue,
  METRIC_TOP_GROUPS,
  topGroupForCategory,
  goodDirFor,
};
