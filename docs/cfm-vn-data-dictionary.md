# CFM-VN Data Dictionary

Distilled from `C:\Users\CPU12830-local\code\cfm-analysis\` — production
Trino SQL + sample CSV. **Single source of truth** for raw `etl_*` column
semantics + master-table output shape. UI labels, mapping templates, and
metric formula bindings should all reference this doc.

> Reference: see `data/revenue order battlepass.sql` in the cfm-analysis
> repo for the canonical raw → master transformation. Mapping templates
> in this project are derived from that SQL.

## 1. Schema map (Trino: `iceberg.cfm_vn.*`)

### Identity / cohort
| Table | Use |
|---|---|
| `std_master_user_profile` | User-grain profile: `vopenid`, `install_time`, `game_id`, `media_source`, `campaign_id`, `adset_id`, `ad_id`, `site_id`, `first_os`/`last_os`, `first_country_code`/`last_country_code`, `first_login_channel`/`last_login_channel`. The starting point for any user-grain master table. |
| `etl_new_register` | First-register event per role. Used to map `vopenid` → `roleid` via `min_by(roleid, ds)`. |

### Engagement / behavior
| Table | Key cols | Common rollup |
|---|---|---|
| `etl_login` | `vopenid`, `dteventtime`, `loginchannel`, `network`, `clientversion`, `level`, `viplevel`, `ladderscore`, `ds` | `login_rows`, `active_days`, varieties (channel/network/clientversion), `max_level`, `max_viplevel`, `max_ladderscore` |
| `etl_game_detail` | `vopenid`, `gameresult`, `gameduration`, `score`, `timeskill`, `timesbekilled`, `timesassists`, `level`, `ladderlevel`, `ds` | `games`, `win_rate`, `avg_game_duration`, `avg_score`, `kills`, `deaths`, `assists`, `kd`, `max_level_game`, `max_ladderlevel` |
| `etl_logout` | session-end events | session length distribution (when paired with login) |
| `etl_match_net_work_stats` | match-level network/QoS | latency/jitter aggregates |
| `etl_player_join_match` | match-join events | match-funnel completion |
| `etl_room_*` / `etl_team_*` / `etl_sec_*` | room/team/section flow events | granular match telemetry |
| `etl_mission_daily` / `etl_newbiedetail` / `etl_newbietutorial` | quests + tutorial progression | retention/onboarding metrics |
| `etl_lotteryshoot` / `etl_propflow` / `etl_equip_prop_flow` | item economy flows | spending-adjacent engagement |

### Monetization
| Table | Key cols | Common rollup |
|---|---|---|
| `etl_recharge` | `vopenid`, `recharge_amount`, `currency`, `event_time`, `ds` | `rev_d1/d7/d30`, `orders_*`, `is_payer_*` |
| `etl_moneyflow` | in-game currency flow | virtual-currency leakage / sinks |
| `etl_reward_order_daily_mission_get` | quest payout | reward-correlated revenue lift |

Battlepass identification: SQL convention is `WHERE order matches battlepass SKU` → `bp_orders_*`, `is_bp_*`. **Decision:** `etl_recharge` alone is sufficient — no `etl_propflow` join required for battlepass detection in starter templates.

### Marketing / acquisition
| Table | Use |
|---|---|
| `etl_appsflyer_installs_datalocker` | Install attribution (cohort entry) |
| `etl_appsflyer_inapp_event_datalocker` | Postback events for ROAS |
| `etl_appsflyer_reinstalls_datalocker` | Reinstall cohort tracking |
| `etl_appsflyer_retargeting_datalocker` | Retargeting attribution |
| `etl_appsflyer_blocked_installs_report_datalocker` | Fraud filter |
| `etl_facebook` / `etl_google` / `etl_tiktok_*` / `etl_apple` | Channel-level spend/install joins |

### Other
| Table | Use |
|---|---|
| `etl_ai_robot_game_detail` | Bot-vs-human flag for clean cohorts |
| `etl_ping_marks_flow` | Realtime player marker telemetry |
| `etl_id_ip_mail_flow` | Identity linkage (multi-account detection) |
| `etl_sdk_login` | SDK-level login events (auth funnel) |

## 2. Canonical master-table output shape (cfm-analysis CSV)

49-column user-grain wide table — the reference shape for any "user
profile + Dx behaviour + Dx revenue" master built in Bedrock.

| Group | Columns |
|---|---|
| Identity | `vopenid`, `roleid`, `install_date`, `game_id` |
| UA attribution | `media_source`, `campaign_id`, `adset_id`, `ad_id`, `site_id` |
| Device / geo | `first_os`, `last_os`, `first_country_code`, `last_country_code`, `first_login_channel`, `last_login_channel` |
| Engagement D7 | `login_rows_d7`, `active_days_d7`, `loginchannel_variety_d7`, `network_variety_d7`, `clientversion_variety_d7`, `max_level_seen_d7`, `max_viplevel_seen_d7`, `max_ladderscore_d7` |
| Gameplay D7 | `games_d7`, `win_rate_d7`, `avg_game_duration_d7`, `avg_score_d7`, `kills_d7`, `deaths_d7`, `assists_d7`, `kd_d7`, `max_level_game_d7`, `max_ladderlevel_d7` |
| Revenue (local + USD) | `rev_d1`, `rev_d7`, `rev_d30`, `rev_usd_d1`, `rev_usd_d7`, `rev_usd_d30` |
| Orders / payer | `orders_d1`, `orders_d7`, `orders_d30`, `is_payer_d1`, `is_payer_d7`, `is_payer_d30`, `first_charge_day_offset` |
| Battlepass | `bp_orders_d1`, `bp_orders_d7`, `bp_orders_d30`, `is_bp_d1`, `is_bp_d7`, `is_bp_d30` |

### Type notes
- IDs are strings (`vopenid`, `roleid`, `campaign_id`, …) — never numeric.
- Revenue: VND (`rev_d*`) + USD conversion (`rev_usd_d*`); CFM is VND-native.
- Booleans (`is_payer_*`, `is_bp_*`) stored 0/1 in CSV; coerce at load.
- `first_charge_day_offset` is nullable (only payers).

## 3. Mapping templates (starter set for the Mapping DSL)

Templates that pre-fill the mapping form. Names + scopes:

| Template ID | Output | Sources |
|---|---|---|
| `tpl_user_profile_dx` | Identity + UA + Dx engagement/gameplay/revenue (the 49-col master) | `std_master_user_profile`, `etl_new_register`, `etl_login`, `etl_game_detail`, `etl_recharge` |
| `tpl_user_engagement_dx` | Identity + Dx engagement only | `std_master_user_profile`, `etl_login`, `etl_game_detail` |
| `tpl_user_revenue_dx` | Identity + Dx revenue + payer flags | `std_master_user_profile`, `etl_recharge` |
| `tpl_install_attribution` | Install cohort + first-session source attribution | `etl_appsflyer_installs_datalocker`, `std_master_user_profile` |
| `tpl_session_grain` | Session-grain (one row per login session) | `etl_login`, `etl_logout` |
| `tpl_match_grain` | Match-grain (one row per match) | `etl_game_detail`, `etl_match_net_work_stats`, `etl_player_join_match` |

Each template is a parameterized JSON spec: `{ window_days, cohort_filter, sources, joins, aggregations, output_columns }`. Users tweak parameters via form; the executor (mock or Trino) translates to either JSONL transform or a SQL CTE chain.

## 4. Common idioms (from cfm-analysis SQL)

- **Cohort window:** `install_time >= data_start AND install_time <= now() - 30d` ensures every cohort has a full D30.
- **Role mapping:** `min_by(roleid, ds)` — earliest role per `vopenid`.
- **Date partitioning:** `ds` (string YYYY-MM-DD partition column) is the primary partition key on every `etl_*`. Always filter on `ds` for performance.
- **Type coercion:** `TRY_CAST(col AS integer/double)` — etl tables ship strings; never trust types.
- **Distinct-count approximation:** `approx_distinct(NULLIF(col, ''))` for variety metrics.
- **Outer joins for revenue:** revenue tables are sparse; `LEFT JOIN` with `COALESCE(SUM, 0)`.

## 5. PII columns to scrub

Hash before persisting locally / in Postgres. Confirmed sensitive cols across tables:
- `vopenid` — already a hashed open-ID; safe to retain.
- `email`, `phone`, `imei`, `device_id`, `ip` — hash to 16-char SHA-256.
- `roleid` — internal identifier; retain.
- IPs in `etl_id_ip_mail_flow` — drop unless explicitly needed.

## 6. Open questions

- Is `std_master_user_profile` daily-refreshed or upsert-on-event?
- What's the row-count of each priority `etl_*` table for default date guards?

## 7. Note on scope

cfm-analysis touches a **handful** of `iceberg.cfm_vn.*` tables; this dictionary
documents them as the **starting** sample. Bedrock's actual product surface lets
users explore arbitrary `iceberg.<schema>.<table>` tables and attach semantic
meaning themselves. Treat this dictionary as the seed corpus, not the catalog
ceiling.
