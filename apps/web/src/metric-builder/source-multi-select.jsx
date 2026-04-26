import React from 'react';
import { T, Icon } from '../theme.jsx';
import { useDataCatalogTable } from '../api/hooks.js';
import { SourceCard } from './source-card.jsx';

// Stacked-card source list. Replaces the older chip-row + separate
// JoinKeyPicker layout: each picked source is its own SourceCard, and
// the join condition for joined sources is rendered inline within the
// card itself. The "Add source" affordance is a dashed placeholder card
// at the bottom of the stack — clear add target, no separate dropdown
// pinned in dead space.
//
// Props
//   sources    [{table, alias, keyColumn}]
//   joins      [{leftAlias,rightAlias,on:[{leftCol,rightCol}],autoDetected?}]
//   allTables  CatalogTable[] (already filtered to layer='raw_event')
//   loading    bool
//   onAdd(catalogTable)
//   onRemove(idx)
//   onSetKey(idx, col)
//   onSetJoin(joinIdx, {leftCol, rightCol})

const MAX_SOURCES = 3;

export function SourceMultiSelect({
  sources, joins, allTables, loading,
  onAdd, onRemove, onSetKey, onSetJoin,
}) {
  // Fixed-arity hook calls so React can keep hook count stable regardless
  // of how many sources are picked.
  const t0 = useDataCatalogTable(sources[0]?.table ?? null);
  const t1 = useDataCatalogTable(sources[1]?.table ?? null);
  const t2 = useDataCatalogTable(sources[2]?.table ?? null);
  const detailsByTable = React.useMemo(() => {
    const m = {};
    if (sources[0]?.table && t0.data) m[sources[0].table] = t0.data;
    if (sources[1]?.table && t1.data) m[sources[1].table] = t1.data;
    if (sources[2]?.table && t2.data) m[sources[2].table] = t2.data;
    return m;
  }, [sources, t0.data, t1.data, t2.data]);

  // Build a quick lookup so cards can show friendly name / game / category
  // without re-querying.
  const metaById = React.useMemo(() => {
    const m = {};
    for (const t of allTables ?? []) m[t.id] = t;
    return m;
  }, [allTables]);

  const primarySource = sources[0] ?? null;
  const primaryDetail = primarySource ? detailsByTable[primarySource.table] : null;
  const maxReached = sources.length >= MAX_SOURCES;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Empty state — appears only when nothing picked */}
      {sources.length === 0 && (
        <EmptyState />
      )}

      {/* Stacked source cards */}
      {sources.map((src, idx) => {
        const isPrimary = idx === 0;
        // Joined sources map 1:1 to joins[idx-1].
        const join = isPrimary ? null : joins[idx - 1] ?? null;
        return (
          <SourceCard
            key={src.table}
            source={src}
            role={isPrimary ? 'primary' : 'joined'}
            tableMeta={metaById[src.table]}
            tableDetail={detailsByTable[src.table]}
            primaryDetail={isPrimary ? null : primaryDetail}
            primarySource={isPrimary ? null : primarySource}
            join={join}
            onRemove={() => onRemove(idx)}
            onSetKey={(col) => onSetKey(idx, col)}
            onSetJoin={(pair) => onSetJoin(idx - 1, pair)}
          />
        );
      })}

      {/* Add-source placeholder card */}
      {!maxReached && (
        <AddSourcePlaceholder
          allTables={allTables}
          loading={loading}
          pickedIds={new Set(sources.map((s) => s.table))}
          countLabel={`${sources.length} of ${MAX_SOURCES}`}
          onPick={onAdd}
        />
      )}

      {maxReached && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          border: `1px dashed ${T.n200}`, background: T.n50,
          fontSize: 11, color: T.n500, textAlign: 'center',
        }}>
          Maximum of {MAX_SOURCES} source tables per metric.
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      padding: '18px 16px', borderRadius: 10,
      border: `1px dashed ${T.n300}`, background: T.n50,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    }}>
      <Icon name="database" size={20} color={T.n400} />
      <span style={{ fontSize: 13, color: T.n700, fontFamily: T.fSans, fontWeight: 600 }}>
        No source picked yet
      </span>
      <span style={{ fontSize: 11, color: T.n500, fontFamily: T.fSans }}>
        Pick a raw-event table below to start. You can join up to 2 more.
      </span>
    </div>
  );
}

function AddSourcePlaceholder({ allTables, loading, pickedIds, countLabel, onPick }) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState('');
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const candidates = (allTables ?? []).filter((t) => !pickedIds.has(t.id));
  const q = filter.trim().toLowerCase();
  const filtered = q
    ? candidates.filter((t) =>
        t.name.toLowerCase().includes(q)
        || t.id.toLowerCase().includes(q)
        || (t.category ?? '').toLowerCase().includes(q))
    : candidates;

  function pick(t) {
    onPick(t);
    setOpen(false);
    setFilter('');
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 10,
          border: `1px dashed ${open ? T.brand : T.n300}`,
          background: open ? T.brandSoft : T.n0,
          cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: T.fSans, fontSize: 13, fontWeight: 500,
          color: open ? T.brand : T.n700,
          transition: 'all .12s',
        }}
      >
        <Icon name="plus" size={14} color={open ? T.brand : T.n700} />
        Add source
        <span style={{
          fontSize: 11, color: T.n500, fontFamily: T.fMono, marginLeft: 4,
        }}>
          {countLabel}
        </span>
      </button>

      {open && (
        // Drop the maxWidth — with left:0/right:0 anchoring, capping width
        // at 480 leaves the right side of the parent uncovered, so the
        // templates panel sitting below this button bleeds through behind
        // the dropdown. Letting it span the full button width fixes the
        // bleed-through and lines the box up with the dashed Add button.
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 100,
          background: T.n0, border: `1px solid ${T.n200}`, borderRadius: 10,
          boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${T.n100}` }}>
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter raw-event tables…"
              style={{
                width: '100%', padding: '6px 8px', borderRadius: 6,
                border: `1px solid ${T.n200}`, background: T.n50,
                fontFamily: T.fSans, fontSize: 12, color: T.n900, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 280, overflow: 'auto' }}>
            {loading && (
              <div style={{ padding: 14, fontSize: 12, color: T.n500 }}>Loading tables…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: 14, fontSize: 12, color: T.n500 }}>
                {q ? `No tables match "${q}".` : 'No raw-event tables available.'}
              </div>
            )}
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pick(t)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                  width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer',
                  background: 'transparent', textAlign: 'left', fontFamily: T.fSans,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.n50; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                  <Icon name="table-2" size={12} color={T.n500} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.n900 }}>{t.name}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontFamily: T.fMono, fontSize: 10, color: T.n500 }}>
                    {t.columnCount ?? 0} cols
                  </span>
                </div>
                <span style={{ fontFamily: T.fMono, fontSize: 10, color: T.n500, marginLeft: 18 }}>
                  {t.id}
                  {t.game ? ` · ${String(t.game).toUpperCase()}` : ''}
                  {t.category ? ` · ${t.category}` : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
