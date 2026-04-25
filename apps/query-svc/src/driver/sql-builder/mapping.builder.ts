import { quoteIdent, quoteFqn } from './identifier';
import type { MappingSpec } from '@bedrock/contracts';

// ─────────────────────────────────────────────────────────────────────
// MappingSpec → Trino SQL translator. Mirrors the cfm-analysis SQL
// pattern: cohort CTE + per-enrichment CTE + per-window CTE + final
// LEFT JOIN by cohort key. PII columns are SHA-256 hashed in the
// outermost SELECT so raw values never leave Trino.
//
// Output shape matches `spec.outputColumns` exactly. Built-in identity
// columns (vopenid, roleid, install_date, ...) come from cohort or
// enrichment; everything else from window aggregations matched by
// alias name.
// ─────────────────────────────────────────────────────────────────────

export type BuildOpts = {
  catalog: string;        // 'iceberg'
  outputBatchSize?: number;
  // Optional row cap for safety; appended as LIMIT if non-zero.
  rowCap?: number;
};

export type BuiltMappingQuery = { sql: string; params: unknown[] };

// Render a literal Trino value safely for the formatter in trino-client.
// We push through `?` placeholders + bind param array; the formatter
// quotes strings, inlines numbers/booleans/dates.
function pushParam(params: unknown[], v: unknown): string {
  params.push(v);
  return '?';
}

function renderFilters(
  filters: { column: string; op: string; value?: unknown }[],
  alias: string,
  params: unknown[],
): string {
  if (!filters.length) return '';
  const conds = filters.map((f) => {
    const col = `${alias}.${quoteIdent(f.column)}`;
    switch (f.op) {
      case '=': case '!=': case '>': case '<': case '>=': case '<=':
        return `${col} ${f.op} ${pushParam(params, f.value)}`;
      case 'in':
      case 'not_in': {
        const arr = Array.isArray(f.value) ? (f.value as unknown[]) : [f.value];
        const ph = arr.map((v) => pushParam(params, v)).join(', ');
        return `${col} ${f.op === 'in' ? 'IN' : 'NOT IN'} (${ph})`;
      }
      case 'between':
      case 'not_between': {
        const [lo, hi] = (f.value as [unknown, unknown]) ?? [null, null];
        const a = pushParam(params, lo);
        const b = pushParam(params, hi);
        return `${col} ${f.op === 'between' ? 'BETWEEN' : 'NOT BETWEEN'} ${a} AND ${b}`;
      }
      case 'is_null':
        return `${col} IS NULL`;
      case 'is_not_null':
        return `${col} IS NOT NULL`;
      default:
        throw new Error(`unsupported filter op: ${f.op}`);
    }
  });
  return `WHERE ${conds.join(' AND ')}`;
}

function renderAggregation(
  agg: { alias: string; fn: string; args: string[]; cast?: string },
  alias: string,
): string {
  const args = agg.args.map((a) => (a === '*' ? '*' : `${alias}.${quoteIdent(a)}`)).join(', ');
  let expr: string;
  switch (agg.fn) {
    case 'count':
      expr = `COUNT(${args || '*'})`;
      break;
    case 'count_distinct':
      expr = `COUNT(DISTINCT ${args})`;
      break;
    case 'approx_distinct':
      expr = `approx_distinct(${args})`;
      break;
    case 'sum': case 'avg': case 'min': case 'max':
      expr = `${agg.fn.toUpperCase()}(${args})`;
      break;
    case 'min_by':
    case 'max_by':
      // args = [target, ordering_key] per Trino's min_by/max_by signature.
      if (agg.args.length !== 2) throw new Error(`${agg.fn} requires 2 args`);
      expr = `${agg.fn}(${alias}.${quoteIdent(agg.args[0])}, ${alias}.${quoteIdent(agg.args[1])})`;
      break;
    case 'first':
    case 'last':
      // Trino-flavour: emulate via min_by/max_by with a timestamp arg.
      expr = `${agg.fn === 'first' ? 'min_by' : 'max_by'}(${alias}.${quoteIdent(agg.args[0])}, ${alias}.${quoteIdent(agg.args[1] ?? agg.args[0])})`;
      break;
    default:
      throw new Error(`unsupported aggregation fn: ${agg.fn}`);
  }
  if (agg.cast) {
    const trinoType = ({
      integer: 'INTEGER',
      bigint: 'BIGINT',
      double: 'DOUBLE',
      string: 'VARCHAR',
      date: 'DATE',
      timestamp: 'TIMESTAMP',
      boolean: 'BOOLEAN',
    } as Record<string, string>)[agg.cast];
    if (trinoType) expr = `CAST(${expr} AS ${trinoType})`;
  }
  return `${expr} AS ${quoteIdent(agg.alias)}`;
}

