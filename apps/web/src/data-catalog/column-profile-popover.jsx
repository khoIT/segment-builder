import React from 'react';
import { T, Icon } from '../theme.jsx';
import { useColumnProfile } from '../api/hooks.js';

// Small popover anchored above the pill. Closes on outside click + Esc.
// Live profile fetch via useColumnProfile (server caches 24h in
// column_profiles).

function fmtPct(p) { return `${(p * 100).toFixed(1)}%`; }
function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function ColumnProfilePopover({ col, target, onClose }) {
  const ref = React.useRef(null);
  const profileQ = useColumnProfile(target.catalog, target.schema, target.table, target.column);

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

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
        width: 280, padding: 14, background: T.n0,
        border: `1px solid ${T.n200}`, borderRadius: 8,
        boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
        fontFamily: T.fSans, fontSize: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon name="bar-chart-2" size={14} color={T.brand} />
        <span style={{ fontFamily: T.fMono, fontWeight: 600, color: T.n900 }}>{col.name}</span>
        <span style={{ flex: 1 }} />
        <button onClick={onClose} type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.n500 }}>
          <Icon name="x" size={12} />
        </button>
      </div>
      {profileQ.isLoading && (
        <div style={{ color: T.n500 }}>Loading profile…</div>
      )}
      {profileQ.error && (
        <div style={{ color: T.red600 }}>Failed: {String(profileQ.error.message)}</div>
      )}
      {p && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
            <Stat label="Null %" value={fmtPct(p.nullPct)} />
            <Stat label="Distinct" value={fmtNum(p.distinctCount)} />
            <Stat label="Sampled" value={fmtNum(p.sampledRows)} />
          </div>
          {p.topValues.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                Top values
              </div>
              {p.topValues.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                  <span style={{ flex: 1, fontFamily: T.fMono, color: T.n800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.value ?? <em style={{ color: T.n400 }}>null</em>}
                  </span>
                  <span style={{ fontFamily: T.fMono, fontSize: 11, color: T.n600 }}>{fmtNum(v.count)}</span>
                  <span style={{ fontFamily: T.fMono, fontSize: 10, color: T.n500, minWidth: 42, textAlign: 'right' }}>
                    {fmtPct(v.pct)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10, color: T.n500 }}>
            {p.cached ? 'cached' : 'fresh'} · {new Date(p.computedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontFamily: T.fMono, fontSize: 13, fontWeight: 600, color: T.n900 }}>{value}</div>
    </div>
  );
}
