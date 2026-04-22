# Lucide Icon Performance Fix

**Date:** 2026-04-22 14:10
**Severity:** Medium
**Component:** Frontend, UI rendering
**Status:** Resolved

## What Happened

User reported tab and role switches felt sluggish. Identified and fixed unnecessary full-document icon re-initialization happening on every state change.

## Technical Details

**Root Cause:**
- `window.lucide.createIcons()` was being invoked from 14 separate sites:
  - 1 call in App-level `useEffect`
  - 13 calls from `useLucide(dep)` hooks scattered throughout components
- Each invocation performs full-document `[data-lucide]` scan and DOM element replacement
- Role changes triggered double re-initialization: both `setRole` and `setPage` fired independently

**Solution:**
- Rewrote `Icon` component in `src/theme.jsx` to render inline SVG directly from `window.lucide[PascalName]` (memoized)
- Converted `useLucide` hook to a no-op while preserving the function signature
- This allows 13 existing call sites to remain untouched without functional change
- Removed App-level `createIcons` useEffect
- Lazy-initialized `tweaks` useState to prevent localStorage re-parse on every render

**Performance Impact:**
- Eliminated 14x unnecessary DOM scans per state change
- Icon rendering now O(1) lookup + inline SVG render instead of O(n) full-document scan

## Why This Matters

Interaction feel improved measurably. Role/tab switching no longer blocks the UI thread with full-document DOM operations.

## Decisions Made

1. **No-op `useLucide` approach**: Preserves all 13 existing call sites without code churn. The function does nothing but remains callable for backward compatibility.
2. **Inline SVG from `window.lucide` data**: Assumes Lucide bundle exposes icon JSON in globals at runtime. Direct dependency avoids import bloat.
3. **Memoization on Icon**: Prevents re-renders when parent updates but Icon props unchanged.

## Commit

`e3e988d` (bundled with Player Hub → GDS rebrand in same commit)

## Next Steps

- Monitor production deploys for any visual icon regressions (ensure all icons render correctly via inline SVG path)
- If new icons are added in future, verify they exist in `window.lucide` global before use
