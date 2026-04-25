/**
 * Multi-source compile tests for compileMetricSpec.
 *
 * Validates:
 * - 2-source spec emits correct INNER JOIN SQL
 * - ON clause columns are correctly quoted
 * - filter values remain parameterised when qualified alias.col syntax used
 * - multi-source warning emitted
 * - identifier injection rejected at parse time (zod SafeIdent whitelist)
 * - 3-source chained JOIN emits two INNER JOINs
 * - superRefine: joins.length !== sources.length - 1 rejected
 */

import { BadRequestException } from '@nestjs/common';
import { compileMetricSpec } from './metric.builder';
import { MetricSpec } from '@bedrock/contracts';

// ─── Fixture: 2-source spec ──────────────────────────────────────────
// Recharge (primary, alias p) INNER JOIN login (alias l) ON vopenid.
const twoSourceSpec = {
  sources: [
    { table: 'raw_cfm_etl_recharge', alias: 'p', keyColumn: 'vopenid' },
    { table: 'raw_cfm_etl_login',    alias: 'l', keyColumn: 'vopenid' },
  ],
  joins: [
    { leftAlias: 'p', rightAlias: 'l', on: [{ leftCol: 'vopenid', rightCol: 'vopenid' }] },
  ],
  window: { kind: 'rolling_days', days: 30, eventDateColumn: 'dteventtime' },
  aggregation: { fn: 'sum', column: 'imoney_us' },
  filters: [],
  schedule: { kind: 'cron', expr: '@daily' },
  output: { unit: 'USD', goodDir: 'up' },
};

// ─── Fixture: 3-source spec ──────────────────────────────────────────
const threeSourceSpec = {
  sources: [
    { table: 'raw_etl_recharge', alias: 'p', keyColumn: 'vopenid' },
    { table: 'raw_etl_login',    alias: 'l', keyColumn: 'vopenid' },
    { table: 'raw_etl_logout',   alias: 'o', keyColumn: 'vopenid' },
  ],
  joins: [
    { leftAlias: 'p', rightAlias: 'l', on: [{ leftCol: 'vopenid', rightCol: 'vopenid' }] },
    { leftAlias: 'p', rightAlias: 'o', on: [{ leftCol: 'vopenid', rightCol: 'vopenid' }] },
  ],
  window: { kind: 'rolling_days', days: 7, eventDateColumn: 'dteventtime' },
  aggregation: { fn: 'count', column: null },
  filters: [],
  schedule: { kind: 'cron', expr: '@daily' },
  output: { unit: 'count', goodDir: 'up' },
};

describe('compileMetricSpec — 2-source INNER JOIN', () => {
  test('emits FROM primary AS p', () => {
    const { sql } = compileMetricSpec(twoSourceSpec);
    expect(sql).toContain('FROM "raw_cfm_etl_recharge" AS "p"');
  });

  test('emits INNER JOIN secondary AS l', () => {
    const { sql } = compileMetricSpec(twoSourceSpec);
    expect(sql).toContain('INNER JOIN "raw_cfm_etl_login" AS "l"');
  });

  test('emits ON clause with correct qualified columns', () => {
    const { sql } = compileMetricSpec(twoSourceSpec);
    expect(sql).toContain('"p"."vopenid" = "l"."vopenid"');
  });

  test('GROUP BY uses primary alias key column', () => {
    const { sql } = compileMetricSpec(twoSourceSpec);
    expect(sql).toContain('"p"."vopenid" AS key');
    expect(sql).toContain('"p"."vopenid" IS NOT NULL');
  });

  test('emits multi-source fanout warning', () => {
    const { warnings } = compileMetricSpec(twoSourceSpec);
    expect(warnings.some((w) => w.includes('multi-source'))).toBe(true);
  });

  test('no params for filter-free spec', () => {
    const { params } = compileMetricSpec(twoSourceSpec);
    expect(params).toEqual([]);
  });
});

