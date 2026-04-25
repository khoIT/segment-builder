import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────
// Mapping DSL — captures the 5 patterns the cfm-analysis SQL covers:
//   1. cohort filter (which users do we measure?)
//   2. role-id resolution (per-user enrichment join)
//   3. time-window aggregation per source (D1, D7, D30, …)
//   4. multi-source LEFT JOIN by user
//   5. type coercion + PII handling on output
//
// The DSL is closed (closed enums for fn / op / type) — every field is
// validated by zod. Templates encode common parameter sets; users tweak
// ~5 knobs (window days, cohort start, game schema, …) instead of
// authoring SQL.
// ─────────────────────────────────────────────────────────────────────

export const FilterOp = z.enum([
  '=', '!=', '>', '<', '>=', '<=',
  'in', 'not_in',
  'between', 'not_between',
  'is_null', 'is_not_null',
]);
export type FilterOp = z.infer<typeof FilterOp>;

export const FilterSpec = z.object({
  column: z.string().min(1),
  op: FilterOp,
  // Permissive on value; SQL builder binds as parameters.
  value: z.unknown().optional(),
});
export type FilterSpec = z.infer<typeof FilterSpec>;

export const AggregationFn = z.enum([
  'count', 'count_distinct', 'approx_distinct',
  'sum', 'avg', 'min', 'max',
  'min_by', 'max_by',
  'first', 'last',
]);
export type AggregationFn = z.infer<typeof AggregationFn>;

export const TypeCast = z.enum(['integer', 'bigint', 'double', 'string', 'date', 'timestamp', 'boolean']);
export type TypeCast = z.infer<typeof TypeCast>;

export const AggregationSpec = z.object({
  alias: z.string().min(1),
  fn: AggregationFn,
  args: z.array(z.string()).default([]),     // column refs
  cast: TypeCast.optional(),
});
export type AggregationSpec = z.infer<typeof AggregationSpec>;

export const ColumnType = z.enum(['string', 'int', 'bigint', 'double', 'date', 'timestamp', 'boolean']);
export type ColumnType = z.infer<typeof ColumnType>;

export const ColumnSpec = z.object({
  name: z.string().min(1),
  type: ColumnType,
  nullable: z.boolean().default(false),
  source: z.string().optional(),             // origin annotation (cohort | enrichment.X | window.Y.Z)
  description: z.string().optional(),
});
export type ColumnSpec = z.infer<typeof ColumnSpec>;

// Cohort = the population we measure. One source table + filters. The
// `keyColumn` is what every downstream block joins on (typically `vopenid`).
export const CohortSpec = z.object({
  sourceTable: z.string().min(1),            // 'std_master_user_profile'
  keyColumn: z.string().min(1),              // 'vopenid'
  filters: z.array(FilterSpec).default([]),
  cohortDateColumn: z.string().optional(),   // 'install_time'
});
export type CohortSpec = z.infer<typeof CohortSpec>;

// Per-user enrichment — e.g. resolve `roleid` via `min_by(roleid, ds)`
// from `etl_new_register`. Shape: 1 row per cohort user.
export const EnrichmentSpec = z.object({
  name: z.string().min(1),                   // 'role_map'
  sourceTable: z.string().min(1),
  joinKey: z.string().min(1),                // 'vopenid' — must match cohort.keyColumn
  filters: z.array(FilterSpec).default([]),
  aggregation: AggregationSpec,              // aggregates rows of source per joinKey
});
export type EnrichmentSpec = z.infer<typeof EnrichmentSpec>;

// One source within a window (e.g. all `etl_login` rows in D7).
// `userKey` overrides cohort.keyColumn when this source's user-id
// column is named differently (e.g. etl_game_detail.playeropenid vs
// std_master_user_profile.vopenid). Builder aliases it back to the
// cohort key in the output CTE.
export const WindowSourceSpec = z.object({
  sourceTable: z.string().min(1),
  dateColumn: z.string().min(1),             // 'dteventtime' | 'ds' | 'event_date'
  filters: z.array(FilterSpec).default([]),
  aggregations: z.array(AggregationSpec).min(1),
  userKey: z.string().min(1).optional(),
});
export type WindowSourceSpec = z.infer<typeof WindowSourceSpec>;

// One time window (D1, D7, D30) covering ≥1 source.
export const WindowSpec = z.object({
  label: z.string().min(1),                  // 'd7' | 'd30'
  days: z.number().int().positive(),
  sources: z.array(WindowSourceSpec).min(1),
});
export type WindowSpec = z.infer<typeof WindowSpec>;

// PII handling — required (not optional) on every spec. Empty arrays
// must be explicit. Hash columns are SHA-256 → 16-char prefix at build.
export const PiiSpec = z.object({
  hashColumns: z.array(z.string()).default([]),
  dropColumns: z.array(z.string()).default([]),
});
export type PiiSpec = z.infer<typeof PiiSpec>;

// Full MappingSpec — what gets persisted in `mappings.spec` JSONB.
export const MappingSpec = z.object({
  version: z.literal(1),
  templateId: z.string().optional(),
  game: z.string().min(1),                   // 'cfm_vn'
  cohort: CohortSpec,
  enrichments: z.array(EnrichmentSpec).default([]),
  windows: z.array(WindowSpec).default([]),
  outputColumns: z.array(ColumnSpec).min(1),
  pii: PiiSpec,
});
export type MappingSpec = z.infer<typeof MappingSpec>;
