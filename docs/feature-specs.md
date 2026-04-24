# Bedrock — Complete Platform Feature Spec

_Author: LiveOps Data Platform · 2026-04-23_
_Status: **Draft for leadership alignment**_
_Companion docs: `plans/reports/gap-analysis-presto-April-22/findings.md`, `plans/reports/gap-analysis-presto-April-22/implementation-plan.md`_

---

## 0. TL;DR

Bedrock is VNGGames' internal data platform for the full LiveOps loop: **raw events → mappings → master tables → metrics → features/models → segments → activation → closed-loop outcomes**. Today we have a prototype UI (Vite/React, three flagship games PTG/CFM/TFB). This spec defines the productized platform in two shippable scopes.

- **MVP (1 quarter)** — the minimum loop that earns LiveOps their Tuesday morning: register a raw table, define metrics, schedule their compute, build a segment from those metrics, push to one destination. No NL, no ML, no agents, no closed loop.
- **Phase 2 (2 quarters after MVP)** — the differentiators: NL-to-segment, metric lineage, scheduled agents, playbooks, knowledge base, feature store + propensity registry, governance hardening, and **closed-loop outcome monitoring** — the auto-ingested flow that feeds downstream activation results back into the source segment so LiveOps can actually answer "did it work?" inside Bedrock.

The data-service work worth flagging up front for leadership is concentrated in three places: **metric compilation + scheduling at warehouse scale** (MVP), **the identity graph** (Phase 2, underpins closed loop), and **destination-by-destination outcome ingest + attribution** (Phase 2, is the closed loop). Those three are where the budget and risk live.

---

## 1. Why Bedrock

Today LiveOps data lives in five places: raw Trino, ad-hoc dbt models, a Tableau for metrics, a handful of Looker boards, and whatever each title's producer has in a spreadsheet. Segments are built manually by data engineers from Slack requests, and outcomes live inside each activation tool's own dashboard. This has three concrete costs:

1. **Time-to-segment is measured in days**, not minutes. The "PTG whales about to churn" ask takes 2–5 days from Slack message to CSV.
2. **Metrics drift silently.** Different teams compute "DAU" differently; nobody notices until a leadership review.
3. **"Did the push work?" has no single answer.** Outcomes live in Braze, Meta, AppsFlyer, Stripe — each with its own identity namespace.

Bedrock exists to compress that loop to hours, with a single metric definition, a single segment artifact, and a single outcome view.

### Non-goals
- Bedrock is **not** a BI replacement. Tableau/Looker keep owning exploratory dashboards.
- Bedrock is **not** a data warehouse. It compiles onto BigQuery/Trino/Iceberg; it does not store raw events itself.
- Bedrock is **not** a customer-data platform for marketing. LiveOps is the primary user; marketing is a downstream consumer.

---

## 2. Personas & primary journeys

| Persona | What they need to do in Bedrock |
|---|---|
| **LiveOps manager** | Build segments, push to destinations, monitor outcomes, run playbooks |
| **Data / ML engineer** | Register tables, define metrics, build features, register propensity models |
| **Game producer** | Read metric dashboards, review segment size/composition, sign off on pushes |
| **Admin** | RBAC, destinations, agent schedules, cost ceilings, audit |

Six canonical journeys drive the spec (used as acceptance stories throughout):

- J1 — "UA channel audit": which channels bring players who retain past D7?
- J2 — "Churn scan for HVUs": who is likely to churn in the next 14 days, and what's happening to them?
- J3 — "LTV cohort comparison": did this month's organic cohort spend more than last month's?
- J4 — "Retention dip root cause": D2 dropped on PTG yesterday — why?
- J5 — "Campaign post-mortem": the payday promo ran — what was the incremental revenue?
- J6 — "Metric SLA triage": TFB match_events is 12h behind — what's downstream?

MVP must deliver J1, J3, J6. Phase 2 adds J2, J4, J5.

---

## 3. System surface — the complete platform

