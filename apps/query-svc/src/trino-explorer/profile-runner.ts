import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProfilePgClient } from './profile-pg-client';
import { makeTrino, runTrino } from '../driver/trino-client';
import type { Trino } from 'trino-client';

// Computes column data-quality profile (null %, distinct count, top-5
// values). Branches on catalog: 'bedrock' → local Postgres `catalog_<id>`
// table; otherwise Trino with LIMIT 100k cap. Identifier-whitelisted at
// boundary to block injection.

const ID_RE = /^[a-z0-9_]+$/;

export type RunnerProfile = {
  nullPct: number;
  distinctCount: number;
  topValues: { value: string | null; count: number; pct: number }[];
  sampledRows: number;
};

@Injectable()
export class ProfileRunner {
  private trinoClient: Trino | null = null;

  constructor(
    private readonly cfg: ConfigService,
    private readonly pg: ProfilePgClient,
  ) {}

  private trino(): Trino {
    if (!this.trinoClient) this.trinoClient = makeTrino(this.cfg);
    return this.trinoClient;
  }

  private assertSafe(...idents: string[]) {
    for (const s of idents) {
      if (!ID_RE.test(s)) throw new BadRequestException(`invalid identifier: ${s}`);
    }
  }

  async run(catalog: string, schema: string, table: string, column: string): Promise<RunnerProfile> {
    this.assertSafe(catalog, schema, table, column);

    const isBedrock = catalog === 'bedrock' || table.startsWith('catalog_');
    return isBedrock
      ? this.runPostgres(table, column)
      : this.runTrino(catalog, schema, table, column);
  }

  private async runPostgres(table: string, column: string): Promise<RunnerProfile> {
    const pool = this.pg.pg();
    const tot = await pool.query(
      `SELECT count(*)::bigint AS total,
              count(*) FILTER (WHERE "${column}" IS NULL)::bigint AS nulls,
              count(DISTINCT "${column}")::bigint AS distinct_count
       FROM "${table}"`,
    );
    const r = tot.rows[0] as { total: string; nulls: string; distinct_count: string };
    const total = Number(r.total);
    const nulls = Number(r.nulls);
    const distinctCount = Number(r.distinct_count);

    const top = await pool.query(
      `SELECT "${column}"::text AS value, count(*)::bigint AS cnt
       FROM "${table}"
       WHERE "${column}" IS NOT NULL
       GROUP BY 1
       ORDER BY 2 DESC
       LIMIT 5`,
    );
    const topValues = (top.rows as { value: string | null; cnt: string }[]).map((tr) => ({
      value: tr.value,
      count: Number(tr.cnt),
      pct: total > 0 ? Number(tr.cnt) / total : 0,
    }));

    return {
      nullPct: total > 0 ? nulls / total : 0,
      distinctCount,
      topValues,
      sampledRows: total,
    };
  }

  private async runTrino(catalog: string, schema: string, table: string, column: string): Promise<RunnerProfile> {
    const fqn = `"${catalog}"."${schema}"."${table}"`;
    const totRes = await runTrino(
      this.trino(),
      `WITH s AS (SELECT "${column}" AS v FROM ${fqn} LIMIT 100000)
       SELECT count(*) AS total,
              count(*) FILTER (WHERE v IS NULL) AS nulls,
              approx_distinct(v) AS distinct_count
       FROM s`,
      [],
      1,
    );
    const r0 = totRes.rows[0] ?? [0, 0, 0];
    const total = Number(r0[0] ?? 0);
    const nulls = Number(r0[1] ?? 0);
    const distinctCount = Number(r0[2] ?? 0);

    const topRes = await runTrino(
      this.trino(),
      `WITH s AS (SELECT "${column}" AS v FROM ${fqn} LIMIT 100000)
       SELECT CAST(v AS VARCHAR) AS value, count(*) AS cnt
       FROM s
       WHERE v IS NOT NULL
       GROUP BY 1
       ORDER BY 2 DESC
       LIMIT 5`,
      [],
      5,
    );
    const topValues = topRes.rows.map((row) => ({
      value: row[0] == null ? null : String(row[0]),
      count: Number(row[1] ?? 0),
      pct: total > 0 ? Number(row[1] ?? 0) / total : 0,
    }));

    return { nullPct: total > 0 ? nulls / total : 0, distinctCount, topValues, sampledRows: total };
  }
}
