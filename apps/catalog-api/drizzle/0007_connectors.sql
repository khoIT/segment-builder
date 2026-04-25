-- Connectors table: tracks external data-source connection metadata.
-- Passwords stored as base64 (MOCK ONLY — real KMS vault in Q5).
CREATE TABLE "connectors" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "name" text NOT NULL,
  "env" text NOT NULL DEFAULT 'production',
  "host" text,
  "port" integer,
  "db" text,
  "user" text,
  "pass_encrypted" text,
  "status" text NOT NULL DEFAULT 'unknown',
  "last_sync_at" timestamp with time zone,
  "dataset_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "connectors_by_type" ON "connectors" USING btree ("type");--> statement-breakpoint
CREATE INDEX "connectors_by_status" ON "connectors" USING btree ("status");
