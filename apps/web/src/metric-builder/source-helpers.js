// Pure helpers for multi-source metric authoring.
// No React, no side-effects — easy to unit-test.

const ALIASES = ['p', 's', 't'];

/**
 * Return the alias for the Nth source (0-indexed).
 * 0 → 'p', 1 → 's', 2 → 't'
 */
export function aliasForIndex(idx) {
  return ALIASES[idx] ?? ALIASES[ALIASES.length - 1];
}

/**
 * Heuristic: pick the best key column for a source table.
 * Prefers 'vopenid', then any column matching /openid|_user_id$/, then columns[0].
 * Returns column name string or null if columns is empty.
 * @param {Array<{name: string, type?: string}>} columns
 * @returns {string|null}
 */
export function pickDefaultKey(columns) {
  if (!columns || columns.length === 0) return null;
  const exact = columns.find((c) => c.name === 'vopenid');
  if (exact) return exact.name;
  const pattern = columns.find((c) => /openid|_user_id$/.test(c.name));
  if (pattern) return pattern.name;
  return columns[0].name;
}

/**
 * Given two column arrays, find the best join column pair.
 * Strategy:
 *   1. Both have 'vopenid' → vopenid=vopenid
 *   2. Both have same-named column matching /openid|_id$/ → that column
 *   3. Any common column name → first match
 *   4. Fallback: first column of each table
 * @param {Array<{name: string}>} leftCols
 * @param {Array<{name: string}>} rightCols
 * @returns {{ leftCol: string, rightCol: string, autoDetected: boolean }}
 */
export function pickJoinColumns(leftCols, rightCols) {
  if (!leftCols?.length || !rightCols?.length) {
    return { leftCol: leftCols?.[0]?.name ?? '', rightCol: rightCols?.[0]?.name ?? '', autoDetected: false };
  }

  const leftNames = new Set(leftCols.map((c) => c.name));
  const rightNames = new Set(rightCols.map((c) => c.name));

  // Prefer vopenid
  if (leftNames.has('vopenid') && rightNames.has('vopenid')) {
    return { leftCol: 'vopenid', rightCol: 'vopenid', autoDetected: true };
  }

  // Same-named openid/*_id column
  for (const col of leftCols) {
    if (/openid|_id$/.test(col.name) && rightNames.has(col.name)) {
      return { leftCol: col.name, rightCol: col.name, autoDetected: true };
    }
  }

  // Any common column name
  for (const col of leftCols) {
    if (rightNames.has(col.name)) {
      return { leftCol: col.name, rightCol: col.name, autoDetected: true };
    }
  }

  // Fallback
  return { leftCol: leftCols[0].name, rightCol: rightCols[0].name, autoDetected: false };
}

/**
 * Build the new MetricSpec sources+joins shape from the wizard state.
 * `sourcesState` = [{table, alias, keyColumn}]
 * `joinsState`   = [{leftAlias, rightAlias, on: [{leftCol, rightCol}]}]
 */
export function buildSpecSources(sourcesState, joinsState) {
  return {
    sources: sourcesState.map((s) => ({
      table: s.table,
      alias: s.alias,
      keyColumn: s.keyColumn,
    })),
    joins: joinsState,
  };
}
