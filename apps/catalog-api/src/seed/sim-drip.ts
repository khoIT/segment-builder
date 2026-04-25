import 'dotenv/config';
import { Pool } from 'pg';
import { randomBytes } from 'node:crypto';

// ─────────────────────────────────────────────────────────────────────
// sim-drip — daemon that drips synthetic raw_cfm_etl_recharge rows
// at a configurable rate. Demos the M1 metric pipeline visibly growing
// as raw events arrive.
//
// Usage:
//   BEDROCK_SIMULATOR_DRIP=1 pnpm sim:drip [--rate 500] [--cap 100000] [--table raw_cfm_etl_recharge]
//
// Stops on Ctrl+C. Caps at --cap added rows so it never grows unbounded.
// ─────────────────────────────────────────────────────────────────────

const ENV_GATE = 'BEDROCK_SIMULATOR_DRIP';
const TICK_MS = 60_000;
const PG_PARAM_CAP = 65535;
const PG_PARAM_HEADROOM = 0.9;
const ANALYZE_EVERY = 10_000;

type Args = { rate: number; cap: number; table: string };

function parseArgs(): Args {
  const out: Args = { rate: 500, cap: 100_000, table: 'raw_cfm_etl_recharge' };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--rate') out.rate = parseInt(process.argv[++i], 10);
    else if (a === '--cap') out.cap = parseInt(process.argv[++i], 10);
    else if (a === '--table') out.table = process.argv[++i];
  }
  if (!/^[a-z0-9_]+$/.test(out.table)) throw new Error(`unsafe table name: ${out.table}`);
  if (!Number.isFinite(out.rate) || out.rate < 1 || out.rate > 100_000) throw new Error(`bad --rate: ${out.rate}`);
  if (!Number.isFinite(out.cap) || out.cap < 1) throw new Error(`bad --cap: ${out.cap}`);
  return out;
}

// ─── Generators ──────────────────────────────────────────────────────
const PLATIDS = ['IOS', 'Android'];
const LOGIN_CHANNELS = ['zi', 'fb', 'gg', null];
const PAY_CHANNELS = ['os_vng', 'iap', 'gp_vng'];
const PAYMENT_CHANNELS = ['iap', 'vng-android-shop', 'webpay'];
const PRODUCTS = [
  'com.vnggames.cfl.newbie1', 'com.vnggames.cfl.newbie2', 'com.vnggames.cfl.newbie3',
  'com.vnggames.cfl.xu.68w', 'com.vnggames.cfl.xu.328w', 'com.vnggames.cfl.battlepass',
];
const CURRENCIES = ['VND'];
const VND_TO_USD = 24_000;
const FOFFER = '1460000982';
const SPOA = '-APPDJ201777';
const VGAME_APP_ID = '1318773281120534528';

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function hex(bytes: number): string { return randomBytes(bytes).toString('hex'); }

