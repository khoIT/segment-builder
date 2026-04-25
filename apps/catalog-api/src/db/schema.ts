import {
  pgTable, uuid, text, integer, boolean, timestamp, jsonb, primaryKey, index,
  bigint, doublePrecision, date,
} from 'drizzle-orm/pg-core';

// ═══════════════════════════════════════════════════════════════════
// Catalog API DB schema. One source of truth — drizzle-kit generates
// migration SQL from this. Names mirror Postgres conventions
// (snake_case columns, plural table names) so raw SQL stays readable.
// ═══════════════════════════════════════════════════════════════════

// Tenant table — one row per game (PTG, CFM, TFB).
export const games = pgTable('games', {
  id: text('id').primaryKey(),                        // 'cfm', 'ptg', 'tfb'
  code: text('code').notNull(),                       // 'CFM', 'PTG', 'TFB'
  name: text('name').notNull(),
  short: text('short').notNull(),
  color: text('color').notNull(),
  players: text('players'),
  genre: text('genre'),
  trinoSchema: text('trino_schema'),                  // 'cfm_vn'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('viewer'),    // admin | editor | viewer
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Metric definition — semantic shape only. Per-game source bindings live
// in `metric_source_bindings` so different schemas can implement the
// same metric semantics differently.
export const metrics = pgTable('metrics', {
  id: text('id').primaryKey(),                        // 'm_sessions_7d' (legacy slug or uuid)
  name: text('name').notNull(),
  category: text('category').notNull(),
  topGroup: text('top_group').notNull(),              // engagement|growth|quality|revenue
  type: text('type').notNull(),                       // standard|custom|propensity
  status: text('status').notNull(),                   // certified|experimental|deprecated
  owner: text('owner').notNull(),
  unit: text('unit').notNull(),
  freq: text('freq').notNull(),
  realtime: boolean('realtime').notNull().default(false),
  goodDir: text('good_dir').notNull().default('up'),  // up|down
  formula: text('formula'),
  description: text('description'),
  games: jsonb('games').notNull(),                    // string[]
  windowSpec: text('window_spec').notNull(),          // freeform '7d rolling' etc.
  source: text('source'),
  masterTable: text('master_table'),
  deps: jsonb('deps'),                                // string[] | null
  model: text('model'),
  usedByCount: integer('used_by_count').notNull().default(0),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const metricSourceBindings = pgTable('metric_source_bindings', {
  metricId: text('metric_id').notNull().references(() => metrics.id, { onDelete: 'cascade' }),
  gameId: text('game_id').notNull().references(() => games.id),
  sourceTable: text('source_table').notNull(),
  masterTable: text('master_table'),
  columnMap: jsonb('column_map'),                     // Record<string,string> | null
}, (t) => ({
  pk: primaryKey({ columns: [t.metricId, t.gameId] }),
  byGame: index('msb_by_game').on(t.gameId),
}));

// Append-only metric edit history (companion to optimistic concurrency).
export const metricChangelog = pgTable('metric_changelog', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricId: text('metric_id').notNull().references(() => metrics.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  actorId: text('actor_id').notNull(),
  diff: jsonb('diff').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byMetric: index('mcl_by_metric').on(t.metricId, t.version),
}));

export const segments = pgTable('segments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  game: text('game').notNull(),                       // PTG|CFM|TFB|ALL — denormalised for filter perf
  size: integer('size').notNull().default(0),
  sizeTrend: text('size_trend').notNull().default('flat'),
  delta: text('delta').notNull().default(''),
  status: text('status').notNull().default('draft'),
  owner: text('owner').notNull(),
  updated: text('updated').notNull().default(''),
  campaigns: integer('campaigns').notNull().default(0),
  description: text('description').notNull().default(''),
  filters: jsonb('filters').notNull(),                // SegmentFilter[]
  criteria: jsonb('criteria'),                        // SegmentCriteria | null
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byGame: index('seg_by_game').on(t.game),
}));

export const segmentChangelog = pgTable('segment_changelog', {
  id: uuid('id').primaryKey().defaultRandom(),
  segmentId: text('segment_id').notNull().references(() => segments.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  actorId: text('actor_id').notNull(),
  diff: jsonb('diff').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// User-pinned metrics — keyed by JWT.sub (email in dev, UUID in prod).
// Stored as text to keep dev-mode flexible; tighten to FK once SSO maps
// every claim back to a real users row.
export const userPins = pgTable('user_pins', {
  userId: text('user_id').notNull(),
  entity: text('entity').notNull(),                   // 'metric' | 'segment' | …
  entityId: text('entity_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.entity, t.entityId] }),
}));

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: text('actor_id'),                          // JWT.sub (text, not FK)
  action: text('action').notNull(),                   // create|update|delete|archive|pin|unpin|login|logout
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byEntity: index('audit_by_entity').on(t.entity, t.entityId),
  byActor: index('audit_by_actor').on(t.actorId),
  byCreated: index('audit_by_created').on(t.createdAt),
}));

// Catalog read-only display tables (mirror the prototype's shape).
export const sources = pgTable('sources', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  game: text('game').notNull(),
  cadence: text('cadence').notNull(),
  volume: text('volume').notNull(),
  owner: text('owner').notNull(),
  status: text('status').notNull(),
  lastRun: text('last_run').notNull(),
  topics: jsonb('topics').notNull(),
  path: text('path').notNull(),
});

