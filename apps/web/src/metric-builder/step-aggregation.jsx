import React from 'react';
import { T, Icon } from '../theme.jsx';
import { useDataCatalogTable } from '../api/hooks.js';

// Step 2: pick aggregation function + column.
// When sources.length > 1, column options are shown as <alias>.<col> with
// table-name hint label. When single-source, behavior is unchanged (unqualified).
//
// Props:
//   spec          — full wizard spec (reads spec.aggregation, spec.sources)
//   tableDetail   — detail for primary source (passed from index.jsx)
//   onSet(agg)    — emit updated aggregation { fn, column }

const FNS = [
  { id: 'count',          label: 'COUNT(*)',       hint: 'Row count',       needsCol: false },
  { id: 'sum',            label: 'SUM',            hint: 'Total of column', needsCol: true },
  { id: 'count_distinct', label: 'COUNT DISTINCT', hint: 'Unique values',   needsCol: true, anyType: true },
  { id: 'avg',            label: 'AVG',            hint: 'Mean',            needsCol: true },
  { id: 'max',            label: 'MAX',            hint: 'Largest',         needsCol: true },
  { id: 'min',            label: 'MIN',            hint: 'Smallest',        needsCol: true },
];

const NUMERIC_TYPES = new Set(['int', 'bigint', 'double', 'numeric']);

export function StepAggregation({ spec, tableDetail, onSet }) {
  const sources = spec.sources ?? [];
  const isMultiSource = sources.length > 1;

  // Fetch details for secondary sources (indices 1 and 2) to build column options.
  const src1Table = sources[1]?.table ?? null;
  const src2Table = sources[2]?.table ?? null;
  const detail1Q = useDataCatalogTable(src1Table);
  const detail2Q = useDataCatalogTable(src2Table);

  const fnDef = FNS.find((f) => f.id === spec.aggregation.fn) ?? FNS[0];

  // Build column choices.
  // Single-source: same as before — unqualified names from primary table.
  // Multi-source: qualified `<alias>.<col>` options from all sources.
  const colChoices = React.useMemo(() => {
    if (!fnDef.needsCol) return [];

    if (!isMultiSource) {
      const cols = tableDetail?.columns ?? [];
      const eligible = fnDef.anyType ? cols : cols.filter((c) => NUMERIC_TYPES.has(c.type));
      return eligible.map((c) => ({
        value: c.name,           // unqualified
        label: c.name,
        hint: c.type,
        tableName: null,
      }));
    }

    // Multi-source: gather from all sources with their details.
    const allSourceDetails = [
      { src: sources[0], detail: tableDetail },
      { src: sources[1], detail: detail1Q.data },
      { src: sources[2], detail: detail2Q.data },
    ].filter(({ src }) => !!src);

    const choices = [];
    for (const { src, detail } of allSourceDetails) {
      if (!src || !detail) continue;
      const cols = detail.columns ?? [];
      const eligible = fnDef.anyType ? cols : cols.filter((c) => NUMERIC_TYPES.has(c.type));
      for (const c of eligible) {
        choices.push({
          value: `${src.alias}.${c.name}`,   // qualified
          label: `${src.alias}.${c.name}`,
          hint: c.type,
          tableName: src.table,
        });
      }
    }
    return choices;
  }, [fnDef, isMultiSource, tableDetail, detail1Q.data, detail2Q.data, sources]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 880 }}>
      <SectionHead
        label="2 · How do we aggregate?"
        hint={isMultiSource
          ? 'Columns shown as alias.column — pick from any source table.'
          : 'Pick a function. Numeric columns light up automatically.'}
      />

      {/* Function selector */}
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

      {/* Column picker */}
      {fnDef.needsCol && (
        <div>
          <div style={{ fontSize: 11, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>
            Column to aggregate
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {colChoices.length === 0 && (
              <span style={{ fontSize: 12, color: T.n500 }}>
                {isMultiSource ? 'Loading source columns…' : 'No eligible columns on this table.'}
              </span>
            )}
            {colChoices.map((c) => {
              const picked = spec.aggregation.column === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onSet({ ...spec.aggregation, column: c.value })}
                  style={{
                    padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                    background: picked ? T.brand : T.n0,
                    border: `1px solid ${picked ? T.brand : T.n200}`,
                    color: picked ? '#fff' : T.n800,
                    fontFamily: T.fMono, fontSize: 11,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {c.label}
                  <span style={{ fontSize: 9, opacity: 0.7 }}>{c.hint}</span>
                  {isMultiSource && c.tableName && (
                    <span style={{ fontSize: 9, opacity: 0.55, fontFamily: T.fSans }}>
                      {c.tableName}
                    </span>
                  )}
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
      <div style={{ fontFamily: T.fDisp, fontSize: 16, color: T.n900, letterSpacing: '0.02em' }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: T.n500, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}
