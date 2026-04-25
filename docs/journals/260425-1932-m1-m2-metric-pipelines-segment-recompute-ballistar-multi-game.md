# M1 + M2 + Ballistar: End-to-End Metric Pipelines, Segment Recompute, Multi-Game Catalog

**Date:** 2026-04-25 19:32
**Severity:** High
**Component:** Query Service (metric materializer, scheduler), Catalog API (segment recompute), Web (metric builder, segment editor), Postgres migrations
**Status:** Resolved

## What Happened

Shipped three phases of the LiveOps data pipeline: (1) PMs author metrics as declarative specs, materializer compiles SQL and writes materialized tables; (2) Segment audiences auto-update from metric values via nightly recompute; (3) Added Ballistar as a second game alongside CFM. Verified live end-to-end: metric POST → scheduler fires → rows appear → segment size updates. Three commits: c15ee78 (M1), 0305f76 (M2), ca0bd4b (Ballistar).

## M1: Metric Pipelines (c15ee78)

**Schema & Contract:**
- `metric_pipelines` table 1:1 with `metrics.id`; Zod `MetricSpec` in `packages/contracts/src/metric-spec.ts`
- MetricSpec: `{cohort, window, aggregation, filters, schedule, output}`
- Identifier whitelist `^[a-z0-9_]+$` prevents SQL injection; parameterised filters only

**Compiler:** `apps/query-svc/src/driver/sql-builder/metric.builder.ts`
- Pure function: MetricSpec → SQL `SELECT date, key, value FROM metric_<id>_values`
- Handles window types: fixed (days), cohort_relative (rolling from install_date), ever
- Filters: `{any|all: [metric, op, value]}` → WHERE clauses via parameterized queries

**Materializer:** `apps/query-svc/src/metric-materializer/`
- Opens transaction, lazily creates `metric_<id>_values(date, key, value)` if missing
- Idempotent: skips rows already present (by date+key composite)
- Logs to `metric_runs` table with start/end times, row count, status

**Scheduler:** `apps/catalog-api/src/scheduler/` — pg-boss in `pgboss` schema
- Cron schedule stored in `metric_pipelines.schedule` (e.g. `0 2 * * *` = 2am daily)
- MaterializeHandler mints service JWT against `JWT_SECRET`, calls query-svc `/metrics/{id}/materialize`
- 3-failure auto-flag: after 3 consecutive failures, pipeline marked `status: 'failed'` and paused
- pg-boss boot was crashing with "pg_ prefix reserved" — renamed schema to `pgboss`

**UI:** `apps/web/src/metric-builder/` — 8 files
- 4-step wizard: source table → grouping key → window type → aggregation + schedule
- Live MetricSpec JSON display + rendered SQL preview rail
- PipelinePanel injected into MetricsCatalog detail view
- Submit POST /metrics, visible in SegmentBuilder metric picker

**Live Verification:**
- POST /metrics `{name: 'whale_spend_30d', spec: {...}}` → 201
- Manual run POST /metrics/{id}/materialize → `✓ 2238 rows in 99ms`
- `metric_whale_spend_30d_values` created with 2238 rows
- Status transition `pending → active`, `lastRowCount` updated, `freshness_records` written
- Injection attempt: POST with `name: "whale_spend_30d'; DROP TABLE metrics; --"` rejected at identifier whitelist (400)

## M2: Segment Recompute (0305f76)

**Frontend Integration:**
- SegmentBuilder filter editor merges live `/metrics` registry with BR_METRICS mock fallback
- Debounced live preview-count via `mutate(/segments/{id}/preview-count)` — updates UI instantly
- Criteria stored as `{all|any: [{metric, op, value}]}` structure

**Query Service:** SegmentCounter in `apps/query-svc/src/counter/`
- Runs criteria against `metric_<id>_values` tables
- One CTE per filter, INTERSECT (all) or UNION (any) to find matching keys
- Parameterised queries, latest-date only (avoids cross-date overlap issues)
- Returns set of matching user keys + count

**Catalog API:** `RecomputeSegmentsHandler`
- Walks all segments with `criteria` defined
- Calls query-svc `POST /counter/preview-count` via internal-JWT
- Writes back `segments.size` + `sizeTrend` ('up'|'down'|'stable')
- Daily cron `0 0 * * *` + manual trigger `POST /segments/recompute`
- Timing: 4–8s for segment with 2 metric filters across 1M metric values

**Live Verification:**
- Segment created: `{name: 'top_spenders', criteria: {all: [{metric: 'whale_spend_30d', op: '>=', value: 5}]}}`
- Initial size: 0 (metric had no values yet)
- POST /segments/recompute
- 4s later: size = 70, sizeTrend = 'up'
- Closed loop: metric values → segment audience ✓

**Caveat:** SegmentCounter uses `MAX(date)` per metric independently. If whale_spend_30d has 2026-04-25 data but another metric only has 2026-04-24, INTERSECT returns 0 even if keys match on the shared date. Will need "most recent date all metrics share" before scaling.

## Ballistar — Second Game (ca0bd4b)

