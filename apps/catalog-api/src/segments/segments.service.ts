import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, ilike, sql, SQL } from 'drizzle-orm';
import { segments, segmentChangelog } from '../db/schema';
import type { Db } from '../db/client';
import { InjectDb } from '../db/client';
import { AuditService } from '../audit/audit.service';
import type { BedrockClaims } from '../auth/auth.service';

type ListFilters = {
  game?: string;
  status?: string;
  owner?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class SegmentsService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async list(f: ListFilters) {
    const conds: SQL[] = [];
    if (f.game) conds.push(eq(segments.game, f.game));
    if (f.status) conds.push(eq(segments.status, f.status));
    if (f.owner) conds.push(eq(segments.owner, f.owner));
    if (f.search) conds.push(ilike(segments.name, `%${f.search}%`));
    const where = conds.length ? and(...conds) : undefined;
    const pageSize = Math.min(f.pageSize ?? 200, 500);
    const offset = (f.page ?? 0) * pageSize;
    const items = await this.db.select().from(segments).where(where).limit(pageSize).offset(offset);
    const total = await this.db.select({ count: sql<number>`count(*)::int` }).from(segments).where(where);
    return { items, total: total[0]?.count ?? items.length };
  }

  async get(id: string) {
    const rows = await this.db.select().from(segments).where(eq(segments.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException('segment not found');
    return rows[0];
  }

  async create(input: Record<string, unknown>, user: BedrockClaims) {
    const id = (input.id as string | undefined) ?? `s_${Date.now()}`;
    const now = new Date();
    const row = {
      id,
      name: input.name as string,
      game: (input.game as string) ?? 'ALL',
      size: 0,
      sizeTrend: 'flat',
      delta: '+0',
      status: (input.status as string) ?? 'draft',
      owner: (input.owner as string) ?? user.name,
      updated: 'Just now',
      campaigns: 0,
      description: (input.desc as string) ?? '',
      filters: (input.filters ?? []) as never,
      criteria: (input.criteria ?? null) as never,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    const [inserted] = await this.db.insert(segments).values(row).returning();
    await this.audit.log({
      actorId: user.sub,
      action: 'create',
      entity: 'segment',
      entityId: id,
      payload: { name: row.name },
    });
    return inserted;
  }

  async update(id: string, patch: Record<string, unknown>, ifMatch: number, user: BedrockClaims) {
    const updates: Record<string, unknown> = {};
    for (const k of ['name', 'game', 'status', 'owner', 'desc', 'filters', 'criteria']) {
      if (k in patch) updates[k === 'desc' ? 'description' : k] = patch[k];
    }
    updates.version = sql`${segments.version} + 1`;
    updates.updatedAt = new Date();
    const result = await this.db
      .update(segments)
      .set(updates)
      .where(and(eq(segments.id, id), eq(segments.version, ifMatch)))
      .returning();
    if (!result.length) {
      const existing = await this.db.select().from(segments).where(eq(segments.id, id)).limit(1);
      if (!existing.length) throw new NotFoundException('segment not found');
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'segment was modified by another writer',
        details: { currentVersion: existing[0].version, ifMatch },
      });
    }
    const updated = result[0];
    await this.db.insert(segmentChangelog).values({
      segmentId: id,
      version: updated.version,
      actorId: user.sub,
      diff: patch as never,
    });
    await this.audit.log({
      actorId: user.sub,
      action: 'update',
      entity: 'segment',
      entityId: id,
      payload: { version: updated.version, fields: Object.keys(patch) },
    });
    return updated;
  }

  async remove(id: string, user: BedrockClaims) {
    const result = await this.db.delete(segments).where(eq(segments.id, id)).returning();
    if (!result.length) throw new NotFoundException('segment not found');
    await this.audit.log({
      actorId: user.sub,
      action: 'delete',
      entity: 'segment',
      entityId: id,
      payload: { name: result[0].name },
    });
    return { ok: true };
  }
}
