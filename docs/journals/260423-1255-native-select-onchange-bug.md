# Native Select onChange Event/Value Mismatch

**Date:** 2026-04-23 12:55
**Severity:** Medium
**Component:** Frontend, MetricsLineageDrawer
**Status:** Resolved

## What Happened

Opening the lineage drawer and switching metrics via the header dropdown silently closed the entire drawer. Handler was unintentionally passing an Event object into the metrics lookup instead of the option value.

## Technical Details

**Root Cause:**
- `theme.jsx`'s `Select` primitive forwards `onChange` directly to the native `<select>` element, receiving a DOM event, not the option value
- `MetricsLineageDrawer` passed `setLineage` directly as the handler: `<Select onChange={setLineage} />`
- This resulted in `BR_METRICS.find(m => m.id === e)` where `e` is an Event object → returns `undefined`
- Drawer's open/closed contract: `undefined=closed, null=picker, entity=focused` → `setLineage(undefined)` unmounted the drawer

**Inconsistency Across Codebase:**
- `NewMetricModal` in MetricsCatalog passes value directly: `setCategory`
- SegmentBuilder passes event handler style: `e => e.target.value`
- Second pattern is correct; Select's inconsistent onChange signature is a latent footgun

## Why This Matters

Broke a core UX pattern — users expecting persistent navigation were instead dropped back to the main view. The bug surfaced because Select's onChange contract is ambiguous: it doesn't always pass what you expect.

## Decisions Made

1. **Eliminate the buggy primitive over patching:** Removed Select from the drawer entirely rather than wrapping with `e => e.target.value`. Rationale: inconsistent onChange is a trap we shouldn't build more code on.
2. **Replace with dedicated MetricPicker:** Implemented search + grouped category rows component instead. Side benefit: better UX than dropdown.
3. **Generalize the pattern:** This decision cascaded into Entry 2 — cross-entity drawer ships with zero Select components.

## Commit

Uncommitted (branch: main)

## Next Steps

- Audit Select's 3–4 call sites in the codebase and normalize to always pass the value, not the event
- Consider adding a test that verifies `Select`'s onChange shape is consistent across platforms
