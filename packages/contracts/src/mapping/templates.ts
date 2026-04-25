import { MappingTemplate } from './template.js';
import { MappingSpec, ColumnSpec } from './dsl.js';

// ─────────────────────────────────────────────────────────────────────
// 6 starter templates derived from the cfm-analysis SQL pattern. Each
// one is a `MappingTemplate` with a `defaultSpec` (a fully-formed
// `MappingSpec`) + a tiny `parameterSchema` driving the form UI.
//
// Templates are intentionally hand-written + commented — they are the
// canonical reference for what the DSL can express. New templates
// follow the same shape; ad-hoc spec authoring (no template) is
// deferred until templates prove themselves in production.
// ─────────────────────────────────────────────────────────────────────

const stringCol = (name: string, source?: string, description?: string): ColumnSpec => ({
  name, type: 'string', nullable: true, source, description,
});
const intCol = (name: string, source?: string, description?: string): ColumnSpec => ({
  name, type: 'int', nullable: true, source, description,
});
const doubleCol = (name: string, source?: string, description?: string): ColumnSpec => ({
  name, type: 'double', nullable: true, source, description,
});
const dateCol = (name: string, source?: string, description?: string): ColumnSpec => ({
  name, type: 'date', nullable: true, source, description,
});
const boolCol = (name: string, source?: string, description?: string): ColumnSpec => ({
  name, type: 'boolean', nullable: true, source, description,
});

// ── tpl_user_profile_dx — the canonical 49-col cfm-analysis master ──
const userProfileDxSpec: MappingSpec = {
  version: 1,
  templateId: 'tpl_user_profile_dx',
  game: 'cfm_vn',
  cohort: {
    sourceTable: 'std_master_user_profile',
    keyColumn: 'vopenid',
    cohortDateColumn: 'install_time',
    filters: [
      { column: 'install_time', op: '>=', value: '__cohortStart__' },
      { column: 'install_time', op: '<', value: '__cohortEnd__' },
    ],
  },
  enrichments: [
    {
      name: 'role_map',
      sourceTable: 'etl_new_register',
      joinKey: 'vopenid',
      filters: [],
      aggregation: { alias: 'roleid', fn: 'min_by', args: ['roleid', 'ds'] },
    },
  ],
  windows: [
    {
      label: 'd7',
      days: 7,
      sources: [
        {
          sourceTable: 'etl_login',
          dateColumn: 'dteventtime',
          filters: [],
          aggregations: [
            { alias: 'login_rows_d7', fn: 'count', args: ['*'], cast: 'integer' },
            { alias: 'days_active_d7', fn: 'count_distinct', args: ['ds'], cast: 'integer' },
          ],
        },
        {
          sourceTable: 'etl_game_detail',
          dateColumn: 'dteventtime',
          userKey: 'playeropenid',           // game_detail uses playeropenid (not vopenid)
          filters: [],
          aggregations: [
            { alias: 'matches_d7', fn: 'count', args: ['*'], cast: 'integer' },
          ],
        },
      ],
    },
    {
      label: 'd1_revenue',
      days: 1,
      sources: [{
        sourceTable: 'etl_recharge',
        dateColumn: 'dteventtime',
        filters: [],
        aggregations: [
          { alias: 'rev_usd_d1', fn: 'sum', args: ['imoney_us'], cast: 'double' },
          { alias: 'orders_d1', fn: 'count', args: ['*'], cast: 'integer' },
        ],
      }],
    },
    {
      label: 'd7_revenue',
      days: 7,
      sources: [{
        sourceTable: 'etl_recharge',
        dateColumn: 'dteventtime',
        filters: [],
        aggregations: [
          { alias: 'rev_usd_d7', fn: 'sum', args: ['imoney_us'], cast: 'double' },
          { alias: 'orders_d7', fn: 'count', args: ['*'], cast: 'integer' },
        ],
      }],
    },
    {
      label: 'd30_revenue',
      days: 30,
      sources: [{
        sourceTable: 'etl_recharge',
        dateColumn: 'dteventtime',
        filters: [],
        aggregations: [
          { alias: 'rev_usd_d30', fn: 'sum', args: ['imoney_us'], cast: 'double' },
          { alias: 'orders_d30', fn: 'count', args: ['*'], cast: 'integer' },
        ],
      }],
    },
  ],
  outputColumns: [
    // Identity (cohort)
    stringCol('vopenid', 'cohort'),
    stringCol('roleid', 'enrichment.role_map'),
    stringCol('game_id', 'cohort'),
    dateCol('install_date', 'cohort.install_time'),
    stringCol('media_source', 'cohort'),
    stringCol('country_code', 'cohort'),
    stringCol('platform', 'cohort'),
    // D7 engagement
    intCol('login_rows_d7', 'window.d7.etl_login'),
    intCol('days_active_d7', 'window.d7.etl_login'),
    intCol('matches_d7', 'window.d7.etl_game_detail'),
    // Revenue (D1/D7/D30)
    doubleCol('rev_usd_d1'),  intCol('orders_d1'),
    doubleCol('rev_usd_d7'),  intCol('orders_d7'),
    doubleCol('rev_usd_d30'), intCol('orders_d30'),
  ],
  pii: {
    hashColumns: ['vopenid', 'roleid'],
    dropColumns: [],
  },
};

