import React from 'react';
import { LineChart as LC2, Line as Ln2, AreaChart as AC2, Area as Ar2, BarChart as BC2, Bar as Br2, XAxis as XA2, YAxis as YA2, CartesianGrid as CG2, Tooltip as TT2, ResponsiveContainer as RC2 } from 'recharts';
import { T, CHART, Icon, useLucide, Button, Badge, Card, Input, Select, Switch, Tabs, Avatar, Kpi, SectionHeader, Sparkline } from './theme.jsx';
import { GAMES, CONNECTORS, TABLES, FEATURES, MODELS, SEGMENTS, CAMPAIGNS, SAMPLE_ROWS } from './data.jsx';

/* global React, Recharts, T, CHART, Icon, useLucide, Button, Badge, Card, Input, Select, Switch, Tabs, Avatar, Kpi, SectionHeader, Sparkline, CONNECTORS, TABLES, FEATURES, MODELS, CAMPAIGNS, SEGMENTS, GAMES, SAMPLE_ROWS */


// ─── Data Connectors ────────────────────────────────────────────
function ConnectorIcon({ type, size = 28 }) {
  const color = { postgres: '#336791', trino: '#dc2626', iceberg: '#2563eb' }[type];
  const letter = { postgres: 'PG', trino: 'TR', iceberg: 'IC' }[type];
  return (
    <div style={{ width: size, height: size, borderRadius: 7, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fMono, fontSize: 11, fontWeight: 700 }}>{letter}</div>
  );
}

