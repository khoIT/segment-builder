import { BadRequestException } from '@nestjs/common';
import type { MetricSpec } from '@bedrock/contracts';

// ─────────────────────────────────────────────────────────────────────
// MetricSpec → Postgres SQL compiler. Pure function; no IO.
//
// Output shape (rolling_days window):
//   SELECT date_trunc('day', "<eventDate>")::date AS date,
//          "<key>"                                AS key,
//          <agg_fn>(...)                          AS value
//   FROM "<sourceTable>"
//   WHERE "<eventDate>" >= now() - INTERVAL '<days> days'
//     AND <filters>
//     AND "<key>" IS NOT NULL
//   GROUP BY 1, 2;
//
// Compiler targets Postgres because all our raw event tables + the
// catalog_<id> physical tables live in Postgres. Trino path opens
// later when Bedrock points at real cfm_vn (G2 + G3 in vision doc).
// ─────────────────────────────────────────────────────────────────────

const IDENT = /^[a-z0-9_]+$/i;

export type CompiledMetricSql = {
  sql: string;
  params: unknown[];
  warnings: string[];
};

function quoteIdent(name: string): string {
  if (!IDENT.test(name)) {
    throw new BadRequestException(`unsafe identifier: ${JSON.stringify(name)}`);
  }
  return `"${name}"`;
}

function compileAggregation(agg: MetricSpec['aggregation']): string {
  switch (agg.fn) {
    case 'count':
      return 'count(*)';
    case 'sum':
    case 'avg':
    case 'max':
    case 'min': {
      if (!agg.column) {
        throw new BadRequestException(`aggregation ${agg.fn} requires a column`);
      }
      const col = quoteIdent(agg.column);
      const inner = agg.cast === 'numeric'
        ? `CAST(${col} AS numeric)`
        : agg.cast === 'integer'
          ? `CAST(${col} AS integer)`
          : col;
      return `${agg.fn}(${inner})`;
    }
    case 'count_distinct': {
      if (!agg.column) {
        throw new BadRequestException(`count_distinct requires a column`);
      }
      return `count(DISTINCT ${quoteIdent(agg.column)})`;
    }
    default:
      throw new BadRequestException(`unsupported aggregation fn: ${agg.fn}`);
  }
}

function compileFilters(
  filters: MetricSpec['filters'],
  params: unknown[],
): string {
  if (!filters?.length) return '';
  const conds = filters.map((f) => {
    const col = quoteIdent(f.column);
    switch (f.op) {
      case '=':
      case '!=':
      case '>':
      case '<':
      case '>=':
      case '<=': {
        params.push(f.value);
        return `${col} ${f.op} $${params.length}`;
      }
      case 'in':
      case 'not_in': {
        const arr = Array.isArray(f.value) ? f.value : [f.value];
        if (!arr.length) {
          // Empty IN list — short-circuit to constant. Postgres
          // requires at least one value otherwise.
          return f.op === 'in' ? 'FALSE' : 'TRUE';
        }
        const placeholders = arr.map((v) => {
          params.push(v);
          return `$${params.length}`;
        }).join(', ');
        return `${col} ${f.op === 'in' ? 'IN' : 'NOT IN'} (${placeholders})`;
      }
      default:
        throw new BadRequestException(`unsupported filter op: ${f.op}`);
    }
  });
  return conds.join(' AND ');
}

export function compileMetricSpec(spec: MetricSpec): CompiledMetricSql {
  const params: unknown[] = [];
  const warnings: string[] = [];

  const sourceTable = quoteIdent(spec.cohort.sourceTable);
  const keyColumn = quoteIdent(spec.cohort.keyColumn);
  const eventDate = quoteIdent(spec.window.eventDateColumn);
  const aggExpr = compileAggregation(spec.aggregation);
  const filterExpr = compileFilters(spec.filters ?? [], params);

  let windowClause: string;
  if (spec.window.kind === 'rolling_days') {
    // Pass days as a literal — INTERVAL with a parameter requires
    // a more verbose CAST; this is safe because zod constrains days
    // to a positive integer ≤ 365.
    if (!Number.isInteger(spec.window.days) || spec.window.days <= 0) {
      throw new BadRequestException(`window.days must be a positive integer`);
    }
    windowClause = `${eventDate} >= (now() - INTERVAL '${spec.window.days} days')`;
  } else {
    // cohort_relative: requires a join on a per-user cohort_start; we
    // emit a placeholder that the materializer can JOIN against the
    // master_user_profile_dx.install_date column. P06 will tighten;
    // for now we warn so the UI can show a banner.
    warnings.push('cohort_relative window is partially supported — will join against install_date if available');
    windowClause = `${eventDate} >= (now() - INTERVAL '${spec.window.days} days')`;
  }

  const wherePieces = [windowClause, `${keyColumn} IS NOT NULL`];
  if (filterExpr) wherePieces.unshift(filterExpr);

  const sql = [
    'SELECT',
    `  date_trunc('day', ${eventDate})::date AS date,`,
    `  ${keyColumn} AS key,`,
    `  ${aggExpr} AS value`,
    `FROM ${sourceTable}`,
    `WHERE ${wherePieces.join(' AND ')}`,
    'GROUP BY 1, 2',
  ].join('\n');

  return { sql, params, warnings };
}
