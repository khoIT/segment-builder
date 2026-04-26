# Next Steps for Best MVP Demo

**Date**: 2026-04-26 10:15
**Severity**: High
**Component**: All tiers (Sources → Metrics → Intelligence → Activation)
**Status**: Planning

## The Reality

Bedrock's architecture is solid: we've got 281-column raw Trino schemas mirrored in Postgres, metric pipelines with real `spec` JSON, and a redesigned Metric Builder with inline source cards + requirements checklist. The demo can tell a complete story—raw event → metric → feature → segment—*if* we thread it together. Right now it's four isolated rooms. Here's the order to make it one house.

## Prioritized Path (ranked by demo impact)

**1. Backfill 5–8 seed metrics with `spec` JSON** *(unblocks: Templates panel, concrete metric refs)*
   - Currently `demo-pipelines.ts` has 10 stubs but many lack proper `spec` objects
   - `MetricBuilder.jsx` Templates panel expects `spec.sources[].table`, `spec.window`, `spec.aggregation`
   - **Tradeoff:** 1 hour work vs. lets audience *see* metrics being composed from real catalog tables
   - **Owner:** planner + implementer (Metric specs are already designed; just populate the schema)

**2. Wire segment-builder to consume real metric output** *(unblocks: Activation tier credibility)*
   - SegmentBuilder today mocks Feature filters (`feature: 'purchase_amount_30d'`) but doesn't link to actual metric IDs
   - Need: segment filter nodes reference `BR_METRICS[]` by ID, not magic strings
   - **Tradeoff:** Refactor node data model (1–2 hours) vs. closes the *whole pipeline loop* for the demo
   - **Owner:** web implementation

**3. Add cross-tier lineage breadcrumbs** *(unblocks: Story coherence)*
   - Metric catalog detail: "This metric powers segments X, Y, Z" (clickthrough)
   - Segment builder detail: "This segment uses metrics A, B, C" + "Used in campaigns" (breadcrumb navigation)
   - **Tradeoff:** UI + simple data-structure work (2 hours) vs. makes the *why* of the platform click instantly
   - **Owner:** web implementation

**4. Verify scheduler wiring + add a "run-now" button** *(unblocks: Real-time feedback loop)*
   - SchedulerModule exists (`apps/catalog-api/src/scheduler/`); verify it actually computes metrics on seed data
   - Add `/metrics/:id/run-now` endpoint (upsert a one-off schedule entry)
   - Add UI button in MetricsCatalog detail view
   - **Tradeoff:** Verify existing + 1-line endpoint (0.5 hours) vs. shows audience data flowing in real-time during demo
   - **Owner:** catalog-api implementer

**5. Intelligence tier: one end-to-end feature + propensity model** *(unblocks: middle of pipeline)*
   - FeatureBuilder → compute feature from metric (e.g., "high-spend 30d" ≥ $50)
   - PropensityModels → train + score on feature (e.g., churn_risk ∝ low session + high spend)
   - Can be polished mocks (hardcoded scores) but must wire real metric data in
   - **Tradeoff:** Heavier lift (4–6 hours) but essential for "metrics → intelligence → segments" narrative
   - **Owner:** dedicated implementer; depends on #1

**6. Optional: guided demo mode (`?demo=1` URL flag)** *(nice-to-have; KISS)*
   - Pre-selects story path: CFM game → "whale_spend_30d" metric → "high-value-at-risk" segment → example campaign
   - Surfaces the exact flow an audience should understand
   - **Tradeoff:** 2–3 hours UI work vs. polish + predictability (if skip, use script + manual clicks)
   - **Owner:** web implementation (low priority)

## What Unblocks What

```
1. Seed metrics [1h]
   ↓
2. Segment → Metric refs [2h]  +  4. Scheduler/run-now [0.5h]
   ↓
3. Lineage breadcrumbs [2h]
   ↓
5. Feature + Propensity [6h] (can start in parallel with 2–4)
   ↓
Demo-ready ✓
```

## Why This Order

- **1** is tiny but makes Templates panel non-empty (low-hanging polish)
- **2 + 3** complete the activation tier + tell the story with clicks
- **4** adds *dynamics*—audience sees real data moving through the pipeline
- **5** fills the intelligence gap—without it, segments appear disconnected from metrics
- **6** is insurance (nice if time; skip if demo is already tight)

## Unresolved

- Should feature compute be Postgres stored procedures or query-svc SQL? (Assume Postgres for now; defer design)
- Do we need real ML for propensity or mock scores with realistic variance? (Mock + realistic variance is safer for demo)