function dteventtimeIso(d: Date): string {
  // Matches fixture format: '2025-12-30 09:58:56.000 UTC'
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.000 UTC`;
}

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function ymdCompact(d: Date): string { return ymd(d).replace(/-/g, ''); }

// One row shaped like the cfm_vn.etl_recharge fixture. Most varchars get
// short hex tokens; numeric fields get plausible distributions.
function generateRechargeRow(now: Date): Record<string, unknown> {
  const vnd = pick([29_000, 99_000, 199_000, 499_000, 999_000, 4_900_000, 12_900_000]);
  const usd = +(vnd / VND_TO_USD).toFixed(2);
  return {
    dtstatdate: ymdCompact(now),
    dteventtime: dteventtimeIso(now),
    fofferid: FOFFER,
    spoa_id: SPOA,
    vgameappid: Math.random() < 0.9 ? VGAME_APP_ID : null,
    platid: pick(PLATIDS),
    vopenid: hex(8),
    iamount: vnd,
    imoney: Math.floor(vnd / VND_TO_USD * (0.9 + Math.random() * 0.2)),
    login_channel: pick(LOGIN_CHANNELS),
    pay_channel: pick(PAY_CHANNELS),
    fuin: String(Math.floor(Math.random() * 1_000_000_000)),
    zoneid: '101',
    user_type: 'st_dummy',
    sub_channel_id: '1',
    fextreserve1: 'sim-drip',
    currency: pick(CURRENCIES),
    imoney_source: vnd,
    imoney_us: usd,
    user_ip: hex(8),
    productid: pick(PRODUCTS),
    fsequence_no: `SIM-${ymdCompact(now)}-${hex(6)}`,
    zoneid2: '101',
    requrl: 'sim-drip',
    event_time_with_timezone: dteventtimeIso(now),
    payment_channel: pick(PAYMENT_CHANNELS),
    vng_transaction: String(Date.now()) + hex(2),
    folder_date: ymd(now),
    raw_date: ymd(now),
    ds: ymd(now),
  };
}

// ─── Bulk insert ─────────────────────────────────────────────────────
async function bulkInsert(pool: Pool, table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const colCount = cols.length;
  const maxBatch = Math.max(1, Math.floor((PG_PARAM_CAP * PG_PARAM_HEADROOM) / colCount));
  const colList = cols.map((c) => `"${c}"`).join(', ');
  for (let off = 0; off < rows.length; off += maxBatch) {
    const slice = rows.slice(off, off + maxBatch);
    const values: unknown[] = [];
    const placeholders: string[] = [];
    slice.forEach((row, i) => {
      const base = i * colCount;
      placeholders.push(`(${cols.map((_, j) => `$${base + j + 1}`).join(', ')})`);
      cols.forEach((c) => values.push(row[c]));
    });
    const sql = `INSERT INTO "${table}" (${colList}) VALUES ${placeholders.join(', ')}`;
    await pool.query(sql, values);
  }
}

// ─── Main loop ───────────────────────────────────────────────────────
async function main(): Promise<void> {
  if (process.env[ENV_GATE] !== '1') {
    console.error(`set ${ENV_GATE}=1 to enable drip mode`);
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL is required'); process.exit(1); }
  const args = parseArgs();
  const pool = new Pool({ connectionString: url, max: 2 });

  let added = 0;
  let lastAnalyzeAt = 0;
  let stopping = false;

  const tick = async (): Promise<void> => {
    if (stopping || added >= args.cap) return;
    const now = new Date();
    const remaining = args.cap - added;
    const n = Math.min(args.rate, remaining);
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < n; i++) rows.push(generateRechargeRow(now));
    try {
      await bulkInsert(pool, args.table, rows);
      added += n;
      console.log(`[sim:drip] +${n} rows → ${args.table} (${added} total, cap ${args.cap})`);
      if (added - lastAnalyzeAt >= ANALYZE_EVERY) {
        await pool.query(`ANALYZE "${args.table}"`);
        lastAnalyzeAt = added;
        console.log(`[sim:drip] ANALYZE ${args.table} (${added} rows so far)`);
      }
    } catch (err) {
      console.error('[sim:drip] insert failed:', err instanceof Error ? err.message : err);
    }
    if (added >= args.cap) {
      console.log(`[sim:drip] cap reached (${added}); exiting`);
      await shutdown(0);
    }
  };

  const shutdown = async (code: number): Promise<void> => {
    stopping = true;
    try { await pool.end(); } catch { /* ignore */ }
    process.exit(code);
  };

  process.on('SIGINT', () => {
    console.log(`\n[sim:drip] SIGINT — stopping (added ${added})`);
    void shutdown(0);
  });
  process.on('SIGTERM', () => {
    console.log(`\n[sim:drip] SIGTERM — stopping (added ${added})`);
    void shutdown(0);
  });

  console.log(`[sim:drip] started: rate=${args.rate}/min, cap=${args.cap}, table=${args.table}`);
  await tick(); // first tick immediately
  setInterval(() => { void tick(); }, TICK_MS);
}

main().catch((err) => {
  console.error('[sim:drip] fatal:', err);
  process.exit(1);
});