// Mapping rows — one per saved (game, template) instance. `spec` is the
// full MappingSpec JSON; phase 04b adds builds on top of this.
export const mappings = pgTable('mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  gameId: text('game_id').notNull().references(() => games.id),
  templateId: text('template_id').notNull(),
  spec: jsonb('spec').notNull(),
  owner: text('owner').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byGame: index('mappings_by_game').on(t.gameId),
}));

// Master-table registry — one row per built master. Physical rows live
// in per-template wide tables (see schema-master.ts in phase 04b).
export const masterTables = pgTable('master_tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  gameId: text('game_id').references(() => games.id),
  mappingId: uuid('mapping_id').references(() => mappings.id),
  templateId: text('template_id').notNull(),
  status: text('status').notNull().default('never_built'),
  lastBuildAt: timestamp('last_build_at', { withTimezone: true }),
  lastBuildMs: integer('last_build_ms'),
  rowCount: integer('row_count').notNull().default(0),
  columns: jsonb('columns'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const buildJobs = pgTable('build_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  masterTableId: uuid('master_table_id').notNull().references(() => masterTables.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),                   // pending|running|completed|failed
  processedRows: integer('processed_rows').notNull().default(0),
  totalRows: integer('total_rows'),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
}, (t) => ({
  byMaster: index('jobs_by_master').on(t.masterTableId, t.startedAt),
}));

export const freshness = pgTable('freshness_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  target: text('target').notNull(),                   // table or metric name
  game: text('game').notNull(),
  type: text('type').notNull(),                       // table|metric
  sla: text('sla').notNull(),
  current: text('current').notNull(),
  status: text('status').notNull(),                   // healthy|warning|breach
  breaches7d: integer('breaches_7d').notNull().default(0),
  trend: jsonb('trend').notNull(),                    // number[]
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byTarget: index('fresh_by_target').on(t.target, t.game),
}));

// ─── Raw event tables (per-game, Trino-faithful) ──────────────────
// Per-game raw tables (raw_cfm_*, raw_blstr_*) are NOT modelled in
// drizzle — schemas come from the committed JSON under
// infra/trino-mock/data/<schema>/*.schema.json and the seed creates
// each table dynamically via CREATE TABLE IF NOT EXISTS at boot. This
// keeps drizzle decoupled from upstream Trino schema drift (etl_login
// has 65 cols, etl_game_detail has 230+).

