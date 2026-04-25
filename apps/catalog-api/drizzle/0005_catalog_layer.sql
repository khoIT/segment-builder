ALTER TABLE "catalog_tables" ADD COLUMN "layer" text DEFAULT 'aggregate' NOT NULL;--> statement-breakpoint
CREATE INDEX "catalog_by_layer" ON "catalog_tables" USING btree ("layer");
