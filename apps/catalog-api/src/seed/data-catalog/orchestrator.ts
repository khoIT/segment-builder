import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '../../db/schema';
import { CATALOG_SPECS, TOTAL_COLUMNS, TOTAL_ROWS, type CatalogTableSpec, type ColType } from './specs';
import { generateRows, type GeneratedRow } from './generate-synthetic';
import { loadAllRawFromTrinoMock, type RawLoadResult } from './load-trino-mock-raw';
import { ALL_PIPELINES, PIPELINE_BY_CATALOG_ID, runPipeline, type PipelineSpec } from './derive-from-local';

const PG_TYPE: Record<ColType, string> = {
  string:    'text',
  int:       'integer',
  bigint:    'bigint',
  double:    'double precision',
  date:      'date',
  timestamp: 'timestamptz',
  boolean:   'boolean',
  json:      'jsonb',
};

const BATCH_SIZE = 1000;
const ID_RE = /^[a-z0-9_]+$/;

function assertSafeIdent(s: string): void {
  if (!ID_RE.test(s)) throw new Error(`unsafe identifier: ${s}`);
}

function physicalTableName(spec: CatalogTableSpec): string {
  assertSafeIdent(spec.id);
  return `catalog_${spec.id}`;
}

async function ensurePhysicalTable(pool: Pool, spec: CatalogTableSpec) {
  const tbl = physicalTableName(spec);
  const colsSql = spec.columns.map((c) => {
    assertSafeIdent(c.name);
    return `"${c.name}" ${PG_TYPE[c.type]}`;
  }).join(', ');

  await pool.query(`CREATE TABLE IF NOT EXISTS "${tbl}" (${colsSql})`);
  await pool.query(`TRUNCATE "${tbl}"`);
}

async function bulkInsert(pool: Pool, spec: CatalogTableSpec, rows: GeneratedRow[]) {
  if (rows.length === 0) return;
  const tbl = physicalTableName(spec);
  const colNames = spec.columns.map((c) => `"${c.name}"`).join(', ');

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const params: unknown[] = [];
    const tuples: string[] = [];
    for (const row of batch) {
      const placeholders = spec.columns.map((c) => {
        params.push(row[c.name]);
        return `$${params.length}`;
      }).join(', ');
      tuples.push(`(${placeholders})`);
    }
    await pool.query(`INSERT INTO "${tbl}" (${colNames}) VALUES ${tuples.join(', ')}`, params);
  }
}

async function upsertMetadata(db: NodePgDatabase<typeof schema>, spec: CatalogTableSpec) {
  // Note: pipeline_id is set LATER (after the pipelines row exists) to
  // avoid the circular FK between catalog_tables.pipeline_id ↔
  // pipelines.target_table_id. Reset to null here so a stale value
  // doesn't outlive a renamed pipeline.
  await db.insert(schema.catalogTables).values({
    id: spec.id,
    name: spec.name,
    game: spec.game,
    category: spec.category,
    layer: spec.layer,
    pipelineId: null,
    partitionKeys: spec.partitionKeys as never,
    rowCount: spec.rowCount,
    lastRefreshAt: new Date(),
    sourceKind: spec.sourceKind,
    sourceRef: spec.sourceRef,
    description: spec.description,
  }).onConflictDoUpdate({
    target: schema.catalogTables.id,
    set: {
      layer: spec.layer,
      pipelineId: null,
      rowCount: spec.rowCount,
      lastRefreshAt: new Date(),
      sourceKind: spec.sourceKind,
      sourceRef: spec.sourceRef,
      description: spec.description,
      updatedAt: new Date(),
    },
  });

  await db.execute(sql`DELETE FROM catalog_columns WHERE table_id = ${spec.id}`);
  for (let i = 0; i < spec.columns.length; i++) {
    const col = spec.columns[i];
    await db.insert(schema.catalogColumns).values({
      tableId: spec.id,
      name: col.name,
      type: col.type,
      ordinal: i,
      isPii: col.isPii ?? false,
      description: col.description ?? null,
    });
  }
}

