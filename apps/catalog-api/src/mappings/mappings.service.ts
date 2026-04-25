import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, ilike, sql, SQL } from 'drizzle-orm';
import { mappings, masterTables } from '../db/schema';
import type { Db } from '../db/client';
import { InjectDb } from '../db/client';
import { AuditService } from '../audit/audit.service';
import type { BedrockClaims } from '../auth/auth.service';
import { MAPPING_TEMPLATE_BY_ID, MappingSpec } from '@bedrock/contracts';

type ListFilters = {
  game?: string;
  templateId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class MappingsService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async list(f: ListFilters) {
    const conds: SQL[] = [];
    if (f.game) conds.push(eq(mappings.gameId, f.game));
    if (f.templateId) conds.push(eq(mappings.templateId, f.templateId));
    if (f.search) conds.push(ilike(mappings.name, `%${f.search}%`));
    const where = conds.length ? and(...conds) : undefined;
    const pageSize = Math.min(f.pageSize ?? 50, 200);
    const offset = (f.page ?? 0) * pageSize;
    const items = await this.db.select().from(mappings).where(where).limit(pageSize).offset(offset);
    const total = await this.db.select({ count: sql<number>`count(*)::int` }).from(mappings).where(where);
    return { items, total: total[0]?.count ?? items.length };
  }

  async get(id: string) {
    const rows = await this.db.select().from(mappings).where(eq(mappings.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException('mapping not found');
    return rows[0];
  }

  // Clone-from-template = take a template's defaultSpec, deep-merge user
  // params (only the params the template declares), persist as a new
  // mapping row. Server re-validates with zod (defence-in-depth).
  async cloneFromTemplate(p: {
    templateId: string;
    name: string;
    gameId: string;
    params: Record<string, unknown>;
  }, user: BedrockClaims) {
    const tpl = MAPPING_TEMPLATE_BY_ID[p.templateId];
    if (!tpl) throw new NotFoundException(`template not found: ${p.templateId}`);

    // Only declared params survive — block injection of arbitrary fields.
    const allowed = new Set(tpl.parameterSchema.map((x) => x.key));
    const safeParams: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(p.params)) {
      if (allowed.has(k)) safeParams[k] = v;
    }

    // Naive param substitution: inject params.cohortStart/cohortEnd into
    // any cohort filters that reference them via `__cohortStart__` etc.
    // Phase 04b+ adds richer param interpolation as templates need it.
    const spec = JSON.parse(JSON.stringify(tpl.defaultSpec));
    spec.templateId = tpl.id;
    if (safeParams.game) spec.game = safeParams.game;
    for (const filter of spec.cohort?.filters ?? []) {
      if (filter.value === '__cohortStart__' && safeParams.cohortStart) filter.value = safeParams.cohortStart;
      if (filter.value === '__cohortEnd__' && safeParams.cohortEnd) filter.value = safeParams.cohortEnd;
    }

    const validated = MappingSpec.parse(spec);

    const [row] = await this.db.insert(mappings).values({
      name: p.name,
      gameId: p.gameId,
      templateId: tpl.id,
      spec: validated as never,
      owner: user.email,
    }).returning();

    await this.audit.log({
      actorId: user.sub,
      action: 'create',
      entity: 'mapping',
      entityId: row.id,
      payload: { name: row.name, templateId: tpl.id, params: safeParams },
    });
    return row;
  }

  async update(id: string, patch: Record<string, unknown>, ifMatch: number, user: BedrockClaims) {
    const updates: Record<string, unknown> = {};
    if ('name' in patch) updates.name = patch.name;
    if ('spec' in patch) updates.spec = MappingSpec.parse(patch.spec) as never;
    updates.version = sql`${mappings.version} + 1`;
    updates.updatedAt = new Date();

    const result = await this.db
      .update(mappings)
      .set(updates)
      .where(and(eq(mappings.id, id), eq(mappings.version, ifMatch)))
      .returning();
    if (!result.length) {
      const existing = await this.db.select().from(mappings).where(eq(mappings.id, id)).limit(1);
      if (!existing.length) throw new NotFoundException('mapping not found');
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'mapping was modified by another writer',
        details: { currentVersion: existing[0].version, ifMatch },
      });
    }
    await this.audit.log({
      actorId: user.sub,
      action: 'update',
      entity: 'mapping',
      entityId: id,
      payload: { fields: Object.keys(patch) },
    });
    return result[0];
  }

  async remove(id: string, user: BedrockClaims) {
    // Block delete if any master_tables row references it.
    const refs = await this.db
      .select({ id: masterTables.id })
      .from(masterTables)
      .where(eq(masterTables.mappingId, id))
      .limit(1);
    if (refs.length) {
      throw new ConflictException({
        code: 'MAPPING_IN_USE',
        message: 'mapping is referenced by master_tables; remove those first',
      });
    }
    const result = await this.db.delete(mappings).where(eq(mappings.id, id)).returning();
    if (!result.length) throw new NotFoundException('mapping not found');
    await this.audit.log({
      actorId: user.sub,
      action: 'delete',
      entity: 'mapping',
      entityId: id,
      payload: { name: result[0].name },
    });
    return { ok: true };
  }
}
