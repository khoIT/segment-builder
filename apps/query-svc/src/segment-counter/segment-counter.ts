import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ProfilePgClient } from '../trino-explorer/profile-pg-client';

// ─────────────────────────────────────────────────────────────────────
// SegmentCounter — runs a metric-spec-based segment criteria against
// the per-pipeline `metric_<id>_values` tables and returns audience size.
//
// Criteria shape (M2 contract):
//   { all: [{ metric: 'name|id', op: '>=', value: 50 }, ...] }
//   { any: [{ metric: 'name|id', op: '<',  value: 7  }, ...] }
//
// Each filter resolves to a SELECT of `key` from the metric's value table
// for the latest materialized date, predicate applied. Filters in `all`
// are intersected by key; `any` are unioned. Segment count = number of
// distinct keys after combining.
// ─────────────────────────────────────────────────────────────────────

const ID_RE = /^[a-z0-9_]+$/;
const SAFE_OPS = new Set(['=', '!=', '>', '<', '>=', '<=']);

export type SegmentFilter = {
  metric: string;     // metrics.id OR metrics.name; resolved to id below
  op: string;
  value: unknown;
};

export type SegmentCriteria =
  | { all: SegmentFilter[]; any?: never }
  | { any: SegmentFilter[]; all?: never };

@Injectable()
export class SegmentCounter {
  private readonly log = new Logger(SegmentCounter.name);

  constructor(private readonly pg: ProfilePgClient) {}

  // Resolve a metric reference (id or name) to its canonical id by
  // querying the `metrics` table. Returns null if unknown.
  private async resolveMetricId(ref: string): Promise<string | null> {
    const pool = this.pg.pg();
    // Try by id first (cheap PK lookup), then by name.
    const byId = await pool.query<{ id: string }>(
      `SELECT id FROM metrics WHERE id = $1 LIMIT 1`,
      [ref],
    );
    if (byId.rows[0]) return byId.rows[0].id;
    const byName = await pool.query<{ id: string }>(
      `SELECT id FROM metrics WHERE name = $1 LIMIT 1`,
      [ref],
    );
    return byName.rows[0]?.id ?? null;
  }

  // Determine if a per-pipeline value table exists. Distinguishes
  // "unmaterialized metric" from "missing metric".
  private async tableExists(name: string): Promise<boolean> {
    const pool = this.pg.pg();
    const res = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1
       ) AS exists`,
      [name],
    );
    return !!res.rows[0]?.exists;
  }

  async count(criteria: SegmentCriteria): Promise<{ count: number; resolved: { metric: string; rowsBefore: number }[]; warnings: string[] }> {
    const filters = (criteria.all ?? criteria.any ?? []) as SegmentFilter[];
    const combine: 'all' | 'any' = criteria.all ? 'all' : 'any';
    if (!filters.length) {
      return { count: 0, resolved: [], warnings: ['no filters provided'] };
    }

    const params: unknown[] = [];
    const ctes: string[] = [];
    const cteNames: string[] = [];
    const resolved: { metric: string; rowsBefore: number }[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < filters.length; i++) {
      const f = filters[i];
      if (!f.metric || !f.op || f.value === undefined) {
        warnings.push(`filter ${i}: missing metric/op/value`);
        continue;
      }
      if (!SAFE_OPS.has(f.op)) {
        throw new BadRequestException(`unsupported op: ${f.op}`);
      }
      const id = await this.resolveMetricId(String(f.metric));
      if (!id) {
        warnings.push(`metric not found: ${f.metric}`);
        continue;
      }
      if (!ID_RE.test(id)) {
        throw new BadRequestException(`unsafe metric id: ${id}`);
      }
      const valueTable = `metric_${id}_values`;
      if (!(await this.tableExists(valueTable))) {
        warnings.push(`metric ${id} has no materialized values yet`);
        continue;
      }

      const num = Number(f.value);
      const v = Number.isFinite(num) ? num : f.value;
      params.push(v);
      // Latest-date snapshot: pick keys from the most recent date row.
      // Cheap: PK is (date, key); MAX(date) is one index probe.
      const cte = `f${i}`;
      cteNames.push(cte);
      ctes.push(`${cte} AS (
         SELECT DISTINCT key FROM "${valueTable}"
         WHERE date = (SELECT MAX(date) FROM "${valueTable}")
           AND value ${f.op} $${params.length}
       )`);
      const before = await this.pg.pg().query<{ n: number }>(
        `SELECT count(DISTINCT key)::int AS n FROM "${valueTable}"
         WHERE date = (SELECT MAX(date) FROM "${valueTable}")`,
      );
      resolved.push({ metric: id, rowsBefore: Number(before.rows[0]?.n ?? 0) });
    }

    if (!cteNames.length) {
      return { count: 0, resolved, warnings: warnings.length ? warnings : ['no resolvable filters'] };
    }

    const combiner = combine === 'all' ? ' INTERSECT ' : ' UNION ';
    const sql = `WITH ${ctes.join(', ')}
                 SELECT count(*)::int AS n FROM (
                   ${cteNames.map((n) => `SELECT key FROM ${n}`).join(combiner)}
                 ) t`;

    this.log.debug(`segment-count combine=${combine} filters=${cteNames.length}`);
    const res = await this.pg.pg().query<{ n: number }>(sql, params);
    return {
      count: Number(res.rows[0]?.n ?? 0),
      resolved,
      warnings,
    };
  }
}
