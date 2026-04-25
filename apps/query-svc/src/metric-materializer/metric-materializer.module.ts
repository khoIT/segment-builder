import { Module } from '@nestjs/common';
import { MetricMaterializer } from './metric-materializer';
import { MetricMaterializerController } from './metric-materializer.controller';
import { ProfilePgClient } from '../trino-explorer/profile-pg-client';

// Re-uses ProfilePgClient (same DATABASE_URL pool). KISS — one
// pg.Pool process-wide. If we later split read/write paths we'll
// introduce a write-pool then.

@Module({
  providers: [MetricMaterializer, ProfilePgClient],
  controllers: [MetricMaterializerController],
  exports: [MetricMaterializer],
})
export class MetricMaterializerModule {}
