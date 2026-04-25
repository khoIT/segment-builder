import { z } from 'zod';
import { Pagination, GameCode } from '../primitives.js';
import { Source, SourceKind, SourceStatus } from '../source.js';

export const ListSourcesQuery = Pagination.extend({
  game: GameCode.optional(),
  kind: SourceKind.optional(),
  status: SourceStatus.optional(),
  search: z.string().optional(),
});
export type ListSourcesQuery = z.infer<typeof ListSourcesQuery>;

export const ListSourcesResponse = z.object({
  items: z.array(Source),
  total: z.number().int().nonnegative(),
});
export type ListSourcesResponse = z.infer<typeof ListSourcesResponse>;
