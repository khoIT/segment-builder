import { quoteIdent, quoteFqn } from './identifier';
import type { DateRange, Granularity, MetricMeta } from '../driver.interface';

// Per-unit aggregation heuristic. Real queries can override via
// metric.formula once we parse it; v1 keeps it simple.
function aggregationFor(unit: string, valueColumn: string): string {
  switch (unit) {
    case 'USD':
    case 'count':
    case 'minutes':
    case 'days':
      return `SUM(${quoteIdent(valueColumn)})`;
    case 'ratio':
    case 'prob':
      return `AVG(${quoteIdent(valueColumn)})`;
    default:
      return `COUNT(${quoteIdent(valueColumn)})`;
  }
}

function truncFor(granularity: Granularity): string {
  if (granularity === 'week') return 'week';
  if (granularity === 'month') return 'month';
  return 'day';
}

export type SeriesQuery = {
  catalog: string;       // 'iceberg'
  schema: string;        // 'cfm_vn'
  table: string;         // 'etl_recharge'
  dateColumn: string;    // 'event_date' / 'dteventtime'
  valueColumn: string;   // 'amount_usd' / 'session_id' / etc.
  metric: MetricMeta;
  range: DateRange;
  granularity: Granularity;
};

export type BuiltQuery = { sql: string; params: unknown[] };

export function buildSeriesQuery(q: SeriesQuery): BuiltQuery {
  const fqn = quoteFqn([q.catalog, q.schema, q.table]);
  const dc = quoteIdent(q.dateColumn);
  const trunc = truncFor(q.granularity);
  const agg = aggregationFor(q.metric.unit, q.valueColumn);

  // Mandatory date guards — billions of rows otherwise. Default to 30d.
  const to = q.range.to ?? new Date().toISOString().slice(0, 10);
  const fromDate = q.range.from ?? (() => {
    const d = new Date(to);
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();

  const sql = [
    `SELECT date_trunc('${trunc}', CAST(${dc} AS DATE)) AS ts,`,
    `       ${agg} AS value`,
    `FROM ${fqn}`,
    `WHERE ${dc} BETWEEN ? AND ?`,
    `GROUP BY 1`,
    `ORDER BY 1`,
    `LIMIT 1000`,
  ].join('\n');

  return { sql, params: [fromDate, to] };
}
