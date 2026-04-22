# Segment Builder — Design System

> Derived from the **VNGGames Player Hub** design system (Tailwind v4 neutrals + shadcn primitives + VNGGames orange accent). This is the single source of truth for colors, type, spacing, components, and motion for the LiveOps Engine codebase.

---

## 1. Design Language

The Segment Builder is a **dense, data-first LiveOps cockpit**. The design language is:

- **Editorial, not webby.** Display type is set in **League Gothic** (tall, condensed, uppercase) to feel like a sports-media / gaming broadcast graphic. Body copy is **Inter**. Numbers and SQL in **Geist Mono**.
- **Neutral-dominant.** 80% of the surface is neutral grayscale. Color appears only where it does work — brand orange for primary actions, purple for ML/AI, green for live/success, red for churn/destructive.
- **Flat with restraint.** 1px borders, soft shadow only on overlays and KPI cards. No glassmorphism, no heavy gradients.
- **Information-dense.** 13px body, 11–12px metadata. Favor horizontal rules, compact tables, tight KPI grids. Whitespace is earned, not decorative.
- **Live feel.** Pulsing dots, subtle shimmer, animated sparklines make the product feel real-time without being noisy.

### Prohibited tropes
- ❌ Gradient hero backgrounds
- ❌ Emoji as UI (except where a brand asset explicitly uses one)
- ❌ Left-border accent on status cards
- ❌ Rounded-full CTAs (we use `rounded-md`)
- ❌ Drop-shadowed cards stacked on plain white backgrounds (use `--neutral-50` page bg)
- ❌ Inventing new hex values — pull from the token scale

---

## 2. Color Tokens

All colors are defined in `colors_and_type.css` as CSS custom properties. The JS token object `T` in `src/theme.jsx` mirrors these for inline-style use in React.

### Neutral (the workhorse — 80%+ of surfaces)
| Token | Hex | Common use |
|---|---|---|
| `--neutral-50` | `#fafafa` | Page background |
| `--neutral-100` | `#f5f5f5` | Subdued fills, muted chip bg |
| `--neutral-200` | `#e5e5e5` | Borders, dividers |
| `--neutral-300` | `#d4d4d4` | Stronger borders, disabled outlines |
| `--neutral-400` | `#a3a3a3` | Placeholder text, disabled foreground |
| `--neutral-500` | `#737373` | Muted foreground, metadata |
| `--neutral-600` | `#525252` | Secondary text |
| `--neutral-700` | `#404040` | Body-default |
| `--neutral-800` | `#262626` | Strong text, hover surfaces |
| `--neutral-900` | `#171717` | Headings (when not display) |
| `--neutral-950` | `#0a0a0a` | Display headings, brand logo fill |

### Brand (VNGGames Orange)
| Token | Hex | Use |
|---|---|---|
| `--orange-600` / `T.brand` | `#f05a22` | **Primary CTAs**, active tab indicator, selected filter |
| `--orange-700` / `T.brandHover` | `#f54a00` | Pressed / hover primary |
| `T.brandSoft` | `#fff7ed` | Selected row fill, brand chip bg |
| `T.brandBorder` | `#fed7aa` | Selected row border, brand chip border |

**Rule:** Orange appears only on interactive primary surfaces or to mark "current selection". Never as a decorative background, never in body copy.

### Semantic
| Purpose | Token | Hex |
|---|---|---|
| Info / blue | `T.blue600` | `#3f8dff` |
| Info fill | `T.blueSoft` | `#eff6ff` |
| Success / live | `T.green600` | `#059669` |
| Success fill | `T.greenSoft` | `#ecfdf5` |
| Warning / drift | `T.amber500` | `#f59e0b` |
| Destructive / churn | `T.red600` | `#dc2626` |
| ML / propensity | `T.purple500` | `#a855f7` |
| ML fill | `T.purpleSoft` | `#faf5ff` |

**Rule:** Purple is **reserved for ML/propensity model surfaces** — model cards, AI-generated filters, propensity thresholds. Do not use it for anything else.

