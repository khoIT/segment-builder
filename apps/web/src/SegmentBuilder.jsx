import React from 'react';
import { T, CHART, Icon, useLucide, Button, Badge, Card, Input, Select, Switch, Tabs, Kpi, SectionHeader, Sparkline } from './theme.jsx';
import { useHashState } from './routing/hash-state.js';
import { FilterBanner } from './routing/filter-banner.jsx';
import { GAMES, SEGMENTS, FEATURES, SEGMENT_SERIES } from './data.jsx';
import { BR_METRICS, BR_METRIC_CATEGORIES } from './bedrockData.jsx';
import { useSegmentMetricCatalog, usePreviewSegmentCount } from './api/hooks.js';

/* global React, T, CHART, Icon, useLucide, Button, Badge, Card, Input, Select, Switch, Tabs, Kpi, SectionHeader, Sparkline, GAMES, FEATURES, SEGMENT_SERIES, SEGMENTS, BR_METRICS, BR_METRIC_CATEGORIES */

// ═══════════════════════════════════════════════════════════════════════════
// Node-based Segment Builder
// A Figma-style canvas where users drag "logic blocks" and wire them together
// to compose a segment. Source nodes (populations), Filter nodes (feature
// predicates), Operator nodes (AND/OR/NOT), Output node (segment result).
// Wires are drawn as bezier paths between output/input ports.
// ═══════════════════════════════════════════════════════════════════════════

const NODE_W = 240;
const HEADER_H = 34;

// Node catalogue — what a user can drag from the palette
const NODE_LIBRARY = [
  { kind: 'source',   label: 'All Players',     icon: 'users',       game: 'ALL' },
  { kind: 'source',   label: 'PTG Players',     icon: 'users',       game: 'PTG' },
  { kind: 'source',   label: 'CFM Players',     icon: 'users',       game: 'CFM' },
  { kind: 'source',   label: 'TFB Players',     icon: 'users',       game: 'TFB' },
  { kind: 'filter',   label: 'Feature filter',  icon: 'filter',      desc: 'Threshold on a feature' },
  { kind: 'filter',   label: 'Event filter',    icon: 'zap',         desc: 'User did / did not do event' },
  { kind: 'filter',   label: 'ML filter',       icon: 'sparkles',    desc: 'Propensity threshold' },
  { kind: 'op',       label: 'AND',             icon: 'git-merge',   op: 'and' },
  { kind: 'op',       label: 'OR',              icon: 'git-fork',    op: 'or' },
  { kind: 'op',       label: 'NOT',             icon: 'minus-circle',op: 'not' },
];

// Demo starting graph — a real-looking PTG Whales-at-Risk segment
const INITIAL_GRAPH = {
  nodes: {
    src1:   { id: 'src1',   kind: 'source', label: 'PTG Players',     icon: 'users',    game: 'PTG', x: 60,  y: 90,  size: '2.4M' },
    f1:     { id: 'f1',     kind: 'filter', label: 'purchase_amount_30d', icon: 'filter',  feature: 'purchase_amount_30d', op: '>=', value: '50', unit: 'USD',  x: 360, y: 40,  matches: '68.2K' },
    f2:     { id: 'f2',     kind: 'filter', label: 'sessions_last_7d', icon: 'filter',    feature: 'sessions_last_7d',    op: '>=', value: '3',  unit: 'sessions', x: 360, y: 170, matches: '942K' },
    ml1:    { id: 'ml1',    kind: 'filter', label: 'churn_risk_score', icon: 'sparkles',  feature: 'churn_risk_score',    op: '>=', value: '0.6', unit: 'prob', x: 360, y: 300, matches: '184K', ml: true },
    and1:   { id: 'and1',   kind: 'op',     label: 'AND',             icon: 'git-merge', op: 'and',                       x: 700, y: 120 },
    out1:   { id: 'out1',   kind: 'output', label: 'PTG High-Value at Risk', icon: 'target', x: 990, y: 120, size: '18,420', trend: '+312' },
  },
  edges: [
    { from: 'src1', to: 'f1' },
    { from: 'src1', to: 'f2' },
    { from: 'src1', to: 'ml1' },
    { from: 'f1',  to: 'and1' },
    { from: 'f2',  to: 'and1' },
    { from: 'ml1', to: 'and1' },
    { from: 'and1', to: 'out1' },
  ],
};

function nodeHeight(n) {
  if (n.kind === 'source') return 88;
  if (n.kind === 'output') return 112;
  if (n.kind === 'op') return 62;
  return 112;
}

