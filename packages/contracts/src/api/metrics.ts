import { z } from 'zod';
import { Pagination, Id, GameCode } from '../primitives.js';
import {
  Metric,
  MetricStatus,
  MetricType,
  MetricCategory,
  MetricTopGroup,
  MetricBinding,
} from '../metric.js';

export const ListMetricsQuery = Pagination.extend({
  topGroup: MetricTopGroup.optional(),
  category: MetricCategory.optional(),
  realtime: z.coerce.boolean().optional(),
  status: MetricStatus.optional(),
  type: MetricType.optional(),
  game: GameCode.optional(),
  search: z.string().optional(),
  pinnedOnly: z.coerce.boolean().optional(),
});
export type ListMetricsQuery = z.infer<typeof ListMetricsQuery>;

export const ListMetricsResponse = z.object({
  items: z.array(Metric),
  total: z.number().int().nonnegative(),
});
export type ListMetricsResponse = z.infer<typeof ListMetricsResponse>;

export const MetricDetail = Metric.extend({
  bindings: z.array(MetricBinding),
});
export type MetricDetail = z.infer<typeof MetricDetail>;

export const CreateMetricRequest = Metric.omit({
  id: true,
  topGroup: true,
  goodDir: true,
  usedByCount: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateMetricRequest = z.infer<typeof CreateMetricRequest>;

export const UpdateMetricRequest = CreateMetricRequest.partial();
export type UpdateMetricRequest = z.infer<typeof UpdateMetricRequest>;

export const MetricIdParam = z.object({ id: Id });
export type MetricIdParam = z.infer<typeof MetricIdParam>;
