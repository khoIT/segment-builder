import React from 'react';
import { T, Icon } from '../theme.jsx';
import { useSqlPreview } from '../api/hooks.js';

// Right rail: live MetricSpec JSON + rendered SQL. SQL hits a debounced
// preview-sql endpoint that round-trips the spec through the compiler
// (no execution). When fields are missing the API returns 400; we
// surface that as a "Compiler not yet ready" state.

export function SpecPreview({ spec }) {
  const ready = !!spec.cohort.sourceTable && !!spec.aggregation.fn
    && !!spec.window.eventDateColumn && !!spec.cohort.keyColumn;
  const sqlQ = useSqlPreview(ready ? spec : null);

  return (
    <div style={{
      borderLeft: `1px solid ${T.n200}`,
      display: 'flex', flexDirection: 'column',
      background: T.n0, overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 18px', borderBottom: `1px solid ${T.n200}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Icon name="code-2" size={14} color={T.brand} />
        <span style={{ fontSize: 11, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Live preview
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Section label="MetricSpec">
          <pre style={{
            margin: 0, padding: '10px 12px',
            background: T.n50, borderRadius: 6,
            border: `1px solid ${T.n100}`,
            fontFamily: T.fMono, fontSize: 10, lineHeight: 1.45,
            color: T.n800, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {JSON.stringify(spec, null, 2)}
          </pre>
        </Section>

        <Section label="Generated SQL">
          {!ready && (
            <div style={{
              padding: '14px 14px', borderRadius: 6,
              background: T.n50, border: `1px dashed ${T.n200}`,
              fontSize: 11, color: T.n500, fontStyle: 'italic',
            }}>
              Pick source, aggregation, window & key to render SQL.
            </div>
          )}
          {ready && sqlQ.isLoading && (
            <div style={{ padding: 12, fontSize: 11, color: T.n500 }}>Compiling…</div>
          )}
          {ready && sqlQ.error && (
            <div style={{
              padding: '10px 12px', borderRadius: 6,
              background: '#fee2e2', color: '#991b1b',
              fontSize: 11, fontFamily: T.fMono, lineHeight: 1.4,
            }}>{String(sqlQ.error.message ?? sqlQ.error)}</div>
          )}
          {ready && sqlQ.data && (
            <pre style={{
              margin: 0, padding: '10px 12px',
              background: '#0f172a', borderRadius: 6,
              fontFamily: T.fMono, fontSize: 11, lineHeight: 1.55,
              color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {sqlQ.data.sql}
            </pre>
          )}
          {ready && sqlQ.data?.warnings?.length > 0 && (
            <div style={{ marginTop: 6 }}>
              {sqlQ.data.warnings.map((w, i) => (
                <div key={i} style={{
                  padding: '6px 10px', borderRadius: 4,
                  background: '#fef3c7', color: '#92400e',
                  fontSize: 10, marginTop: 4,
                }}>⚠ {w}</div>
              ))}
            </div>
          )}
          {ready && sqlQ.data?.estimatedRows != null && (
            <div style={{ marginTop: 6, fontSize: 10, color: T.n500, fontFamily: T.fMono }}>
              ~{Number(sqlQ.data.estimatedRows).toLocaleString()} rows estimated
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div style={{
        fontSize: 10, color: T.n500,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontWeight: 600, marginBottom: 6,
      }}>{label}</div>
      {children}
    </div>
  );
}
