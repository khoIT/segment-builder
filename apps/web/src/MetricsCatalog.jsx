import React from 'react';
import { T, Icon, Button, Card, Input, Select, Switch, SectionHeader, Sparkline } from './theme.jsx';
import { BR_METRIC_CATEGORIES } from './bedrockData.jsx';
import { useMetrics } from './api/hooks.js';
import { METRIC_TOP_GROUPS, seriesForMetric, last7dAvg, delta7d, formatMetricValue } from './metrics-mock-series.jsx';
import { MetricsCatalogDetail } from './metrics-catalog-detail.jsx';
import { MetricsCatalogCompare } from './metrics-catalog-compare.jsx';
import { MetricSignals, STATUS_META } from './metrics-signals.jsx';

// ═══════════════════════════════════════════════════════════════════════
// METRICS CATALOG — minimalist list + drill-down detail.
// List view: search + 5 pill filters + flat rows (pin · name/desc · 30d
// sparkline · 7D avg/delta), with optional compare-mode multi-select.
// Detail view (in-page state swap): single metric chart + metadata panel.
// Compare view (in-page state swap): N metrics side-by-side mini-detail cards.
// ═══════════════════════════════════════════════════════════════════════

const PINS_KEY = 'bedrock_metric_pins';
const REALTIME_FLAG_KEY = 'bedrock_metric_realtime_only';

// Generic localStorage-backed boolean (used by realtime filter).
function usePersistedFlag(key, defaultValue = false) {
  const [val, setVal] = React.useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? defaultValue : JSON.parse(raw);
    } catch { return defaultValue; }
  });
  React.useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, val]);
  return [val, setVal];
}

// Snake_case → Title Case for display.
function prettyName(name) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// One-line human description per metric. Falls back to the formula if a
// metric is added without a hand-tuned blurb (safe default, no crash).
const _BLURBS = {
  sessions_last_7d: 'Total sessions across the last 7 days.',
  sessions_last_30d: 'Total sessions across the last 30 days.',
  playtime_minutes_7d: 'Sum of session minutes across 7 days.',
  days_active_30d: 'Distinct active days over the last 30 days.',
  minutes_since_last_seen: 'Time elapsed since the last observed event.',
  spend_usd_30d: 'Settled spend in USD over the last 30 days.',
  spend_usd_7d: 'Settled spend in USD over the last 7 days.',
  lifetime_value_usd: 'Total settled spend over the user lifetime.',
  days_since_first_purchase: 'Days elapsed since the first paid transaction.',
  arpdau_7d: 'Average revenue per daily active user, 7-day window.',
  current_rank_tier: 'Latest competitive rank tier observed.',
  account_level: 'Latest account level observed.',
  quests_completed_7d: 'Quests completed in the last 7 days.',
  retained_d1: 'Whether the user returned on day 1 post-install.',
  dormant_days: 'Days since the user was last active.',
  friends_count: 'Active in-game friends.',
  guild_role: 'Latest guild role observed.',
  crash_rate_7d: 'Crashes per session, 7-day window.',
  device_class: 'Device performance class lookup.',
  churn_risk_score: 'Probability the user churns in the next window.',
  propensity_to_pay: 'Probability the user will pay in the window.',
  whale_propensity: 'Probability of $50+ spend in 30 days.',
  reactivation_propensity: 'Probability a dormant user returns.',
  club_upgrade_propensity: 'Probability of upgrading club tier.',
};
function formulaToBlurb(m) {
  return _BLURBS[m.name] || m.formula;
}

