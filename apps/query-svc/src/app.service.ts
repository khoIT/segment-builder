import { Injectable } from '@nestjs/common';
import { Query } from '@bedrock/contracts';

@Injectable()
export class AppService {
  // Smoke test: prove @bedrock/contracts resolves at runtime + can validate
  // a query DTO. Replaced with real series/count/preview handlers in phase 05.
  getHello(): string {
    const sample = Query.GetSeriesQuery.parse({ metricId: 'm_sessions_7d' });
    return `bedrock query-svc • parsed sample series query: ${JSON.stringify(sample)}`;
  }
}
