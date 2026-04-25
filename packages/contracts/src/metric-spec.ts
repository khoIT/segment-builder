import { z } from 'zod';
import { SnakeCaseName, Iso8601 } from './primitives.js';
import { GoodDir, MetricUnit, MetricCategory } from './metric.js';

// ─────────────────────────────────────────────────────────────────────
// MetricSpec — declarative shape of a no-code metric authored by a PM
// in metric-builder/. Compiled to SQL by query-svc and materialized
// into per-pipeline `metric_<id>_values` tables on a schedule by the
// pg-boss scheduler in catalog-api.
//
// Conceptually parallel to MappingSpec (apps/.../mapping.builder.ts):
// pick a cohort (key column on a raw event table), pick an aggregation
// over a window, optional filters, schedule. Compiler emits a tight
// `SELECT date, key, value FROM <source> ... GROUP BY 1, 2`.
// ─────────────────────────────────────────────────────────────────────

// What field do we aggregate, and how? `column: null` is reserved for
// `count` aggregation (counts rows, ignores column).
export const MetricAggregationFn = z.enum([
  'sum', 'count', 'count_distinct', 'avg', 'max', 'min',
]);
export type MetricAggregationFn = z.infer<typeof MetricAggregationFn>;

export const MetricAggregation = z.object({
  fn: MetricAggregationFn,
  column: z.string().nullable(),                            // null only when fn === 'count'
  cast: z.enum(['numeric', 'integer']).optional(),
});
export type MetricAggregation = z.infer<typeof MetricAggregation>;

// Cohort = which raw event rows belong to which user. The compiler
// groups by (date_trunc(day, eventDate), keyColumn).
export const MetricCohort = z.object({
  sourceTable: z.string(),                                  // 'raw_etl_recharge' | 'catalog_<id>'
  keyColumn: z.string(),                                    // 'vopenid' | 'playeropenid'
});
export type MetricCohort = z.infer<typeof MetricCohort>;

// Window = how far back from "today" the compiler scans. `rolling_days`
// = last N days from now(); `cohort_relative` = first N days after
// cohort install_time (joined separately by compiler).
export const MetricWindow = z.object({
  kind: z.enum(['rolling_days', 'cohort_relative']),
  days: z.number().int().positive().max(365),
  eventDateColumn: z.string(),                              // 'dteventtime' | 'ds'
});
export type MetricWindow = z.infer<typeof MetricWindow>;

// Filter ops. Compiler always parameterises values to prevent injection.
// `value: unknown` because schemas vary (string, number, array for in/not_in).
export const MetricFilterOp = z.enum([
  '=', '!=', '>', '<', '>=', '<=', 'in', 'not_in',
]);
export type MetricFilterOp = z.infer<typeof MetricFilterOp>;

export const MetricFilter = z.object({
  column: z.string(),
  op: MetricFilterOp,
  value: z.unknown(),                                       // string | number | boolean | (string|number)[]
});
export type MetricFilter = z.infer<typeof MetricFilter>;

// Schedule = when to materialize. P07 wires `cron` exprs to pg-boss;
// `on_event` is reserved for streaming/M3 (P12).
export const MetricSchedule = z.object({
  kind: z.enum(['cron', 'on_event']),
  expr: z.string(),                                         // '@daily' | '@hourly' | '0 0 * * *' | 'on raw_etl_recharge insert'
});
export type MetricSchedule = z.infer<typeof MetricSchedule>;

// Display metadata — keeps the spec self-describing so the registry
// doesn't need a separate "what's this for" lookup.
export const MetricSpecOutput = z.object({
  unit: MetricUnit,
  goodDir: GoodDir,
});
export type MetricSpecOutput = z.infer<typeof MetricSpecOutput>;

// Full MetricSpec — what's persisted in `metric_pipelines.spec` jsonb.
export const MetricSpec = z.object({
  cohort: MetricCohort,
  window: MetricWindow,
  aggregation: MetricAggregation,
  filters: z.array(MetricFilter).default([]),
  schedule: MetricSchedule,
  output: MetricSpecOutput,
});
export type MetricSpec = z.infer<typeof MetricSpec>;

// ─── Pipeline state (1:1 with metrics.id) ────────────────────────────
// `metric_pipelines` holds plumbing: the spec + schedule + last-run
// signals. Distinct from `metrics` (semantics: name, owner, formula).
export const MetricPipelineStatus = z.enum([
  'pending', 'running', 'active', 'failed', 'paused',
]);
export type MetricPipelineStatus = z.infer<typeof MetricPipelineStatus>;

export const MetricPipeline = z.object({
  id: z.string(),                                           // matches metrics.id
  spec: MetricSpec,
  schedule: z.string(),                                     // raw cron expr (mirror of spec.schedule.expr; lifted out for indexing)
  status: MetricPipelineStatus,
  lastRunAt: Iso8601.nullable(),
  nextRunAt: Iso8601.nullable(),
  lastRowCount: z.number().int().nonnegative().nullable(),
  lastError: z.string().nullable(),
  consecutiveFailures: z.number().int().nonnegative().default(0),
  createdAt: Iso8601,
  updatedAt: Iso8601,
});
export type MetricPipeline = z.infer<typeof MetricPipeline>;

// ─── Run history rows (persisted via pg-boss; this is the API DTO) ──
export const MetricRunStatus = z.enum([
  'queued', 'running', 'completed', 'failed', 'cancelled',
]);
export type MetricRunStatus = z.infer<typeof MetricRunStatus>;

export const MetricRun = z.object({
  jobId: z.string(),
  pipelineId: z.string(),
  status: MetricRunStatus,
  rowCount: z.number().int().nonnegative().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  error: z.string().nullable(),
  startedAt: Iso8601.nullable(),
  finishedAt: Iso8601.nullable(),
});
export type MetricRun = z.infer<typeof MetricRun>;

// ─── Create-from-spec request body (POST /metrics with spec) ────────
// Lets the metric-builder POST a single payload that creates both the
// `metrics` registry row and the `metric_pipelines` row in one go.
export const CreateMetricFromSpecRequest = z.object({
  id: SnakeCaseName.optional(),                              // server generates if absent
  name: z.string().min(1),
  category: MetricCategory,
  unit: MetricUnit,
  goodDir: GoodDir,
  description: z.string().nullable().optional(),
  games: z.array(z.string()).default([]),
  spec: MetricSpec,
});
export type CreateMetricFromSpecRequest = z.infer<typeof CreateMetricFromSpecRequest>;

// ─── Preview-SQL request/response (POST /metrics/spec/preview-sql) ──
export const PreviewSqlRequest = z.object({
  spec: MetricSpec,
});
export type PreviewSqlRequest = z.infer<typeof PreviewSqlRequest>;

export const PreviewSqlResponse = z.object({
  sql: z.string(),
  params: z.array(z.unknown()),
  estimatedRows: z.number().int().nonnegative().nullable(),
  warnings: z.array(z.string()).default([]),
});
export type PreviewSqlResponse = z.infer<typeof PreviewSqlResponse>;

// ─── Materialize result (POST /q/metrics/:id/materialize) ───────────
export const MaterializeResult = z.object({
  pipelineId: z.string(),
  rowCount: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  sampleValue: z.number().nullable(),
});
export type MaterializeResult = z.infer<typeof MaterializeResult>;