// Register a Trino-faithful raw table (raw_<game>_<trino_table>) as a
// catalog row with layer='raw_source'. Unlike the spec-driven catalog
// rows, the physical table here is the row's id directly (NOT
// `catalog_<id>`), so DataCatalogService.get() must special-case
// raw_source when picking the sample source.
async function registerRawSourceTable(
  db: NodePgDatabase<typeof schema>,
  pool: Pool,
  r: RawLoadResult,
): Promise<void> {
  const id = r.pgTable; // 'raw_cfm_etl_login'
  const game = r.game.toUpperCase(); // 'CFM' | 'BLSTR'

  await db.insert(schema.catalogTables).values({
    id,
    name: id,
    game,
    category: 'raw',
    layer: 'raw_source',
    pipelineId: null,
    partitionKeys: [] as never,
    rowCount: r.rowCount,
    lastRefreshAt: new Date(),
    sourceKind: 'trino-mock',
    sourceRef: r.trinoFqn,
    description: `Trino-faithful copy of ${r.trinoFqn} (${r.columnCount} cols, ${r.rowCount.toLocaleString()} sample rows). Loaded from infra/trino-mock/data/${r.trinoSchema}/${r.trinoTable}.sample.jsonl.`,
  }).onConflictDoUpdate({
    target: schema.catalogTables.id,
    set: {
      name: id,
      game,
      category: 'raw',
      layer: 'raw_source',
      rowCount: r.rowCount,
      lastRefreshAt: new Date(),
      sourceKind: 'trino-mock',
      sourceRef: r.trinoFqn,
      updatedAt: new Date(),
    },
  });

  // Replace columns wholesale (Trino schema may have drifted).
  await db.execute(sql`DELETE FROM catalog_columns WHERE table_id = ${id}`);
  for (let i = 0; i < r.columns.length; i++) {
    const c = r.columns[i];
    await db.insert(schema.catalogColumns).values({
      tableId: id,
      name: c.name,
      type: c.type as never,
      ordinal: i,
      isPii: c.isPii,
    });
  }
}

// Insert / update the `pipelines` row for a single derivation. Called
// after the catalog target table exists (FK requirement).
async function upsertPipeline(
  pool: Pool,
  spec: PipelineSpec,
  result: { status: 'succeeded' | 'failed'; rowCount: number; error?: string },
): Promise<void> {
  await pool.query(
    `INSERT INTO pipelines
       (id, name, game_id, source_tables, target_table_id, transform_sql,
        kind, schedule, status, last_run_at, last_row_count, last_error)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, 'derive', 'manual', $7, NOW(), $8, $9)
     ON CONFLICT (id) DO UPDATE SET
       name             = EXCLUDED.name,
       game_id          = EXCLUDED.game_id,
       source_tables    = EXCLUDED.source_tables,
       target_table_id  = EXCLUDED.target_table_id,
       transform_sql    = EXCLUDED.transform_sql,
       status           = EXCLUDED.status,
       last_run_at      = NOW(),
       last_row_count   = EXCLUDED.last_row_count,
       last_error       = EXCLUDED.last_error,
       updated_at       = NOW()`,
    [
      spec.id, spec.name, spec.gameId,
      JSON.stringify(spec.sourceTables),
      spec.catalogId,
      spec.sql,
      result.status,
      result.rowCount,
      result.error ?? null,
    ],
  );
}

