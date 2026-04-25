import { z } from 'zod';
import { Pagination, Id, GameCode } from '../primitives.js';
import { MasterTableDefinition, BuildJob } from '../mapping/master-table-def.js';

export const ListMasterTablesQuery = Pagination.extend({
  game: GameCode.optional(),
  templateId: z.string().optional(),
});
export type ListMasterTablesQuery = z.infer<typeof ListMasterTablesQuery>;

export const ListMasterTablesResponse = z.object({
  items: z.array(MasterTableDefinition),
  total: z.number().int().nonnegative(),
});
export type ListMasterTablesResponse = z.infer<typeof ListMasterTablesResponse>;

export const CreateMasterTableRequest = z.object({
  name: z.string().min(1),
  gameCode: GameCode,
  mappingId: Id,
});
export type CreateMasterTableRequest = z.infer<typeof CreateMasterTableRequest>;

export const BuildMasterTableRequest = z.object({
  // Allow batch-size override for tuning; default decided by orchestrator.
  batchSize: z.number().int().min(100).max(10_000).optional(),
});
export type BuildMasterTableRequest = z.infer<typeof BuildMasterTableRequest>;

export const BuildMasterTableResponse = z.object({
  job: BuildJob,
});
export type BuildMasterTableResponse = z.infer<typeof BuildMasterTableResponse>;

export const PreviewMasterTableQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
});
export type PreviewMasterTableQuery = z.infer<typeof PreviewMasterTableQuery>;

export const PreviewMasterTableResponse = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.unknown())),
  total: z.number().int().nonnegative(),
});
export type PreviewMasterTableResponse = z.infer<typeof PreviewMasterTableResponse>;
