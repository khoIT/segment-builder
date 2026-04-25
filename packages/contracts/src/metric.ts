import { z } from 'zod';
import { Id, Iso8601, GameCode } from './primitives.js';

// Top-level filter pill bucket on the Metrics Catalog page.
export const MetricTopGroup = z.enum(['engagement', 'growth', 'quality', 'revenue']);
export type MetricTopGroup = z.infer<typeof MetricTopGroup>;

// Fine-grained category. Drives icon/color in the UI.
export const MetricCategory = z.enum([
  'engagement',
  'monetization',
  'progression',
  'retention',
  'social',
  'technical',
  'propensity',
]);
export type MetricCategory = z.infer<typeof MetricCategory>;

export const MetricStatus = z.enum(['certified', 'experimental', 'deprecated']);
export type MetricStatus = z.infer<typeof MetricStatus>;

export const MetricType = z.enum(['standard', 'custom', 'propensity']);
export type MetricType = z.infer<typeof MetricType>;

export const MetricUnit = z.enum([
  'USD',
  'count',
  'minutes',
  'days',
  'prob',
  'ratio',
  'boolean',
  'enum',
  'string',
]);
export type MetricUnit = z.infer<typeof MetricUnit>;

export const MetricFreq = z.enum(['streaming', 'hourly', 'daily', 'weekly']);
export type MetricFreq = z.infer<typeof MetricFreq>;

// Whether a positive delta should render green (`up`) or red (`down`).
export const GoodDir = z.enum(['up', 'down']);
export type GoodDir = z.infer<typeof GoodDir>;

// Core metric shape. `window` is freeform because the mocks use values
// like '7d rolling' / 'cohort D1' / 'realtime' — phase 06 will normalize.
export const Metric = z.object({
  id: Id,
  name: z.string(),
  category: MetricCategory,
  topGroup: MetricTopGroup,
  type: MetricType,
  status: MetricStatus,
  owner: z.string(),
  games: z.array(GameCode).min(1),
  window: z.string(),
  unit: MetricUnit,
  freq: MetricFreq,
  realtime: z.boolean(),
  goodDir: GoodDir,
  formula: z.string().nullable(),
  description: z.string().nullable(),
  source: z.string().nullable(),       // e.g. 'kafka.session_events'
  masterTable: z.string().nullable(),  // e.g. 'master.session'
  deps: z.array(Id).nullable(),        // upstream metric ids for derived metrics
  model: z.string().nullable(),        // for propensity metrics
  usedByCount: z.number().int().nonnegative(),
  version: z.number().int().positive(),
  createdAt: Iso8601,
  updatedAt: Iso8601,
});
export type Metric = z.infer<typeof Metric>;

// Per-game source binding — same metric semantics, different physical paths.
// Decouples metric definitions from per-tenant Trino layouts.
export const MetricBinding = z.object({
  metricId: Id,
  gameCode: GameCode,
  sourceTable: z.string(),
  masterTable: z.string().nullable(),
  columnMap: z.record(z.string(), z.string()).nullable(),
});
export type MetricBinding = z.infer<typeof MetricBinding>;

// UI-side category metadata — colors, icons, descriptions.
export const MetricCategoryMeta = z.object({
  id: MetricCategory,
  label: z.string(),
  icon: z.string(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  desc: z.string(),
});
export type MetricCategoryMeta = z.infer<typeof MetricCategoryMeta>;
