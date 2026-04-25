import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { T, Icon, Button, Card } from './theme.jsx';
import { seriesForMetric, last7dAvg, delta7d, formatMetricValue } from './metrics-mock-series.jsx';
import { MetricSignals } from './metrics-signals.jsx';

// ═══════════════════════════════════════════════════════════════════════
// METRICS COMPARE — side-by-side detail mini-cards for 2+ selected metrics.
// Replaces the list view (in-page state swap, same as single detail).
// Categorical metrics degrade to "no time series" as in the single detail.
// ═══════════════════════════════════════════════════════════════════════

function fmtAxisDate(s) {
  const d = new Date(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CompareCard({ metric, prettyName, formulaToBlurb, onRemove }) {
  const data = React.useMemo(() => seriesForMetric(metric).slice(-90), [metric.id]);
  const avg = last7dAvg(metric);
  const d = delta7d(metric);
  const positive = d >= 0;
  const good = (positive && metric.goodDir === 'up') || (!positive && metric.goodDir === 'down');
  const isCategorical = metric.unit === 'enum' || metric.unit === 'string';
  const stroke = good ? T.green600 : T.red600;

  return (
    <Card padding={18} style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 280 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.n950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {prettyName(metric.name)}
          </div>
          <div style={{ fontSize: 11, color: T.n500, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formulaToBlurb(metric)}
          </div>
          <div style={{ marginTop: 6 }}>
            <MetricSignals m={metric} marginLeft={0} />
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onRemove}><Icon name="x" size={13} /></Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <span style={{ fontFamily: T.fDisp, fontSize: 36, lineHeight: 0.95, color: T.n950 }}>
          {isCategorical ? '—' : formatMetricValue(avg, metric.unit)}
        </span>
        {!isCategorical && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 7px', borderRadius: 6,
            background: good ? T.greenSoft : T.redSoft,
            color: good ? T.green600 : T.red600,
            fontSize: 11, fontWeight: 600, marginBottom: 4,
          }}>
            <Icon name={positive ? 'trending-up' : 'trending-down'} size={11} />
            {positive ? '+' : ''}{d.toFixed(1)}%
          </span>
        )}
      </div>

      {isCategorical ? (
        <div style={{ flex: 1, minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.n500, fontSize: 11 }}>
          Categorical metric — no time series
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={`cmpFill-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.n200} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.n500 }} tickFormatter={fmtAxisDate} minTickGap={28} />
              <YAxis tick={{ fontSize: 10, fill: T.n500 }} tickFormatter={v => formatMetricValue(v, metric.unit)} width={48} />
              <Tooltip contentStyle={{ fontFamily: T.fSans, fontSize: 11, borderRadius: 8, border: `1px solid ${T.n200}` }} formatter={v => formatMetricValue(v, metric.unit)} />
              <Area type="monotone" dataKey="value" stroke={stroke} strokeWidth={1.75} fill={`url(#cmpFill-${metric.id})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function MetricsCatalogCompare({ metrics, onBack, onRemove, prettyName, formulaToBlurb }) {
  // 1 col on narrow, 2 cols on regular, 3 cols when 3+ metrics selected.
  const cols = metrics.length >= 3 ? 3 : 2;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.n50 }}>
      <div style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${T.n200}`, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span onClick={onBack} style={{ color: T.n500, cursor: 'pointer' }}>Metrics</span>
          <span style={{ color: T.n400 }}>/</span>
          <span style={{ color: T.n900, fontWeight: 600 }}>Compare {metrics.length} metrics</span>
        </div>
        <div style={{ flex: 1 }} />
        <Button variant="outline" size="sm" leftIcon="arrow-left" onClick={onBack}>Back to list</Button>
      </div>

      <div style={{ padding: 24, flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 16 }}>
          {metrics.map(m => (
            <CompareCard
              key={m.id}
              metric={m}
              prettyName={prettyName}
              formulaToBlurb={formulaToBlurb}
              onRemove={() => onRemove(m.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export { MetricsCatalogCompare };