### Chart palette (stable order)
```js
const CHART = ['#f05a22', '#3f8dff', '#059669', '#f59e0b', '#a855f7', '#ef4444', '#0891b2', '#db2777'];
```
Always index into `CHART[i]` rather than hardcoding — keeps charts consistent across screens.

---

## 3. Typography

Three families, no more:

| Family | Role |
|---|---|
| **League Gothic** (`--font-display`) | Page titles, KPI numbers, section headers. **Always uppercase.** Tracking `0.005em`. |
| **Inter** (`--font-sans`, `--font-ui`) | Everything else — body, labels, buttons, nav. |
| **Geist Mono** (`--font-mono`) | Feature names, SQL, identifiers, numeric readouts in tables. |

### Type scale (match Figma)

| Class | Size | LH | Weight | Use |
|---|---|---|---|---|
| `h1` / `.text-h1` | 64px | 0.95 | 400 | Splash / landing title only |
| `h2` / `.text-h2` | 44px | 0.98 | 400 | Page title |
| `h3` / `.text-h3` | 32px | 1.05 | 400 | Section title inside a page |
| `h4` / `.text-h4` | 24px | 1.1 | 400 | Subsection |
| `h5` / `.text-h5` | 16px | 1.4 | 600 (Inter) | Card title |
| `h6` / `.text-h6` | 14px | 1.4 | 600 (Inter) | Dense card title |
| `p` / `.text-p` | 14px | 1.5 | 400 | Body |
| `.text-p-sm` | 12px | 1.5 | 400 | Secondary body |
| `.text-p-mini` | 11px | 1.4 | 400 | Metadata, footnotes |
| `.text-label-sm` | 12px | 1.0 | 500 | Form labels |

### Uppercase eyebrow pattern
The canonical "eyebrow" above a page title:
```jsx
<div style={{ fontSize: 11, fontWeight: 600, color: T.n500,
  letterSpacing: '0.08em', textTransform: 'uppercase' }}>
  Segment builder
</div>
<h1 style={{ fontFamily: T.fDisp, fontSize: 44, ... }}>PTG High-Value at Risk</h1>
```

---

## 4. Spacing & Layout

Use the token scale — avoid arbitrary pixel values.

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |

**Typical patterns:**
- Card padding: `20px` (default), `16px` (KPI), `14–18px` (dense list items)
- Grid gap between cards: `16px`
- Page gutter: `24px`
- Form row gap: `10–12px`
- Inline icon-to-label gap: `6–8px`

**Radii** (`--radius-*`):
- Buttons, inputs, chips: `8px` (`--radius-md`)
- Cards: `10px` (`--radius-lg`)
- Modals, overlays: `12px` (`--radius-xl`)
- Avatars, pulse dots, pills: `9999px`

**Shadows** (`--shadow-*`):
- Cards: `--shadow-sm` (default) — nothing on plain backgrounds with a border
- Overlays, dropdowns: `--shadow-lg`
- Primary CTA focus ring: `0 0 0 3px rgba(163,163,163,0.15)`

---

## 5. Component Library

All primitives live in `src/theme.jsx` and are attached to `window` so every `<script type="text/babel">` can use them. **Do not recreate these inline — import them.**

### Button
```jsx
<Button variant="primary" size="default" leftIcon="rocket">Activate</Button>
```
Variants: `primary` (brand orange), `neutral` (dark), `outline` (white + border), `ghost` (transparent), `soft` (light gray), `destructive` (red), `brand` (soft orange).
Sizes: `xs` / `sm` / `default` / `lg` / `icon` / `icon-sm`.

### Badge
```jsx
<Badge variant="live" dot>Live · 18,420</Badge>
```
Variants: `neutral`, `brand`, `brandSoft`, `secondary`, `outline`, `destructive`, `success`, `warning`, `info`, `live` (animated green dot).

### Card
Default white bg, 1px neutral-200 border, 10px radius, xs shadow. Accept `padding` prop; use `padding={0}` for cards with internal sectioned content (header bar + body).