export function buildMappingQuery(spec: MappingSpec, opts: BuildOpts): BuiltMappingQuery {
  const params: unknown[] = [];
  const catalog = opts.catalog;
  const game = spec.game;

  // ── cohort CTE ────────────────────────────────────────────────────
  // Implicit guard: cohort.keyColumn must be NOT NULL. A row without an
  // identity column can't participate in any downstream join and would
  // also violate the per-template wide table's PK on
  // (master_table_id, key). Keeps specs terse (no manual is_not_null).
  const cohort = spec.cohort;
  const cohortFqn = quoteFqn([catalog, game, cohort.sourceTable]);
  const cohortKey = quoteIdent(cohort.keyColumn);
  const cohortFilters = renderFilters(cohort.filters ?? [], 'c', params);
  const cohortDate = cohort.cohortDateColumn
    ? `, c.${quoteIdent(cohort.cohortDateColumn)} AS install_time`
    : '';
  const keyNotNull = `c.${cohortKey} IS NOT NULL`;
  const cohortWhere = cohortFilters
    ? `${cohortFilters} AND ${keyNotNull}`
    : `WHERE ${keyNotNull}`;

  let sql = `WITH cohort AS (\n  SELECT c.${cohortKey} AS ${cohortKey}${cohortDate}\n  FROM ${cohortFqn} c\n  ${cohortWhere}\n  GROUP BY 1${cohortDate ? ', 2' : ''}\n)`;

  // ── enrichment CTEs (one per enrichment) ─────────────────────────
  const enrichmentCtes: string[] = [];
  for (const e of spec.enrichments ?? []) {
    const fqn = quoteFqn([catalog, game, e.sourceTable]);
    const filters = renderFilters(e.filters ?? [], 'e', params);
    const aggSel = renderAggregation(e.aggregation, 'e');
    enrichmentCtes.push(
      `${quoteIdent(e.name)} AS (\n  SELECT e.${quoteIdent(e.joinKey)} AS ${quoteIdent(e.joinKey)}, ${aggSel}\n  FROM ${fqn} e\n  ${filters}\n  GROUP BY 1\n)`,
    );
  }
  if (enrichmentCtes.length) sql += `,\n${enrichmentCtes.join(',\n')}`;

  // ── window CTEs (one per (window, source) pair) ──────────────────
  // Each yields `(cohort_key, agg1, agg2, ...)`. Date filter is the
  // window boundary relative to cohort install_time when available;
  // falls back to a fixed N-day window otherwise.
  const windowCtes: string[] = [];
  const winNames: string[] = [];
  for (const w of spec.windows ?? []) {
    for (let si = 0; si < w.sources.length; si++) {
      const ws = w.sources[si];
      const cteName = `w_${w.label}_${si}`;
      winNames.push(cteName);
      const fqn = quoteFqn([catalog, game, ws.sourceTable]);
      const dateCol = `s.${quoteIdent(ws.dateColumn)}`;
      const userFilters = renderFilters(ws.filters ?? [], 's', params);
      const aggSelects = ws.aggregations.map((a) => renderAggregation(a, 's')).join(', ');
      // Window predicate: prefer cohort.install_time + N days; fallback
      // to last-N-days from now() when cohort lacks install_time.
      const winPred = cohort.cohortDateColumn
        ? `${dateCol} >= co.install_time AND ${dateCol} < date_add('day', ${w.days}, co.install_time)`
        : `${dateCol} >= date_add('day', -${w.days}, current_date)`;
      const cohortKeyId = quoteIdent(cohort.keyColumn);
      // Source-side user column may differ (etl_game_detail.playeropenid
      // vs cohort.vopenid). Alias it to the cohort key in the CTE output
      // so downstream LEFT JOINs all use the same column name.
      const sourceUserCol = quoteIdent(ws.userKey ?? cohort.keyColumn);
      const where = userFilters
        ? `${userFilters} AND ${winPred}`
        : `WHERE ${winPred}`;
      windowCtes.push(
        `${quoteIdent(cteName)} AS (\n  SELECT s.${sourceUserCol} AS ${cohortKeyId}, ${aggSelects}\n  FROM ${fqn} s\n  JOIN cohort co ON co.${cohortKeyId} = s.${sourceUserCol}\n  ${where}\n  GROUP BY 1\n)`,
      );
    }
  }
  if (windowCtes.length) sql += `,\n${windowCtes.join(',\n')}`;

  // ── Final SELECT ──────────────────────────────────────────────────
  // Resolve each outputColumn by name. PII columns wrap in
  // `to_hex(sha256(cast(... as varbinary)))` and slice the first 16 chars.
  const piiCols = new Set(spec.pii.hashColumns ?? []);
  const dropCols = new Set(spec.pii.dropColumns ?? []);
  const enrichmentByName = new Map((spec.enrichments ?? []).map((e) => [e.name, e]));

  const projections = spec.outputColumns
    .filter((c) => !dropCols.has(c.name))
    .map((c) => {
      const sourceExpr = resolveColumnSource(c.name, spec, enrichmentByName);
      const expr = piiCols.has(c.name)
        ? `substr(to_hex(sha256(CAST(${sourceExpr} AS VARBINARY))), 1, 16)`
        : sourceExpr;
      return `${expr} AS ${quoteIdent(c.name)}`;
    })
    .join(',\n  ');

  const joins = [
    ...(spec.enrichments ?? []).map((e) => `LEFT JOIN ${quoteIdent(e.name)} ON ${quoteIdent(e.name)}.${quoteIdent(e.joinKey)} = co.${quoteIdent(cohort.keyColumn)}`),
    ...winNames.map((n) => `LEFT JOIN ${quoteIdent(n)} ON ${quoteIdent(n)}.${quoteIdent(cohort.keyColumn)} = co.${quoteIdent(cohort.keyColumn)}`),
  ].join('\n  ');

  sql += `\nSELECT\n  ${projections}\nFROM cohort co\n  ${joins}`;
  if (opts.rowCap && opts.rowCap > 0) sql += `\nLIMIT ${opts.rowCap}`;

  return { sql, params };
}

