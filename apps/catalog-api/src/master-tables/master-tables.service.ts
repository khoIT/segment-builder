import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql, SQL } from 'drizzle-orm';
import { masterTables, mappings, masterUserProfileDx } from '../db/schema';
import type { Db } from '../db/client';
import { InjectDb } from '../db/client';
import { AuditService } from '../audit/audit.service';
import type { BedrockClaims } from '../auth/auth.service';

@Injectable()
export class MasterTablesService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async list(filters: { game?: string; templateId?: string; page?: number; pageSize?: number }) {
    const conds: SQL[] = [];
    if (filters.game) conds.push(eq(masterTables.gameId, filters.game));
    if (filters.templateId) conds.push(eq(masterTables.templateId, filters.templateId));
    const where = conds.length ? and(...conds) : undefined;
    const pageSize = Math.min(filters.pageSize ?? 50, 200);
    const offset = (filters.page ?? 0) * pageSize;
    const items = await this.db.select().from(masterTables).where(where).limit(pageSize).offset(offset);
    const total = await this.db.select({ count: sql<number>`count(*)::int` }).from(masterTables).where(where);
    return { items, total: total[0]?.count ?? items.length };
  }

  async get(id: string) {
    const [row] = await this.db.select().from(masterTables).where(eq(masterTables.id, id)).limit(1);
    if (!row) throw new NotFoundException('master-table not found');
    return row;
  }

  async create(input: { name: string; gameId: string; mappingId: string }, user: BedrockClaims) {
    const [mapping] = await this.db.select().from(mappings).where(eq(mappings.id, input.mappingId)).limit(1);
    if (!mapping) throw new NotFoundException('mapping not found');

    const [row] = await this.db.insert(masterTables).values({
      name: input.name,
      gameId: input.gameId,
      mappingId: input.mappingId,
      templateId: mapping.templateId,
      status: 'never_built',
    }).returning();

    await this.audit.log({
      actorId: user.sub,
      action: 'create',
      entity: 'master_table',
      entityId: row.id,
      payload: { name: row.name, templateId: row.templateId, mappingId: input.mappingId },
    });
    return row;
  }

  // Returns a plain {columns,rows} view for the master_table_id. Per-
  // template hard-coding for now — extend the switch as new physical
  // tables get added in phase 06+.
  async preview(id: string, limit: number) {
    const mt = await this.get(id);
    const cap = Math.min(Math.max(limit, 1), 500);
    if (mt.templateId === 'tpl_user_profile_dx') {
      const rows = await this.db
        .select()
        .from(masterUserProfileDx)
        .where(eq(masterUserProfileDx.masterTableId, id))
        .limit(cap);
      const columns = rows.length ? Object.keys(rows[0]) : [];
      const tuples = rows.map((r) => columns.map((c) => (r as Record<string, unknown>)[c]));
      return { columns, rows: tuples, total: rows.length };
    }
    return { columns: [], rows: [], total: 0 };
  }

  async columns(id: string) {
    const mt = await this.get(id);
    return mt.columns ?? [];
  }
}
