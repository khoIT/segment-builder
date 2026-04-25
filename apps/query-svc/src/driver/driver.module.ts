import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MockJsonlDriver } from './mock-jsonl.driver';
import { TrinoDriver } from './trino.driver';
import { QUERY_DRIVER, QueryDriver } from './driver.interface';

// One env var swap (QUERY_DRIVER=mock|trino) picks the implementation.
// Falls back to mock on any unknown value with an informative log.
const driverProvider = {
  provide: QUERY_DRIVER,
  inject: [ConfigService],
  useFactory: (cfg: ConfigService): QueryDriver => {
    const sel = cfg.get<string>('QUERY_DRIVER') ?? 'mock';
    if (sel === 'trino') {
      // eslint-disable-next-line no-console
      console.log('[driver] using TrinoDriver');
      return new TrinoDriver(cfg);
    }
    return new MockJsonlDriver();
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [driverProvider, MockJsonlDriver, TrinoDriver],
  exports: [QUERY_DRIVER],
})
export class DriverModule {}
