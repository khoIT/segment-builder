import { z } from 'zod';
import { Id, Iso8601, GameCode } from '../primitives.js';
import { SegmentFilter, SegmentCriteria } from '../segment.js';

// ─── Series (metric chart) ─────────────────────────────────────────
export const SeriesGranularity = z.enum(['day', 'week', 'month']);
export type SeriesGranularity = z.infer<typeof SeriesGranularity>;

export const GetSeriesQuery = z.object({
  metricId: Id,
  game: GameCode.optional(),
  from: Iso8601.optional(),
  to: Iso8601.optional(),
  granularity: SeriesGranularity.default('day'),
});
export type GetSeriesQuery = z.infer<typeof GetSeriesQuery>;

export const SeriesPoint = z.object({
  date: z.string(),                     // YYYY-MM-DD
  value: z.number(),
});
export type SeriesPoint = z.infer<typeof SeriesPoint>;

export const GetSeriesResponse = z.object({
  metricId: Id,
  game: GameCode.optional(),
  granularity: SeriesGranularity,
  points: z.array(SeriesPoint),
});
export type GetSeriesResponse = z.infer<typeof GetSeriesResponse>;

// ─── Count (segment size estimate) ─────────────────────────────────
export const CountRequest = z.object({
  game: GameCode,
  filters: z.array(SegmentFilter).optional(),
  criteria: SegmentCriteria.nullable().optional(),
});
export type CountRequest = z.infer<typeof CountRequest>;

export const CountResult = z.object({
  count: z.number().int().nonnegative(),
  approximate: z.boolean().default(false),
  ms: z.number().nonnegative(),
});
export type CountResult = z.infer<typeof CountResult>;

// ─── Preview (sample rows for a segment) ───────────────────────────
export const PreviewRequest = CountRequest.extend({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});
export type PreviewRequest = z.infer<typeof PreviewRequest>;

export const PreviewResult = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.unknown())),
  truncated: z.boolean().default(false),
  ms: z.number().nonnegative(),
});
export type PreviewResult = z.infer<typeof PreviewResult>;

// ─── Explorer (ad-hoc SQL with guard rails) ────────────────────────
export const ExplorerRequest = z.object({
  sql: z.string().min(1).max(8000),
  game: GameCode,
  // Server enforces a hard LIMIT cap; this is the user-requested cap.
  limit: z.coerce.number().int().min(1).max(10_000).default(1000),
  dryRun: z.boolean().default(false),
});
export type ExplorerRequest = z.infer<typeof ExplorerRequest>;

export const ExplorerResult = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.unknown())),
  rowCount: z.number().int().nonnegative(),
  ms: z.number().nonnegative(),
  scannedBytes: z.number().int().nonnegative().optional(),
});
export type ExplorerResult = z.infer<typeof ExplorerResult>;

// Dry-run = parse + validate against guard rails, no execution.
export const DryRunResponse = z.object({
  ok: z.boolean(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
});
export type DryRunResponse = z.infer<typeof DryRunResponse>;
