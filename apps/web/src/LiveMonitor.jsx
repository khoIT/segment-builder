import React from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { T, CHART, Icon, useLucide, Button, Badge, Card, Input, Select, Switch, Tabs, Kpi, SectionHeader, Sparkline } from './theme.jsx';
import { GAMES, SEGMENTS, SEGMENT_SERIES, OVERLAP, DRIFT_ALERTS, RETENTION, FUNNEL, ARPU_SERIES, CAMPAIGNS } from './data.jsx';
import { LineageDrawer } from './LineageDrawer.jsx';

/* global React, Recharts, T, CHART, Icon, useLucide, Button, Badge, Card, Input, Select, Switch, Tabs, Kpi, SectionHeader, Sparkline, SEGMENTS, SEGMENT_SERIES, OVERLAP, DRIFT_ALERTS, RETENTION, FUNNEL, ARPU_SERIES, GAMES, CAMPAIGNS */


// pack series data into recharts-friendly shape
function packSeries(keys, series) {
  const n = series[keys[0]].length;
  return Array.from({ length: n }, (_, i) => {
    const row = { t: i };
    keys.forEach(k => row[k] = series[k][i]);
    return row;
  });
}

function SegmentListItem({ seg, selected, onClick }) {
  const game = GAMES.find(g => g.short === seg.game);
  return (
    <div onClick={onClick} style={{
      display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 8,
      border: `1px solid ${selected ? T.brand : 'transparent'}`,
      background: selected ? T.brandSoft : 'transparent',
      cursor: 'pointer', transition: 'background .12s, border-color .12s',
      position: 'relative',
    }} onMouseEnter={e => { if (!selected) e.currentTarget.style.background = T.n50; }}
       onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}>
      <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: game?.color || T.n300, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seg.name}</span>
          {seg.status === 'live' && <Badge variant="live" dot style={{ padding: '1px 6px', fontSize: 10 }}>live</Badge>}
          {seg.status === 'draft' && <Badge variant="secondary" style={{ padding: '1px 6px', fontSize: 10 }}>draft</Badge>}
          {seg.status === 'paused' && <Badge variant="warning" style={{ padding: '1px 6px', fontSize: 10 }}>paused</Badge>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: T.fSans, fontSize: 11, color: T.n500 }}>
          <span style={{ fontFamily: T.fMono, fontWeight: 600, color: T.n800 }}>{seg.size.toLocaleString()}</span>
          <span style={{ color: seg.sizeTrend === 'up' ? T.green600 : seg.sizeTrend === 'down' ? T.red600 : T.n500, fontWeight: 600 }}>
            {seg.delta}
          </span>
          <span>· {seg.game}</span>
          <span>· {seg.updated}</span>
        </div>
      </div>
    </div>
  );
}

