// Per-domain API DTO namespaces. Imported as e.g.
//   import { Metrics, Segments, Query } from '@bedrock/contracts';
//   const q = Metrics.ListMetricsQuery.parse(req.query);
export * as Metrics from './metrics.js';
export * as Segments from './segments.js';
export * as Sources from './sources.js';
export * as Pins from './pins.js';
export * as Audit from './audit.js';
export * as Query from './query.js';
