import React from 'react';
import { T, Icon } from '../theme.jsx';

// Renders one row per additional source (one per join).
// Each row: "Join <alias> to <primaryAlias> on <leftCol> = <rightCol>"
// with two column dropdowns filtered to respective table columns.
//
// Props:
//   sources     — [{table, alias, keyColumn}] full source list (length >= 2)
//   joins       — [{leftAlias, rightAlias, on:[{leftCol,rightCol}], autoDetected?}]
//   tableDetails — { [tableId]: { columns: [{name,type}] } } keyed by table id
//   onChange(joins) — called with updated joins array

function ColSelect({ value, columns, onChange, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '5px 8px', borderRadius: 6,
        border: `1px solid ${T.n200}`, background: T.n0,
        fontFamily: T.fMono, fontSize: 11, color: T.n900, outline: 'none',
        minWidth: 130, maxWidth: 180,
      }}
    >
      {!value && <option value="">{placeholder ?? '— pick column —'}</option>}
      {columns.map((c) => (
        <option key={c.name} value={c.name}>{c.name}</option>
      ))}
    </select>
  );
}

export function JoinKeyPicker({ sources, joins, tableDetails, onChange }) {
  if (!sources || sources.length < 2) return null;

  // Additional sources = indices 1..N; each has a corresponding join.
  const additionalSources = sources.slice(1);

  function updateJoin(joinIdx, leftCol, rightCol) {
    const next = joins.map((j, i) => {
      if (i !== joinIdx) return j;
      return { ...j, on: [{ leftCol, rightCol }], autoDetected: false };
    });
    onChange(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        fontSize: 11, color: T.n500, textTransform: 'uppercase',
        letterSpacing: '0.06em', fontWeight: 600,
      }}>
        Join conditions
      </div>

      {additionalSources.map((src, i) => {
        const join = joins[i];
        if (!join) return null;

        const primarySrc = sources[0];
        const leftTableDetail = tableDetails?.[primarySrc?.table];
        const rightTableDetail = tableDetails?.[src.table];
        const leftCols = leftTableDetail?.columns ?? [];
        const rightCols = rightTableDetail?.columns ?? [];

        const currentLeftCol = join.on?.[0]?.leftCol ?? '';
        const currentRightCol = join.on?.[0]?.rightCol ?? '';
        const isAutoDetected = join.autoDetected !== false && (currentLeftCol || currentRightCol);

        // Alias pill colors
        const primaryColor = T.brand;
        const secondaryColors = ['#16a34a', '#d97706'];
        const srcColor = secondaryColors[i] ?? '#6b7280';

        return (
          <div key={src.alias} style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            padding: '10px 12px', borderRadius: 8,
            background: T.n50, border: `1px solid ${T.n200}`,
          }}>
            {/* "Join s to p on" label */}
            <span style={{ fontSize: 12, color: T.n600, whiteSpace: 'nowrap' }}>Join</span>
            <AliasChip alias={src.alias} color={srcColor} />
            <span style={{ fontSize: 12, color: T.n600, whiteSpace: 'nowrap' }}>to</span>
            <AliasChip alias={primarySrc?.alias ?? 'p'} color={primaryColor} />
            <span style={{ fontSize: 12, color: T.n600, whiteSpace: 'nowrap' }}>on</span>

            {/* Left col dropdown (primary source columns) */}
            <ColSelect
              value={currentLeftCol}
              columns={leftCols}
              placeholder="primary col"
              onChange={(col) => updateJoin(i, col, currentRightCol)}
            />

            <span style={{ fontSize: 12, color: T.n500 }}>=</span>

            {/* Right col dropdown (secondary source columns) */}
            <ColSelect
              value={currentRightCol}
              columns={rightCols}
              placeholder="joined col"
              onChange={(col) => updateJoin(i, currentLeftCol, col)}
            />

            {/* Auto-detected badge */}
            {isAutoDetected && (
              <span title="Column pair auto-detected by heuristic. You can change it." style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 7px', borderRadius: 10,
                background: '#f0fdf4', border: '1px solid #86efac',
                fontSize: 10, color: '#15803d', fontFamily: T.fSans,
                cursor: 'default',
              }}>
                <Icon name="wand-2" size={9} color="#15803d" />
                auto-detected
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AliasChip({ alias, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 20, height: 20, borderRadius: 10,
      background: color, color: '#fff',
      fontFamily: T.fMono, fontSize: 10, fontWeight: 700,
    }}>{alias}</span>
  );
}