function portX(n, side) { return side === 'in' ? n.x : n.x + NODE_W; }
function portY(n) { return n.y + HEADER_H + (nodeHeight(n) - HEADER_H) / 2; }

function bezier(x1, y1, x2, y2) {
  const dx = Math.max(60, Math.abs(x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

function NodePalette({ onAdd }) {
  return (
    <div style={{ width: 240, padding: 16, borderRight: `1px solid ${T.n200}`, background: '#fff', overflow: 'auto' }}>
      <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Blocks</div>
      {['source','filter','op'].map(kind => (
        <div key={kind} style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n400, marginBottom: 6, textTransform: 'capitalize' }}>
            {kind === 'source' ? 'Populations' : kind === 'filter' ? 'Filters' : 'Operators'}
          </div>
          {NODE_LIBRARY.filter(n => n.kind === kind).map((n, i) => (
            <div key={i} onClick={() => onAdd(n)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 8, border: `1px solid ${T.n200}`, marginBottom: 6,
              cursor: 'pointer', background: '#fff', transition: 'background .12s, border-color .12s',
            }} onMouseEnter={e => { e.currentTarget.style.background = T.n50; e.currentTarget.style.borderColor = T.n300; }}
               onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = T.n200; }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: n.kind === 'source' ? '#dbeafe' : n.kind === 'filter' ? '#fff7ed' : T.n100,
                color: n.kind === 'source' ? '#1e40af' : n.kind === 'filter' ? T.brand : T.n700,
              }}>
                <Icon name={n.icon} size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.fSans, fontSize: 12, fontWeight: 500, color: T.n900 }}>{n.label}</div>
                {n.desc && <div style={{ fontFamily: T.fSans, fontSize: 10, color: T.n500 }}>{n.desc}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
      <div style={{
        marginTop: 20, padding: 12, borderRadius: 8, background: T.brandSoft, border: `1px solid ${T.brandBorder}`,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Icon name="lightbulb" size={14} color={T.brand} style={{ marginTop: 2 }} />
          <div>
            <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.brand, marginBottom: 3 }}>Tip</div>
            <div style={{ fontFamily: T.fSans, fontSize: 11, color: '#7c2d12', lineHeight: 1.4 }}>
              Click to add to canvas, or drag from the catalogue. Drag any node to reposition. Click a port to start a wire.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ScheduleModeContext = React.createContext('scheduled');

function FilterNodeBody({ node, onUpdate }) {
  const scheduleMode = React.useContext(ScheduleModeContext);
  const isLive = scheduleMode === 'live';
  const liveCatalog = useSegmentMetricCatalog().data ?? [];
  // Merge live registry with mock; live wins by name. Lets us survive
  // pre-API mode without breaking the prototype's curated list.
  const merged = React.useMemo(() => {
    const byName = new Map();
    for (const m of BR_METRICS) byName.set(m.name, m);
    for (const m of liveCatalog) byName.set(m.name, { ...byName.get(m.name), ...m });
    return Array.from(byName.values());
  }, [liveCatalog]);
  const seen = new Set();
  const available = merged.filter(m => {
    if (isLive && !m.realtime) return false;
    if (seen.has(m.name)) return false;
    seen.add(m.name);
    return true;
  });
  const feats = available.map(f => ({ value: f.name, label: f.name }));
  const currentMetric = merged.find(m => m.name === node.feature);
  const incompatible = isLive && currentMetric && !currentMetric.realtime;
  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Select size="sm" value={node.feature} onChange={e => onUpdate({ feature: e.target.value })} options={feats} style={{ width: '100%' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <Select size="sm" value={node.op} onChange={e => onUpdate({ op: e.target.value })}
          options={[{ value: '>=', label: '≥' }, { value: '<=', label: '≤' }, { value: '=', label: '=' }, { value: '!=', label: '≠' }]}
          style={{ width: 60, padding: '0 18px 0 8px' }} />
        <Input size="sm" value={node.value} onChange={e => onUpdate({ value: e.target.value })} style={{ flex: 1 }} />
      </div>
      {incompatible ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 5, background: '#fef3c7', color: '#b45309', fontSize: 10, fontFamily: T.fMono }}>
          <Icon name="alert-triangle" size={10} /> Not realtime-capable
        </div>
      ) : (
        <div style={{ fontFamily: T.fMono, fontSize: 10, color: T.n500, display: 'flex', justifyContent: 'space-between' }}>
          <span>{node.unit}{currentMetric?.realtime && <span style={{ color: T.brand, marginLeft: 4 }}>⚡ realtime</span>}</span>
          <span>≈ {node.matches} match</span>
        </div>
      )}
    </div>
  );
}

function Node({ node, selected, dragging, onSelect, onStartDrag, onStartWire, onFinishWire, onUpdate, wireDragFrom }) {
  const palette = {
    source: { bd: '#bfdbfe', bg: '#eff6ff', hd: '#1e40af', hdBg: '#dbeafe', ic: 'users' },
    filter: { bd: T.brandBorder, bg: '#fff', hd: T.brand, hdBg: T.brandSoft, ic: 'filter' },
    op:     { bd: T.n300, bg: '#fff', hd: T.n700, hdBg: T.n100, ic: 'git-merge' },
    output: { bd: '#d1fae5', bg: '#fff', hd: '#059669', hdBg: '#ecfdf5', ic: 'target' },
  }[node.kind];
  const h = nodeHeight(node);
  const hasIn = node.kind !== 'source';
  const hasOut = node.kind !== 'output';

  return (
    <div data-node-id={node.id}
      onMouseDown={e => { e.stopPropagation(); onSelect(node.id); onStartDrag(node.id, e); }}
      style={{
        position: 'absolute', left: node.x, top: node.y, width: NODE_W, height: h,
        background: palette.bg, border: `1px solid ${selected ? T.brand : palette.bd}`,
        borderRadius: 10, boxShadow: selected
          ? `0 0 0 3px ${T.brandSoft}, 0 8px 20px rgba(240,90,34,0.15)`
          : '0 1px 2px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.06)',
        transition: dragging ? 'none' : 'box-shadow .12s, border-color .12s',
        userSelect: 'none', cursor: dragging ? 'grabbing' : 'grab',
        fontFamily: T.fSans,
      }}>

      {/* header */}
      <div style={{
        height: HEADER_H, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8,
        background: palette.hdBg, borderRadius: '10px 10px 0 0', color: palette.hd,
        borderBottom: `1px solid ${palette.bd}`,
      }}>
        <Icon name={node.icon || palette.ic} size={13} />
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.kind === 'op' ? node.label : node.kind}
        </span>
        {node.kind === 'source' && <Badge variant="info" style={{ padding: '1px 6px', fontSize: 10 }}>{node.game}</Badge>}
      </div>

      {/* body by kind */}
      {node.kind === 'source' && (
        <div style={{ padding: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.n900 }}>{node.label}</div>
          <div style={{ fontSize: 11, color: T.n500, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="users" size={11} color={T.n500} />
            <span style={{ fontFamily: T.fMono }}>{node.size}</span>
            <span style={{ color: T.n300 }}>·</span>
            <span>players</span>
          </div>
        </div>
      )}

      {node.kind === 'filter' && (
        <FilterNodeBody node={node} onUpdate={patch => onUpdate(node.id, patch)} />
      )}

      {node.kind === 'op' && (
        <div style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            padding: '4px 14px', borderRadius: 9999, background: T.n900, color: '#fff',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
          }}>{node.op.toUpperCase()}</div>
        </div>
      )}

      {node.kind === 'output' && (
        <div style={{ padding: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.n900, marginBottom: 6 }}>{node.label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: T.fDisp, fontSize: 26, color: T.n950, lineHeight: 1, textTransform: 'uppercase' }}>{node.size}</span>
            <span style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.green600 }}>{node.trend}</span>
          </div>
          <div style={{ fontSize: 10, color: T.n500, marginTop: 2 }}>players in segment · live</div>
        </div>
      )}

      {/* ports */}
      {hasIn && (
        <Port node={node} side="in" onStartWire={onStartWire} onFinishWire={onFinishWire} />
      )}
      {hasOut && (
        <Port node={node} side="out" onStartWire={onStartWire} onFinishWire={onFinishWire} wireDragFrom={wireDragFrom} />
      )}
    </div>
  );
}

