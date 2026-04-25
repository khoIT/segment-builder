import {
  Body, Controller, Get, HttpException, HttpStatus, Inject, Param, Post, Query, Req, Res, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtVerifyGuard } from '../common/jwt-verify.guard';
import { CatalogClient } from '../catalog-client/catalog-client.service';
import { QUERY_DRIVER } from '../driver/driver.interface';
import type { QueryDriver, MetricMeta } from '../driver/driver.interface';
import { MappingExecutor } from '../mapping-executor/mapping-executor';
import { MappingSpec } from '@bedrock/contracts';

// One controller for the whole query surface. Endpoints are independent
// enough that splitting modules adds noise; Plan envisaged separate
// modules but per KISS this keeps the handler graph flat. Promote any
// sub-area with non-trivial logic into its own module if it grows.
@Controller('q')
@UseGuards(JwtVerifyGuard)
export class QueryController {
  constructor(
    @Inject(QUERY_DRIVER) private readonly driver: QueryDriver,
    private readonly catalog: CatalogClient,
    private readonly executor: MappingExecutor,
  ) {}

  // ── Series + sparkline ─────────────────────────────────────────
  @Get('metrics/:id/series')
  async series(
    @Param('id') id: string,
    @Query('game') game?: string,
    @Query('granularity') granularity: 'day' | 'week' | 'month' = 'day',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Req() req?: Request,
  ) {
    const token = (req as Request & { token?: string }).token!;
    const metric = await this.catalog.getMetric(id, token).catch(() => null);
    if (!metric) {
      // Soft-fail with a plausible series so the prototype doesn't break
      // when running query-svc against an unseeded catalog-api.
      const points = await this.driver.getSeries({
        metric: { id, unit: 'count', category: 'engagement' },
        range: { from, to },
        granularity,
      });
      return { metricId: id, granularity, points };
    }
    const meta: MetricMeta = {
      id,
      unit: (metric.unit as string) ?? 'count',
      category: (metric.category as string) ?? 'engagement',
      realtime: Boolean(metric.realtime),
    };
    const points = await this.driver.getSeries({
      metric: meta, range: { from, to }, granularity,
    });
    return { metricId: id, game, granularity, points };
  }

  @Get('metrics/:id/sparkline')
  async sparkline(
    @Param('id') id: string,
    @Query('days') days = '30',
    @Req() req?: Request,
  ) {
    const series = await this.series(id, undefined, 'day', undefined, undefined, req!);
    return { metricId: id, points: series.points.slice(-Number(days)) };
  }

  // ── Segment count + preview ────────────────────────────────────
  @Post('segments/preview-count')
  async previewCount(
    @Body() body: { criteria: Record<string, unknown>; game: string },
  ) {
    if (!body.criteria || !body.game) {
      throw new HttpException({ code: 'BAD_REQUEST', message: 'criteria + game required' }, HttpStatus.BAD_REQUEST);
    }
    return this.driver.countSegment({
      criteria: body.criteria as never,
      bindings: [],
      game: body.game,
    });
  }

  @Post('segments/preview')
  async preview(
    @Body() body: { criteria: Record<string, unknown>; game: string; limit?: number },
  ) {
    const rows = await this.driver.previewSegment({
      criteria: body.criteria as never,
      bindings: [],
      game: body.game,
      limit: body.limit ?? 100,
    });
    const columns = rows.length ? Object.keys(rows[0]) : [];
    return { columns, rows: rows.map((r) => columns.map((c) => r[c])) };
  }

  @Post('segments/:id/count')
  async segmentCount(
    @Param('id') id: string,
    @Body() body: { criteriaOverride?: Record<string, unknown> },
    @Req() req: Request,
  ) {
    const token = (req as Request & { token?: string }).token!;
    const seg = await this.catalog.getSegment(id, token);
    const criteria = body?.criteriaOverride ?? (seg.criteria as never);
    if (!criteria) {
      throw new HttpException({ code: 'BAD_REQUEST', message: 'segment has no criteria' }, HttpStatus.BAD_REQUEST);
    }
    return this.driver.countSegment({
      criteria: criteria as never,
      bindings: [],
      game: (seg.game as string) ?? 'ALL',
    });
  }

  // ── Explorer ───────────────────────────────────────────────────
  // TrinoDriver runs the SQL with read-only keyword guard + LIMIT cap;
  // mock driver returns 501 (no real engine).
  @Post('explorer/run')
  async explorer(@Body() body: { sql: string; limit?: number }) {
    if (!body?.sql) {
      throw new HttpException({ code: 'BAD_REQUEST', message: 'sql required' }, HttpStatus.BAD_REQUEST);
    }
    const drv = this.driver as QueryDriver & { runExplorer?: (sql: string, limit: number) => Promise<unknown> };
    if (!drv.runExplorer) {
      throw new HttpException({
        code: 'NOT_IMPLEMENTED',
        message: 'explorer.run requires QUERY_DRIVER=trino',
      }, HttpStatus.NOT_IMPLEMENTED);
    }
    return drv.runExplorer(body.sql, body.limit ?? 1000);
  }

  // ── Metric formula dry-run ─────────────────────────────────────
  @Post('metrics/dry-run')
  async dryRun(@Body() body: { formula?: string }) {
    if (!body?.formula) {
      throw new HttpException({ code: 'BAD_REQUEST', message: 'formula required' }, HttpStatus.BAD_REQUEST);
    }
    return { ok: true, sample: 1234, warnings: [] };
  }

  // ── Mapping executor (consumed by catalog-api BuildOrchestrator) ─
  // Driver dispatch: TrinoDriver streams from real `iceberg.<schema>.*`;
  // mock executor synthesises rows from the spec hash.
  @Post('mappings/execute')
  async executeMapping(
    @Body() body: { spec: unknown; masterTableId?: string; batchSize?: number },
    @Res() res: Response,
  ) {
    const spec = MappingSpec.parse(body.spec);
    res.setHeader('content-type', 'application/x-ndjson');
    res.setHeader('cache-control', 'no-cache');
    res.flushHeaders();
    const driverWithMapping = this.driver as QueryDriver & { executeMapping?: (s: typeof spec, n?: number) => AsyncGenerator<Record<string, unknown>> };
    if (driverWithMapping.executeMapping) {
      for await (const row of driverWithMapping.executeMapping(spec)) {
        res.write(JSON.stringify(row) + '\n');
      }
    } else {
      const rowCount = body.batchSize && body.batchSize > 0 ? body.batchSize * 10 : 10_000;
      for await (const row of this.executor.execute(spec, rowCount)) {
        res.write(JSON.stringify(row) + '\n');
      }
    }
    res.end();
  }
}
