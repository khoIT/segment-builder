import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Trino } from 'trino-client';
import type {
  Criteria, DateRange, Granularity, MetricBinding, MetricMeta, QueryDriver, SeriesPoint,
} from './driver.interface';
import { quoteFqn, quoteIdent } from './sql-builder/identifier';
import { buildSeriesQuery } from './sql-builder/series.builder';
import { translateCriteria } from './sql-builder/criteria.translator';
import { buildMappingQuery } from './sql-builder/mapping.builder';
import { makeTrino, runTrino } from './trino-client';
import type { MappingSpec } from '@bedrock/contracts';

// Real Trino driver. Same interface as MockJsonlDriver — driver factory
// in driver.module.ts swaps based on QUERY_DRIVER env. Mandatory date
// guards on series queries (default 30d). All identifiers go through
// the strict whitelist; all values bind as parameters.
@Injectable()
export class TrinoDriver implements QueryDriver {
  private readonly log = new Logger(TrinoDriver.name);
  private client: Trino | null = null;

  constructor(private readonly cfg: ConfigService) {}

  private trino(): Trino {
    if (!this.client) this.client = makeTrino(this.cfg);
    return this.client;
  }

  async getSeries(p: { metric: MetricMeta; binding?: MetricBinding | null; range: DateRange; granularity: Granularity }): Promise<SeriesPoint[]> {
    if (!p.binding?.sourceTable) {
      this.log.warn(`metric ${p.metric.id} has no binding for trino driver`);
      return [];
    }
    const catalog = this.cfg.get<string>('TRINO_CATALOG') ?? 'iceberg';
    const [schema, table] = p.binding.sourceTable.includes('.')
      ? p.binding.sourceTable.split('.')
      : [this.cfg.get<string>('TRINO_DEFAULT_SCHEMA') ?? 'cfm_vn', p.binding.sourceTable];

    const dateColumn = p.binding.columnMap?.timestamp
      ?? p.binding.columnMap?.event_date
      ?? 'event_date';
    const valueColumn = p.binding.columnMap?.amount
      ?? p.binding.columnMap?.value
      ?? 'amount_usd';

    const { sql, params } = buildSeriesQuery({
      catalog, schema, table, dateColumn, valueColumn,
      metric: p.metric, range: p.range, granularity: p.granularity,
    });
    const r = await runTrino(this.trino(), sql, params, 1000);
    return r.rows.map((row) => ({
      date: String(row[0]),
      value: Number(row[1] ?? 0),
    }));
  }

  async countSegment(p: { criteria: Criteria; bindings: MetricBinding[]; game: string }) {
    const start = Date.now();
    const catalog = this.cfg.get<string>('TRINO_CATALOG') ?? 'iceberg';
    const schema = p.game.toLowerCase().replace(/\s+/g, '_');
    const fqn = quoteFqn([catalog, schema, 'std_master_user_profile']);

    const columnFor = (metricId: string): string => {
      const b = p.bindings.find((x) => x.metricId === metricId);
      const col = b?.columnMap?.column ?? metricId;
      return col;
    };

    const { sql: where, params } = translateCriteria(p.criteria, columnFor);
    const sql = `SELECT count(*) AS c FROM ${fqn} WHERE ${where}`;
    const r = await runTrino(this.trino(), sql, params, 1);
    const count = Number(r.rows[0]?.[0] ?? 0);
    return { count, ms: Date.now() - start, freshness: 'now' };
  }

  async previewSegment(p: { criteria: Criteria; bindings: MetricBinding[]; game: string; limit: number }) {
    const catalog = this.cfg.get<string>('TRINO_CATALOG') ?? 'iceberg';
    const schema = p.game.toLowerCase().replace(/\s+/g, '_');
    const fqn = quoteFqn([catalog, schema, 'std_master_user_profile']);
    const cap = Math.min(Math.max(p.limit, 1), 500);

    const columnFor = (metricId: string): string => {
      const b = p.bindings.find((x) => x.metricId === metricId);
      return b?.columnMap?.column ?? metricId;
    };

    const { sql: where, params } = translateCriteria(p.criteria, columnFor);
    const sql = `SELECT * FROM ${fqn} WHERE ${where} LIMIT ${cap}`;
    const r = await runTrino(this.trino(), sql, params, cap);
    return r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])));
  }

  // MappingSpec → Trino SQL → row stream. Used by query-svc's
  // /q/mappings/execute endpoint when QUERY_DRIVER=trino. Caller pipes
  // each yielded record to NDJSON.
  async *executeMapping(spec: MappingSpec, rowCap = 1_000_000): AsyncGenerator<Record<string, unknown>> {
    const catalog = this.cfg.get<string>('TRINO_CATALOG') ?? 'iceberg';
    const { sql, params } = buildMappingQuery(spec, { catalog, rowCap });
    this.log.log(`[mapping] executing on ${catalog}.${spec.game}, ~${spec.outputColumns.length} cols`);
    const r = await runTrino(this.trino(), sql, params, rowCap);
    for (const row of r.rows) {
      yield Object.fromEntries(r.columns.map((c, i) => [c, row[i]]));
    }
  }

  async runExplorer(sql: string, limit: number) {
    // Read-only guard: reject any keyword that mutates state. Combine
    // with a read-only Trino role server-side once available.
    const banned = /\b(INSERT|UPDATE|DELETE|MERGE|CREATE|DROP|ALTER|GRANT|REVOKE|TRUNCATE)\b/i;
    if (banned.test(sql)) {
      throw new Error('explorer.run rejected: write keyword detected');
    }
    const cap = Math.min(Math.max(limit, 1), 10_000);
    // Append LIMIT if absent. Naive — skip if user already wrote one.
    const finalSql = /\blimit\b/i.test(sql) ? sql : `${sql.trim()} LIMIT ${cap}`;
    const r = await runTrino(this.trino(), finalSql, [], cap);
    return { columns: r.columns, rows: r.rows, ms: r.ms };
  }
}