### Input / Select / Switch / Tabs / Avatar
Already styled to the system. `size="sm"` for dense layouts (28px height), default (34px) everywhere else.

### Kpi
```jsx
<Kpi label="LIVE SEGMENT SIZE" value="18,420" delta="+312" deltaDir="up" sub="vs. last 24h" icon="users" />
```
Value renders in League Gothic 36px. Delta is color-coded automatically.

### SectionHeader
The canonical page title block — eyebrow + display title + description + right-side action buttons.

### Sparkline
Inline 80×24 SVG. Use inside KPI cards and table rows.

### Icons
Use **Lucide** via `<Icon name="database" size={14} />`. Don't inline SVG; the global `lucide.createIcons()` replaces `<i data-lucide="...">` nodes. Call `useLucide(dependency)` in any component that conditionally re-renders icons.

---

## 6. Patterns

### Page shell
Every page is a full-height flex column, inner region scrolls.
```jsx
<div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
  height: '100%', overflow: 'auto', background: T.n50 }}>
  <SectionHeader eyebrow="…" title="…" />
  {/* content cards */}
</div>
```

### Node canvas (segment builder)
Bezier-routed graph with fixed-size nodes (220×100 default). Nodes have a `kind` that controls the header chip color and the left-edge accent:
- `source` → blue
- `filter` → brand orange
- `op` → neutral
- `output` → green

### Live + data-freshness affordances
- Pulsing green dot (`animation: pulse-dot 1.6s infinite`) on anything updating in real time.
- `(live)` suffix or `Badge variant="live"` for streaming data.
- Use `Sparkline` for "last 24h" trends inline with KPI numbers.

### Role-gated navigation
The app has three personas (LiveOps manager, Data/ML engineer, Game producer) plus "All access". Each role has a `pages: Set<string>` whitelist. Nav items filter by this set. When switching roles, if the current page isn't allowed, jump to the role's `defaultPage`.

### Breadcrumbs
Simple chevron-separated path, 12px neutral-500 → neutral-900:
```
LiveOps Engine › Segment builder
```

---

## 7. Motion

Use sparingly. The system defines two keyframes in `LiveOps Engine.html`:

```css
@keyframes pulse-dot { /* live indicator */ }
@keyframes live-pulse { /* opacity shimmer on live data */ }
```

Other motion rules:
- Transitions `.12s` for color/bg/border on hover; `.18s` cubic-bezier for drag/reorder.
- No scroll-linked animations.
- Never animate content-layout-shifting properties.

---

## 8. Accessibility

- Hit targets ≥ 28px for dense chrome, 34px everywhere else.
- Minimum text size 11px (metadata only); body is 13px.
- Focus ring: 3px `rgba(163,163,163,0.15)` around inputs; primary CTAs get `box-shadow 0 0 0 3px rgba(240,90,34,0.25)` (not yet applied consistently — **TODO** for contributors).
- All color-coded status must also carry an icon or text label (don't rely on hue alone).
- Orange/white contrast passes AA at ≥14px bold; use `--neutral-900` on `--orange-50` for long-form.

---

## 9. File Structure

```
/
├── colors_and_type.css     # CSS custom properties (tokens) + utility type classes
├── LiveOps Engine.html     # Main app shell — nav, role switcher, routing, tweaks
├── variations.html         # Design canvas for segment-builder variant explorations
├── design-canvas.jsx       # Reusable canvas wrapper (DCSection / DCArtboard)
├── fonts/
│   └── LeagueGothic-Regular-VariableFont_wdth.ttf
└── src/
    ├── theme.jsx           # 🔒 Design system — tokens + primitive components
    ├── data.jsx            # Mock domain data (games, features, segments, series)
    ├── SegmentBuilder.jsx  # Hero — node-based segment canvas
    ├── LiveMonitor.jsx     # Live segment charts, overlap, drift
    └── Screens.jsx         # Supporting screens (connectors, explorer, features,
                            #   models, campaigns, game analytics)
```

**🔒 `src/theme.jsx` and `colors_and_type.css` are the design system contract. Changes to these files affect every screen and must be reviewed holistically.**
