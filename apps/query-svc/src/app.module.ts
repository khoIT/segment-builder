import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { HttpErrorFilter } from './common/http-error.filter';
import { CorrelationMiddleware } from './common/correlation.middleware';
import { CatalogClientModule } from './catalog-client/catalog-client.module';
import { DriverModule } from './driver/driver.module';
import { QueryModule } from './query/query.module';
import { TrinoExplorerModule } from './trino-explorer/trino-explorer.module';
import { MetricMaterializerModule } from './metric-materializer/metric-materializer.module';
import { HealthModule } from './health/health.module';

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
    CatalogClientModule,
    DriverModule,
    QueryModule,
    TrinoExplorerModule,
    MetricMaterializerModule,
    HealthModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: HttpErrorFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
