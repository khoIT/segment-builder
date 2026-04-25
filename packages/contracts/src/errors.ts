import { z } from 'zod';

// Standard error envelope returned by every API. `code` is machine-readable;
// `message` is user-safe; `details` carries per-field zod errors when relevant.
export const ApiErrorCode = z.enum([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'TIMEOUT',
  'INTERNAL',
  'TRINO_ERROR',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

export const ApiError = z.object({
  code: ApiErrorCode,
  message: z.string(),
  details: z.record(z.string(), z.unknown()).nullable().optional(),
  requestId: z.string().nullable().optional(),
});
export type ApiError = z.infer<typeof ApiError>;
