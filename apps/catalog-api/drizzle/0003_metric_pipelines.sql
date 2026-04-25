CREATE TABLE "metric_pipelines" (
	"id" text PRIMARY KEY NOT NULL,
	"spec" jsonb NOT NULL,
	"schedule" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"last_row_count" integer,
	"last_error" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "metric_pipelines" ADD CONSTRAINT "metric_pipelines_id_metrics_id_fk" FOREIGN KEY ("id") REFERENCES "public"."metrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_by_status" ON "metric_pipelines" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mp_by_next_run" ON "metric_pipelines" USING btree ("next_run_at");