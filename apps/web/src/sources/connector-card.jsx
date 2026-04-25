import React from 'react';
import { T, Icon } from '../theme.jsx';

// ── Type metadata ─────────────────────────────────────────────────────
// Letter-chip appearance keyed by connector type.
const TYPE_META = {
  postgres:  { bg: '#dbeafe', fg: '#1e40af', letter: 'PG',  icon: 'database' },
  bigquery:  { bg: '#fef3c7', fg: '#b45309', letter: 'BQ',  icon: 'bar-chart-2' },
  s3:        { bg: '#d1fae5', fg: '#065f46', letter: 'S3',  icon: 'archive' },
  kafka:     { bg: '#f3e8ff', fg: '#7e22ce', letter: 'KF',  icon: 'zap' },
};

// ── Status dot ────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const COLOR = { ok: T.green600, fail: T.red500, unknown: T.n300 };
  const color = COLOR[status] ?? T.n300;
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: color, display: 'inline-block', flexShrink: 0,
    }} title={status} />
  );
}

// ── TypeChip ─────────────────────────────────────────────────────────
function TypeChip({ type }) {
  const m = TYPE_META[type] ?? { bg: T.n100, fg: T.n700, letter: '??' };
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
      background: m.bg, color: m.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.fMono, fontWeight: 700, fontSize: 11,
    }}>
      {m.letter}
    </div>
  );
}

// ── Connector row card ────────────────────────────────────────────────
// Props: connector (Connector shape), onClick
export function ConnectorCard({ connector, onClick }) {
  const lastSync = connector.lastSyncAt
    ? formatAgo(new Date(connector.lastSyncAt))
    : 'never';
  const datasetLabel = connector.datasetCount === 1
    ? '1 dataset'
    : `${connector.datasetCount} datasets`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px', cursor: 'pointer',
        borderBottom: `1px solid ${T.n100}`,
        transition: 'background .1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = T.n50; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <TypeChip type={connector.type} />

      {/* name + meta line */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: T.fSans, fontWeight: 600, fontSize: 14,
          color: T.n900, marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {connector.name}
        </div>
        <div style={{
          fontFamily: T.fSans, fontSize: 12, color: T.n500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {connector.env} · {datasetLabel} · {lastSync}
        </div>
      </div>

      {/* status + chevron */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <StatusDot status={connector.status} />
        <Icon name="chevron-right" size={16} color={T.n400} />
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────
function formatAgo(date) {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
