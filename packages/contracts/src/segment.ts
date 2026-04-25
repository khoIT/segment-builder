import { z } from 'zod';
import { Id, Iso8601, GameCode } from './primitives.js';

// Filter inside a segment. `kind` says which catalog entity it references;
// `op` + `value` are intentionally permissive — phase 04 may tighten per-op.
export const SegmentFilterKind = z.enum(['feature', 'metric', 'model']);
export type SegmentFilterKind = z.infer<typeof SegmentFilterKind>;

export const SegmentFilter = z.object({
  kind: SegmentFilterKind,
  ref: z.string(),                       // featureId | metricId | modelId
  op: z.enum(['>', '<', '=', '>=', '<=', 'in', 'between', 'contains']),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});
export type SegmentFilter = z.infer<typeof SegmentFilter>;

// Boolean tree expression form (used by the upcoming AND/OR tree builder).
// Recursive type — `z.lazy` keeps zod happy.
export type SegmentCriteria =
  | { op: 'AND' | 'OR'; children: SegmentCriteria[] }
  | { metricId: string; operator: '>' | '<' | '=' | '>=' | '<=' | 'in'; value: unknown };

export const SegmentCriteria: z.ZodType<SegmentCriteria> = z.lazy(() =>
  z.union([
    z.object({
      op: z.enum(['AND', 'OR']),
      children: z.array(SegmentCriteria),
    }),
    z.object({
      metricId: Id,
      operator: z.enum(['>', '<', '=', '>=', '<=', 'in']),
      value: z.unknown(),
    }),
  ]),
);

export const SegmentStatus = z.enum(['live', 'draft', 'paused', 'archived']);
export type SegmentStatus = z.infer<typeof SegmentStatus>;

export const SegmentTrend = z.enum(['up', 'down', 'flat']);
export type SegmentTrend = z.infer<typeof SegmentTrend>;

export const Segment = z.object({
  id: Id,
  name: z.string(),
  game: GameCode,
  size: z.number().int().nonnegative(),
  sizeTrend: SegmentTrend,
  delta: z.string(),                     // '+312' / '-1.2K' / '+8'
  status: SegmentStatus,
  owner: z.string(),
  updated: z.string(),                   // human display — 'Just now' / '12m ago'
  campaigns: z.number().int().nonnegative(),
  desc: z.string(),
  filters: z.array(SegmentFilter),
  criteria: SegmentCriteria.nullable().optional(),  // future tree form
  createdAt: Iso8601.optional(),
  updatedAt: Iso8601.optional(),
});
export type Segment = z.infer<typeof Segment>;
