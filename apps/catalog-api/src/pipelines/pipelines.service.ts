import { Injectable, NotFoundException } from '@nestjs/common';
import { sql, eq, asc } from 'drizzle-orm';
import { pipelines, catalogTables } from '../db/schema';
import type { Db } from '../db/client';
import { InjectDb } from '../db/client';
import type { Pipeline, PipelineDetail } from '@bedrock/contracts';

const ID_RE = /^[a-z0-9_]+$/;

type PipelineRow = typeof pipelines.$inferSelect & { targetTableName: string | null };

function isPipelineKind(v: string): v is 'derive' | 'map' | 'materialize' | 'synthetic' {
  return v === 'derive' || v === 'map' || v === 'materialize' || v === 'synthetic';
}
function isPipelineStatus(v: string): v is 'idle' | 'running' | 'succeeded' | 'failed' {
  return v === 'idle' || v === 'running' || v === 'succeeded' || v === 'failed';
}

function toApi(r: PipelineRow): Pipeline {
  return {
    id: r.id,
    name: r.name,
    gameId: r.gameId,
    sourceTables: (r.sourceTables ?? []) as string[],
    targetTableId: r.targetTableId,
    targetTableName: r.targetTableName,
    kind: isPipelineKind(r.kind) ? r.kind : 'derive',
    schedule: r.schedule,
    status: isPipelineStatus(r.status) ? r.status : 'idle',
    lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
    lastRowCount: r.lastRowCount ?? null,
    lastError: r.lastError ?? null,
  };
}

@Injectable()
export class PipelinesService {
  constructor(@InjectDb() private readonly db: Db) {}

  async list(): Promise<{ items: Pipeline[]; total: number }> {
    const rows = await this.db
      .select({
        id: pipelines.id,
        name: pipelines.name,
        gameId: pipelines.gameId,
        sourceTables: pipelines.sourceTables,
        targetTableId: pipelines.targetTableId,
        transformSql: pipelines.transformSql,
        kind: pipelines.kind,
        schedule: pipelines.schedule,
        status: pipelines.status,
        lastRunAt: pipelines.lastRunAt,
        lastRowCount: pipelines.lastRowCount,
        lastError: pipelines.lastError,
        createdAt: pipelines.createdAt,
        updatedAt: pipelines.updatedAt,
        targetTableName: catalogTables.name,
      })
      .from(pipelines)
      .leftJoin(catalogTables, eq(catalogTables.id, pipelines.targetTableId))
      .orderBy(asc(pipelines.gameId), asc(pipelines.name));
    const items = rows.map((r) => toApi(r as PipelineRow));
    return { items, total: items.length };
  }

  async get(id: string): Promise<PipelineDetail> {
    if (!/^[a-z0-9_]+$/.test(id)) throw new NotFoundException(`invalid pipeline id: ${id}`);
    const rows = await this.db
      .select({
        id: pipelines.id,
        name: pipelines.name,
        gameId: pipelines.gameId,
        sourceTables: pipelines.sourceTables,
        targetTableId: pipelines.targetTableId,
        transformSql: pipelines.transformSql,
        kind: pipelines.kind,
        schedule: pipelines.schedule,
        status: pipelines.status,
        lastRunAt: pipelines.lastRunAt,
        lastRowCount: pipelines.lastRowCount,
        lastError: pipelines.lastError,
        createdAt: pipelines.createdAt,
        updatedAt: pipelines.updatedAt,
        targetTableName: catalogTables.name,
      })
      .from(pipelines)
      .leftJoin(catalogTables, eq(catalogTables.id, pipelines.targetTableId))
      .where(eq(pipelines.id, id))
      .limit(1);
    if (!rows.length) throw new NotFoundException(`pipeline not found: ${id}`);
    const row = rows[0] as PipelineRow & { transformSql: string };

    const sourceNames = (row.sourceTables ?? []) as string[];
    const sources = await Promise.all(sourceNames.map((name) => this.describeRawTable(name)));

    return {
      ...toApi(row),
      transformSql: row.transformSql,
      sources,
    };
  }

  // Probe the raw_<game>_<table>: row count + columns from
  // information_schema. The raw tables aren't in drizzle (created
  // dynamically at seed time), so go through pg directly.
  private async describeRawTable(name: string): Promise<{
    name: string; rowCount: number; columnCount: number;
    columns: Array<{ name: string; type: string }>;
  }> {
    if (!ID_RE.test(name)) {
      return { name, rowCount: 0, columnCount: 0, columns: [] };
    }
    const colsRes = await this.db.execute<{ column_name: string; data_type: string }>(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${name}
      ORDER BY ordinal_position
    `);
    const columns = (colsRes.rows ?? []).map((r) => ({ name: r.column_name, type: r.data_type }));
    if (columns.length === 0) {
      return { name, rowCount: 0, columnCount: 0, columns: [] };
    }
    const countRes = await this.db.execute<{ n: string }>(sql.raw(
      `SELECT count(*)::bigint AS n FROM "${name}"`,
    ));
    return {
      name,
      rowCount: Number(countRes.rows?.[0]?.n ?? 0),
      columnCount: columns.length,
      columns,
    };
  }
}
