import React from 'react';
import { T, Icon, useLucide, Button, Badge, Card, Input, Select, Switch, Tabs, Kpi, SectionHeader, Sparkline } from './theme.jsx';
import { BR_METRICS, BR_METRIC_CATEGORIES } from './bedrockData.jsx';
import { LineageDrawer } from './LineageDrawer.jsx';

/* global React, T, Icon, useLucide, Button, Badge, Card, Input, Select, Switch, Tabs, Kpi, SectionHeader, Sparkline, BR_METRICS, BR_METRIC_CATEGORIES */

// ═══════════════════════════════════════════════════════════════════════
// METRICS CATALOG — the canonical place to discover metrics + define custom ones
// Categorized for the Segment Builder. Each metric flags realtime capability
// so realtime segments only see realtime-capable metrics.
// ═══════════════════════════════════════════════════════════════════════

function StatusPill({ status }) {
  const m = {
    certified:    { bg: '#ecfdf5', fg: T.green600,   label: 'Certified',    icon: 'shield-check' },
    experimental: { bg: '#fef3c7', fg: '#b45309',    label: 'Experimental', icon: 'flask-conical' },
    deprecated:   { bg: T.n100,    fg: T.n500,       label: 'Deprecated',   icon: 'archive' },
  };
  const c = m[status] || m.experimental;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 9999, background: c.bg, color: c.fg, fontSize: 10, fontWeight: 600, letterSpacing: '0.02em' }}>
      <Icon name={c.icon} size={10} /> {c.label}
    </span>
  );
}

function CategoryChip({ cat, active, count, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9,
      cursor: 'pointer', background: active ? '#fff' : 'transparent',
      border: `1px solid ${active ? cat.color : 'transparent'}`,
      boxShadow: active ? `0 1px 2px rgba(0,0,0,0.04)` : 'none',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7,
        background: active ? cat.color : `${cat.color}15`,
        color: active ? '#fff' : cat.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name={cat.icon} size={14} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.n900 }}>{cat.label}</div>
        <div style={{ fontSize: 10, color: T.n500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.desc}</div>
      </div>
      <span style={{ fontFamily: T.fMono, fontSize: 11, color: T.n500, fontWeight: 600 }}>{count}</span>
    </div>
  );
}

