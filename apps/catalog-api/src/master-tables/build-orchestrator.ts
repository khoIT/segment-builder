import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { masterTables, buildJobs, mappings, masterUserProfileDx } from '../db/schema';
import type { Db } from '../db/client';
import { InjectDb } from '../db/client';
import { DataCatalogService } from '../catalog/data-catalog.service';

// Build flow:
//   POST /master-tables/:id/build → orchestrator.start(masterTableId)
//     1. insert build_jobs row (status=running)
//     2. POST QUERY_SVC/q/mappings/execute  (NDJSON stream)
//     3. batch-insert each chunk into the per-template Postgres table
//     4. on done: master_tables.row_count, status, columns; finishedAt
//     5. on error: status=failed, error message
//
// Job state lives in build_jobs (durable) plus an in-process Map for
// real-time progress polling. The orchestrator runs the build async via
// a fire-and-forget Promise — caller gets the BuildJob row immediately.

// Trino returns columns as snake_case (matching the SQL aliases) but
// Drizzle's TS schema uses camelCase keys → without translation every
// per-template field silently lands as `default` and the row is empty.
function snakeToCamel(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}

@Injectable()
export class BuildOrchestrator {
  private readonly log = new Logger(BuildOrchestrator.name);
  private readonly inFlight = new Map<string, { processedRows: number; totalRows: number | null }>();

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly cfg: ConfigService,
    private readonly catalog: DataCatalogService,
  ) {}

  async start(masterTableId: string, userToken: string): Promise<{ jobId: string }> {
    const [mt] = await this.db.select().from(masterTables).where(eq(masterTables.id, masterTableId)).limit(1);
    if (!mt) throw new NotFoundException('master-table not found');
    if (!mt.mappingId) throw new NotFoundException('master-table has no mapping');

    const [mapping] = await this.db.select().from(mappings).where(eq(mappings.id, mt.mappingId)).limit(1);
    if (!mapping) throw new NotFoundException('referenced mapping not found');

    const [job] = await this.db.insert(buildJobs).values({
      masterTableId,
      status: 'running',
      processedRows: 0,
    }).returning();

    await this.db.update(masterTables).set({ status: 'building', updatedAt: new Date() }).where(eq(masterTables.id, masterTableId));
    this.inFlight.set(job.id, { processedRows: 0, totalRows: null });

    // Fire-and-forget; status polling endpoint reads build_jobs.
    void this.runBuild(job.id, masterTableId, mt.templateId, mapping.spec as Record<string, unknown>, userToken)
      .catch((err) => this.log.error(`build ${job.id} crashed`, err));

    return { jobId: job.id };
  }

  async status(jobId: string) {
    const [job] = await this.db.select().from(buildJobs).where(eq(buildJobs.id, jobId)).limit(1);
    if (!job) throw new NotFoundException('job not found');
    return job;
  }

  private async runBuild(
    jobId: string,
    masterTableId: string,
    templateId: string,
    spec: Record<string, unknown>,
    userToken: string,
  ): Promise<void> {
    const start = Date.now();
    try {
      const querySvc = this.cfg.get<string>('QUERY_SVC');
      if (!querySvc) {
        throw new Error('QUERY_SVC env not set; cannot run build (phase 05 wires query-svc)');
      }

      const res = await fetch(`${querySvc}/api/v1/q/mappings/execute`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ spec, masterTableId, batchSize: 1000 }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`query-svc /q/mappings/execute returned ${res.status}`);
      }

      // Read NDJSON stream (one JSON row per line). Batch into 1000-row
      // INSERTs for the per-template wide table.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const batch: Record<string, unknown>[] = [];
      let processed = 0;

      const flush = async () => {
        if (!batch.length) return;
        if (templateId === 'tpl_user_profile_dx') {
          try {
            await this.db.insert(masterUserProfileDx).values(
              batch.map((r) => ({ ...snakeToCamel(r), masterTableId })) as never,
            ).onConflictDoNothing();
          } catch (err) {
            // Surface the pg-side error (Drizzle wraps it but error.cause
            // carries the original PostgresError with code/detail/column).
            const cause = (err as { cause?: { message?: string; detail?: string; column?: string; code?: string } }).cause;
            const causeMsg = cause
              ? `${cause.code ?? ''} ${cause.message ?? ''} ${cause.detail ?? ''} (col=${cause.column ?? '?'})`
              : (err as Error).message;
            const sample = JSON.stringify(snakeToCamel(batch[0])).slice(0, 400);
            throw new Error(`insert failed at row ${processed + 1}: ${causeMsg}\nfirst row: ${sample}`);
          }
        }
        // Other templates: phase 06+ adds their physical tables.
        processed += batch.length;
        this.inFlight.set(jobId, { processedRows: processed, totalRows: null });
        await this.db.update(buildJobs).set({ processedRows: processed }).where(eq(buildJobs.id, jobId));
        batch.length = 0;
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try { batch.push(JSON.parse(line)); } catch { /* swallow malformed line */ }
          if (batch.length >= 1000) await flush();
        }
      }
      if (buffer.trim()) {
        try { batch.push(JSON.parse(buffer)); } catch { /* */ }
      }
      await flush();

      await this.db.update(buildJobs).set({
        status: 'completed',
        finishedAt: new Date(),
      }).where(eq(buildJobs.id, jobId));

      await this.db.update(masterTables).set({
        status: 'completed',
        rowCount: processed,
        lastBuildAt: new Date(),
        lastBuildMs: Date.now() - start,
        columns: ((spec as { outputColumns?: unknown }).outputColumns ?? null) as never,
        updatedAt: new Date(),
      }).where(eq(masterTables.id, masterTableId));

      // Surface the built artefact in the Data Catalog. Failure logs
      // a warning but doesn't fail the build itself — catalog metadata
      // is layered on top, not load-bearing.
      try {
        await this.catalog.upsertFromMasterTable(masterTableId);
      } catch (e) {
        this.log.warn(`[build ${jobId}] catalog upsert failed: ${(e as Error).message}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.error(`[build ${jobId}] ${msg}`);
      await this.db.update(buildJobs).set({
        status: 'failed',
        error: msg,
        finishedAt: new Date(),
      }).where(eq(buildJobs.id, jobId));
      await this.db.update(masterTables).set({
        status: 'failed',
        updatedAt: new Date(),
      }).where(eq(masterTables.id, masterTableId));
    } finally {
      this.inFlight.delete(jobId);
    }
  }
}
