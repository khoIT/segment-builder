import React from 'react';
import { T, useLucide } from '../theme.jsx';
import { useDataCatalog } from '../api/hooks.js';
import { useHashState } from '../routing/hash-state.js';
import { CatalogHeader } from './catalog-header.jsx';
import { CatalogSearch } from './catalog-search.jsx';
import { TableRow } from './table-row.jsx';
import { ColumnsFlatList } from './columns-flat-list.jsx';
import { ColumnProfileDrawer } from './column-profile-drawer.jsx';

// ═══════════════════════════════════════════════════════════════════════
// Data Catalog page — browse-only view of catalog_tables / catalog_columns.
// State hub: search · tab (tables/columns) · game chip · expanded row.
// 8-file modular split per CLAUDE.md guidance.
// ═══════════════════════════════════════════════════════════════════════

function DataCatalog({ setPage }) {
  const hash = useHashState();
  const [search, setSearch] = React.useState('');
  const [tab, setTab] = React.useState('tables');
  const [game, setGame] = React.useState('all');
  const [expandedId, setExpandedId] = React.useState(null);
  const [jumpToColumn, setJumpToColumn] = React.useState(null);
  // Page-level profile drawer state. One drawer for the whole page.
  const [profileTarget, setProfileTarget] = React.useState(null);
  useLucide(expandedId, tab, profileTarget);

  const listQ = useDataCatalog();
  const all = listQ.data?.items ?? [];

  // Cross-page deeplink: #table=<id> auto-expands that row on mount/nav.
  React.useEffect(() => {
    if (hash.table && all.some((t) => t.id === hash.table)) setExpandedId(hash.table);
  }, [hash.table, all]);

  // Game filter (client-side). When a specific game is picked we still
  // include cross-game cubes (game === null) — they're catalog rollups
  // relevant to every title (UA spend, install funnel, model accuracy).
  const gameFiltered = game === 'all'
    ? all
    : all.filter((t) => t.game == null || (t.game ?? '').toLowerCase() === game.toLowerCase());

  // Search filter for Tables tab — matches name / category / partition keys.
  const q = search.trim().toLowerCase();
  const tablesFiltered = q
    ? gameFiltered.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.partitionKeys ?? []).some((p) => p.toLowerCase().includes(q)))
    : gameFiltered;

  const totals = React.useMemo(() => {
    return {
      tables: all.length,
      columns: all.reduce((a, t) => a + (t.columnCount ?? 0), 0),
      rows: all.reduce((a, t) => a + (t.rowCount ?? 0), 0),
    };
  }, [all]);

  function jumpToColumnInTable(tableId, column) {
    setTab('tables');
    setExpandedId(tableId);
    setJumpToColumn({ tableId, column });
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto', background: T.n50 }}>
      <CatalogHeader totals={totals} setPage={setPage} loading={listQ.isLoading} />
      <CatalogSearch
        search={search} setSearch={setSearch}
        tab={tab} setTab={setTab}
        game={game} setGame={setGame}
        tablesCount={tablesFiltered.length}
        columnsCount={totals.columns}
      />
      {tab === 'tables' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tablesFiltered.map((t) => (
            <TableRow
              key={t.id}
              table={t}
              expanded={expandedId === t.id}
              onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
              jumpToColumn={jumpToColumn?.tableId === t.id ? jumpToColumn.column : null}
              onJumpHandled={() => setJumpToColumn(null)}
              setPage={setPage}
              onProfile={setProfileTarget}
            />
          ))}
          {tablesFiltered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: T.n500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {listQ.isLoading && <span>Loading…</span>}
              {!listQ.isLoading && listQ.isError && (
                <>
                  <span>
                    Couldn't load catalog: {listQ.error?.message ?? 'unknown error'}
                    {listQ.error?.status === 401 ? ' — sign-in expired, refresh the page.' : ''}
                  </span>
                  <button
                    type="button" onClick={() => listQ.refetch()}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: T.brand, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: T.fSans,
                    }}
                  >Retry</button>
                </>
              )}
              {!listQ.isLoading && !listQ.isError && (
                <span>
                  {all.length === 0
                    ? 'Catalog is empty — run `pnpm db:seed` to populate.'
                    : `No tables match game=${game}${q ? ` · search="${search}"` : ''}.`}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      {tab === 'columns' && (
        <ColumnsFlatList tables={all} game={game} search={search} onJumpTo={jumpToColumnInTable} />
      )}

      <ColumnProfileDrawer
        open={!!profileTarget}
        col={profileTarget?.col}
        target={profileTarget?.target}
        onClose={() => setProfileTarget(null)}
      />
    </div>
  );
}

Object.assign(window, { DataCatalog });
export { DataCatalog };
