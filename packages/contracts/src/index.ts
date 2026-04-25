// @bedrock/contracts — single source of truth for the Bedrock REST surface.
// Both backends validate at the edge; the frontend parses responses with the
// same schemas. Schemas are intentionally permissive in this phase — phase
// 06 (Trino recon) will tighten nullability + numeric types where needed.

// Domain entities ----------------------------------------------------
export * from './primitives.js';
export * from './game.js';
export * from './metric.js';
export * from './source.js';
export * from './mapping.js';
export * from './master-table.js';
export * from './catalog.js';
export * from './metric-spec.js';
export * from './freshness.js';
export * from './segment.js';
export * from './feature.js';
export * from './model.js';
export * from './campaign.js';
export * from './user.js';
export * from './audit.js';
export * from './auth.js';
export * from './errors.js';

// Mapping DSL + 6 starter templates ----------------------------------
export * from './mapping/index.js';

// API DTOs (namespaced) ----------------------------------------------
export * from './api/index.js';