function DataConnectors() {
  useLucide(0);
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader eyebrow="Step 1 · Data sources"
        title="Data connectors"
        description="Connect Postgres, Trino, and Iceberg sources. Raw tables become queryable in the Explorer and feed the Feature builder."
        right={<>
          <Button variant="outline" size="sm" leftIcon="book-open">Docs</Button>
          <Button variant="primary" size="sm" leftIcon="plus">New connector</Button>
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi label="Connectors" value="6" sub="4 live · 1 syncing · 1 error" icon="database" />
        <Kpi label="Tables indexed" value="2,726" delta="+84 / 7d" deltaDir="up" icon="table" />
        <Kpi label="Rows" value="5.4T" sub="across all sources" icon="layers" />
        <Kpi label="Avg. query p95" value="384ms" delta="-22ms" deltaDir="up" icon="zap" />
      </div>

      <Card padding={0}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>All connectors</span>
          <Badge variant="secondary">{CONNECTORS.length}</Badge>
          <div style={{ flex: 1 }} />
          <Tabs value="all" onChange={() => {}} tabs={[{ value: 'all', label: 'All' }, { value: 'pg', label: 'Postgres' }, { value: 'trino', label: 'Trino' }, { value: 'ice', label: 'Iceberg' }]} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fSans, fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.n50 }}>
              {['Connector', 'Type', 'Status', 'Tables', 'Rows', 'p95 latency', 'Owner', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: T.n600, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: `1px solid ${T.n200}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CONNECTORS.map(c => (
              <tr key={c.id} style={{ borderBottom: `1px solid ${T.n100}` }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ConnectorIcon type={c.type} />
                    <div>
                      <div style={{ fontWeight: 600, color: T.n900 }}>{c.name}</div>
                      <div style={{ fontFamily: T.fMono, fontSize: 10, color: T.n500 }}>{c.host}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: T.n700 }}>{c.type}</td>
                <td style={{ padding: '12px 16px' }}>
                  {c.status === 'live' && <Badge variant="live" dot>live</Badge>}
                  {c.status === 'syncing' && <Badge variant="info" dot>syncing</Badge>}
                  {c.status === 'error' && <Badge variant="destructive" dot>error</Badge>}
                </td>
                <td style={{ padding: '12px 16px', fontFamily: T.fMono, color: T.n700 }}>{c.tables}</td>
                <td style={{ padding: '12px 16px', fontFamily: T.fMono, color: T.n700 }}>{c.rows}</td>
                <td style={{ padding: '12px 16px', fontFamily: T.fMono, color: T.n700 }}>{c.latency}</td>
                <td style={{ padding: '12px 16px', color: T.n600 }}>{c.owner}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <Button variant="ghost" size="icon-sm"><Icon name="more-horizontal" size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card padding={18}>
        <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900, marginBottom: 12 }}>Quick-add a connector</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { type: 'postgres', title: 'Postgres', desc: 'Operational DBs, game state, telemetry', defaults: 'host · port · db · user' },
            { type: 'trino',    title: 'Trino',    desc: 'Federated query across lakes + warehouses', defaults: 'coordinator URL · catalog' },
            { type: 'iceberg',  title: 'Iceberg',  desc: 'Columnar event lakes on S3 / GCS',         defaults: 'catalog + warehouse URI' },
          ].map(o => (
            <div key={o.type} style={{ padding: 16, borderRadius: 10, border: `1px solid ${T.n200}`, cursor: 'pointer', transition: 'border-color .12s', background: '#fff' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.brand}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.n200}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <ConnectorIcon type={o.type} size={32} />
                <div style={{ fontSize: 14, fontWeight: 600, color: T.n900 }}>{o.title}</div>
              </div>
              <div style={{ fontSize: 12, color: T.n600, marginBottom: 6 }}>{o.desc}</div>
              <div style={{ fontFamily: T.fMono, fontSize: 10, color: T.n500 }}>{o.defaults}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Raw Data Explorer ───────────────────────────────────────────
function RawExplorer() {
  const [table, setTable] = React.useState(TABLES[0]);
  const [query, setQuery] = React.useState(
`SELECT user_id, event_date, country, platform,
       sessions, spend_usd, churn_risk, propensity_pay, rank_tier
FROM features.player_daily
WHERE game = 'PTG' AND event_date >= date '2026-04-22'
ORDER BY spend_usd DESC
LIMIT 1000;`);
  useLucide(table);

  return (
    <div style={{ display: 'flex', height: '100%', background: T.n50 }}>
      {/* sidebar: tables */}
      <div style={{ width: 280, borderRight: `1px solid ${T.n200}`, background: '#fff', overflow: 'auto' }}>
        <div style={{ padding: '14px 14px 10px' }}>
          <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Catalog</div>
          <Input size="sm" leftIcon="search" placeholder="Search tables…" />
        </div>
        <div style={{ padding: '0 8px 16px' }}>
          {['PTG', 'CFM', 'TFB'].map(g => (
            <div key={g} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: T.fSans, fontSize: 10, fontWeight: 600, color: T.n400, padding: '6px 10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{g}</div>
              {TABLES.filter(t => t.game === g).map(t => {
                const active = t.name === table.name && t.game === table.game;
                return (
                  <div key={t.name + t.game} onClick={() => setTable(t)} style={{
                    padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                    background: active ? T.brandSoft : 'transparent',
                    color: active ? T.brand : T.n800,
                    marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8,
                  }} onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.n50; }}
                     onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                    <Icon name="table" size={12} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.fMono, fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                      <div style={{ fontFamily: T.fSans, fontSize: 10, color: T.n500 }}>{t.rows} · {t.cols} cols</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '18px 24px 12px', borderBottom: `1px solid ${T.n200}`, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500, marginBottom: 4 }}>Exploring · {table.game}</div>
              <div style={{ fontFamily: T.fMono, fontSize: 20, fontWeight: 600, color: T.n950 }}>{table.name}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontFamily: T.fSans, fontSize: 11, color: T.n500 }}>
                <span><Icon name="database" size={11} /> {table.rows} rows</span>
                <span><Icon name="columns" size={11} /> {table.cols} columns</span>
                <span><Icon name="clock" size={11} /> fresh {table.freshness}</span>
                <span><Icon name="check-circle" size={11} /> {table.pct}% quality</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" size="sm" leftIcon="sparkles">Auto-profile</Button>
              <Button variant="outline" size="sm" leftIcon="plus">Promote to feature</Button>
              <Button variant="primary" size="sm" leftIcon="play">Run</Button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '14px 24px', borderBottom: `1px solid ${T.n200}`, background: T.n950, color: T.n100 }}>
            <pre style={{ margin: 0, fontFamily: T.fMono, fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
              <span style={{ color: '#8b5cf6' }}>SELECT</span> user_id, event_date, country, platform,{'\n'}
              {'       '}sessions, spend_usd, churn_risk, propensity_pay, rank_tier{'\n'}
              <span style={{ color: '#8b5cf6' }}>FROM</span> features.player_daily{'\n'}
              <span style={{ color: '#8b5cf6' }}>WHERE</span> game = <span style={{ color: '#fb923c' }}>'PTG'</span> <span style={{ color: '#8b5cf6' }}>AND</span> event_date &gt;= <span style={{ color: '#fb923c' }}>date '2026-04-22'</span>{'\n'}
              <span style={{ color: '#8b5cf6' }}>ORDER BY</span> spend_usd <span style={{ color: '#8b5cf6' }}>DESC</span>{'\n'}
              <span style={{ color: '#8b5cf6' }}>LIMIT</span> 1000;
            </pre>
          </div>

          <div style={{ padding: '8px 24px', borderBottom: `1px solid ${T.n200}`, background: '#fff', display: 'flex', alignItems: 'center', gap: 10, fontFamily: T.fSans, fontSize: 11, color: T.n500 }}>
            <Badge variant="success" dot>Query OK</Badge>
            <span>1,000 rows · 28ms · cached</span>
            <div style={{ flex: 1 }} />
            <Button variant="ghost" size="xs" leftIcon="download">Export CSV</Button>
            <Button variant="ghost" size="xs" leftIcon="bar-chart-2">Visualize</Button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fMono, fontSize: 11 }}>
              <thead style={{ position: 'sticky', top: 0, background: T.n50, zIndex: 1 }}>
                <tr>
                  {Object.keys(SAMPLE_ROWS[0]).map(k => (
                    <th key={k} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: T.n600, fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: `1px solid ${T.n200}`, whiteSpace: 'nowrap' }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_ROWS.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.n100}` }}
                      onMouseEnter={e => e.currentTarget.style.background = T.n50}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {Object.entries(r).map(([k, v]) => (
                      <td key={k} style={{
                        padding: '7px 12px', color: T.n800,
                        ...(typeof v === 'number' && v > 0 && v < 1
                          ? { background: `rgba(240,90,34,${v * 0.25})`, color: v > 0.6 ? '#7c2d12' : T.n800 }
                          : {}),
                      }}>{typeof v === 'number' && v % 1 !== 0 ? v.toFixed(2) : v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feature Builder ─────────────────────────────────────────────
function FeatureBuilder() {
  useLucide(0);
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader eyebrow="Step 2 · Features"
        title="Feature builder"
        description="Pre-aggregated features computed on a schedule. Use these in segments, models, and dashboards."
        right={<>
          <Button variant="outline" size="sm" leftIcon="git-branch">Lineage</Button>
          <Button variant="primary" size="sm" leftIcon="plus">New feature</Button>
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi label="Features" value={FEATURES.length} sub="7 prod · 3 staging" icon="layers" />
        <Kpi label="Covered users" value="5.1M" delta="+4.2%" deltaDir="up" icon="users" />
        <Kpi label="Compute spend" value="₫ 18.4M" delta="-12%" deltaDir="up" sub="per month" icon="dollar-sign" />
        <Kpi label="SLA" value="99.4%" delta="+0.2%" deltaDir="up" sub="fresh < 2h" icon="check-circle" />
      </div>

      <Card padding={0}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>Feature registry</span>
          <Badge variant="secondary">{FEATURES.length}</Badge>
          <div style={{ flex: 1 }} />
          <Input size="sm" leftIcon="search" placeholder="Search features…" style={{ width: 220 }} />
          <Select size="sm" value="all" onChange={() => {}} options={[{ value: 'all', label: 'All games' }, { value: 'PTG', label: 'PTG' }, { value: 'CFM', label: 'CFM' }, { value: 'TFB', label: 'TFB' }]} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fSans, fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.n50 }}>
              {['Feature', 'Game', 'Type', 'Aggregation', 'Window', 'Coverage', 'Last run', 'Preview', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: T.n600, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: `1px solid ${T.n200}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map(f => (
              <tr key={f.id} style={{ borderBottom: `1px solid ${T.n100}`, transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = T.n50}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {f.agg === 'ML' ? <Icon name="sparkles" size={14} color="#a855f7" /> : <Icon name="function-square" size={14} color={T.n500} />}
                    <div>
                      <div style={{ fontFamily: T.fMono, fontWeight: 600, color: T.n900, fontSize: 12 }}>{f.name}</div>
                      <div style={{ fontFamily: T.fSans, fontSize: 10, color: T.n500 }}>owner · {f.owner}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}><Badge variant="info">{f.game}</Badge></td>
                <td style={{ padding: '10px 16px', color: T.n700 }}>{f.type}</td>
                <td style={{ padding: '10px 16px' }}>
                  {f.agg === 'ML' ? <Badge variant="brandSoft">ML</Badge> : <span style={{ fontFamily: T.fMono, fontSize: 11, color: T.n700 }}>{f.agg}</span>}
                </td>
                <td style={{ padding: '10px 16px', color: T.n700 }}>{f.window}</td>
                <td style={{ padding: '10px 16px', fontFamily: T.fMono, color: T.n700 }}>{f.users}</td>
                <td style={{ padding: '10px 16px', color: T.n500 }}>{f.last}</td>
                <td style={{ padding: '10px 16px' }}>
                  <Sparkline data={[12, 18, 15, 22, 20, 26, 32, 28, 34, 30 + (f.id.length % 7), 36, 41]} color={f.agg === 'ML' ? '#a855f7' : T.brand} />
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <Button variant="ghost" size="icon-sm"><Icon name="more-horizontal" size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Propensity Models ──────────────────────────────────────────
function PropensityModels() {
  const [selected, setSelected] = React.useState(MODELS[0]);
  useLucide(selected);
  const rocData = Array.from({ length: 11 }, (_, i) => ({ fpr: i / 10, tpr: Math.min(1, Math.pow(i / 10, 0.35)) }));

  return (
    <div style={{ display: 'flex', height: '100%', background: T.n50 }}>
      <div style={{ width: 320, borderRight: `1px solid ${T.n200}`, background: '#fff', overflow: 'auto' }}>
        <div style={{ padding: '16px 14px 12px', borderBottom: `1px solid ${T.n200}` }}>
          <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Models · {MODELS.length}</div>
          <Button variant="primary" size="sm" leftIcon="plus" style={{ width: '100%' }}>Train new model</Button>
        </div>
        <div style={{ padding: 8 }}>
          {MODELS.map(m => {
            const active = m.id === selected.id;
            return (
              <div key={m.id} onClick={() => setSelected(m)} style={{
                padding: '12px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                border: `1px solid ${active ? T.brand : 'transparent'}`,
                background: active ? T.brandSoft : 'transparent',
              }} onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.n50; }}
                 onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon name="sparkles" size={12} color={active ? T.brand : '#a855f7'} />
                  <span style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>{m.name}</span>
                </div>
                <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n600 }}>{m.target}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, fontFamily: T.fSans, fontSize: 11 }}>
                  <Badge variant="info">{m.game}</Badge>
                  {m.status === 'production' && <Badge variant="success" dot>prod</Badge>}
                  {m.status === 'staging' && <Badge variant="warning" dot>staging</Badge>}
                  {m.status === 'training' && <Badge variant="info" dot>training</Badge>}
                  <span style={{ fontFamily: T.fMono, color: T.n500, marginLeft: 'auto' }}>AUC {m.auc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Step 3 · Propensity model</div>
            <SectionHeader title={selected.name} description={selected.target}
              right={<>
                <Button variant="outline" size="sm" leftIcon="refresh-cw">Retrain</Button>
                <Button variant="outline" size="sm" leftIcon="flask-conical">Champion / challenger</Button>
                <Button variant="primary" size="sm" leftIcon="rocket">Deploy</Button>
              </>} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <Kpi label="AUC" value={selected.auc.toFixed(3)} delta="+0.012" deltaDir="up" icon="target" />
            <Kpi label="Samples" value={selected.samples} sub="labelled + features" icon="database" />
            <Kpi label="Calibration" value="0.91" delta="+0.03" deltaDir="up" icon="crosshair" />
            <Kpi label="Trained" value={selected.trained} sub="nightly retrain" icon="clock" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12 }}>
            <Card padding={18}>
              <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900, marginBottom: 4 }}>ROC curve</div>
              <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500, marginBottom: 12 }}>Model vs random baseline</div>
              <RC2 width="100%" height={240}>
                <AC2 data={rocData} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="roc-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CG2 strokeDasharray="3 3" stroke={T.n200} vertical={false} />
                  <XA2 dataKey="fpr" tick={{ fill: T.n500, fontSize: 10 }} axisLine={{ stroke: T.n200 }} tickLine={false} domain={[0, 1]} type="number" />
                  <YA2 tick={{ fill: T.n500, fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 1]} />
                  <TT2 contentStyle={{ background: '#fff', border: `1px solid ${T.n200}`, borderRadius: 8, fontSize: 12 }} />
                  <Ar2 type="monotone" dataKey="tpr" stroke="#a855f7" strokeWidth={2} fill="url(#roc-grad)" name="Model" />
                </AC2>
              </RC2>
            </Card>

            <Card padding={18}>
              <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900, marginBottom: 4 }}>Top features by SHAP</div>
              <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500, marginBottom: 12 }}>Contribution to prediction</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { f: 'purchase_amount_30d', v: 0.34 },
                  { f: 'sessions_last_7d',    v: 0.22 },
                  { f: 'rank_tier',           v: 0.14 },
                  { f: 'avatar_cosmetic_tier',v: 0.11 },
                  { f: 'days_since_last_session', v: 0.09 },
                  { f: 'friends_online_count',v: 0.06 },
                ].map(row => (
                  <div key={row.f}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontFamily: T.fMono, fontSize: 11 }}>
                      <span style={{ color: T.n700 }}>{row.f}</span>
                      <span style={{ color: T.n500 }}>{row.v.toFixed(2)}</span>
                    </div>
                    <div style={{ height: 6, background: T.n100, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${row.v * 100 / 0.34 * 100}%`, background: '#a855f7', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card padding={18}>
            <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900, marginBottom: 4 }}>Score distribution</div>
            <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500, marginBottom: 12 }}>Positive class vs negative class</div>
            <RC2 width="100%" height={180}>
              <BC2 data={Array.from({ length: 20 }, (_, i) => ({
                bin: (i / 20).toFixed(2),
                pos: Math.round(Math.exp(-Math.pow((i - 16) / 3, 2)) * 800 + 10),
                neg: Math.round(Math.exp(-Math.pow((i - 5) / 4, 2)) * 1200 + 20),
              }))} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                <CG2 strokeDasharray="3 3" stroke={T.n200} vertical={false} />
                <XA2 dataKey="bin" tick={{ fill: T.n500, fontSize: 10 }} axisLine={{ stroke: T.n200 }} tickLine={false} />
                <YA2 tick={{ fill: T.n500, fontSize: 10 }} axisLine={false} tickLine={false} />
                <TT2 contentStyle={{ background: '#fff', border: `1px solid ${T.n200}`, borderRadius: 8, fontSize: 12 }} />
                <Br2 dataKey="neg" fill={T.n400} name="Did not convert" />
                <Br2 dataKey="pos" fill="#a855f7" name="Converted" />
              </BC2>
            </RC2>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Campaigns ──────────────────────────────────────────────────
function Campaigns() {
  useLucide(0);
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader eyebrow="Activation"
        title="Campaigns"
        description="Push, in-game and email campaigns activated against live segments."
        right={<>
          <Button variant="outline" size="sm" leftIcon="calendar">Calendar</Button>
          <Button variant="primary" size="sm" leftIcon="plus">New campaign</Button>
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi label="Running" value="4" sub="of 6 total" icon="play" />
        <Kpi label="Reach (7d)" value="144.5K" delta="+18%" deltaDir="up" icon="broadcast" />
        <Kpi label="Conversions" value="19.8K" delta="+12.4%" deltaDir="up" icon="target" />
        <Kpi label="Revenue" value="₫ 4.12B" delta="+₫ 820M" deltaDir="up" sub="vs last 7d" icon="dollar-sign" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 12 }}>
        <Card padding={0}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>All campaigns</span>
            <Badge variant="secondary">{CAMPAIGNS.length}</Badge>
            <div style={{ flex: 1 }} />
            <Tabs value="all" onChange={() => {}} tabs={[{ value: 'all', label: 'All' }, { value: 'run', label: 'Running' }, { value: 'sched', label: 'Scheduled' }, { value: 'done', label: 'Ended' }]} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fSans, fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.n50 }}>
                {['Campaign', 'Segment', 'Channel', 'Status', 'Reached', 'Conv.', 'CTR', 'Revenue'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: T.n600, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: `1px solid ${T.n200}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAMPAIGNS.map(c => {
                const seg = SEGMENTS.find(s => s.id === c.segment);
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${T.n100}` }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: T.n900 }}>{c.name}</div>
                      <div style={{ fontFamily: T.fSans, fontSize: 10, color: T.n500 }}>{c.start} → {c.end}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, color: T.n700 }}>{seg?.name || '—'}</div>
                      <div style={{ fontFamily: T.fMono, fontSize: 10, color: T.n500 }}>{seg?.size.toLocaleString()}</div>
                    </td>
                    <td style={{ padding: '10px 14px', color: T.n700 }}>{c.channel}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {c.status === 'running' && <Badge variant="live" dot>running</Badge>}
                      {c.status === 'paused' && <Badge variant="warning" dot>paused</Badge>}
                      {c.status === 'scheduled' && <Badge variant="info" dot>scheduled</Badge>}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: T.fMono, color: T.n700 }}>{c.reached.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontFamily: T.fMono, color: T.n700 }}>{c.converted.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontFamily: T.fMono, color: T.n700 }}>{c.ctr}</td>
                    <td style={{ padding: '10px 14px', fontFamily: T.fMono, color: T.n900, fontWeight: 600 }}>{c.revenue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card padding={18}>
          <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900, marginBottom: 12 }}>Activate from segment</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: T.n500, marginBottom: 4 }}>Segment</div>
              <Select size="sm" value="s_ptg_whales" onChange={() => {}} options={SEGMENTS.map(s => ({ value: s.id, label: s.name }))} style={{ width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.n500, marginBottom: 4 }}>Channel</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {[{ k: 'push', i: 'bell' }, { k: 'in-game', i: 'gamepad-2' }, { k: 'email', i: 'mail' }].map(c => (
                  <div key={c.k} style={{
                    padding: '10px 8px', borderRadius: 8, border: `1px solid ${c.k === 'push' ? T.brand : T.n200}`,
                    background: c.k === 'push' ? T.brandSoft : '#fff', color: c.k === 'push' ? T.brand : T.n700,
                    fontSize: 11, fontWeight: 500, textAlign: 'center', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                    <Icon name={c.i} size={14} />
                    <span style={{ textTransform: 'capitalize' }}>{c.k}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.n500, marginBottom: 4 }}>Message</div>
              <textarea defaultValue="Exclusive offer for our top players: 40% off the Premium bundle this weekend only." style={{
                width: '100%', minHeight: 70, padding: 8, borderRadius: 8, border: `1px solid ${T.n200}`,
                fontFamily: T.fSans, fontSize: 12, resize: 'vertical', outline: 'none', color: T.n900,
              }} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Select size="sm" value="now" onChange={() => {}} options={[{ value: 'now', label: 'Send now' }, { value: 'sched', label: 'Schedule' }]} style={{ flex: 1 }} />
              <Button variant="primary" size="default" leftIcon="rocket" style={{ flex: 1 }}>Launch</Button>
            </div>
            <div style={{ padding: 10, borderRadius: 8, background: T.brandSoft, border: `1px solid ${T.brandBorder}`, fontFamily: T.fSans, fontSize: 11, color: '#7c2d12' }}>
              <strong style={{ color: T.brand }}>Predicted reach: 17.1K</strong> · est. ₫ 280–410M revenue lift based on propensity-to-pay v7.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Game Analytics Deep-Dive ───────────────────────────────────
function GameAnalytics() {
  const [game, setGame] = React.useState('PTG');
  useLucide(game);
  const g = GAMES.find(x => x.short === game);

  const dauData = Array.from({ length: 30 }, (_, i) => ({
    day: `D${i + 1}`,
    dau:   Math.round(2000000 + Math.sin(i / 3) * 140000 + (Math.random() - 0.5) * 40000 + i * 4000),
    mau:   Math.round(6200000 + Math.sin(i / 5) * 200000 + (Math.random() - 0.5) * 60000),
  }));

  const revBySeg = SEGMENTS.filter(s => s.game === game).map((s, i) => ({
    seg: s.name.replace(`${game} `, '').slice(0, 16), rev: Math.round(80 + Math.random() * 420),
  }));

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Game analytics</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontFamily: T.fDisp, fontSize: 44, fontWeight: 400, lineHeight: 1, letterSpacing: '0.005em', textTransform: 'uppercase', color: T.n950, margin: 0 }}>{g.name}</h1>
            <Badge variant="brandSoft">{g.genre}</Badge>
            <span style={{ fontFamily: T.fSans, fontSize: 12, color: T.n500 }}>{g.players}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {GAMES.map(gg => (
            <div key={gg.short} onClick={() => setGame(gg.short)} style={{
              padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
              background: gg.short === game ? T.n950 : '#fff',
              color: gg.short === game ? '#fff' : T.n700,
              border: `1px solid ${gg.short === game ? T.n950 : T.n200}`,
              fontFamily: T.fSans, fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 9999, background: gg.color }} />
              {gg.short}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <Kpi label="DAU" value="2.42M" delta="+2.1%" deltaDir="up" icon="users" />
        <Kpi label="MAU" value="6.38M" delta="+0.8%" deltaDir="up" icon="users" />
        <Kpi label="D1 retention" value="54.2%" delta="+1.4%" deltaDir="up" icon="refresh-cw" />
        <Kpi label="ARPDAU" value="₫ 4,820" delta="+₫ 240" deltaDir="up" icon="dollar-sign" />
        <Kpi label="Crashes" value="0.08%" delta="-0.02%" deltaDir="up" icon="alert-triangle" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Card padding={18}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>DAU / MAU · 30 days</div>
              <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500 }}>Stickiness: 38% (DAU/MAU)</div>
            </div>
          </div>
          <RC2 width="100%" height={260}>
            <AC2 data={dauData} margin={{ top: 6, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="g-dau" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={g.color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={g.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CG2 strokeDasharray="3 3" stroke={T.n200} vertical={false} />
              <XA2 dataKey="day" tick={{ fill: T.n500, fontSize: 10 }} axisLine={{ stroke: T.n200 }} tickLine={false} interval={4} />
              <YA2 tick={{ fill: T.n500, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1e6).toFixed(1)}M`} />
              <TT2 contentStyle={{ background: '#fff', border: `1px solid ${T.n200}`, borderRadius: 8, fontSize: 12 }} />
              <Ar2 type="monotone" dataKey="mau" stroke={T.n400} strokeWidth={1.5} fill="transparent" name="MAU" strokeDasharray="4 3" />
              <Ar2 type="monotone" dataKey="dau" stroke={g.color} strokeWidth={2} fill="url(#g-dau)" name="DAU" />
            </AC2>
          </RC2>
        </Card>

        <Card padding={18}>
          <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900, marginBottom: 4 }}>Revenue by segment</div>
          <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500, marginBottom: 12 }}>Last 7 days, ₫M</div>
          <RC2 width="100%" height={230}>
            <BC2 data={revBySeg} layout="vertical" margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <CG2 strokeDasharray="3 3" stroke={T.n200} horizontal={false} />
              <XA2 type="number" tick={{ fill: T.n500, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YA2 type="category" dataKey="seg" tick={{ fill: T.n700, fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
              <TT2 contentStyle={{ background: '#fff', border: `1px solid ${T.n200}`, borderRadius: 8, fontSize: 12 }} />
              <Br2 dataKey="rev" fill={g.color} radius={[0, 4, 4, 0]} />
            </BC2>
          </RC2>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Card padding={18}>
          <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900, marginBottom: 4 }}>Live events · today</div>
          <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500, marginBottom: 12 }}>3 active, 2 ending soon</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'Spring Festival Bundle', ends: '4d 12h', rev: '₫ 412M', pct: 72 },
              { name: 'Double XP Weekend',      ends: '1d 3h',  rev: '₫ 88M',  pct: 94 },
              { name: 'Rank Reset Tournament',  ends: '8d 6h',  rev: '₫ 218M', pct: 34 },
            ].map((e, i) => (
              <div key={i} style={{ padding: 10, borderRadius: 8, background: T.n50 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: T.fSans, fontSize: 12, fontWeight: 600, color: T.n900 }}>{e.name}</span>
                  <span style={{ fontFamily: T.fMono, fontSize: 11, color: T.n600 }}>{e.rev}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.n500, marginBottom: 4 }}>
                  <span>Ends in {e.ends}</span>
                  <span>{e.pct}% complete</span>
                </div>
                <div style={{ height: 4, background: T.n200, borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${e.pct}%`, background: g.color, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding={18}>
          <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900, marginBottom: 4 }}>Top content</div>
          <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500, marginBottom: 12 }}>By play-time this week</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Social Square · Main', 'Pet Adventure Island', 'Fashion Show Arena', 'Cooking Studio', 'Cafe Hangout'].map((c, i) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <span style={{ fontFamily: T.fMono, fontSize: 11, color: T.n500, width: 18 }}>{i + 1}</span>
                <span style={{ flex: 1, fontFamily: T.fSans, fontSize: 12, color: T.n800 }}>{c}</span>
                <Sparkline data={[14, 18, 22, 19, 24, 28, 32 - i * 3, 30 - i * 2]} width={60} color={g.color} />
                <span style={{ fontFamily: T.fMono, fontSize: 11, color: T.n500, width: 36, textAlign: 'right' }}>{(32 - i * 4).toFixed(1)}h</span>
              </div>
            ))}
          </div>
        </Card>

        <Card padding={18}>
          <div style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900, marginBottom: 4 }}>Player distribution</div>
          <div style={{ fontFamily: T.fSans, fontSize: 11, color: T.n500, marginBottom: 12 }}>By country · top 6</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { c: 'Vietnam',     flag: '🇻🇳', pct: 54, n: '1.3M' },
              { c: 'Thailand',    flag: '🇹🇭', pct: 18, n: '432K' },
              { c: 'Indonesia',   flag: '🇮🇩', pct: 12, n: '288K' },
              { c: 'Philippines', flag: '🇵🇭', pct: 8,  n: '192K' },
              { c: 'Malaysia',    flag: '🇲🇾', pct: 5,  n: '120K' },
              { c: 'Singapore',   flag: '🇸🇬', pct: 3,  n: '72K'  },
            ].map(c => (
              <div key={c.c}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: T.n800 }}>{c.c}</span>
                  <span style={{ fontFamily: T.fMono, color: T.n500 }}>{c.n} · {c.pct}%</span>
                </div>
                <div style={{ height: 5, background: T.n100, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.pct * 1.7}%`, background: g.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { DataConnectors, RawExplorer, FeatureBuilder, PropensityModels, Campaigns, GameAnalytics });

export { DataConnectors, RawExplorer, FeatureBuilder, PropensityModels, Campaigns, GameAnalytics };
