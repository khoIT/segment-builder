import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { auditLog } from '../db/schema';
import type { Db } from '../db/client';
import { InjectDb } from '../db/client';

type LogParams = {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  payload?: Record<string, unknown> | null;
};

type ListParams = {
  actorId?: string;
  entity?: string;
  entityId?: string;
  action?: string;
  since?: string;
  until?: string;
  limit?: number;
};

// Append-only event store. Mutating endpoints call `log()` after the
// state change lands. `list()` is admin-only — see audit.controller.ts.
@Injectable()
export class AuditService {
  constructor(@InjectDb() private readonly db: Db) {}

  async log(p: LogParams): Promise<void> {
    await this.db.insert(auditLog).values({
      actorId: p.actorId,
      action: p.action,
      entity: p.entity,
      entityId: p.entityId,
      payload: (p.payload ?? null) as never,
    });
  }

  async list(p: ListParams = {}) {
    const conds = [
      p.actorId ? eq(auditLog.actorId, p.actorId) : null,
      p.entity ? eq(auditLog.entity, p.entity) : null,
      p.entityId ? eq(auditLog.entityId, p.entityId) : null,
      p.action ? eq(auditLog.action, p.action) : null,
      p.since ? gte(auditLog.createdAt, new Date(p.since)) : null,
      p.until ? lte(auditLog.createdAt, new Date(p.until)) : null,
    ].filter(Boolean) as never[];
    const limit = Math.min(p.limit ?? 100, 500);
    return this.db
      .select()
      .from(auditLog)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }
}
