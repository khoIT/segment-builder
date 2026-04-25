import React from 'react';
import { T, Icon, useLucide, Button, Badge, Card, Input, Select, Tabs, Kpi, SectionHeader } from './theme.jsx';
import { TABLES } from './data.jsx';
import { BR_MASTER_TABLES, BR_RAW_LOGS, BR_STANDARD_LOGS } from './bedrockData.jsx';

/* global React, T, Icon, useLucide, Button, Badge, Card, Input, Select, Tabs, Kpi, SectionHeader, BR_MASTER_TABLES, BR_RAW_LOGS, BR_STANDARD_LOGS */

// ═══════════════════════════════════════════════════════════════════════
// MASTER TABLES — the standardized per-game output of mapping
// With a raw ↔ standard toggle to show what's underneath any master table
// ═══════════════════════════════════════════════════════════════════════

function MasterTables() {
  const [game, setGame] = React.useState('all');
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [viewMode, setViewMode] = React.useState('standard'); // standard | raw
  useLucide(selectedIdx + viewMode);

  const filtered = BR_MASTER_TABLES.filter(t => game === 'all' || t.game === game);
  const selected = filtered[selectedIdx] || filtered[0];

  // Map the selected master table to a sample key in BR_RAW_LOGS
  const sampleKey = (() => {
    if (!selected) return 'moneyflow_ptg';
    if (selected.name.includes('purchase')) return 'recharge_ptg';
    if (selected.name.includes('currency')) return 'moneyflow_ptg';
    return 'login_logout_ptg';
  })();

  const rawSample = BR_RAW_LOGS[sampleKey];
  const stdSample = BR_STANDARD_LOGS[sampleKey];
  const sampleToShow = viewMode === 'raw' ? rawSample : stdSample;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto', background: T.n50 }}>
      <SectionHeader eyebrow="Catalog · Master Tables"
        title="Standardized tables"
        description="The canonical, game-agnostic schema every downstream consumer reads from. Each master table is produced by one or more mappings; structure is stable across versions."
        right={<>
          <Button variant="outline" size="sm" leftIcon="download">Export DDL</Button>
          <Button variant="outline" size="sm" leftIcon="git-compare">Compare versions</Button>
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi label="Master tables" value={BR_MASTER_TABLES.length} sub="across 3 games" icon="table-2" />
        <Kpi label="Avg coverage" value="98.4%" sub="non-null required fields" icon="check-circle-2" />
        <Kpi label="SLA met" value={`${BR_MASTER_TABLES.filter(t => t.slaMet).length}/${BR_MASTER_TABLES.length}`} sub="last 24h" icon="timer" />
        <Kpi label="Live streaming" value={BR_MASTER_TABLES.filter(t => t.streams.includes('realtime')).length} sub="dual-path tables" icon="zap" />
      </div>

      {/* Table list */}
      <Card padding={0}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>All master tables</span>
          <Badge variant="secondary">{filtered.length}</Badge>
          <div style={{ flex: 1 }} />
          <Tabs value={game} onChange={g => { setGame(g); setSelectedIdx(0); }} tabs={[
            { value: 'all', label: 'All games' },
            { value: 'PTG', label: 'PTG' },
            { value: 'CFM', label: 'CFM' },
            { value: 'TFB', label: 'TFB' },
          ]} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fSans, fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.n50 }}>
              {['Table', 'Game', 'Rows', 'Cols', 'Coverage', 'Streams', 'SLA', 'Last build', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: T.n600, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: `1px solid ${T.n200}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => {
              const active = i === selectedIdx;
              return (
                <tr key={i} onClick={() => setSelectedIdx(i)} style={{
                  borderBottom: `1px solid ${T.n100}`, cursor: 'pointer',
                  background: active ? T.brandSoft : 'transparent',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.n50; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon name="table-2" size={14} color={active ? T.brand : T.n500} />
                      <span style={{ fontFamily: T.fMono, fontSize: 12, fontWeight: 600, color: active ? T.brand : T.n900 }}>{t.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><Badge variant="info">{t.game}</Badge></td>
                  <td style={{ padding: '12px 16px', fontFamily: T.fMono, color: T.n700 }}>{t.rows}</td>
                  <td style={{ padding: '12px 16px', fontFamily: T.fMono, color: T.n700 }}>{t.cols}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 44, height: 4, background: T.n200, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${t.coverage}%`, height: '100%', background: t.coverage >= 98 ? T.green600 : t.coverage >= 95 ? T.amber500 : T.red600 }} />
                      </div>
                      <span style={{ fontFamily: T.fMono, fontSize: 11, color: T.n700 }}>{t.coverage}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {t.streams.includes('batch') && <Badge variant="secondary" leftIcon="calendar">B</Badge>}
                      {t.streams.includes('realtime') && <Badge variant="brandSoft" leftIcon="zap">RT</Badge>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge variant={t.slaMet ? 'success' : 'destructive'} dot>{t.sla}</Badge>
                  </td>
                  <td style={{ padding: '12px 16px', color: T.n500 }}>{t.lastBuild}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Icon name="chevron-right" size={13} color={active ? T.brand : T.n400} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Detail view — raw ↔ standard toggle */}
      <Card padding={0}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="layers" size={14} color={T.brand} />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.n900, fontFamily: T.fMono }}>{selected?.name}</span>
          <Badge variant="info">{selected?.game}</Badge>
          <Badge variant="secondary">{selected?.cols} fields</Badge>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 11, color: T.n500, marginRight: 6 }}>View as:</div>
          <div style={{ display: 'inline-flex', background: T.n100, borderRadius: 8, padding: 3 }}>
            {[
              { v: 'raw',      l: 'Raw logs',        desc: 'Source fields', color: '#b45309', bg: '#fef3c7' },
              { v: 'standard', l: 'Standard schema', desc: 'Mapped output', color: T.green600, bg: '#ecfdf5' },
            ].map(o => {
              const a = viewMode === o.v;
              return (
                <div key={o.v} onClick={() => setViewMode(o.v)} style={{
                  padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: a ? '#fff' : 'transparent', color: a ? o.color : T.n600,
                  boxShadow: a ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>{o.l}</div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '8px 18px', borderBottom: `1px solid ${T.n200}`, background: viewMode === 'raw' ? '#fffbeb' : '#f0fdf4', fontSize: 11, color: viewMode === 'raw' ? '#b45309' : '#047857', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name={viewMode === 'raw' ? 'file-text' : 'check-circle-2'} size={11} />
          {viewMode === 'raw'
            ? <>Showing <strong>raw source logs</strong> — unmapped, with opaque column names and encoded values. This is what game servers emit.</>
            : <>Showing <strong>standardized output</strong> — canonical schema used by segments, models, and analytics.</>}
        </div>

        <div style={{ overflow: 'auto', maxHeight: 360 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fMono, fontSize: 11 }}>
            <thead style={{ position: 'sticky', top: 0, background: viewMode === 'raw' ? '#fef3c7' : '#ecfdf5', zIndex: 1 }}>
              <tr>
                {sampleToShow.columns.map(c => (
                  <th key={c} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: `1px solid ${T.n200}`, color: viewMode === 'raw' ? '#b45309' : '#047857', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.03em' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleToShow.rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.n100}` }}>
                  {row.map((v, j) => (
                    <td key={j} style={{ padding: '8px 14px', color: T.n700, whiteSpace: 'nowrap' }}>{String(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.n200}`, background: T.n50, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 11, color: T.n500 }}>{sampleToShow.rows.length} sample rows shown</div>
          <div style={{ flex: 1 }} />
          <Button variant="ghost" size="sm" leftIcon="code-2">Open in query editor</Button>
          <Button variant="outline" size="sm" leftIcon="git-branch">View mapping</Button>
          <Button variant="outline" size="sm" leftIcon="network">View lineage</Button>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { MasterTables });

export { MasterTables };
