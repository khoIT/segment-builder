import { z } from 'zod';
import { GameCode } from './primitives.js';

export const MasterTable = z.object({
  name: z.string(),                    // 'master.session' | 'master.purchase' | …
  game: GameCode,
  rows: z.string(),                    // human display — '4.12B'
  cols: z.number().int().nonnegative(),
  mappings: z.number().int().nonnegative(),
  coverage: z.number().min(0).max(100),
  lastBuild: z.string(),               // human display — '2m ago'
  sla: z.string(),                     // '5m' | '15m' | '1h'
  slaMet: z.boolean(),
  streams: z.array(z.enum(['batch', 'realtime'])),
});
export type MasterTable = z.infer<typeof MasterTable>;
