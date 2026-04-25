import React from 'react';
import { T, Icon, Card } from '../theme.jsx';
import { useDataCatalogTable } from '../api/hooks.js';

// Flat list across all 195 columns. The list endpoint doesn't include
// per-table column lists, so we lazy-fetch a few details on expand.
// To avoid 16 simultaneous fetches on tab open, we fetch each table's
// detail via the same hook used by table-row.jsx — TanStack Query
// dedupes if a row was previously expanded, otherwise pulls fresh.
//
// For the Columns tab itself, we issue one detail-fetch per visible
// table — it's still 16 small reads against tiny rows; acceptable for
// the prototype. Switch to a dedicated `/catalog/columns` endpoint if
// the list grows.

const TYPE_COLORS = {
  string:    { bg: '#dbeafe', fg: '#1e40af' },
  int:       { bg: '#dcfce7', fg: '#166534' },
  bigint:    { bg: '#dcfce7', fg: '#166534' },
  double:    { bg: '#fef3c7', fg: '#92400e' },
  date:      { bg: '#ede9fe', fg: '#6d28d9' },
  timestamp: { bg: '#ede9fe', fg: '#6d28d9' },
  boolean:   { bg: '#fce7f3', fg: '#9d174d' },
  json:      { bg: '#e2e8f0', fg: '#475569' },
};

export function ColumnsFlatList({ tables, game, search, onJumpTo }) {
  // One hook call per table id. Tables list is the full 16-row catalog
  // (parent page passes it unfiltered) so hook count + order stay
  // stable across renders. Game/search filtering applies post-resolve.
  const detailsList = tables.map((t) => useDataCatalogTable(t.id));

  const allCols = React.useMemo(() => {
    const out = [];
    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      const detail = detailsList[i].data;
      if (!detail) continue;
      if (game && game !== 'all' && (t.game ?? '').toLowerCase() !== game.toLowerCase()) continue;
      for (const c of detail.columns) {
        out.push({
          ...c,
          tableId: t.id,
          tableName: t.name,
          game: t.game,
          category: t.category,
        });
      }
    }
    return out;
  }, [tables, detailsList, game]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? allCols.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.tableName.toLowerCase().includes(q))
    : allCols;

  const loading = detailsList.some((d) => d.isLoading);

  return (
    <Card padding={0}>
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${T.n200}`, fontFamily: T.fSans, fontSize: 12, color: T.n600 }}>
        {filtered.length} of {allCols.length} columns
        {loading && <span style={{ marginLeft: 8, color: T.n500 }}>· loading…</span>}
      </div>
      <div style={{ maxHeight: 600, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fSans, fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.n50 }}>
              {['Column', 'Type', 'Table', 'Category'].map((h) => (
                <th key={h} style={{
                  position: 'sticky', top: 0, background: T.n50,
                  padding: '10px 16px', textAlign: 'left', fontWeight: 600,
                  color: T.n600, fontSize: 11, letterSpacing: '0.04em',
                  textTransform: 'uppercase', borderBottom: `1px solid ${T.n200}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const tc = TYPE_COLORS[c.type] ?? TYPE_COLORS.json;
              return (
                <tr
                  key={`${c.tableId}.${c.name}.${i}`}
                  onClick={() => onJumpTo?.(c.tableId, c.name)}
                  style={{ borderBottom: `1px solid ${T.n100}`, cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = T.n50)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 16px', fontFamily: T.fMono, color: T.n900 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {c.name}
                      {c.isPii && <span style={{
                        padding: '1px 5px', borderRadius: 4,
                        background: '#fee2e2', color: '#991b1b',
                        fontSize: 8, fontWeight: 700,
                      }}>PII</span>}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4,
                      background: tc.bg, color: tc.fg,
                      fontFamily: T.fMono, fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>{c.type}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: T.fMono, color: T.n600 }}>{c.tableName}</td>
                  <td style={{ padding: '10px 16px', color: T.n600 }}>{c.category}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={4} style={{ padding: 32, textAlign: 'center', color: T.n500 }}>
                  No columns match the search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
