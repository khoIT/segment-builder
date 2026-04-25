import { z } from 'zod';
import { GameCode } from './primitives.js';

export const FreshnessTargetType = z.enum(['table', 'metric']);
export type FreshnessTargetType = z.infer<typeof FreshnessTargetType>;

export const FreshnessStatus = z.enum(['healthy', 'warning', 'breach']);
export type FreshnessStatus = z.infer<typeof FreshnessStatus>;

export const FreshnessRecord = z.object({
  target: z.string(),                  // 'master.session' | 'churn_risk_score'
  game: GameCode,
  type: FreshnessTargetType,
  sla: z.string(),                     // '15m' | '5m' | '1h' | '2h'
  current: z.string(),                 // '2m' | '22m' | '32m' — current age
  status: FreshnessStatus,
  breaches7d: z.number().int().nonnegative(),
  trend: z.array(z.number()),          // 24-point sparkline
});
export type FreshnessRecord = z.infer<typeof FreshnessRecord>;
