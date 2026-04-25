import React from 'react';
import { T, Icon } from '../theme.jsx';
import { useColumnProfile } from '../api/hooks.js';

// Floating column profile card. Anchored above the pill, escapes the
// row's stacking context via fixed-position + viewport-aware flip so
// it never bleeds into the sample table behind it. Top values render
// as horizontal bars (width = pct) — way more readable than 3 columns
// of text.

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

const POPOVER_W = 360;
const POPOVER_H_EST = 360;
const GAP = 8;

function fmtPct(p) { return `${(p * 100).toFixed(1)}%`; }
function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Find the nearest positioned ancestor and compute fixed-viewport
// coords. Flip above when not enough room below; clamp horizontally so
// the card never spills off-screen.
function computePosition(anchorEl) {
  if (!anchorEl) return null;
  const r = anchorEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceBelow = vh - r.bottom;
  const flipUp = spaceBelow < POPOVER_H_EST && r.top > spaceBelow;
  const top = flipUp ? Math.max(8, r.top - POPOVER_H_EST - GAP) : r.bottom + GAP;
  let left = r.left;
  if (left + POPOVER_W > vw - 8) left = vw - POPOVER_W - 8;
  if (left < 8) left = 8;
  return { top, left, flipUp };
}

export function ColumnProfilePopover({ col, target, onClose }) {
  const ref = React.useRef(null);
  const [pos, setPos] = React.useState(null);
  const profileQ = useColumnProfile(target.catalog, target.schema, target.table, target.column);

  // Anchor lookup: parent <span> wrapping the pill button.
  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const anchor = ref.current.parentElement;
    setPos(computePosition(anchor));
    function onScroll() { setPos(computePosition(anchor)); }
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  React.useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const p = profileQ.data;
  const tc = TYPE_COLORS[col.type] ?? TYPE_COLORS.json;

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top:  pos?.top  ?? -9999,
        left: pos?.left ?? -9999,
        zIndex: 1000,
        width: POPOVER_W,
        background: T.n0,
        border: `1px solid ${T.n200}`,
        borderRadius: 10,
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(15, 23, 42, 0.08)',
        fontFamily: T.fSans,
        overflow: 'hidden',
        opacity: pos ? 1 : 0,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 14px',
        borderBottom: `1px solid ${T.n100}`,
        background: T.n50,
      }}>
        <Icon name="bar-chart-2" size={14} color={T.brand} />
        <span style={{ fontFamily: T.fMono, fontWeight: 600, fontSize: 13, color: T.n900 }}>{col.name}</span>
        <span style={{
          padding: '2px 8px', borderRadius: 4,
          background: tc.bg, color: tc.fg,
          fontFamily: T.fMono, fontSize: 9, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>{col.type}</span>
        {col.isPii && (
          <span style={{
            padding: '2px 6px', borderRadius: 4,
            background: '#fee2e2', color: '#991b1b',
            fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
          }}>PII</span>
        )}
        <span style={{ flex: 1 }} />
        <button
          onClick={onClose} type="button"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: T.n500, padding: 2, display: 'flex', alignItems: 'center',
          }}
        >
          <Icon name="x" size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {profileQ.isLoading && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: T.n500, fontSize: 12 }}>
            Loading profile…
          </div>
        )}
        {profileQ.error && (
          <div style={{
            padding: '8px 10px', borderRadius: 6,
            background: '#fee2e2', color: '#991b1b', fontSize: 11,
          }}>
            Failed: {String(profileQ.error.message)}
          </div>
        )}
        {p && (
          <>
            {/* Stat tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <StatTile label="Null %"   value={fmtPct(p.nullPct)} highlight={p.nullPct > 0.05} />
              <StatTile label="Distinct" value={fmtNum(p.distinctCount)} />
              <StatTile label="Sampled"  value={fmtNum(p.sampledRows)} />
            </div>

            {/* Top values bar chart */}
            {p.topValues.length > 0 && (
              <div>
                <div style={{
                  fontSize: 10, color: T.n500,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  fontWeight: 600, marginBottom: 8,
                }}>
                  Top values
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {p.topValues.map((v, i) => (
                    <TopValueRow key={i} v={v} />
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{
              fontSize: 10, color: T.n500, fontFamily: T.fMono,
              borderTop: `1px solid ${T.n100}`, paddingTop: 8,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name={p.cached ? 'database' : 'zap'} size={10} color={T.n400} />
              <span>{p.cached ? 'cached' : 'fresh'}</span>
              <span style={{ flex: 1 }} />
              <span>{new Date(p.computedAt).toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, highlight }) {
  return (
    <div style={{
      padding: '8px 10px',
      borderRadius: 6,
      background: highlight ? '#fef3c7' : T.n50,
      border: `1px solid ${highlight ? '#fbbf24' : T.n100}`,
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <div style={{
        fontSize: 9, color: T.n500,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        fontWeight: 600,
      }}>{label}</div>
      <div style={{
        fontFamily: T.fMono, fontSize: 14, fontWeight: 600,
        color: highlight ? '#92400e' : T.n900,
      }}>{value}</div>
    </div>
  );
}

function TopValueRow({ v }) {
  const isNull = v.value == null;
  const widthPct = Math.max(2, Math.min(100, v.pct * 100));
  return (
    <div style={{ position: 'relative' }}>
      {/* Bar fill */}
      <div style={{
        position: 'absolute', inset: 0,
        width: `${widthPct}%`,
        background: T.brandSoft ?? '#fff7ed',
        borderRadius: 4,
        zIndex: 0,
      }} />
      {/* Foreground content */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 8px',
        fontSize: 11,
      }}>
        <span style={{
          flex: 1,
          fontFamily: T.fMono, color: isNull ? T.n400 : T.n800,
          fontStyle: isNull ? 'italic' : 'normal',
          fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {isNull ? 'null' : String(v.value)}
        </span>
        <span style={{ fontFamily: T.fMono, fontSize: 10, color: T.n500 }}>
          {fmtNum(v.count)}
        </span>
        <span style={{
          fontFamily: T.fMono, fontSize: 11, fontWeight: 600,
          color: T.brand, minWidth: 42, textAlign: 'right',
        }}>
          {fmtPct(v.pct)}
        </span>
      </div>
    </div>
  );
}
