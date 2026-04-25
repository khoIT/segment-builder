import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────
// Data Catalog contracts. Backs `GET /catalog`, `GET /catalog/:id`,
// `GET /catalog/:id/lineage`. Live shape — no mock fallback for this
// surface (frontend always live-fetches).
// ────────────────────────────────────────────────────────────────────

export const CatalogColType = z.enum([
  'string', 'int', 'bigint', 'double', 'date', 'timestamp', 'boolean', 'json',
]);
export type CatalogColType = z.infer<typeof CatalogColType>;

export const CatalogColumn = z.object({
  name: z.string(),
  type: CatalogColType,
  ordinal: z.number().int().nonnegative(),
  isPii: z.boolean().default(false),
  description: z.string().nullable().optional(),
});
export type CatalogColumn = z.infer<typeof CatalogColumn>;

export const CatalogLineageCounts = z.object({
  metrics:  z.number().int().nonnegative(),
  features: z.number().int().nonnegative(),
  segments: z.number().int().nonnegative(),
  models:   z.number().int().nonnegative(),
});
export type CatalogLineageCounts = z.infer<typeof CatalogLineageCounts>;

// Pipeline tier:
//   raw_source — Trino-faithful staging table (raw_<game>_<trino_table>)
//   raw_event  — standardized atomic event row (valid metric source)
//   aggregate  — pre-rolled cube / per-user state (already a metric)
//   master     — wide master_table built from raw_event via mappings
export const CatalogLayer = z.enum(['raw_source', 'raw_event', 'aggregate', 'master']);
export type CatalogLayer = z.infer<typeof CatalogLayer>;

export const CatalogTable = z.object({
  id: z.string(),
  name: z.string(),
  game: z.string().nullable(),                        // 'PTG'|'CFM'|'TFB'|null
  category: z.string(),
  layer: CatalogLayer,
  // Pipeline that produced this table (null for master-built artefacts).
  pipelineId: z.string().nullable(),
  partitionKeys: z.array(z.string()),
  rowCount: z.number().int().nonnegative(),
  columnCount: z.number().int().nonnegative(),
  lastRefreshAt: z.string().nullable(),               // ISO
  sourceKind: z.string(),                             // 'trino-derived'|'synthetic'|'master-build'
  sourceRef: z.string().nullable(),
  description: z.string().nullable(),
  lineageCounts: CatalogLineageCounts,
});
export type CatalogTable = z.infer<typeof CatalogTable>;

export const CatalogListResponse = z.object({
  items: z.array(CatalogTable),
  total: z.number().int().nonnegative(),
});
export type CatalogListResponse = z.infer<typeof CatalogListResponse>;

export const CatalogSample = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.unknown())),
});
export type CatalogSample = z.infer<typeof CatalogSample>;

export const CatalogTableDetail = CatalogTable.extend({
  columns: z.array(CatalogColumn),
  sample: CatalogSample,
});
export type CatalogTableDetail = z.infer<typeof CatalogTableDetail>;

export const CatalogEntityRef = z.object({
  id: z.string(),
  name: z.string(),
});
export type CatalogEntityRef = z.infer<typeof CatalogEntityRef>;

export const CatalogLineage = z.object({
  metrics:  z.array(CatalogEntityRef),
  features: z.array(CatalogEntityRef),
  segments: z.array(CatalogEntityRef),
  models:   z.array(CatalogEntityRef),
});
export type CatalogLineage = z.infer<typeof CatalogLineage>;

export const CatalogColumnProfile = z.object({
  nullPct: z.number(),
  distinctCount: z.number(),
  topValues: z.array(z.object({
    value: z.string().nullable(),
    count: z.number(),
    pct: z.number(),
  })),
  sampledRows: z.number(),
  computedAt: z.string(),
  cached: z.boolean(),
});
export type CatalogColumnProfile = z.infer<typeof CatalogColumnProfile>;
