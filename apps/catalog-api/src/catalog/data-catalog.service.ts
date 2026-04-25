import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { sql, eq, and, or, asc, ilike, inArray, type SQL } from 'drizzle-orm';
import {
  catalogTables, catalogColumns, metricSourceBindings, metrics, segments,
  masterTables,
} from '../db/schema';
import type { Db } from '../db/client';
import { InjectDb } from '../db/client';
import type { CatalogTable, CatalogTableDetail, CatalogLineage, CatalogLineageCounts } from '@bedrock/contracts';

const ID_RE = /^[a-z0-9_]+$/;
const CACHE_TTL_MS = 60_000;
const LIST_TTL_MS = 30_000;

type LineageCacheEntry = { value: CatalogLineage; expires: number };
type ListCacheEntry = { value: { items: CatalogTable[]; total: number }; expires: number };

@Injectable()
export class DataCatalogService {
  private readonly log = new Logger(DataCatalogService.name);
  private readonly lineageCache = new Map<string, LineageCacheEntry>();
  // Coarse list cache keyed on filter signature. Catalog rows change
  // rarely (master-build hooks invalidate via bustListCache).
  private readonly listCache = new Map<string, ListCacheEntry>();

  constructor(@InjectDb() private readonly db: Db) {}

  private bustListCache() { this.listCache.clear(); }

