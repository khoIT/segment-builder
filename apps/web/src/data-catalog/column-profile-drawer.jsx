import React from 'react';
import { T, Icon } from '../theme.jsx';
import { useColumnProfile } from '../api/hooks.js';

// Right-side drawer for column profile. State lifted to the page so it
// renders once at the top level — escapes any row stacking context.
// Backdrop click + Esc close. Larger footprint than the old popover so
// top-values bars + stat tiles get room to breathe.

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

const DRAWER_W = 480;

function fmtPct(p) { return `${(p * 100).toFixed(1)}%`; }
function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function ColumnProfileDrawer({ open, col, target, onClose }) {
  const profileQ = useColumnProfile(
    open ? target?.catalog : null,
    open ? target?.schema : null,
    open ? target?.table : null,
    open ? target?.column : null,
  );

  React.useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !col) return null;
  const tc = TYPE_COLORS[col.type] ?? TYPE_COLORS.json;
  const p = profileQ.data;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.32)',
        display: 'flex', justifyContent: 'flex-end',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: DRAWER_W, maxWidth: '92vw', height: '100%',
          background: T.n0,
          boxShadow: '-12px 0 32px rgba(15, 23, 42, 0.18)',
          display: 'flex', flexDirection: 'column',
          fontFamily: T.fSans,
          animation: 'drawerSlide 180ms ease-out',
        }}
      >
        <style>{`
          @keyframes drawerSlide {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '18px 22px',
          borderBottom: `1px solid ${T.n200}`,
          background: T.n50,
        }}>
          <Icon name="bar-chart-2" size={18} color={T.brand} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10, color: T.n500, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Column profile
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontFamily: T.fMono, fontSize: 16, fontWeight: 600, color: T.n900 }}>
                {col.name}
              </span>
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
            </div>
            <div style={{ fontSize: 11, color: T.n500, fontFamily: T.fMono, marginTop: 4 }}>
              {target.catalog}.{target.schema}.{target.table}
            </div>
          </div>
          <button
            onClick={onClose} type="button"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: T.n500, padding: 4, display: 'flex', alignItems: 'center',
              borderRadius: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.n100)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {col.description && (
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: T.n50, border: `1px solid ${T.n100}`,
              fontSize: 12, color: T.n700, lineHeight: 1.5,
            }}>{col.description}</div>
          )}

          {profileQ.isLoading && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: T.n500, fontSize: 13 }}>
              Loading profile…
            </div>
          )}
          {profileQ.error && (
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: '#fee2e2', color: '#991b1b', fontSize: 12,
            }}>
              Failed: {String(profileQ.error.message)}
            </div>
          )}
          {p && (
            <>
              {/* Stat tiles */}
              <div>
                <SectionLabel>Quality signals</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
                  <StatTile label="Null %"   value={fmtPct(p.nullPct)} highlight={p.nullPct > 0.05} />
                  <StatTile label="Distinct" value={fmtNum(p.distinctCount)} />
                  <StatTile label="Sampled"  value={fmtNum(p.sampledRows)} />
                </div>
              </div>

              {/* Top values bar chart */}
              {p.topValues.length > 0 && (
                <div>
                  <SectionLabel>Top values</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {p.topValues.map((v, i) => (
                      <TopValueRow key={i} v={v} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {p && (
          <div style={{
            padding: '12px 22px', borderTop: `1px solid ${T.n200}`,
            background: T.n50,
            fontSize: 11, color: T.n500, fontFamily: T.fMono,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name={p.cached ? 'database' : 'zap'} size={11} color={T.n400} />
            <span>{p.cached ? 'cached' : 'fresh'}</span>
            <span style={{ flex: 1 }} />
            <span>{new Date(p.computedAt).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, color: T.n500, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{children}</div>
  );
}

function StatTile({ label, value, highlight }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 8,
      background: highlight ? '#fef3c7' : T.n50,
      border: `1px solid ${highlight ? '#fbbf24' : T.n100}`,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{
        fontSize: 9, color: highlight ? '#92400e' : T.n500,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        fontWeight: 600,
      }}>{label}</div>
      <div style={{
        fontFamily: T.fMono, fontSize: 18, fontWeight: 600,
        color: highlight ? '#92400e' : T.n900,
        lineHeight: 1.1,
      }}>{value}</div>
    </div>
  );
}

function TopValueRow({ v }) {
  const isNull = v.value == null;
  const widthPct = Math.max(2, Math.min(100, v.pct * 100));
  return (
    <div style={{ position: 'relative', minHeight: 28 }}>
      {/* Bar fill */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: `${widthPct}%`,
        background: T.brandSoft ?? '#fff7ed',
        borderRadius: 6,
        zIndex: 0,
      }} />
      {/* Foreground content */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 12px',
        fontSize: 12,
        minHeight: 28, boxSizing: 'border-box',
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
        <span style={{ fontFamily: T.fMono, fontSize: 11, color: T.n500 }}>
          {fmtNum(v.count)}
        </span>
        <span style={{
          fontFamily: T.fMono, fontSize: 12, fontWeight: 600,
          color: T.brand, minWidth: 50, textAlign: 'right',
        }}>
          {fmtPct(v.pct)}
        </span>
      </div>
    </div>
  );
}
