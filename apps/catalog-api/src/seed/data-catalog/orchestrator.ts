import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '../../db/schema';
import { CATALOG_SPECS, TOTAL_COLUMNS, TOTAL_ROWS, type CatalogTableSpec, type ColType } from './specs';
import { generateRows, type GeneratedRow } from './generate-synthetic';
import { simulateRawEvents } from './simulate-raw-events';
import { LOCAL_DERIVATIONS, deriveFromLocal, type DerivationName } from './derive-from-local';

// Maps spec ColType → Postgres column type for the per-table physical
// table. Identifier-whitelisted by spec definition (kebab-free names).
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

// Map a spec to (baseDerivationId, gameId, gameCode). For CFM the spec
// id is the bare derivation ('revenue'); for other games the id is
// '<game>_<derivation>' (e.g. 'blstr_revenue').
function parseDerivedId(spec: CatalogTableSpec): { baseId: string; gameId: string; gameCode: string } {
  if (spec.game === 'BLSTR' && spec.id.startsWith('blstr_')) {
    return { baseId: spec.id.slice('blstr_'.length), gameId: 'blstr', gameCode: 'BLSTR' };
  }
  // Default route: bare id = CFM derivation.
  return { baseId: spec.id, gameId: 'cfm', gameCode: 'CFM' };
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
  await db.insert(schema.catalogTables).values({
    id: spec.id,
    name: spec.name,
    game: spec.game,
    category: spec.category,
    layer: spec.layer,
    partitionKeys: spec.partitionKeys as never,
    rowCount: spec.rowCount,
    lastRefreshAt: new Date(),
    sourceKind: spec.sourceKind,
    sourceRef: spec.sourceRef,
    description: spec.description,
  }).onConflictDoUpdate({
    target: schema.catalogTables.id,
    set: {
      // Re-classify on every seed so layer drift in specs.ts is picked up.
      layer: spec.layer,
      rowCount: spec.rowCount,
      lastRefreshAt: new Date(),
      sourceKind: spec.sourceKind,
      sourceRef: spec.sourceRef,
      description: spec.description,
      updatedAt: new Date(),
    },
  });

  // Replace columns wholesale — column lists evolve with the spec.
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

export async function seedDataCatalog(db: NodePgDatabase<typeof schema>, pool: Pool) {
  // eslint-disable-next-line no-console
  console.log(`[seed:catalog] ${CATALOG_SPECS.length} tables · ${TOTAL_COLUMNS} columns · ${TOTAL_ROWS.toLocaleString()} target rows`);

  // Step 0: simulate the raw event tables (cfm_vn-shaped, local-only).
  // 8 of 16 catalog tables derive from these via INSERT...SELECT.
  await simulateRawEvents(pool);

  // drizzle-kit doesn't model the 16 ad-hoc data tables; we issue raw
  // CREATE/INSERT via pg pool directly. Identifier whitelist
  // (^[a-z0-9_]+$) on every spec id + column name guards injection.
  for (const spec of CATALOG_SPECS) {
    const t0 = Date.now();
    await ensurePhysicalTable(pool, spec);
    await upsertMetadata(db, spec);

    let rows = 0;
    let mode: 'local' | 'synthetic' = 'synthetic';

    // Per-game derive routing: spec.id may be a bare CFM-default
    // ('revenue') or game-prefixed ('blstr_revenue'). Strip the prefix
    // to look up the derivation function; pass game context to drive
    // WHERE filters + game label literals in the SQL.
    const { baseId, gameId, gameCode } = parseDerivedId(spec);
    if (baseId && LOCAL_DERIVATIONS.has(baseId as DerivationName)) {
      try {
        rows = await deriveFromLocal(pool, baseId as DerivationName, {
          gameId,
          gameCode,
          target: physicalTableName(spec),
        });
        mode = 'local';
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`[seed:catalog] derive ${spec.id} failed (${(e as Error).message}); falling back to synthetic`);
      }
    }
    if (mode === 'synthetic') {
      const generated = generateRows(spec);
      await bulkInsert(pool, spec, generated);
      rows = generated.length;
    }

    // Update authoritative row_count metadata to actual rows inserted.
    await pool.query(
      `UPDATE catalog_tables SET row_count = $1 WHERE id = $2`,
      [rows, spec.id],
    );

    // eslint-disable-next-line no-console
    console.log(`[seed:catalog]  ${spec.id.padEnd(28)} ${rows.toLocaleString().padStart(9)} rows · ${mode.padEnd(9)} · ${Date.now() - t0}ms`);
  }
  // eslint-disable-next-line no-console
  console.log('[seed:catalog] done');
}