// ─── Pinned metric persistence (localStorage, set of metric ids) ────────
function usePinnedMetrics() {
  const [pinned, setPinned] = React.useState(() => {
    try {
      const raw = localStorage.getItem(PINS_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });
  const toggle = React.useCallback(id => {
    setPinned(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(PINS_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);
  return [pinned, toggle];
}

// ─── Filter pill (active = solid black, inactive = bordered ghost) ─────
function GroupPill({ active, label, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 9999, cursor: 'pointer',
      fontSize: 12, fontWeight: 500, userSelect: 'none',
      background: active ? T.n950 : 'transparent',
      color: active ? '#fff' : T.n800,
      border: `1px solid ${active ? T.n950 : T.n200}`,
      transition: 'background .12s, color .12s, border-color .12s',
    }}>{label}</div>
  );
}

// ─── A single row in the list ──────────────────────────────────────────
// Columns: [pin | (compare) | name + blurb | sparkline | 7D avg + delta]
function MetricRow({ m, pinned, onTogglePin, compareMode, selected, onToggleSelect, onOpen, onClickStatus }) {
  const isCategorical = m.unit === 'enum' || m.unit === 'string';
  const avg = last7dAvg(m);
  const d = delta7d(m);
  const positive = d >= 0;
  const good = (positive && m.goodDir === 'up') || (!positive && m.goodDir === 'down');
  const sparkData = React.useMemo(
    () => (isCategorical ? null : seriesForMetric(m).slice(-30).map(p => p.value)),
    [m.id, isCategorical]
  );

  // Stop row click from bubbling into the open-detail handler.
  const swallow = (e, fn) => { e.stopPropagation(); fn(); };

  const cols = compareMode
    ? '32px 32px 1fr 110px 160px'
    : '32px 1fr 110px 160px';

  return (
    <div onClick={() => (compareMode ? onToggleSelect() : onOpen())} style={{
      display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 8,
      padding: '14px 20px', borderTop: `1px solid ${T.n200}`,
      cursor: 'pointer', transition: 'background .12s',
      background: compareMode && selected ? T.brandSoft : 'transparent',
    }}
    onMouseEnter={e => { if (!(compareMode && selected)) e.currentTarget.style.background = T.n50; }}
    onMouseLeave={e => { e.currentTarget.style.background = compareMode && selected ? T.brandSoft : 'transparent'; }}>
      {/* Pin star */}
      <div onClick={e => swallow(e, () => onTogglePin(m.id))}
        title={pinned ? 'Unpin metric' : 'Pin metric'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 6,
          color: pinned ? T.brand : T.n400,
          transition: 'color .12s, background .12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = T.n100; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
        <Icon name="star" size={14} />
      </div>

      {/* Compare checkbox (only in compare mode) */}
      {compareMode && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 16, height: 16, borderRadius: 4,
            border: `1.5px solid ${selected ? T.brand : T.n300}`,
            background: selected ? T.brand : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background .12s, border-color .12s',
          }}>
            {selected && <Icon name="check" size={11} color="#fff" />}
          </div>
        </div>
      )}

      {/* Name + description */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.n900 }}>
          {prettyName(m.name)}
          <MetricSignals m={m} onClickStatus={onClickStatus} />
        </div>
        <div style={{ fontSize: 12, color: T.n500, marginTop: 2 }}>
          {formulaToBlurb(m)}
          {m.usedBy != null && (
            <span style={{ color: T.n400 }}> · Used by {m.usedBy} segments</span>
          )}
        </div>
      </div>

      {/* Sparkline (categorical metrics show a dash) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        {sparkData
          ? <Sparkline data={sparkData} width={100} height={28} color={good ? T.green600 : T.red600} />
          : <span style={{ fontSize: 11, color: T.n400 }}>—</span>}
      </div>

      {/* Last 7D average + delta */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.n900 }}>
          {isCategorical ? '—' : formatMetricValue(avg, m.unit)}
        </div>
        {!isCategorical && (
          <div style={{
            fontSize: 11, fontWeight: 600, marginTop: 2,
            color: good ? T.green600 : T.red600,
          }}>
            {positive ? '+' : ''}{d.toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New custom metric modal (kept from previous version) ──────────────
function NewMetricModal({ onClose }) {
  const [name, setName] = React.useState('arpdau_30d');
  const [category, setCategory] = React.useState('monetization');
  const [realtime, setRealtime] = React.useState(false);
  const [freq, setFreq] = React.useState('hourly');
  const [formula, setFormula] = React.useState('spend_usd_30d / days_active_30d');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: 640, maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 12,
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.4)', border: `1px solid ${T.n200}`,
      }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.brandSoft, color: T.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus-square" size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.n950 }}>New custom metric</div>
            <div style={{ fontSize: 11, color: T.n500 }}>Starts as Experimental. An owner reviews before Certifying.</div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}><Icon name="x" size={14} /></Button>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.n600, marginBottom: 4 }}>Metric name</div>
            <Input value={name} onChange={e => setName(e.target.value)} style={{ fontFamily: T.fMono }} />
            <div style={{ fontSize: 10, color: T.n500, marginTop: 4 }}>Use snake_case. Must be unique across catalog.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.n600, marginBottom: 4 }}>Category</div>
              <Select value={category} onChange={e => setCategory(e.target.value)} options={BR_METRIC_CATEGORIES.map(c => ({ value: c.id, label: c.label }))} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.n600, marginBottom: 4 }}>Update frequency</div>
              <Select value={freq} onChange={e => setFreq(e.target.value)} options={[
                { value: 'streaming', label: 'Streaming (realtime)' },
                { value: 'hourly',    label: 'Hourly' },
                { value: 'daily',     label: 'Daily' },
                { value: 'weekly',    label: 'Weekly' },
              ]} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.n600, marginBottom: 4 }}>Formula</div>
            <textarea
              value={formula}
              onChange={e => setFormula(e.target.value)}
              style={{
                width: '100%', minHeight: 90, padding: 12, borderRadius: 8, border: `1px solid ${T.n200}`,
                fontFamily: T.fMono, fontSize: 12, color: T.n900, resize: 'vertical',
                background: T.n50, outline: 'none',
              }}
            />
          </div>
          <div style={{ padding: 14, borderRadius: 10, background: realtime ? T.brandSoft : T.n50, border: `1px solid ${realtime ? T.brandBorder : T.n200}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="zap" size={18} color={realtime ? T.brand : T.n500} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.n900 }}>Realtime-capable</div>
              <div style={{ fontSize: 11, color: T.n500, marginTop: 2 }}>
                Required for use in <strong>realtime segments</strong>.
              </div>
            </div>
            <Switch checked={realtime} onChange={setRealtime} />
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${T.n200}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="outline" leftIcon="play">Test formula</Button>
          <Button variant="primary" leftIcon="check">Save as experimental</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page controller — list ↔ detail ↔ compare ─────────────────────────
function MetricsCatalog({ setPage }) {
  const [group, setGroup] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [showNew, setShowNew] = React.useState(false);
  const [pinned, togglePin] = usePinnedMetrics();
  const [realtimeOnly, setRealtimeOnly] = usePersistedFlag(REALTIME_FLAG_KEY);
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [compareMode, setCompareMode] = React.useState(false);
  const [compareSelection, setCompareSelection] = React.useState(() => new Set());
  const [compareView, setCompareView] = React.useState(false);

  // Live API or fallback to BR_METRICS via api/hooks.js
  const metricsQ = useMetrics();
  const allMetrics = metricsQ.data?.items ?? [];

  const selectedMetric = React.useMemo(
    () => (selected ? allMetrics.find(m => m.id === selected) : null),
    [selected, allMetrics]
  );

  const compareMetrics = React.useMemo(
    () => allMetrics.filter(m => compareSelection.has(m.id)),
    [compareSelection, allMetrics]
  );

  // ── Compare view route ─────────────────────────────────────────────
  if (compareView && compareMetrics.length >= 2) {
    return (
      <MetricsCatalogCompare
        metrics={compareMetrics}
        prettyName={prettyName}
        formulaToBlurb={formulaToBlurb}
        onBack={() => setCompareView(false)}
        onRemove={id => {
          setCompareSelection(prev => {
            const next = new Set(prev);
            next.delete(id);
            // Auto-exit compare view if we drop below 2 metrics.
            if (next.size < 2) setCompareView(false);
            return next;
          });
        }}
      />
    );
  }

  // ── Single detail route ────────────────────────────────────────────
  if (selectedMetric) {
    return (
      <>
        <MetricsCatalogDetail
          metric={selectedMetric}
          onBack={() => setSelected(null)}
          prettyName={prettyName}
          formulaToBlurb={formulaToBlurb}
          onFilterStatus={status => { setStatusFilter(status); setSelected(null); }}
          onViewSegments={() => setPage && setPage('builder')}
        />
        {showNew && <NewMetricModal onClose={() => setShowNew(false)} />}
      </>
    );
  }

  // Filter, then sort: pinned first (preserve original order within each group).
  const filtered = allMetrics.filter(m => {
    if (group !== 'all' && m.topGroup !== group) return false;
    if (realtimeOnly && !m.realtime) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !prettyName(m.name).toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const sorted = [
    ...filtered.filter(m => pinned.has(m.id)),
    ...filtered.filter(m => !pinned.has(m.id)),
  ];

  const toggleSelectMetric = id => {
    setCompareSelection(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setCompareSelection(new Set());
  };

  return (
    <div style={{
      padding: '32px 32px 48px', display: 'flex', flexDirection: 'column', gap: 20,
      height: '100%', overflow: 'auto', background: T.n50,
    }}>
      <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SectionHeader
          title="Metrics"
          right={<>
            <Button
              variant={compareMode ? 'neutral' : 'outline'}
              leftIcon={compareMode ? 'x' : 'columns'}
              onClick={() => (compareMode ? exitCompareMode() : setCompareMode(true))}
            >
              {compareMode ? 'Exit compare' : 'Compare'}
            </Button>
            <Button variant="outline" leftIcon="database" onClick={() => setPage && setPage('sources')}>
              Data Catalog
            </Button>
            <Button variant="neutral" leftIcon="plus" onClick={() => setShowNew(true)}>New Metric</Button>
          </>}
        />

        <Input
          size="default"
          leftIcon="search"
          placeholder="Search metrics..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <GroupPill label="All" active={group === 'all'} onClick={() => setGroup('all')} />
          {METRIC_TOP_GROUPS.map(g => (
            <GroupPill key={g.id} label={g.label} active={group === g.id} onClick={() => setGroup(g.id)} />
          ))}
          <div style={{ width: 1, height: 18, background: T.n200, margin: '0 4px' }} />
          <div onClick={() => setRealtimeOnly(v => !v)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 9999, cursor: 'pointer',
            fontSize: 12, fontWeight: 500, userSelect: 'none',
            background: realtimeOnly ? T.brandSoft : 'transparent',
            color: realtimeOnly ? T.brand : T.n800,
            border: `1px solid ${realtimeOnly ? T.brandBorder : T.n200}`,
            transition: 'background .12s, color .12s, border-color .12s',
          }}>
            <Icon name="zap" size={12} /> Realtime only
          </div>
          {statusFilter !== 'all' && (
            <div onClick={() => setStatusFilter('all')} title="Clear status filter" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 10px 7px 12px', borderRadius: 9999, cursor: 'pointer',
              fontSize: 12, fontWeight: 500, userSelect: 'none',
              background: STATUS_META[statusFilter].bg,
              color: STATUS_META[statusFilter].color,
              border: `1px solid ${STATUS_META[statusFilter].bg}`,
            }}>
              Status: {STATUS_META[statusFilter].label}
              <Icon name="x" size={12} />
            </div>
          )}
        </div>

        <Card padding={0}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: compareMode ? '32px 32px 1fr 110px 160px' : '32px 1fr 110px 160px',
            alignItems: 'center', gap: 8,
            padding: '14px 20px',
            fontSize: 10, fontWeight: 600, color: T.n500,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <div />
            {compareMode && <div />}
            <div>Metric Name</div>
            <div>30D Trend</div>
            <div>Last 7D Average</div>
          </div>
          {sorted.map(m => (
            <MetricRow
              key={m.id}
              m={m}
              pinned={pinned.has(m.id)}
              onTogglePin={togglePin}
              compareMode={compareMode}
              selected={compareSelection.has(m.id)}
              onToggleSelect={() => toggleSelectMetric(m.id)}
              onOpen={() => setSelected(m.id)}
              onClickStatus={status => setStatusFilter(s => s === status ? 'all' : status)}
            />
          ))}
          {sorted.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: T.n500, fontSize: 12, borderTop: `1px solid ${T.n200}` }}>
              <Icon name="search-x" size={24} color={T.n300} />
              <div style={{ marginTop: 8 }}>No metrics match these filters</div>
            </div>
          )}
        </Card>
      </div>

      {/* Compare-mode floating action bar */}
      {compareMode && (
        <div style={{
          position: 'sticky', bottom: 16, alignSelf: 'center', zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px 10px 16px', borderRadius: 9999,
          background: T.n950, color: '#fff',
          boxShadow: '0 12px 28px -8px rgba(0,0,0,0.35)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>
            {compareSelection.size} selected
            {compareSelection.size < 2 && <span style={{ color: T.n400, marginLeft: 6 }}>· pick 2+ to compare</span>}
          </span>
          <Button
            variant="primary"
            size="sm"
            leftIcon="columns"
            onClick={() => setCompareView(true)}
            disabled={compareSelection.size < 2}
          >
            Compare {compareSelection.size}
          </Button>
        </div>
      )}

      {showNew && <NewMetricModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

Object.assign(window, { MetricsCatalog });

export { MetricsCatalog };
