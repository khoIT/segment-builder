import { Controller, Get } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Public } from '../common/public.decorator';
import { InjectDb } from '../db/client';
import type { Db } from '../db/client';

// `GET /health` — liveness + DB ping. No JWT required.
@Controller('health')
export class HealthController {
  constructor(@InjectDb() private readonly db: Db) {}

  @Public()
  @Get()
  async health() {
    let dbStatus: 'connected' | 'down' = 'down';
    try {
      await this.db.execute(sql`select 1`);
      dbStatus = 'connected';
    } catch {
      dbStatus = 'down';
    }
    return {
      ok: dbStatus === 'connected',
      db: dbStatus,
      service: 'catalog-api',
      ts: new Date().toISOString(),
    };
  }
}