function Port({ node, side, onStartWire, onFinishWire, wireDragFrom }) {
  const active = wireDragFrom === node.id && side === 'out';
  return (
    <div onMouseDown={e => {
      e.stopPropagation();
      if (side === 'out') onStartWire(node.id, e);
    }} onMouseUp={e => {
      e.stopPropagation();
      if (side === 'in') onFinishWire(node.id);
    }} style={{
      position: 'absolute', [side === 'in' ? 'left' : 'right']: -8,
      top: HEADER_H + (nodeHeight(node) - HEADER_H) / 2 - 9,
      width: 18, height: 18, borderRadius: 9999,
      background: active ? T.brand : '#fff',
      border: `2px solid ${active ? T.brand : T.n400}`,
      cursor: 'crosshair', zIndex: 2,
      transition: 'background .12s, border-color .12s, transform .12s',
    }} onMouseEnter={e => { e.currentTarget.style.borderColor = T.brand; e.currentTarget.style.transform = 'scale(1.15)'; }}
       onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = T.n400; e.currentTarget.style.transform = 'scale(1)'; }} />
  );
}

// New FilterEditor with live registry + real /q/segments/preview-count.
// One filter at a time per node — segment-level rollup happens in the
// canvas's overall preview (M2's preview-count endpoint).
function FilterEditor({ node, onUpdate, onDelete }) {
  const liveCatalog = useSegmentMetricCatalog().data ?? [];
  const merged = React.useMemo(() => {
    const byName = new Map();
    for (const m of BR_METRICS) byName.set(m.name, m);
    for (const m of liveCatalog) byName.set(m.name, { ...byName.get(m.name), ...m });
    return Array.from(byName.values());
  }, [liveCatalog]);
  const preview = usePreviewSegmentCount();
  const [count, setCount] = React.useState(null);

  React.useEffect(() => {
    if (!node?.feature || node.value === '' || node.value == null) return;
    const handle = setTimeout(() => {
      preview.mutate({
        criteria: { all: [{ metric: node.feature, op: node.op, value: parseFloat(node.value) || node.value }] },
      }, {
        onSuccess: (d) => setCount(d?.count ?? null),
        onError: () => setCount(null),
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [node?.feature, node?.op, node?.value]);

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T.n500, marginBottom: 4 }}>Metric</div>
        <Select
          size="sm"
          value={node.feature}
          onChange={(e) => {
            const m = merged.find((x) => x.name === e.target.value);
            onUpdate(node.id, { feature: e.target.value, label: e.target.value, unit: m?.unit ?? node.unit });
          }}
          options={merged.map((m) => ({ value: m.name, label: m.name + (m.realtime ? '  ⚡' : '') }))}
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.n500, marginBottom: 4 }}>Operator</div>
          <Select
            size="sm"
            value={node.op}
            onChange={(e) => onUpdate(node.id, { op: e.target.value })}
            options={[{ value: '>=', label: '≥' }, { value: '<=', label: '≤' }, { value: '=', label: '=' }, { value: '!=', label: '≠' }]}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.n500, marginBottom: 4 }}>Value</div>
          <Input size="sm" value={node.value} onChange={(e) => onUpdate(node.id, { value: e.target.value })} />
        </div>
      </div>
      <div style={{ padding: 12, borderRadius: 8, background: T.brandSoft, border: `1px solid ${T.brandBorder}`, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Icon name="users" size={12} color={T.brand} />
          <span style={{ fontFamily: T.fMono, fontSize: 13, fontWeight: 600, color: T.brand }}>
            {preview.isPending ? 'computing…' : count != null ? Number(count).toLocaleString() : (node.matches ?? '—')}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#7c2d12' }}>
          {count != null ? 'players match this filter (live)' : 'live count unavailable; showing mock'}
        </div>
      </div>
      <Button variant="ghost" size="sm" leftIcon="trash-2" onClick={() => onDelete(node.id)} style={{ color: T.red600, width: '100%' }}>Delete block</Button>
    </>
  );
}

