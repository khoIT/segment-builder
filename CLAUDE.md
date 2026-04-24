# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Bedrock

**Bedrock** — "the foundation LiveOps builds on." A VNGGames internal prototype for
the full LiveOps data pipeline: raw sources → mappings → master tables → metrics &
SLAs → features/models → segments → campaigns → analytics. Three flagship games
drive the mock data: **PTG** (Play Together), **CFM** (CrossFire Mobile), **TFB**
(Total Football).

**Stack:** Vite 5 + React 18 + Recharts. No TypeScript, no CSS framework — styling
is inline via `src/theme.jsx` tokens (`T.*`) and `colors_and_type.css` globals.
Icons: Lucide via CDN, rendered inline as React SVGs (never emit `<i data-lucide>`).
Deploy: Dokploy + Nixpacks via the `start` script in `package.json`.

**Information architecture (3 groups):**
- **Catalog** — `Sources`, `MappingStudio`, `MasterTables`, `MetricsCatalog`, `FreshnessSLAs`, `RawExplorer`
- **Intelligence** — `FeatureBuilder`, `PropensityModels`
- **Activation** — `SegmentBuilder`, `LiveMonitor`, `Campaigns`, `GameAnalytics`

**Top-level files you must know:**
- `src/App.jsx` — app shell (NAV, ROLES, renderPage, 3 nav variants, BrandMark)
- `src/theme.jsx` — design tokens `T.*` + primitives (Button, Card, Icon, Input, Select, Switch, Tabs, Avatar, Kpi, SectionHeader, Sparkline, Badge). **ALWAYS reuse — never re-roll.**
- `src/data.jsx` — shared mock data (GAMES, SEGMENTS, CAMPAIGNS, SAMPLE_ROWS, …)
- `src/bedrockData.jsx` — catalog-layer mock data (BR_SOURCES, BR_MAPPINGS, BR_MASTER_TABLES, BR_METRICS, BR_FRESHNESS, …)

## Role & Responsibilities

Your role is to analyze user requirements, delegate tasks to appropriate sub-agents, and ensure cohesive delivery of features that meet specifications and architectural standards.

## Workflows

- Primary workflow: `./.claude/rules/primary-workflow.md`
- Development rules: `./.claude/rules/development-rules.md`
- Orchestration protocols: `./.claude/rules/orchestration-protocol.md`
- Documentation management: `./.claude/rules/documentation-management.md`
- And other workflows: `./.claude/rules/*`

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** DO NOT modify skills in `~/.claude/skills` directory directly. **MUST** modify skills in this current working directory. Unless you are asked to do so.
**IMPORTANT:** You must follow strictly the development rules in `./.claude/rules/development-rules.md` file.
**IMPORTANT:** Before you plan or proceed any implementation, always read the `./README.md` file first to get context.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.

## Git

**DO NOT** use `chore` and `docs` in commit messages of file changes in `.claude` directory.

## Hook Response Protocol

### Privacy Block Hook (`@@PRIVACY_PROMPT@@`)

When a tool call is blocked by the privacy-block hook, the output contains a JSON marker between `@@PRIVACY_PROMPT_START@@` and `@@PRIVACY_PROMPT_END@@`. **You MUST use the `AskUserQuestion` tool** to get proper user approval.

**Required Flow:**

1. Parse the JSON from the hook output
2. Use `AskUserQuestion` with the question data from the JSON
3. Based on user's selection:
   - **"Yes, approve access"** → Use `bash cat "filepath"` to read the file (bash is auto-approved)
   - **"No, skip this file"** → Continue without accessing the file

**Example AskUserQuestion call:**
```json
{
  "questions": [{
    "question": "I need to read \".env\" which may contain sensitive data. Do you approve?",
    "header": "File Access",
    "options": [
      { "label": "Yes, approve access", "description": "Allow reading .env this time" },
      { "label": "No, skip this file", "description": "Continue without accessing this file" }
    ],
    "multiSelect": false
  }]
}
```

**IMPORTANT:** Always ask the user via `AskUserQuestion` first. Never try to work around the privacy block without explicit user approval.

## Python Scripts (Skills)

When running Python scripts from `.claude/skills/`, use the venv Python interpreter:
- **Linux/macOS:** `.claude/skills/.venv/bin/python3 scripts/xxx.py`
- **Windows:** `.claude\skills\.venv\Scripts\python.exe scripts\xxx.py`

This ensures packages installed by `install.sh` (google-genai, pypdf, etc.) are available.

**IMPORTANT:** When scripts of skills failed, don't stop, try to fix them directly.

## [IMPORTANT] Post-implementation reflex (MANDATORY)

After shipping any feature, fix, or refactor — even small ones — **always** close the response with:

1. **What still needs real data later** (if applicable) — any places where mocks, inference, or placeholder values were used and could later be replaced with real refs/fields/APIs.
2. **Unresolved** — open design/UX questions you had to pick a default for without asking, and optional extensions you deliberately did not pursue.
3. **Next-iteration suggestions** — 2–4 concrete proposals ranked by product impact. For each, state the main tradeoff in one line (cost vs. value, or what it enables vs. what it complicates).

