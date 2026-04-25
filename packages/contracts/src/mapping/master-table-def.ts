import { z } from 'zod';
import { Id, Iso8601, GameCode } from '../primitives.js';
import { ColumnSpec } from './dsl.js';

// MasterTableDefinition = a saved spec that a build job materialises.
// Distinct from `MasterTable` (catalog summary view) in master-table.ts
// at the top level — that one is the UI-facing list shape; this one is
// the build-substrate definition.
export const BuildJobStatus = z.enum(['pending', 'running', 'completed', 'failed']);
export type BuildJobStatus = z.infer<typeof BuildJobStatus>;

export const MasterTableDefinition = z.object({
  id: Id,
  name: z.string().min(1),
  gameCode: GameCode,
  templateId: z.string().min(1),                   // determines physical table
  mappingId: Id,
  status: z.enum(['never_built', 'building', 'completed', 'failed']),
  lastBuildAt: Iso8601.nullable(),
  lastBuildMs: z.number().int().nonnegative().nullable(),
  rowCount: z.number().int().nonnegative(),
  columns: z.array(ColumnSpec).nullable(),         // snapshot at last build
  createdAt: Iso8601,
  updatedAt: Iso8601,
});
export type MasterTableDefinition = z.infer<typeof MasterTableDefinition>;

export const BuildJob = z.object({
  id: Id,
  masterTableId: Id,
  status: BuildJobStatus,
  processedRows: z.number().int().nonnegative(),
  totalRows: z.number().int().nonnegative().nullable(),
  error: z.string().nullable(),
  startedAt: Iso8601,
  finishedAt: Iso8601.nullable(),
});
export type BuildJob = z.infer<typeof BuildJob>;

export const BuildResult = z.object({
  jobId: Id,
  status: BuildJobStatus,
  rowCount: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  errors: z.array(z.string()).default([]),
});
export type BuildResult = z.infer<typeof BuildResult>;
