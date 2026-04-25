import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ProfilePgClient } from '../trino-explorer/profile-pg-client';
import { compileMetricSpec } from '../driver/sql-builder/metric.builder';
import type { MetricSpec } from '@bedrock/contracts';

// ─────────────────────────────────────────────────────────────────────
// MetricMaterializer — runs a compiled MetricSpec against Postgres and
// upserts results into a per-pipeline `metric_<id>_values` table.
// Idempotent: re-running the same pipeline overwrites overlapping
// (date, key) rows. Creates the value table on first run.
//
// We piggy-back on ProfilePgClient's pool (already wired with
// DATABASE_URL). One pool, one process — KISS.
// ─────────────────────────────────────────────────────────────────────

const ID_RE = /^[a-z0-9_]+$/i;

export type MaterializeRequest = {
  pipelineId: string;
  spec: MetricSpec;
};

export type MaterializeOutcome = {
  pipelineId: string;
  rowCount: number;
  durationMs: number;
  sampleValue: number | null;
};

@Injectable()
export class MetricMaterializer {
  private readonly log = new Logger(MetricMaterializer.name);

  constructor(private readonly pg: ProfilePgClient) {}

  // Returns the canonical Postgres table name for a pipeline's
  // materialized values. Identifier-safe.
  static valueTable(pipelineId: string): string {
    if (!ID_RE.test(pipelineId)) {
      throw new BadRequestException(`unsafe pipelineId: ${JSON.stringify(pipelineId)}`);
    }
    return `metric_${pipelineId}_values`;
  }

  async materialize(req: MaterializeRequest): Promise<MaterializeOutcome> {
    const { pipelineId, spec } = req;
    const valueTable = MetricMaterializer.valueTable(pipelineId);
    const { sql: bodySql, params } = compileMetricSpec(spec);

    const pool = this.pg.pg();
    const client = await pool.connect();
    const t0 = Date.now();
    try {
      await client.query('BEGIN');

      // CREATE TABLE IF NOT EXISTS — value column is double precision so
      // both integer counts and float averages share the same shape.
      await client.query(
        `CREATE TABLE IF NOT EXISTS "${valueTable}" (
           date  date NOT NULL,
           key   text NOT NULL,
           value double precision NOT NULL,
           materialized_at timestamptz NOT NULL DEFAULT now(),
           PRIMARY KEY (date, key)
         )`,
      );

      // Idempotency: clear overlapping date rows first. Cheap when the
      // value table is small; if/when this grows, swap for ON CONFLICT
      // with a date-derived watermark. P13 owns incremental refresh.
      await client.query(`DELETE FROM "${valueTable}"`);

      // Insert from the compiled query. We wrap as `INSERT ... SELECT`
      // so Postgres carries the params positional list through.
      const insertSql = `INSERT INTO "${valueTable}" (date, key, value) ${bodySql}`;
      const result = await client.query(insertSql, params);
      const rowCount = result.rowCount ?? 0;

      // Cheap sample for the materialize toast — first non-null value.
      let sampleValue: number | null = null;
      if (rowCount > 0) {
        const sample = await client.query(
          `SELECT value FROM "${valueTable}" ORDER BY date DESC LIMIT 1`,
        );
        const v = sample.rows[0]?.value;
        sampleValue = v == null ? null : Number(v);
      }

      await client.query('COMMIT');
      const durationMs = Date.now() - t0;
      this.log.log(`materialize ${pipelineId} → ${rowCount} rows in ${durationMs}ms`);
      return { pipelineId, rowCount, durationMs, sampleValue };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      this.log.error(`materialize ${pipelineId} failed: ${(e as Error).message}`);
      throw e;
    } finally {
      client.release();
    }
  }
}
