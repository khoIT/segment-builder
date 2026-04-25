import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { connectors } from '../db/schema';
import type { Db } from '../db/client';
import { InjectDb } from '../db/client';
import { CreateConnectorRequest, TestConnectionResult } from '@bedrock/contracts';
import type { z } from 'zod';

type CreateConnectorDto = z.infer<typeof CreateConnectorRequest>;

@Injectable()
export class ConnectorsService {
  constructor(@InjectDb() private readonly db: Db) {}

  // ── Mock test-connection ──────────────────────────────────────────
  // Returns {ok:true,latencyMs:42} unless host contains 'fail'.
  testConnection(host?: string): z.infer<typeof TestConnectionResult> {
    if (host?.toLowerCase().includes('fail')) {
      return { ok: false, error: 'Mock failure (host contains "fail")' };
    }
    return { ok: true, latencyMs: 42 };
  }

  // ── CRUD ──────────────────────────────────────────────────────────

  async list() {
    const rows = await this.db.select().from(connectors).orderBy(connectors.createdAt);
    // Never expose pass_encrypted in list response
    return { items: rows.map(this.toPublic) };
  }

  async create(dto: CreateConnectorDto) {
    const testResult = this.testConnection(dto.host);
    const status = testResult.ok ? 'ok' : 'fail';

    // MOCK ONLY — base64 encode password. Not real encryption.
    const passEncrypted = dto.pass
      ? Buffer.from(dto.pass).toString('base64')
      : null;

    const id = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const [row] = await this.db
      .insert(connectors)
      .values({
        id,
        type: dto.type,
        name: dto.name,
        env: dto.env ?? 'production',
        host: dto.host ?? null,
        port: dto.port ?? null,
        db: dto.db ?? null,
        user: dto.user ?? null,
        passEncrypted,
        status,
        datasetCount: 0,
      })
      .returning();

    return this.toPublic(row);
  }

  async testById(id: string) {
    const [row] = await this.db
      .select()
      .from(connectors)
      .where(eq(connectors.id, id))
      .limit(1);
    if (!row) throw new NotFoundException(`Connector ${id} not found`);
    return this.testConnection(row.host ?? undefined);
  }

  // Strip pass_encrypted; format timestamps as ISO strings
  private toPublic(row: typeof connectors.$inferSelect) {
    const { passEncrypted: _pass, ...rest } = row;
    return {
      ...rest,
      lastSyncAt: rest.lastSyncAt?.toISOString() ?? null,
      createdAt: rest.createdAt.toISOString(),
      updatedAt: rest.updatedAt.toISOString(),
    };
  }
}