// Heuristic resolver: identity columns come from cohort or enrichments;
// everything else looks like an aggregation alias coming from window
// CTEs. Caller is responsible for keeping spec.outputColumns aligned
// with what aggregations actually produce.
function resolveColumnSource(
  name: string,
  spec: MappingSpec,
  enrichmentByName: Map<string, { name: string; aggregation: { alias: string } }>,
): string {
  // Cohort identity column (e.g. vopenid).
  if (name === spec.cohort.keyColumn) return `co.${quoteIdent(name)}`;
  if (spec.cohort.cohortDateColumn && (name === 'install_date' || name === 'install_time')) {
    return `co.install_time`;
  }
  // Enrichment alias match.
  for (const e of enrichmentByName.values()) {
    if (e.aggregation.alias === name) return `${quoteIdent(e.name)}.${quoteIdent(name)}`;
  }
  // Window aggregation: scan all window sources for matching alias.
  for (const w of spec.windows ?? []) {
    for (let si = 0; si < w.sources.length; si++) {
      const ws = w.sources[si];
      for (const a of ws.aggregations) {
        if (a.alias === name) return `${quoteIdent(`w_${w.label}_${si}`)}.${quoteIdent(name)}`;
      }
    }
  }
  // Pass-through cohort column (e.g. country_code, platform sourced
  // directly from the cohort row). We don't currently SELECT these
  // through cohort CTE; emit a NULL placeholder so build doesn't break.
  return `CAST(NULL AS VARCHAR)`;
}
