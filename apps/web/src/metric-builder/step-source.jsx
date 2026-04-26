import React from 'react';
import { T, Icon, Card } from '../theme.jsx';
import { useDataCatalogTable } from '../api/hooks.js';
import { SourceMultiSelect } from './source-multi-select.jsx';
import { TemplatesFromCatalog } from './templates-from-catalog.jsx';
import { aliasForIndex, pickDefaultKey, pickJoinColumns } from './source-helpers.js';

// Step 1: pick source tables (1–3) + join keys for additional sources.
// Layout (top → bottom):
//   1. Section heading + hint
//   2. SourceMultiSelect — stacked source cards (joins inline within each
//      joined card; no separate "Join conditions" panel anymore)
//   3. SamplePreview for primary source
//   4. TemplatesFromCatalog — collapsible reference of existing metrics
//
// Props: sources, joins, allTables, loading, onChange, onUseTemplate

export function StepSource({ sources, joins, allTables, loading, onChange, onUseTemplate }) {
  const primaryTable = sources[0]?.table ?? null;
  const tableDetailQ = useDataCatalogTable(primaryTable);
  const tableDetail = tableDetailQ.data;

  const tableDetailsMap = useTableDetailsMap(sources);

  function handleAdd(catalogTable) {
    const idx = sources.length;
    const alias = aliasForIndex(idx);
    const cols = catalogTable.columns ?? [];
    const keyColumn = pickDefaultKey(cols) ?? '';

    const newSource = { table: catalogTable.id, alias, keyColumn };
    const newSources = [...sources, newSource];

    let newJoins = [...joins];
    if (newSources.length > 1) {
      const primarySrc = newSources[0];
      const primaryCols = tableDetailsMap[primarySrc.table]?.columns ?? [];
      const { leftCol, rightCol, autoDetected } = pickJoinColumns(primaryCols, cols);
      newJoins = [
        ...joins,
        {
          leftAlias: primarySrc.alias,
          rightAlias: alias,
          on: [{ leftCol, rightCol }],
          autoDetected,
        },
      ];
    }
    onChange({ sources: newSources, joins: newJoins });
  }

  function handleRemove(idx) {
    const removedAlias = sources[idx]?.alias;
    let newSources = sources.filter((_, i) => i !== idx);

    if (idx === 0 && newSources.length > 0) {
      newSources = newSources.map((s, i) => ({ ...s, alias: aliasForIndex(i) }));
    }

    let newJoins = joins.filter(
      (j) => j.leftAlias !== removedAlias && j.rightAlias !== removedAlias,
    );
    if (idx === 0 && newSources.length > 0) {
      newJoins = rebuildJoinsAfterPrimaryRemoval(newSources, tableDetailsMap);
    }

    onChange({ sources: newSources, joins: newJoins });
  }

  function handleSetKey(idx, col) {
    const newSources = sources.map((s, i) => i === idx ? { ...s, keyColumn: col } : s);
    onChange({ sources: newSources, joins });
  }

  function handleSetJoin(joinIdx, pair) {
    const next = joins.map((j, i) => i === joinIdx
      ? { ...j, on: [pair], autoDetected: false }
      : j);
    onChange({ sources, joins: next });
  }

  const rawTables = (allTables ?? []).filter((t) => t.layer === 'raw_event');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 880 }}>
      <SectionHead
        label="1 · Pick source tables"
        hint="Pick at least one raw-event table. Add up to 2 more if your metric needs to join data across tables (e.g. logins + recharges)."
      />

      <SourceMultiSelect
        sources={sources}
        joins={joins}
        allTables={rawTables}
        loading={loading}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onSetKey={handleSetKey}
        onSetJoin={handleSetJoin}
      />

      {tableDetail && <SamplePreview tableDetail={tableDetail} />}

      <TemplatesFromCatalog onUseTemplate={onUseTemplate} />
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

function SamplePreview({ tableDetail }) {
  const cols = tableDetail?.sample?.columns ?? [];
  const rows = tableDetail?.sample?.rows ?? [];
  return (
    <Card padding={0}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.n100}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="eye" size={14} color={T.n500} />
        <span style={{ fontSize: 11, color: T.n500, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Sample · {tableDetail.name}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: T.n500, fontFamily: T.fMono }}>{(tableDetail.columns ?? []).length} cols</span>
      </div>
      <div style={{ overflow: 'auto', maxHeight: 220 }}>
        {rows.length === 0
          ? <div style={{ padding: 16, color: T.n500, fontSize: 12 }}>No sample available.</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: T.fMono }}>
              <thead><tr style={{ background: T.n50 }}>
                {cols.map((c) => <th key={c} style={{ padding: '6px 10px', textAlign: 'left', color: T.n600, borderBottom: `1px solid ${T.n200}`, fontWeight: 600 }}>{c}</th>)}
              </tr></thead>
              <tbody>
                {rows.slice(0, 8).map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.n100}` }}>
                    {cols.map((c, j) => {
                      const cell = Array.isArray(row) ? row[j] : row?.[c];
                      return (
                        <td key={c} style={{ padding: '5px 10px', color: T.n800, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cell == null ? <span style={{ color: T.n400, fontStyle: 'italic' }}>null</span> : typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </Card>
  );
}

function useTableDetailsMap(sources) {
  const t0 = useDataCatalogTable(sources[0]?.table ?? null);
  const t1 = useDataCatalogTable(sources[1]?.table ?? null);
  const t2 = useDataCatalogTable(sources[2]?.table ?? null);
  return React.useMemo(() => {
    const map = {};
    if (sources[0]?.table && t0.data) map[sources[0].table] = t0.data;
    if (sources[1]?.table && t1.data) map[sources[1].table] = t1.data;
    if (sources[2]?.table && t2.data) map[sources[2].table] = t2.data;
    return map;
  }, [sources, t0.data, t1.data, t2.data]);
}

function rebuildJoinsAfterPrimaryRemoval(newSources, tableDetailsMap) {
  return newSources.slice(1).map((secondary) => {
    const primary = newSources[0];
    const { leftCol, rightCol, autoDetected } = pickJoinColumns(
      tableDetailsMap[primary.table]?.columns ?? [],
      tableDetailsMap[secondary.table]?.columns ?? [],
    );
    return { leftAlias: primary.alias, rightAlias: secondary.alias, on: [{ leftCol, rightCol }], autoDetected };
  });
}