function PropertiesPanel({ graph, selected, onUpdate, onDelete }) {
  const node = selected && graph.nodes[selected];
  return (
    <div style={{ width: 280, padding: 16, borderLeft: `1px solid ${T.n200}`, background: '#fff', overflow: 'auto' }}>
      <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        {node ? 'Block properties' : 'Segment properties'}
      </div>
      {!node && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.n500, marginBottom: 4 }}>Name</div>
            <Input defaultValue="PTG High-Value at Risk" size="sm" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.n500, marginBottom: 4 }}>Description</div>
            <textarea defaultValue="Top 5% spenders with rising churn risk, active past 7d" style={{
              width: '100%', minHeight: 70, padding: 8, borderRadius: 8, border: `1px solid ${T.n200}`,
              fontFamily: T.fSans, fontSize: 12, resize: 'vertical', outline: 'none', color: T.n900,
            }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.n500, marginBottom: 4 }}>Refresh</div>
            <Select value="realtime" onChange={() => {}} size="sm"
              options={[{ value: 'realtime', label: 'Realtime (1m lag)' }, { value: 'hourly', label: 'Hourly' }, { value: 'daily', label: 'Daily' }]}
              style={{ width: '100%' }} />
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: T.n50, border: `1px solid ${T.n200}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.n700, marginBottom: 6 }}>Generated SQL preview</div>
            <pre style={{ margin: 0, fontFamily: T.fMono, fontSize: 10.5, lineHeight: 1.45, color: T.n600, whiteSpace: 'pre-wrap' }}>
{`SELECT user_id FROM features.player_daily
WHERE game = 'PTG'
  AND purchase_amount_30d >= 50
  AND sessions_last_7d    >= 3
  AND churn_risk_score    >= 0.6`}
            </pre>
          </div>
        </>
      )}
      {node && node.kind === 'filter' && (
        <FilterEditor node={node} onUpdate={onUpdate} onDelete={onDelete} />
      )}
      {false && node && node.kind === 'filter' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.n500, marginBottom: 4 }}>Feature</div>
            <Select size="sm" value={node.feature} onChange={e => onUpdate(node.id, { feature: e.target.value, label: e.target.value })}
              options={FEATURES.map(f => ({ value: f.name, label: f.name }))} style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.n500, marginBottom: 4 }}>Operator</div>
              <Select size="sm" value={node.op} onChange={e => onUpdate(node.id, { op: e.target.value })}
                options={[{ value: '>=', label: '≥' }, { value: '<=', label: '≤' }, { value: '=', label: '=' }, { value: '!=', label: '≠' }, { value: 'in', label: 'IN' }]}
                style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.n500, marginBottom: 4 }}>Value</div>
              <Input size="sm" value={node.value} onChange={e => onUpdate(node.id, { value: e.target.value })} />
            </div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: T.brandSoft, border: `1px solid ${T.brandBorder}`, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon name="users" size={12} color={T.brand} />
              <span style={{ fontFamily: T.fMono, fontSize: 13, fontWeight: 600, color: T.brand }}>{node.matches}</span>
            </div>
            <div style={{ fontSize: 11, color: '#7c2d12' }}>players match this filter alone</div>
          </div>
          <Button variant="ghost" size="sm" leftIcon="trash-2" onClick={() => onDelete(node.id)} style={{ color: T.red600, width: '100%' }}>Delete block</Button>
        </>
      )}
      {node && node.kind !== 'filter' && (
        <>
          <div style={{ fontSize: 12, color: T.n700, lineHeight: 1.5 }}>
            <strong style={{ color: T.n900 }}>{node.label}</strong> · <span style={{ textTransform: 'capitalize' }}>{node.kind}</span>
            {node.kind === 'source' && <div style={{ marginTop: 8, color: T.n500 }}>Base population · {node.size} players. Cannot be modified — change via a Filter block downstream.</div>}
            {node.kind === 'op' && <div style={{ marginTop: 8, color: T.n500 }}>Combines all incoming wires with <strong>{node.op.toUpperCase()}</strong>.</div>}
            {node.kind === 'output' && <div style={{ marginTop: 8, color: T.n500 }}>Final segment result. Wire an operator or filter into the input port.</div>}
          </div>
          {node.kind !== 'output' && <Button variant="ghost" size="sm" leftIcon="trash-2" onClick={() => onDelete(node.id)} style={{ color: T.red600, width: '100%', marginTop: 14 }}>Delete block</Button>}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Scheduling mode selector — frozen / scheduled / live
// Realtime (live) restricts filter metrics to realtime-capable ones.
// ═══════════════════════════════════════════════════════════════════════
function ScheduleBar({ mode, onMode, crossGame, onCrossGame, source, target, onSource, onTarget }) {
  const modes = [
    { v: 'frozen',    label: 'Frozen snapshot', icon: 'lock',       desc: 'Compute once, never update', sub: 'A/B control groups', cost: '$0.02 once' },
    { v: 'scheduled', label: 'Scheduled',       icon: 'refresh-cw', desc: 'Refresh every 4 hours',      sub: 'Default for campaigns', cost: '$1.20/day' },
    { v: 'live',      label: 'Live streaming',  icon: 'zap',        desc: 'Kafka-driven, 1m lag',       sub: 'For realtime triggers', cost: '$8.40/day' },
  ];
  useLucide(mode + crossGame);
  return (
    <div style={{
      padding: '12px 20px', background: '#fff', borderBottom: `1px solid ${T.n200}`,
      display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0,
    }}>
      {/* Row 1: scheduling modes */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: T.n500, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', marginRight: 4 }}>
          Scheduling
        </div>
        {modes.map(m => {
          const active = mode === m.v;
          return (
            <div key={m.v} onClick={() => onMode(m.v)} style={{
              flex: 1, padding: '8px 12px', borderRadius: 9, cursor: 'pointer',
              background: active ? (m.v === 'live' ? T.brandSoft : T.n50) : '#fff',
              border: `1px solid ${active ? (m.v === 'live' ? T.brandBorder : T.n300) : T.n200}`,
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: active ? `0 0 0 3px ${m.v === 'live' ? 'rgba(240,90,34,0.08)' : 'rgba(0,0,0,0.03)'}` : 'none',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                background: active ? (m.v === 'live' ? T.brand : T.n900) : T.n100,
                color: active ? '#fff' : T.n500,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name={m.icon} size={13} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.n900 }}>{m.label}</span>
                  {m.v === 'live' && <Badge variant="brandSoft" style={{ padding: '0 5px', fontSize: 9 }}>Kafka</Badge>}
                </div>
                <div style={{ fontSize: 10.5, color: T.n500, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.desc}</div>
              </div>
              <div style={{ fontFamily: T.fMono, fontSize: 10, color: T.n600, textAlign: 'right', flexShrink: 0 }}>{m.cost}</div>
            </div>
          );
        })}
      </div>

      {/* Row 2: cross-game source → target (only if enabled) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: T.n500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Population</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: T.n50, border: `1px solid ${T.n200}`, flex: crossGame ? 'none' : 1 }}>
          <Icon name="users" size={13} color={T.n600} />
          <span style={{ fontSize: 11, color: T.n500 }}>{crossGame ? 'Source' : 'From'}</span>
          <Select size="sm" value={source} onChange={onSource} options={[
            { value: 'ALL', label: 'All players (6.2M)' },
            { value: 'PTG', label: 'PTG · 2.4M' },
            { value: 'CFM', label: 'CFM · 1.8M' },
            { value: 'TFB', label: 'TFB · 920K' },
          ]} />
        </div>
        {crossGame && (
          <>
            <Icon name="arrow-right" size={14} color={T.n400} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: T.brandSoft, border: `1px solid ${T.brandBorder}`, flex: 1 }}>
              <Icon name="target" size={13} color={T.brand} />
              <span style={{ fontSize: 11, color: T.brand, fontWeight: 600 }}>Target in</span>
              <Select size="sm" value={target} onChange={onTarget} options={[
                { value: 'PTG', label: 'Play Together' },
                { value: 'CFM', label: 'Call of Duty Mobile' },
                { value: 'TFB', label: 'Total Football' },
              ]} />
              <div style={{ width: 1, height: 16, background: T.brandBorder }} />
              <span style={{ fontSize: 11, color: T.n600 }}>ID match via</span>
              <Select size="sm" value="vng_account" onChange={() => {}} options={[
                { value: 'vng_account', label: 'VNG Account ID' },
                { value: 'device_id', label: 'Device ID (fuzzy)' },
                { value: 'phone', label: 'Phone hash' },
              ]} />
              <div style={{ padding: '3px 8px', borderRadius: 9999, background: '#ecfdf5', color: T.green600, fontSize: 10, fontWeight: 600, fontFamily: T.fMono }}>
                67% resolved
              </div>
            </div>
          </>
        )}
        <Button variant={crossGame ? 'outline' : 'ghost'} size="sm" leftIcon={crossGame ? 'x' : 'git-branch'} onClick={() => onCrossGame(!crossGame)}>
          {crossGame ? 'Remove cross-game' : 'Target a different game'}
        </Button>
      </div>

      {/* Row 3: live-only banner */}
      {mode === 'live' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: T.brandSoft, border: `1px solid ${T.brandBorder}` }}>
          <Icon name="zap" size={13} color={T.brand} />
          <div style={{ flex: 1, fontSize: 11, color: '#7c2d12' }}>
            <strong style={{ color: T.brand }}>Live streaming mode active.</strong> Filters are limited to <strong>{BR_METRICS.filter(m => m.realtime).length} realtime-capable metrics</strong>. Non-realtime metrics (e.g. <code style={{ fontFamily: T.fMono, background: '#fff', padding: '1px 5px', borderRadius: 3, color: T.n700 }}>ltv</code>, <code style={{ fontFamily: T.fMono, background: '#fff', padding: '1px 5px', borderRadius: 3, color: T.n700 }}>churn_risk_score</code>) are greyed out in the filter picker.
          </div>
          <Badge variant="mlSoft">Kafka: ptg.session, ptg.purchase</Badge>
        </div>
      )}
    </div>
  );
}

function SegmentPreview({ size = 18420, mode }) {
  // top strip above the builder — live size + tiny chart
  const series = SEGMENT_SERIES.s_ptg_whales;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 20, padding: '14px 20px',
      background: '#fff', borderBottom: `1px solid ${T.n200}`, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="target" size={16} color={T.green600} />
        </div>
        <div>
          <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live segment size</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: T.fDisp, fontSize: 28, color: T.n950, lineHeight: 1, textTransform: 'uppercase' }}>{size.toLocaleString()}</span>
            <span style={{ fontFamily: T.fSans, fontSize: 12, fontWeight: 600, color: T.green600 }}>+312 / 24h</span>
          </div>
        </div>
      </div>
      <div style={{ width: 1, height: 40, background: T.n200 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Sparkline data={series.slice(-40)} width={140} height={40} color={T.green600} />
        <div>
          <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500 }}>Last 24h</div>
          <div style={{ fontFamily: T.fSans, fontSize: 12, fontWeight: 600, color: T.n900 }}>Trending up</div>
        </div>
      </div>
      <div style={{ width: 1, height: 40, background: T.n200 }} />
      <div>
        <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Est. reach</div>
        <div style={{ fontFamily: T.fSans, fontSize: 14, fontWeight: 600, color: T.n900 }}>₫ 1.2B ARPU/month</div>
      </div>
      <div style={{ flex: 1 }} />
      {mode === 'live' && <Badge variant="live" dot>Streaming · 1.8s lag</Badge>}
      {mode === 'scheduled' && <Badge variant="info" dot>Next refresh in 2h 14m</Badge>}
      {mode === 'frozen' && <Badge variant="secondary" leftIcon="lock">Frozen @ 2026-04-22 14:30</Badge>}
      <Button variant="outline" size="sm" leftIcon="eye">Preview users</Button>
      <Button variant="outline" size="sm" leftIcon="code">View SQL</Button>
      <Button variant="primary" size="sm" leftIcon="rocket">Activate segment</Button>
    </div>
  );
}

function SegmentBuilder() {
  const [graph, setGraph] = React.useState(INITIAL_GRAPH);
  const [selected, setSelected] = React.useState(null);
  const [drag, setDrag] = React.useState(null); // {id, offX, offY}
  const [wire, setWire] = React.useState(null); // {from, x, y}
  const [pan, setPan] = React.useState({ x: 0, y: 0, scale: 1 });
  const [scheduleMode, setScheduleMode] = React.useState('scheduled');
  const [crossGame, setCrossGame] = React.useState(false);
  const [source, setSource] = React.useState('PTG');
  const [target, setTarget] = React.useState('CFM');
  const canvasRef = React.useRef(null);
  const hash = useHashState();
  const tableFilter = hash.table ?? null;
  useLucide(graph + scheduleMode + crossGame);

  const updateNode = (id, patch) => setGraph(g => ({ ...g, nodes: { ...g.nodes, [id]: { ...g.nodes[id], ...patch } } }));
  const deleteNode = (id) => setGraph(g => {
    const { [id]: _, ...rest } = g.nodes;
    return { nodes: rest, edges: g.edges.filter(e => e.from !== id && e.to !== id) };
  });

  const startDrag = (id, e) => {
    const n = graph.nodes[id];
    const rect = canvasRef.current.getBoundingClientRect();
    setDrag({ id, offX: (e.clientX - rect.left) / pan.scale - n.x, offY: (e.clientY - rect.top) / pan.scale - n.y });
  };

  const startWire = (fromId, e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setWire({ from: fromId, x: (e.clientX - rect.left) / pan.scale, y: (e.clientY - rect.top) / pan.scale });
  };
  const finishWire = (toId) => {
    if (!wire || wire.from === toId) return setWire(null);
    // prevent dupes
    setGraph(g => g.edges.find(e => e.from === wire.from && e.to === toId)
      ? g
      : { ...g, edges: [...g.edges, { from: wire.from, to: toId }] });
    setWire(null);
  };

  const onMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / pan.scale;
    const y = (e.clientY - rect.top) / pan.scale;
    if (drag) updateNode(drag.id, { x: x - drag.offX, y: y - drag.offY });
    if (wire) setWire({ ...wire, x, y });
  };
  const onMouseUp = () => { setDrag(null); setWire(null); };

  const addNode = (lib) => {
    const id = `n_${Math.random().toString(36).slice(2, 7)}`;
    const base = { id, x: 150 + Math.random() * 100, y: 150 + Math.random() * 100, label: lib.label, icon: lib.icon };
    let node;
    if (lib.kind === 'source') node = { ...base, kind: 'source', game: lib.game, size: '2.4M' };
    else if (lib.kind === 'filter') node = { ...base, kind: 'filter', feature: 'sessions_last_7d', op: '>=', value: '3', unit: 'sessions', matches: '—' };
    else node = { ...base, kind: 'op', op: lib.op };
    setGraph(g => ({ ...g, nodes: { ...g.nodes, [id]: node } }));
  };

  // size viewport
  const viewportW = 1600, viewportH = 900;

  return (
    <ScheduleModeContext.Provider value={scheduleMode}>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.n50 }}>
      <ScheduleBar
        mode={scheduleMode} onMode={setScheduleMode}
        crossGame={crossGame} onCrossGame={setCrossGame}
        source={source} onSource={setSource}
        target={target} onTarget={setTarget}
      />
      {tableFilter && (
        <div style={{ padding: '8px 16px' }}>
          <FilterBanner tableFilter={tableFilter} />
        </div>
      )}
      <SegmentPreview mode={scheduleMode} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <NodePalette onAdd={addNode} />

        {/* canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'auto', background: T.n50 }}
             onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
             onMouseDown={() => setSelected(null)}>
          {/* dot grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `radial-gradient(circle, ${T.n300} 1px, transparent 1px)`,
            backgroundSize: '20px 20px', opacity: 0.6,
          }} />

          {/* zoom / fit controls */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 6 }}>
            <Button variant="outline" size="icon-sm" onClick={() => setPan(p => ({ ...p, scale: Math.min(2, p.scale * 1.15) }))}><Icon name="zoom-in" size={13} /></Button>
            <Button variant="outline" size="icon-sm" onClick={() => setPan(p => ({ ...p, scale: Math.max(0.5, p.scale / 1.15) }))}><Icon name="zoom-out" size={13} /></Button>
            <Button variant="outline" size="icon-sm" onClick={() => setPan({ x: 0, y: 0, scale: 1 })}><Icon name="maximize" size={13} /></Button>
            <div style={{ fontFamily: T.fMono, fontSize: 11, color: T.n500, display: 'flex', alignItems: 'center', padding: '0 8px', background: '#fff', borderRadius: 6, border: `1px solid ${T.n200}` }}>
              {Math.round(pan.scale * 100)}%
            </div>
          </div>

          {/* minimap-ish legend */}
          <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 10, display: 'flex', gap: 8, fontFamily: T.fSans, fontSize: 11, color: T.n500, background: '#fff', padding: '6px 10px', borderRadius: 8, border: `1px solid ${T.n200}` }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#eff6ff', border: `1px solid #bfdbfe` }} /> Source</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: T.brandSoft, border: `1px solid ${T.brandBorder}` }} /> Filter</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: T.n100, border: `1px solid ${T.n300}` }} /> Operator</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#ecfdf5', border: `1px solid #d1fae5` }} /> Output</span>
          </div>

          <div ref={canvasRef} style={{
            position: 'absolute', inset: 0, transform: `scale(${pan.scale}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: '0 0',
          }}>
            {/* SVG edges */}
            <svg width={viewportW} height={viewportH} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
                  <path d="M0 0 L6 5 L0 10 Z" fill={T.n500} />
                </marker>
                <marker id="arrow-active" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
                  <path d="M0 0 L6 5 L0 10 Z" fill={T.brand} />
                </marker>
              </defs>
              {graph.edges.map((e, i) => {
                const a = graph.nodes[e.from], b = graph.nodes[e.to];
                if (!a || !b) return null;
                const active = selected === e.from || selected === e.to;
                return (
                  <path key={i} d={bezier(portX(a, 'out'), portY(a), portX(b, 'in'), portY(b))}
                    stroke={active ? T.brand : T.n400} strokeWidth={active ? 2 : 1.5}
                    fill="none" markerEnd={`url(#${active ? 'arrow-active' : 'arrow'})`} />
                );
              })}
              {wire && (() => {
                const a = graph.nodes[wire.from];
                return <path d={bezier(portX(a, 'out'), portY(a), wire.x, wire.y)}
                  stroke={T.brand} strokeWidth={2} strokeDasharray="4 3" fill="none" />;
              })()}
            </svg>

            {/* Nodes */}
            {Object.values(graph.nodes).map(n => (
              <Node key={n.id} node={n} selected={selected === n.id} dragging={drag?.id === n.id}
                onSelect={setSelected} onStartDrag={startDrag}
                onStartWire={startWire} onFinishWire={finishWire}
                onUpdate={updateNode} wireDragFrom={wire?.from} />
            ))}
          </div>
        </div>

        <PropertiesPanel graph={graph} selected={selected} onUpdate={updateNode} onDelete={deleteNode} />
      </div>
    </div>
    </ScheduleModeContext.Provider>
  );
}

Object.assign(window, { SegmentBuilder });

export { SegmentBuilder };
