import { z } from 'zod';
import { GameCode } from './primitives.js';

// A Game = an analytics tenant. Each maps to a Trino schema (e.g. `cfm_vn`).
// `players` and `genre` are display-only fields ported from the mock data.
export const Game = z.object({
  id: z.string(),                  // 'ptg' | 'cfm' | 'tfb'
  code: GameCode,                  // 'PTG' | 'CFM' | 'TFB'
  name: z.string(),
  short: z.string(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  players: z.string().nullable(),  // e.g. '2.4M DAU' — display string
  genre: z.string().nullable(),
  trinoSchema: z.string().nullable(), // e.g. 'iceberg.cfm_vn' — set in phase 06
});
export type Game = z.infer<typeof Game>;
