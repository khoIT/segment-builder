import { z } from 'zod';
import { Id, GameCode } from './primitives.js';

export const CampaignStatus = z.enum([
  'draft',
  'scheduled',
  'running',
  'paused',
  'finished',
  'archived',
]);
export type CampaignStatus = z.infer<typeof CampaignStatus>;

export const Campaign = z.object({
  id: Id,
  name: z.string(),
  segmentId: Id,
  game: GameCode,
  channel: z.string(),                   // 'push + in-game' / 'email + push'
  status: CampaignStatus,
  sent: z.string(),                      // display — '18.4K' / '—'
  reached: z.number().int().nonnegative(),
  converted: z.number().int().nonnegative(),
  revenue: z.string(),                   // display — '₫ 1.24B' / '—'
  ctr: z.string(),                       // display — '22.4%' / '—'
  start: z.string(),                     // 'Apr 18' / 'Ongoing'
  end: z.string(),
});
export type Campaign = z.infer<typeof Campaign>;
