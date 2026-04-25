import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, isNotNull } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { segments } from '../db/schema';
import { InjectDb, type Db } from '../db/client';

// ─────────────────────────────────────────────────────────────────────
// Nightly: walk every segment with non-null criteria, ask query-svc
// for a fresh count against materialized metric values, persist back
// to segments.size + a sizeTrend signal. Skips legacy criteria that
// don't fit the {all|any} shape (those still rely on the canvas mock).
// ─────────────────────────────────────────────────────────────────────

@Injectable()
export class RecomputeSegmentsHandler {
  private readonly log = new Logger(RecomputeSegmentsHandler.name);

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly cfg: ConfigService,
  ) {}

  async handle() {
    const rows = await this.db.select().from(segments).where(isNotNull(segments.criteria));
    if (!rows.length) {
      this.log.log('recompute: no segments with criteria — done');
      return { processed: 0, updated: 0 };
    }
    const base = this.cfg.get<string>('QUERY_SVC_URL') ?? 'http://localhost:3002/api/v1';
    const secret = this.cfg.getOrThrow<string>('JWT_SECRET');
    const token = jwt.sign(
      { sub: 'svc:recompute', email: 'recompute@bedrock.svc', role: 'admin', name: 'recompute' },
      secret,
      { expiresIn: '5m' },
    );

    let updated = 0;
    for (const seg of rows) {
      const c = seg.criteria as Record<string, unknown> | null;
      if (!c || (!Array.isArray(c.all) && !Array.isArray(c.any))) continue;
      try {
        const res = await fetch(`${base}/q/segments/preview-count`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ criteria: c }),
        });
        if (!res.ok) {
          this.log.warn(`segment ${seg.id} count failed: ${res.status}`);
          continue;
        }
        const { count } = (await res.json()) as { count: number };
        const prev = seg.size ?? 0;
        const trend = count > prev ? 'up' : count < prev ? 'down' : 'flat';
        await this.db.update(segments)
          .set({ size: count, sizeTrend: trend, updatedAt: new Date() })
          .where(eq(segments.id, seg.id));
        updated++;
      } catch (e) {
        this.log.warn(`segment ${seg.id} recompute threw: ${(e as Error).message}`);
      }
    }
    this.log.log(`recompute: processed ${rows.length}, updated ${updated}`);
    return { processed: rows.length, updated };
  }
}
