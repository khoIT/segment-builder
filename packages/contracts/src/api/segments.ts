import { z } from 'zod';
import { Pagination, Id, GameCode } from '../primitives.js';
import { Segment, SegmentStatus, SegmentFilter, SegmentCriteria } from '../segment.js';

export const ListSegmentsQuery = Pagination.extend({
  game: GameCode.optional(),
  status: SegmentStatus.optional(),
  owner: z.string().optional(),
  search: z.string().optional(),
});
export type ListSegmentsQuery = z.infer<typeof ListSegmentsQuery>;

export const ListSegmentsResponse = z.object({
  items: z.array(Segment),
  total: z.number().int().nonnegative(),
});
export type ListSegmentsResponse = z.infer<typeof ListSegmentsResponse>;

export const CreateSegmentRequest = z.object({
  name: z.string().min(1),
  game: GameCode,
  desc: z.string(),
  owner: z.string(),
  status: SegmentStatus.default('draft'),
  filters: z.array(SegmentFilter),
  criteria: SegmentCriteria.nullable().optional(),
});
export type CreateSegmentRequest = z.infer<typeof CreateSegmentRequest>;

export const UpdateSegmentRequest = CreateSegmentRequest.partial();
export type UpdateSegmentRequest = z.infer<typeof UpdateSegmentRequest>;

export const SegmentIdParam = z.object({ id: Id });
export type SegmentIdParam = z.infer<typeof SegmentIdParam>;
