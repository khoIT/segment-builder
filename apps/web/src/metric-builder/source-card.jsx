import React from 'react';
import { T, Icon } from '../theme.jsx';

// Single source row in the metric builder. Two visual modes:
//   role='primary'  — main FROM table; shows key-column picker
//   role='joined'   — additional source; shows inline "Join: a.col = b.col"
//
// Props
//   source         { table, alias, keyColumn }
//   role           'primary' | 'joined'
//   tableMeta      CatalogTable for this source (name, game, category, columnCount)
//   tableDetail    CatalogTableDetail (columns) for the source — used to populate dropdowns
//   primaryDetail  CatalogTableDetail for the primary source — only for role='joined'
//   primarySource  full primary source object — only for role='joined' (alias label)
//   join           join row {leftAlias,rightAlias,on:[{leftCol,rightCol}],autoDetected}
//                  — only for role='joined'
//   onRemove()     remove this source
//   onSetKey(col)  primary key-column change
//   onSetJoin({leftCol,rightCol})   joined source: change either side of the join
//
// Layout: full-width Card with role tag in the header. Joined cards
// embed the join condition row right under the header so all of "this
// source's relationship to the metric" is in one place.

const ALIAS_COLORS = {
  p: { bg: T.brandSoft, border: T.brand,    text: T.brand },
  s: { bg: '#f0fdf4',  border: '#16a34a',  text: '#15803d' },
  t: { bg: '#fef3c7',  border: '#d97706',  text: '#b45309' },
};

function colorsFor(alias) {
  return ALIAS_COLORS[alias] ?? ALIAS_COLORS.p;
}

export function SourceCard({
  source,
  role,
  tableMeta,
  tableDetail,
  primaryDetail,
  primarySource,
  join,
  onRemove,
  onSetKey,
  onSetJoin,
}) {
  const c = colorsFor(source.alias);
  const isPrimary = role === 'primary';
  const cols = tableDetail?.columns ?? [];

  // Friendly name fallbacks: catalog `name` first, else the raw id.
  const displayName = tableMeta?.name || source.table;
  const game = tableMeta?.game ?? null;
  const category = tableMeta?.category ?? null;
  const colCount = tableMeta?.columnCount ?? cols.length;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: T.n0,
      border: `1px solid ${isPrimary ? c.border : T.n200}`,
      borderRadius: 10,
      boxShadow: isPrimary ? `0 0 0 3px ${c.bg}` : 'none',
      overflow: 'hidden',
    }}>
      {/* Header row: alias dot · role tag · name + meta · remove */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        borderBottom: isPrimary ? `1px solid ${T.n100}` : 'none',
      }}>
        <AliasDot alias={source.alias} colors={c} />
        <RoleTag role={role} colors={c} />

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <span style={{
            fontFamily: T.fSans, fontSize: 13, fontWeight: 600, color: T.n900,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {displayName}
          </span>
          <span style={{
            fontFamily: T.fMono, fontSize: 10, color: T.n500,
            display: 'flex', gap: 6, marginTop: 2,
          }}>
            <span>{source.table}</span>
            {game && <Sep />}
            {game && <span>{String(game).toUpperCase()}</span>}
            {category && <Sep />}
            {category && <span>{category}</span>}
            <Sep />
            <span>{colCount} cols</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onRemove}
          title={`Remove ${source.alias}: ${source.table}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 6,
            background: 'transparent', border: `1px solid ${T.n200}`,
            color: T.n600, cursor: 'pointer',
            fontFamily: T.fSans, fontSize: 11,
          }}
        >
          <Icon name="x" size={11} color={T.n600} />
          Remove
        </button>
      </div>

      {/* Body: primary → key-column row; joined → join condition row */}
      {isPrimary && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', background: T.n50,
        }}>
          <FieldLabel>Key column</FieldLabel>
          <ColSelect
            value={source.keyColumn ?? ''}
            columns={cols}
            placeholder="— pick column —"
            onChange={onSetKey}
          />
          <span style={{ fontSize: 11, color: T.n500 }}>
            (used to identify users in this metric)
          </span>
        </div>
      )}

      {!isPrimary && join && (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
          padding: '10px 14px', background: T.n50,
        }}>
          <FieldLabel>Join key</FieldLabel>
          <AliasDot alias={primarySource?.alias ?? 'p'} colors={colorsFor(primarySource?.alias ?? 'p')} size={16} />
          <ColSelect
            value={join.on?.[0]?.leftCol ?? ''}
            columns={primaryDetail?.columns ?? []}
            placeholder="primary col"
            onChange={(col) => onSetJoin({ leftCol: col, rightCol: join.on?.[0]?.rightCol ?? '' })}
          />
          <span style={{ fontSize: 13, color: T.n500, fontFamily: T.fMono }}>=</span>
          <AliasDot alias={source.alias} colors={c} size={16} />
          <ColSelect
            value={join.on?.[0]?.rightCol ?? ''}
            columns={cols}
            placeholder="joined col"
            onChange={(col) => onSetJoin({ leftCol: join.on?.[0]?.leftCol ?? '', rightCol: col })}
          />
          {join.autoDetected && (
            <span title="Column pair auto-detected by heuristic. Change anytime."
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 7px', borderRadius: 10,
                background: '#f0fdf4', border: '1px solid #86efac',
                fontSize: 10, color: '#15803d',
              }}>
              <Icon name="wand-2" size={9} color="#15803d" />
              auto-detected
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function AliasDot({ alias, colors, size = 22 }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: size / 2,
      background: colors.border, color: '#fff',
      fontFamily: T.fMono, fontSize: Math.max(9, Math.floor(size / 2.2)),
      fontWeight: 700,
      flexShrink: 0,
    }}>{alias}</span>
  );
}

function RoleTag({ role, colors }) {
  const isPrimary = role === 'primary';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4,
      background: isPrimary ? colors.bg : T.n100,
      color: isPrimary ? colors.text : T.n600,
      border: isPrimary ? `1px solid ${colors.border}` : `1px solid ${T.n200}`,
      fontFamily: T.fSans, fontSize: 9, fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      {isPrimary ? 'Primary' : 'Joined'}
    </span>
  );
}

function FieldLabel({ children }) {
  return (
    <span style={{
      fontFamily: T.fSans, fontSize: 11, fontWeight: 600, color: T.n700,
      letterSpacing: '0.02em', minWidth: 70,
    }}>
      {children}
    </span>
  );
}

function Sep() {
  return <span style={{ color: T.n300 }}>·</span>;
}

function ColSelect({ value, columns, onChange, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '5px 8px', borderRadius: 6,
        border: `1px solid ${T.n200}`, background: T.n0,
        fontFamily: T.fMono, fontSize: 11, color: T.n900, outline: 'none',
        minWidth: 140, maxWidth: 200,
      }}
    >
      {!value && <option value="">{placeholder ?? '— pick column —'}</option>}
      {columns.map((c) => (
        <option key={c.name} value={c.name}>{c.name}</option>
      ))}
    </select>
  );
}
