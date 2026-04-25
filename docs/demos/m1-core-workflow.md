# M1 Core Workflow — 5-Minute Demo

> Browse a raw event table → define a metric over it → schedule a pipeline → watch values grow as new raw events arrive.

This is the minimum-viable illustration of Bedrock's M1 capability. It uses one CFM table (`raw_cfm_etl_recharge`) and one metric (`whale_spend_30d`).

---

## Prerequisites

- `pnpm install` done
- Postgres up: `pnpm dev:db`
- Dev server running in another terminal: `pnpm dev`
- ~5 minutes to talk through the flow

## Reset to demo state

```bash
pnpm demo:reset
```

What this does (~30s end-to-end):

1. Stops any prior drip process
2. Drops + recreates + migrates the dev DB
3. Seeds catalog tables, raw CFM event fixtures (~1K rows in `raw_cfm_etl_recharge`), 6 example metrics, 3 demo connectors
4. **Initial burst:** synchronous 5000 recharge rows with current timestamps so demo Step 4 has data to materialize immediately
5. Starts the synthetic raw-event drip in background (~500 rows/min into `raw_cfm_etl_recharge`, capped at 100K added)
6. Opens the browser at Data Catalog focused on `raw_cfm_etl_recharge`

Stop the drip later: `kill $(cat .demo-drip.pid)`

---

## Step 1 — Browse the raw source (~60s)

You land on Data Catalog with `raw_cfm_etl_recharge` already focused (the row is expanded via the `#table=` deeplink).

**Point at:**
- Schema (vopenid, imoney_us, event_ts, app_id, …)
- Sample rows (real-looking CFM payment events)
- "refreshed Xs ago" metadata — drip just appended

**Say:** "Real CFM payment events. New rows are dripping in every minute as games would emit them upstream."

[screenshot placeholder — drawer expanded on raw_cfm_etl_recharge]

## Step 2 — Decide on the metric (~45s)

**Click** the **Build metric** button (bottom-right of the expanded row, only shown for raw_event tables).

You land in the Metric Builder wizard with `raw_cfm_etl_recharge` pre-filled in step 1.

**Say:** "Whales are users who spend big. Let's track 30-day spend per user."

[screenshot placeholder — metric-builder step 1, source pre-filled]

## Step 3 — Create the metric (~90s)

Walk through the 4 steps:

| Step | Pick |
|------|------|
| 1 — Source | (pre-filled) `raw_cfm_etl_recharge` — note: you could add a 2nd source like `raw_cfm_etl_login` and the wizard offers a join-key picker |
| 2 — Key | `vopenid` |
| 3 — Window | `rolling`, `30 days`, event date column `dteventtime` |
| 4 — Aggregation + schedule | `SUM(imoney_us)`, cron `*/5 * * * *` (every 5 min — demo speed) |

**Point at** the live SQL preview rail (right) — that's the compiled SQL the materializer will run.

**Click Save**.

[screenshot placeholder — wizard step 4 with cron + SQL preview]

## Step 4 — Run the pipeline (~30s)

You land in MetricsCatalog detail with the **Pipeline** panel showing `pending`.

**Click Run now**.

Within ~100ms: `✓ ~5000 rows materialized` (the seed burst). After the next drip tick (≤60s), this number grows.

**Open** MetricsCatalog list — `whale_spend_30d` shows top spend values.

**Say:** "Same compiler runs nightly in production. Today we're firing every 5 minutes for the demo."

[screenshot placeholder — pipeline panel after Run now]

## Step 5 — Watch it grow (~90s)

Wait 5 min (or fast-forward through the runs tab).

The cron fires; row count grows between consecutive runs as the drip appends new recharges.

**Open** the runs tab → list of cron firings with row counts + durations.

**Say:** "Raw events keep arriving; the metric stays fresh. Downstream segments would auto-rebuild from these values."

[screenshot placeholder — runs tab with growing row counts]

---

## Stop the drip

Cross-platform (uses Node):

```bash
node -e "process.kill(require('fs').readFileSync('.demo-drip.pid','utf8').trim())"
```

Windows-only alternative:

```cmd
taskkill /F /PID <pid-from-.demo-drip.pid>
```

Or `Ctrl+C` if you ran `pnpm sim:drip` in foreground.

## What this demo deliberately does NOT cover

- Segments / campaigns (M2 / M4)
- Realtime streaming (M3)
- Multi-game (CFM only — Ballistar exists in catalog but isn't in the narrative)
- Closed-loop attribution (Phase 2)
- A/B framework (M4)
- SSO/RBAC (Q5)

## Troubleshooting

**Browser didn't open** — visit http://localhost:5173/#table=raw_cfm_etl_recharge manually.

**Drip log empty** — `tail -f .demo-drip.log`. If `BEDROCK_SIMULATOR_DRIP=1` isn't set the script exits immediately.

**Build Metric button missing** — that table isn't `layer=raw_event`. Catalog browser → look for tables with the raw-event layer badge.

**Pipeline shows `failed`** — open the runs tab; latest run row carries the error. Common causes: cron schedule typo, missing `dteventtime` column on the picked source, identifier whitelist rejection (only `[a-z0-9_]+` allowed).
