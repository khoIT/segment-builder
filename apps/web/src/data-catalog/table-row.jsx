import React from 'react';
import { T, Icon, Card, Badge } from '../theme.jsx';
import { useDataCatalogTable } from '../api/hooks.js';
import { ColumnPill } from './column-pill.jsx';
import { SampleRows } from './sample-rows.jsx';
import { LineageChips } from './lineage-chips.jsx';

// Collapsed: chevron · name · game · category · row count · col count.
// Expanded: column pill row · 10-row sample · lineage chips.

function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
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

export function TableRow({ table, expanded, onToggle, jumpToColumn, onJumpHandled, setPage }) {
  return (
    <Card padding={0}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 18px', cursor: 'pointer',
          background: 'transparent', border: 'none', textAlign: 'left',
          fontFamily: T.fSans,
        }}
      >
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={16} color={T.n500} />
        <Icon name="table-2" size={16} color={T.brand} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: T.fMono, fontSize: 13, fontWeight: 600, color: T.n900 }}>{table.name}</span>
            {table.game && <Badge variant="info">{table.game}</Badge>}
            <Badge variant="secondary">{table.category}</Badge>
          </div>
          <div style={{ fontSize: 11, color: T.n500, marginTop: 4 }}>
            partitions: {(table.partitionKeys ?? []).join(', ') || '—'} · refreshed {fmtTime(table.lastRefreshAt)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontFamily: T.fDisp, fontSize: 22, lineHeight: 1, color: T.n900 }}>{fmtNum(table.rowCount)}</span>
          <span style={{ fontSize: 10, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>rows</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 56 }}>
          <span style={{ fontFamily: T.fDisp, fontSize: 22, lineHeight: 1, color: T.n900 }}>{table.columnCount}</span>
          <span style={{ fontSize: 10, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>cols</span>
        </div>
      </button>
      {expanded && (
        <ExpandPanel
          tableId={table.id}
          jumpToColumn={jumpToColumn}
          onJumpHandled={onJumpHandled}
          setPage={setPage}
        />
      )}
    </Card>
  );
}

function ExpandPanel({ tableId, jumpToColumn, onJumpHandled, setPage }) {
  const detailQ = useDataCatalogTable(tableId);
  const detail = detailQ.data;

  if (detailQ.isLoading) {
    return <div style={{ padding: 20, color: T.n500 }}>Loading details…</div>;
  }
  if (!detail) {
    return <div style={{ padding: 20, color: T.red600 }}>Failed to load: {String(detailQ.error?.message ?? 'unknown error')}</div>;
  }

  return (
    <div style={{ borderTop: `1px solid ${T.n100}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Description */}
      {detail.description && (
        <div style={{ fontSize: 12, color: T.n600, lineHeight: 1.5 }}>{detail.description}</div>
      )}
      {/* Column pills */}
      <div>
        <div style={{ fontSize: 11, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Columns ({detail.columns.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {detail.columns.map((c) => (
            <ColumnPill
              key={c.name}
              col={c}
              tableId={detail.id}
              sourceRef={detail.sourceRef}
              flash={jumpToColumn === c.name}
              onFlashed={onJumpHandled}
            />
          ))}
        </div>
      </div>
      {/* Sample */}
      <SampleRows sample={detail.sample} />
      {/* Lineage */}
      <LineageChips tableId={detail.id} setPage={setPage} />
    </div>
  );
}
