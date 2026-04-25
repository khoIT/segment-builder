import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, ilike, or, sql, SQL } from 'drizzle-orm';
import { metrics, metricSourceBindings, metricChangelog, metricPipelines, userPins } from '../db/schema';
import type { Db } from '../db/client';
import { InjectDb } from '../db/client';
import { AuditService } from '../audit/audit.service';
import type { BedrockClaims } from '../auth/auth.service';
import { MetricSpec } from '@bedrock/contracts';

type ListFilters = {
  topGroup?: string;
  category?: string;
  realtime?: boolean;
  status?: string;
  type?: string;
  search?: string;
  pinnedOnly?: boolean;
  game?: string;
  pageSize?: number;
  page?: number;
};

@Injectable()
export class MetricsService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async list(f: ListFilters, userId: string | null) {
    const conds: SQL[] = [];
    if (f.topGroup) conds.push(eq(metrics.topGroup, f.topGroup));
    if (f.category) conds.push(eq(metrics.category, f.category));
    if (typeof f.realtime === 'boolean') conds.push(eq(metrics.realtime, f.realtime));
    if (f.status) conds.push(eq(metrics.status, f.status));
    if (f.type) conds.push(eq(metrics.type, f.type));
    if (f.search) {
      const s = `%${f.search}%`;
      conds.push(or(ilike(metrics.name, s), ilike(metrics.description, s))!);
    }
    if (f.pinnedOnly && userId) {
      const pinned = this.db
        .select({ entityId: userPins.entityId })
        .from(userPins)
        .where(and(eq(userPins.userId, userId), eq(userPins.entity, 'metric')));
      conds.push(sql`${metrics.id} in ${pinned}`);
    }
    const pageSize = Math.min(f.pageSize ?? 200, 500);
    const offset = (f.page ?? 0) * pageSize;
    const where = conds.length ? and(...conds) : undefined;

    const items = await this.db.select().from(metrics).where(where).limit(pageSize).offset(offset);
    const totalRow = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(metrics)
      .where(where);
    return { items, total: totalRow[0]?.count ?? items.length };
  }

  async get(id: string) {
    const rows = await this.db.select().from(metrics).where(eq(metrics.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException('metric not found');
    return rows[0];
  }

  async bindings(id: string) {
    return this.db
      .select()
      .from(metricSourceBindings)
      .where(eq(metricSourceBindings.metricId, id));
  }

  async create(input: Record<string, unknown>, user: BedrockClaims) {
    const id = (input.id as string | undefined) ?? `m_${Date.now()}`;
    const now = new Date();
    const row = {
      id,
      name: input.name as string,
      category: input.category as string,
      topGroup: input.topGroup as string,
      type: input.type as string,
      status: (input.status as string) ?? 'experimental',
      owner: (input.owner as string) ?? user.email,
      unit: input.unit as string,
      freq: input.freq as string,
      realtime: Boolean(input.realtime),
      goodDir: (input.goodDir as string) ?? 'up',
      formula: (input.formula as string) ?? null,
      description: (input.description as string) ?? null,
      games: (input.games ?? []) as never,
      windowSpec: (input.window as string) ?? '7d rolling',
      source: (input.source as string) ?? null,
      masterTable: (input.masterTable as string) ?? null,
      deps: (input.deps ?? null) as never,
      model: (input.model as string) ?? null,
      usedByCount: 0,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await this.db.insert(metrics).values(row).returning();

    // If a MetricSpec ships with the request, register a metric_pipelines
    // row so the scheduler (P07) picks it up. Validation through zod —
    // a malformed spec is a 400 at the service edge, not a silent skip.
    if (input.spec !== undefined && input.spec !== null) {
      const spec = MetricSpec.parse(input.spec);
      const schedule = (input.schedule as string | undefined) ?? spec.schedule.expr;
      await this.db.insert(metricPipelines).values({
        id,
        spec: spec as never,
        schedule,
        status: 'pending',
        nextRunAt: new Date(),                    // first run on next tick
        lastRunAt: null,
        lastRowCount: null,
        lastError: null,
        consecutiveFailures: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.audit.log({
      actorId: user.sub,
      action: 'create',
      entity: 'metric',
      entityId: id,
      payload: { name: row.name, owner: row.owner, hasSpec: input.spec != null },
    });
    return inserted[0];
  }

  async getPipeline(id: string) {
    const rows = await this.db.select().from(metricPipelines).where(eq(metricPipelines.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException('metric pipeline not found');
    return rows[0];
  }

  async update(id: string, patch: Record<string, unknown>, ifMatch: number, user: BedrockClaims) {
    const updates: Record<string, unknown> = {};
    for (const k of [
      'name', 'category', 'topGroup', 'type', 'status', 'owner', 'unit',
      'freq', 'realtime', 'goodDir', 'formula', 'description', 'source',
      'masterTable', 'model',
    ]) {
      if (k in patch) updates[k] = patch[k];
    }
    if ('window' in patch) updates.windowSpec = patch.window;
    if ('games' in patch) updates.games = patch.games;
    if ('deps' in patch) updates.deps = patch.deps;
    updates.version = sql`${metrics.version} + 1`;
    updates.updatedAt = new Date();

    const result = await this.db
      .update(metrics)
      .set(updates)
      .where(and(eq(metrics.id, id), eq(metrics.version, ifMatch)))
      .returning();

    if (!result.length) {
      const existing = await this.db.select().from(metrics).where(eq(metrics.id, id)).limit(1);
      if (!existing.length) throw new NotFoundException('metric not found');
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'metric was modified by another writer',
        details: { currentVersion: existing[0].version, ifMatch },
      });
    }

    const updated = result[0];
    await this.db.insert(metricChangelog).values({
      metricId: id,
      version: updated.version,
      actorId: user.sub,
      diff: patch as never,
    });
    await this.audit.log({
      actorId: user.sub,
      action: 'update',
      entity: 'metric',
      entityId: id,
      payload: { version: updated.version, fields: Object.keys(patch) },
    });
    return updated;
  }
}
