import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

// Read-only Postgres connection for query-svc, scoped to data-catalog
// surface: profile reads on `catalog_<id>` tables and the
// `column_profiles` 24h cache. Separate connection from catalog-api's
// pool — same DB. Reuses DATABASE_URL.

@Injectable()
export class ProfilePgClient {
  private readonly log = new Logger(ProfilePgClient.name);
  private pool: Pool | null = null;

  constructor(private readonly cfg: ConfigService) {}

  pg(): Pool {
    if (!this.pool) {
      const url = this.cfg.getOrThrow<string>('DATABASE_URL');
      this.pool = new Pool({ connectionString: url, max: 4 });
      this.log.log('opened pg pool for profile cache + reads');
    }
    return this.pool;
  }
}
