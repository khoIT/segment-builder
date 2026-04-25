import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────
// Pipelines = "raw → catalog" transforms. One row per derivation, plus
// synthetic-pipeline rows for catalog tables generated locally without
// a SQL transform. Backs `GET /pipelines` and `GET /pipelines/:id`.
// ────────────────────────────────────────────────────────────────────

export const PipelineKind = z.enum(['derive', 'map', 'materialize', 'synthetic']);
export type PipelineKind = z.infer<typeof PipelineKind>;

export const PipelineStatus = z.enum(['idle', 'running', 'succeeded', 'failed']);
export type PipelineStatus = z.infer<typeof PipelineStatus>;

export const Pipeline = z.object({
  id: z.string(),
  name: z.string(),
  gameId: z.string().nullable(),               // 'cfm'|'blstr'|null (cross-game)
  sourceTables: z.array(z.string()),           // raw_<game>_<table>[]
  targetTableId: z.string(),                   // catalog_tables.id
  targetTableName: z.string().nullable(),      // joined for convenience
  kind: PipelineKind,
  schedule: z.string(),
  status: PipelineStatus,
  lastRunAt: z.string().nullable(),            // ISO
  lastRowCount: z.number().int().nullable(),
  lastError: z.string().nullable(),
});
export type Pipeline = z.infer<typeof Pipeline>;

export const PipelineDetail = Pipeline.extend({
  transformSql: z.string(),
  // Source tables expanded with column shape so the UI can render the
  // raw side of the flow without a second round-trip per source.
  sources: z.array(z.object({
    name: z.string(),                          // 'raw_cfm_etl_login'
    rowCount: z.number().int().nonnegative(),
    columnCount: z.number().int().nonnegative(),
    columns: z.array(z.object({
      name: z.string(),
      type: z.string(),
    })),
  })),
});
export type PipelineDetail = z.infer<typeof PipelineDetail>;

export const PipelineListResponse = z.object({
  items: z.array(Pipeline),
  total: z.number().int().nonnegative(),
});
export type PipelineListResponse = z.infer<typeof PipelineListResponse>;
