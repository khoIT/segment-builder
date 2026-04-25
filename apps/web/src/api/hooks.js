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

// ─── Data Catalog (always-live, no fallback) ────────────────────────
// The Data Catalog page is live-only by design: real Postgres rows
// (catalog_tables / catalog_columns) seeded by the backend.
//
// `retry: 3` + `refetchOnMount: 'always'` makes these queries resilient
// to a transient backend restart — without them, the first failed
// attempt sticks in the cache and "Failed to fetch" persists until the
// user hard-reloads. Backoff caps at ~6s so navigation feels snappy.
const RESILIENT = {
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 6000),
  refetchOnMount: 'always',
};

export function useDataCatalog(filters = {}) {
  return useQuery({
    queryKey: ['dataCatalog', filters],
    queryFn: () => api(`/catalog${qs(filters)}`),
    ...RESILIENT,
  });
}

export function useDataCatalogTable(id) {
  return useQuery({
    queryKey: ['dataCatalogTable', id],
    queryFn: () => api(`/catalog/${id}`),
    enabled: !!id,
    ...RESILIENT,
  });
}

export function useDataCatalogLineage(id) {
  return useQuery({
    queryKey: ['dataCatalogLineage', id],
    queryFn: () => api(`/catalog/${id}/lineage`),
    enabled: !!id,
  });
}


// Per-column profile (null %, distinct, top values). Hits query-svc.
export function useColumnProfile(catalog, schema, table, column) {
  return useQuery({
    queryKey: ['columnProfile', catalog, schema, table, column],
    queryFn: () => q(`/q/trino/profile/${catalog}/${schema}/${table}/${column}`),
    enabled: !!catalog && !!schema && !!table && !!column,
    staleTime: 5 * 60_000, // 5 min client-side; server cache is 24h
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

// ─── Metric-builder (M1) ────────────────────────────────────────────
// All four hooks are always-live; metric authoring has no fallback.

// Live SQL preview as the user clicks through the builder. Caller
// should pass a fully-formed MetricSpec; backend returns rendered SQL
// and (best-effort) row estimate.
export function useSqlPreview(spec) {
  return useQuery({
    queryKey: ['metricPreviewSql', spec],
    queryFn: () => api('/metrics/spec/preview-sql', {
      method: 'POST',
      body: JSON.stringify({ spec }),
    }),
    // Accept both new shape (sources[]) and legacy shape (cohort) for back-compat.
    enabled: !!spec && !!(spec.sources?.[0]?.table ?? spec.cohort?.sourceTable) && !!spec.aggregation?.fn,
    staleTime: 30_000,
  });
}

export function useCreateMetricFromSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/metrics', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metrics'] });
      qc.invalidateQueries({ queryKey: ['metricPipelines'] });
    },
  });
}

// Trigger an immediate materialization (out-of-band of the cron schedule).
export function useRunMetricNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/metrics/${id}/run-now`, { method: 'POST', body: '{}' }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['metric', id] });
      qc.invalidateQueries({ queryKey: ['metricPipeline', id] });
      qc.invalidateQueries({ queryKey: ['metricRuns', id] });
    },
  });
}

export function usePauseMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paused }) =>
      api(`/metrics/${id}/${paused ? 'resume' : 'pause'}`, { method: 'POST', body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metricPipelines'] }),
  });
}

export function useMetricPipeline(id) {
  return useQuery({
    queryKey: ['metricPipeline', id],
    queryFn: () => api(`/metrics/${id}/pipeline`),
    enabled: !!id,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'pending' || s === 'running' ? 1500 : false;
    },
  });
}

export function useMetricRuns(id, limit = 20) {
  return useQuery({
    queryKey: ['metricRuns', id, limit],
    queryFn: () => api(`/metrics/${id}/runs?limit=${limit}`),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

// ─── Connectors ─────────────────────────────────────────────────────
// Always-live (no fallback). Connector list is a live-only feature —
// demo state relies on seeded rows in Postgres, not mock JSX data.

export function useConnectors() {
  return useQuery({
    queryKey: ['connectors'],
    queryFn: () => api('/connectors'),
    ...RESILIENT,
  });
}

export function useCreateConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/connectors', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connectors'] }),
  });
}

export function useTestConnection(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/connectors/${id}/test`, { method: 'POST', body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connectors'] }),
  });
}

// SegmentBuilder-shaped view over the metrics registry.
// Returns `{ name, unit, realtime, id, hasPipeline }[]` so the segment
// canvas can drop the BR_METRICS mock dependency. Lightweight: derives
// from /metrics + cross-checks /metrics/:id/pipeline lazily.
export function useSegmentMetricCatalog() {
  const live = useApi();
  return useQuery({
    queryKey: ['segmentMetricCatalog'],
    queryFn: async () => {
      const res = await api('/metrics?pageSize=500');
      return (res.items ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        unit: m.unit,
        realtime: !!m.realtime,
        category: m.category,
        // hasPipeline derived later if needed; default true for newly
        // authored metrics (which always have a pipeline).
        hasPipeline: m.type === 'custom',
      }));
    },
    enabled: live,
    initialData: live ? undefined : [],
  });
}
