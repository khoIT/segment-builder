CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "build_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_table_id" uuid NOT NULL,
	"status" text NOT NULL,
	"processed_rows" integer DEFAULT 0 NOT NULL,
	"total_rows" integer,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "freshness_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target" text NOT NULL,
	"game" text NOT NULL,
	"type" text NOT NULL,
	"sla" text NOT NULL,
	"current" text NOT NULL,
	"status" text NOT NULL,
	"breaches_7d" integer DEFAULT 0 NOT NULL,
	"trend" jsonb NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"short" text NOT NULL,
	"color" text NOT NULL,
	"players" text,
	"genre" text,
	"trino_schema" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"game_id" text NOT NULL,
	"template_id" text NOT NULL,
	"spec" jsonb NOT NULL,
	"owner" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"game_id" text,
	"mapping_id" uuid,
	"template_id" text NOT NULL,
	"status" text DEFAULT 'never_built' NOT NULL,
	"last_build_at" timestamp with time zone,
	"last_build_ms" integer,
	"row_count" integer DEFAULT 0 NOT NULL,
	"columns" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_user_profile_dx" (
	"master_table_id" uuid NOT NULL,
	"vopenid" text NOT NULL,
	"roleid" text,
	"game_id" text,
	"install_date" date,
	"media_source" text,
	"country_code" text,
	"platform" text,
	"login_rows_d7" integer,
	"days_active_d7" integer,
	"matches_d7" integer,
	"kills_d7" bigint,
	"rev_usd_d1" double precision,
	"orders_d1" integer,
	"is_payer_d1" boolean,
	"rev_usd_d7" double precision,
	"orders_d7" integer,
	"is_payer_d7" boolean,
	"bp_orders_d7" integer,
	"is_bp_d7" boolean,
	"rev_usd_d30" double precision,
	"orders_d30" integer,
	"is_payer_d30" boolean,
	CONSTRAINT "master_user_profile_dx_master_table_id_vopenid_pk" PRIMARY KEY("master_table_id","vopenid")
);
--> statement-breakpoint
CREATE TABLE "metric_changelog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_id" text NOT NULL,
	"version" integer NOT NULL,
	"actor_id" text NOT NULL,
	"diff" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_source_bindings" (
	"metric_id" text NOT NULL,
	"game_id" text NOT NULL,
	"source_table" text NOT NULL,
	"master_table" text,
	"column_map" jsonb,
	CONSTRAINT "metric_source_bindings_metric_id_game_id_pk" PRIMARY KEY("metric_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"top_group" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"owner" text NOT NULL,
	"unit" text NOT NULL,
	"freq" text NOT NULL,
	"realtime" boolean DEFAULT false NOT NULL,
	"good_dir" text DEFAULT 'up' NOT NULL,
	"formula" text,
	"description" text,
	"games" jsonb NOT NULL,
	"window_spec" text NOT NULL,
	"source" text,
	"master_table" text,
	"deps" jsonb,
	"model" text,
	"used_by_count" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segment_changelog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment_id" text NOT NULL,
	"version" integer NOT NULL,
	"actor_id" text NOT NULL,
	"diff" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"game" text NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"size_trend" text DEFAULT 'flat' NOT NULL,
	"delta" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"owner" text NOT NULL,
	"updated" text DEFAULT '' NOT NULL,
	"campaigns" integer DEFAULT 0 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"filters" jsonb NOT NULL,
	"criteria" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"game" text NOT NULL,
	"cadence" text NOT NULL,
	"volume" text NOT NULL,
	"owner" text NOT NULL,
	"status" text NOT NULL,
	"last_run" text NOT NULL,
	"topics" jsonb NOT NULL,
	"path" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_pins" (
	"user_id" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_pins_user_id_entity_entity_id_pk" PRIMARY KEY("user_id","entity","entity_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "build_jobs" ADD CONSTRAINT "build_jobs_master_table_id_master_tables_id_fk" FOREIGN KEY ("master_table_id") REFERENCES "public"."master_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mappings" ADD CONSTRAINT "mappings_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_tables" ADD CONSTRAINT "master_tables_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_tables" ADD CONSTRAINT "master_tables_mapping_id_mappings_id_fk" FOREIGN KEY ("mapping_id") REFERENCES "public"."mappings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_user_profile_dx" ADD CONSTRAINT "master_user_profile_dx_master_table_id_master_tables_id_fk" FOREIGN KEY ("master_table_id") REFERENCES "public"."master_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_changelog" ADD CONSTRAINT "metric_changelog_metric_id_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."metrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_source_bindings" ADD CONSTRAINT "metric_source_bindings_metric_id_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."metrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_source_bindings" ADD CONSTRAINT "metric_source_bindings_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_changelog" ADD CONSTRAINT "segment_changelog_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_by_entity" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_by_actor" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_by_created" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "jobs_by_master" ON "build_jobs" USING btree ("master_table_id","started_at");--> statement-breakpoint
CREATE INDEX "fresh_by_target" ON "freshness_records" USING btree ("target","game");--> statement-breakpoint
CREATE INDEX "mappings_by_game" ON "mappings" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "mupdx_install" ON "master_user_profile_dx" USING btree ("master_table_id","install_date");--> statement-breakpoint
CREATE INDEX "mupdx_media" ON "master_user_profile_dx" USING btree ("master_table_id","media_source");--> statement-breakpoint
CREATE INDEX "mcl_by_metric" ON "metric_changelog" USING btree ("metric_id","version");--> statement-breakpoint
CREATE INDEX "msb_by_game" ON "metric_source_bindings" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "seg_by_game" ON "segments" USING btree ("game");