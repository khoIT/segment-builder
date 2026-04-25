# What the UI Sees vs. What's Wired: Frontend Triage

**Date:** 2026-04-25 16:21
**Severity:** Medium
**Component:** Frontend, API integration, TanStack Query
**Status:** In progress

## What Happened

Laid TanStack Query foundation across frontend (api/client, api/hooks, fallback to mocks). Migrated 3 pages to live endpoints: Sources, MetricsCatalog, FreshnessSLAs. Remaining 9 pages still render mock data from `src/data.jsx` and `src/bedrockData.jsx`. Backend endpoints all exist and return real data; frontend just hasn't been wired. Build system smoke test passed: both mock and live queries execute without error.

## Technical Details

**TanStack Query setup (packages/shared):**
- `api/client.ts` — queryClient with default options (staleTime=5m, cacheTime=10m)
- `api/hooks.ts` — useGames, useMetrics, useSegments, useSources, useFreshness (all GET → parse JSON, validate with Zod)
- Fallback mechanism: if VITE_USE_API=false (default), hooks return mock data from src/data.jsx
- AuthBootstrapper in App.jsx handles JWT flow (dev-login endpoint)

**Pages migrated to live API (3):**
1. **Sources** — GET /sources, renders 6-8 rows from live catalog-api
2. **MetricsCatalog** — GET /metrics, renders with live freshness + lineage
3. **FreshnessSLAs** — GET /freshness, renders SLA status from live schema

**Pages still on mock data (9):**
1. **SegmentBuilder** — renders SEGMENTS from src/data.jsx; no backend for segment CRUD yet
2. **MasterTables** — renders BR_MASTER_TABLES from src/bedrockData.jsx; no /master-tables endpoint wired to UI (backend exists, not consumed)
3. **MappingStudio** — renders BR_MAPPINGS; /mappings endpoint exists, not wired
4. **RawExplorer** — renders SAMPLE_ROWS; no /trino/sample endpoint wired (backend exists at /q/trino/sample)
5. **FeatureBuilder** — renders FEATURES from src/data.jsx; no backend for feature CRUD
6. **PropensityModels** — renders MODELS from src/data.jsx; no backend model service
7. **LiveMonitor** — renders event stream mock; no websocket or polling service
8. **Campaigns** — renders CAMPAIGNS from src/data.jsx; no backend campaign service
9. **GameAnalytics** — renders GAMES mock analytics; no backend analytics service

**Backend endpoints exist but unwired:**
- `GET /master-tables` — returns full list with materialized row counts
- `GET /master-tables/:id` — returns detail + raw-log sample (uses /q/trino/sample under the hood)
- `GET /mappings` — returns all mapping templates + execution status
- `POST /mappings/:id/build` — triggers MappingExecutor, returns build_id + polling URL
- `GET /builds/:id` — returns build status (running, queued, 50% complete, error, done)
- `GET /q/trino/schemas` — list available Iceberg schemas
- `GET /q/trino/tables/:schema` — list tables in schema
- `GET /q/trino/describe/:schema/:table` — column metadata
- `GET /q/trino/sample/:schema/:table` — 100-row sample from Trino

**Fallback behavior (critical for demo):**
Default env: `VITE_USE_API=false`. Frontend queries hit mock data, never touch backend. If backend is down, demo doesn't break. To enable live API:
```bash
VITE_USE_API=true pnpm dev:web
```

**Build system smoke test:**
```bash
pnpm dev:db      # ✓ Postgres + migrations clean
pnpm migrate      # ✓ 16 tables + audit created
pnpm seed         # ✓ mock data seeded
pnpm dev:catalog  # ✓ NestJS bootstrap, JWT auth ready
pnpm dev:query    # ✓ QueryDriver + TrinoDriver ready
pnpm dev:web      # ✓ Vite + TanStack Query, mocks active
curl /metrics     # ✓ real data returned
curl /q/metrics/:id/series  # ✓ real query results
```

## Why This Matters

The gap between "backend exists" and "UI wired" is intentional. Fallback-to-mock strategy means Bedrock never ships broken (critical for stakeholder demos). 3 pages wired = proof-of-concept that the pipeline works. 9 pages in the backlog aren't blocked; they just need shallow UI rewrites (swap FEATURES for useFeatures() hook, etc.).

## Decisions Made

1. **TanStack Query in shared package:** Centralizes HTTP client logic, enables reuse across all apps without duplication. CJS export means no dynamic imports in Nest bootstrap.
2. **Fallback-to-mock default:** VITE_USE_API=false means demo always works. Zero risk of "backend down = app broken."
3. **No TypeScript client codegen yet:** Zod runtime schemas validate responses, but no tsc codegen. Trades compile-time safety for deployment simplicity (no separate client build step).
4. **Lazy wiring of analytics/models/campaigns:** These are lower-priority pages. Backend services don't exist for them yet (not in plan scope). Deferring UI wiring prevents false sense of completeness.
5. **Build status polling deferred:** GET /builds/:id exists on backend, but no UI component yet. Frontend will loop poll with exponential backoff once MasterTables page is wired.

## Lessons Learned

- **Fallback patterns are force-multipliers:** 9 unwired pages doesn't feel broken because mock data renders identically. Shipping without complete integration isn't reckless if fallback is transparent.
- **Page-level integration is shallow:** Each page needs 1–3 hook swaps. Most UI stays identical. Means the backlog can be parallelized (different devs wire different pages without conflicts).

## Risks

- **Mock vs. real data schema drift:** Zod schemas are the source of truth, but devs can still add mock data that violates contracts. No automated validation of mock data against schemas.
- **9 pages with stale data:** If backend gets real data and mocks don't, pages will look inconsistent to stakeholders. Need a clear story ("These pages refresh on 2026-04-28" or "These pages are demo-only").
- **No TypeScript codegen:** Manual Zod parsing is safe but tedious. If schema changes (e.g., add field to Metric), all pages using mock data must be updated by hand.

## Commit

Not yet (branch: feat/monorepo-bootstrap).

## Next Steps

**Immediate (Priority 1):**
1. Wire MasterTables page to GET /master-tables + add raw-log preview (/q/trino/sample)
2. Wire MappingStudio to GET /mappings, add build trigger + status polling

**Short-term (Priority 2):**
3. Wire SegmentBuilder to segment CRUD endpoints (backend needs to be built)
4. Wire FeatureBuilder to feature CRUD endpoints (backend needs to be built)
5. Add TypeScript client codegen (openapi-ts from NestJS @nestjs/swagger decorators)

**Deferred (Priority 3):**
6. Wire LiveMonitor to event streaming (websocket or SSE)
7. Wire GameAnalytics to real analytics backend (may be external service)
8. Wire Campaigns to backend campaign service (scope TBD)
