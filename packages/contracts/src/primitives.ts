import { z } from 'zod';

// Branded ID — UUID v4 is the convention for catalog-api Postgres tables.
// Some legacy mock IDs use slug form (e.g. `m_sessions_7d`); accept both
// here and tighten in phase 06 once Postgres is the source of truth.
export const Id = z.string().min(1);
export type Id = z.infer<typeof Id>;

// snake_case identifier — used for metric `name`, master table names, etc.
export const SnakeCaseName = z.string().regex(/^[a-z][a-z0-9_]*$/, {
  message: 'must be snake_case (lowercase, digits, underscore; cannot start with digit)',
});
export type SnakeCaseName = z.infer<typeof SnakeCaseName>;

// ISO-8601 timestamp with offset. Use for createdAt / updatedAt across the API.
export const Iso8601 = z.iso.datetime({ offset: true });
export type Iso8601 = z.infer<typeof Iso8601>;

// Game short codes — three live VNGGames titles. `ALL` means cross-game.
export const GameCode = z.enum(['PTG', 'CFM', 'TFB', 'ALL']);
export type GameCode = z.infer<typeof GameCode>;

// Common pagination params for list endpoints.
export const Pagination = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});
export type Pagination = z.infer<typeof Pagination>;
