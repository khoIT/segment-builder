import { BadRequestException } from '@nestjs/common';
import type { MetricSpec, SourceBinding } from '@bedrock/contracts';
import { normalizeMetricSpec } from '@bedrock/contracts';

// ─────────────────────────────────────────────────────────────────────
// MetricSpec → Postgres SQL compiler. Pure function; no IO.
//
// Single-source output (sources.length === 1):
//   SELECT date_trunc('day', p."eventDate")::date AS date,
//          p."key"                                AS key,
//          <agg_fn>(...)                          AS value
//   FROM "sourceTable" AS p
//   WHERE p."eventDate" >= now() - INTERVAL '<days> days'
//     AND <filters>
//     AND p."key" IS NOT NULL
//   GROUP BY 1, 2;
//
// Multi-source output adds INNER JOINs before the WHERE clause.
// All identifiers (table, alias, column) go through the IDENT whitelist.
// Filter values are always parameterised — no string interpolation.
// ─────────────────────────────────────────────────────────────────────

// Lowercase-only whitelist matching the SafeIdent rule in contracts.
const IDENT = /^[a-z0-9_]+$/;
const MAX_SOURCES = 3;

export type CompiledMetricSql = {
  sql: string;
  params: unknown[];
  warnings: string[];
};

// ─── Identifier helpers ───────────────────────────────────────────────

function safeIdent(name: string): string {
  if (!IDENT.test(name)) {
    throw new BadRequestException(`unsafe identifier: ${JSON.stringify(name)}`);
  }
  return `"${name}"`;
}

// Qualify a column reference: if already `alias.col`, validate both
// parts and return `"alias"."col"`. If bare `col`, prefix with
// the provided default alias.
function qualifyCol(raw: string, defaultAlias: string): string {
  const parts = raw.split('.');
  if (parts.length === 2) {
    const [alias, col] = parts as [string, string];
    return `${safeIdent(alias)}.${safeIdent(col)}`;
  }
  return `${safeIdent(defaultAlias)}.${safeIdent(raw)}`;
}

// ─── Sub-builders ─────────────────────────────────────────────────────

function buildFromClause(primary: SourceBinding): string {
  return `FROM ${safeIdent(primary.table)} AS ${safeIdent(primary.alias)}`;
}

function buildJoinClauses(
  joins: MetricSpec['joins'],
  sources: MetricSpec['sources'],
): string {
  if (!joins.length) return '';
  // Build alias→table map for lookup.
  const aliasTable = new Map(sources.map((s) => [s.alias, s.table]));
  return joins
    .map((j) => {
      const rightTable = aliasTable.get(j.rightAlias);
      if (!rightTable) {
        throw new BadRequestException(
          `join rightAlias "${j.rightAlias}" has no matching source`,
        );
      }
      const onClauses = j.on.map(
        (p) =>
          `${safeIdent(j.leftAlias)}.${safeIdent(p.leftCol)} = ${safeIdent(j.rightAlias)}.${safeIdent(p.rightCol)}`,
      );
      return `INNER JOIN ${safeIdent(rightTable)} AS ${safeIdent(j.rightAlias)} ON ${onClauses.join(' AND ')}`;
    })
    .join('\n');
}

function buildAggExpr(
  agg: MetricSpec['aggregation'],
  primaryAlias: string,
): string {
  if (agg.fn === 'count') return 'count(*)';

  if (!agg.column) {
    throw new BadRequestException(`aggregation ${agg.fn} requires a column`);
  }
  const colRef = qualifyCol(agg.column, primaryAlias);

  if (agg.fn === 'count_distinct') {
    return `count(DISTINCT ${colRef})`;
  }

  // sum / avg / max / min
  const inner =
    agg.cast === 'numeric'
      ? `CAST(${colRef} AS numeric)`
      : agg.cast === 'integer'
        ? `CAST(${colRef} AS integer)`
        : colRef;
  return `${agg.fn}(${inner})`;
}

function buildFilterClauses(
  filters: MetricSpec['filters'],
  primaryAlias: string,
  params: unknown[],
): string {
  if (!filters?.length) return '';
  const conds = filters.map((f) => {
    const col = qualifyCol(f.column, primaryAlias);
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
          return f.op === 'in' ? 'FALSE' : 'TRUE';
        }
        const placeholders = arr
          .map((v) => {
            params.push(v);
            return `$${params.length}`;
          })
          .join(', ');
        return `${col} ${f.op === 'in' ? 'IN' : 'NOT IN'} (${placeholders})`;
      }
      default:
        throw new BadRequestException(`unsupported filter op: ${(f as { op: string }).op}`);
    }
  });
  return conds.join(' AND ');
}

// ─── Main compiler ────────────────────────────────────────────────────

export function compileMetricSpec(specOrRaw: unknown): CompiledMetricSql {
  // Normalise at entry — accepts both legacy {cohort} and new {sources} shapes.
  const spec: MetricSpec = normalizeMetricSpec(specOrRaw);

  const params: unknown[] = [];
  const warnings: string[] = [];

  // Defensive cap — zod already enforces max(3) at parse, but double-check.
  if (spec.sources.length > MAX_SOURCES) {
    throw new BadRequestException(
      `metric spec may have at most ${MAX_SOURCES} sources`,
    );
  }

  const primary = spec.sources[0]!;
  const primaryAlias = primary.alias;

  const eventDate = safeIdent(spec.window.eventDateColumn);
  const keyCol = `${safeIdent(primaryAlias)}.${safeIdent(primary.keyColumn)}`;
  const dateExpr = `date_trunc('day', ${safeIdent(primaryAlias)}.${eventDate})::date`;

  // Window clause — days literal is safe (zod: positive integer ≤ 365).
  let windowClause: string;
  if (spec.window.kind === 'rolling_days') {
    if (!Number.isInteger(spec.window.days) || spec.window.days <= 0) {
      throw new BadRequestException('window.days must be a positive integer');
    }
    windowClause = `${safeIdent(primaryAlias)}.${eventDate} >= (now() - INTERVAL '${spec.window.days} days')`;
  } else {
    warnings.push(
      'cohort_relative window is partially supported — will join against install_date if available',
    );
    windowClause = `${safeIdent(primaryAlias)}.${eventDate} >= (now() - INTERVAL '${spec.window.days} days')`;
  }

  const aggExpr = buildAggExpr(spec.aggregation, primaryAlias);
  const filterExpr = buildFilterClauses(spec.filters ?? [], primaryAlias, params);
  const fromClause = buildFromClause(primary);
  const joinClauses = buildJoinClauses(spec.joins, spec.sources);

  if (spec.sources.length > 1) {
    warnings.push('multi-source: ensure join keys produce expected fanout');
  }

  const wherePieces = [windowClause, `${keyCol} IS NOT NULL`];
  if (filterExpr) wherePieces.unshift(filterExpr);

  const lines: string[] = [
    'SELECT',
    `  ${dateExpr} AS date,`,
    `  ${keyCol} AS key,`,
    `  ${aggExpr} AS value`,
    fromClause,
  ];
  if (joinClauses) lines.push(joinClauses);
  lines.push(`WHERE ${wherePieces.join(' AND ')}`);
  lines.push('GROUP BY 1, 2');

  return { sql: lines.join('\n'), params, warnings };
}