  // Upsert a catalog_tables row for a built master_table. Called by the
  // BuildOrchestrator after a successful build so the new artefact
  // shows up in the Data Catalog page automatically.
  async upsertFromMasterTable(masterTableId: string): Promise<void> {
    const [mt] = await this.db.select().from(masterTables).where(eq(masterTables.id, masterTableId)).limit(1);
    if (!mt) {
      this.log.warn(`upsertFromMasterTable: master_table ${masterTableId} not found`);
      return;
    }
    // Path-safe id: hyphens (UUID) → underscores. Prefixed `mt_` to
    // namespace under master-build artefacts (vs. seeded synthetic).
    const id = `mt_${masterTableId.replace(/-/g, '_')}`;
    const cols = ((mt.columns as Array<{ name: string; type?: string }>) ?? []);
    const game = mt.gameId ? mt.gameId.toUpperCase() : null;

    await this.db.insert(catalogTables).values({
      id,
      name: mt.name,
      game,
      category: 'master',
      layer: 'master',
      partitionKeys: [] as never,
      rowCount: mt.rowCount ?? 0,
      lastRefreshAt: mt.lastBuildAt ?? new Date(),
      sourceKind: 'master-build',
      sourceRef: mt.id,
      description: `Built master table from ${mt.templateId} template.`,
    }).onConflictDoUpdate({
      target: catalogTables.id,
      set: {
        name: mt.name,
        layer: 'master',
        rowCount: mt.rowCount ?? 0,
        lastRefreshAt: mt.lastBuildAt ?? new Date(),
        updatedAt: new Date(),
      },
    });

    // Replace columns wholesale — outputColumns evolve with the spec.
    await this.db.execute(sql`DELETE FROM catalog_columns WHERE table_id = ${id}`);
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      await this.db.insert(catalogColumns).values({
        tableId: id,
        name: c.name,
        type: (c.type ?? 'string') as never,
        ordinal: i,
        isPii: false,
      });
    }
    // Bust lineage cache for this id + the coarse list cache.
    this.lineageCache.delete(id);
    this.bustListCache();
    this.log.log(`upsertFromMasterTable: ${id} (${cols.length} cols, ${mt.rowCount} rows)`);
  }

  async list(filters: { game?: string; category?: string; search?: string }): Promise<{ items: CatalogTable[]; total: number }> {
    const cacheKey = `list|${filters.game ?? ''}|${filters.category ?? ''}|${filters.search ?? ''}`;
    const cached = this.listCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.value;

    const conds: SQL[] = [];
    if (filters.game)     conds.push(eq(catalogTables.game, filters.game.toUpperCase()));
    if (filters.category) conds.push(eq(catalogTables.category, filters.category));
    if (filters.search)   conds.push(ilike(catalogTables.name, `%${filters.search}%`));
    const where = conds.length ? and(...conds) : undefined;

    const tables = await this.db
      .select()
      .from(catalogTables)
      .where(where)
      .orderBy(asc(catalogTables.name));
    if (!tables.length) {
      const empty = { items: [] as CatalogTable[], total: 0 };
      this.listCache.set(cacheKey, { value: empty, expires: Date.now() + LIST_TTL_MS });
      return empty;
    }

    const tableIds = tables.map((t) => t.id);
    const refs = new Set<string>();
    for (const t of tables) {
      refs.add(t.id);
      if (t.sourceRef) refs.add(t.sourceRef);
    }
    const refsList = Array.from(refs);

    // ─── 1 query: column counts grouped by table_id ────────────────
    const colCountRows = await this.db.execute(sql`
      SELECT table_id, count(*)::int AS n
      FROM catalog_columns
      WHERE table_id IN (${sql.join(tableIds.map((id) => sql`${id}`), sql`, `)})
      GROUP BY table_id
    `);
    const colCountByTable = new Map<string, number>();
    for (const r of (colCountRows.rows as { table_id: string; n: number }[])) {
      colCountByTable.set(r.table_id, Number(r.n));
    }

    // ─── 1 query: metric lineage counts via metric_source_bindings ─
    // Match against either the catalog id or the trino sourceRef.
    const metricBindRows = refsList.length
      ? await this.db.execute(sql`
          SELECT b.source_table, b.master_table, b.metric_id
          FROM metric_source_bindings b
          WHERE b.source_table IN (${sql.join(refsList.map((r) => sql`${r}`), sql`, `)})
             OR b.master_table IN (${sql.join(refsList.map((r) => sql`${r}`), sql`, `)})
        `)
      : { rows: [] };
    const metricsByRef = new Map<string, Set<string>>();
    for (const r of (metricBindRows.rows as { source_table: string | null; master_table: string | null; metric_id: string }[])) {
      for (const k of [r.source_table, r.master_table]) {
        if (!k) continue;
        if (!metricsByRef.has(k)) metricsByRef.set(k, new Set());
        metricsByRef.get(k)!.add(r.metric_id);
      }
    }

    // ─── 1 query: segments containing any catalog id substring ─────
    // Build a regex once; Postgres scans segments table once instead
    // of N times. Only the table id is matched (cheap; unique enough).
    const idRegex = tableIds.map((s) => s.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')).join('|');
    const segRows = idRegex
      ? await this.db.execute(sql`
          SELECT id, lower(filters::text || ' ' || coalesce(criteria::text, '')) AS blob
          FROM segments
          WHERE filters::text ~* ${idRegex}
             OR coalesce(criteria::text, '') ~* ${idRegex}
        `)
      : { rows: [] };
    const segmentsByTable = new Map<string, Set<string>>();
    for (const r of (segRows.rows as { id: string; blob: string }[])) {
      for (const tid of tableIds) {
        if (r.blob.includes(tid.toLowerCase())) {
          if (!segmentsByTable.has(tid)) segmentsByTable.set(tid, new Set());
          segmentsByTable.get(tid)!.add(r.id);
        }
      }
    }

    const items: CatalogTable[] = tables.map((tbl) => {
      const refKeys = [tbl.id, ...(tbl.sourceRef ? [tbl.sourceRef] : [])];
      const metricSet = new Set<string>();
      for (const k of refKeys) {
        for (const mId of metricsByRef.get(k) ?? []) metricSet.add(mId);
      }
      return {
        id: tbl.id,
        name: tbl.name,
        game: tbl.game,
        category: tbl.category,
        layer: tbl.layer as 'raw_event' | 'aggregate' | 'master',
        pipelineId: tbl.pipelineId,
        partitionKeys: (tbl.partitionKeys ?? []) as string[],
        rowCount: Number(tbl.rowCount),
        columnCount: colCountByTable.get(tbl.id) ?? 0,
        lastRefreshAt: tbl.lastRefreshAt ? tbl.lastRefreshAt.toISOString() : null,
        sourceKind: tbl.sourceKind,
        sourceRef: tbl.sourceRef,
        description: tbl.description,
        lineageCounts: {
          metrics: metricSet.size,
          features: 0,
          segments: segmentsByTable.get(tbl.id)?.size ?? 0,
          models: 0,
        },
      };
    });

    const result = { items, total: items.length };
    this.listCache.set(cacheKey, { value: result, expires: Date.now() + LIST_TTL_MS });
    return result;
  }

  async get(id: string): Promise<CatalogTableDetail> {
    if (!ID_RE.test(id)) throw new NotFoundException(`invalid id: ${id}`);
    const t = await this.db.select().from(catalogTables).where(eq(catalogTables.id, id)).limit(1);
    if (!t.length) throw new NotFoundException(`catalog table not found: ${id}`);
    const tbl = t[0];

    const cols = await this.db
      .select()
      .from(catalogColumns)
      .where(eq(catalogColumns.tableId, id))
      .orderBy(asc(catalogColumns.ordinal));
    // (sample source resolved below)

    // Sample source depends on layer:
    //   raw_source  → physical table = id (raw_<game>_<trino_table>)
    //   master      → master_user_profile_dx scoped by master_table_id
    //   anything else → catalog_<id> (synthetic + derived)
    let sampleRows: Record<string, unknown>[] = [];
    const sampleColNames = cols.map((c) => c.name);
    if (tbl.layer === 'raw_source') {
      const sampleSql = `SELECT * FROM "${id}" LIMIT 10`;
      const sampleRes = await this.db.execute(sql.raw(sampleSql));
      sampleRows = (sampleRes.rows ?? []) as Record<string, unknown>[];
    } else if (tbl.sourceKind === 'master-build' && tbl.sourceRef) {
      const sampleRes = await this.db.execute(sql`
        SELECT * FROM master_user_profile_dx
        WHERE master_table_id = ${tbl.sourceRef}::uuid
        LIMIT 10
      `);
      sampleRows = (sampleRes.rows ?? []) as Record<string, unknown>[];
    } else {
      const sampleSql = `SELECT * FROM "catalog_${id}" LIMIT 10`;
      const sampleRes = await this.db.execute(sql.raw(sampleSql));
      sampleRows = (sampleRes.rows ?? []) as Record<string, unknown>[];
    }
    const sampleArrayRows = sampleRows.map((row) => sampleColNames.map((cn) => {
      // Master-build rows come back snake_case from Postgres; column
      // names in the spec are also snake_case so direct lookup works.
      const v = row[cn];
      if (v == null) return null;
      // Drizzle returns timestamptz/date as Date instances — JSON-serialise.
      return v instanceof Date ? v.toISOString() : v;
    }));

    const counts = await this.lineageCounts(id);

    return {
      id: tbl.id,
      name: tbl.name,
      game: tbl.game,
      category: tbl.category,
      layer: tbl.layer as 'raw_event' | 'aggregate' | 'master',
      pipelineId: tbl.pipelineId,
      partitionKeys: (tbl.partitionKeys ?? []) as string[],
      rowCount: Number(tbl.rowCount),
      columnCount: cols.length,
      lastRefreshAt: tbl.lastRefreshAt ? tbl.lastRefreshAt.toISOString() : null,
      sourceKind: tbl.sourceKind,
      sourceRef: tbl.sourceRef,
      description: tbl.description,
      lineageCounts: counts,
      columns: cols.map((c) => ({
        name: c.name,
        type: c.type as never,
        ordinal: c.ordinal,
        isPii: c.isPii,
        description: c.description,
      })),
      sample: { columns: sampleColNames, rows: sampleArrayRows },
    };
  }

  async lineage(id: string): Promise<CatalogLineage> {
    if (!ID_RE.test(id)) throw new NotFoundException(`invalid id: ${id}`);
    const cached = this.lineageCache.get(id);
    if (cached && cached.expires > Date.now()) return cached.value;

    const t = await this.db.select().from(catalogTables).where(eq(catalogTables.id, id)).limit(1);
    if (!t.length) throw new NotFoundException(`catalog table not found: ${id}`);
    const tbl = t[0];

    // Match against both the synthetic id and the trino path. Either may
    // appear in metric_source_bindings.source_table.
    const refs = [tbl.id];
    if (tbl.sourceRef) refs.push(tbl.sourceRef);

    const metricRows = await this.db
      .selectDistinct({ id: metrics.id, name: metrics.name })
      .from(metricSourceBindings)
      .innerJoin(metrics, eq(metrics.id, metricSourceBindings.metricId))
      .where(or(
        inArray(metricSourceBindings.sourceTable, refs),
        inArray(metricSourceBindings.masterTable, refs),
      ))
      .orderBy(asc(metrics.name));

    const pat = `%${id}%`;
    const segmentRows = await this.db.execute(sql`
      SELECT id, name FROM segments
      WHERE filters::text ILIKE ${pat}
         OR criteria::text ILIKE ${pat}
      ORDER BY name
    `);

    const lineage: CatalogLineage = {
      metrics: metricRows.map((r) => ({ id: r.id, name: r.name })),
      features: [],   // placeholder until features schema lands
      segments: (segmentRows.rows as { id: string; name: string }[]).map((r) => ({ id: r.id, name: r.name })),
      models: [],     // placeholder until models schema lands
    };

    this.lineageCache.set(id, { value: lineage, expires: Date.now() + CACHE_TTL_MS });
    return lineage;
  }

  private async lineageCounts(id: string): Promise<CatalogLineageCounts> {
    const l = await this.lineage(id);
    return {
      metrics: l.metrics.length,
      features: l.features.length,
      segments: l.segments.length,
      models: l.models.length,
    };
  }
}
