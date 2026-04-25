import { z } from 'zod';
import { Id, Iso8601 } from './primitives.js';

export const AuditAction = z.enum([
  'create',
  'update',
  'delete',
  'archive',
  'pin',
  'unpin',
  'login',
  'logout',
]);
export type AuditAction = z.infer<typeof AuditAction>;

export const AuditEntity = z.enum([
  'metric',
  'segment',
  'source',
  'mapping',
  'master_table',
  'campaign',
  'user',
]);
export type AuditEntity = z.infer<typeof AuditEntity>;

export const AuditLog = z.object({
  id: Id,
  userId: Id,
  action: AuditAction,
  entity: AuditEntity,
  entityId: Id,
  diff: z.record(z.string(), z.unknown()).nullable(),
  createdAt: Iso8601,
});
export type AuditLog = z.infer<typeof AuditLog>;
