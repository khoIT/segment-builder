import React from 'react';
import { T, Icon } from '../theme.jsx';

// Step 2: pick aggregation function + column. `count` ignores column;
// the rest only accept numeric columns (column type filter applied to
// the catalog metadata).

const FNS = [
  { id: 'count',          label: 'COUNT(*)',           hint: 'Row count',         needsCol: false },
  { id: 'sum',            label: 'SUM',                hint: 'Total of column',   needsCol: true },
  { id: 'count_distinct', label: 'COUNT DISTINCT',     hint: 'Unique values',     needsCol: true,  anyType: true },
  { id: 'avg',            label: 'AVG',                hint: 'Mean',              needsCol: true },
  { id: 'max',            label: 'MAX',                hint: 'Largest',           needsCol: true },
  { id: 'min',            label: 'MIN',                hint: 'Smallest',          needsCol: true },
];

const NUMERIC_TYPES = new Set(['int', 'bigint', 'double', 'numeric']);

export function StepAggregation({ spec, tableDetail, onSet }) {
  const cols = tableDetail?.columns ?? [];
  const fnDef = FNS.find((f) => f.id === spec.aggregation.fn) ?? FNS[0];
  const numeric = cols.filter((c) => NUMERIC_TYPES.has(c.type));
  const colChoices = fnDef.anyType ? cols : numeric;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 880 }}>
      <SectionHead label="2 · How do we aggregate?" hint="Pick a function. Numeric columns light up automatically." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {FNS.map((f) => {
          const picked = spec.aggregation.fn === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSet({ fn: f.id, column: f.needsCol ? spec.aggregation.column : null })}
              style={{
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                background: picked ? T.brandSoft : T.n0,
                border: `1px solid ${picked ? T.brand : T.n200}`,
                fontFamily: T.fSans, textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="sigma" size={13} color={picked ? T.brand : T.n500} />
                <span style={{ fontFamily: T.fMono, fontSize: 12, fontWeight: 600, color: T.n900 }}>
                  {f.label}
                </span>
              </div>
              <span style={{ fontSize: 11, color: T.n500 }}>{f.hint}</span>
            </button>
          );
        })}
      </div>

      {fnDef.needsCol && (
        <div>
          <div style={{ fontSize: 11, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
            Column to aggregate
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {colChoices.length === 0 && <span style={{ fontSize: 12, color: T.n500 }}>No eligible columns on this table.</span>}
            {colChoices.map((c) => {
              const picked = spec.aggregation.column === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => onSet({ ...spec.aggregation, column: c.name })}
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
