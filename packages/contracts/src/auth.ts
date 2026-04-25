import { z } from 'zod';
import { Id } from './primitives.js';
import { UserRole } from './user.js';

export const JWTClaims = z.object({
  sub: Id,                              // userId
  email: z.email(),
  role: UserRole,
  iat: z.number().int(),
  exp: z.number().int(),
});
export type JWTClaims = z.infer<typeof JWTClaims>;

// Dev-mode mock login. Real SSO in a later phase.
export const DevLoginRequest = z.object({
  email: z.email(),
  role: UserRole.default('viewer'),
});
export type DevLoginRequest = z.infer<typeof DevLoginRequest>;

export const DevLoginResponse = z.object({
  token: z.string(),
  user: z.object({
    id: Id,
    email: z.email(),
    role: UserRole,
    name: z.string(),
  }),
});
export type DevLoginResponse = z.infer<typeof DevLoginResponse>;
