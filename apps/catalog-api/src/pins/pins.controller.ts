import {
  Controller, Delete, Get, Param, Put,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { userPins } from '../db/schema';
import type { Db } from '../db/client';
import { InjectDb } from '../db/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { BedrockClaims } from '../auth/auth.service';

// Pins are per-user. Routes derive userId from JWT — never accept it
// from path/body. No audit log: low signal-to-noise.
@Controller('me/pins')
export class PinsController {
  constructor(@InjectDb() private readonly db: Db) {}

  @Get()
  async list(@CurrentUser() user: BedrockClaims) {
    const items = await this.db
      .select()
      .from(userPins)
      .where(eq(userPins.userId, user.sub));
    return { items };
  }

  @Put(':metricId')
  async pin(@CurrentUser() user: BedrockClaims, @Param('metricId') metricId: string) {
    await this.db
      .insert(userPins)
      .values({ userId: user.sub, entity: 'metric', entityId: metricId })
      .onConflictDoNothing();
    return { ok: true };
  }

  @Delete(':metricId')
  async unpin(@CurrentUser() user: BedrockClaims, @Param('metricId') metricId: string) {
    await this.db
      .delete(userPins)
      .where(and(
        eq(userPins.userId, user.sub),
        eq(userPins.entity, 'metric'),
        eq(userPins.entityId, metricId),
      ));
    return { ok: true };
  }
}
