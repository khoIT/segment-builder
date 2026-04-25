import { Injectable } from '@nestjs/common';
import type {
  Criteria, DateRange, Granularity, MetricBinding, MetricMeta, QueryDriver, SeriesPoint,
} from './driver.interface';

// ─────────────────────────────────────────────────────────────────────
// Deterministic mock driver. Ports the seeded RNG from
// apps/web/src/metrics-mock-series.jsx so series stay stable across
// reloads — the prototype's "deterministic feel" matters for demos.
// ─────────────────────────────────────────────────────────────────────

function _hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function _rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE_BY_UNIT: Record<string, number> = {
  USD: 70_000, count: 30_000, minutes: 4200, days: 12,
  prob: 0.42, ratio: 0.012, boolean: 0.6, enum: 1, string: 1,
};

function buildSeries(metric: MetricMeta, range: DateRange): SeriesPoint[] {
  const days = 250;
  const rand = _rng(_hash(metric.id));
  const base = BASE_BY_UNIT[metric.unit] ?? 100;
  const trend = (rand() - 0.4) * 0.4;
  const noise = 0.18;
  const out: SeriesPoint[] = [];
  const anchor = new Date(range.to ?? '2026-04-22');
  for (let i = days - 1; i >= 0; i--) {
    const t = (days - 1 - i) / (days - 1);
    const drift = 1 + trend * t;
    const wob = 1 + (rand() - 0.5) * noise;
    let v = base * drift * wob;
    if (metric.unit === 'prob' || metric.unit === 'ratio') v = Math.max(0, Math.min(1, v / base));
    if (metric.unit === 'count') v = Math.round(v);
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), value: v });
  }
  // Trim by `from` if provided.
  if (range.from) {
    return out.filter((p) => p.date >= range.from!);
  }
  return out;
}

function resample(daily: SeriesPoint[], granularity: Granularity): SeriesPoint[] {
  if (granularity === 'day') return daily;
  const bucket = granularity === 'week' ? 7 : 30;
  const out: SeriesPoint[] = [];
  for (let i = 0; i < daily.length; i += bucket) {
    const slice = daily.slice(i, i + bucket);
    const avg = slice.reduce((a, b) => a + b.value, 0) / slice.length;
    out.push({ date: slice[0].date, value: avg });
  }
  return out;
}

// Predicate evaluator over a synthetic 1000-row "user table". Mock data
// is generated deterministically from the criteria's metric IDs so
// counts stay stable across reloads.
function syntheticUsers(game: string, n: number): Record<string, number>[] {
  const rand = _rng(_hash(`pop:${game}`));
  const rows: Record<string, number>[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      m_sessions_7d: Math.floor(rand() * 30),
      m_spend_30d: rand() * 250,
      m_dormant_days: Math.floor(rand() * 30),
      m_churn_risk_ptg: rand(),
      m_pay_prob_ptg: rand(),
      m_d1_retained: rand() > 0.5 ? 1 : 0,
      m_level: Math.floor(rand() * 200),
    });
  }
  return rows;
}

function evaluateLeaf(row: Record<string, unknown>, c: Extract<Criteria, { metricId: string }>): boolean {
  const v = row[c.metricId];
  if (v === undefined) return false;
  switch (c.operator) {
    case '>': return Number(v) > Number(c.value);
    case '<': return Number(v) < Number(c.value);
    case '=': return v === c.value || Number(v) === Number(c.value);
    case '>=': return Number(v) >= Number(c.value);
    case '<=': return Number(v) <= Number(c.value);
    case 'in': return Array.isArray(c.value) && (c.value as unknown[]).includes(v);
    default: return false;
  }
}

function evaluate(row: Record<string, unknown>, c: Criteria): boolean {
  if ('op' in c) {
    if (c.op === 'AND') return c.children.every((ch) => evaluate(row, ch));
    return c.children.some((ch) => evaluate(row, ch));
  }
  return evaluateLeaf(row, c);
}

@Injectable()
export class MockJsonlDriver implements QueryDriver {
  async getSeries(p: { metric: MetricMeta; binding?: MetricBinding | null; range: DateRange; granularity: Granularity }) {
    const daily = buildSeries(p.metric, p.range);
    return resample(daily, p.granularity).slice(0, 1000);
  }

  async countSegment(p: { criteria: Criteria; bindings: MetricBinding[]; game: string }) {
    const start = Date.now();
    const rows = syntheticUsers(p.game, 1000);
    const matches = rows.filter((r) => evaluate(r, p.criteria)).length;
    // Scale up to a believable population — bindings.length is a proxy
    // for criteria fan-out; phase 06 returns the real count.
    const scaled = matches * (1000 + p.bindings.length * 100);
    return { count: scaled, ms: Date.now() - start, freshness: 'now' };
  }

  async previewSegment(p: { criteria: Criteria; bindings: MetricBinding[]; game: string; limit: number }) {
    const rows = syntheticUsers(p.game, 1000);
    return rows.filter((r) => evaluate(r, p.criteria)).slice(0, Math.min(p.limit, 500));
  }
}
