-- Drop the cfm-shaped staging tables. They're being replaced by
-- per-game Trino-faithful tables (raw_cfm_*, raw_blstr_*) created
-- dynamically at seed time from infra/trino-mock/data/<schema>/*.schema.json.
DROP TABLE IF EXISTS "raw_etl_login";--> statement-breakpoint
DROP TABLE IF EXISTS "raw_etl_logout";--> statement-breakpoint
DROP TABLE IF EXISTS "raw_etl_recharge";--> statement-breakpoint
DROP TABLE IF EXISTS "raw_etl_game_detail";--> statement-breakpoint
DROP TABLE IF EXISTS "raw_std_master_user_profile";--> statement-breakpoint

-- Pipelines = the SQL transform that converts one or more raw_<game>_<table>
-- rows into a single catalog_<id> derived table. Captured here so the UI
-- can show "this catalog table came from this SQL on these source tables".
CREATE TABLE "pipelines" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "game_id" text,
  "source_tables" jsonb NOT NULL,
  "target_table_id" text NOT NULL REFERENCES "catalog_tables"("id") ON DELETE CASCADE,
  "transform_sql" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'derive',
  "schedule" text NOT NULL DEFAULT 'manual',
  "status" text NOT NULL DEFAULT 'idle',
  "last_run_at" timestamp with time zone,
  "last_row_count" integer,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "pipelines_by_target" ON "pipelines" USING btree ("target_table_id");--> statement-breakpoint
CREATE INDEX "pipelines_by_game" ON "pipelines" USING btree ("game_id");--> statement-breakpoint

-- Backref so /catalog/:id can include its pipeline summary inline.
ALTER TABLE "catalog_tables" ADD COLUMN "pipeline_id" text REFERENCES "pipelines"("id") ON DELETE SET NULL;
