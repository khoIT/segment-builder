import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { deriveFromLocal, LOCAL_DERIVATIONS, type DerivationName } from './derive-from-local';
import { CATALOG_SPECS, type ColType, type CatalogTableSpec } from './specs';

// Targeted repair: derives only the missing Ballistar catalog tables
// on top of the existing raw_etl_* data. No TRUNCATE, no re-simulation.
//
// Use after an interrupted `pnpm db:seed` left some BLSTR derivations
// missing. Idempotent: drops + recreates each target physical table
// before INSERT so re-runs converge.
//
// Run: `pnpm tsx src/seed/data-catalog/repair-blstr.ts`

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

const ID_RE = /^[a-z0-9_]+$/;

function safe(name: string): string {
  if (!ID_RE.test(name)) throw new Error(`unsafe identifier: ${name}`);
  return name;
}

async function ensurePhysicalTable(pool: Pool, spec: CatalogTableSpec): Promise<void> {
  const tbl = `catalog_${safe(spec.id)}`;
  const colsSql = spec.columns.map((c) => `"${safe(c.name)}" ${PG_TYPE[c.type]}`).join(', ');
  await pool.query(`CREATE TABLE IF NOT EXISTS "${tbl}" (${colsSql})`);
  await pool.query(`TRUNCATE "${tbl}"`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: url, max: 4 });
  const db = drizzle(pool, { schema });

  // Sanity: confirm raw event data has Ballistar rows. If not, the user
  // needs to run the full seed first; repair won't synthesise events.
  const probe = await pool.query<{ n: string }>(
    `SELECT count(*)::bigint AS n FROM raw_etl_recharge WHERE game_id = 'blstr'`,
  );
  const blstrRaw = Number(probe.rows[0]?.n ?? 0);
  if (blstrRaw === 0) {
    // eslint-disable-next-line no-console
    console.error('[repair] raw_etl_recharge has 0 Ballistar rows — run full `pnpm db:seed` first.');
    await pool.end();
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`[repair] raw_etl_recharge has ${blstrRaw.toLocaleString()} Ballistar rows`);

  // Walk every BLSTR-prefixed spec and derive what's missing or empty.
  const blstrSpecs = CATALOG_SPECS.filter((s) => s.game === 'BLSTR');
  // eslint-disable-next-line no-console
  console.log(`[repair] checking ${blstrSpecs.length} Ballistar specs`);

  for (const spec of blstrSpecs) {
    const baseId = spec.id.startsWith('blstr_') ? spec.id.slice('blstr_'.length) : spec.id;
    if (!LOCAL_DERIVATIONS.has(baseId as DerivationName)) {
      // eslint-disable-next-line no-console
      console.log(`[repair]  ${spec.id.padEnd(35)} skip (not in LOCAL_DERIVATIONS)`);
      continue;
    }

    const target = `catalog_${spec.id}`;
    const before = await pool.query<{ n: string }>(`SELECT count(*)::bigint AS n FROM "${target}"`).catch(() => null);
    const beforeCount = before ? Number(before.rows[0]?.n ?? 0) : 0;

    const t0 = Date.now();
    await ensurePhysicalTable(pool, spec);
    const rows = await deriveFromLocal(pool, baseId as DerivationName, {
      gameId: 'blstr',
      gameCode: 'BLSTR',
      target,
    });

    // Persist actual row count back to catalog_tables metadata.
    await db.update(schema.catalogTables)
      .set({ rowCount: rows, lastRefreshAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.catalogTables.id, spec.id));

    // eslint-disable-next-line no-console
    console.log(`[repair]  ${spec.id.padEnd(35)} ${rows.toLocaleString().padStart(7)} rows · ${Date.now() - t0}ms (was ${beforeCount.toLocaleString()})`);
  }

  // eslint-disable-next-line no-console
  console.log('[repair] done');
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[repair] failed', err);
  process.exit(1);
});
