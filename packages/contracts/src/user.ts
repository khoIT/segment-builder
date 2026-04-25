import { z } from 'zod';
import { Id, Iso8601 } from './primitives.js';

export const UserRole = z.enum(['admin', 'editor', 'viewer']);
export type UserRole = z.infer<typeof UserRole>;

export const User = z.object({
  id: Id,
  email: z.email(),
  name: z.string(),
  role: UserRole,
  createdAt: Iso8601,
  updatedAt: Iso8601,
});
export type User = z.infer<typeof User>;
