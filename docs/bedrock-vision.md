# Bedrock Vision — what it takes to be the LiveOps platform

> **North star**: a LiveOps team member opens Bedrock, samples a raw ETL event stream, defines a metric over it in plain language, gets an auto-running pipeline that materializes that metric daily, then drops the metric into Segment Builder to target campaigns. End-to-end in one tool, no SQL, no DAG editing, no DevOps ticket.

This doc maps **what's working today** against **what a real Bedrock needs**, then proposes a 5-quarter roadmap. It's a planning artifact, not a marketing pitch — gaps are called gaps.

---

## The product loop (target)

```
                                 BEDROCK PLATFORM
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   1. Raw event ingestion       2. Metric definition                  │
│   ────────────────────         ────────────────────                  │
│   Trino / Iceberg ──┐          Visual builder over                   │
│   Kafka ────────────┤  ──►     sampled events; SQL                   │
│   Sepay webhooks ───┘          generated; previewed                  │
│                                                                      │
│            │                          │                              │
│            ▼                          ▼                              │
│                                                                      │
│   3. Pipeline scheduler        4. Metric registry                    │
│   ─────────────────────        ───────────────────                   │
│   Cron / event-driven   ──►    catalog_<metric>                      │
│   incremental + full           with lineage, SLA,                    │
│   refresh policy               freshness signals                     │
│                                                                      │
│            │                          │                              │
│            ▼                          ▼                              │
│                                                                      │
│   5. Segment Builder           6. Activation                         │
│   ──────────────────           ────────────                          │
│   Drag metrics into     ──►    Campaigns, push,                      │
│   filters; preview             A/B; cohort-locked                    │
│   audience size               outcomes tracked back                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

All 6 steps must work for a LiveOps PM to ship a re-engagement campaign without writing SQL or filing a ticket. **Today, steps 1, 4, and partially 5 work.** Steps 2, 3, 6 have placeholders.

---

## Today: what's wired

| Step | Surface | Status | Notes |
|---|---|---|---|
| 1 | Sources page · RawExplorer · Trino driver · `iceberg.cfm_vn.*` | ✓ Working | Live Trino + JSONL mock; sample reads cap at 200 rows |
| 1.5 | Local cfm_vn-shaped raw event tables (`raw_etl_*` × 5) | ✓ New | Simulator produces 700K rows in ~17s; deterministic |
| 2 | Mapping Studio | △ Partial | Visual mapping of raw → standard schema exists, but doesn't generate metrics — only `master_user_profile_dx` wide tables |
| 3 | `Save & Build` flow | △ Partial | One-shot build, no schedule; no incremental; no retry |
| 4 | Data Catalog · 16 tables · 195 cols · lineage chips | ✓ Working | 8 tables real-data-derived; lineage join from `metric_source_bindings`; column profile popover with 24h cache |
| 4 | Metrics Catalog | ✓ Working | 25 metrics seeded with `cfm` source bindings |
| 5 | Segment Builder canvas | △ Partial | Visual node editor exists, but metrics aren't pluggable as filters at runtime — labels are hand-coded |
| 5.5 | Cross-page deeplinks via URL hash | ✓ Working | Lineage chip → MetricsCatalog/Features/Segments pre-filtered |
| 6 | Campaigns · LiveMonitor · GameAnalytics | ✗ Mock-only | UI shells; no campaign engine, no delivery, no outcome tracking |

---

## Gap analysis — what makes Bedrock real

### Tier-1 gaps (block the core loop)

#### G1. **No-code metric authoring over raw events**

**Today:** Mapping Studio creates `master_user_profile_dx` wide tables — already aggregated per-user dimensions. Metrics Catalog displays already-defined metric semantics, but to add a new metric a developer hand-writes a `metric_source_binding` and seeds it.

**Needed:** A "metric builder" UI where a LiveOps PM:
1. Picks a raw event table (`etl_recharge`)
2. Sees 10 sample rows
3. Picks an aggregation (`SUM(imoney_us)`)
4. Picks a window (`last 7 days`)
5. Picks a key (`vopenid`)
6. Hits **Save & Schedule**
7. Bedrock generates SQL, registers a metric, schedules a daily refresh, and surfaces it in Metrics Catalog + Segment Builder

**Implementation sketch:**
- New page: `metric-builder/` (parallel to `data-catalog/`)
- Builds a `MetricSpec` (extension of the existing MappingSpec) containing:
  - `cohort` (raw table + key column)
  - `aggregation` (fn, args, cast)
  - `window` (rolling N days OR cohort-relative)
  - `filters` (raw column predicates)
  - `schedule` (`cron` or `on_event`)
- Server-side compiler: `MetricSpec → SQL` (we already have this for MappingSpec — generalize it)
- Storage: extend `metrics` table with `spec` jsonb + `schedule` text
- Persist into `metric_pipelines` table; scheduler picks up

#### G2. **Pipeline scheduler / orchestrator**

**Today:** `BuildOrchestrator` runs one master-table build on demand. No scheduling, no retry, no incremental refresh, no upstream-driven trigger.

**Needed:** A reliable scheduler that:
- Runs metric pipelines on cron (`@daily`) or event-driven (`on raw_etl_recharge insert`)
- Materializes results into per-metric Postgres tables (`metric_<id>_values`) and updates `freshness_records`
- Supports incremental refresh (`WHERE ds > last_watermark`) for time-partitioned sources
- Retries on failure; alerts on SLA breach

**Implementation options** (ranked by fit for a prototype):
1. **`pg-boss`** — Postgres-backed job queue with cron support. Same DB, no new infra. Recommended.
2. **Temporal** — heavier, full workflow engine. Right answer for production but overkill for prototype phase.
3. **Roll our own** — Node `setInterval` + `pg_advisory_lock` for leader election. Tempting; adds glue we'd later regret.

#### G3. **Segment Builder consumes metrics dynamically**

**Today:** Segment Builder is a canvas with hand-coded filter labels (`purchase_amount_30d`). No live metric binding.

**Needed:**
- Filter nodes load their metric from the registry
- Audience size estimation calls a real preview endpoint that runs the segment query against materialized metric values
- "Save segment" persists `segments.criteria` jsonb that references metric IDs (not literal values)
- Activation → re-evaluates the criteria nightly against current metric values

**Implementation:** Most of the contract scaffolding exists (`segments.criteria` jsonb is there). The wiring is:
1. Segment Builder filter node → metric picker (driven by Metrics Catalog API)
2. Save → POST `/segments` with `{ criteria: { all: [{ metric: 'm_spend_30d', op: '>=', value: 50 }] } }`
3. New endpoint: `POST /q/segments/preview-count` already exists in stub form — point it at materialized metric values
4. Activation: nightly job materializes `segments.size` from criteria

### Tier-2 gaps (need them to scale)

#### G4. **Realtime + batch unification**

LiveOps wants both: a campaign that triggers on "first purchase ever" (realtime) and one targeted at "spent > $50 last 30 days" (batch). Today everything is batch.

**Needed:**
- Streaming consumer for Kafka topics (CFM has 3+ Kafka topics already in `BR_SOURCES`)
- Materialized view that maintains real-time counters next to the daily batch metric
- Segment Builder lets users pick `realtime` or `batch` per filter

#### G5. **Multi-tenant access control**

Today: dev-login mints tokens for any user. Production needs:
- SSO via Microsoft 365 (per the project's existing AZURE_AD references)
- Role-scoped permissions on tables/metrics/segments
- Audit log already exists — UI surface needed

#### G6. **Campaign delivery**

Today: `Campaigns` page is a mock. A real loop needs:
- Push notification gateway integration (FCM/APNs)
- In-game message delivery (CFM/PTG/TFB SDK hooks)
- Email/SMS connector for at-risk-of-churn flows
- Outcome attribution: "campaign X reached 200K, 18K converted, +$45K incremental"

#### G7. **A/B test framework**

Campaigns need experiment groups. The `seed/fixtures` campaigns hint at this but no framework exists. Needed: stable user-bucket hashing, holdout group enforcement, lift calculation.

### Tier-3 gaps (nice to haves)

- **Lineage graph viz** — drawer exists, but no DAG view across raw → metric → segment → campaign
- **Cost observability** — surface Trino query cost per metric pipeline; flag expensive runs
- **Self-serve table onboarding** — UI to register new raw sources with column hints
- **Backfill tooling** — re-run a metric over historical date ranges

---

## Proposed roadmap

### Q1 → "Metric authoring works" (4–6 weeks)
- **G1**: Build the metric authoring UI; ship MetricSpec compiler; persist metric pipelines
- **G2 (basic)**: Add `pg-boss` scheduler; daily cron only; no retries yet
- Outcome: a PM can author "spend_usd_30d" over `etl_recharge` and see it materialize tomorrow morning

### Q2 → "Segments use real metrics" (3 weeks)
- **G3**: Wire Segment Builder filter nodes to live metric registry; rebuild preview-count endpoint
- Outcome: a saved segment's audience size updates daily as new metric values land

### Q3 → "Realtime + scale" (4 weeks)
- **G2 (full)**: incremental refresh, SLA monitoring, retry with backoff
- **G4**: Kafka consumer + realtime metric view; segment realtime/batch toggle
- Outcome: a "first purchase" trigger fires within 60 seconds

### Q4 → "Activation + experiments" (6 weeks)
- **G6**: Push/in-game delivery wired to first 1–2 channels (FCM + CFM SDK)
- **G7**: A/B framework with holdouts
- Outcome: end-to-end campaign launch from Bedrock with attribution

### Q5 → "Production hardening" (4 weeks)
- **G5**: SSO + RBAC
- **G3.5**: Backfill tooling, cost observability, lineage DAG viz
- Outcome: Bedrock leaves prototype — internal GA for LiveOps team

---

## What today's PR makes possible (immediately)

1. **Metric authoring UI** can be built today against the new `raw_etl_*` tables — column metadata is in `catalog_columns`, sample rows in `catalog_<id>` tables.
2. **Segment Builder hash filter** already lets users land on the canvas pre-narrowed by a data-catalog table — the natural next click is "use this table to build a metric."
3. **Lineage chips** already render counts derived from `metric_source_bindings` — adding pipeline-output edges (metric → segment) is a JOIN on `segments.criteria`.

---

## Risks / open questions

- **Trino schema drift**: cfm_vn columns evolve under us. Today we mirror them locally for performance; we need a periodic schema-recon job that flags drift and surfaces it on the Sources page.
- **PII boundary**: PII columns are SHA-256 hashed at materialization. Audience export to a campaign vendor needs a re-identification step the platform shouldn't own — the SDK on the game client does the lookup.
- **Cost attribution at scale**: when 100 metrics each scan 1B rows nightly, Trino bills add up fast. Cost observability (G-tier-3) might need to be Q2 not Q5.
- **Multi-tenant resource isolation**: when PTG and CFM share Bedrock, do they share Trino resource pools or not? Affects scheduler design.

---

## Closing

Bedrock today is a beautifully designed catalog-and-canvas. The path to a LiveOps platform is concrete: **add a metric authoring page, schedule the pipelines, wire segments to the registry, deliver campaigns, attribute outcomes.** Five surfaces, ~5 quarters, deterministic in scope. The architectural foundations (contracts package, multi-game tenancy, lineage modeling, hash-protocol routing, JWT-guarded REST) are already in place.
