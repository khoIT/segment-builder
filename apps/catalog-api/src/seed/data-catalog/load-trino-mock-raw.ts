import type { Pool } from 'pg';
import { readFile, access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { constants } from 'node:fs';

// Generic loader: reads infra/trino-mock/data/<schema>/<table>.{schema.json,sample.jsonl}
// and creates a per-game raw_<game>_<table> Postgres table that matches
// the Trino schema 1:1 (column names + types preserved). Then bulk-loads
// the JSONL sample. No column-name remapping — the goal is fidelity.
//
// Type mapping (Trino → Postgres):
//   varchar / char / json    → text
//   integer / int            → integer
//   bigint                   → bigint
//   double / real            → double precision
//   boolean                  → boolean
//   date                     → date
//   timestamp(*) [with tz]   → timestamptz
//   anything else            → text (safe default)

const ID_RE = /^[a-z0-9_]+$/;
// Postgres caps prepared-statement parameters at 65535 (16-bit count).
// etl_game_detail has 230+ columns, so a fixed BATCH of 500 would send
// ~115k params and silently wrap. Cap effective batch to 0.9× the limit
// divided by column count (e.g. 230 cols → batch ≤ 256).
const BATCH = 500;
const PG_PARAM_CAP = 65535;
const PG_PARAM_HEADROOM = 0.9;

// Per-table physical name in Postgres. game ∈ {cfm, blstr}; trinoTable
// is the bare Trino name (e.g. 'etl_login').
function physicalName(game: string, trinoTable: string): string {
  if (!ID_RE.test(game)) throw new Error(`unsafe game id: ${game}`);
  if (!ID_RE.test(trinoTable)) throw new Error(`unsafe table name: ${trinoTable}`);
  return `raw_${game}_${trinoTable}`;
}

// Path-safe schema dir (e.g. 'cfm_vn' → infra/trino-mock/data/cfm_vn).
// Resolved relative to __dirname which catalog-api compiles to CJS.
const TRINO_MOCK_BASE = join(__dirname, '..', '..', '..', '..', '..', 'infra', 'trino-mock', 'data');

export type TrinoMockSchema = {
  catalog: string;
  schema: string;
  table: string;
  columns: Array<{ name: string; type: string; nullable?: string }>;
  piiCols?: string[];
};

function pgType(trinoType: string): string {
  const t = trinoType.toLowerCase().trim();
  if (t.startsWith('varchar') || t.startsWith('char')) return 'text';
  if (t === 'json') return 'jsonb';
  if (t === 'integer' || t === 'int') return 'integer';
  if (t === 'bigint') return 'bigint';
  if (t === 'double' || t === 'real') return 'double precision';
  if (t === 'boolean') return 'boolean';
  if (t === 'date') return 'date';
  if (t.startsWith('timestamp')) return 'timestamp with time zone';
  return 'text';
}

async function exists(p: string): Promise<boolean> {
  try { await access(p, constants.R_OK); return true; } catch { return false; }
}

async function readSchema(path: string): Promise<TrinoMockSchema> {
  return JSON.parse(await readFile(path, 'utf8')) as TrinoMockSchema;
}

async function readJsonl(path: string): Promise<Record<string, unknown>[]> {
  const txt = await readFile(path, 'utf8');
  return txt.split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

// Coerce a JSONL value to something Postgres accepts for the declared
// column type. Trino returns ISO strings for timestamps; pg accepts those
// directly. We just normalise empty strings to null and keep the rest.
function coerce(v: unknown, pgT: string): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    if (v === '') return null;
    if (pgT === 'integer' || pgT === 'bigint') {
      const n = parseInt(v, 10); return Number.isFinite(n) ? n : null;
    }
    if (pgT === 'double precision') {
      const n = parseFloat(v); return Number.isFinite(n) ? n : null;
    }
    if (pgT === 'boolean') return v === 'true' || v === '1';
    if (pgT === 'jsonb') {
      try { return JSON.parse(v); } catch { return v; }
    }
  }
  if (typeof v === 'object' && pgT === 'jsonb') return JSON.stringify(v);
  return v;
}

async function bulkInsert(
  pool: Pool,
  table: string,
  cols: string[],
  pgTypes: string[],
  rows: Record<string, unknown>[],
): Promise<void> {
  if (!rows.length) return;
  const colSql = cols.map((c) => `"${c}"`).join(', ');
  const maxByCols = Math.floor((PG_PARAM_CAP * PG_PARAM_HEADROOM) / cols.length);
  const effectiveBatch = Math.max(1, Math.min(BATCH, maxByCols));
  for (let i = 0; i < rows.length; i += effectiveBatch) {
    const batch = rows.slice(i, i + effectiveBatch);
    const params: unknown[] = [];
    const tuples: string[] = [];
    for (const row of batch) {
      const ph = cols.map((c, j) => {
        params.push(coerce(row[c], pgTypes[j]));
        return `$${params.length}`;
      }).join(', ');
      tuples.push(`(${ph})`);
    }
    await pool.query(`INSERT INTO "${table}" (${colSql}) VALUES ${tuples.join(', ')}`, params);
  }
}

// Result of a single-table load. Reused by the orchestrator for logging,
// pipeline-seed (source_tables), and catalog registration (raw_source layer).
export type RawLoadResult = {
  pgTable: string;        // 'raw_cfm_etl_login'
  trinoFqn: string;       // 'iceberg.cfm_vn.etl_login'
  trinoSchema: string;    // 'cfm_vn'
  trinoTable: string;     // 'etl_login'
  game: string;           // 'cfm' | 'blstr'
  rowCount: number;
  columnCount: number;
  // Mirrors `catalog_columns` shape so the orchestrator can copy them
  // straight into catalog_columns without re-querying information_schema.
  columns: Array<{ name: string; type: string; isPii: boolean }>;
  ms: number;
};

