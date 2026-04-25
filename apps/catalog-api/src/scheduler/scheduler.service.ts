import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgBoss } from 'pg-boss';
import type { Job } from 'pg-boss';
import { eq, inArray } from 'drizzle-orm';
import { metricPipelines } from '../db/schema';
import { InjectDb, type Db } from '../db/client';
import { MaterializeHandler } from './materialize.handler';
import { RecomputeSegmentsHandler } from './recompute-segments.handler';

// ─────────────────────────────────────────────────────────────────────
// Postgres-backed cron scheduler. Runs in the catalog-api process —
// no separate worker. pg-boss owns its `pg_boss.*` schema, isolated
// from app tables.
//
// Lifecycle: module init → boss.start() → register all `active` /
// `pending` pipelines → boss workers pick up jobs and route to
// MaterializeHandler.
//
// Cron presets (`@hourly`, `@daily`, `@weekly`) are translated into
// real cron expressions before passing to boss.schedule().
// ─────────────────────────────────────────────────────────────────────

const CRON_ALIASES: Record<string, string> = {
  '@hourly': '0 * * * *',
  '@daily':  '0 0 * * *',
  '@weekly': '0 0 * * 1',
};

function toCron(expr: string): string {
  return CRON_ALIASES[expr] ?? expr;
}

export const MATERIALIZE_QUEUE = 'metric.materialize';
export const SEGMENT_RECOMPUTE_QUEUE = 'segment.recompute';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(SchedulerService.name);
  private boss: PgBoss | null = null;

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly cfg: ConfigService,
    private readonly handler: MaterializeHandler,
    private readonly recompute: RecomputeSegmentsHandler,
  ) {}

  boss$(): PgBoss | null { return this.boss; }

  async onModuleInit() {
    const url = this.cfg.getOrThrow<string>('DATABASE_URL');
    this.boss = new PgBoss({ connectionString: url, schema: 'pgboss' });
    await this.boss.start();
    // v12 requires queue creation before send/work/schedule.
    for (const q of [MATERIALIZE_QUEUE, SEGMENT_RECOMPUTE_QUEUE]) {
      try { await this.boss.createQueue(q); } catch { /* already exists */ }
    }
    this.log.log('pg-boss started');

    // Worker: dequeue materialize jobs, run handler, ack.
    await this.boss.work<{ pipelineId: string }>(
      MATERIALIZE_QUEUE,
      async (jobs: Job<{ pipelineId: string }>[]) => {
        for (const job of jobs) {
          try {
            await this.handler.handle(job.data.pipelineId);
          } catch (e) {
            this.log.error(`materialize job ${job.id} failed: ${(e as Error).message}`);
            throw e;
          }
        }
      },
    );

    // Re-register cron schedules for every non-paused pipeline. boss.schedule
    // is idempotent by name, so restart-safe.
    const pipelines = await this.db.select().from(metricPipelines).where(
      inArray(metricPipelines.status, ['active', 'pending']),
    );
    for (const p of pipelines) {
      await this.scheduleOne(p.id, p.schedule);
    }
    this.log.log(`scheduled ${pipelines.length} pipelines`);

    // Daily segment recompute worker + cron. Runs once per day at midnight UTC.
    await this.boss.work(SEGMENT_RECOMPUTE_QUEUE, async () => {
      await this.recompute.handle();
    });
    try {
      await this.boss.schedule(SEGMENT_RECOMPUTE_QUEUE, '0 0 * * *', {});
      this.log.log('segment recompute scheduled @daily');
    } catch (e) {
      this.log.warn(`segment recompute schedule: ${(e as Error).message}`);
    }
  }

  // Out-of-band trigger for ops + tests.
  async runRecomputeNow(): Promise<string | null> {
    if (!this.boss) throw new Error('scheduler not started');
    return this.boss.send(SEGMENT_RECOMPUTE_QUEUE, {});
  }

  async onModuleDestroy() {
    if (this.boss) {
      await this.boss.stop({ graceful: true });
      this.log.log('pg-boss stopped');
    }
  }

  // Idempotent: re-registering by same name updates the cron expr.
  async scheduleOne(pipelineId: string, schedule: string) {
    if (!this.boss) return;
    const cron = toCron(schedule);
    try {
      await this.boss.schedule(MATERIALIZE_QUEUE, cron, { pipelineId });
    } catch (e) {
      this.log.error(`schedule(${pipelineId}, ${cron}) failed: ${(e as Error).message}`);
    }
  }

  async unscheduleOne(pipelineId: string) {
    if (!this.boss) return;
    try {
      await this.boss.unschedule(MATERIALIZE_QUEUE);
    } catch {
      // pg-boss v12 doesn't support per-data unschedule; fallback is to mark
      // status='paused' and the handler will short-circuit. KISS.
    }
    void pipelineId;
  }

  // Fire-and-forget: enqueue a one-off run (out of cron cycle).
  async runNow(pipelineId: string): Promise<string | null> {
    if (!this.boss) throw new Error('scheduler not started');
    return this.boss.send(MATERIALIZE_QUEUE, { pipelineId });
  }

  async pausePipeline(pipelineId: string) {
    await this.db.update(metricPipelines)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(eq(metricPipelines.id, pipelineId));
  }

  async resumePipeline(pipelineId: string) {
    const rows = await this.db.update(metricPipelines)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(metricPipelines.id, pipelineId))
      .returning();
    if (rows[0]) await this.scheduleOne(rows[0].id, rows[0].schedule);
  }
}
