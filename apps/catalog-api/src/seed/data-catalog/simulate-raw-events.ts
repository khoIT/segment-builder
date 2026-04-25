import type { Pool } from 'pg';
import { createHash } from 'node:crypto';

// Simulates a coherent stream of raw event data across 5 cfm_vn-shaped
// tables: 30K users → 30K profiles + ~360K logins/logouts + ~100K
// recharges + ~360K game-detail rows. Deterministic via mulberry32
// keyed off a fixed seed so reseeds reproduce.
//
// Why local: Trino round-trips for 1M rows + 8 derivation queries push
// the seed past the 60s budget. Local simulation runs in ~30s and
// sidesteps schema-mismatch surprises (cfm_vn evolves under our feet).

const SEED = 0xC0FFEE;
const COHORT_START = Date.UTC(2024, 3, 1);
const COHORT_END   = Date.UTC(2026, 3, 25);
const NOW          = Date.UTC(2026, 3, 25);

const COUNTRIES = ['VN', 'TH', 'PH', 'ID', 'MY', 'SG', 'TW', 'KR', 'JP', 'US'];
const PLATFORMS = ['ios', 'android', 'web'];
const SOURCES   = ['organic', 'facebook', 'google', 'tiktok', 'unity', 'applovin', 'mintegral'];
const PRODUCTS  = ['gem_pack_s', 'gem_pack_m', 'gem_pack_l', 'battle_pass', 'starter_kit', 'cosmetic_a'];
const DEVICES   = ['iPhone15', 'iPhone14', 'PixelPro', 'GalaxyS23', 'iPad', 'OnePlus11'];
const VERSIONS  = ['4.20.1', '4.21.0', '4.22.0', '4.22.1', '4.23.0'];

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rng: () => number, arr: readonly T[]) => arr[Math.floor(rng() * arr.length)];
const dayBetween = (rng: () => number, a: number, b: number) => new Date(a + rng() * (b - a));
const dayOnlyStr = (d: Date) => d.toISOString().slice(0, 10);

function hashUserId(seed: number, i: number): string {
  const h = createHash('sha1').update(`${seed}-${i}`).digest();
  return 'u_' + h.subarray(0, 8).toString('hex');
}

const USERS_TARGET = 30_000;
const PAYER_RATE = 0.18;          // ~18% pay
const TXNS_PER_PAYER_AVG = 5;     // ~5 transactions per payer
const SESSIONS_PER_USER_AVG = 12; // 12 sessions per user lifetime
const BATCH_SIZE = 5000;

type UserSpec = {
  vopenid: string;
  install_time: Date;
  country: string;
  platid: string;
  device: string;
  version: string;
  source: string;
  is_payer: boolean;
  expected_txns: number;
  expected_sessions: number;
  // Lifecycle: last login is install + (rng-decayed lifespan).
  last_login_time: Date;
  // Retention thresholds (deterministic).
  is_retained_d1: boolean;
  is_retained_d7: boolean;
  is_retained_d30: boolean;
  churn_prob: number;
  days_since_active: number;
  total_rev: number;
};

async function bulkInsert(pool: Pool, table: string, cols: string[], rows: unknown[][]) {
  if (!rows.length) return;
  const colSql = cols.map((c) => `"${c}"`).join(', ');
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const params: unknown[] = [];
    const tuples: string[] = [];
    for (const row of batch) {
      const ph: string[] = [];
      for (const v of row) {
        params.push(v);
        ph.push(`$${params.length}`);
      }
      tuples.push(`(${ph.join(', ')})`);
    }
    await pool.query(`INSERT INTO "${table}" (${colSql}) VALUES ${tuples.join(', ')}`, params);
  }
}

