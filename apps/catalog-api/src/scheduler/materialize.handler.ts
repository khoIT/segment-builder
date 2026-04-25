import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { metricPipelines, freshness } from '../db/schema';
import { InjectDb, type Db } from '../db/client';
import { MetricSpec, type MetricSpec as MetricSpecT } from '@bedrock/contracts';

// ─────────────────────────────────────────────────────────────────────
// Dequeue a `metric.materialize` job → POST query-svc materialize
// endpoint with the pipeline's spec → on success, write back
// metric_pipelines + freshness_records. On 3 consecutive failures,
// flip status to 'failed' (UI surfaces red badge).
// ─────────────────────────────────────────────────────────────────────

@Injectable()
export class MaterializeHandler {
  private readonly log = new Logger(MaterializeHandler.name);

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly cfg: ConfigService,
  ) {}

  async handle(pipelineId: string) {
    const rows = await this.db.select().from(metricPipelines).where(eq(metricPipelines.id, pipelineId)).limit(1);
    const pipeline = rows[0];
    if (!pipeline) {
      this.log.warn(`pipeline ${pipelineId} not found; skipping`);
      return;
    }
    if (pipeline.status === 'paused') {
      this.log.log(`pipeline ${pipelineId} paused; skipping run`);
      return;
    }

    // Mark running (non-blocking; tolerant if another worker beat us).
    await this.db.update(metricPipelines)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(metricPipelines.id, pipelineId));

    const spec = MetricSpec.parse(pipeline.spec);
    const t0 = Date.now();
    try {
      const result = await this.callMaterialize(pipelineId, spec);
      await this.db.update(metricPipelines).set({
        status: 'active',
        lastRunAt: new Date(),
        lastRowCount: result.rowCount,
        lastError: null,
        consecutiveFailures: 0,
        updatedAt: new Date(),
      }).where(eq(metricPipelines.id, pipelineId));

      // Freshness signal — stored against existing freshness_records
      // table (target = metric id, type = 'metric').
      await this.upsertFreshness(pipelineId, result.rowCount);
      this.log.log(`materialize ${pipelineId} ✓ ${result.rowCount} rows in ${Date.now() - t0}ms`);
    } catch (e) {
      const fails = (pipeline.consecutiveFailures ?? 0) + 1;
      const status = fails >= 3 ? 'failed' : 'pending';
      await this.db.update(metricPipelines).set({
        status,
        lastError: String((e as Error).message ?? e).slice(0, 500),
        consecutiveFailures: fails,
        updatedAt: new Date(),
      }).where(eq(metricPipelines.id, pipelineId));
      throw e;
    }
  }

  private async callMaterialize(pipelineId: string, spec: MetricSpecT) {
    const base = this.cfg.get<string>('QUERY_SVC_URL') ?? 'http://localhost:3002/api/v1';
    // Mint a service JWT against the shared JWT_SECRET. Same shape the
    // dev-login flow emits; query-svc accepts it because both services
    // share the secret.
    const secret = this.cfg.getOrThrow<string>('JWT_SECRET');
    const token = jwt.sign(
      { sub: 'svc:scheduler', email: 'scheduler@bedrock.svc', role: 'admin', name: 'scheduler' },
      secret,
      { expiresIn: '5m' },
    );
    const res = await fetch(`${base}/q/metrics/${pipelineId}/materialize`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ spec }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`materialize HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    return res.json() as Promise<{ rowCount: number; durationMs: number; sampleValue: number | null }>;
  }

  // freshness_records is keyed by (target, game) — metric id +
  // 'ALL' is enough for now. SLA defaults to 24h-fresh.
  private async upsertFreshness(pipelineId: string, rowCount: number) {
    const status = 'healthy';
    const trend = [rowCount];
    await this.db.insert(freshness).values({
      target: pipelineId,
      game: 'ALL',
      type: 'metric',
      sla: '24h',
      current: 'just now',
      status,
      breaches7d: 0,
      trend: trend as never,
      recordedAt: new Date(),
    });
  }
}
