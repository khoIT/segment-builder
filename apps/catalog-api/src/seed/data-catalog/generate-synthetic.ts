import { createHash } from 'node:crypto';
import type { CatalogTableSpec, CatalogColumnSpec } from './specs';

// Deterministic seeded RNG. mulberry32 keyed off a 32-bit hash of the
// table id so reseeds produce identical rows.
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

function seedFromId(id: string): number {
  const h = createHash('sha1').update(id).digest();
  return h.readUInt32BE(0);
}

const COUNTRIES = ['VN', 'TH', 'PH', 'ID', 'MY', 'SG', 'TW', 'KR', 'JP', 'US'];
const PLATFORMS = ['ios', 'android', 'web'];
const SOURCES   = ['organic', 'facebook', 'google', 'tiktok', 'unity', 'applovin', 'mintegral'];
const NETWORKS  = ['google_ads', 'facebook', 'tiktok', 'applovin', 'unity', 'ironsource', 'mintegral'];
const DEVICES   = ['iPhone15', 'iPhone14', 'PixelPro', 'GalaxyS23', 'iPad', 'OnePlus11'];
const STORES    = ['app_store', 'play_store'];
const PAYMENTS  = ['credit_card', 'paypal', 'apple_pay', 'google_pay', 'bank_transfer'];
const STATUSES  = ['paid_back', 'on_track', 'at_risk', 'lost'];
const TIERS     = ['whale', 'dolphin', 'minnow', 'free'];
const CHANNELS  = ['paid_social', 'paid_search', 'video', 'display', 'influencer', 'organic'];
const PRODUCTS  = ['gem_pack_s', 'gem_pack_m', 'gem_pack_l', 'battle_pass', 'starter_kit', 'cosmetic_a'];

const pick = <T>(rng: () => number, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

function hashUserId(rng: () => number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(rng() * 0xFFFFFFFF), 0);
  buf.writeUInt32BE(Math.floor(rng() * 0xFFFFFFFF), 4);
  return 'u_' + buf.toString('hex').slice(0, 16);
}

function dayBetween(rng: () => number, startMs: number, endMs: number): Date {
  return new Date(startMs + rng() * (endMs - startMs));
}

const COHORT_START = Date.UTC(2024, 0, 1);
const COHORT_END   = Date.UTC(2026, 3, 25);

// Per-column value generator. Picks from realistic enum lists where the
// column name signals the dimension; falls back to type-shape for others.
function genValue(col: CatalogColumnSpec, rng: () => number): unknown {
  const n = col.name;

  // Enum-by-name shortcuts.
  if (n === 'country')                                                            return pick(rng, COUNTRIES);
  if (n === 'platform')                                                           return pick(rng, PLATFORMS);
  if (n === 'source')                                                             return pick(rng, SOURCES);
  if (n === 'network')                                                            return pick(rng, NETWORKS);
  if (n === 'device')                                                             return pick(rng, DEVICES);
  if (n === 'store')                                                              return pick(rng, STORES);
  if (n === 'payment_method')                                                     return pick(rng, PAYMENTS);
  if (n === 'status')                                                             return pick(rng, STATUSES);
  if (n === 'tier' || n === 'ltv_tier')                                           return pick(rng, TIERS);
  if (n === 'channel' || n === 'sub_channel')                                     return pick(rng, CHANNELS);
  if (n === 'product_id' || n === 'sku')                                          return pick(rng, PRODUCTS);
  if (n === 'currency')                                                           return pick(rng, ['USD', 'VND', 'THB', 'PHP', 'IDR', 'KRW']);
  if (n === 'game')                                                               return pick(rng, ['CFM', 'PTG', 'TFB']);
  if (n === 'campaign' || n === 'sub_campaign' || n === 'campaign_id')            return `cmp_${Math.floor(rng() * 9999).toString().padStart(4, '0')}`;
  if (n === 'placement' || n === 'ad_unit_id' || n === 'ad_creative')             return `slot_${Math.floor(rng() * 100)}`;
  if (n === 'os_version')                                                         return `${15 + Math.floor(rng() * 4)}.${Math.floor(rng() * 9)}`;
  if (n === 'app_version' || n === 'build')                                       return `${1 + Math.floor(rng() * 5)}.${Math.floor(rng() * 30)}.${Math.floor(rng() * 9)}`;
  if (n === 'app_locale')                                                         return pick(rng, ['en-US', 'vi-VN', 'th-TH', 'ko-KR', 'ja-JP']);
  if (n === 'region')                                                             return pick(rng, ['SEA', 'EAS', 'NA', 'EU']);
  if (n === 'dropoff_reason')                                                     return pick(rng, ['low_engagement', 'difficulty', 'competition', 'price', 'social', null]);
  if (n === 'install_cohort')                                                     return `2025-${(1 + Math.floor(rng() * 12)).toString().padStart(2, '0')}`;
  if (n === 'trend_direction')                                                    return pick(rng, ['up', 'flat', 'down']);
  if (n === 'model_version')                                                      return `v${Math.floor(rng() * 10)}.${Math.floor(rng() * 20)}`;
  if (n === 'install_id' || n === 'session_id' || n === 'event_id' || n === 'transaction_id') return `${n.split('_')[0]}_${Math.floor(rng() * 1e10).toString(36)}`;

  // PII column → hashed user_id.
  if (col.isPii) return hashUserId(rng);

  switch (col.type) {
    case 'string':    return `${n}_${Math.floor(rng() * 1000)}`;
    case 'int':       return Math.floor(rng() * 100);
    case 'bigint':    return Math.floor(rng() * 1_000_000);
    case 'double':    return Math.round(rng() * 10_000) / 100;
    case 'boolean':   return rng() < 0.5;
    case 'date':      return dayBetween(rng, COHORT_START, COHORT_END).toISOString().slice(0, 10);
    case 'timestamp': return dayBetween(rng, COHORT_START, COHORT_END).toISOString();
    case 'json':      return { synthetic: true };
  }
}

export type GeneratedRow = Record<string, unknown>;

export function generateRows(spec: CatalogTableSpec): GeneratedRow[] {
  const rng = mulberry32(seedFromId(spec.id));
  const rows: GeneratedRow[] = [];
  for (let i = 0; i < spec.rowCount; i++) {
    const row: GeneratedRow = {};
    for (const col of spec.columns) row[col.name] = genValue(col, rng);
    rows.push(row);
  }
  return rows;
}
