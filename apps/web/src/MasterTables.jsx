import React from 'react';
import { T, Icon, useLucide, Button, Badge, Card, Tabs, Kpi, SectionHeader } from './theme.jsx';
import {
  useMasterTables, useMasterTablePreview, useBuildMasterTable, useBuildJobStatus,
} from './api/hooks.js';

/* global React, T, Icon, useLucide, Button, Badge, Card, Tabs, Kpi, SectionHeader */

// ═══════════════════════════════════════════════════════════════════════
// MASTER TABLES — live shape: name | game | template | status | rowCount |
// lastBuild + [Build] button + preview drawer.
//
// Triggers POST /master-tables/:id/build → polls /:id/build/:jobId every
// 1.5s via useBuildJobStatus until status leaves running/pending. Click a
// row to open the preview drawer (first 50 rows from the per-template
// physical Postgres table). Mock fallback shows the same UI minus the
// Build button (no orchestrator without a backend).
// ═══════════════════════════════════════════════════════════════════════

const STATUS_META = {
  never_built: { variant: 'secondary', label: 'never built' },
  building:    { variant: 'warning',   label: 'building' },
  completed:   { variant: 'live',      label: 'completed', dot: true },
  failed:      { variant: 'destructive',label: 'failed',    dot: true },
};

function fmtCount(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtTime(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return d.toISOString().slice(0, 10);
}

function MasterTables() {
  const [game, setGame] = React.useState('all');
  const [drawerId, setDrawerId] = React.useState(null);
  // Active build jobs, keyed by master_table id.
  const [jobs, setJobs] = React.useState({});
  useLucide(drawerId);

  const listQ = useMasterTables();
  const buildMut = useBuildMasterTable();

  const all = listQ.data?.items ?? [];
  const filtered = all.filter(t => game === 'all' || (t.game ?? t.gameId)?.toLowerCase() === game.toLowerCase());

  const total = all.length;
  const built = all.filter(t => t.status === 'completed').length;
  const totalRows = all.reduce((acc, t) => acc + (t.rowCount ?? 0), 0);
  const failed = all.filter(t => t.status === 'failed').length;

  function startBuild(id) {
    buildMut.mutate(id, {
      onSuccess: (data) => {
        setJobs(prev => ({ ...prev, [id]: data.jobId }));
      },
      onError: (err) => {
        // eslint-disable-next-line no-console
        console.error('[build] failed to start', err);
      },
    });
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto', background: T.n50 }}>
      <SectionHeader eyebrow="Catalog · Master Tables"
        title="Master tables"
        description="Per-template wide tables built from raw Trino data via a saved Mapping. Click Build to materialise rows into Postgres; click a row to preview them."
        right={<>
          <Button variant="outline" size="sm" leftIcon="refresh-cw" onClick={() => listQ.refetch()}>Refresh</Button>
          <Button variant="outline" size="sm" leftIcon="git-compare">Compare</Button>
        </>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi label="Master tables" value={total} sub={`${built} built · ${total - built} pending`} icon="table-2" />
        <Kpi label="Total rows" value={fmtCount(totalRows)} sub="across all built tables" icon="rows" />
        <Kpi label="Failed builds" value={failed} sub={failed === 0 ? 'all green' : 'needs attention'} icon="alert-triangle" />
        <Kpi label="Templates" value={new Set(all.map(t => t.templateId)).size} sub="distinct shapes" icon="layers" />
      </div>

      <Card padding={0}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900 }}>All master tables</span>
          <Badge variant="secondary">{filtered.length}</Badge>
          <div style={{ flex: 1 }} />
          <Tabs value={game} onChange={setGame} tabs={[
            { value: 'all', label: 'All games' },
            { value: 'ptg', label: 'PTG' },
            { value: 'cfm', label: 'CFM' },
            { value: 'tfb', label: 'TFB' },
          ]} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fSans, fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.n50 }}>
              {['Name', 'Game', 'Template', 'Status', 'Rows', 'Last build', 'Build', 'Preview'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: T.n600, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: `1px solid ${T.n200}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const meta = STATUS_META[t.status] ?? STATUS_META.never_built;
              const activeJob = jobs[t.id];
              return (
                <MasterTableRow key={t.id ?? t.name}
                  row={t} meta={meta} activeJob={activeJob}
                  onBuild={() => startBuild(t.id)}
                  onPreview={() => setDrawerId(t.id)}
                  buildPending={buildMut.isPending}
                />
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: T.n500 }}>
                {listQ.isLoading ? 'Loading…' : 'No master tables yet. Save a mapping in Mapping Studio first.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {drawerId && <PreviewDrawer id={drawerId} onClose={() => setDrawerId(null)} />}
    </div>
  );
}

function MasterTableRow({ row, meta, activeJob, onBuild, onPreview, buildPending }) {
  // Subscribe to job status only when there's an active jobId.
  const jobQ = useBuildJobStatus(row.id, activeJob);
  const job = jobQ.data;
  const live = job && (job.status === 'running' || job.status === 'pending');

  return (
    <tr style={{ borderBottom: `1px solid ${T.n100}` }}
        onMouseEnter={e => e.currentTarget.style.background = T.n50}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="table-2" size={14} color={T.n500} />
          <span style={{ fontFamily: T.fMono, fontSize: 12, fontWeight: 600, color: T.n900 }}>{row.name}</span>
        </div>
      </td>
      <td style={{ padding: '12px 16px' }}><Badge variant="info">{(row.game ?? row.gameId ?? '').toUpperCase() || '—'}</Badge></td>
      <td style={{ padding: '12px 16px', fontFamily: T.fMono, color: T.n600, fontSize: 11 }}>{row.templateId ?? '—'}</td>
      <td style={{ padding: '12px 16px' }}>
        <Badge variant={meta.variant} dot={meta.dot}>{live ? 'building' : meta.label}</Badge>
      </td>
      <td style={{ padding: '12px 16px', fontFamily: T.fMono, color: T.n700 }}>
        {live
          ? <span style={{ color: T.brand }}>{fmtCount(job.processedRows)}…</span>
          : fmtCount(row.rowCount)}
      </td>
      <td style={{ padding: '12px 16px', color: T.n500 }}>{fmtTime(row.lastBuildAt)}</td>
      <td style={{ padding: '12px 16px' }}>
        <Button
          variant={live ? 'ghost' : 'outline'}
          size="sm"
          leftIcon={live ? 'loader-2' : 'play'}
          disabled={live || buildPending}
          onClick={onBuild}
        >
          {live ? 'building' : 'Build'}
        </Button>
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <Button variant="ghost" size="sm" leftIcon="eye" disabled={!row.rowCount} onClick={onPreview}>
          Preview
        </Button>
      </td>
    </tr>
  );
}

function PreviewDrawer({ id, onClose }) {
  const previewQ = useMasterTablePreview(id, 50);
  const cols = previewQ.data?.columns ?? [];
  const rows = previewQ.data?.rows ?? [];

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
      display: 'flex', justifyContent: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(900px, 90vw)', height: '100%', background: T.n0,
        boxShadow: '-8px 0 24px rgba(0,0,0,0.15)', overflow: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="table-2" size={16} color={T.brand} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.n900 }}>Master table preview</div>
            <div style={{ fontSize: 11, fontFamily: T.fMono, color: T.n500 }}>
              {cols.length} columns · {rows.length} rows shown · sampled from per-template Postgres
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}><Icon name="x" size={14} /></Button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {previewQ.isLoading && <div style={{ padding: 32, color: T.n500 }}>Loading preview…</div>}
          {previewQ.error && <div style={{ padding: 32, color: T.red600 }}>{String(previewQ.error.message)}</div>}
          {!previewQ.isLoading && rows.length === 0 && (
            <div style={{ padding: 32, color: T.n500, fontSize: 13 }}>
              No rows yet. Trigger a build first.
            </div>
          )}
          {rows.length > 0 && (
            <table style={{ borderCollapse: 'collapse', fontFamily: T.fMono, fontSize: 11, minWidth: '100%' }}>
              <thead>
                <tr style={{ background: T.n50 }}>
                  {cols.map(c => (
                    <th key={c} style={{ position: 'sticky', top: 0, background: T.n50, padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: T.n600, borderBottom: `1px solid ${T.n200}`, whiteSpace: 'nowrap' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.n100}` }}>
                    {r.map((cell, j) => (
                      <td key={j} style={{ padding: '6px 12px', color: T.n700, whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cell == null ? <span style={{ color: T.n400, fontStyle: 'italic' }}>null</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MasterTables });

export { MasterTables };
