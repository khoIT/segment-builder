import { z } from 'zod';
import { SnakeCaseName, Iso8601 } from './primitives.js';
import { GoodDir, MetricUnit, MetricCategory } from './metric.js';

// ─────────────────────────────────────────────────────────────────────
// MetricSpec — declarative shape of a no-code metric authored by a PM
// in metric-builder/. Compiled to SQL by query-svc and materialized
// into per-pipeline `metric_<id>_values` tables on a schedule by the
// pg-boss scheduler in catalog-api.
// ─────────────────────────────────────────────────────────────────────

// Identifier whitelist — applied to all table/alias/column names before
// any SQL interpolation. Lower-case only (our raw table/column naming
// convention). Rejects injection attempts at parse time.
const SafeIdent = z.string().regex(/^[a-z0-9_]+$/, {
  message: 'must be lowercase alphanumeric with underscores only',
});

// What field do we aggregate, and how? `column: null` is reserved for
// `count` aggregation (counts rows, ignores column).
export const MetricAggregationFn = z.enum([
  'sum', 'count', 'count_distinct', 'avg', 'max', 'min',
]);
export type MetricAggregationFn = z.infer<typeof MetricAggregationFn>;

export const MetricAggregation = z.object({
  fn: MetricAggregationFn,
  // column may be qualified `<alias>.<col>` OR unqualified (defaults to primary alias).
  // Allow dots and standard ident chars; deeper validation in superRefine.
  column: z.string().regex(/^[a-z0-9_.]+$/).nullable(),
  cast: z.enum(['numeric', 'integer']).optional(),
});
export type MetricAggregation = z.infer<typeof MetricAggregation>;

// ─── Multi-source types ───────────────────────────────────────────────

// One source table binding: table name → SQL alias → key column.
// Alias must be unique within the spec; compiler uses it in FROM/JOIN.
export const SourceBinding = z.object({
  table: SafeIdent,
  alias: SafeIdent,
  keyColumn: SafeIdent,
});
export type SourceBinding = z.infer<typeof SourceBinding>;

// A single equi-join condition (left_alias.left_col = right_alias.right_col).
export const JoinPair = z.object({
  leftCol: SafeIdent,
  rightCol: SafeIdent,
});
export type JoinPair = z.infer<typeof JoinPair>;

// One JOIN clause between two aliased sources.
export const Join = z.object({
  leftAlias: SafeIdent,
  rightAlias: SafeIdent,
  on: z.array(JoinPair).min(1),
});
export type Join = z.infer<typeof Join>;

// ─── Back-compat: MetricCohort (single-source, legacy shape) ─────────
// Kept for back-compat readers. New code should use SourceBinding[].
export const MetricCohort = z.object({
  sourceTable: z.string(),                                  // 'raw_etl_recharge' | 'catalog_<id>'
  keyColumn: z.string(),                                    // 'vopenid' | 'playeropenid'
});
export type MetricCohort = z.infer<typeof MetricCohort>;

// Window = how far back from "today" the compiler scans.
export const MetricWindow = z.object({
  kind: z.enum(['rolling_days', 'cohort_relative']),
  days: z.number().int().positive().max(365),
  eventDateColumn: z.string(),
});
export type MetricWindow = z.infer<typeof MetricWindow>;

// Filter ops. Compiler always parameterises values to prevent injection.
export const MetricFilterOp = z.enum([
  '=', '!=', '>', '<', '>=', '<=', 'in', 'not_in',
]);
export type MetricFilterOp = z.infer<typeof MetricFilterOp>;

export const MetricFilter = z.object({
  // column may be qualified `<alias>.<col>`; if unqualified, compiler
  // defaults to primary source alias.
  column: z.string(),
  op: MetricFilterOp,
  value: z.unknown(),
});
export type MetricFilter = z.infer<typeof MetricFilter>;

// Schedule = when to materialize.
export const MetricSchedule = z.object({
  kind: z.enum(['cron', 'on_event']),
  expr: z.string(),
});
export type MetricSchedule = z.infer<typeof MetricSchedule>;

// Display metadata.
export const MetricSpecOutput = z.object({
  unit: MetricUnit,
  goodDir: GoodDir,
});
export type MetricSpecOutput = z.infer<typeof MetricSpecOutput>;

// ─── New MetricSpec (multi-source) ───────────────────────────────────
// Full MetricSpec — what's persisted in `metric_pipelines.spec` jsonb.
// Primary source = sources[0]; drives FROM, GROUP BY key column.
// Additional sources are INNER JOINed via the joins[] array.
export const MetricSpec = z.object({
  sources: z.array(SourceBinding).min(1).max(3),
  joins: z.array(Join).default([]),
  window: MetricWindow,
  aggregation: MetricAggregation,
  filters: z.array(MetricFilter).default([]),
  schedule: MetricSchedule,
  output: MetricSpecOutput,
}).superRefine((spec, ctx) => {
  // Enforce: joins.length === sources.length - 1
  const expectedJoins = spec.sources.length - 1;
  if (spec.joins.length !== expectedJoins) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `joins.length (${spec.joins.length}) must equal sources.length - 1 (${expectedJoins})`,
      path: ['joins'],
    });
    return;
  }

  // Collect known aliases for validation
  const knownAliases = new Set(spec.sources.map((s) => s.alias));

  // Validate join aliases refer to known sources
  for (let i = 0; i < spec.joins.length; i++) {
    const join = spec.joins[i];
    if (!join) continue;
    if (!knownAliases.has(join.leftAlias)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `joins[${i}].leftAlias "${join.leftAlias}" not found in sources`,
        path: ['joins', i, 'leftAlias'],
      });
    }
    if (!knownAliases.has(join.rightAlias)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `joins[${i}].rightAlias "${join.rightAlias}" not found in sources`,
        path: ['joins', i, 'rightAlias'],
      });
    }
  }

  // Validate aggregation column qualifier resolves to a known alias
  // when multi-source. If unqualified and >1 source, it defaults to
  // primary alias (don't reject — defaulting is friendlier per spec).
  if (spec.aggregation.column && spec.sources.length > 1) {
    const parts = spec.aggregation.column.split('.');
    if (parts.length === 2) {
      const alias = parts[0];
      if (alias && !knownAliases.has(alias)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `aggregation.column alias "${alias}" not found in sources`,
          path: ['aggregation', 'column'],
        });
      }
    }
  }
});
export type MetricSpec = z.infer<typeof MetricSpec>;

// ─── Pipeline state (1:1 with metrics.id) ────────────────────────────
export const MetricPipelineStatus = z.enum([
  'pending', 'running', 'active', 'failed', 'paused',
]);
export type MetricPipelineStatus = z.infer<typeof MetricPipelineStatus>;

export const MetricPipeline = z.object({
  id: z.string(),
  spec: MetricSpec,
  schedule: z.string(),
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

// ─── Run history rows ────────────────────────────────────────────────
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
export const CreateMetricFromSpecRequest = z.object({
  id: SnakeCaseName.optional(),
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
