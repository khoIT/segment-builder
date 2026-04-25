import React from 'react';
import { T, Icon, useLucide, Button, Badge, Card, Input, Select, Switch, Tabs, Kpi, SectionHeader } from './theme.jsx';
import { BR_SOURCES, BR_RAW_LOGS, BR_STANDARD_LOGS, BR_MAPPINGS, BR_PLAYBOOKS } from './bedrockData.jsx';
import { useMasterTables, useBuildMasterTable } from './api/hooks.js';
import { BuildProgressRibbon } from './mapping-studio/build-progress-ribbon.jsx';

/* global React, T, Icon, useLucide, Button, Badge, Card, Input, Select, Switch, Tabs, Kpi, SectionHeader, BR_SOURCES, BR_RAW_LOGS, BR_STANDARD_LOGS, BR_MAPPINGS, BR_PLAYBOOKS */

// ═══════════════════════════════════════════════════════════════════════
// MAPPING STUDIO — the marquee Bedrock screen
// Three-pane: Raw sample (left) · Mapping rules (middle) · Standard preview (right)
// Batch / Realtime tabs change the middle pane's config controls.
// ═══════════════════════════════════════════════════════════════════════

function TypePill({ t }) {
  const colors = {
    timestamp: { bg: '#e0f2fe', fg: '#0369a1' },
    epoch_sec: { bg: '#e0f2fe', fg: '#0369a1' },
    string:    { bg: T.n100,    fg: T.n700 },
    enum:      { bg: '#ecfdf5', fg: '#047857' },
    bigint:    { bg: '#fef3c7', fg: '#b45309' },
    iso_cc:    { bg: '#fce7f3', fg: '#be185d' },
    semver:    { bg: T.n100,    fg: T.n700 },
  };
  const c = colors[t] || { bg: T.n100, fg: T.n700 };
  return <span style={{ fontFamily: T.fMono, fontSize: 10, padding: '1px 6px', borderRadius: 4, background: c.bg, color: c.fg, fontWeight: 500 }}>{t}</span>;
}

function ConfidenceBar({ pct }) {
  const color = pct >= 95 ? T.green600 : pct >= 80 ? T.amber500 : T.red600;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: T.n200, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <span style={{ fontFamily: T.fMono, fontSize: 10, color: T.n600, fontWeight: 500 }}>{pct}%</span>
    </div>
  );
}

