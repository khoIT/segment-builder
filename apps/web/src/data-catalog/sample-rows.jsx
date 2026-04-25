import React from 'react';
import { T } from '../theme.jsx';

// 10-row inline sample table. PII columns rendered as-is (already
// hashed at seed time per phase 01).

export function SampleRows({ sample }) {
  const cols = sample?.columns ?? [];
  const rows = sample?.rows ?? [];
  return (
    <div>
      <div style={{ fontSize: 11, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        Sample (10 rows)
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 16, color: T.n500, fontStyle: 'italic' }}>
          No sample available — table empty or never built.
        </div>
      ) : (
        <div style={{ overflow: 'auto', border: `1px solid ${T.n200}`, borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fMono, fontSize: 11 }}>
            <thead>
              <tr style={{ background: T.n50 }}>
                {cols.map((c) => (
                  <th key={c} style={{
                    position: 'sticky', top: 0, background: T.n50,
                    padding: '8px 10px', textAlign: 'left', fontWeight: 600,
                    color: T.n600, borderBottom: `1px solid ${T.n200}`,
                    whiteSpace: 'nowrap', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.n100}` }}>
                  {r.map((cell, j) => (
                    <td key={j} style={{
                      padding: '6px 10px', color: T.n800,
                      whiteSpace: 'nowrap', maxWidth: 220,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {cell == null
                        ? <span style={{ color: T.n400, fontStyle: 'italic' }}>null</span>
                        : typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
