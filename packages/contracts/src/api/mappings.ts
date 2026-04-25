import { z } from 'zod';
import { Pagination, Id, Iso8601, GameCode } from '../primitives.js';
import { MappingSpec } from '../mapping/dsl.js';

export const MappingRow = z.object({
  id: Id,
  name: z.string(),
  gameCode: GameCode,
  templateId: z.string(),
  spec: MappingSpec,
  owner: z.string(),
  version: z.number().int().positive(),
  createdAt: Iso8601,
  updatedAt: Iso8601,
});
export type MappingRow = z.infer<typeof MappingRow>;

export const ListMappingsQuery = Pagination.extend({
  game: GameCode.optional(),
  templateId: z.string().optional(),
  search: z.string().optional(),
});
export type ListMappingsQuery = z.infer<typeof ListMappingsQuery>;

export const ListMappingsResponse = z.object({
  items: z.array(MappingRow),
  total: z.number().int().nonnegative(),
});
export type ListMappingsResponse = z.infer<typeof ListMappingsResponse>;

export const CreateMappingRequest = z.object({
  name: z.string().min(1),
  gameCode: GameCode,
  spec: MappingSpec,
});
export type CreateMappingRequest = z.infer<typeof CreateMappingRequest>;

export const UpdateMappingRequest = z.object({
  name: z.string().min(1).optional(),
  spec: MappingSpec.optional(),
  ifMatch: z.number().int().positive(),
});
export type UpdateMappingRequest = z.infer<typeof UpdateMappingRequest>;

// Clone-from-template + parameter values. Server applies params to the
// template's `defaultSpec` and persists the resolved spec.
export const CloneFromTemplateRequest = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1),
  gameCode: GameCode,
  params: z.record(z.string(), z.unknown()).default({}),
});
export type CloneFromTemplateRequest = z.infer<typeof CloneFromTemplateRequest>;
