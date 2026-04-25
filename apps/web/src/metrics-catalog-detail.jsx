import React from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { T, Icon, Button, Badge, Card, Tabs, Input, Select } from './theme.jsx';
import { seriesForMetric, last7dAvg, delta7d, formatMetricValue, resampleSeries } from './metrics-mock-series.jsx';
import { LineageDrawer } from './LineageDrawer.jsx';
import { StatusChip } from './metrics-signals.jsx';
import { PipelinePanel } from './metric-builder/pipeline-panel.jsx';

// ═══════════════════════════════════════════════════════════════════════
// METRIC DETAIL — opens when a row in the Metrics Catalog list is clicked.
// Two-column layout: left = chart card, right = sticky metadata panel.
// Categorical metrics (enum/string) gracefully degrade — no chart.
// ═══════════════════════════════════════════════════════════════════════

function fmtAxisDate(s) {
  const d = new Date(s);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// Title-cased frequency label for the metadata panel.
function fmtFreq(f) {
  if (!f) return '—';
  return f === 'streaming' ? 'Streaming' : f.charAt(0).toUpperCase() + f.slice(1);
}

// Synthesized read-only SQL for the detail panel. Not executed.
function sqlForMetric(m) {
  const t = m.masterTable || m.source || 'master.events';
  if (m.unit === 'USD') {
    return `SELECT date_trunc('day', event_time) AS date,\n       SUM(amount_usd) AS value\nFROM ${t}\nWHERE status = 'settled'\nGROUP BY 1 ORDER BY 1`;
  }
  if (m.unit === 'count') {
    return `SELECT date_trunc('day', event_time) AS date,\n       COUNT(DISTINCT user_id) AS value\nFROM ${t}\nGROUP BY 1 ORDER BY 1`;
  }
  return `SELECT date_trunc('day', event_time) AS date,\n       AVG(value) AS value\nFROM ${t}\nGROUP BY 1 ORDER BY 1`;
}

function PanelRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, gap: 12 }}>
      <span style={{ color: T.n500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>{label}</span>
      <span style={{ color: T.n900, fontFamily: T.fMono, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function PanelCollapse({ open, onToggle, label, right, children }) {
  return (
    <div style={{ borderTop: `1px solid ${T.n200}`, padding: '12px 0' }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={12} color={T.n500} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.n900 }}>{label}</span>
        {right}
      </div>
      {open && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  );
}

// ─── Tiny popover used by the inline-edit affordances on Owner & Freq ──
function EditPopover({ anchor, children, onClose }) {
  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!anchor) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1500 }} />
      <div style={{
        position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 1600,
        background: '#fff', border: `1px solid ${T.n200}`, borderRadius: 8,
        boxShadow: '0 12px 28px -10px rgba(0,0,0,0.25)',
        padding: 10, width: 220,
      }}>
        {children}
      </div>
    </>
  );
}

// Generic editable metadata row — value renders as text, click pencil to edit.
function EditableRow({ label, value, editor, onCommit }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, gap: 12, position: 'relative' }}>
      <span style={{ color: T.n500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: T.n900, fontFamily: T.fMono, textAlign: 'right' }}>{value}</span>
        <button
          onClick={() => setOpen(o => !o)}
          title="Edit"
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            padding: 2, borderRadius: 4, color: T.n400, display: 'inline-flex',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = T.n700; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.n400; }}>
          <Icon name="pencil" size={11} />
        </button>
        <EditPopover anchor={open} onClose={() => setOpen(false)}>
          {editor({ commit: next => { onCommit(next); setOpen(false); }, cancel: () => setOpen(false) })}
        </EditPopover>
      </span>
    </div>
  );
}