export async function simulateRawEvents(pool: Pool): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[seed:raw] simulating raw event tables…');
  const t0 = Date.now();
  const rng = mulberry32(SEED);

  // Truncate first — re-runnable.
  for (const t of ['raw_etl_recharge', 'raw_etl_login', 'raw_etl_logout', 'raw_etl_game_detail', 'raw_std_master_user_profile']) {
    await pool.query(`TRUNCATE "${t}"`);
  }

  // ── 1. Generate 30K user specs ──────────────────────────────────────
  const users: UserSpec[] = [];
  for (let i = 0; i < USERS_TARGET; i++) {
    const install_time = dayBetween(rng, COHORT_START, COHORT_END - 30 * 86400_000);
    const lifespan_d = Math.floor(1 + rng() * 540); // 1..540 days
    const last_login_time = new Date(Math.min(install_time.getTime() + lifespan_d * 86400_000, NOW));
    const is_payer = rng() < PAYER_RATE;
    const days_active = Math.round((last_login_time.getTime() - install_time.getTime()) / 86400_000);
    users.push({
      vopenid: hashUserId(SEED, i),
      install_time,
      country: pick(rng, COUNTRIES),
      platid: pick(rng, PLATFORMS),
      device: pick(rng, DEVICES),
      version: pick(rng, VERSIONS),
      source: pick(rng, SOURCES),
      is_payer,
      expected_txns: is_payer ? Math.floor(1 + rng() * TXNS_PER_PAYER_AVG * 2) : 0,
      expected_sessions: Math.floor(1 + rng() * SESSIONS_PER_USER_AVG * 2),
      last_login_time,
      is_retained_d1:  days_active >= 1,
      is_retained_d7:  days_active >= 7,
      is_retained_d30: days_active >= 30,
      churn_prob: Math.max(0, Math.min(1, (NOW - last_login_time.getTime()) / (180 * 86400_000))),
      days_since_active: Math.floor((NOW - last_login_time.getTime()) / 86400_000),
      total_rev: 0,
    });
  }

  // ── 2. Generate recharge events first (they decide total_rev) ───────
  const rechargeRows: unknown[][] = [];
  for (const u of users) {
    for (let i = 0; i < u.expected_txns; i++) {
      const txn_time = dayBetween(rng, u.install_time.getTime(), u.last_login_time.getTime());
      const usd = Math.round((rng() * 95 + 0.99) * 100) / 100;
      u.total_rev += usd;
      rechargeRows.push([
        u.vopenid, txn_time.toISOString(), usd,
        pick(rng, ['USD', 'VND', 'THB', 'PHP']), u.platid, pick(rng, PRODUCTS),
        dayOnlyStr(txn_time),
      ]);
    }
  }
  await bulkInsert(pool, 'raw_etl_recharge',
    ['vopenid', 'dteventtime', 'imoney_us', 'currency', 'platid', 'productid', 'ds'],
    rechargeRows);

  // ── 3. Login + logout pairs (one logout per login) ─────────────────
  const loginRows: unknown[][] = [];
  const logoutRows: unknown[][] = [];
  const gameRows: unknown[][] = [];
  for (const u of users) {
    for (let i = 0; i < u.expected_sessions; i++) {
      const login_time = dayBetween(rng, u.install_time.getTime(), u.last_login_time.getTime());
      const dur_min = Math.floor(2 + rng() * 60);
      const logout_time = new Date(login_time.getTime() + dur_min * 60_000);
      loginRows.push([
        u.vopenid, login_time.toISOString(), u.country, u.platid,
        u.version, u.device, dayOnlyStr(login_time),
      ]);
      logoutRows.push([
        u.vopenid, logout_time.toISOString(), dur_min * 60, dayOnlyStr(logout_time),
      ]);
      // 80% of sessions produce a game-detail row.
      if (rng() < 0.8) {
        gameRows.push([
          u.vopenid, login_time.toISOString(),
          rng() < 0.5 ? 'win' : 'lose',
          Math.floor(rng() * 25),       // killflag
          Math.floor(rng() * 100),      // score
          Math.floor(60 + rng() * 1500),// gameduration
          dayOnlyStr(login_time),
        ]);
      }
    }
  }
  await bulkInsert(pool, 'raw_etl_login',
    ['vopenid', 'dteventtime', 'country', 'platid', 'clientversion', 'deviceid', 'ds'],
    loginRows);
  await bulkInsert(pool, 'raw_etl_logout',
    ['vopenid', 'dteventtime', 'onlinetime', 'ds'],
    logoutRows);
  await bulkInsert(pool, 'raw_etl_game_detail',
    ['playeropenid', 'dteventtime', 'gameresult', 'killflag', 'score', 'gameduration', 'ds'],
    gameRows);

  // ── 4. User profiles ───────────────────────────────────────────────
  const profileRows: unknown[][] = users.map((u) => [
    u.vopenid, u.install_time.toISOString(), u.last_login_time.toISOString(),
    u.expected_txns > 0 ? u.last_login_time.toISOString() : null,
    u.country, u.platid, u.source, u.total_rev,
    u.is_retained_d1, u.is_retained_d7, u.is_retained_d30,
    u.churn_prob, u.days_since_active,
  ]);
  await bulkInsert(pool, 'raw_std_master_user_profile',
    ['vopenid', 'install_time', 'last_login_time', 'last_charge_time',
     'first_country_code', 'first_os', 'media_source', 'total_rev',
     'is_retained_d1', 'is_retained_d7', 'is_retained_d30',
     'churn_prob', 'days_since_active'],
    profileRows);

  // eslint-disable-next-line no-console
  console.log(`[seed:raw]  users=${users.length.toLocaleString()} recharges=${rechargeRows.length.toLocaleString()} logins=${loginRows.length.toLocaleString()} games=${gameRows.length.toLocaleString()} · ${Date.now() - t0}ms`);
}
