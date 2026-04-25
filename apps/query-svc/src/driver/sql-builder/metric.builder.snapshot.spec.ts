/**
 * Snapshot tests for compileMetricSpec.
 *
 * Covers the 6 demo seeded metrics (representative of the full 25 in
 * production data — all use the same set of aggregation fns, windows,
 * and source tables). Legacy {cohort} shape is fed through the normalizer
 * to prove back-compat. New {sources,joins} shape is tested directly.
 *
 * NOTE: The actual DB seed contains 25 metrics (from demo-pipelines.ts),
 * but only 6 unique shapes are defined there. All 6 are covered here with
 * explicit SQL assertions (not jest .toMatchSnapshot() files) so the
 * expected SQL is human-readable in the test file itself.
 */

import { compileMetricSpec } from './metric.builder';

// ─── Legacy shape fixtures (old cohort: {sourceTable, keyColumn}) ────
// These represent what is currently stored in the DB for pre-P3 metrics.
// The compiler must normalise and produce identical SQL to the new shape.

const legacyWhalSpend = {
  cohort: { sourceTable: 'raw_etl_recharge', keyColumn: 'vopenid' },
  window: { kind: 'rolling_days', days: 30, eventDateColumn: 'dteventtime' },
  aggregation: { fn: 'sum', column: 'imoney_us' },
  filters: [],
  schedule: { kind: 'cron', expr: '@daily' },
  output: { unit: 'USD', goodDir: 'up' },
};

const legacyOrders = {
  cohort: { sourceTable: 'raw_etl_recharge', keyColumn: 'vopenid' },
  window: { kind: 'rolling_days', days: 30, eventDateColumn: 'dteventtime' },
  aggregation: { fn: 'count', column: null },
  filters: [],
  schedule: { kind: 'cron', expr: '@daily' },
  output: { unit: 'count', goodDir: 'up' },
};

const legacyLoginCount = {
  cohort: { sourceTable: 'raw_etl_login', keyColumn: 'vopenid' },
  window: { kind: 'rolling_days', days: 7, eventDateColumn: 'dteventtime' },
  aggregation: { fn: 'count', column: null },
  filters: [],
  schedule: { kind: 'cron', expr: '@hourly' },
  output: { unit: 'count', goodDir: 'up' },
};

const legacyDistinctDevices = {
  cohort: { sourceTable: 'raw_etl_login', keyColumn: 'vopenid' },
  window: { kind: 'rolling_days', days: 30, eventDateColumn: 'dteventtime' },
  aggregation: { fn: 'count_distinct', column: 'deviceid' },
  filters: [],
  schedule: { kind: 'cron', expr: '@daily' },
  output: { unit: 'count', goodDir: 'up' },
};

const legacyKillsTotal = {
  cohort: { sourceTable: 'raw_etl_game_detail', keyColumn: 'playeropenid' },
  window: { kind: 'rolling_days', days: 30, eventDateColumn: 'dteventtime' },
  aggregation: { fn: 'sum', column: 'killflag' },
  filters: [],
  schedule: { kind: 'cron', expr: '@daily' },
  output: { unit: 'count', goodDir: 'up' },
};

const legacyAvgSession = {
  cohort: { sourceTable: 'raw_etl_logout', keyColumn: 'vopenid' },
  window: { kind: 'rolling_days', days: 30, eventDateColumn: 'dteventtime' },
  aggregation: { fn: 'avg', column: 'onlinetime', cast: 'numeric' },
  filters: [],
  schedule: { kind: 'cron', expr: '@daily' },
  output: { unit: 'minutes', goodDir: 'up' },
};

// ─── New shape fixtures (same logical specs, new contract shape) ─────

const newWhalSpend = {
  sources: [{ table: 'raw_etl_recharge', alias: 'p', keyColumn: 'vopenid' }],
  joins: [],
  window: { kind: 'rolling_days', days: 30, eventDateColumn: 'dteventtime' },
  aggregation: { fn: 'sum', column: 'imoney_us' },
  filters: [],
  schedule: { kind: 'cron', expr: '@daily' },
  output: { unit: 'USD', goodDir: 'up' },
};

// ─── Expected SQL snippets ───────────────────────────────────────────

const RECHARGE_FROM = 'FROM "raw_etl_recharge" AS "p"';
const LOGIN_FROM = 'FROM "raw_etl_login" AS "p"';
const GAME_DETAIL_FROM = 'FROM "raw_etl_game_detail" AS "p"';
const LOGOUT_FROM = 'FROM "raw_etl_logout" AS "p"';

