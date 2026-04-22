# Design Reference Codified in CLAUDE.md

**Date:** 2026-04-22 14:20
**Severity:** Low
**Component:** Documentation, project standards
**Status:** Resolved

## What Happened

Added a "Design Reference" section to `CLAUDE.md` enumerating canonical design system files and establishing 6 non-negotiable rules for future feature work. Ensures all future developers consult the same design source of truth.

## Technical Details

**Canonical files enumerated:**
- `src/theme.jsx` — component primitives, Icon implementation
- `colors_and_type.css` — color palette, typography tokens
- `variations.html` — design system showcase (static)
- `design-canvas.jsx` — interactive component playground
- `LiveOps Engine.html` — legacy reference (deprecated but kept for history)

**6 Design Rules Added:**
1. Reuse existing primitives (Button, Badge, Card, etc.) — do not create bespoke components
2. Token-only color usage — no hardcoded hex values outside theme.jsx
3. Icon rendering must use inline-SVG pattern (window.lucide[Name]) — never createIcons()
4. Layout follows established spacing conventions (8px grid, gap tokens)
5. Typography respects font-family fallback chain defined in CSS
6. Component props and structure mirror existing patterns in variations.html

## Why This Matters

Codifying design constraints prevents future feature work from drifting into inconsistent visual language or re-implementing existing components. Single source of truth reduces cognitive load on future developers.

## Decisions Made

1. **Embedded in CLAUDE.md, not separate file**: Keeps project guidance co-located with implementation rules
2. **Rule 3 (Icon pattern)**: Explicitly documents the inline-SVG perf optimization as a requirement, not optional
3. **Variations.html link**: Provides reference showcase without requiring build/server — developers can open directly in browser

## Commit

`4cb3a92`

## Next Steps

- When new features are planned, reviewers should reference these 6 rules during code review
- If design system needs expansion, update canonical files first, then CLAUDE.md rules
