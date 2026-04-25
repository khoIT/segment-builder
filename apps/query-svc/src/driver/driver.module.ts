import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MockJsonlDriver } from './mock-jsonl.driver';
import { QUERY_DRIVER, QueryDriver } from './driver.interface';

// One env var swap (QUERY_DRIVER=mock|trino) picks the implementation.
// Phase 06 lands TrinoDriver; until then the factory always returns the
// mock and logs an informative error if 'trino' is requested.
const driverProvider = {
  provide: QUERY_DRIVER,
  inject: [ConfigService],
  useFactory: (cfg: ConfigService): QueryDriver => {
    const sel = cfg.get<string>('QUERY_DRIVER') ?? 'mock';
    if (sel === 'trino') {
      // eslint-disable-next-line no-console
      console.warn('[driver] QUERY_DRIVER=trino requested but TrinoDriver is phase 06 — falling back to mock');
    }
    return new MockJsonlDriver();
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [driverProvider, MockJsonlDriver],
  exports: [QUERY_DRIVER],
})
export class DriverModule {}