describe('compileMetricSpec — 2-source with qualified filter column', () => {
  test('qualified alias.col filter is parameterised correctly', () => {
    const spec = {
      ...twoSourceSpec,
      filters: [{ column: 'l.iplatform', op: '=', value: 'ios' }],
    };
    const { sql, params } = compileMetricSpec(spec);
    expect(params).toEqual(['ios']);
    // qualified col should appear as "l"."iplatform" = $1
    expect(sql).toContain('"l"."iplatform" = $1');
  });

  test('unqualified filter column defaults to primary alias', () => {
    const spec = {
      ...twoSourceSpec,
      filters: [{ column: 'iplatform', op: '=', value: 'android' }],
    };
    const { sql, params } = compileMetricSpec(spec);
    expect(params).toEqual(['android']);
    expect(sql).toContain('"p"."iplatform" = $1');
  });
});

describe('compileMetricSpec — 2-source with qualified aggregation column', () => {
  test('qualified agg column alias.col is emitted correctly', () => {
    const spec = {
      ...twoSourceSpec,
      aggregation: { fn: 'sum', column: 'p.imoney_us' },
    };
    const { sql } = compileMetricSpec(spec);
    expect(sql).toContain('sum("p"."imoney_us")');
  });
});

describe('compileMetricSpec — 3-source chained JOINs', () => {
  test('emits two INNER JOINs', () => {
    const { sql } = compileMetricSpec(threeSourceSpec);
    const joinCount = (sql.match(/INNER JOIN/g) ?? []).length;
    expect(joinCount).toBe(2);
  });

  test('emits both secondary tables', () => {
    const { sql } = compileMetricSpec(threeSourceSpec);
    expect(sql).toContain('"raw_etl_login" AS "l"');
    expect(sql).toContain('"raw_etl_logout" AS "o"');
  });
});

describe('compileMetricSpec — identifier injection rejection', () => {
  test('table name with SQL injection characters rejected at parse', () => {
    expect(() =>
      MetricSpec.parse({
        sources: [{ table: "raw'; DROP TABLE x--", alias: 'p', keyColumn: 'vopenid' }],
        joins: [],
        window: { kind: 'rolling_days', days: 7, eventDateColumn: 'dteventtime' },
        aggregation: { fn: 'count', column: null },
        filters: [],
        schedule: { kind: 'cron', expr: '@daily' },
        output: { unit: 'count', goodDir: 'up' },
      }),
    ).toThrow();
  });

  test('alias with uppercase letters rejected (SafeIdent is lowercase-only)', () => {
    expect(() =>
      MetricSpec.parse({
        sources: [{ table: 'raw_etl_recharge', alias: 'P', keyColumn: 'vopenid' }],
        joins: [],
        window: { kind: 'rolling_days', days: 7, eventDateColumn: 'dteventtime' },
        aggregation: { fn: 'count', column: null },
        filters: [],
        schedule: { kind: 'cron', expr: '@daily' },
        output: { unit: 'count', goodDir: 'up' },
      }),
    ).toThrow();
  });

  test('keyColumn with spaces rejected', () => {
    expect(() =>
      MetricSpec.parse({
        sources: [{ table: 'raw_etl_recharge', alias: 'p', keyColumn: 'user id' }],
        joins: [],
        window: { kind: 'rolling_days', days: 7, eventDateColumn: 'dteventtime' },
        aggregation: { fn: 'count', column: null },
        filters: [],
        schedule: { kind: 'cron', expr: '@daily' },
        output: { unit: 'count', goodDir: 'up' },
      }),
    ).toThrow();
  });
});

