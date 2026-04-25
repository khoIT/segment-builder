import { Module, Global, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');
export type Db = NodePgDatabase<typeof schema>;

// Reads DATABASE_URL from env; one Pool per process.
const dbProvider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: (cfg: ConfigService): Db => {
    const url = cfg.getOrThrow<string>('DATABASE_URL');
    const pool = new Pool({ connectionString: url, max: 10 });
    return drizzle(pool, { schema, logger: cfg.get('LOG_LEVEL') === 'debug' });
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [dbProvider],
  exports: [dbProvider],
})
export class DbModule {}

// Convenience decorator for injecting the drizzle client.
export const InjectDb = () => Inject(DRIZZLE);
