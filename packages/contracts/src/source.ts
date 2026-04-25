import { z } from 'zod';
import { Id, GameCode } from './primitives.js';

export const SourceKind = z.enum(['batch', 'realtime']);
export type SourceKind = z.infer<typeof SourceKind>;

export const SourceType = z.enum([
  's3_parquet',
  'kafka',
  'webhook',
  'api',
  'postgres',
  'trino',
  'iceberg',
]);
export type SourceType = z.infer<typeof SourceType>;

export const SourceStatus = z.enum(['live', 'syncing', 'degraded', 'error', 'paused']);
export type SourceStatus = z.infer<typeof SourceStatus>;

export const Source = z.object({
  id: Id,
  kind: SourceKind,
  type: SourceType,
  name: z.string(),
  game: GameCode,
  cadence: z.string(),               // 'Daily @ 02:00 ICT' / 'Streaming' / 'Hourly'
  volume: z.string(),                // human display — '4.8B rows/day'
  owner: z.string(),
  status: SourceStatus,
  lastRun: z.string(),               // human display — '3h ago' / '2s ago'
  topics: z.array(z.string()),       // kafka topics or playbook ids
  path: z.string(),                  // s3://… / kafka://… / https://…
});
export type Source = z.infer<typeof Source>;
