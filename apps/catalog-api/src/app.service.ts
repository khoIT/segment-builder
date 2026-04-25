import { Injectable } from '@nestjs/common';
import { MetricStatus, Metric } from '@bedrock/contracts';

@Injectable()
export class AppService {
  // Smoke test: prove @bedrock/contracts resolves at runtime + reports its
  // schema shape. Replaced with real handlers in phases 03/04.
  getHello(): string {
    const statuses = MetricStatus.options.join(', ');
    const fieldCount = Object.keys(Metric.shape).length;
    return `bedrock catalog-api • Metric has ${fieldCount} fields • status options: ${statuses}`;
  }
}
