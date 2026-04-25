export type Granularity = 'day' | 'week' | 'month';

export type SeriesPoint = { date: string; value: number };

export type DateRange = { from?: string; to?: string };

// Minimal binding shape needed by drivers. Mock driver ignores
// columnMap; Trino driver translates against it.
export type MetricBinding = {
  metricId: string;
  gameId?: string;
  sourceTable: string;
  masterTable?: string | null;
  columnMap?: Record<string, string> | null;
};

export type MetricMeta = {
  id: string;
  unit: string;
  category: string;
  realtime?: boolean;
};

export type Criteria =
  | { op: 'AND' | 'OR'; children: Criteria[] }
  | { metricId: string; operator: '>' | '<' | '=' | '>=' | '<=' | 'in'; value: unknown };

export interface QueryDriver {
  getSeries(p: {
    metric: MetricMeta;
    binding?: MetricBinding | null;
    range: DateRange;
    granularity: Granularity;
  }): Promise<SeriesPoint[]>;

  countSegment(p: {
    criteria: Criteria;
    bindings: MetricBinding[];
    game: string;
  }): Promise<{ count: number; ms: number; freshness: string }>;

  previewSegment(p: {
    criteria: Criteria;
    bindings: MetricBinding[];
    game: string;
    limit: number;
  }): Promise<Record<string, unknown>[]>;

  runExplorer?(sql: string, limit: number): Promise<{ rows: unknown[][]; columns: string[]; ms: number }>;
}

export const QUERY_DRIVER = Symbol('QUERY_DRIVER');
