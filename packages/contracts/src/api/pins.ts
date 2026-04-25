import { z } from 'zod';
import { Id } from '../primitives.js';
import { AuditEntity } from '../audit.js';

// Per-user pin: lets a user pin metrics, segments, sources to their dashboard.
export const Pin = z.object({
  userId: Id,
  entity: AuditEntity,
  entityId: Id,
});
export type Pin = z.infer<typeof Pin>;

export const PinList = z.object({
  items: z.array(Pin),
});
export type PinList = z.infer<typeof PinList>;

export const PinRequest = z.object({
  entity: AuditEntity,
  entityId: Id,
});
export type PinRequest = z.infer<typeof PinRequest>;
