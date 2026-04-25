import React from 'react';
import { T } from '../theme.jsx';
import { ColumnProfilePopover } from './column-profile-popover.jsx';

const TYPE_COLORS = {
  string:    { bg: '#dbeafe', fg: '#1e40af' },
  int:       { bg: '#dcfce7', fg: '#166534' },
  bigint:    { bg: '#dcfce7', fg: '#166534' },
  double:    { bg: '#fef3c7', fg: '#92400e' },
  date:      { bg: '#ede9fe', fg: '#6d28d9' },
  timestamp: { bg: '#ede9fe', fg: '#6d28d9' },
  boolean:   { bg: '#fce7f3', fg: '#9d174d' },
  json:      { bg: '#e2e8f0', fg: '#475569' },
};

export function ColumnPill({ col, tableId, sourceRef, flash, onFlashed }) {
  const ref = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [flashing, setFlashing] = React.useState(false);
  const tc = TYPE_COLORS[col.type] ?? TYPE_COLORS.json;

  // Cross-tab jump highlight: scroll into view + flash 200ms.
  React.useLayoutEffect(() => {
    if (flash && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setFlashing(true);
      const t = setTimeout(() => { setFlashing(false); onFlashed?.(); }, 1200);
      return () => clearTimeout(t);
    }
  }, [flash, onFlashed]);

  // Resolve profile target. Catalog tables → bedrock/public/catalog_<id>;
  // Trino-derived tables also profile against the local catalog_<id>
  // (the materialised copy), not Trino — fast + cached.
  const profileTarget = {
    catalog: 'bedrock',
    schema: 'public',
    table: `catalog_${tableId}`,
    column: col.name,
  };

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 6,
          border: `1px solid ${flashing ? T.brand : T.n200}`,
          background: flashing ? T.brandSoft ?? '#fff7ed' : T.n0,
          fontFamily: T.fMono, fontSize: 11, color: T.n800,
          cursor: 'pointer', transition: 'background 200ms ease',
        }}
      >
        <span>{col.name}</span>
        <span
          style={{
            padding: '1px 6px', borderRadius: 4,
            background: tc.bg, color: tc.fg,
            fontFamily: T.fMono, fontSize: 9, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}
        >
          {col.type}
        </span>
        {col.isPii && (
          <span title="PII — hashed at source" style={{
            padding: '1px 5px', borderRadius: 4,
            background: '#fee2e2', color: '#991b1b',
            fontSize: 8, fontWeight: 700, letterSpacing: '0.04em',
          }}>PII</span>
        )}
      </button>
      {open && (
        <ColumnProfilePopover
          col={col}
          target={profileTarget}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  );
}