function MappingStudio({ setPage }) {
  const [topic, setTopic] = React.useState('moneyflow_ptg');
  const [mode, setMode] = React.useState('batch'); // batch | realtime
  const [playbook, setPlaybook] = React.useState('moneyflow');
  const [showPlaybooks, setShowPlaybooks] = React.useState(false);
  // Active build state — shown as ribbon under the header.
  const [activeBuild, setActiveBuild] = React.useState(null);
  useLucide(topic + mode);

  // Resolve master_table for the topic's game (suffix _ptg/_cfm/_tfb).
  const gameSuffix = topic.includes('_ptg') ? 'ptg' : topic.includes('_cfm') ? 'cfm' : topic.includes('_tfb') ? 'tfb' : 'cfm';
  const mtListQ = useMasterTables();
  const mtForGame = (mtListQ.data?.items ?? []).find(
    (mt) => (mt.gameId ?? '').toLowerCase() === gameSuffix,
  );
  const buildMut = useBuildMasterTable();

  function saveAndBuild() {
    if (!mtForGame || activeBuild || buildMut.isPending) return;
    buildMut.mutate(mtForGame.id, {
      onSuccess: (data) => {
        setActiveBuild({ jobId: data.jobId, masterTableId: mtForGame.id, name: mtForGame.name });
      },
      onError: (err) => {
        // eslint-disable-next-line no-console
        console.error('[saveAndBuild] failed', err);
      },
    });
  }

  const raw = BR_RAW_LOGS[topic];
  const std = BR_STANDARD_LOGS[topic];
  const mapping = BR_MAPPINGS[topic];

  const topicOptions = Object.keys(BR_RAW_LOGS).map(k => ({ value: k, label: k }));

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', background: T.n50, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Catalog · Mapping Studio</div>
          <h1 style={{ fontFamily: T.fDisp, fontSize: 36, fontWeight: 400, lineHeight: 0.98, letterSpacing: '0.005em', textTransform: 'uppercase', color: T.n950, margin: 0 }}>Map raw logs → Standard schema</h1>
          <div style={{ fontSize: 13, color: T.n500, marginTop: 6 }}>
            Drag raw fields into standard schema slots, or start from a playbook. Bedrock generates the ETL job; output lands in <code style={{ fontFamily: T.fMono, fontSize: 12, color: T.n700, background: T.n100, padding: '1px 5px', borderRadius: 4 }}>master.*</code>.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" size="sm" leftIcon="git-branch">v4 · draft</Button>
          <Button variant="outline" size="sm" leftIcon="play">Dry-run</Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={activeBuild ? 'loader-2' : 'play'}
            disabled={!mtForGame || activeBuild != null || buildMut.isPending}
            onClick={saveAndBuild}
          >
            {activeBuild ? 'Building…' : 'Save & Build'}
          </Button>
        </div>
      </div>

      {activeBuild && (
        <BuildProgressRibbon
          masterTableId={activeBuild.masterTableId}
          jobId={activeBuild.jobId}
          masterTableName={activeBuild.name}
          onSettled={(status) => {
            // Keep ribbon visible briefly on completion so users see it.
            if (status === 'failed') setTimeout(() => setActiveBuild(null), 8000);
          }}
          onViewCatalog={() => {
            setActiveBuild(null);
            setPage?.('datacatalog');
          }}
        />
      )}

      {/* Sub-toolbar: topic + mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fff', borderRadius: 10, border: `1px solid ${T.n200}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="database" size={14} color={T.n500} />
          <span style={{ fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Source topic</span>
          <Select size="sm" value={topic} onChange={setTopic} options={topicOptions} style={{ minWidth: 220 }} />
        </div>
        <div style={{ width: 1, height: 24, background: T.n200 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="target" size={14} color={T.n500} />
          <span style={{ fontSize: 11, fontWeight: 600, color: T.n500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Playbook</span>
          <div style={{ position: 'relative' }}>
            <div onClick={() => setShowPlaybooks(s => !s)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6,
              background: T.brandSoft, color: T.brand, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${T.brandBorder}`,
            }}>
              <Icon name={BR_PLAYBOOKS.find(p => p.id === playbook)?.icon || 'target'} size={13} />
              {BR_PLAYBOOKS.find(p => p.id === playbook)?.label || 'Custom'}
              <Icon name="chevron-down" size={11} />
            </div>
            {showPlaybooks && (
              <>
                <div onClick={() => setShowPlaybooks(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 51, background: '#fff', border: `1px solid ${T.n200}`, borderRadius: 10, padding: 6, minWidth: 300, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)' }}>
                  <div style={{ padding: '6px 10px 8px', fontSize: 10, color: T.n500, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: `1px solid ${T.n200}`, marginBottom: 4 }}>
                    Pre-built semantic mappings
                  </div>
                  {BR_PLAYBOOKS.map(p => (
                    <div key={p.id} onClick={() => { setPlaybook(p.id); setShowPlaybooks(false); }} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                      background: p.id === playbook ? T.brandSoft : 'transparent',
                    }} onMouseEnter={e => { if (p.id !== playbook) e.currentTarget.style.background = T.n50; }}
                       onMouseLeave={e => { if (p.id !== playbook) e.currentTarget.style.background = 'transparent'; }}>
                      <Icon name={p.icon} size={14} color={p.id === playbook ? T.brand : T.n500} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.n900 }}>{p.label}</div>
                        <div style={{ fontFamily: T.fMono, fontSize: 10, color: T.n500 }}>{p.schema} · {p.fields} fields</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Tabs value={mode} onChange={setMode} tabs={[
          { value: 'batch',    label: <><Icon name="calendar" size={12} style={{ marginRight: 6 }} />Batch</> },
          { value: 'realtime', label: <><Icon name="zap" size={12} style={{ marginRight: 6 }} />Realtime</> },
        ]} />
      </div>

      {/* Three-pane layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 12, flex: 1, minHeight: 0 }}>
        {/* PANE 1 — RAW */}
        <Card padding={0} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: '#fef3c7', color: '#b45309', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fMono }}>RW</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.n900 }}>Raw sample</span>
            <Badge variant="secondary">{raw.columns.length} cols</Badge>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: T.fMono, fontSize: 10, color: T.n500 }}>{topic}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fMono, fontSize: 10.5 }}>
              <thead style={{ position: 'sticky', top: 0, background: T.n50, zIndex: 1 }}>
                <tr>
                  {raw.columns.map(c => (
                    <th key={c} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${T.n200}`, color: T.n700, fontSize: 10, fontWeight: 600, letterSpacing: '0.03em' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {raw.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.n100}` }}>
                    {row.map((v, j) => (
                      <td key={j} style={{ padding: '6px 10px', color: T.n700, whiteSpace: 'nowrap' }}>{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '8px 14px', borderTop: `1px solid ${T.n200}`, background: T.n50, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: T.n500, fontFamily: T.fMono }}>
            <Icon name="folder" size={11} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {mode === 'batch' ? 's3://vng-logs/ptg/dt=2026-04-22/part-*.parquet' : 'kafka://vng-kafka-prod:9092/ptg.purchase'}
            </span>
          </div>
        </Card>

        {/* PANE 2 — MAPPING RULES */}
        <Card padding={0} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${T.brandBorder}` }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 8, background: T.brandSoft }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: T.brand, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fMono }}>MP</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.n900 }}>Field mapping</span>
            <Badge variant="brandSoft">{mapping.length} rules</Badge>
            <div style={{ flex: 1 }} />
            <Button variant="ghost" size="icon-sm"><Icon name="plus" size={12} /></Button>
            <Button variant="ghost" size="icon-sm"><Icon name="wand-2" size={12} /></Button>
          </div>

          {/* Realtime-only config strip */}
          {mode === 'realtime' && (
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.n200}`, background: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 10, color: T.n500, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Streaming config</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: T.n600, marginBottom: 3 }}>Window</div>
                  <Select size="sm" value="tumbling_1m" onChange={() => {}} options={[
                    { value: 'tumbling_1m',  label: 'Tumbling · 1 min' },
                    { value: 'tumbling_5m',  label: 'Tumbling · 5 min' },
                    { value: 'sliding_1m_5m',label: 'Sliding · 1m over 5m' },
                    { value: 'session_30m',  label: 'Session · 30m gap' },
                  ]} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.n600, marginBottom: 3 }}>Late-arrival</div>
                  <Select size="sm" value="30s" onChange={() => {}} options={[
                    { value: '0',   label: 'Drop' },
                    { value: '30s', label: 'Allow 30s' },
                    { value: '2m',  label: 'Allow 2m' },
                    { value: '10m', label: 'Allow 10m' },
                  ]} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.n600, marginBottom: 3 }}>Dedup key</div>
                  <Input size="sm" value="user_id + transaction_ref" onChange={() => {}} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.n600, marginBottom: 3 }}>Watermark</div>
                  <Input size="sm" value="event_time − 10s" onChange={() => {}} />
                </div>
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {mapping.map((m, i) => (
                <div key={i} style={{
                  padding: '10px 12px', borderRadius: 8, background: '#fff',
                  border: `1px solid ${m.warning ? T.amber500 : T.n200}`,
                  display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center',
                }}>
                  {/* Raw side */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontFamily: T.fMono, fontSize: 11, fontWeight: 600, color: T.n900 }}>{m.raw}</span>
                      <TypePill t={m.rawType} />
                    </div>
                    <div style={{ fontFamily: T.fMono, fontSize: 9.5, color: T.n500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.transform}</div>
                  </div>
                  {/* Arrow */}
                  <Icon name="arrow-right" size={12} color={T.n400} />
                  {/* Std side */}
                  <div style={{ minWidth: 0, textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 2 }}>
                      <TypePill t={m.stdType} />
                      <span style={{ fontFamily: T.fMono, fontSize: 11, fontWeight: 600, color: T.n900 }}>{m.std}</span>
                      {m.required && <span title="Required" style={{ color: T.red600, fontSize: 10 }}>●</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      {m.warning && (
                        <span style={{ fontSize: 9.5, color: T.amber500, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Icon name="alert-triangle" size={10} /> {m.warning}
                        </span>
                      )}
                      <ConfidenceBar pct={m.confidence} />
                    </div>
                  </div>
                </div>
              ))}
              <div style={{
                padding: '10px 12px', borderRadius: 8, border: `1px dashed ${T.n300}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                color: T.n500, fontSize: 12, cursor: 'pointer',
              }}>
                <Icon name="plus" size={12} /> Add a mapping rule
              </div>
            </div>
          </div>
        </Card>

        {/* PANE 3 — STANDARD OUTPUT */}
        <Card padding={0} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: '#ecfdf5', color: T.green600, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fMono }}>ST</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.n900 }}>Standard preview</span>
            <Badge variant="success">{std.columns.length} cols</Badge>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: T.fMono, fontSize: 10, color: T.green600 }}>master.{playbook === 'moneyflow' ? 'currency' : playbook === 'recharge' ? 'purchase' : 'session'}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fMono, fontSize: 10.5 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#ecfdf5', zIndex: 1 }}>
                <tr>
                  {std.columns.map(c => (
                    <th key={c} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${T.n200}`, color: '#047857', fontSize: 10, fontWeight: 600, letterSpacing: '0.03em' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {std.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.n100}` }}>
                    {row.map((v, j) => (
                      <td key={j} style={{ padding: '6px 10px', color: T.n700, whiteSpace: 'nowrap' }}>{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '8px 14px', borderTop: `1px solid ${T.n200}`, background: T.n50, display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: T.n500 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="check-circle-2" size={11} color={T.green600} />
              <span>Schema match 100%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="clock" size={11} color={T.n500} />
              <span>Est. latency {mode === 'realtime' ? '1.8s p50' : '3m after batch'}</span>
            </div>
            <div style={{ flex: 1 }} />
            <Button variant="ghost" size="icon-sm"><Icon name="download" size={11} /></Button>
          </div>
        </Card>
      </div>

      {/* Bottom strip: lineage breadcrumb */}
      <div style={{ padding: '10px 14px', background: '#fff', borderRadius: 10, border: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <Icon name="git-branch" size={13} color={T.n500} />
        <span style={{ fontSize: 11, color: T.n500, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Lineage</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: T.fMono, fontSize: 11 }}>
          <span style={{ padding: '3px 7px', borderRadius: 4, background: '#fef3c7', color: '#b45309' }}>
            {BR_SOURCES.find(s => s.topics.some(t => topic.startsWith(t.replace(/_/g,''))) || s.kind === mode)?.name || 'ptg-events-kafka'}
          </span>
          <Icon name="chevron-right" size={10} color={T.n400} />
          <span style={{ padding: '3px 7px', borderRadius: 4, background: T.n100, color: T.n700 }}>raw.{topic}</span>
          <Icon name="chevron-right" size={10} color={T.n400} />
          <span style={{ padding: '3px 7px', borderRadius: 4, background: T.brandSoft, color: T.brand }}>mapping v4</span>
          <Icon name="chevron-right" size={10} color={T.n400} />
          <span style={{ padding: '3px 7px', borderRadius: 4, background: '#ecfdf5', color: T.green600 }}>master.currency</span>
          <Icon name="chevron-right" size={10} color={T.n400} />
          <span style={{ padding: '3px 7px', borderRadius: 4, background: '#faf5ff', color: T.purple500 }}>5 metrics · 12 segments</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MappingStudio });

export { MappingStudio };