const userProfileDx: MappingTemplate = {
  id: 'tpl_user_profile_dx',
  label: 'User Profile DX (canonical)',
  description: 'Per-user roll-up matching the cfm-analysis 49-column master: cohort + role-id + D7 engagement + D1/D7/D30 revenue. The reference template.',
  parameterSchema: [
    { key: 'cohortStart', label: 'Cohort start (UTC)',  type: 'date', required: true,  default: '2025-12-15', help: 'install_time >= this date' },
    { key: 'cohortEnd',   label: 'Cohort end (UTC)',    type: 'date', required: true,  default: '2026-02-22', help: 'install_time < this date' },
    { key: 'game',        label: 'Trino schema',        type: 'string', required: true, default: 'cfm_vn' },
    { key: 'includeBattlepass', label: 'Track BattlePass orders', type: 'boolean', required: false, default: true },
  ],
  defaultSpec: userProfileDxSpec,
};

// ── tpl_user_engagement_dx — engagement-only (no revenue blocks) ────
const userEngagementDxSpec: MappingSpec = {
  ...userProfileDxSpec,
  templateId: 'tpl_user_engagement_dx',
  windows: userProfileDxSpec.windows.filter((w) => w.label === 'd7'),
  outputColumns: userProfileDxSpec.outputColumns.filter(
    (c) => !c.name.startsWith('rev_') && !c.name.startsWith('orders_') && !c.name.startsWith('is_payer') && !c.name.startsWith('bp_') && !c.name.startsWith('is_bp'),
  ),
};

const userEngagementDx: MappingTemplate = {
  id: 'tpl_user_engagement_dx',
  label: 'User Engagement DX',
  description: 'Engagement-only roll-up: cohort + D7 logins/matches/kills. No revenue.',
  parameterSchema: userProfileDx.parameterSchema.filter((p) => p.key !== 'includeBattlepass'),
  defaultSpec: userEngagementDxSpec,
};

// ── tpl_user_revenue_dx — revenue-only (no engagement) ──────────────
const userRevenueDxSpec: MappingSpec = {
  ...userProfileDxSpec,
  templateId: 'tpl_user_revenue_dx',
  windows: userProfileDxSpec.windows.filter((w) => w.label !== 'd7'),
  outputColumns: userProfileDxSpec.outputColumns.filter(
    (c) =>
      ['vopenid', 'roleid', 'game_id', 'install_date', 'media_source', 'country_code', 'platform'].includes(c.name) ||
      c.name.startsWith('rev_') || c.name.startsWith('orders_') || c.name.startsWith('is_payer') || c.name.startsWith('bp_') || c.name.startsWith('is_bp'),
  ),
};

const userRevenueDx: MappingTemplate = {
  id: 'tpl_user_revenue_dx',
  label: 'User Revenue DX',
  description: 'Revenue-only roll-up: cohort + D1/D7/D30 spend, orders, payer flags, BattlePass flags.',
  parameterSchema: userProfileDx.parameterSchema,
  defaultSpec: userRevenueDxSpec,
};

// ── tpl_install_attribution — installs joined to AppsFlyer ─────────
const installAttributionSpec: MappingSpec = {
  version: 1,
  templateId: 'tpl_install_attribution',
  game: 'cfm_vn',
  cohort: {
    sourceTable: 'std_master_user_profile',
    keyColumn: 'vopenid',
    cohortDateColumn: 'install_time',
    filters: [
      { column: 'install_time', op: '>=', value: '__cohortStart__' },
      { column: 'install_time', op: '<', value: '__cohortEnd__' },
    ],
  },
  enrichments: [{
    name: 'attribution',
    sourceTable: 'etl_appsflyer_installs_datalocker',
    joinKey: 'vopenid',
    filters: [],
    aggregation: { alias: 'media_source', fn: 'min_by', args: ['media_source', 'event_time'] },
  }],
  windows: [],
  outputColumns: [
    stringCol('vopenid', 'cohort'),
    dateCol('install_date', 'cohort.install_time'),
    stringCol('media_source', 'enrichment.attribution'),
    stringCol('country_code', 'cohort'),
    stringCol('platform', 'cohort'),
  ],
  pii: { hashColumns: ['vopenid'], dropColumns: [] },
};