function MetricsCatalogDetail({ metric, onBack, prettyName, formulaToBlurb, onFilterStatus, onViewSegments }) {
  const [granularity, setGranularity] = React.useState('day');
  const [chartType, setChartType] = React.useState('area');
  const [showLineage, setShowLineage] = React.useState(false);
  const [openSql, setOpenSql] = React.useState(true);
  const [openRelated, setOpenRelated] = React.useState(false);
  const [openFresh, setOpenFresh] = React.useState(true);
  const [openOwner, setOpenOwner] = React.useState(true);
  const [openChange, setOpenChange] = React.useState(true);

  // Local-only metadata edits (mock prototype — would persist in a real catalog API).
  const [owner, setOwner] = React.useState(metric.owner);
  const [freq, setFreq]   = React.useState(metric.freq);
  React.useEffect(() => { setOwner(metric.owner); setFreq(metric.freq); }, [metric.id]);

  const daily = React.useMemo(() => seriesForMetric(metric), [metric.id]);
  const data = React.useMemo(() => resampleSeries(daily, granularity), [daily, granularity]);
  const avg = last7dAvg(metric);
  const d = delta7d(metric);
  const positive = d >= 0;
  const good = (positive && metric.goodDir === 'up') || (!positive && metric.goodDir === 'down');
  const isCategorical = metric.unit === 'enum' || metric.unit === 'string';
  const stroke = good ? T.green600 : T.red600;
  const ownerChip = owner === 'data.liveops' ? 'Auto-generated' : owner;
  const sourceChip = metric.type === 'propensity' ? 'ML Model' : 'Semantic Query';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.n50 }}>
      {/* Top bar — breadcrumb + global search */}
      <div style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${T.n200}`, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span onClick={onBack} style={{ color: T.n500, cursor: 'pointer' }}>Metrics</span>
          <span style={{ color: T.n400 }}>/</span>
          <span style={{ color: T.n900, fontWeight: 600 }}>{prettyName(metric.name)}</span>
          <StatusChip status={metric.status} onClick={onFilterStatus} withIcon />
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Input size="sm" leftIcon="search" placeholder="Search" style={{ width: 480 }} />
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, padding: 24, flex: 1, minHeight: 0, overflow: 'auto' }}>
        {/* LEFT: chart + reserved card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <Card padding={20}>
            {/* Big number */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 4 }}>
              <span style={{ fontFamily: T.fDisp, fontSize: 56, lineHeight: 0.95, color: T.n950, letterSpacing: '0.005em' }}>
                {isCategorical ? '—' : formatMetricValue(avg, metric.unit)}
              </span>
              {!isCategorical && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 6,
                  background: good ? T.greenSoft : T.redSoft,
                  color: good ? T.green600 : T.red600,
                  fontSize: 12, fontWeight: 600,
                }}>
                  <Icon name={positive ? 'trending-up' : 'trending-down'} size={12} />
                  {positive ? '+' : ''}{d.toFixed(1)}%
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: T.n500, marginBottom: 12 }}>Last 7 days vs prior 7 days</div>

            {/* Inline chip row — realtime + type + window + freq */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {metric.realtime && (
                <Badge variant="brandSoft" leftIcon="zap">Realtime-capable</Badge>
              )}
              {metric.type === 'custom' && <Badge variant="brandSoft" leftIcon="wrench">Custom</Badge>}
              {metric.type === 'propensity' && <Badge variant="mlSoft" leftIcon="sparkles">ML</Badge>}
              {metric.window && (
                <Badge variant="secondary" leftIcon="calendar">{metric.window}</Badge>
              )}
              {freq && (
                <Badge variant="secondary" leftIcon="clock">{fmtFreq(freq)}</Badge>
              )}
            </div>

            {/* Chart controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <Button variant="outline" size="sm" leftIcon="calendar">Select dates</Button>
              <Tabs
                value={granularity}
                onChange={setGranularity}
                tabs={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]}
              />
              <Tabs
                value={chartType}
                onChange={setChartType}
                tabs={[{ value: 'area', label: 'Area' }, { value: 'line', label: 'Line' }]}
              />
              <div style={{ flex: 1 }} />
              <Button variant="outline" size="sm" leftIcon="table-2" rightIcon="chevron-down">Data</Button>
            </div>

            {/* Chart */}
            {isCategorical ? (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.n500, fontSize: 12 }}>
                Categorical metric — no time series
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                {chartType === 'area' ? (
                  <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`metricFill-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.n200} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: T.n500 }} tickFormatter={fmtAxisDate} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11, fill: T.n500 }} tickFormatter={v => formatMetricValue(v, metric.unit)} width={56} />
                    <Tooltip contentStyle={{ fontFamily: T.fSans, fontSize: 12, borderRadius: 8, border: `1px solid ${T.n200}` }} formatter={v => formatMetricValue(v, metric.unit)} />
                    <Area type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} fill={`url(#metricFill-${metric.id})`} />
                  </AreaChart>
                ) : (
                  <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.n200} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: T.n500 }} tickFormatter={fmtAxisDate} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11, fill: T.n500 }} tickFormatter={v => formatMetricValue(v, metric.unit)} width={56} />
                    <Tooltip contentStyle={{ fontFamily: T.fSans, fontSize: 12, borderRadius: 8, border: `1px solid ${T.n200}` }} formatter={v => formatMetricValue(v, metric.unit)} />
                    <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </Card>

          {/* Reserved second card to mirror image layout */}
          <Card padding={20} style={{ minHeight: 60 }}>
            <div style={{ fontSize: 11, color: T.n400, fontStyle: 'italic' }}>Data table preview</div>
          </Card>
        </div>

        {/* RIGHT: side panel */}
        <Card padding={20} style={{ height: 'fit-content', position: 'sticky', top: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.n950 }}>{prettyName(metric.name)}</div>
              <div style={{ fontSize: 12, color: T.n500, marginTop: 2 }}>{formulaToBlurb(metric)}</div>
            </div>
            <Button variant="ghost" size="icon-sm"><Icon name="layout-grid" size={14} /></Button>
            <Button variant="ghost" size="icon-sm" onClick={onBack}><Icon name="x" size={14} /></Button>
          </div>

          {/* Pipeline status (only renders if metric has a metric_pipelines row) */}
          <PipelinePanel metricId={metric.id} />

          {/* Formula */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.n500, fontWeight: 500, marginBottom: 6 }}>Formula</div>
            <div style={{ padding: '8px 12px', borderRadius: 8, background: T.n100, fontFamily: T.fMono, fontSize: 12, color: T.n900, wordBreak: 'break-word' }}>
              {metric.formula}
            </div>
          </div>

          {/* Source table */}
          <div style={{ marginBottom: 4 }}>
            <PanelRow label="Source table" value={metric.masterTable || metric.source} />
          </div>

          {/* SQL Query */}
          <PanelCollapse open={openSql} onToggle={() => setOpenSql(o => !o)} label="SQL Query">
            <div style={{ padding: '10px 12px', borderRadius: 8, background: T.n100, fontFamily: T.fMono, fontSize: 11, color: T.n900, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {sqlForMetric(metric)}
            </div>
          </PanelCollapse>

          {/* Related Metrics */}
          <PanelCollapse
            open={openRelated}
            onToggle={() => setOpenRelated(o => !o)}
            label="Related Metrics"
            right={<Badge variant="secondary">{(metric.deps || []).length}</Badge>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(metric.deps || []).length === 0 && <div style={{ fontSize: 11, color: T.n500 }}>No declared dependencies.</div>}
              {(metric.deps || []).map(dep => (
                <div key={dep} style={{ fontFamily: T.fMono, fontSize: 12, color: T.n800 }}>{dep}</div>
              ))}
              <Button variant="outline" size="xs" leftIcon="git-compare" onClick={() => setShowLineage(true)} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                Open lineage
              </Button>
            </div>
          </PanelCollapse>

          {/* Data freshness */}
          <PanelCollapse open={openFresh} onToggle={() => setOpenFresh(o => !o)} label="Data freshness">
            <PanelRow label="Max date in data" value="21 March 2026" />
            <PanelRow label="Last refresh" value="10:17 AM, 23 March 2026" />
            <Button variant="outline" size="sm" leftIcon="refresh-cw" style={{ marginTop: 8 }}>Refresh data</Button>
          </PanelCollapse>

          {/* Metadata — owner, source, freq, realtime, used-by, games */}
          <PanelCollapse open={openOwner} onToggle={() => setOpenOwner(o => !o)} label="Metadata">
            <EditableRow
              label={<><Icon name="user" size={11} /> Owner</>}
              value={<Badge variant="secondary">{ownerChip}</Badge>}
              onCommit={setOwner}
              editor={({ commit, cancel }) => {
                const [draft, setDraft] = React.useState(owner);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11, color: T.n500 }}>Owner email or team handle</div>
                    <Input size="sm" value={draft} onChange={e => setDraft(e.target.value)} autoFocus />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
                      <Button variant="primary" size="sm" onClick={() => commit(draft.trim() || metric.owner)}>Save</Button>
                    </div>
                  </div>
                );
              }}
            />
            <PanelRow label={<><Icon name="database" size={11} /> Source</>} value={<Badge variant="secondary">{sourceChip}</Badge>} />
            <EditableRow
              label={<><Icon name="clock" size={11} /> Update freq</>}
              value={fmtFreq(freq)}
              onCommit={setFreq}
              editor={({ commit, cancel }) => {
                const [draft, setDraft] = React.useState(freq);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11, color: T.n500 }}>Update frequency</div>
                    <Select
                      size="sm"
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      options={[
                        { value: 'streaming', label: 'Streaming (realtime)' },
                        { value: 'hourly',    label: 'Hourly' },
                        { value: 'daily',     label: 'Daily' },
                        { value: 'weekly',    label: 'Weekly' },
                      ]}
                    />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
                      <Button variant="primary" size="sm" onClick={() => commit(draft)}>Save</Button>
                    </div>
                  </div>
                );
              }}
            />
            <PanelRow
              label={<><Icon name="zap" size={11} /> Realtime</>}
              value={metric.realtime
                ? <span style={{ color: T.brand, fontWeight: 600 }}>Capable</span>
                : <span style={{ color: T.n500 }}>Batch only</span>}
            />
            {metric.usedBy != null && (
              <PanelRow
                label={<><Icon name="link-2" size={11} /> Used by</>}
                value={
                  onViewSegments
                    ? <span
                        onClick={onViewSegments}
                        title="Open Segment Builder"
                        style={{ color: T.brand, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {metric.usedBy} segments <Icon name="arrow-up-right" size={11} />
                      </span>
                    : `${metric.usedBy} segments`
                }
              />
            )}
            {metric.games?.length > 0 && (
              <PanelRow
                label={<><Icon name="gamepad-2" size={11} /> Games</>}
                value={
                  <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {metric.games.map(g => <Badge key={g} variant="secondary">{g}</Badge>)}
                  </span>
                }
              />
            )}
          </PanelCollapse>

          {/* Changelog */}
          <PanelCollapse open={openChange} onToggle={() => setOpenChange(o => !o)} label="Changelog">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: T.n300, marginTop: 6, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, color: T.n900 }}><b>v1</b> — Created</div>
                <div style={{ fontSize: 11, color: T.n500 }}>4/25/2026</div>
              </div>
            </div>
          </PanelCollapse>

          {/* Delete */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.n200}` }}>
            <div style={{ fontSize: 11, color: T.n500, marginBottom: 8, lineHeight: 1.5 }}>
              Delete the metric and its slices? Scouts &amp; agents using this metric will also lose access to this data point.
            </div>
            <Button variant="outline" size="sm" leftIcon="trash-2">Delete Metric</Button>
          </div>
        </Card>
      </div>

      {showLineage && (
        <LineageDrawer
          seed={{ kind: 'metric', entity: metric }}
          onClose={() => setShowLineage(false)}
        />
      )}
    </div>
  );
}

export { MetricsCatalogDetail };
