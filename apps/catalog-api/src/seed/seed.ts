import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { GAMES, SOURCES, METRICS, FRESHNESS, SEGMENTS } from './fixtures';
import { REAL_CFM_BINDINGS, REAL_BINDING_KEYS } from './real-trino-bindings';
import { MAPPING_TEMPLATE_BY_ID, MappingSpec } from '@bedrock/contracts';
import { seedDataCatalog } from './data-catalog/orchestrator';

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
    for (const g of (m.games as string[])) {
      const gameId = g.toLowerCase() === 'all' ? null : g.toLowerCase();
      if (!gameId) continue;
      // Real CFM bindings (post-Trino recon) win over the category default.
      if (gameId === 'cfm' && REAL_BINDING_KEYS.has(`${m.id}::cfm`)) continue;
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
  console.log('[seed] inserting real CFM bindings:', REAL_CFM_BINDINGS.length);
  for (const b of REAL_CFM_BINDINGS) {
    await db.insert(schema.metricSourceBindings).values({
      metricId: b.metricId,
      gameId: b.gameId,
      sourceTable: b.sourceTable,
      masterTable: b.masterTable,
      columnMap: b.columnMap,
    }).onConflictDoNothing();
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

  // ── Mappings + master_tables: persist one canonical mapping per game
  // (cloned from tpl_user_profile_dx) and a master_tables row that
  // points at it. Frontend MasterTables page reads these immediately;
  // first build trigger materialises rows into master_user_profile_dx.
  const tpl = MAPPING_TEMPLATE_BY_ID['tpl_user_profile_dx'];
  if (tpl) {
    // eslint-disable-next-line no-console
    console.log('[seed] persisting default mapping + master_table per game');
    for (const game of GAMES) {
      const trinoSchema = game.trinoSchema ?? `${game.id}_vn`;
      const spec = JSON.parse(JSON.stringify(tpl.defaultSpec));
      spec.game = trinoSchema;
      // Resolve placeholder cohort filter values to a sensible default.
      for (const f of spec.cohort?.filters ?? []) {
        if (f.value === '__cohortStart__') f.value = '2025-12-15';
        if (f.value === '__cohortEnd__') f.value = '2026-02-22';
      }
      MappingSpec.parse(spec);

      const mappingName = `${game.code} user-profile-dx (default)`;
      const existing = await db
        .select()
        .from(schema.mappings)
        .where(eq(schema.mappings.name, mappingName))
        .limit(1);
      let mappingId: string;
      if (existing.length) {
        mappingId = existing[0].id;
      } else {
        const [row] = await db.insert(schema.mappings).values({
          name: mappingName,
          gameId: game.id,
          templateId: tpl.id,
          spec: spec as never,
          owner: 'data.liveops',
        }).returning();
        mappingId = row.id;
      }

      const masterName = `${game.code} master.user_profile_dx`;
      const existingMaster = await db
        .select()
        .from(schema.masterTables)
        .where(eq(schema.masterTables.name, masterName))
        .limit(1);
      if (!existingMaster.length) {
        await db.insert(schema.masterTables).values({
          name: masterName,
          gameId: game.id,
          mappingId,
          templateId: tpl.id,
          status: 'never_built',
          columns: spec.outputColumns as never,
        });
      }
    }
  }

  await seedDataCatalog(db, pool);

  // eslint-disable-next-line no-console
  console.log('[seed] done');
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed', err);
  process.exit(1);
});
