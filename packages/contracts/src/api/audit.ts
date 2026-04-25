import { z } from 'zod';
import { Pagination, Id, Iso8601 } from '../primitives.js';
import { AuditAction, AuditEntity, AuditLog } from '../audit.js';

export const ListAuditQuery = Pagination.extend({
  userId: Id.optional(),
  action: AuditAction.optional(),
  entity: AuditEntity.optional(),
  entityId: Id.optional(),
  since: Iso8601.optional(),
  until: Iso8601.optional(),
});
export type ListAuditQuery = z.infer<typeof ListAuditQuery>;

export const ListAuditResponse = z.object({
  items: z.array(AuditLog),
  total: z.number().int().nonnegative(),
});
export type ListAuditResponse = z.infer<typeof ListAuditResponse>;
