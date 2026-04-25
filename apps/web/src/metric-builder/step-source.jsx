import React from 'react';
import { T, Icon, Card } from '../theme.jsx';
import { useDataCatalogTable } from '../api/hooks.js';
import { SourceMultiSelect } from './source-multi-select.jsx';
import { JoinKeyPicker } from './join-key-picker.jsx';
import { aliasForIndex, pickDefaultKey, pickJoinColumns } from './source-helpers.js';

// Step 1: pick source tables (1–3) + join keys for additional sources.
// Props: sources, joins (from index), allTables (raw_event), loading, onChange({sources,joins})

export function StepSource({ sources, joins, allTables, loading, onChange }) {
  // Fetch detail for the primary source (for the sample preview).
  const primaryTable = sources[0]?.table ?? null;
  const tableDetailQ = useDataCatalogTable(primaryTable);
  const tableDetail = tableDetailQ.data;

  // Collect table details for all selected sources (for join column pickers).
  const tableDetailsMap = useTableDetailsMap(sources);

  function handleAdd(catalogTable) {
    const idx = sources.length;
    const alias = aliasForIndex(idx);
    const cols = catalogTable.columns ?? [];
    const keyColumn = pickDefaultKey(cols) ?? '';

    const newSource = { table: catalogTable.id, alias, keyColumn };
    const newSources = [...sources, newSource];

    // Build join for the new source against the primary source.
    let newJoins = [...joins];
    if (newSources.length > 1) {
      const primarySrc = newSources[0];
      const primaryDetail = tableDetailsMap[primarySrc.table];
      const primaryCols = primaryDetail?.columns ?? [];
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

    // If we removed the primary (idx=0), re-alias all remaining sources.
    if (idx === 0 && newSources.length > 0) {
      newSources = newSources.map((s, i) => ({ ...s, alias: aliasForIndex(i) }));
    }

    // Drop any joins referencing the removed alias; update aliases if primary was removed.
    let newJoins = joins.filter(
      (j) => j.leftAlias !== removedAlias && j.rightAlias !== removedAlias,
    );
    if (idx === 0 && newSources.length > 0) {
      // Rebuild joins with re-aliased sources (simpler: drop all and re-derive).
      newJoins = rebuildJoinsAfterPrimaryRemoval(newSources, tableDetailsMap);
    }

    onChange({ sources: newSources, joins: newJoins });
  }

  function handleJoinsChange(newJoins) {
    onChange({ sources, joins: newJoins });
  }

  const sampleCols = tableDetail?.sample?.columns ?? [];
  const sampleRows = tableDetail?.sample?.rows ?? [];
  const rawTables = (allTables ?? []).filter((t) => t.layer === 'raw_event');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 880 }}>
      <SectionHead
        label="1 · Pick source tables"
        hint="Select up to 3 raw-event tables. Additional sources are joined on a shared key."
      />

      <SourceMultiSelect
        sources={sources}
        allTables={rawTables}
        loading={loading}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />

      {sources.length > 1 && (
        <JoinKeyPicker
          sources={sources}
          joins={joins}
          tableDetails={tableDetailsMap}
          onChange={handleJoinsChange}
        />
      )}

      {tableDetail && <SamplePreview tableDetail={tableDetail} />}
    </div>
  );
}

// ─── Sub-components & helpers ────────────────────────────────────────────────

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

// Fixed 3 hook calls — React hook count must be stable regardless of sources.length.
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

// Re-derive joins after primary removal (best-effort; empty cols if detail not loaded).
function rebuildJoinsAfterPrimaryRemoval(newSources, tableDetailsMap) {
  return newSources.slice(1).map((secondary, i) => {
    const primary = newSources[0];
    const { leftCol, rightCol, autoDetected } = pickJoinColumns(
      tableDetailsMap[primary.table]?.columns ?? [],
      tableDetailsMap[secondary.table]?.columns ?? [],
    );
    return { leftAlias: primary.alias, rightAlias: secondary.alias, on: [{ leftCol, rightCol }], autoDetected };
  });
}