function OverlapMatrix() {
  const [header, ...rows] = OVERLAP;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontFamily: T.fSans, fontSize: 11, width: '100%' }}>
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} style={{
                padding: '8px 10px', textAlign: i === 0 ? 'left' : 'center',
                fontWeight: 600, color: T.n600, letterSpacing: '0.04em', textTransform: 'uppercase',
                fontSize: 10, borderBottom: `1px solid ${T.n200}`,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => {
                if (c === 0) return <td key={c} style={{ padding: '8px 10px', fontWeight: 600, color: T.n800, whiteSpace: 'nowrap' }}>{cell}</td>;
                const v = cell;
                const onDiag = r === c - 1;
                const alpha = onDiag ? 0.9 : Math.min(0.75, v / 60);
                return (
                  <td key={c} style={{
                    padding: '10px', textAlign: 'center',
                    background: onDiag ? T.n100 : `rgba(240, 90, 34, ${alpha})`,
                    color: onDiag ? T.n600 : (alpha > 0.35 ? '#fff' : T.n900),
                    fontFamily: T.fMono, fontSize: 11, fontWeight: 600,
                    borderRadius: 4,
                  }}>{v}%</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Retention curve chart
function RetentionChart() {
  const keys = Object.keys(RETENTION);
  const data = Array.from({ length: RETENTION[keys[0]].length }, (_, i) => {
    const row = { day: i };
    keys.forEach((k, ki) => row[k] = +(RETENTION[k][i] * 100).toFixed(1));
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.n200} vertical={false} />
        <XAxis dataKey="day" tick={{ fill: T.n500, fontSize: 10, fontFamily: T.fSans }} axisLine={{ stroke: T.n200 }} tickLine={false}
          label={{ value: 'Day', position: 'insideBottom', offset: -2, fontSize: 10, fill: T.n500 }} />
        <YAxis tick={{ fill: T.n500, fontSize: 10, fontFamily: T.fSans }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip contentStyle={{ background: '#fff', border: `1px solid ${T.n200}`, borderRadius: 8, fontSize: 12, fontFamily: T.fSans }} />
        {keys.map((k, i) => {
          const seg = SEGMENTS.find(s => s.id === k);
          return <Line key={k} type="monotone" dataKey={k} stroke={CHART[i]} strokeWidth={2} dot={false} name={seg?.name || k} />;
        })}
        <Legend wrapperStyle={{ fontSize: 10, fontFamily: T.fSans }} iconSize={8} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function FunnelChart() {
  const max = FUNNEL[0].value;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {FUNNEL.map((row, i) => {
        const pct = row.value / max;
        const conv = i === 0 ? 100 : ((row.value / FUNNEL[i - 1].value) * 100).toFixed(1);
        return (
          <div key={row.step}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontFamily: T.fSans, fontSize: 11 }}>
              <span style={{ color: T.n700, fontWeight: 500 }}>{row.step}</span>
              <span style={{ color: T.n500, fontFamily: T.fMono }}>{row.value.toLocaleString()} · {conv}%</span>
            </div>
            <div style={{ height: 24, background: T.n100, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                height: '100%', width: `${pct * 100}%`,
                background: `linear-gradient(90deg, ${T.brand} 0%, #fb923c 100%)`,
                borderRadius: 6, transition: 'width .3s',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DriftPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {DRIFT_ALERTS.map((a, i) => {
        const sev = { high: { bg: '#fef2f2', fg: T.red600, bd: '#fecaca' }, medium: { bg: '#fffbeb', fg: '#d97706', bd: '#fed7aa' }, low: { bg: '#eff6ff', fg: T.blue600, bd: '#bfdbfe' } }[a.severity];
        return (
          <div key={i} style={{
            padding: 12, borderRadius: 8, border: `1px solid ${sev.bd}`, background: sev.bg,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sev.fg, flexShrink: 0 }}>
              <Icon name="activity" size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                <span style={{ fontFamily: T.fMono, fontSize: 12, fontWeight: 600, color: T.n900 }}>{a.feature}</span>
                <span style={{ fontFamily: T.fSans, fontSize: 11, color: sev.fg, fontWeight: 600 }}>{a.severity.toUpperCase()}</span>
              </div>
              <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n600, marginBottom: 4 }}>{a.note}</div>
              <div style={{ display: 'flex', gap: 12, fontFamily: T.fSans, fontSize: 10, color: T.n500 }}>
                <span>PSI <strong style={{ color: T.n800, fontFamily: T.fMono }}>{a.psi}</strong></span>
                <span>Shift <strong style={{ color: sev.fg, fontFamily: T.fMono }}>{a.drift}</strong></span>
                <span>· {a.game}</span>
                <span>· {a.ts}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LiveMonitor({ chartType = 'area' }) {
  const [selected, setSelected] = React.useState('s_ptg_whales');
  const [compare, setCompare] = React.useState(['s_ptg_whales', 's_cfm_whales', 's_tfb_new_clubs']);
  const [search, setSearch] = React.useState('');
  const [pulse, setPulse] = React.useState(0);
  // undefined = drawer closed; null = picker; segment object = focused
  const [lineage, setLineage] = React.useState(undefined);
  useLucide(selected);

  // subtle "live" pulse
  React.useEffect(() => {
    const id = setInterval(() => setPulse(p => p + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const data = packSeries(compare, SEGMENT_SERIES);
  const arpuData = Array.from({ length: 30 }, (_, i) => {
    const row = { day: `D${i + 1}` };
    Object.keys(ARPU_SERIES).forEach(k => row[k] = ARPU_SERIES[k][i]);
    return row;
  });

  const filteredList = SEGMENTS.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));
  const selSeg = SEGMENTS.find(s => s.id === selected);

  return (
    <div style={{ display: 'flex', height: '100%', background: T.n50 }}>
      {/* left rail — segment list */}
      <div style={{ width: 320, borderRight: `1px solid ${T.n200}`, background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 14px 12px', borderBottom: `1px solid ${T.n200}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Live segments · {SEGMENTS.filter(s => s.status === 'live').length}
            </div>
            <Button variant="ghost" size="icon-sm"><Icon name="plus" size={13} /></Button>
          </div>
          <Input size="sm" value={search} onChange={e => setSearch(e.target.value)} leftIcon="search" placeholder="Search segments…" />
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          {filteredList.map(s => (
            <SegmentListItem key={s.id} seg={s} selected={selected === s.id} onClick={() => setSelected(s.id)} />
          ))}
        </div>
      </div>

      {/* main area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Badge variant="live" dot>Live · updates every 60s</Badge>
              <span style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500 }}>Last refresh 24s ago</span>
            </div>
            <SectionHeader
              title={selSeg.name}
              description={selSeg.desc}
              right={
                <>
                  <Button variant="outline" size="sm" leftIcon="git-compare" onClick={() => setLineage(selSeg)}>Lineage</Button>
                  <Button variant="outline" size="sm" leftIcon="download">Export</Button>
                  <Button variant="outline" size="sm" leftIcon="layers">Compare</Button>
                  <Button variant="primary" size="sm" leftIcon="rocket">Activate</Button>
                </>
              }
            />
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <Kpi label="Segment size" value={selSeg.size.toLocaleString()} delta={selSeg.delta + ' / 24h'} deltaDir={selSeg.sizeTrend} icon="users" />
            <Kpi label="ARPU (7d)" value="₫ 54.2K" delta="+8.2%" deltaDir="up" icon="dollar-sign" sub="vs baseline 49.8K" />
            <Kpi label="Campaign reach" value="17.1K" delta="94.1%" deltaDir="up" icon="target" sub="3 active campaigns" />
            <Kpi label="Churn risk" value="0.62" delta="+0.04" deltaDir="down" icon="trending-down" sub="model v4" />
          </div>

          {/* main chart */}
          <Card padding={18}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>Segment size over time</div>
                <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500 }}>Hourly, last 72h · compare up to 5 segments</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Tabs value="72h" onChange={() => {}} tabs={[{ value: '24h', label: '24h' }, { value: '72h', label: '72h' }, { value: '7d', label: '7d' }, { value: '30d', label: '30d' }]} />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              {chartType === 'area' ? (
                <AreaChart data={data} margin={{ top: 6, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    {compare.map((k, i) => (
                      <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART[i]} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={CHART[i]} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.n200} vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: T.n500, fontSize: 10 }} axisLine={{ stroke: T.n200 }} tickLine={false} />
                  <YAxis tick={{ fill: T.n500, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <Tooltip contentStyle={{ background: '#fff', border: `1px solid ${T.n200}`, borderRadius: 8, fontSize: 12 }} />
                  {compare.map((k, i) => {
                    const seg = SEGMENTS.find(s => s.id === k);
                    return <Area key={k} type="monotone" dataKey={k} stroke={CHART[i]} strokeWidth={2} fill={`url(#grad-${k})`} name={seg?.name || k} />;
                  })}
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: T.fSans }} iconSize={8} />
                </AreaChart>
              ) : (
                <LineChart data={data} margin={{ top: 6, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.n200} vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: T.n500, fontSize: 10 }} axisLine={{ stroke: T.n200 }} tickLine={false} />
                  <YAxis tick={{ fill: T.n500, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <Tooltip contentStyle={{ background: '#fff', border: `1px solid ${T.n200}`, borderRadius: 8, fontSize: 12 }} />
                  {compare.map((k, i) => {
                    const seg = SEGMENTS.find(s => s.id === k);
                    return <Line key={k} type="monotone" dataKey={k} stroke={CHART[i]} strokeWidth={2} dot={false} name={seg?.name || k} />;
                  })}
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: T.fSans }} iconSize={8} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </Card>

          {/* two columns: overlap + retention */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Card padding={18}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>Cohort overlap</div>
                  <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500 }}>% of row contained in column</div>
                </div>
                <Tabs value="matrix" onChange={() => {}} tabs={[{ value: 'matrix', label: 'Matrix' }, { value: 'venn', label: 'Venn' }]} />
              </div>
              <OverlapMatrix />
            </Card>

            <Card padding={18}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>Retention curves</div>
                  <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500 }}>D0 → D30 % retention</div>
                </div>
              </div>
              <RetentionChart />
            </Card>
          </div>

          {/* three columns: funnel, ARPU, drift */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr 1fr', gap: 12 }}>
            <Card padding={18}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>Campaign funnel · Retention Bundle Q2</div>
                <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500 }}>Send → Convert (ran past 7d)</div>
              </div>
              <FunnelChart />
            </Card>

            <Card padding={18}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>Revenue / ARPU trend</div>
                <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500 }}>30d, ₫ per user per day</div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={arpuData} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.n200} vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: T.n500, fontSize: 9 }} axisLine={{ stroke: T.n200 }} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: T.n500, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: `1px solid ${T.n200}`, borderRadius: 8, fontSize: 12 }} />
                  {Object.keys(ARPU_SERIES).map((k, i) => (
                    <Bar key={k} dataKey={k} stackId="a" fill={CHART[i]} name={SEGMENTS.find(s => s.id === k)?.name || k} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 9, fontFamily: T.fSans }} iconSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card padding={18}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>Feature drift</div>
                  <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500 }}>Last 24h</div>
                </div>
                <Badge variant="destructive" dot>2 high</Badge>
              </div>
              <DriftPanel />
            </Card>
          </div>
        </div>
      </div>

      {lineage !== undefined && (
        <LineageDrawer
          seed={lineage ? { kind: 'segment', entity: lineage } : null}
          onClose={() => setLineage(undefined)}
        />
      )}
    </div>
  );
}

Object.assign(window, { LiveMonitor });

export { LiveMonitor };
