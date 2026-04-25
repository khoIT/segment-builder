CREATE TABLE "catalog_columns" (
	"table_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"ordinal" integer NOT NULL,
	"is_pii" boolean DEFAULT false NOT NULL,
	"description" text,
	CONSTRAINT "catalog_columns_table_id_name_pk" PRIMARY KEY("table_id","name")
);
--> statement-breakpoint
CREATE TABLE "catalog_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"game" text,
	"category" text NOT NULL,
	"partition_keys" jsonb NOT NULL,
	"row_count" bigint DEFAULT 0 NOT NULL,
	"last_refresh_at" timestamp with time zone,
	"source_kind" text NOT NULL,
	"source_ref" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "column_profiles" (
	"table_id" text NOT NULL,
	"column_name" text NOT NULL,
	"null_pct" double precision DEFAULT 0 NOT NULL,
	"distinct_count" bigint DEFAULT 0 NOT NULL,
	"top_values" jsonb NOT NULL,
	"sampled_rows" bigint DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "column_profiles_table_id_column_name_pk" PRIMARY KEY("table_id","column_name")
);
--> statement-breakpoint
ALTER TABLE "catalog_columns" ADD CONSTRAINT "catalog_columns_table_id_catalog_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."catalog_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_by_category" ON "catalog_tables" USING btree ("category");--> statement-breakpoint
CREATE INDEX "catalog_by_game" ON "catalog_tables" USING btree ("game");