Bedrock's IA stays in the three existing groups and adds a fourth (Automation) in Phase 2.

### 3.1 Catalog (MVP + Phase 2 extensions)

| Screen | MVP | Phase 2 |
|---|---|---|
| **Sources** | list connectors, status, cadence, volume | 4-tab detail (Datasets/Agents/Coverage/History) |
| **Mapping Studio** | raw→standardized column mapping; manual confirm | auto-mapping suggestions from schema profiling |
| **Master Tables** | standardized tables browser, schema + row counts | column-level lineage back to raw sources |
| **Metrics Catalog** | metric CRUD, formula, SQL, owner, cadence, freshness | certified vs experimental flag, Metric Tree (lineage graph) |
| **Freshness & SLAs** | per-table freshness, SLA status | drift alerts, anomaly detection (via Agents) |
| **Raw Explorer** | read-only schema + sample rows | search over all raw fields |
| **Knowledge Base** | — | living data dictionary, pinned facts per category |

### 3.2 Intelligence (Phase 2 only)

| Screen | Phase 2 |
|---|---|
| **Feature Builder** | compose features over master tables (aggregations, windows, joins) |
| **Propensity Models** | register, version, serve; AUC / calibration / retrain triggers |

MVP ships no Intelligence group (deferred). The segment builder in MVP uses only raw and metric-based filters.

### 3.3 Automation (new IA group, Phase 2 only)

| Screen | Phase 2 |
|---|---|
| **Playbooks** | NL → multi-step DAG (data integrity → segments → queries → analysis → summary) |
| **Scheduled Reports** | cron + destination (Slack/email/board) |
| **Agents** | per-source: Anomaly · Schema · Freshness · Sync (lives under Sources detail, but managed centrally here) |

### 3.4 Activation (MVP + Phase 2 closed loop)

| Screen | MVP | Phase 2 |
|---|---|---|
| **Segment Builder** | visual node graph + sidebar variant; metric/raw filters | + NL "Describe" mode, SQL reveal, sample-user preview, approval workflow |
| **Campaigns** | stub (list only) | full orchestration across destinations |
| **Destinations** | 2 destinations (CSV/S3 drop, generic webhook) | N destinations with per-destination connector and outcome-ingest contract |
| **Live Monitor** | size-over-time per segment | + performance funnel (delivered/opened/clicked/converted/churned-7d), drift, overlap matrix |
| **Closed-loop outcomes** | — | see §5.3 — this is the defining Phase 2 capability |

### 3.5 Governance (cross-cutting)

| Capability | MVP | Phase 2 |
|---|---|---|
| RBAC | 4 personas, page-level | field-level + segment-level, destinations requiring approval |
| Audit log | push events, metric edits | full CRUD + query-level provenance |
| Versioning | segments versioned by push | metrics + features + models versioned with diff |
| Approval workflow | — | size-threshold + destination-sensitivity gate |
| Cost metering | per-compute-mode ($/day) at segment level | credits / ₫ VND propagated to agents, playbooks, NL queries |

---

## 4. MVP scope — "Raw → Metrics → Segments → 1 destination"

### 4.1 What ships