describe('compileMetricSpec — superRefine: join count mismatch rejected', () => {
  test('2 sources with 0 joins rejected', () => {
    expect(() =>
      MetricSpec.parse({
        sources: [
          { table: 'raw_etl_recharge', alias: 'p', keyColumn: 'vopenid' },
          { table: 'raw_etl_login',    alias: 'l', keyColumn: 'vopenid' },
        ],
        joins: [],      // should be length 1
        window: { kind: 'rolling_days', days: 7, eventDateColumn: 'dteventtime' },
        aggregation: { fn: 'count', column: null },
        filters: [],
        schedule: { kind: 'cron', expr: '@daily' },
        output: { unit: 'count', goodDir: 'up' },
      }),
    ).toThrow(/joins.length.*must equal/);
  });

  test('1 source with 1 join rejected', () => {
    expect(() =>
      MetricSpec.parse({
        sources: [{ table: 'raw_etl_recharge', alias: 'p', keyColumn: 'vopenid' }],
        joins: [
          { leftAlias: 'p', rightAlias: 'l', on: [{ leftCol: 'vopenid', rightCol: 'vopenid' }] },
        ],
        window: { kind: 'rolling_days', days: 7, eventDateColumn: 'dteventtime' },
        aggregation: { fn: 'count', column: null },
        filters: [],
        schedule: { kind: 'cron', expr: '@daily' },
        output: { unit: 'count', goodDir: 'up' },
      }),
    ).toThrow(/joins.length.*must equal/);
  });

  test('4 sources rejected (exceeds max 3)', () => {
    expect(() =>
      MetricSpec.parse({
        sources: [
          { table: 'raw_etl_recharge', alias: 'p', keyColumn: 'vopenid' },
          { table: 'raw_etl_login',    alias: 'l', keyColumn: 'vopenid' },
          { table: 'raw_etl_logout',   alias: 'o', keyColumn: 'vopenid' },
          { table: 'raw_etl_game_detail', alias: 'g', keyColumn: 'vopenid' },
        ],
        joins: [],
        window: { kind: 'rolling_days', days: 7, eventDateColumn: 'dteventtime' },
        aggregation: { fn: 'count', column: null },
        filters: [],
        schedule: { kind: 'cron', expr: '@daily' },
        output: { unit: 'count', goodDir: 'up' },
      }),
    ).toThrow();
  });
});

describe('compileMetricSpec — superRefine: unknown join alias rejected', () => {
  test('join referencing unknown rightAlias rejected', () => {
    expect(() =>
      MetricSpec.parse({
        sources: [
          { table: 'raw_etl_recharge', alias: 'p', keyColumn: 'vopenid' },
          { table: 'raw_etl_login',    alias: 'l', keyColumn: 'vopenid' },
        ],
        joins: [
          // rightAlias 'x' not in sources
          { leftAlias: 'p', rightAlias: 'x', on: [{ leftCol: 'vopenid', rightCol: 'vopenid' }] },
        ],
        window: { kind: 'rolling_days', days: 7, eventDateColumn: 'dteventtime' },
        aggregation: { fn: 'count', column: null },
        filters: [],
        schedule: { kind: 'cron', expr: '@daily' },
        output: { unit: 'count', goodDir: 'up' },
      }),
    ).toThrow(/not found in sources/);
  });
});

describe('compileMetricSpec — compiler-level identifier safety', () => {
  test('throws BadRequestException for unsafe filter column at compile time', () => {
    // Filter column validation happens at compile time (qualifyCol).
    // Inject a column that passes the loose MetricFilter string type
    // but fails the safeIdent check in the compiler.
    const spec = {
      sources: [{ table: 'raw_etl_recharge', alias: 'p', keyColumn: 'vopenid' }],
      joins: [],
      window: { kind: 'rolling_days', days: 7, eventDateColumn: 'dteventtime' },
      aggregation: { fn: 'count', column: null },
      // Bypass zod by casting — simulates a corrupted DB row being compiled.
      filters: [{ column: 'evil; DROP TABLE x', op: '=', value: 1 }],
      schedule: { kind: 'cron', expr: '@daily' },
      output: { unit: 'count', goodDir: 'up' },
    };
    // normalizeMetricSpec accepts the loose MetricFilter.column string,
    // but safeIdent() inside the compiler rejects it.
    expect(() => compileMetricSpec(spec)).toThrow(BadRequestException);
  });
});