function NewMetricModal({ onClose }) {
  const [name, setName] = React.useState('arpdau_30d');
  const [category, setCategory] = React.useState('monetization');
  const [realtime, setRealtime] = React.useState(false);
  const [freq, setFreq] = React.useState('hourly');
  const [formula, setFormula] = React.useState('spend_usd_30d / days_active_30d');
  useLucide(realtime);

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
              <Select value={category} onChange={setCategory} options={BR_METRIC_CATEGORIES.map(c => ({ value: c.id, label: c.label }))} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.n600, marginBottom: 4 }}>Update frequency</div>
              <Select value={freq} onChange={setFreq} options={[
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
            <div style={{ fontSize: 10, color: T.n500, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="info" size={10} /> Reference other metrics by name. Use SQL-style functions: SUM, COUNT, AVG, DATEDIFF, etc.
            </div>
          </div>
          <div style={{ padding: 14, borderRadius: 10, background: realtime ? T.brandSoft : T.n50, border: `1px solid ${realtime ? T.brandBorder : T.n200}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="zap" size={18} color={realtime ? T.brand : T.n500} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.n900 }}>Realtime-capable</div>
              <div style={{ fontSize: 11, color: T.n500, marginTop: 2 }}>
                Enable if this metric can be computed on the Kafka stream. Required for use in <strong>realtime segments</strong>. All dependent metrics must also be realtime-capable.
              </div>
            </div>
            <Switch checked={realtime} onChange={setRealtime} />
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: T.n50, border: `1px dashed ${T.n300}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="shield" size={14} color={T.n500} />
            <div style={{ flex: 1, fontSize: 11, color: T.n600 }}>
              Dependencies detected: <code style={{ fontFamily: T.fMono, color: T.n900 }}>spend_usd_30d</code>, <code style={{ fontFamily: T.fMono, color: T.n900 }}>days_active_30d</code> · both certified · ✓
            </div>
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

function MetricCard({ m, onOpenLineage }) {
  const cat = BR_METRIC_CATEGORIES.find(c => c.id === m.category);
  return (
    <div
      onClick={onOpenLineage}
      style={{
        padding: 14, borderRadius: 10, background: '#fff', border: `1px solid ${T.n200}`,
        display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = cat.color; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.n200; }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: `${cat.color}15`, color: cat.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name={cat.icon} size={14} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fMono, fontSize: 12, fontWeight: 600, color: T.n900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
          <div style={{ fontSize: 10, color: T.n500, marginTop: 1 }}>{m.window} · {m.unit}</div>
        </div>
        {m.realtime && (
          <div title="Realtime-capable" style={{
            width: 22, height: 22, borderRadius: 6, background: T.brandSoft, color: T.brand,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}><Icon name="zap" size={11} /></div>
        )}
      </div>

      <div style={{
        padding: '6px 8px', borderRadius: 6, background: T.n50, border: `1px solid ${T.n100}`,
        fontFamily: T.fMono, fontSize: 10, color: T.n600, lineHeight: 1.4,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{m.formula}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <StatusPill status={m.status} />
        {m.type === 'custom' && <Badge variant="brandSoft" leftIcon="wrench">Custom</Badge>}
        {m.type === 'propensity' && <Badge variant="mlSoft" leftIcon="sparkles">ML</Badge>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: T.n500, paddingTop: 4, borderTop: `1px solid ${T.n100}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Icon name="user" size={10} />
          <span style={{ fontFamily: T.fMono }}>{m.owner}</span>
        </div>
        <div style={{ width: 1, height: 10, background: T.n200 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Icon name="clock" size={10} /> {m.freq}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600, color: T.n700 }}>
          <Icon name="link-2" size={10} /> {m.usedBy}
        </div>
      </div>
    </div>
  );
}

function MetricsCatalog() {
  const [category, setCategory] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [realtimeOnly, setRealtimeOnly] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [showNew, setShowNew] = React.useState(false);
  // undefined = drawer closed; null = open with picker; metric object = open with that metric
  const [lineage, setLineage] = React.useState(undefined);
  useLucide(category + search + realtimeOnly + statusFilter + typeFilter);

  const byCat = BR_METRIC_CATEGORIES.map(c => ({
    ...c,
    count: BR_METRICS.filter(m => m.category === c.id).length,
  }));

  const filtered = BR_METRICS.filter(m => {
    if (category !== 'all' && m.category !== category) return false;
    if (realtimeOnly && !m.realtime) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.formula.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto', background: T.n50 }}>
      <SectionHeader eyebrow="Catalog · Metrics"
        title="Metrics catalog"
        description="Every metric available to segments, models, and dashboards — standard, custom, and ML-derived. Categorized for discovery; realtime-capable metrics are flagged for use in streaming segments."
        right={<>
          <Button variant="outline" size="sm" leftIcon="git-compare" onClick={() => setLineage(null)}>Lineage</Button>
          <Button variant="primary" size="sm" leftIcon="plus" onClick={() => setShowNew(true)}>New custom metric</Button>
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi label="Total metrics" value={BR_METRICS.length} sub={`${BR_METRICS.filter(m=>m.status==='certified').length} certified · ${BR_METRICS.filter(m=>m.status==='experimental').length} experimental`} icon="layers" />
        <Kpi label="Custom" value={BR_METRICS.filter(m=>m.type==='custom').length} sub="user-defined formulas" icon="wrench" />
        <Kpi label="ML propensity" value={BR_METRICS.filter(m=>m.type==='propensity').length} sub="from production models" icon="sparkles" accent="ml" />
        <Kpi label="Realtime-capable" value={BR_METRICS.filter(m=>m.realtime).length} sub="usable in streaming segments" icon="zap" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* LEFT: category rail */}
        <Card padding={10} style={{ height: 'fit-content', position: 'sticky', top: 0 }}>
          <div style={{ padding: '4px 8px 8px', fontSize: 10, fontWeight: 600, color: T.n500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Categories</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <CategoryChip
              cat={{ label: 'All metrics', icon: 'list', color: T.n950, desc: 'Everything in the catalog' }}
              active={category === 'all'}
              count={BR_METRICS.length}
              onClick={() => setCategory('all')}
            />
            <div style={{ height: 1, background: T.n200, margin: '6px 8px' }} />
            {byCat.map(c => (
              <CategoryChip key={c.id} cat={c} active={category === c.id} count={c.count} onClick={() => setCategory(c.id)} />
            ))}
          </div>
          <div style={{ padding: '10px 8px 4px', marginTop: 6, borderTop: `1px solid ${T.n200}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: T.n500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Filters</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="zap" size={12} color={T.brand} />
                <span style={{ fontSize: 12, color: T.n800 }}>Realtime only</span>
              </div>
              <Switch checked={realtimeOnly} onChange={setRealtimeOnly} size="sm" />
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: T.n500, marginBottom: 4 }}>Status</div>
              <Select size="sm" value={statusFilter} onChange={setStatusFilter} options={[
                { value: 'all', label: 'Any status' },
                { value: 'certified', label: 'Certified only' },
                { value: 'experimental', label: 'Experimental only' },
              ]} />
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, color: T.n500, marginBottom: 4 }}>Type</div>
              <Select size="sm" value={typeFilter} onChange={setTypeFilter} options={[
                { value: 'all', label: 'Any type' },
                { value: 'standard', label: 'Standard' },
                { value: 'custom', label: 'Custom' },
                { value: 'propensity', label: 'ML propensity' },
              ]} />
            </div>
          </div>
        </Card>

        {/* RIGHT: grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Input
              size="sm"
              leftIcon="search"
              placeholder="Search metrics by name or formula..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 11, color: T.n500, fontFamily: T.fMono }}>{filtered.length} / {BR_METRICS.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {filtered.map(m => <MetricCard key={m.id + m.games.join('')} m={m} onOpenLineage={() => setLineage(m)} />)}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: T.n500, fontSize: 12 }}>
                <Icon name="search-x" size={24} color={T.n300} />
                <div style={{ marginTop: 8 }}>No metrics match these filters</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNew && <NewMetricModal onClose={() => setShowNew(false)} />}
      {lineage !== undefined && (
        <LineageDrawer
          seed={lineage ? { kind: 'metric', entity: lineage } : null}
          onClose={() => setLineage(undefined)}
        />
      )}
    </div>
  );
}

Object.assign(window, { MetricsCatalog });

export { MetricsCatalog };