describe('compileMetricSpec — snapshot suite (back-compat via legacy cohort shape)', () => {
  test('whale_spend_30d: SUM imoney_us from recharge', () => {
    const { sql, params, warnings } = compileMetricSpec(legacyWhalSpend);
    expect(params).toEqual([]);
    expect(warnings).toEqual([]);
    expect(sql).toContain(RECHARGE_FROM);
    expect(sql).toContain('sum("p"."imoney_us")');
    expect(sql).toContain('"p"."vopenid" AS key');
    expect(sql).toContain("INTERVAL '30 days'");
    expect(sql).toContain('GROUP BY 1, 2');
  });

  test('orders_30d: COUNT(*) from recharge', () => {
    const { sql, params } = compileMetricSpec(legacyOrders);
    expect(params).toEqual([]);
    expect(sql).toContain(RECHARGE_FROM);
    expect(sql).toContain('count(*)');
    expect(sql).toContain('"p"."vopenid" AS key');
    expect(sql).toContain("INTERVAL '30 days'");
  });

  test('login_count_7d: COUNT(*) from login, 7d window', () => {
    const { sql } = compileMetricSpec(legacyLoginCount);
    expect(sql).toContain(LOGIN_FROM);
    expect(sql).toContain('count(*)');
    expect(sql).toContain("INTERVAL '7 days'");
  });

  test('distinct_devices_30d: COUNT(DISTINCT deviceid) from login', () => {
    const { sql } = compileMetricSpec(legacyDistinctDevices);
    expect(sql).toContain(LOGIN_FROM);
    expect(sql).toContain('count(DISTINCT "p"."deviceid")');
  });

  test('kills_total_30d: SUM killflag from game_detail, key=playeropenid', () => {
    const { sql } = compileMetricSpec(legacyKillsTotal);
    expect(sql).toContain(GAME_DETAIL_FROM);
    expect(sql).toContain('sum("p"."killflag")');
    expect(sql).toContain('"p"."playeropenid" AS key');
  });

  test('avg_session_30d: AVG(CAST onlinetime AS numeric) from logout', () => {
    const { sql } = compileMetricSpec(legacyAvgSession);
    expect(sql).toContain(LOGOUT_FROM);
    expect(sql).toContain('avg(CAST("p"."onlinetime" AS numeric))');
  });

  test('new-shape spec produces identical SQL to legacy equivalent', () => {
    const legacyResult = compileMetricSpec(legacyWhalSpend);
    const newResult = compileMetricSpec(newWhalSpend);
    expect(newResult.sql).toEqual(legacyResult.sql);
    expect(newResult.params).toEqual(legacyResult.params);
  });
});

describe('compileMetricSpec — filter parameterisation', () => {
  test('equality filter is parameterised', () => {
    const spec = {
      ...legacyWhalSpend,
      filters: [{ column: 'iplatform', op: '=', value: 'ios' }],
    };
    const { sql, params } = compileMetricSpec(spec);
    expect(params).toEqual(['ios']);
    expect(sql).toContain('"p"."iplatform" = $1');
  });

  test('IN filter with multiple values is parameterised', () => {
    const spec = {
      ...legacyWhalSpend,
      filters: [{ column: 'iplatform', op: 'in', value: ['ios', 'android'] }],
    };
    const { sql, params } = compileMetricSpec(spec);
    expect(params).toEqual(['ios', 'android']);
    expect(sql).toContain('"p"."iplatform" IN ($1, $2)');
  });

  test('empty IN list short-circuits to FALSE', () => {
    const spec = {
      ...legacyWhalSpend,
      filters: [{ column: 'iplatform', op: 'in', value: [] }],
    };
    const { sql, params } = compileMetricSpec(spec);
    expect(params).toEqual([]);
    expect(sql).toContain('FALSE');
  });
});

describe('compileMetricSpec — cohort_relative window warning', () => {
  test('emits cohort_relative warning', () => {
    const spec = {
      ...legacyWhalSpend,
      window: { kind: 'cohort_relative', days: 14, eventDateColumn: 'dteventtime' },
    };
    const { warnings } = compileMetricSpec(spec);
    expect(warnings.some((w) => w.includes('cohort_relative'))).toBe(true);
  });
});
