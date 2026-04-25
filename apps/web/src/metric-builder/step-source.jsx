import React from 'react';
import { T, Icon, Card, Badge } from '../theme.jsx';

// Step 1: pick the source table. Restricted to layer === 'raw_event'
// (atomic per-event rows) — aggregates and master-build artefacts are
// already metrics, not metric sources. After pick, surface a 10-row
// sample so the PM can see what they're aggregating before going on.

export function StepSource({ tables, loading, spec, tableDetail, onPick }) {
  const [filter, setFilter] = React.useState('');
  const candidates = (tables ?? []).filter((t) => t.layer === 'raw_event');
  const q = filter.trim().toLowerCase();
  const filtered = q
    ? candidates.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    : candidates;

  // Backend shape: { columns: string[], rows: any[][] } (positional cells).
  const sampleCols = tableDetail?.sample?.columns ?? [];
  const sampleRows = tableDetail?.sample?.rows ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 880 }}>
      <SectionHead label="1 · Pick a source table" hint="Raw event tables make the best metric sources." />
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="filter tables…"
        style={{
          padding: '10px 12px', borderRadius: 8,
          border: `1px solid ${T.n200}`, background: T.n0,
          fontFamily: T.fSans, fontSize: 13, color: T.n900, outline: 'none',
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
        {loading && <div style={{ color: T.n500, fontSize: 13 }}>Loading catalog…</div>}
        {!loading && candidates.length === 0 && (
          <div style={{ color: T.n500, fontSize: 13, gridColumn: '1 / -1' }}>
            No raw-event tables in the catalog yet. Aggregates are already metrics — pick one from <strong>Metrics Catalog</strong> instead, or seed raw events.
          </div>
        )}
        {filtered.map((t) => {
          const picked = spec.cohort.sourceTable === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                background: picked ? T.brandSoft : T.n0,
                border: `1px solid ${picked ? T.brand : T.n200}`,
                fontFamily: T.fSans,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="table-2" size={14} color={picked ? T.brand : T.n500} />
                <span style={{ fontFamily: T.fMono, fontSize: 12, fontWeight: 600, color: T.n900 }}>
                  {t.name}
                </span>
              </div>
              <div style={{ fontSize: 11, color: T.n500 }}>
                {t.category}{t.game ? ` · ${t.game}` : ''} · {(t.rowCount ?? 0).toLocaleString()} rows
              </div>
            </button>
          );
        })}
      </div>

      {tableDetail && (
        <Card padding={0}>
          <div style={{
            padding: '10px 14px',
            borderBottom: `1px solid ${T.n100}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="eye" size={14} color={T.n500} />
            <span style={{ fontSize: 11, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Sample · {tableDetail.name}
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: T.n500, fontFamily: T.fMono }}>
              {(tableDetail.columns ?? []).length} cols
            </span>
          </div>
          <div style={{ overflow: 'auto', maxHeight: 280 }}>
            {sampleRows.length === 0 ? (
              <div style={{ padding: 16, color: T.n500, fontSize: 12 }}>No sample available.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: T.fMono }}>
                <thead>
                  <tr style={{ background: T.n50 }}>
                    {sampleCols.map((c) => (
                      <th key={c} style={{ padding: '6px 10px', textAlign: 'left', color: T.n600, borderBottom: `1px solid ${T.n200}`, fontWeight: 600 }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.slice(0, 10).map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.n100}` }}>
                      {sampleCols.map((c, j) => {
                        const cell = Array.isArray(row) ? row[j] : row?.[c];
                        return (
                          <td key={c} style={{ padding: '5px 10px', color: T.n800, whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cell == null
                              ? <span style={{ color: T.n400, fontStyle: 'italic' }}>null</span>
                              : typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function SectionHead({ label, hint }) {
  return (
    <div>
      <div style={{ fontFamily: T.fDisp, fontSize: 16, color: T.n900, letterSpacing: '0.02em' }}>
        {label}
      </div>
      {hint && <div style={{ fontSize: 12, color: T.n500, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}
