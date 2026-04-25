import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { DbModule } from './db/client';
import { AuthModule } from './auth/auth.module';
import { JwtGuard } from './auth/jwt.guard';
import { HealthModule } from './health/health.module';
import { HttpErrorFilter } from './common/http-error.filter';
import { CorrelationMiddleware } from './common/correlation.middleware';
import { AuditModule } from './audit/audit.module';
import { CatalogModule } from './catalog/catalog.module';
import { MetricsModule } from './metrics/metrics.module';
import { SegmentsModule } from './segments/segments.module';
import { PinsModule } from './pins/pins.module';
import { MappingsModule } from './mappings/mappings.module';
import { MasterTablesModule } from './master-tables/master-tables.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ConnectorsModule } from './connectors/connectors.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport: process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
          : undefined,
        customProps: (req) => ({ requestId: req.headers['x-request-id'] }),
      },
    }),
    DbModule,
    AuthModule,
    AuditModule,
    HealthModule,
    CatalogModule,
    MetricsModule,
    SegmentsModule,
    PinsModule,
    MappingsModule,
    MasterTablesModule,
    PipelinesModule,
    SchedulerModule,
    ConnectorsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpErrorFilter },
    { provide: APP_GUARD, useClass: JwtGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
