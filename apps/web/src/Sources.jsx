import React from 'react';
import { T, Icon, useLucide, Button, Badge, Card, Input, Select, Tabs, Kpi, SectionHeader, Sparkline } from './theme.jsx';
import { BR_SOURCES } from './bedrockData.jsx';

/* global React, T, Icon, useLucide, Button, Badge, Card, Input, Select, Tabs, Kpi, SectionHeader, Sparkline, BR_SOURCES */

function SourceIcon({ type, size = 32 }) {
  const map = {
    s3_parquet: { bg: '#fef3c7', fg: '#b45309', letter: 'S3' },
    kafka:      { bg: '#f3e8ff', fg: '#7e22ce', letter: 'KF' },
    webhook:    { bg: '#dbeafe', fg: '#1e40af', letter: 'WH' },
    api:        { bg: '#e0e7ff', fg: '#4338ca', letter: 'API' },
  };
  const m = map[type] || { bg: T.n100, fg: T.n700, letter: '??' };
  return <div style={{ width: size, height: size, borderRadius: 8, background: m.bg, color: m.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fMono, fontSize: size * 0.32, fontWeight: 700 }}>{m.letter}</div>;
}

function Sources() {
  const [filter, setFilter] = React.useState('all');
  useLucide(filter);
  const list = BR_SOURCES.filter(s => filter === 'all' || s.kind === filter);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto', background: T.n50 }}>
      <SectionHeader eyebrow="Catalog · Sources"
        title="Data sources"
        description="Connectors managed by the Data Platform team. Daily log files land in S3; realtime events flow through Kafka. GS teams consume these via Mapping Studio."
        right={<>
          <Button variant="outline" size="sm" leftIcon="book-open">Connector docs</Button>
          <Button variant="primary" size="sm" leftIcon="plus">Request connector</Button>
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi label="Sources" value={BR_SOURCES.length} sub={`${BR_SOURCES.filter(s=>s.kind==='batch').length} batch · ${BR_SOURCES.filter(s=>s.kind==='realtime').length} realtime`} icon="database" />
        <Kpi label="Topics" value={BR_SOURCES.reduce((a,s) => a + s.topics.length, 0)} sub="across all sources" icon="layers" />
        <Kpi label="Peak throughput" value="224K/s" delta="+8%" deltaDir="up" sub="Kafka · combined" icon="zap" />
        <Kpi label="Degraded" value={BR_SOURCES.filter(s=>s.status!=='live').length} sub="needs attention" icon="alert-triangle" />
      </div>

      <Card padding={0}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>All sources</span>
          <Badge variant="secondary">{list.length}</Badge>
          <div style={{ flex: 1 }} />
          <Tabs value={filter} onChange={setFilter} tabs={[{ value: 'all', label: 'All' }, { value: 'batch', label: 'Batch · Daily files' }, { value: 'realtime', label: 'Realtime · Kafka/webhook' }]} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fSans, fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.n50 }}>
              {['Source', 'Kind', 'Game', 'Topics / tables', 'Cadence', 'Volume', 'Status', 'Last ingest', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: T.n600, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: `1px solid ${T.n200}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${T.n100}` }}
                  onMouseEnter={e => e.currentTarget.style.background = T.n50}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <SourceIcon type={s.type} />
                    <div>
                      <div style={{ fontWeight: 600, color: T.n900 }}>{s.name}</div>
                      <div style={{ fontFamily: T.fMono, fontSize: 10, color: T.n500, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320, whiteSpace: 'nowrap' }}>{s.path}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {s.kind === 'batch' && <Badge variant="secondary" leftIcon="calendar">Batch</Badge>}
                  {s.kind === 'realtime' && <Badge variant="brandSoft" leftIcon="zap">Realtime</Badge>}
                </td>
                <td style={{ padding: '12px 16px' }}><Badge variant="info">{s.game}</Badge></td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {s.topics.slice(0,3).map(t => <span key={t} style={{ fontFamily: T.fMono, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: T.n100, color: T.n700 }}>{t}</span>)}
                    {s.topics.length > 3 && <span style={{ fontFamily: T.fMono, fontSize: 10, color: T.n500 }}>+{s.topics.length - 3}</span>}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: T.n700 }}>{s.cadence}</td>
                <td style={{ padding: '12px 16px', fontFamily: T.fMono, color: T.n700 }}>{s.volume}</td>
                <td style={{ padding: '12px 16px' }}>
                  {s.status === 'live' && <Badge variant="live" dot>live</Badge>}
                  {s.status === 'degraded' && <Badge variant="warning" dot>degraded</Badge>}
                  {s.status === 'error' && <Badge variant="destructive" dot>error</Badge>}
                </td>
                <td style={{ padding: '12px 16px', color: T.n500 }}>{s.lastRun}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <Button variant="ghost" size="icon-sm"><Icon name="more-horizontal" size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card padding={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon name="calendar" size={14} color={T.n600} />
            <div style={{ fontSize: 13, fontWeight: 600, color: T.n900 }}>Batch pipeline flow</div>
          </div>
          <div style={{ fontSize: 12, color: T.n500, marginBottom: 14 }}>Daily game logs land in S3 (Parquet), partitioned by date. Kicked off every 00:30 ICT after game server dumps.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.fMono, fontSize: 11 }}>
            <div style={{ padding: '6px 10px', borderRadius: 6, background: T.n100, color: T.n700 }}>Game servers</div>
            <Icon name="arrow-right" size={12} color={T.n400} />
            <div style={{ padding: '6px 10px', borderRadius: 6, background: '#fef3c7', color: '#b45309' }}>S3 · parquet</div>
            <Icon name="arrow-right" size={12} color={T.n400} />
            <div style={{ padding: '6px 10px', borderRadius: 6, background: T.brandSoft, color: T.brand }}>Mapping Studio</div>
            <Icon name="arrow-right" size={12} color={T.n400} />
            <div style={{ padding: '6px 10px', borderRadius: 6, background: '#ecfdf5', color: T.green600 }}>master.*</div>
          </div>
        </Card>
        <Card padding={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon name="zap" size={14} color={T.brand} />
            <div style={{ fontSize: 13, fontWeight: 600, color: T.n900 }}>Realtime pipeline flow</div>
          </div>
          <div style={{ fontSize: 12, color: T.n500, marginBottom: 14 }}>Events stream through Kafka. Mapping Studio binds topics → standard schema with windowing, dedup, and late-arrival policy.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.fMono, fontSize: 11 }}>
            <div style={{ padding: '6px 10px', borderRadius: 6, background: T.n100, color: T.n700 }}>Game client/server</div>
            <Icon name="arrow-right" size={12} color={T.n400} />
            <div style={{ padding: '6px 10px', borderRadius: 6, background: '#f3e8ff', color: '#7e22ce' }}>Kafka · topics</div>
            <Icon name="arrow-right" size={12} color={T.n400} />
            <div style={{ padding: '6px 10px', borderRadius: 6, background: T.brandSoft, color: T.brand }}>Stream mapper</div>
            <Icon name="arrow-right" size={12} color={T.n400} />
            <div style={{ padding: '6px 10px', borderRadius: 6, background: '#ecfdf5', color: T.green600 }}>master.* (live)</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { Sources });

export { Sources };
