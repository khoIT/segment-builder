import { Injectable } from '@nestjs/common';
import { ProfilePgClient } from './profile-pg-client';
import type { RunnerProfile } from './profile-runner';

// 24h Postgres-backed cache for column profiles. Lookup checks
// `computed_at > now() - interval '24 hours'`; write upserts.
// Table created by catalog-api migration `0001_data_catalog.sql`.

const TTL_HOURS = 24;

export type CachedProfile = RunnerProfile & { computedAt: string };

@Injectable()
export class ProfileCache {
  constructor(private readonly pg: ProfilePgClient) {}

  // Cache key combines schema + table so iceberg.cfm_vn.X and
  // bedrock.public.catalog_X never collide.
  private key(catalog: string, schema: string, table: string): string {
    return `${catalog}.${schema}.${table}`;
  }

  async get(catalog: string, schema: string, table: string, column: string): Promise<CachedProfile | null> {
    const r = await this.pg.pg().query(
      `SELECT null_pct, distinct_count, top_values, sampled_rows, computed_at
       FROM column_profiles
       WHERE table_id = $1 AND column_name = $2
         AND computed_at > now() - interval '${TTL_HOURS} hours'`,
      [this.key(catalog, schema, table), column],
    );
    if (!r.rows.length) return null;
    const row = r.rows[0] as {
      null_pct: number; distinct_count: string; top_values: unknown; sampled_rows: string; computed_at: Date;
    };
    return {
      nullPct: Number(row.null_pct),
      distinctCount: Number(row.distinct_count),
      topValues: (row.top_values as RunnerProfile['topValues']) ?? [],
      sampledRows: Number(row.sampled_rows),
      computedAt: row.computed_at.toISOString(),
    };
  }

  async put(catalog: string, schema: string, table: string, column: string, p: RunnerProfile): Promise<void> {
    await this.pg.pg().query(
      `INSERT INTO column_profiles (table_id, column_name, null_pct, distinct_count, top_values, sampled_rows, computed_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, now())
       ON CONFLICT (table_id, column_name) DO UPDATE SET
         null_pct       = EXCLUDED.null_pct,
         distinct_count = EXCLUDED.distinct_count,
         top_values     = EXCLUDED.top_values,
         sampled_rows   = EXCLUDED.sampled_rows,
         computed_at    = EXCLUDED.computed_at`,
      [
        this.key(catalog, schema, table), column,
        p.nullPct, p.distinctCount,
        JSON.stringify(p.topValues), p.sampledRows,
      ],
    );
  }
}
