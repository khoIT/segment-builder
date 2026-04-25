import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  games as gamesTable,
  sources as sourcesTable,
  freshness as freshnessTable,
} from '../db/schema';
import type { Db } from '../db/client';
import { InjectDb } from '../db/client';

// Read-only catalog endpoints. Each is a thin wrapper over a Drizzle
// select. Grouped into one controller (`/api/v1/catalog/...`) so we
// avoid module-explosion for tables that don't carry behaviour. Full
// per-resource modules live for metrics/segments/pins where mutations
// + audit + concurrency matter.
@Controller()
export class CatalogController {
  constructor(@InjectDb() private readonly db: Db) {}

  @Get('games')
  async listGames() {
    const rows = await this.db.select().from(gamesTable);
    return { items: rows };
  }

  @Get('games/:id')
  async getGame(@Param('id') id: string) {
    const rows = await this.db.select().from(gamesTable).where(eq(gamesTable.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException('game not found');
    return rows[0];
  }

  @Get('sources')
  async listSources() {
    const rows = await this.db.select().from(sourcesTable);
    return { items: rows };
  }

  @Get('sources/:id')
  async getSource(@Param('id') id: string) {
    const rows = await this.db.select().from(sourcesTable).where(eq(sourcesTable.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException('source not found');
    return rows[0];
  }

  @Get('freshness')
  async listFreshness() {
    const rows = await this.db.select().from(freshnessTable);
    return { items: rows };
  }
}