Treat these as part of the deliverable, not as conversation. The goal is to hand the user a running backlog they can pull from without asking "what's next?". Keep each item tight — one sentence or a short bullet. Do not pad.

When nothing is genuinely unresolved or worth proposing, say so explicitly rather than inventing filler.

## [IMPORTANT] Consider Modularization
- If a code file exceeds 200 lines of code, consider modularizing it
- Check existing modules before creating new
- Analyze logical separation boundaries (functions, classes, concerns)
- Use kebab-case naming with long descriptive names, it's fine if the file name is long because this ensures file names are self-documenting for LLM tools (Grep, Glob, Search)
- Write descriptive code comments
- After modularization, continue with main task
- When not to modularize: Markdown files, plain text files, bash scripts, configuration files, environment variables files, etc.

## Design System (MANDATORY — read before any UI work)

Bedrock's visual language comes from Claude-generated design artifacts. Every new
feature, page, or component **must** be built on the existing tokens and primitives.

### Canonical sources (in priority order)

| File | Role |
|------|------|
| `docs/design-system.md` | **Full written spec** — read first. Tokens, typography scale, spacing rules, component anatomy, page layout patterns. |
| `src/theme.jsx` | **Runtime source of truth** — tokens (`T.*`) + primitives (`Button`, `Badge`, `Card`, `Input`, `Select`, `Switch`, `Tabs`, `Avatar`, `Kpi`, `SectionHeader`, `Icon`, `Sparkline`). Reuse. Don't re-roll. |
| `colors_and_type.css` | Global CSS tokens (Tailwind v4 neutrals + VNGGames orange accent `#f05a22`). |
| `LiveOps Engine.html` | Full prototype export from the latest Claude design session. Use as visual reference — `src/` is canonical. |
| `variations.html` (+ `design-canvas.jsx`) | Design review board of layout/interaction options Claude explored. Skim before picking a new layout. |
| `public/assets/logo/` | Brand marks: `appmark-dark.png` / `appmark-light.png` (Bedrock B-R icon), `vnggames-dark.png` / `vnggames-light.png` (parent wordmark). Used by `<BrandMark>` in `App.jsx`. |
| `public/fonts/` | Self-hosted League Gothic (display font). Inter + Geist Mono still via Google Fonts. |

### Rules (non-negotiable)

1. **Reuse primitives from `src/theme.jsx` first.** Missing something? Add it to
   `theme.jsx` — don't duplicate styles inline across pages.
2. **Token-only colors, fonts, radii.** Everything comes from `T.*` or
   `colors_and_type.css`. No new hard-coded hex values, no ad-hoc rem/px scales.
3. **Fonts:** `T.fDisp` (League Gothic, self-hosted) for big numbers/headlines;
   `T.fSans` (Inter) for body/UI; `T.fMono` (Geist Mono) for code/SQL/IDs.
4. **Icons:** `<Icon name="..." />` only — renders inline Lucide SVG. Never emit
   `<i data-lucide>`, never import a second icon library, never call
   `window.lucide.createIcons()` (it's a no-op in our Icon now by design).
5. **Layout rhythm:** page → `SectionHeader` → grid/flex → `Card` containers.
   Padding `20–24` on cards, `16` on dense rows; gaps `16`; radii `8–12`.
6. **Mock data lives in `src/data.jsx` + `src/bedrockData.jsx`** — extend these
   before inventing new top-level data modules.
7. **Three games only** (PTG, CFM, TFB). Don't invent new studios/titles in data.
8. **New pages go through `App.jsx`:** add to `NAV`, update the `ROLES` page
   sets that should see it, add a `case` in `renderPage`. Stay inside the
   Catalog · Intelligence · Activation IA — don't add a fourth group casually.
9. **Variations (sidebar / wizard / stepper):** optional layout alternates live
   in `App.jsx` (SegmentBuilderSidebar / SegmentBuilderWizard) or `variations.html`.
   Build on these patterns instead of reinventing.
10. **Never treat `Segment Builder.zip` / `release-manifest.json` as design
    sources** — they're throwaway export artifacts (gitignored).

## Documentation Management

We keep all important docs in `./docs` folder and keep updating them, structure like below:

```
./docs
├── project-overview-pdr.md
├── code-standards.md
├── codebase-summary.md
├── design-guidelines.md
├── deployment-guide.md
├── system-architecture.md
└── project-roadmap.md
```

**IMPORTANT:** *MUST READ* and *MUST COMPLY* all *INSTRUCTIONS* in project `./CLAUDE.md`, especially *WORKFLOWS* section is *CRITICALLY IMPORTANT*, this rule is *MANDATORY. NON-NEGOTIABLE. NO EXCEPTIONS. MUST REMEMBER AT ALL TIMES!!!*
