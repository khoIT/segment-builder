import React from 'react';
import { T, Icon } from '../theme.jsx';

// Step 3: pick window kind, days, event_date_column, cohort key.
// rolling_days = last N days from now(); cohort_relative joins by
// install_time later (compiler in P06). Event-date column scoped to
// timestamp/date columns; key column free-text within identifiers.

const TIME_TYPES = new Set(['date', 'timestamp']);

export function StepWindow({ spec, tableDetail, onSetWindow, onSetKey }) {
  const cols = tableDetail?.columns ?? [];
  const dateCols = cols.filter((c) => TIME_TYPES.has(c.type));
  const keyCols = cols.filter((c) => c.type === 'string' || c.type === 'int' || c.type === 'bigint');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 880 }}>
      <SectionHead label="3 · Window & cohort key" hint="How far back, on which timestamp, keyed by what." />

      {/* Window kind */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { id: 'rolling_days',    label: 'Rolling N days',     hint: 'Last N days from now()' },
          { id: 'cohort_relative', label: 'Cohort-relative',    hint: 'First N days after install' },
        ].map((k) => {
          const picked = spec.window.kind === k.id;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => onSetWindow({ ...spec.window, kind: k.id })}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                background: picked ? T.brandSoft : T.n0,
                border: `1px solid ${picked ? T.brand : T.n200}`,
                fontFamily: T.fSans, textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name={picked ? 'check-circle-2' : 'circle'} size={13} color={picked ? T.brand : T.n400} />
                <span style={{ fontSize: 12, fontWeight: 600, color: T.n900 }}>{k.label}</span>
              </div>
              <div style={{ fontSize: 11, color: T.n500, marginTop: 2 }}>{k.hint}</div>
            </button>
          );
        })}
      </div>

      {/* Days */}
      <div>
        <div style={{ fontSize: 11, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
          Window length (days)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[1, 7, 14, 30, 60, 90].map((d) => {
            const picked = spec.window.days === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onSetWindow({ ...spec.window, days: d })}
                style={{
                  padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                  background: picked ? T.brand : T.n0,
                  border: `1px solid ${picked ? T.brand : T.n200}`,
                  color: picked ? '#fff' : T.n800,
                  fontFamily: T.fMono, fontSize: 12, fontWeight: 600,
                }}
              >{d}d</button>
            );
          })}
          <input
            type="number" min="1" max="365"
            value={spec.window.days}
            onChange={(e) => onSetWindow({ ...spec.window, days: Math.max(1, Math.min(365, Number(e.target.value) || 1)) })}
            style={{
              width: 80, padding: '6px 10px', borderRadius: 6,
              border: `1px solid ${T.n200}`, background: T.n0,
              fontFamily: T.fMono, fontSize: 12, color: T.n900, outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Event date column */}
      <div>
        <div style={{ fontSize: 11, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
          Event date column
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {dateCols.length === 0 && <span style={{ fontSize: 12, color: T.n500 }}>No timestamp/date columns on this table.</span>}
          {dateCols.map((c) => {
            const picked = spec.window.eventDateColumn === c.name;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onSetWindow({ ...spec.window, eventDateColumn: c.name })}
                style={{
                  padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                  background: picked ? T.brand : T.n0,
                  border: `1px solid ${picked ? T.brand : T.n200}`,
                  color: picked ? '#fff' : T.n800,
                  fontFamily: T.fMono, fontSize: 11,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                {c.name}
                <span style={{ fontSize: 9, opacity: 0.7 }}>{c.type}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cohort key */}
      <div>
        <div style={{ fontSize: 11, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
          Cohort key column
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {keyCols.length === 0 && <span style={{ fontSize: 12, color: T.n500 }}>No eligible key columns on this table.</span>}
          {keyCols.map((c) => {
            const picked = spec.cohort.keyColumn === c.name;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onSetKey(c.name)}
                style={{
                  padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                  background: picked ? T.brand : T.n0,
                  border: `1px solid ${picked ? T.brand : T.n200}`,
                  color: picked ? '#fff' : T.n800,
                  fontFamily: T.fMono, fontSize: 11,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                {c.name}
                <span style={{ fontSize: 9, opacity: 0.7 }}>{c.type}</span>
                {c.isPii && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>PII</span>}
              </button>
            );
          })}
        </div>
      </div>
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