// ─── Data Catalog metadata (phase 01) ───────────────────────────────
// catalog_tables / catalog_columns / column_profiles back the new
// browse-only Data Catalog page. Per-table physical Postgres tables
// (`catalog_<id>`) are created at seed time via raw SQL — drizzle-kit
// only models the metadata, not the 16 ad-hoc data tables.
export const catalogTables = pgTable('catalog_tables', {
  id: text('id').primaryKey(),                          // 'ad_impression_events'
  name: text('name').notNull(),                         // human label, often == id
  game: text('game'),                                   // PTG|CFM|TFB|null (cross-game cube)
  category: text('category').notNull(),                 // 'ua_ads'|'monetization'|'engagement'|...
  // Pipeline tier: raw_event (atomic, metric-source candidate),
  // aggregate (pre-rolled cube / per-user state), master (built via mapping).
  // Drives Metric Builder source filter + Data Catalog layer chip.
  layer: text('layer').notNull().default('aggregate'),
  // Backref to the pipeline that materialises this catalog table.
  // Null for synthetic (no Bedrock-tracked transform) and master tables.
  pipelineId: text('pipeline_id'),
  partitionKeys: jsonb('partition_keys').notNull(),     // string[]
  rowCount: bigint('row_count', { mode: 'number' }).notNull().default(0),
  lastRefreshAt: timestamp('last_refresh_at', { withTimezone: true }),
  sourceKind: text('source_kind').notNull(),            // 'trino-derived'|'synthetic'|'master-build'
  sourceRef: text('source_ref'),                        // 'iceberg.cfm_vn.etl_recharge'|null
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byCategory: index('catalog_by_category').on(t.category),
  byGame: index('catalog_by_game').on(t.game),
  byLayer: index('catalog_by_layer').on(t.layer),
}));

// ─── Pipelines ──────────────────────────────────────────────────
// One row per "raw → catalog" transform. Captures the SQL, the source
// raw_<game>_<table>(s), and the target catalog table so the new
// Pipelines page (renamed from Mapping Studio) can render a flow.
export const pipelines = pgTable('pipelines', {
  id: text('id').primaryKey(),                         // 'pipe_cfm_revenue'
  name: text('name').notNull(),                        // human label
  gameId: text('game_id'),                             // 'cfm'|'blstr'|null (cross-game)
  sourceTables: jsonb('source_tables').notNull(),      // string[] of raw_*_* names
  targetTableId: text('target_table_id').notNull()
    .references(() => catalogTables.id, { onDelete: 'cascade' }),
  transformSql: text('transform_sql').notNull(),
  kind: text('kind').notNull().default('derive'),      // derive|map|materialize
  schedule: text('schedule').notNull().default('manual'),
  status: text('status').notNull().default('idle'),    // idle|running|succeeded|failed
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastRowCount: integer('last_row_count'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byTarget: index('pipelines_by_target').on(t.targetTableId),
  byGame: index('pipelines_by_game').on(t.gameId),
}));

export const catalogColumns = pgTable('catalog_columns', {
  tableId: text('table_id').notNull().references(() => catalogTables.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),                         // 'string'|'int'|'double'|'date'|'timestamp'|'boolean'|'json'
  ordinal: integer('ordinal').notNull(),
  isPii: boolean('is_pii').notNull().default(false),
  description: text('description'),
}, (t) => ({
  pk: primaryKey({ columns: [t.tableId, t.name] }),
}));

export const columnProfiles = pgTable('column_profiles', {
  tableId: text('table_id').notNull(),
  columnName: text('column_name').notNull(),
  nullPct: doublePrecision('null_pct').notNull().default(0),
  distinctCount: bigint('distinct_count', { mode: 'number' }).notNull().default(0),
  topValues: jsonb('top_values').notNull(),             // { value, count, pct }[]
  sampledRows: bigint('sampled_rows', { mode: 'number' }).notNull().default(0),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.tableId, t.columnName] }),
}));

