import React from 'react';
import { T, Icon, useLucide, Button, Badge, Card, Input, Select, Switch, Tabs, Kpi, SectionHeader, Sparkline } from './theme.jsx';
import { BR_FRESHNESS } from './bedrockData.jsx';

/* global React, T, Icon, useLucide, Button, Badge, Card, Input, Select, Switch, Tabs, Kpi, SectionHeader, Sparkline, BR_FRESHNESS */

// ═══════════════════════════════════════════════════════════════════════
// FRESHNESS & SLAs — declare SLAs per master table / metric, track breaches
// Not just passive audit — users set targets, on-call routing, alerts.
// ═══════════════════════════════════════════════════════════════════════

function parseMin(s) {
  const m = /^(\d+)([mhd])$/.exec(s);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return m[2] === 'h' ? n * 60 : m[2] === 'd' ? n * 60 * 24 : n;
}

function StatusDot({ status }) {
  const map = {
    healthy: { color: T.green600, label: 'Healthy' },
    warning: { color: T.amber500, label: 'At risk' },
    breach:  { color: T.red600,   label: 'Breaching SLA' },
  };
  const c = map[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: c.color }}>
      <span style={{ width: 8, height: 8, borderRadius: 9999, background: c.color, boxShadow: status === 'breach' ? `0 0 0 4px ${c.color}30` : 'none', animation: status === 'breach' ? 'pulse-dot 1.6s infinite' : 'none' }} />
      {c.label}
    </span>
  );
}

function MiniSparkline({ data, sla, status }) {
  const max = Math.max(...data, sla * 1.1);
  const w = 120, h = 32;
  const slaY = h - (sla / max) * h;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {/* SLA target line */}
      <line x1={0} y1={slaY} x2={w} y2={slaY} stroke={T.n300} strokeDasharray="3 3" strokeWidth={1} />
      {/* polyline */}
      <polyline
        fill="none"
        stroke={status === 'breach' ? T.red600 : status === 'warning' ? T.amber500 : T.green600}
        strokeWidth={1.5}
        points={data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ')}
      />
      {/* breach points */}
      {data.map((v, i) => v > sla && (
        <circle key={i} cx={(i / (data.length - 1)) * w} cy={h - (v / max) * h} r={2} fill={T.red600} />
      ))}
    </svg>
  );
}

