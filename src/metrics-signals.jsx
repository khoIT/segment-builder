import React from 'react';
import { T, Icon } from './theme.jsx';

// ═══════════════════════════════════════════════════════════════════════
// METRIC SIGNALS — small inline metadata chips shared across list rows,
// compare cards, and any other surface that wants the same density.
// Renders: status chip · realtime ⚡ · type chip (Custom / ML).
// Status chip becomes a button when `onClickStatus` is passed (used by
// the list row + detail breadcrumb to navigate to a status-filtered list).
// ═══════════════════════════════════════════════════════════════════════

const STATUS_META = {
  certified:    { color: T.green600, bg: T.greenSoft, label: 'Certified',    icon: 'shield-check' },
  experimental: { color: '#d97706',  bg: '#fef3c7',   label: 'Experimental', icon: 'flask-conical' },
  deprecated:   { color: T.n500,     bg: T.n100,      label: 'Deprecated',   icon: 'archive' },
};

function StatusChip({ status, onClick, withIcon = false }) {
  const s = STATUS_META[status] || STATUS_META.experimental;
  const clickable = !!onClick;
  return (
    <span
      onClick={clickable ? (e => { e.stopPropagation(); onClick(status); }) : undefined}
      title={clickable ? `Filter list to ${s.label}` : s.label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '1px 6px', borderRadius: 4,
        background: s.bg, color: s.color,
        fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
        cursor: clickable ? 'pointer' : 'default',
        userSelect: 'none',
      }}>
      {withIcon && <Icon name={s.icon} size={10} />}
      {s.label}
    </span>
  );
}

function MetricSignals({ m, onClickStatus, gap = 6, marginLeft = 8 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap, marginLeft, verticalAlign: 'middle' }}>
      <StatusChip status={m.status} onClick={onClickStatus} />
      {m.realtime && (
        <span title="Realtime-capable" style={{ display: 'inline-flex', color: T.brand }}>
          <Icon name="zap" size={11} />
        </span>
      )}
      {m.type === 'custom' && (
        <span style={{ padding: '1px 6px', borderRadius: 4, background: T.brandSoft, color: T.brand, fontSize: 10, fontWeight: 600 }}>
          Custom
        </span>
      )}
      {m.type === 'propensity' && (
        <span style={{ padding: '1px 6px', borderRadius: 4, background: T.n100, color: T.n700, fontSize: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <Icon name="sparkles" size={9} /> ML
        </span>
      )}
    </span>
  );
}

export { MetricSignals, StatusChip, STATUS_META };
