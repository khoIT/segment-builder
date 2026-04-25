import { z } from 'zod';
import { MetricSpec } from './metric-spec.js';
import type { MetricSpec as MetricSpecType } from './metric-spec.js';

type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

// ─────────────────────────────────────────────────────────────────────
// normalizeMetricSpec — accepts BOTH legacy single-cohort shape AND the
// new multi-source shape. Returns a validated new-shape MetricSpec.
//
// Legacy shape:
//   { cohort: { sourceTable, keyColumn }, window, aggregation, ... }
//
// New shape:
//   { sources: [{ table, alias, keyColumn }], joins: [], window, ... }
//
// Lift rule: cohort → sources[0] with alias 'p', joins: []
// ─────────────────────────────────────────────────────────────────────

// Minimal legacy shape — just enough to detect and extract cohort.
const LegacyCohortField = z.object({
  cohort: z.object({
    sourceTable: z.string().min(1),
    keyColumn: z.string().min(1),
  }),
});

/**
 * Pure function. Accepts either the legacy `{cohort}` shape or the new
 * `{sources, joins}` shape as `unknown` input, normalizes to new shape,
 * and validates through the full MetricSpec zod schema.
 *
 * Throws ZodError if the input is neither recognizable shape.
 */
export function normalizeMetricSpec(input: unknown): MetricSpecType {
  // If input has `cohort` field, lift it to new shape before parsing.
  const legacyParse = LegacyCohortField.safeParse(input);
  if (legacyParse.success) {
    const { cohort } = legacyParse.data;
    // Spread remaining fields; overlay sources + joins.
    // We must not mutate the input object.
    const lifted = {
      ...(input as Record<string, unknown>),
      sources: [
        {
          table: cohort.sourceTable,
          alias: 'p',
          keyColumn: cohort.keyColumn,
        },
      ],
      joins: [],
    };
    // Remove legacy cohort key so MetricSpec parser doesn't see unknown field.
    delete (lifted as Record<string, unknown>).cohort;
    return MetricSpec.parse(lifted);
  }

  // Otherwise attempt to parse directly as new shape.
  return MetricSpec.parse(input);
}

/**
 * Same as normalizeMetricSpec but returns a discriminated union so
 * callers can handle errors without try/catch.
 */
export function safeNormalizeMetricSpec(
  input: unknown,
): SafeParseResult<MetricSpecType> {
  try {
    const result = normalizeMetricSpec(input);
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err };
    }
    // Re-wrap unexpected errors as a ZodError for uniform interface.
    const wrapped = new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: err instanceof Error ? err.message : String(err),
        path: [],
      },
    ]);
    return { success: false, error: wrapped };
  }
}