// ─── Per-template master physical tables (phase 04b uses these) ──────
// Common columns: master_table_id (FK), composite PK (master_table_id, vopenid).
// Wide columns mirror MappingTemplate.outputColumns. Rebuilt every build.
export const masterUserProfileDx = pgTable('master_user_profile_dx', {
  masterTableId: uuid('master_table_id').notNull().references(() => masterTables.id, { onDelete: 'cascade' }),
  vopenid: text('vopenid').notNull(),
  roleid: text('roleid'),
  gameId: text('game_id'),
  installDate: date('install_date'),
  mediaSource: text('media_source'),
  countryCode: text('country_code'),
  platform: text('platform'),
  loginRowsD7: integer('login_rows_d7'),
  daysActiveD7: integer('days_active_d7'),
  matchesD7: integer('matches_d7'),
  killsD7: bigint('kills_d7', { mode: 'number' }),
  revUsdD1: doublePrecision('rev_usd_d1'),
  ordersD1: integer('orders_d1'),
  isPayerD1: boolean('is_payer_d1'),
  revUsdD7: doublePrecision('rev_usd_d7'),
  ordersD7: integer('orders_d7'),
  isPayerD7: boolean('is_payer_d7'),
  bpOrdersD7: integer('bp_orders_d7'),
  isBpD7: boolean('is_bp_d7'),
  revUsdD30: doublePrecision('rev_usd_d30'),
  ordersD30: integer('orders_d30'),
  isPayerD30: boolean('is_payer_d30'),
}, (t) => ({
  pk: primaryKey({ columns: [t.masterTableId, t.vopenid] }),
  byInstall: index('mupdx_install').on(t.masterTableId, t.installDate),
  byMedia: index('mupdx_media').on(t.masterTableId, t.mediaSource),
}));

// The other 5 templates' physical tables get added in phase 04b when
// they're actually wired to the build pipeline. KISS — add as needed.

// ─── Connectors (P2: Sources redesign) ──────────────────────────────
// Mock connector registry. pass_encrypted = base64(plaintext) — MOCK ONLY.
// Real KMS vault swap planned for Q5. Never return pass_encrypted from API.
export const connectors = pgTable('connectors', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),                          // 'postgres'|'bigquery'|'s3'|'kafka'
  name: text('name').notNull(),
  env: text('env').notNull().default('production'),
  host: text('host'),
  port: integer('port'),
  db: text('db'),
  user: text('user'),
  passEncrypted: text('pass_encrypted'),                 // base64(pass) — MOCK ONLY
  status: text('status').notNull().default('unknown'),   // 'ok'|'fail'|'unknown'
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  datasetCount: integer('dataset_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byType: index('connectors_by_type').on(t.type),
  byStatus: index('connectors_by_status').on(t.status),
}));

// ─── Metric pipelines (M1: P04) ─────────────────────────────────────
// Plumbing companion to `metrics`: holds the MetricSpec + schedule +
// last-run signals. 1:1 with metrics.id. The compiler in query-svc
// renders spec → SQL; the pg-boss scheduler in catalog-api fires the
// materializer and writes rows into per-pipeline `metric_<id>_values`
// tables created lazily on first run.
export const metricPipelines = pgTable('metric_pipelines', {
  id: text('id').primaryKey().references(() => metrics.id, { onDelete: 'cascade' }),
  spec: jsonb('spec').notNull(),                              // MetricSpec (zod-validated at edge)
  schedule: text('schedule').notNull(),                       // cron expr lifted from spec.schedule.expr for indexing
  status: text('status').notNull().default('pending'),        // pending|running|active|failed|paused
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  lastRowCount: integer('last_row_count'),
  lastError: text('last_error'),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byStatus: index('mp_by_status').on(t.status),
  byNextRun: index('mp_by_next_run').on(t.nextRunAt),
}));
