# Cross-Entity Lineage Drawer with Navigation Stack

**Date:** 2026-04-23 12:55
**Severity:** Feature
**Component:** Frontend, Catalog/Intelligence/Activation pages
**Status:** Resolved

## What Happened

Shipped unified lineage visualization across Metrics Catalog, Feature Builder, Propensity Models, and Live Segment Monitor. Clicking any navigable node pushes onto an in-drawer navigation stack. Breadcrumbs expose the trail with jump-to-any-position. Picker view searches and filters across all 5 entity kinds simultaneously.

## Technical Details

**New Files:**
- `src/LineageDrawer.jsx` — shell + nav stack + breadcrumbs
- `src/LineageGraph.jsx` — primitives + generic graph renderer
- `src/LineagePicker.jsx` — tabbed picker across 5 entity types
- `src/LineageAdapters.jsx` — per-entity adapter registry + `resolveEntity` function
- Deleted: `src/MetricsLineageDrawer.jsx`

**Adapter Interface:**
```
{ kindInfo, list, search, groupBy, toGraph }
```
Graph shape: `{ self: Node, upstream: Tier[], downstream: Tier[] }` where each Tier is `{ label, edgeLabel, nodes }`. Five adapters: metric, feature, model, segment, campaign.

**Data Enrichment (`src/data.jsx`, `src/bedrockData.jsx`):**
- Added `FEATURES.metrics`, `FEATURES.masterTable`, `FEATURES.model`
- Added `MODELS.features`, `SEGMENTS.filters: [{kind, ref, op, value}]`
- Metrics: new `METRIC_CATEGORY_SOURCES` defaults + `METRIC_SOURCE_OVERRIDES` per-id override, merged via `.map()`. Precedence: category default → inline → explicit override.
- Replaced mocked metric fan-out with real scan of `FEATURES.metrics` + `SEGMENTS.filters` + transitively `CAMPAIGNS.segment`

**Entry Points:**
Lineage button in each page header + click-row affordances (metric cards, feature rows). All use the same drawer, seeded per page.

**State Contract:**
Parent passes `seed: undefined | null | {kind, entity}`. Drawer maintains its own `stack` for navigation. Escape + backdrop + Change button + close × all behave intuitively.

## Why This Matters

Establishes "everything in the catalog has lineage" pattern. Unlocks the cross-entity exploration pipeline — trace a campaign back to raw Kafka topic in 4 clicks. Transforms from disconnected dashboards into a unified data fabric explorer.

## Decisions Made

1. **Shared drawer + per-entity adapters:** Scope reduction from duplicating per-page implementations. Costs one refactor now, saves 3–5 near-copies as other pages adopt lineage.
2. **Category-level source/masterTable defaults:** Avoid forcing every metric to declare its own. Lowers maintenance for the 80% common case.
3. **Non-navigable leaves stay rendered but not clickable:** Sources, tables, dashboards visible but unclickable — avoids dead-end navigation.
4. **Breadcrumbs only render when stack > 1:** Single-entity view stays clean.
5. **"Change" button clears whole stack:** Matches user expectation of "start over" rather than undo-one-step.
6. **Added process rule to CLAUDE.md:** Post-implementation reflex requiring every ship report to end with (1) what needs real data later, (2) unresolved decisions, (3) 2–4 ranked next-iteration suggestions.

## Commit

Uncommitted (branch: main)

## Next Steps

1. **Real data backfill:** Wire activation destinations (CleverTap/WebEngage) as downstream of campaigns; back-link `source` node strings to `CONNECTORS` rows
2. **Auto-compute usedBy:** Replace hand-seeded `m.usedBy` with real graph traversal from `FEATURES.metrics` + `SEGMENTS.filters`
3. **Connector drilldown:** Clicking source node opens connector detail view
4. **Performance audit:** Monitor breadcrumb re-renders on deep stacks; consider memoizing stack diff
