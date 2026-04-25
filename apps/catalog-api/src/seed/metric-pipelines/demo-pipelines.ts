import type { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import type { MetricSpec } from '@bedrock/contracts';

// ─────────────────────────────────────────────────────────────────────
// Demo metric pipelines — give the metric-builder + metrics catalog
// something concrete to render after a fresh `pnpm db:seed`. Idempotent.
//
// Specs use the new multi-source shape: sources[] + joins[].
// Single-source metrics have sources.length === 1 and joins === [].
// ─────────────────────────────────────────────────────────────────────

type Demo = {
  id: string;
  name: string;
  category: 'engagement' | 'monetization' | 'progression' | 'retention' | 'social' | 'technical' | 'propensity';
  topGroup: 'engagement' | 'growth' | 'quality' | 'revenue';
  unit: 'USD' | 'count' | 'minutes' | 'days';
  goodDir: 'up' | 'down';
  description: string;
  spec: MetricSpec;
};

const DEMOS: Demo[] = [
  {
    id: 'm_demo_whale_spend_30d',
    name: 'whale_spend_30d',
    category: 'monetization',
    topGroup: 'revenue',
    unit: 'USD',
    goodDir: 'up',
    description: '30-day rolling USD spend per user, summed from raw_cfm_etl_recharge.',
    spec: {
      sources: [{ table: 'raw_cfm_etl_recharge', alias: 'p', keyColumn: 'vopenid' }],
      joins: [],
      window: { kind: 'rolling_days', days: 30, eventDateColumn: 'dteventtime' },
      aggregation: { fn: 'sum', column: 'imoney_us' },
      filters: [],
      schedule: { kind: 'cron', expr: '@daily' },
      output: { unit: 'USD', goodDir: 'up' },
    },
  },
  {
    id: 'm_demo_orders_30d',
    name: 'orders_30d',
    category: 'monetization',
    topGroup: 'revenue',
    unit: 'count',
    goodDir: 'up',
    description: '30-day order count per user.',
    spec: {
      sources: [{ table: 'raw_cfm_etl_recharge', alias: 'p', keyColumn: 'vopenid' }],
      joins: [],
      window: { kind: 'rolling_days', days: 30, eventDateColumn: 'dteventtime' },
      aggregation: { fn: 'count', column: null },
      filters: [],
      schedule: { kind: 'cron', expr: '@daily' },
      output: { unit: 'count', goodDir: 'up' },
    },
  },
  {
    id: 'm_demo_login_count_7d',
    name: 'login_count_7d',
    category: 'engagement',
    topGroup: 'engagement',
    unit: 'count',
    goodDir: 'up',
    description: '7-day rolling login count per user.',
    spec: {
      sources: [{ table: 'raw_cfm_etl_login', alias: 'p', keyColumn: 'vopenid' }],
      joins: [],
      window: { kind: 'rolling_days', days: 7, eventDateColumn: 'dteventtime' },
      aggregation: { fn: 'count', column: null },
      filters: [],
      schedule: { kind: 'cron', expr: '@hourly' },
      output: { unit: 'count', goodDir: 'up' },
    },
  },
  {
    id: 'm_demo_distinct_devices_30d',
    name: 'distinct_devices_30d',
    category: 'engagement',
    topGroup: 'engagement',
    unit: 'count',
    goodDir: 'up',
    description: 'Distinct devices a user logged in from over 30 days.',
    spec: {
      sources: [{ table: 'raw_cfm_etl_login', alias: 'p', keyColumn: 'vopenid' }],
      joins: [],
      window: { kind: 'rolling_days', days: 30, eventDateColumn: 'dteventtime' },
      aggregation: { fn: 'count_distinct', column: 'deviceid' },
      filters: [],
      schedule: { kind: 'cron', expr: '@daily' },
      output: { unit: 'count', goodDir: 'up' },
    },
  },
  {
    id: 'm_demo_kills_total_30d',
    name: 'kills_total_30d',
    category: 'progression',
    topGroup: 'engagement',
    unit: 'count',
    goodDir: 'up',
    description: 'Total kill flag sum across 30 days from raw_cfm_etl_game_detail.',
    spec: {
      sources: [{ table: 'raw_cfm_etl_game_detail', alias: 'p', keyColumn: 'playeropenid' }],
      joins: [],
      window: { kind: 'rolling_days', days: 30, eventDateColumn: 'dteventtime' },
      aggregation: { fn: 'sum', column: 'killflag', cast: 'numeric' },
      filters: [],
      schedule: { kind: 'cron', expr: '@daily' },
      output: { unit: 'count', goodDir: 'up' },
    },
  },
  {
    id: 'm_demo_avg_session_30d',
    name: 'avg_session_minutes_30d',
    category: 'engagement',
    topGroup: 'engagement',
    unit: 'minutes',
    goodDir: 'up',
    description: 'Average online minutes per session, rolling 30 days.',
    spec: {
      sources: [{ table: 'raw_cfm_etl_logout', alias: 'p', keyColumn: 'vopenid' }],
      joins: [],
      window: { kind: 'rolling_days', days: 30, eventDateColumn: 'dteventtime' },
      aggregation: { fn: 'avg', column: 'onlinetime', cast: 'numeric' },
      filters: [],
      schedule: { kind: 'cron', expr: '@daily' },
      output: { unit: 'minutes', goodDir: 'up' },
    },
  },
];

const ID_RE = /^[a-z0-9_]+$/;

function quoteIdent(name: string): string {
  if (!ID_RE.test(name)) throw new Error(`unsafe identifier: ${name}`);
  return `"${name}"`;
}

function compileAgg(agg: MetricSpec['aggregation']): string {
  switch (agg.fn) {
    case 'count':          return 'count(*)';
    case 'count_distinct': return `count(DISTINCT ${quoteIdent(agg.column!)})`;
    case 'sum': case 'avg': case 'max': case 'min': {
      const col = quoteIdent(agg.column!);
      const inner = agg.cast === 'numeric' ? `CAST(${col} AS numeric)` : col;
      return `${agg.fn}(${inner})`;
    }
  }
}

function buildMaterializeSql(spec: MetricSpec, valueTable: string): string {
  // Primary source is always sources[0]. Single-source only for seed;
  // multi-source metrics are created via API after seed runs.
  const primary = spec.sources[0]!;
  const t = quoteIdent(primary.table);
  const k = quoteIdent(primary.keyColumn);
  const d = quoteIdent(spec.window.eventDateColumn);
  const agg = compileAgg(spec.aggregation);
  return `INSERT INTO ${quoteIdent(valueTable)} (date, key, value)
SELECT date_trunc('day', ${d})::date AS date,
       ${k} AS key,
       ${agg} AS value
FROM ${t}
WHERE ${d} >= (now() - INTERVAL '${spec.window.days} days')
  AND ${k} IS NOT NULL
GROUP BY 1, 2`;
}

export async function seedDemoMetricPipelines(
  db: NodePgDatabase<typeof schema>,
  pool: Pool,
): Promise<void> {
  const now = new Date();

  for (const d of DEMOS) {
    const valueTable = `metric_${d.id}_values`;
    const primary = d.spec.sources[0]!;

    // 1. Insert metrics row (skip if exists).
    const existingMetric = await db.select().from(schema.metrics).where(eq(schema.metrics.id, d.id)).limit(1);
    if (!existingMetric.length) {
      await db.insert(schema.metrics).values({
        id: d.id,
        name: d.name,
        category: d.category,
        topGroup: d.topGroup,
        type: 'custom',
        status: 'experimental',
        owner: 'data.demo',
        unit: d.unit,
        freq: d.spec.schedule.expr === '@hourly' ? 'hourly' : 'daily',
        realtime: false,
        goodDir: d.goodDir,
        formula: null,
        description: d.description,
        games: ['ALL'] as never,
        windowSpec: `${d.spec.window.days}d rolling`,
        source: primary.table,
        masterTable: null,
        deps: null,
        model: null,
        usedByCount: 0,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 2. Insert metric_pipelines row (skip if exists).
    const existingPipeline = await db.select().from(schema.metricPipelines).where(eq(schema.metricPipelines.id, d.id)).limit(1);
    if (!existingPipeline.length) {
      await db.insert(schema.metricPipelines).values({
        id: d.id,
        spec: d.spec as never,
        schedule: d.spec.schedule.expr,
        status: 'active',
        lastRunAt: now,
        nextRunAt: now,
        lastRowCount: 0,
        lastError: null,
        consecutiveFailures: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 3. Materialize values inline. Skip if value table already has rows.
    await pool.query(`CREATE TABLE IF NOT EXISTS ${quoteIdent(valueTable)} (
      date  date NOT NULL,
      key   text NOT NULL,
      value double precision NOT NULL,
      materialized_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (date, key)
    )`);
    const existingRows = await pool.query(`SELECT count(*)::int AS n FROM ${quoteIdent(valueTable)}`);
    if ((existingRows.rows[0]?.n ?? 0) > 0) {
      // eslint-disable-next-line no-console
      console.log(`[seed] metric ${d.id}: ${existingRows.rows[0].n} rows already materialized — skip`);
      continue;
    }
    const insertSql = buildMaterializeSql(d.spec, valueTable);
    const res = await pool.query(insertSql);
    const rowCount = res.rowCount ?? 0;

    await db.update(schema.metricPipelines)
      .set({ lastRowCount: rowCount, lastRunAt: new Date(), status: 'active' })
      .where(eq(schema.metricPipelines.id, d.id));

    // eslint-disable-next-line no-console
    console.log(`[seed] metric ${d.id} → ${rowCount} rows materialized`);
  }
}