// Drop + recreate + bulk-load a single Trino-mock table.
export async function loadOneTrinoMockTable(
  pool: Pool,
  game: string,
  trinoSchema: string,
  trinoTable: string,
  schemaDir: string,
): Promise<RawLoadResult | null> {
  const t0 = Date.now();
  const schemaPath = join(schemaDir, `${trinoTable}.schema.json`);
  const samplePath = join(schemaDir, `${trinoTable}.sample.jsonl`);
  if (!(await exists(schemaPath))) {
    // eslint-disable-next-line no-console
    console.warn(`[seed:raw] missing schema for ${trinoSchema}.${trinoTable}, skip`);
    return null;
  }
  const schema = await readSchema(schemaPath);
  if (!schema.columns?.length) {
    // eslint-disable-next-line no-console
    console.warn(`[seed:raw] no columns for ${trinoSchema}.${trinoTable}, skip`);
    return null;
  }

  const pgTable = physicalName(game, trinoTable);
  const cols = schema.columns.map((c) => {
    if (!ID_RE.test(c.name)) throw new Error(`unsafe column name in ${trinoSchema}.${trinoTable}: ${c.name}`);
    return c.name;
  });
  const pgTypes = schema.columns.map((c) => pgType(c.type));
  const colDdl = cols.map((c, i) => `"${c}" ${pgTypes[i]}`).join(', ');

  // Drop + recreate so schema drift in upstream Trino is reflected
  // immediately on reseed (no migration required).
  await pool.query(`DROP TABLE IF EXISTS "${pgTable}"`);
  await pool.query(`CREATE TABLE "${pgTable}" (${colDdl})`);

  let inserted = 0;
  if (await exists(samplePath)) {
    const rows = await readJsonl(samplePath);
    await bulkInsert(pool, pgTable, cols, pgTypes, rows);
    inserted = rows.length;
  }

  // ANALYZE so subsequent derive joins get good plans (large tables
  // benefit; small ones lose nothing).
  await pool.query(`ANALYZE "${pgTable}"`);

  // Map Trino schema columns → catalog_columns.type (loose enum). Falls
  // back to 'string' for anything we don't recognize.
  const piiSet = new Set(schema.piiCols ?? []);
  const catalogCols = schema.columns.map((c, i) => ({
    name: c.name,
    type: trinoToCatalogType(c.type),
    isPii: piiSet.has(c.name),
    ordinal: i,
  }));

  return {
    pgTable,
    trinoFqn: `${schema.catalog}.${schema.schema}.${schema.table}`,
    trinoSchema: schema.schema,
    trinoTable: schema.table,
    game,
    rowCount: inserted,
    columnCount: cols.length,
    columns: catalogCols,
    ms: Date.now() - t0,
  };
}

// Loose mapping into the existing `catalog_columns.type` enum
// ('string'|'int'|'bigint'|'double'|'date'|'timestamp'|'boolean'|'json').
function trinoToCatalogType(trinoType: string): string {
  const t = trinoType.toLowerCase().trim();
  if (t.startsWith('varchar') || t.startsWith('char')) return 'string';
  if (t === 'json') return 'json';
  if (t === 'integer' || t === 'int') return 'int';
  if (t === 'bigint') return 'bigint';
  if (t === 'double' || t === 'real') return 'double';
  if (t === 'boolean') return 'boolean';
  if (t === 'date') return 'date';
  if (t.startsWith('timestamp')) return 'timestamp';
  return 'string';
}

// Orchestration: discover every (schema, table) under
// infra/trino-mock/data/<schema>/ and load it. Returns the set of
// loaded tables so the caller can wire pipelines + log a summary.
export async function loadAllRawFromTrinoMock(
  pool: Pool,
  base = TRINO_MOCK_BASE,
): Promise<RawLoadResult[]> {
  if (!(await exists(base))) {
    // eslint-disable-next-line no-console
    console.warn(`[seed:raw] no Trino-mock dir at ${base}; raw tables will be empty`);
    return [];
  }
  const out: RawLoadResult[] = [];
  // eslint-disable-next-line no-console
  console.log(`[seed:raw] loading per-game raw tables from ${base}`);

  const schemaDirs = (await readdir(base, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const trinoSchema of schemaDirs) {
    const game = schemaToGame(trinoSchema);
    if (!game) {
      // eslint-disable-next-line no-console
      console.warn(`[seed:raw] schema ${trinoSchema} has no game mapping, skip`);
      continue;
    }
    const dir = join(base, trinoSchema);
    const files = await readdir(dir);
    const tables = files.filter((f) => f.endsWith('.schema.json')).map((f) => f.replace(/\.schema\.json$/, ''));
    for (const table of tables) {
      const r = await loadOneTrinoMockTable(pool, game, trinoSchema, table, dir);
      if (r) {
        out.push(r);
        // eslint-disable-next-line no-console
        console.log(`[seed:raw]  ${r.pgTable.padEnd(45)} ${String(r.rowCount).padStart(6)} rows · ${r.columnCount} cols · ${r.ms}ms`);
      }
    }
  }
  return out;
}

// Trino schema → bedrock game id. Mirrors the games table's `id` column
// so derive-from-local SQL refers to the same code (cfm, blstr).
export function schemaToGame(trinoSchema: string): string | null {
  if (trinoSchema === 'cfm_vn') return 'cfm';
  if (trinoSchema === 'ballistar') return 'blstr';
  return null;
}