export async function seedDataCatalog(db: NodePgDatabase<typeof schema>, pool: Pool) {
  // eslint-disable-next-line no-console
  console.log(`[seed:catalog] ${CATALOG_SPECS.length} tables · ${TOTAL_COLUMNS} columns · ${TOTAL_ROWS.toLocaleString()} target rows`);

  // Step 0: load every raw_<game>_<table> from the committed Trino-mock
  // schema + sample JSONL files. These tables are dropped + recreated
  // each run so upstream Trino schema drift is reflected immediately.
  const loaded = await loadAllRawFromTrinoMock(pool);
  // eslint-disable-next-line no-console
  console.log(`[seed:raw] loaded ${loaded.length} per-game raw tables`);

  // Step 0b: register each raw table in catalog_tables with layer='raw_source'
  // so they show up in Raw Data Explorer + Data Catalog. Metric Builder
  // filters by layer==='raw_event' so it stays excluded from these.
  for (const r of loaded) {
    await registerRawSourceTable(db, pool, r);
  }
  // eslint-disable-next-line no-console
  console.log(`[seed:raw] registered ${loaded.length} raw_source catalog rows`);

  // Step 1: catalog metadata + per-spec physical tables.
  for (const spec of CATALOG_SPECS) {
    const t0 = Date.now();
    await ensurePhysicalTable(pool, spec);
    await upsertMetadata(db, spec);

    let rows = 0;
    let mode: 'pipeline' | 'synthetic' = 'synthetic';
    const pipelineSpec = PIPELINE_BY_CATALOG_ID.get(spec.id);

    if (pipelineSpec) {
      try {
        rows = await runPipeline(pool, pipelineSpec);
        mode = 'pipeline';
        await upsertPipeline(pool, pipelineSpec, { status: 'succeeded', rowCount: rows });
      } catch (e) {
        const err = e as Error;
        // eslint-disable-next-line no-console
        console.warn(`[seed:catalog] pipeline ${pipelineSpec.id} failed (${err.message}); falling back to synthetic`);
        await upsertPipeline(pool, pipelineSpec, { status: 'failed', rowCount: 0, error: err.message });
        // Falls through to synthetic.
      }
    }
    if (mode === 'synthetic') {
      const generated = generateRows(spec);
      await bulkInsert(pool, spec, generated);
      rows = generated.length;
    }

    // Now that the pipelines row exists (if applicable), backfill the
    // catalog_tables.pipeline_id pointer. Synthetic-pipeline rows are
    // inserted in step 2 below, so synthetic targets are wired there.
    if (pipelineSpec) {
      await pool.query(
        `UPDATE catalog_tables SET row_count = $1, pipeline_id = $2 WHERE id = $3`,
        [rows, pipelineSpec.id, spec.id],
      );
    } else {
      await pool.query(
        `UPDATE catalog_tables SET row_count = $1 WHERE id = $2`,
        [rows, spec.id],
      );
    }

    // eslint-disable-next-line no-console
    console.log(`[seed:catalog]  ${spec.id.padEnd(32)} ${rows.toLocaleString().padStart(9)} rows · ${mode.padEnd(9)} · ${Date.now() - t0}ms`);
  }

  // Step 2: synthesize "synthetic" pipeline rows for catalog tables we
  // generate ourselves (ad_impression_events, installs, …) — they don't
  // come from a SQL derive, but the Pipelines page should still list
  // them so users see the full lineage.
  for (const spec of CATALOG_SPECS) {
    if (PIPELINE_BY_CATALOG_ID.has(spec.id)) continue; // already inserted
    const pid = `pipe_synth_${spec.id}`;
    await pool.query(
      `INSERT INTO pipelines
         (id, name, game_id, source_tables, target_table_id, transform_sql,
          kind, schedule, status, last_run_at, last_row_count)
       VALUES ($1, $2, $3, '[]'::jsonb, $4, $5, 'synthetic', 'manual', 'succeeded', NOW(), $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         last_run_at = NOW(),
         last_row_count = EXCLUDED.last_row_count,
         updated_at = NOW()`,
      [
        pid,
        `${spec.name} (synthetic)`,
        spec.game ? spec.game.toLowerCase() : null,
        spec.id,
        `-- ${spec.id} is generated synthetically (no upstream Trino source today).\n-- See generate-synthetic.ts for the seed strategy.`,
        spec.rowCount,
      ],
    );
    await pool.query(
      `UPDATE catalog_tables SET pipeline_id = $1 WHERE id = $2 AND pipeline_id IS NULL`,
      [pid, spec.id],
    );
  }

  // eslint-disable-next-line no-console
  console.log(`[seed:catalog] done · ${ALL_PIPELINES.length} derive pipelines + ${CATALOG_SPECS.length - ALL_PIPELINES.length} synthetic pipelines`);
}
