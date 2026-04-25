import React from 'react';
import { T, Icon, Input, Tabs, Card } from '../theme.jsx';

// Search input + Tables/Columns tabs + game chip strip. State lifted
// to the page (`index.jsx`) so the same query controls both tabs.

// Chips reflect games actually present in the seed data. PTG / TFB are
// placeholder studios in the games table but have zero catalog rows —
// adding chips for them would surface "0 results" branches that look
// like bugs. Add them back here once their seed data lands.
const GAME_CHIPS = [
  { value: 'all',   label: 'All games' },
  { value: 'CFM',   label: 'CFM' },
  { value: 'BLSTR', label: 'Ballistar' },
];

export function CatalogSearch({ search, setSearch, tab, setTab, game, setGame, tablesCount, columnsCount }) {
  return (
    <Card padding={0}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.n200}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, maxWidth: 480 }}>
          <Input
            leftIcon="search"
            placeholder="Search tables, columns, partition keys…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }} />
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'tables', label: `Tables ${tablesCount}` },
            { value: 'columns', label: `Columns ${columnsCount}` },
          ]}
        />
      </div>
      <div style={{ padding: '10px 18px', display: 'flex', gap: 8, alignItems: 'center', background: T.n50 }}>
        {GAME_CHIPS.map((g) => {
          const active = game === g.value;
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => setGame(g.value)}
              style={{
                padding: '4px 12px',
                fontFamily: T.fSans,
                fontSize: 12,
                fontWeight: 600,
                color: active ? T.n0 : T.n700,
                background: active ? T.brand : T.n0,
                border: `1px solid ${active ? T.brand : T.n200}`,
                borderRadius: 999,
                cursor: 'pointer',
              }}
            >
              {g.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
