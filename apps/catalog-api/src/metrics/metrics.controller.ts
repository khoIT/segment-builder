import {
  Body, Controller, Get, Headers, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../auth/current-user.decorator';
import type { BedrockClaims } from '../auth/auth.service';
import { MetricsService } from './metrics.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { MetricSpec } from '@bedrock/contracts';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly svc: MetricsService,
    private readonly cfg: ConfigService,
    private readonly scheduler: SchedulerService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: BedrockClaims,
    @Query('topGroup') topGroup?: string,
    @Query('category') category?: string,
    @Query('realtime') realtime?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('pinnedOnly') pinnedOnly?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.list({
      topGroup, category, status, type, search,
      realtime: realtime === 'true' ? true : realtime === 'false' ? false : undefined,
      pinnedOnly: pinnedOnly === 'true',
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    }, user.sub);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Get(':id/bindings')
  async bindings(@Param('id') id: string) {
    return { items: await this.svc.bindings(id) };
  }

  @Post()
  async create(@Body() body: Record<string, unknown>, @CurrentUser() user: BedrockClaims) {
    return this.svc.create(body, user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown> & { ifMatch: number },
    @CurrentUser() user: BedrockClaims,
  ) {
    const { ifMatch, ...patch } = body;
    return this.svc.update(id, patch, ifMatch, user);
  }

  @Get(':id/pipeline')
  async pipeline(@Param('id') id: string) {
    return this.svc.getPipeline(id);
  }

  // Trigger an immediate run, out of cron cycle. Returns the boss
  // job id for polling the run history.
  @Post(':id/run-now')
  async runNow(@Param('id') id: string) {
    // Ensure pipeline exists; service throws 404 if not.
    await this.svc.getPipeline(id);
    const jobId = await this.scheduler.runNow(id);
    return { jobId };
  }

  @Post(':id/pause')
  async pause(@Param('id') id: string) {
    await this.scheduler.pausePipeline(id);
    return { id, status: 'paused' };
  }

  @Post(':id/resume')
  async resume(@Param('id') id: string) {
    await this.scheduler.resumePipeline(id);
    return { id, status: 'active' };
  }

  // Recent runs of a pipeline. Pulled from metric_pipelines current
  // signals + (later P13) pg-boss archive. KISS: surface lastRunAt /
  // lastRowCount / lastError as a 1-row history for now.
  @Get(':id/runs')
  async runs(@Param('id') id: string) {
    const p = await this.svc.getPipeline(id);
    const item = p.lastRunAt
      ? [{
          jobId: 'last',
          pipelineId: id,
          status: p.status === 'failed' ? 'failed' : 'completed',
          rowCount: p.lastRowCount ?? null,
          durationMs: null,
          error: p.lastError ?? null,
          startedAt: null,
          finishedAt: p.lastRunAt,
        }]
      : [];
    return { items: item };
  }

  // Forward to query-svc compiler (P06). Returns rendered SQL +
  // (best-effort) row estimate without executing. Authoring-time
  // preview only.
  @Post('spec/preview-sql')
  async previewSql(
    @Body() body: { spec: unknown },
    @Headers('authorization') authHeader?: string,
  ) {
    const spec = MetricSpec.parse(body.spec);
    const base = this.cfg.get<string>('QUERY_SVC_URL') ?? 'http://localhost:3002/api/v1';
    const internal = this.cfg.get<string>('INTERNAL_TOKEN') ?? '';
    const auth = internal ? `Bearer ${internal}` : (authHeader ?? '');
    const res = await fetch(`${base}/q/metrics/spec/compile`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(auth ? { authorization: auth } : {}),
      },
      body: JSON.stringify({ spec }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`compile failed: ${res.status} ${text.slice(0, 300)}`);
    }
    return res.json();
  }
}
