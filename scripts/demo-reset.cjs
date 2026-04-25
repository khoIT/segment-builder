#!/usr/bin/env node
// Demo reset for the M1 core-workflow runbook.
//
// Cross-platform (Windows/macOS/Linux). Wipes + reseeds the dev DB,
// starts the synthetic raw-event drip in background, and opens the
// browser at Data Catalog focused on raw_cfm_etl_recharge. The drip
// PID is saved to .demo-drip.pid so you can stop it manually:
//
//   node -e "process.kill(require('fs').readFileSync('.demo-drip.pid','utf8').trim())"
//
// Usage:
//   pnpm demo:reset
//   (which runs: node scripts/demo-reset.cjs --confirm)
//
// --confirm is required because this drops the dev DB.
const { spawnSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PID_FILE = path.join(ROOT, '.demo-drip.pid');
const LOG_FILE = path.join(ROOT, '.demo-drip.log');
const URL = 'http://localhost:5173/#table=raw_cfm_etl_recharge';
const isWin = process.platform === 'win32';

function step(msg) { console.log(`[demo-reset] ${msg}`); }
function fail(msg) { console.error(`[demo-reset] ERROR: ${msg}`); process.exit(1); }

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: isWin, cwd: ROOT, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function killStaleDrip() {
  if (!fs.existsSync(PID_FILE)) return;
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
  if (Number.isFinite(pid)) {
    step(`stopping prior drip (pid ${pid})`);
    try { process.kill(pid); } catch { /* already gone */ }
  }
  try { fs.unlinkSync(PID_FILE); } catch { /* ignore */ }
  try { fs.unlinkSync(LOG_FILE); } catch { /* ignore */ }
}

function startDripDetached() {
  // pnpm sim:drip → tsx src/seed/sim-drip.ts. Spawn detached so it
  // outlives this script. stdio piped to log file.
  const out = fs.openSync(LOG_FILE, 'a');
  const err = fs.openSync(LOG_FILE, 'a');
  const child = spawn('pnpm', ['sim:drip'], {
    cwd: ROOT,
    env: { ...process.env, BEDROCK_SIMULATOR_DRIP: '1' },
    detached: true,
    stdio: ['ignore', out, err],
    shell: isWin,
  });
  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));
  return child.pid;
}

function openBrowser(url) {
  // Best-effort; failure is non-fatal so reset is robust in headless envs.
  const cmds = isWin
    ? [['cmd', ['/c', 'start', '""', url]]]
    : process.platform === 'darwin'
      ? [['open', [url]]]
      : [['xdg-open', [url]]];
  for (const [cmd, args] of cmds) {
    const r = spawnSync(cmd, args, { stdio: 'ignore', shell: isWin });
    if (r.status === 0 || r.status === null) return;
  }
}

function main() {
  if (process.argv[2] !== '--confirm') {
    fail('pass --confirm (this drops the dev DB)\nUsage: pnpm demo:reset');
  }

  killStaleDrip();

  step('drop + migrate + seed (this takes ~20s)');
  sh('pnpm', ['reset-db']);

  // One-shot burst gives the demo metric something to materialize on the
  // first 'Run now' click (the JSONL fixtures are dated Dec 2025 — outside
  // the rolling 30-day window — so without this burst the materializer
  // returns 0 rows for the first ~minute).
  step('seeding initial recharge burst (~5K rows with current timestamps)');
  sh('pnpm', ['sim:drip', '--rate', '5000', '--cap', '5000'], {
    env: { ...process.env, BEDROCK_SIMULATOR_DRIP: '1' },
  });

  step('starting simulator drip (~500 rows/min, cap 100K)');
  const pid = startDripDetached();
  step(`drip PID ${pid} (log: ${path.relative(ROOT, LOG_FILE)})`);

  step(`opening browser at ${URL}`);
  openBrowser(URL);

  console.log('');
  console.log('[demo-reset] DONE');
  console.log(`  - drip PID:  ${pid}  (log: ${path.relative(ROOT, LOG_FILE)})`);
  console.log(`  - stop drip: node -e "process.kill(require('fs').readFileSync('.demo-drip.pid','utf8').trim())"`);
  console.log(`  - or:        taskkill /F /PID ${pid}   (Windows)`);
  console.log(`  - if 'pnpm dev' is not running: open another terminal and run it now`);
  console.log('');
  console.log('Runbook: docs/demos/m1-core-workflow.md');
}

main();
