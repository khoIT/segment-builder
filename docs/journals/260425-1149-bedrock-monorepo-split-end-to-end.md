# Bedrock Monorepo Split: End-to-End Pnpm + Turborepo Migration

**Date:** 2026-04-25 11:49
**Severity:** Critical
**Component:** Project infrastructure, repo layout, build pipeline
**Status:** Complete (not yet pushed)

## What Happened

Executed entire 8-phase monorepo bootstrap plan end-to-end in one session. Transformed flat Vite/React repo into pnpm workspaces + Turborepo with three apps (web, catalog-api, query-svc), two packages (contracts, shared), and Drizzle/Postgres/NestJS backend stack. Build pipeline end-to-end verified: schema compilation → DB migrations → seeding → Trino refresh → 1M rows materialized → frontend smoke test.

## Technical Details

**Workspace layout:**
```
apps/
  web/              (Vite React, moved src/* from root)
  catalog-api/      (NestJS, Drizzle schema, REST CRUD)
  query-svc/        (NestJS, Trino driver, SQL builder)
packages/
  contracts/        (Zod schemas, DSL, exported CJS)
  shared/           (TanStack Query client, hooks)
pnpm-workspace.yaml (workspaces + nohoist rules)
turborepo.json      (build graph, cache rules)
```

**Catalog API (apps/catalog-api):**
- Drizzle schema: 16 tables (sources, metrics, segments, master_tables, mappings, audit, pins, freshness)
- HTTP error filter + Zod validation pipe
- JWT auth + dev-login (creds=user/pass, token has userId/role)
- Optimistic concurrency (version column, ETag headers)
- Endpoints: `/metrics`, `/segments`, `/sources`, `/master-tables`, `/freshness`, `/mappings`, `/audit`, `/pins`

**Query Service (apps/query-svc):**
- QueryDriver interface + MockJsonlDriver (seeded RNG, ported from React mock series logic)
- TrinoDriver against real Iceberg catalog
- SQL builder: identifier whitelist, criteria translator, series builder, mapping builder
- MappingExecutor (applies cohort filters, hashes PII, materializes to Postgres)

**Contracts (packages/contracts):**
- Mapping DSL: `MapTemplate` (id, label, source, masterTableId, mappings, windowSpec, cacheConfig)
- 6 starter templates (user demographics, purchase behavior, session activity, ltv segments, churn risk, engagement tiers)
- Zod schemas: full validation for all entity types + windowing specs

**Build Orchestrator:**
Synchronous in-process via fire-and-forget Promise. No queue infra — triggers from `/mappings/:id/build` endpoint.

## Key Decisions Made

1. **Schema-per-game multi-tenancy:** cfm_vn, ptg_vn, tfb_vn (matches Trino layout). Not per-user; games are the tenant boundary.
2. **One Postgres table per template:** Avoids sparse column explosion. master_user_profile_dx is for user_template_id=1 cohort only.
3. **Contracts CJS (not ESM):** Nest's default scaffold struggles with ESM re-exports. CJS = zero config, no dynamic imports.
4. **TanStack Query default fallback:** VITE_USE_API=false means demo never breaks even if backend is offline.
5. **Templates-first DSL:** Ad-hoc spec authoring deferred until template patterns prove out. Reduces cognitive load.
6. **Synchronous build executor:** Trades off queue latency for implementation simplicity. Observable via Promise logs; no background-job visibility yet.

## Lessons Learned

- **Workspace dependency resolution is fragile:** Without nohoist rules, pnpm can hoist transitive deps into root; broke Drizzle imports. Adding `"!react"` to nohoist forced explicit dependency in apps/catalog-api.
- **Turborepo cache key semantics matter:** Omitting `inputs` meant cache hits on unrelated changes. Had to explicitly list source files for each task.
- **Drizzle config discovery is eager:** `drizzle.config.ts` imports the schema at parse time. If env vars missing (DATABASE_URL), schema parse fails. Fixed by loading env early in build script.

## Risks

- **Not yet pushed to CI:** Branch has 18 commits; no GitHub Actions run yet. Docker Compose builds untested. PTG/TFB schema discovery incomplete (only cfm_vn done).
- **Build executor not resilient:** Errors in MappingExecutor currently log to stdout only. No retry, no dead-letter queue. UI will not see build status on error.
- **Frontend still mostly mocked:** 9 pages unmigrated to live API (SegmentBuilder, GameAnalytics, PropensityModels, etc.). No TypeScript client codegen yet.

## Commit

Not yet. Branch: feat/monorepo-bootstrap (18 commits ahead of main).

## Next Steps

1. **Push branch and run CI** — validate Docker Compose builds, GitHub Actions pass
2. **Migrate remaining 9 frontend pages** from mock data to live API hooks
3. **MasterTables page integration** — swap to real /master-tables endpoint, add raw-log preview from Trino
4. **Build status UI** — expose MappingExecutor errors/progress to frontend
5. **PTG/TFB schema discovery** — refresh Trino schemas for remaining games
