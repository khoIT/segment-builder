import { Body, Controller, Param, Post } from '@nestjs/common';
import { MetricMaterializer } from './metric-materializer';
import { compileMetricSpec } from '../driver/sql-builder/metric.builder';
import { MetricSpec } from '@bedrock/contracts';

// ─────────────────────────────────────────────────────────────────────
// Two endpoints:
//
//   POST /q/metrics/spec/compile        compile-only (preview-sql path)
//   POST /q/metrics/:id/materialize     compile + execute + write
//
// Both are JWT-guarded by the global guard in app.module.
// ─────────────────────────────────────────────────────────────────────

@Controller('q/metrics')
export class MetricMaterializerController {
  constructor(private readonly mat: MetricMaterializer) {}

  @Post('spec/compile')
  compile(@Body() body: { spec: unknown }) {
    const spec = MetricSpec.parse(body.spec);
    const compiled = compileMetricSpec(spec);
    return {
      sql: compiled.sql,
      params: compiled.params,
      estimatedRows: null,            // EXPLAIN integration parked — keeps preview round-trip < 50ms
      warnings: compiled.warnings,
    };
  }

  @Post(':id/materialize')
  async materialize(
    @Param('id') id: string,
    @Body() body: { spec: unknown },
  ) {
    const spec = MetricSpec.parse(body.spec);
    return this.mat.materialize({ pipelineId: id, spec });
  }
}