1. **Register raw tables.** Point-and-connect to existing warehouse (BigQuery primary; Trino/Iceberg readable). Auto-profile: columns, types, row count, partition key, freshness signal.
2. **Mapping Studio (manual).** Map raw columns to standardized names per master table. Confirm → materialize as a view or scheduled table.
3. **Metrics Catalog.** Define a metric by (formula DSL OR raw SQL) + time grain + owner + cadence + freshness SLA. Support the four categories seeded from Presto analysis: Engagement, Monetization, Retention, Quality.
4. **Auto-compute metrics.** Scheduler runs daily (and hourly for a whitelist) → writes to `metric_daily` / `metric_hourly` tables. Incremental where cheap; full refresh on schema change.
5. **Segment Builder (visual canvas + sidebar variants only).** Filters: raw columns, metric thresholds, game tabs (PTG/CFM/TFB), cohort windows. Three compute modes preserved: **frozen** (one-time), **scheduled** ($1.20/d), **live** ($8.40/d) with cost visible inline.
6. **Live Monitor (basic).** Per-segment: size-over-time, membership delta, frozen-vs-live drift placeholder.
7. **Push to 2 destinations.** CSV drop to S3/GCS + generic webhook. Every push writes a **push manifest** row (critical for Phase 2 closed loop — don't skip this in MVP).
8. **Freshness & SLA surface.** Passive dashboard; failed SLAs raise a visible badge.
9. **RBAC (4 personas).** Per-page allow/deny list matches the current prototype.
10. **Three games only.** PTG / CFM / TFB. ₫ VND currency.

### 4.2 Acceptance criteria

- A LiveOps manager can, end-to-end and unaided, register a raw table, define 5 metrics, schedule them, build a segment using a metric threshold + a raw filter, and push to S3 — all inside 30 minutes. **This is the headline MVP success metric.**
- 95% of daily metrics land within 2h of source arrival.
- Cold segment build latency < 30s for ≤10M rows; materialized segment lookup < 3s.
- Every push emits a `push_manifest` record (segment_id, segment_version, destination_id, push_id, pushed_at, id_namespace, row_count). Forward-compatible with §5.3.

### 4.3 What explicitly does NOT ship in MVP

List this in the order we expect leadership to push back:

- NL-to-segment ("just add AI")
- Closed-loop outcome monitoring ("the whole point is knowing if it worked")
- Metric Tree / lineage viz ("how do we know what depends on what?")
- ML propensity filters ("churn risk is table-stakes")
- Anomaly / freshness Agents ("shouldn't we be alerted?")
- Feature Builder / feature store
- Playbooks
- Knowledge Base
- Approval workflow
- Campaigns orchestration
- Segment overlap / Venn matrix
- Drift alerts on metrics
- Multi-touch attribution (there is no attribution in MVP)

Each of these is a real user need. Phase 2 gets them in priority order.

### 4.4 MVP data-service work — the hard parts (flag for leadership)

1. **Metric DSL and compiler.** We must choose: (a) dbt-native (metrics live as dbt models), (b) MetricFlow / Cube-style semantic layer, or (c) a minimal in-house compiler. Recommendation: **dbt metrics** — low risk, team-familiar, integrates with existing warehouse, and side-steps another piece of infra. Cost: loses some NL-friendliness in Phase 2 (workaround: generate dbt on the fly).
2. **Scheduler.** Dagster vs Airflow vs "just cron in k8s". Metrics-as-assets argues for **Dagster**; team familiarity argues for **Airflow**. Recommendation: Dagster for the metric layer, keep Airflow for existing ingest until it decays.
3. **Incremental compute strategy.** Daily metrics on 4.8B-row PTG logs cannot full-refresh. Partition pruning + incremental upserts by `event_date`. Write a `metric_compile` audit row per run with cost + rows read so we can catch runaway queries before the bill.
4. **Identity at push time.** Which field does each destination want? S3/CSV is flexible; webhooks are destination-specific. Even in MVP we need an **id_namespace** on every push manifest so Phase 2 can resolve outcomes. Lock this down at MVP scope — it is the single most load-bearing decision for the closed loop.
5. **Cost blast radius.** Live-mode segment = query every lookup. Need hard per-segment daily budget with a kill-switch. Estimated worst-case bill without a cap: ~$300/day per misbehaving live segment.
6. **Warehouse portability.** BigQuery dialect will leak into the metric DSL unless we're careful. Decide at MVP: single-warehouse (ship faster) or two-warehouse (slower, but avoids a Phase-2 rewrite). Recommendation: **single-warehouse (BQ) for MVP**, dialect-abstract in Phase 2.
7. **Schema drift on raw sources.** PTG ships schema changes weekly; CFM monthly. Source-side drift breaks metrics silently today. MVP must at minimum detect drift and pause affected metrics with a visible SLA-red state. (Full schema-monitoring Agent is Phase 2.)

---

## 5. Phase 2 scope — "Intelligence, Automation, Closed Loop"

Phase 2 is organized around three themes: (a) copy the five Presto UX wins, (b) fill in ML/feature depth, (c) **ship the closed loop** — the capability that flips Bedrock from write-only activation to a full learning loop.

### 5.1 The Presto 5 (UX)

Already spec'd in `plans/reports/gap-analysis-presto-April-22/implementation-plan.md`. Summary:

1. **NL-to-Segment** inside the existing Segment Builder — 4th variant "Describe".
2. **Per-connector Agents** — Anomaly · Schema · Freshness · Sync, each with schedule + cost + issue badges.
3. **Metric Tree** — visual lineage graph under Metrics Catalog.
4. **Playbooks** — new Automation group; NL → typed DAG (data-integrity → segments → queries → analysis → summary).
5. **Knowledge Base** — living data dictionary under Catalog; Global Context + My Preferences tabs.

Sequencing and component reuse follow the companion plan.

### 5.2 Intelligence — Feature store + Propensity registry

- **Feature Builder**: declarative feature defs (aggregations + windows + joins) over master tables. Output: point-in-time correct training tables + serving tables. Build on dbt + a minimal point-in-time join engine, or adopt Feast if the ML team agrees.
- **Propensity Model Registry**: versioned entries per model (churn, LTV, reactivation). Stores AUC, calibration plot, training sample, owner, refresh schedule. Model outputs are written into a `propensity_scores` table that any segment can filter on.
- **ML outputs as first-class segment filters**: segment node type "ML threshold" — `churn_risk_score >= 0.6`. Cost: requires model output to be fresh; resolves via freshness SLA contract shared with the metric layer.
- **Drift alerts**: model-output distribution drift vs training → alert into the Agents stream.

### 5.3 Closed-loop outcome monitoring — **the defining Phase 2 capability**

This is the feature that has not been addressed anywhere to date, and it's the one that will most directly determine whether Bedrock becomes load-bearing for LiveOps.

#### 5.3.1 The problem, precisely

A segment is pushed to a downstream activation tool (Braze push, Meta Ads custom audience, in-game banner engine, Stripe coupon issuer). The downstream tool runs a campaign. Outcomes are produced: delivered, opened, clicked, converted, churned-within-7d, unsubscribed, revenue-lifted.

Today those outcomes live inside each destination's own dashboard. LiveOps has to open three tools and mentally join them. Leadership asks "did the payday promo work?" and gets three half-answers.

The closed loop reverses the flow: outcomes are pulled back into Bedrock, joined to the originating segment + push + version, and shown on the segment's **Performance** tab as a funnel alongside size-over-time. This turns a segment into a living artifact with retrospective feedback instead of a one-shot CSV.

#### 5.3.2 Reference architecture

```
  (Bedrock)                 (Destination)                (Bedrock)
  segment v3 push  ───▶   Braze campaign  ───webhook──▶  outcome_ingest
       │                                                       │
       │ push_manifest                                         │ schema_align
       │ {push_id, id_ns,                                      │ (per-destination
       │  seg_id, v3}                                          │  connector)
       ▼                                                       ▼
  push_manifest ───────── identity_graph.resolve ───────▶  outcome_events
  (cold store)            (Bedrock-owned or              (standard schema,
                            central-team-owned)           resolved_user_id)
                                                             │
                                                             │ attribution join
                                                             ▼
                                                       segment_performance
                                                       (hourly materialized)
                                                             │
                                                             ▼
                                                   Segment detail · Performance tab
                                                   Live Monitor · Campaigns
```

#### 5.3.3 Components

1. **Push manifest** (already in MVP): `{push_id, segment_id, segment_version, destination_id, pushed_at, id_namespace, row_count, compute_mode}`. Immutable.
2. **Outcome ingest channels** (per destination; each ships as a connector module):
   - Webhook receiver — for push/CRM tools (Braze, Leanplum, OneSignal, Customer.io).
   - Scheduled pull — for reporting APIs (Meta Ads, AppsFlyer, Stripe, TikTok Ads).
   - SFTP/S3 drop — for partners that only export files.
   - Reverse-ETL back-sync — for destinations that write to warehouse (handle with care; see §5.3.4 risk #8).
3. **Schema alignment layer.** Every outcome normalizes to the canonical shape:
   ```
   outcome_events(
     event_id PK,
     push_id FK,                        -- joins back to push_manifest
     subject_external_id,               -- as delivered by destination
     id_namespace,                      -- email | hashed_email | maid | braze_xid | ...
     resolved_user_id NULL,             -- filled by identity resolution
     event_type,                        -- delivered | opened | clicked | converted | churned_7d | unsub
     event_ts,
     attribution_window,                -- 24h | 7d | 30d
     value_json,                        -- raw payload for auditability
     source,                            -- destination connector id
     received_at
   )
   ```
4. **Identity resolution.** Destinations speak in their own IDs. Bedrock maintains (or consumes from the central team) a bidirectional identity graph keyed by `id_namespace + external_id → bedrock_user_id`. Resolution happens at ingest time; failures land in a DLQ with a UI for manual review. Expect **10–15% unresolved initially**, falling to <5% after 3 months of tuning.
5. **Attribution engine.** Joins `outcome_events` to `push_manifest` within the configured window. Late-arriving events rewrite aggregates incrementally. Attribution model is **last-touch** by default (product decision — see §9), with MTA available as a per-segment opt-in.
6. **Segment performance store.** Denormalized `{segment_id, segment_version, push_id, window, delivered, opened, clicked, converted, churned_7d}` updated hourly. This is the direct data source for the UI.
7. **UI**: a new **Performance** tab on Segment detail; feeds into Live Monitor and the (Phase 2) Campaigns module.

#### 5.3.4 Data-service challenges — flag all of these for leadership

1. **Identity graph is the hardest unsolved problem in this stack.** CDPs exist for exactly this reason. Options: (a) build our own on warehouse + dbt models, (b) adopt the central data team's graph if one exists, (c) buy Segment Unify / Hightouch Match. Recommendation: start with (b) if it exists, else (a) with scoped ambition (deterministic joins only, no probabilistic matching in Phase 2).
2. **Schema variance per destination.** Every destination webhooks a different payload shape. Each connector is hand-written with test fixtures. Plan for ~1 connector per engineer-month, slower for the first three.
3. **Late-arriving events + idempotency.** Outcomes can arrive days late. Ingest must be idempotent on `event_id` and version-aware: a late event still belongs to the segment _version_ that was pushed, not the current version.
4. **Attribution ambiguity.** User is in three segments and converts — who gets credit? First-touch, last-touch, MTA all have defenders. Product must decide; platform must support the chosen model and make the model visible on every performance card ("Attribution: last-touch, 7d").
5. **Cost of outcome storage.** Outcomes can exceed activation volumes by 10–50× (every impression, open, click). Cold-store strategy + aggressive pre-aggregation required. Expected Phase 2 additional warehouse cost: ~2× current.
6. **Privacy.** Outcome data is more sensitive than segment data — it reveals behavioral signals per user. RBAC must be stricter on outcomes than on segments; PII redaction by default; opt-in for per-user drill-down.
7. **Contract drift from destinations.** Destination vendors change webhook shapes without notice. Automated contract tests run nightly against a fixtures catalog; failures pause ingest for that destination and raise a P1.
8. **Reverse-ETL cycle risk.** If a destination writes back to our warehouse, and we read that warehouse as a raw source, we get a feedback loop: segments influenced by their own outcomes. Every outcome-origin table must be tagged `origin=reverse_etl` and explicitly disallowed from segment-input selection, enforced in the query compiler.
9. **Outcome-fed segment metrics.** When leadership inevitably asks "show me a segment defined by last week's outcomes", we need to allow it safely — which means outcome-origin tables are first-class but quarantined behind a governance flag.

#### 5.3.5 Phasing within Phase 2 — "minimum viable closed loop"

If Phase 2 itself needs to be phased, ship in this order:

- **P2-CL-1** (weeks 1–4): push manifest persistence + one webhook destination + one attribution window (7-day conversion) + read-only Performance tab. No identity resolution beyond what the destination returns.
- **P2-CL-2** (weeks 5–10): add identity graph + two more destinations (one push, one scheduled-pull). Add open/click events.
- **P2-CL-3** (weeks 11–16): attribution model selector + reverse-ETL destination + Performance tab v2 (drill-down, version diff, per-destination funnel).
- **P2-CL-4** (weeks 17–20): outcome-fed segments with governance guard; cost metering UI; SLA tracking for ingest.

### 5.4 Governance hardening (Phase 2)

- **Approval workflow**: any push > N users OR to a destination tagged "sensitive" requires sign-off from a role. Threshold defaults: 500K users for PTG, 300K for CFM, 150K for TFB (tunable).
- **Segment versioning + diff**: every edit creates a version; visual diff of the node graph + resulting population delta.
- **Full audit**: every push, metric edit, RBAC change, destination config change. Queryable via the admin surface.
- **Cost ceilings**: per-team and per-environment daily caps; soft warning at 80%, hard stop at 100%.
- **Deploy path**: VPC / on-prem readiness — containers + config-driven warehouse pointers; no hardcoded endpoints.

---

## 6. Data-service architecture (cross-cutting view)

### 6.1 Reference stack (recommended)

| Layer | Choice | Rationale |
|---|---|---|
| Warehouse | BigQuery (primary) | Already hosts PTG/CFM/TFB; cheapest path. Snowflake readiness via dbt adapter only. |
| Ingest | existing Kafka + S3/Parquet | Don't rebuild. |
| Transform | dbt | Metric + feature compilation; tests + docs for free. |
| Orchestrate | Dagster | Asset-native matches metric-as-asset mental model; Airflow stays for legacy ingest. |
| Reverse ETL (Phase 2) | **Buy (Hightouch or Census)** for destination push | Building is 2 engineer-quarters; buying is <$100k/yr and ships in weeks. |
| Outcome ingest (Phase 2) | **Build** — thin webhook receiver + scheduled pullers | No vendor owns this problem end-to-end for LiveOps. |
| Identity graph | consume central or build minimal deterministic | See §5.3.4 #1. |
| Serving | materialized tables + Redis for live segment lookup | Pattern-of-least-surprise. |
| UI backend | thin GraphQL over warehouse (BQ + Redis) | No separate OLTP for segment metadata; keep one source of truth. |

### 6.2 Tradeoffs leadership must pick

| Decision | Option A | Option B | Our lean |
|---|---|---|---|
| MVP warehouse | BQ-only | BQ + Trino dialect-abstract | A |
| Orchestrator | Dagster | Airflow | Dagster for metric layer, Airflow stays for ingest |
| Reverse ETL | Buy Hightouch | Build | Buy in Phase 2 |
| Identity graph | Build in Bedrock | Central team owns | Central if available |
| Attribution | Last-touch | MTA | Last-touch default, MTA opt-in |
| Outcome-fed segments | Allowed | Disallowed | Allowed but governance-gated |
| Tenant currency | ₫ VND only | ₫ + $ toggle | ₫ + $ toggle for parity with Presto |

### 6.3 Non-functional targets

| SLO | MVP | Phase 2 |
|---|---|---|
| Daily metric freshness | 95% within 2h | 99% within 2h |
| Cold segment build (≤10M rows) | <30s | <15s |
| Materialized segment lookup | <3s | <1s |
| Push-to-outcome-visible | — | <15 min after ingest |
| Identity resolution rate | — | ≥85% within 1h, ≥95% within 24h |
| Destination contract tests | — | nightly, green-required for ingest |

---

## 7. Sequencing & milestones

**MVP — Q1**

- M1: raw catalog + metric DSL + 3 canned metrics running end-to-end on PTG.
- M2: scheduler + segment builder (canvas + sidebar) + cost display.
- M3: 2 destinations + push manifest + SLA dashboard + RBAC + UAT with one LiveOps manager per game.

**Phase 2 — Q2**

- Presto 5 UX wave: Metric Tree → Agents → Knowledge Base → NL-to-Segment → Playbooks.

**Phase 2 — Q3**

- Intelligence (Feature Builder + Propensity Registry).
- **Closed loop** P2-CL-1 → P2-CL-3 (see §5.3.5).
- Governance hardening (approval + versioning + audit).

**Phase 2 — Q4**

- Closed loop P2-CL-4, VPC/on-prem readiness, tenant-1 external pilot (if applicable).

---

## 8. Risks (top 5)

1. **Identity graph under-scoped** → closed loop silently broken for 20%+ outcomes → Performance tab loses credibility → feature rejected by LiveOps. Mitigate: treat identity as a Phase-2 P0; start design in MVP.
2. **Destination vendor contract drift** → outcome ingest silently breaks for weeks. Mitigate: nightly contract tests are mandatory, not optional.
3. **Live-segment cost explosion** → unbudgeted BQ spend. Mitigate: hard caps per segment, kill-switch in query engine, cost visible in every segment header.
4. **NL generates wrong SQL** → trust erodes fast. Mitigate: "Show SQL" on every NL result; approval gate on push; canned-prompt allowlist until confidence is high.
5. **Scope creep from Phase 2 into MVP** ("we need just one NL demo") → MVP ships late, the headline 30-minute journey is broken. Mitigate: §4.3 is a contract; changes need written leadership sign-off.

---

## 9. Unresolved questions (leadership input required)

1. **Warehouse primary-of-record per game.** PTG on BigQuery confirmed. CFM and TFB — confirm before Mapping Studio design locks.
2. **ML registry: own or adopt.** Is there an enterprise MLflow / Vertex Registry that Bedrock should integrate, or do we own a LiveOps-specific one?
3. **Attribution model default.** Last-touch is the platform default we're assuming. Is that aligned with current business reporting?
4. **Buy vs build reverse ETL.** Hightouch/Census vs custom. Our lean is buy; budget confirmation needed.
5. **Identity graph ownership.** Does the central data team own or want to own an identity graph? If yes, timeline and API surface?
6. **Approval threshold.** What segment sizes require human approval — per game?
7. **VPC / on-prem.** Is this a Tier-1 leadership ask, or future-proofing for a tenant we don't have yet?
8. **Tenant currency.** ₫ VND only or ₫ + $ toggle? (Presto-parity favors the toggle.)
9. **Knowledge Base authorship.** Auto-generated only, or do we invest in a manual-authoring flow with review?
10. **Outcome-fed segments.** Allowed (governance-gated) or disallowed (to prevent reinforcement loops)?

---

## 10. Appendix — mapping this spec to the current prototype

The prototype at `src/` already renders ~80% of the MVP surface visually. The gap from prototype to MVP is almost entirely backend: metric compiler, scheduler, push connectors, push manifest persistence, RBAC enforcement (vs. display).

Phase 2 additions that have UI stubs in the prototype today: Freshness SLAs (real alerts), Mapping Studio (real confirm/persist), Sources detail (tabs not yet built), Propensity Models (registry not yet built).

Phase 2 additions that have no UI today at all: Knowledge Base, Metric Tree, Playbooks, per-connector Agents, NL-to-Segment, Closed-loop Performance tab. Each is spec'd with files and acceptance criteria in the Presto gap-analysis companion plan (for the first four) and in §5.3 of this spec (for the fifth).

---

_End of feature-specs.md_
