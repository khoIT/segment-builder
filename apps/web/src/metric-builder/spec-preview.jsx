import React from 'react';
import { T, Icon } from '../theme.jsx';
import { useSqlPreview } from '../api/hooks.js';

// Right rail: sources summary + live MetricSpec JSON + rendered SQL.
// SQL hits a debounced preview-sql endpoint that round-trips the spec
// through the compiler (no execution). The compiler now handles multi-source
// specs natively (P3). Missing required fields → "not yet ready" state.

export function SpecPreview({ spec }) {
  const primarySource = spec.sources?.[0];
  const ready = !!primarySource?.table
    && !!primarySource?.keyColumn
    && !!spec.aggregation.fn
    && !!spec.window.eventDateColumn;

  // Only send a spec to the preview endpoint when it's minimally valid.
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

        {/* Sources summary — shown as soon as at least one source is picked */}
        {spec.sources?.length > 0 && (
          <Section label="Sources">
            <SourcesSummary sources={spec.sources} joins={spec.joins} />
          </Section>
        )}

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

// Compact one-line summary: "p:raw_etl_recharge · s:raw_etl_match (joined on vopenid=vopenid)"
function SourcesSummary({ sources, joins }) {
  const parts = sources.map((s) => (
    <span key={s.alias} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, borderRadius: 8,
        background: T.brand, color: '#fff',
        fontFamily: T.fMono, fontSize: 9, fontWeight: 700,
      }}>{s.alias}</span>
      <span style={{ fontFamily: T.fMono, fontSize: 10, color: T.n800 }}>{s.table}</span>
    </span>
  ));

  // Build join hints: "joined on vopenid=vopenid"
  const joinHints = (joins ?? []).map((j, i) => {
    const pair = j.on?.[0];
    if (!pair) return null;
    return (
      <span key={i} style={{ fontSize: 10, color: T.n500, fontFamily: T.fMono }}>
        {' '}(joined on {pair.leftCol}={pair.rightCol})
      </span>
    );
  }).filter(Boolean);

  return (
    <div style={{
      padding: '8px 10px', borderRadius: 6,
      background: T.n50, border: `1px solid ${T.n100}`,
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
      fontSize: 11, fontFamily: T.fSans,
    }}>
      {parts.reduce((acc, el, i) => {
        if (i > 0) acc.push(<span key={`dot-${i}`} style={{ color: T.n300 }}> · </span>);
        acc.push(el);
        return acc;
      }, [])}
      {joinHints}
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