function FreshnessSLAs() {
  const [filter, setFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');
  useLucide(filter + typeFilter);

  const list = BR_FRESHNESS.filter(f => {
    if (filter !== 'all' && f.status !== filter) return false;
    if (typeFilter !== 'all' && f.type !== typeFilter) return false;
    return true;
  });

  const breach = BR_FRESHNESS.filter(f => f.status === 'breach').length;
  const warning = BR_FRESHNESS.filter(f => f.status === 'warning').length;
  const healthy = BR_FRESHNESS.filter(f => f.status === 'healthy').length;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto', background: T.n50 }}>
      <SectionHeader eyebrow="Catalog · Freshness & SLAs"
        title="Freshness & SLAs"
        description="Declare the freshness contract for each master table and metric. Bedrock measures actual staleness, alerts on breach, and routes to the on-call owner."
        right={<>
          <Button variant="outline" size="sm" leftIcon="bell">Alert routing</Button>
          <Button variant="outline" size="sm" leftIcon="history">Breach history</Button>
          <Button variant="primary" size="sm" leftIcon="plus">Declare new SLA</Button>
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi label="Tracked targets" value={BR_FRESHNESS.length} sub={`${BR_FRESHNESS.filter(f=>f.type==='table').length} tables · ${BR_FRESHNESS.filter(f=>f.type==='metric').length} metrics`} icon="timer" />
        <div style={{ padding: 18, borderRadius: 10, background: '#fff', border: `1px solid ${breach ? T.red600 : T.n200}`, boxShadow: breach ? '0 0 0 4px rgba(220,38,38,0.08)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 9999, background: T.red600, animation: breach ? 'pulse-dot 1.6s infinite' : 'none', boxShadow: `0 0 0 4px ${T.red600}30` }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: T.n500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Breaching</span>
          </div>
          <div style={{ fontFamily: T.fDisp, fontSize: 32, color: breach ? T.red600 : T.n950, textTransform: 'uppercase', lineHeight: 1 }}>{breach}</div>
          <div style={{ fontSize: 11, color: T.n500, marginTop: 4 }}>{breach === 0 ? 'all targets healthy' : 'need attention now'}</div>
        </div>
        <Kpi label="At risk" value={warning} sub="approaching SLA" icon="alert-triangle" />
        <Kpi label="Healthy" value={healthy} delta="+2" deltaDir="up" sub="within contract" icon="check-circle-2" />
      </div>

      <Card padding={0}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>Freshness contracts</span>
          <Badge variant="secondary">{list.length}</Badge>
          <div style={{ flex: 1 }} />
          <Tabs value={typeFilter} onChange={setTypeFilter} tabs={[
            { value: 'all',    label: 'All' },
            { value: 'table',  label: 'Master tables' },
            { value: 'metric', label: 'Metrics' },
          ]} />
          <div style={{ width: 1, height: 20, background: T.n200 }} />
          <Tabs value={filter} onChange={setFilter} tabs={[
            { value: 'all',     label: 'Any' },
            { value: 'breach',  label: 'Breaching' },
            { value: 'warning', label: 'At risk' },
            { value: 'healthy', label: 'Healthy' },
          ]} />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fSans, fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.n50 }}>
              {['Target', 'Type', 'Game', 'SLA target', 'Current staleness', '7-day trend', 'Breaches (7d)', 'Status', 'On-call', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: T.n600, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: `1px solid ${T.n200}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((f, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.n100}` }}
                  onMouseEnter={e => e.currentTarget.style.background = T.n50}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon name={f.type === 'table' ? 'table-2' : 'gauge'} size={14} color={f.status === 'breach' ? T.red600 : f.status === 'warning' ? T.amber500 : T.n500} />
                    <span style={{ fontFamily: T.fMono, fontSize: 12, fontWeight: 600, color: T.n900 }}>{f.target}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {f.type === 'table'
                    ? <Badge variant="secondary" leftIcon="table-2">Table</Badge>
                    : <Badge variant="info" leftIcon="gauge">Metric</Badge>}
                </td>
                <td style={{ padding: '12px 16px' }}><Badge variant="info">{f.game}</Badge></td>
                <td style={{ padding: '12px 16px', fontFamily: T.fMono, color: T.n700 }}>max {f.sla}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontFamily: T.fMono, fontSize: 13, fontWeight: 600, color: f.status === 'breach' ? T.red600 : f.status === 'warning' ? T.amber500 : T.green600 }}>
                    {f.current}
                  </span>
                </td>
                <td style={{ padding: '8px 16px' }}>
                  <MiniSparkline data={f.trend} sla={parseMin(f.sla)} status={f.status} />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontFamily: T.fMono, fontSize: 12, color: f.breaches7d > 0 ? T.red600 : T.n500, fontWeight: f.breaches7d > 0 ? 600 : 400 }}>
                    {f.breaches7d}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}><StatusDot status={f.status} /></td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 9999, background: T.n200, color: T.n700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                      {f.type === 'table' ? 'DP' : 'DS'}
                    </div>
                    <span style={{ fontFamily: T.fMono, fontSize: 10.5, color: T.n600 }}>{f.type === 'table' ? 'data-platform' : 'data-science'}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <Button variant="ghost" size="icon-sm"><Icon name="more-horizontal" size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Bottom row: SLA declaration + alert routing preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card padding={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="shield-check" size={14} color={T.brand} />
            <div style={{ fontSize: 13, fontWeight: 600, color: T.n900 }}>SLA declaration template</div>
          </div>
          <div style={{ fontSize: 11, color: T.n500, marginBottom: 12 }}>Every master table and metric must declare its freshness contract. Consumers rely on this to decide whether data is safe to use.</div>
          <pre style={{
            margin: 0, padding: 12, background: T.n50, border: `1px solid ${T.n200}`, borderRadius: 8,
            fontFamily: T.fMono, fontSize: 11, color: T.n700, lineHeight: 1.6, overflow: 'auto',
          }}>{`contract: master.purchase
  sla:
    max_staleness: 5m
    availability: 99.9%
  on_breach:
    page: data-platform-oncall
    annotate_segments: true
    pause_realtime_campaigns: false
  owner: data.platform@vng.com.vn
  reviewed: 2026-04-18`}</pre>
        </Card>

        <Card padding={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="bell" size={14} color={T.amber500} />
            <div style={{ fontSize: 13, fontWeight: 600, color: T.n900 }}>Recent alerts</div>
            <div style={{ flex: 1 }} />
            <Button variant="ghost" size="sm" rightIcon="arrow-right">View all</Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { time: '14m ago', target: 'master.session (TFB)', msg: 'Staleness 22m breached 15m SLA', severity: 'critical' },
              { time: '1h ago',  target: 'master.match (TFB)',   msg: 'Staleness 22m breached 15m SLA', severity: 'critical' },
              { time: '3h ago',  target: 'master.inventory',     msg: 'Approaching SLA (42m / 1h max)', severity: 'warning' },
              { time: '8h ago',  target: 'spend_usd_30d',        msg: 'Recovered — back within 1h SLA', severity: 'resolved' },
            ].map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, background: T.n50, border: `1px solid ${T.n100}` }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 9999, flexShrink: 0,
                  background: a.severity === 'critical' ? T.red600 : a.severity === 'warning' ? T.amber500 : T.green600,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.fMono, fontSize: 11, color: T.n900, fontWeight: 600 }}>{a.target}</div>
                  <div style={{ fontSize: 11, color: T.n600 }}>{a.msg}</div>
                </div>
                <div style={{ fontSize: 10, color: T.n500, fontFamily: T.fMono, flexShrink: 0 }}>{a.time}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { FreshnessSLAs });

export { FreshnessSLAs };