const installAttribution: MappingTemplate = {
  id: 'tpl_install_attribution',
  label: 'Install Attribution',
  description: 'Cohort installs joined to AppsFlyer datalocker for media_source attribution.',
  parameterSchema: [
    { key: 'cohortStart', label: 'Cohort start (UTC)', type: 'date', required: true, default: '2025-12-15' },
    { key: 'cohortEnd',   label: 'Cohort end (UTC)',   type: 'date', required: true, default: '2026-02-22' },
    { key: 'game',        label: 'Trino schema',       type: 'string', required: true, default: 'cfm_vn' },
  ],
  defaultSpec: installAttributionSpec,
};

// ── tpl_session_grain — one row per (user, ds) login session ───────
const sessionGrainSpec: MappingSpec = {
  version: 1,
  templateId: 'tpl_session_grain',
  game: 'cfm_vn',
  cohort: {
    sourceTable: 'std_master_user_profile',
    keyColumn: 'vopenid',
    cohortDateColumn: 'install_time',
    filters: [{ column: 'install_time', op: '>=', value: '__cohortStart__' }],
  },
  enrichments: [],
  windows: [{
    label: 'session',
    days: 30,
    sources: [{
      sourceTable: 'etl_login',
      dateColumn: 'dteventtime',
      filters: [],
      aggregations: [
        { alias: 'session_count', fn: 'count', args: ['*'], cast: 'integer' },
        { alias: 'first_login', fn: 'min', args: ['dteventtime'], cast: 'timestamp' },
        { alias: 'last_login',  fn: 'max', args: ['dteventtime'], cast: 'timestamp' },
      ],
    }],
  }],
  outputColumns: [
    stringCol('vopenid', 'cohort'),
    dateCol('ds', 'window.session'),
    intCol('session_count', 'window.session.etl_login'),
    stringCol('first_login', 'window.session.etl_login'),
    stringCol('last_login',  'window.session.etl_login'),
  ],
  pii: { hashColumns: ['vopenid'], dropColumns: [] },
};

const sessionGrain: MappingTemplate = {
  id: 'tpl_session_grain',
  label: 'Session Grain',
  description: 'One row per (user, day): session count + first/last login. Driver for D1/D7 retention metrics.',
  parameterSchema: [
    { key: 'cohortStart', label: 'Cohort start (UTC)', type: 'date', required: true, default: '2025-12-15' },
    { key: 'game',        label: 'Trino schema',       type: 'string', required: true, default: 'cfm_vn' },
    { key: 'windowDays',  label: 'Lookback window (days)', type: 'number', required: false, default: 30 },
  ],
  defaultSpec: sessionGrainSpec,
};

// ── tpl_match_grain — one row per (user, ds) match aggregate ──────
const matchGrainSpec: MappingSpec = {
  version: 1,
  templateId: 'tpl_match_grain',
  game: 'cfm_vn',
  cohort: {
    sourceTable: 'std_master_user_profile',
    keyColumn: 'vopenid',
    cohortDateColumn: 'install_time',
    filters: [{ column: 'install_time', op: '>=', value: '__cohortStart__' }],
  },
  enrichments: [],
  windows: [{
    label: 'match',
    days: 30,
    sources: [{
      sourceTable: 'etl_game_detail',
      dateColumn: 'dteventtime',
      filters: [],
      aggregations: [
        { alias: 'matches', fn: 'count', args: ['*'], cast: 'integer' },
        { alias: 'kills',   fn: 'sum', args: ['kill_count'], cast: 'integer' },
        { alias: 'deaths',  fn: 'sum', args: ['death_count'], cast: 'integer' },
        { alias: 'wins',    fn: 'sum', args: ['is_win'], cast: 'integer' },
      ],
    }],
  }],
  outputColumns: [
    stringCol('vopenid', 'cohort'),
    dateCol('ds', 'window.match'),
    intCol('matches', 'window.match.etl_game_detail'),
    intCol('kills',   'window.match.etl_game_detail'),
    intCol('deaths',  'window.match.etl_game_detail'),
    intCol('wins',    'window.match.etl_game_detail'),
  ],
  pii: { hashColumns: ['vopenid'], dropColumns: [] },
};

const matchGrain: MappingTemplate = {
  id: 'tpl_match_grain',
  label: 'Match Grain',
  description: 'One row per (user, day): match count, kills, deaths, wins. Substrate for K/D and win-rate metrics.',
  parameterSchema: [
    { key: 'cohortStart', label: 'Cohort start (UTC)', type: 'date', required: true, default: '2025-12-15' },
    { key: 'game',        label: 'Trino schema',       type: 'string', required: true, default: 'cfm_vn' },
    { key: 'windowDays',  label: 'Lookback window (days)', type: 'number', required: false, default: 30 },
  ],
  defaultSpec: matchGrainSpec,
};

export const MAPPING_TEMPLATES: MappingTemplate[] = [
  userProfileDx,
  userEngagementDx,
  userRevenueDx,
  installAttribution,
  sessionGrain,
  matchGrain,
];

export const MAPPING_TEMPLATE_BY_ID = Object.fromEntries(
  MAPPING_TEMPLATES.map((t) => [t.id, t]),
);
