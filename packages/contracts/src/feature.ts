import { z } from 'zod';
import { Id, GameCode } from './primitives.js';

export const FeatureType = z.enum(['numeric', 'string', 'boolean']);
export type FeatureType = z.infer<typeof FeatureType>;

export const FeatureAgg = z.enum([
  'COUNT',
  'SUM',
  'AVG',
  'LATEST',
  'MODE',
  'MIN',
  'MAX',
  'ML',
]);
export type FeatureAgg = z.infer<typeof FeatureAgg>;

export const Feature = z.object({
  id: Id,
  name: z.string(),
  type: FeatureType,
  game: GameCode,
  agg: FeatureAgg,
  window: z.string(),                    // '7d rolling' / 'realtime' / 'daily'
  users: z.string(),                     // display — '2.4M' / '5.1M'
  last: z.string(),                      // display — '1h ago'
  q: z.string(),                         // SQL/DSL preview string
  owner: z.string(),
  metrics: z.array(Id),                  // upstream metric ids
  masterTable: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
});
export type Feature = z.infer<typeof Feature>;
