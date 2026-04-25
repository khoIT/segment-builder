import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { GAMES, SOURCES, METRICS, FRESHNESS, SEGMENTS } from './fixtures';

// Idempotent seed via ON CONFLICT DO NOTHING — re-runnable.
// Run: `pnpm --filter @bedrock/catalog-api db:seed`.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool, { schema });

  // eslint-disable-next-line no-console
  console.log('[seed] inserting games:', GAMES.length);
  for (const g of GAMES) {
    await db.insert(schema.games).values(g).onConflictDoNothing();
  }

  // eslint-disable-next-line no-console
  console.log('[seed] inserting sources:', SOURCES.length);
  for (const s of SOURCES) {
    await db.insert(schema.sources).values(s as never).onConflictDoNothing();
  }

  // eslint-disable-next-line no-console
  console.log('[seed] inserting metrics:', METRICS.length);
  for (const m of METRICS) {
    await db.insert(schema.metrics).values(m as never).onConflictDoNothing();
    // Default per-game source bindings — wired per metric.category default
    // table; phase 06 swaps in real Trino paths after recon.
    for (const g of (m.games as string[])) {
      const gameId = g.toLowerCase() === 'all' ? null : g.toLowerCase();
      if (!gameId) continue;
      await db.insert(schema.metricSourceBindings).values({
        metricId: m.id,
        gameId,
        sourceTable: m.source ?? `master.${m.category}`,
        masterTable: m.masterTable ?? null,
        columnMap: null,
      }).onConflictDoNothing();
    }
  }

  // eslint-disable-next-line no-console
  console.log('[seed] inserting freshness:', FRESHNESS.length);
  for (const f of FRESHNESS) {
    await db.insert(schema.freshness).values(f as never).onConflictDoNothing();
  }

  // eslint-disable-next-line no-console
  console.log('[seed] inserting segments:', SEGMENTS.length);
  for (const s of SEGMENTS) {
    await db.insert(schema.segments).values(s as never).onConflictDoNothing();
  }

  // eslint-disable-next-line no-console
  console.log('[seed] done');
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed', err);
  process.exit(1);
});
