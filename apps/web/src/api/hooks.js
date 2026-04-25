import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, q, qs } from './client.js';
import { useApi } from './flag.js';
import {
  listSourcesFallback,
  listMetricsFallback,
  listFreshnessFallback,
  listMasterTablesFallback,
} from './fallback.js';

// ─── Catalog reads ──────────────────────────────────────────────────
// Each hook follows the same shape: `useApi()` decides whether to
// call live API or return the fallback synthesised from the JSX mocks.
// Phase 07 default keeps `VITE_USE_API=false` so the prototype demo
// never breaks; flip the env to point at live endpoints.

export function useSources() {
  const live = useApi();
  return useQuery({
    queryKey: ['sources'],
    queryFn: () => api('/sources'),
    enabled: live,
    initialData: live ? undefined : listSourcesFallback(),
  });
}

export function useMetrics(filters = {}) {
  const live = useApi();
  return useQuery({
    queryKey: ['metrics', filters],
    queryFn: () => api(`/metrics${qs(filters)}`),
    enabled: live,
    initialData: live ? undefined : listMetricsFallback(filters),
  });
}

export function useMetric(id) {
  const live = useApi();
  return useQuery({
    queryKey: ['metric', id],
    queryFn: () => api(`/metrics/${id}`),
    enabled: live && !!id,
  });
}

export function useFreshness() {
  const live = useApi();
  return useQuery({
    queryKey: ['freshness'],
    queryFn: () => api('/freshness'),
    enabled: live,
    initialData: live ? undefined : listFreshnessFallback(),
  });
}

export function useMasterTables(filters = {}) {
  const live = useApi();
  return useQuery({
    queryKey: ['masterTables', filters],
    queryFn: () => api(`/master-tables${qs(filters)}`),
    enabled: live,
    initialData: live ? undefined : listMasterTablesFallback(),
  });
}

// Read up to N rows from a built master_table. Disabled when no id.
export function useMasterTablePreview(id, limit = 50) {
  const live = useApi();
  return useQuery({
    queryKey: ['masterTablePreview', id, limit],
    queryFn: () => api(`/master-tables/${id}/preview?limit=${limit}`),
    enabled: live && !!id,
  });
}

// Trigger a build. Returns { jobId } on success.
export function useBuildMasterTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      api(`/master-tables/${id}/build`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['masterTables'] }),
  });
}

// Poll a build job. Active polling stops when status leaves "running"/"pending".
export function useBuildJobStatus(masterTableId, jobId) {
  const live = useApi();
  return useQuery({
    queryKey: ['buildJob', masterTableId, jobId],
    queryFn: () => api(`/master-tables/${masterTableId}/build/${jobId}`),
    enabled: live && !!masterTableId && !!jobId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'running' || s === 'pending' ? 1500 : false;
    },
  });
}

export function useMappingTemplates() {
  const live = useApi();
  return useQuery({
    queryKey: ['mappingTemplates'],
    queryFn: () => api('/mapping-templates'),
    enabled: live,
  });
}

// ─── Query-svc reads ────────────────────────────────────────────────
export function useMetricSeries(metricId, opts = {}) {
  const live = useApi();
  return useQuery({
    queryKey: ['series', metricId, opts],
    queryFn: () => q(`/q/metrics/${metricId}/series${qs(opts)}`),
    enabled: live && !!metricId,
  });
}

// ─── Pins (per-user, optimistic) ────────────────────────────────────
export function usePins() {
  const live = useApi();
  return useQuery({
    queryKey: ['pins'],
    queryFn: () => api('/me/pins'),
    enabled: live,
    initialData: live ? undefined : { items: [] },
  });
}

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ metricId, pinned }) =>
      api(`/me/pins/${metricId}`, { method: pinned ? 'DELETE' : 'PUT' }),
    onMutate: async ({ metricId, pinned }) => {
      await qc.cancelQueries({ queryKey: ['pins'] });
      const prev = qc.getQueryData(['pins']);
      qc.setQueryData(['pins'], (old) => {
        const items = old?.items ?? [];
        return pinned
          ? { items: items.filter((p) => p.entityId !== metricId) }
          : { items: [...items, { entity: 'metric', entityId: metricId }] };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['pins'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['pins'] }),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────
export function useCreateMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/metrics', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metrics'] }),
  });
}

export function useUpdateMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) =>
      api(`/metrics/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['metrics'] });
      qc.invalidateQueries({ queryKey: ['metric', vars.id] });
    },
  });
}

export function usePreviewSegmentCount() {
  return useMutation({
    mutationFn: (body) =>
      q('/q/segments/preview-count', { method: 'POST', body: JSON.stringify(body) }),
  });
}
