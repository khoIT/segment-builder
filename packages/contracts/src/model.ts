import { z } from 'zod';
import { Id, GameCode } from './primitives.js';

export const ModelStatus = z.enum(['production', 'staging', 'training', 'archived']);
export type ModelStatus = z.infer<typeof ModelStatus>;

export const Model = z.object({
  id: Id,
  name: z.string(),
  target: z.string(),                    // free-text target description
  game: GameCode,
  auc: z.number().min(0).max(1),
  samples: z.string(),                   // display — '2.4M' / '340K'
  trained: z.string(),                   // display — '3h ago' / '1d ago'
  status: ModelStatus,
  features: z.union([z.array(Id), z.number().int().nonnegative()]),
});
export type Model = z.infer<typeof Model>;
