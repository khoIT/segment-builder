# Real Trino Plumbed: 1M cfm_vn Rows in master_user_profile_dx

**Date:** 2026-04-25 15:35
**Severity:** High
**Component:** Query Service, SQL builder, Trino driver, Postgres materializer
**Status:** Resolved

## What Happened

Connected Query Service to production Iceberg/Trino (cfm_vn schema, 9 tables). Built cohort for user_template_id=1 (user demographics) spanning 2025-12-15→2026-02-22. Mapped and materialized 1,000,000 rows into Postgres `master_user_profile_dx` table in 332 seconds. PII (vopenid, roleid) hashed via SHA-256. Schema-explorer endpoints (/q/trino/schemas, /tables, /describe, /sample) all working. Discovered and fixed 6 bugs at the integration boundary.

## Technical Details

**Trino connectivity:**
- Host: Trino on VNG internal network (cfm_vn game schema = CrossFire Mobile staging)
- Port: 8080 (HTTPS, not 443; not HTTP — discovered via probe)
- Schema source: `iceberg.cfm_vn.*` with 9 tables, largest = `std_master_user_profile` (34 columns)
- PII columns auto-detected and SHA-256 hashed at SQL and mock layer

**Build pipeline end-to-end:**
1. Template: user_template_id=1 (user demographics, source=std_master_user_profile)
2. Cohort filter: etl_game_detail.playeropenid IN (...1M users...) AND cohort.date BETWEEN 2025-12-15 AND 2026-02-22
3. Query execution: TrinoDriver + sql-builder generates parameterized Iceberg query
4. Mapping: `mapping.builder.ts` applies cohort.keyColumn IS NOT NULL guard, WindowSourceSpec.userKey override (etl_game_detail.playeropenid vs cohort.vopenid)
5. Materialization: MappingExecutor pipes Trino JSONL → Postgres via Drizzle batch insert
6. Result: 1M rows, 332s wall-clock, hash+truncate columns to 32 chars (vopenid→0x7fa9c..., roleid→0xde41b...)

**Bugs fixed (live during integration):**

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| HTTP→HTTPS 401 Unauthorized | Trino internal on VNG network requires HTTPS; user default was HTTP | Updated vnggames Trino host config to `:8080` with `rejectUnauthorized: false` for dev |
| No rows returned from Trino | formatParams missing DATE/TIMESTAMP type prefix for ISO strings. Trino VARCHAR → TIMESTAMP coercion fails silently | Added type hints: `?type=date` for date columns, `?type=timestamp` for timestamps in criteria translator |
| Query returns 0 rows, no error | runTrino was `.then(() => [])` even on non-2xx responses. Error response chunks never surfaced | Changed to throw on non-2xx, expose error.response.text() in catch block |
| Mapping silently drops cohort filter | mapping.builder missing implicit `cohort.keyColumn IS NOT NULL` guard | Added guard in MappingExecutor.execute() before pivoting |
| Window override ignored | WindowSourceSpec.userKey (e.g., `etl_game_detail.playeropenid`) not being substituted into SQL template | Added override lookup in sql-builder series logic; if userKey present, use it instead of cohort.keyColumn |
| Schema explorer empty | SHOW SCHEMAS FROM "iceberg" returns empty. information_schema.schemata works | Switched /q/trino/schemas endpoint to query information_schema.schemata WHERE table_catalog='iceberg' |

**Drizzle/Postgres side:**
- schema.json captured for cfm_vn: 9 tables, 187 columns total, PII list auto-detected from naming (vopenid, roleid, username, email, phone, ip_address)
- Migration: `schema_initial_cfm_vn.sql` auto-generated from Drizzle, includes master_user_profile_dx with 28 columns
- Seed: `seed_cfm_vn.sql` hardcoded 1M row count; actual materializer hit 1,000,000 before stopping
- Build orchestrator tracks version + start/end timestamps; audit table logs all mutations

**Key file changes:**
- `apps/query-svc/src/driver/trino.driver.ts` — formatParams + error handling
- `apps/query-svc/src/driver/sql-builder/mapping.builder.ts:120` — implicit NULL guard + userKey override
- `apps/query-svc/src/executor/mapping.executor.ts` — hash columns, batch insert to Postgres
- `apps/catalog-api/src/schema.ts` — 16-table schema + audit triggers
- `plans/260425-0929-microservices-bedrock-split/refresh-mocks/cfm_vn.schema.json` — captured real schema

## The Brutal Truth

This integration exposed how fragile the pipeline was. Each bug killed the entire build: Trino couldn't be reached, query returned nothing, schema discovery failed, materialization skipped filters. We were flying blind until we had real data flowing. The fact that 6 separate issues cropped up at once means the mock pipeline was hiding complexity — integrating real systems always reveals the gaps.

The 332-second materialization felt *slow* at first. Then we realized: 1M rows, 28 columns, SHA-256 hashing every row, Postgres batch inserts with conflict handling, audit logging — 332s is actually fine. But it meant the build orchestrator needs async status polling on the frontend (deferred).

## Decisions Made

1. **Type hints in SQL parameters:** Rather than "smart" coercion, explicit `?type=date` forces Trino to interpret correctly. Costs verbosity, gains predictability.
2. **Implicit NULL guard:** Every mapping filter assumes `keyColumn IS NOT NULL`. Filters out invalid rows without explicit user intervention.
3. **WindowSourceSpec override at SQL level:** Don't mutate the template; let the executor decide which column is the "user key" based on game schema. Keeps templates portable.
4. **PII hashing at two layers:** Trino-side `to_hex(sha256(...))` for query optimization (filter at source), mock-side in MappingExecutor for consistency. Redundant but safe.
5. **No retry logic yet:** Build errors are fatal + logged. Simple now; queue infra comes later if builds fail frequently.

## Lessons Learned

- **Schema discovery must be eager:** Load metadata at startup (not lazy on first query). Saves debugging time later.
- **Real data is humbling:** Mock pipeline had 0 volume constraints, 0 schema mismatches, 0 network issues. Real Trino had all three.
- **Error messages matter:** When Trino returns 401, the error body is cryptic. We had to probe the service to discover HTTPS was required. Better error logging would have saved 30 minutes.

## Risks

- **PTG/TFB schemas not yet discovered:** Only cfm_vn is verified. Trino schemas for other games may have different table names, column names, or PII lists.
- **1M rows not visible in UI yet:** MasterTables page still renders mock data. Real rows are in Postgres but not wired to frontend.
- **Build orchestrator is synchronous:** No progress tracking. User sees spinning wheel for 332s with no feedback.

## Commit

Not yet (branch: feat/monorepo-bootstrap).

## Next Steps

1. **Verify TrinoDriver against PTG and TFB schemas** — refresh remaining games
2. **Add build status endpoint** — expose in-flight progress (running, queued, 50% complete, error, done)
3. **MasterTables page integration** — wire to /master-tables endpoint, show materialised row counts
4. **Raw-log preview** — add Trino sample query UI for exploring source data before mapping