**Game Addition:**
- GAMES fixture: `ballistar` (id=`blstr`, code=`BLSTR`, trinoSchema=`ballistar`)
- Migration 0004: `game_id` text column added to all `raw_etl_*` tables (default `'cfm'` preserves existing rows)
- Migration 0005: `layer` column to `catalog_tables` (`raw_event | aggregate | master`) — wired end-to-end (zod, drizzle, orchestrator upsert, response)

**Simulator Generalization:**
- `DEFAULT_SIMULATIONS = [{gameId: 'cfm', rows: 30000}, {gameId: 'blstr', rows: 15000}]`
- Generates 45K rows total across both games

**Catalog Builder:** `derive-from-local.ts` rewritten
- Now: `(gameId, gameCode, target)` → filters raw queries by `game_id`
- Writes to per-game `catalog_<game>_<id>` tables
- Fixed Postgres 65535-parameter cap: dynamic batch sizing `floor(65535 * 0.9 / columnCount)`

**Specs Auto-Clone:** `cfmToBlstr()` function
- 8 BLSTR specs auto-cloned from CFM (id-prefix `blstr_`, sourceRef `iceberg.ballistar.*`, row count × 0.5)
- Examples: `blstr_sessions`, `blstr_in_app_events`, `blstr_user_master`
- Materialization parallelizes across both games

**Final Seed Result:**
- All 24 catalog tables populated: 16 CFM/cross-game + 8 BLSTR
- ~135K BLSTR rows total
- Data Catalog perf rewritten: 64 sequential queries (col-count + lineage per row) → 3 batched queries + 30s in-memory cache
- Cold: 56ms / Cached: 41ms for 11 CFM tables

**Side Fix:** Data Catalog game-chip filter bug
- Specific-game chip excluded cross-game cubes (WHERE game IS NULL)
- Fixed client-side filter to include them
- Clearer empty-state message now distinguishes "catalog truly empty" from "filter excludes everything"

## The Brutal Truth

M1 was the scaffolding we needed. Materializer is clean; scheduler works. But the rough edges showed up fast: pg-boss schema name reserved, parameter cap on bulk inserts, planner-stats hanging on empty `blstr_sessions` with LATERAL joins. Each required a targeted fix — not catastrophic, but proof that the pipeline touches many moving parts.

M2 felt like the feature working "for free" once M1 landed. But SegmentCounter's independent MAX(date) per metric is a ticking time bomb. At 100+ segments with diverse metric schedules, INTERSECT will silently return 0 keys because we're not comparing on a shared date. We got lucky that test metrics all materialized on the same day.

Ballistar forced us to generalize. The simulator, catalog builder, and spec cloning all assumed CFM was the only game. Pushing game_id through migrations and defaults was mechanical, but it meant re-testing everything: Did the migrations preserve CFM data? Do the cloned BLSTR specs inherit the right column names? Does the UI filter work now? All yes — but it required discipline.

## Bugs Fixed This Session

1. **Postgres 65535-parameter cap:** Bulk insert in simulator was 5000-row batches × 14-col profile = 70K params/query. Postgres throws "bind message has 4464 formats but 0 parameters" 08P01 error. Fix: dynamic batch sizing `floor(65535 * 0.9 / cols)` per game/table.

2. **`pg_boss` schema reserved:** pg-boss boot crashed with "prefix pg_ reserved for system schemas". Renamed to `pgboss` in Drizzle schema + pg-boss config.

3. **Planner-stats hang on `blstr_sessions` LATERAL:** After migration 0004 added `game_id`, Postgres still had pre-seed empty stats. The LATERAL subquery in sessions derive estimated ~0 rows, fell into a degenerate plan that never returned. Fix: `ANALYZE` each `raw_etl_*` table post-insert. blstr_sessions went from "hangs forever" → 803ms.

## What Still Needs Real Data Later

- `freshness_records.sla` hardcoded `'24h'` — swap for real SLA registry
- `getRuns` reads only latest run from `metric_pipelines` signals; full history in `pgboss.archive` should be JOINed (P13, M3 incremental refresh phase)
- `cohort_relative` window only emits placeholder rolling-days + warning — needs JOIN to `master_user_profile_dx.install_date`
- Catalog-api `previewSql` route surfaces upstream 400s as 500 (minor pass-through bug)
- SegmentCounter uses MAX(date) per metric independently — switch to "most recent date all metrics share" before 100+ segments
- PTG and TFB have no per-game synthetic data; only Ballistar joined CFM. Adding more games now mechanical.

## Unresolved

- Should pipelines auto-pause after 3 failures or just flag? Currently flagged (`status: 'failed'`), left for human resume.
- Persisting `node.feature` in segment criteria as metric **name** vs **id** — SegmentCounter resolves both, but id binding cleaner for renames. Open: do segments target specific metric **version** or always latest by name?
- Recompute handler runs all segments nightly — fine at current scale but add `criteria_changed_at` watermark before scaling.

## Next Steps

1. **SegmentCounter shared-date logic** — switch from per-metric MAX(date) to "latest date all referenced metrics share"
2. **Metric runs history** — JOIN pgboss.archive to show full run log (not just latest) in MetricsCatalog
3. **PTG/TFB game data seeding** — extend DEFAULT_SIMULATIONS, clone specs from CFM template
4. **Auto-pause on failure** — decide: requeue after delay or leave flagged for manual intervention
