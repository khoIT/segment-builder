# Major Bedrock Port

**Date:** 2026-04-22 14:30
**Severity:** High
**Component:** Full application rebrand + information architecture restructure + 6 new pages + 4 page rewrites
**Status:** In progress (not yet committed)

## What Happened

User delivered a comprehensive new design for the application: rebrand from "LiveOps Engine" / "Player Hub" to **Bedrock** ("The foundation LiveOps builds on"), complete IA restructure, 6 new pages, and 4 rewritten pages. Ported all incoming designs into the codebase as production-ready ES modules, resolved Babel globals → Vite import/export conversion, merged new design tokens, integrated new assets, updated project documentation.

## Technical Details

### Rebrand
- **New name**: Bedrock
- **Tagline**: "The foundation LiveOps builds on"
- **Artifacts**: Wordmarks, breadcrumb styling, page titles, nav labels across all 12 pages

### Information Architecture Restructure
**Old structure (4 groups):**
- Data, Modeling, Segments, Activation

**New structure (3 groups):**
- Catalog, Intelligence, Activation

### New Pages (6)
1. `Sources` — data source inventory and configuration
2. `MappingStudio` (flagship) — primary data mapping interface
3. `MasterTables` — master data management
4. `MetricsCatalog` — metric definitions and discovery
5. `FreshnessSLAs` — data freshness SLA tracking
6. `bedrockData.jsx` — new backing module (data/constants)

### Rewritten Pages (4)
1. `LiveMonitor` — live event/data monitoring
2. `SegmentBuilder` — segment creation (streamlined)
3. `Screens` — screen management
4. `data.jsx` — refactored data module

### Assets & Typography
- **Fonts**: Self-hosted League Gothic added (`public/fonts/`, @font-face in index.html). Inter + Geist Mono remain via Google Fonts
- **Logos**: 4 PNG files placed in `public/assets/logo/`. `appmark-dark.png` used for all nav variants (dark-mode CSS filter handles inversion)
- **Favicon**: Updated to use appmark-dark.png
- **Design System**: Added `docs/design-system.md` (exported from Claude's DESIGN_SYSTEM.md)

### Code Conversion Challenge
Incoming design files used browser-Babel globals (`/* global React */`, destructured Recharts at top-level, no import/export statements). Required conversion to Vite ES modules:
- Added explicit `import React from 'react'`
- Added explicit `import { AreaChart, ... } from 'recharts'`
- Wrapped component code in `export default function PageName() { ... }`
- Validated all conversions render correctly in Vite dev environment

### File Merges & Integration
- **`src/theme.jsx`**: Merged incoming theme (only new `mlSoft` Badge variant was genuinely novel). Preserved inline-SVG Icon perf fix + GDS branding comment
- **`src/App.jsx`**: Full rewrite with new NAV/ROLES/renderPage structure, Bedrock branding, `<BrandMark>` component loading `/assets/logo/appmark-dark.png`. Kept performance optimizations from earlier session
- **`colors_and_type.css`**: Identical to current version — no changes needed
- **`design-canvas.jsx`**: Identical to current version — no changes needed
- **`variations.html`**: Identical to current version — no changes needed

### Documentation Updates
- **`CLAUDE.md`**: Rewritten to Bedrock context + beefed up Design System rules (10 non-negotiables)
- **`AGENTS.md`**: Created/mirrored with same Bedrock context and design rules
- **Design Source Consolidation**: Incoming `DESIGN_SYSTEM.md` from Claude export was NOT copied wholesale. Instead, its key rules were synthesized and consolidated into project CLAUDE.md and AGENTS.md. Single source of truth maintained

### Attribution Update
- User requested "Linh Pham" → "Khoi Tran" rename across 4 files
- 6 string hits replaced (comments, author credits, etc.)

## Why This Matters

Bedrock port is the foundation for the next generation of the LiveOps tool. IA restructure (4 → 3 groups) reflects learnings about how data flows through the system. New pages (esp. MappingStudio) are core to user workflows. Rebrand signals maturity and purpose.

## Key Decisions Made

1. **localStorage key prefix unchanged** (`lo_*`): Preserves existing user preferences across rebrand. Migration cost (invalidate + repopulate prefs) > benefit of renaming
2. **appmark-dark.png for all nav variants**: Single asset with CSS filter inversion simplifies maintenance. Avoids storing light + dark + inverted + hover variants
3. **Default landing page = `mapping`**: Reflects MappingStudio as the marquee feature, not a secondary screen
4. **DESIGN_SYSTEM.md not copied**: Incoming design reference file was analyzed but not added to repo. Its rules were synthesized into CLAUDE.md and AGENTS.md instead. Reduces doc sprawl and ensures single source of truth
5. **`connectors` page kept routable**: Old bookmarks and deep links still work. Removed from main NAV but remains in renderPage switch for backward compatibility
6. **Inline-SVG Icon pattern enforced**: Documented as non-negotiable in updated CLAUDE.md rules. Prevents future perf regressions from icon re-initialization

## Not Yet Committed

- All code changes, asset placements, and documentation updates are staged but not yet pushed to git
- Next step: `git add .` and commit with message `feat: port to Bedrock design + rebrand + IA restructure`

## Next Steps

1. **Commit this batch** with clear message referencing Bedrock + IA change + page list
2. **Deploy to Dokploy** and smoke test all 12 pages render correctly
3. **Visual QA pass**: Verify logo rendering, font rendering (League Gothic), spacing/alignment, color tokens
4. **Stale bookmark validation**: Test that old `/connectors` deep links still work (should land on Catalog group)
5. **localStorage migration check**: Verify user settings (theme, sidebar state, etc.) persist across page reload post-deploy
