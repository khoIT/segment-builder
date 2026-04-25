ALTER TABLE "raw_etl_game_detail" ADD COLUMN "game_id" text DEFAULT 'cfm' NOT NULL;--> statement-breakpoint
ALTER TABLE "raw_etl_login" ADD COLUMN "game_id" text DEFAULT 'cfm' NOT NULL;--> statement-breakpoint
ALTER TABLE "raw_etl_logout" ADD COLUMN "game_id" text DEFAULT 'cfm' NOT NULL;--> statement-breakpoint
ALTER TABLE "raw_etl_recharge" ADD COLUMN "game_id" text DEFAULT 'cfm' NOT NULL;--> statement-breakpoint
ALTER TABLE "raw_std_master_user_profile" ADD COLUMN "game_id" text DEFAULT 'cfm' NOT NULL;--> statement-breakpoint
CREATE INDEX "raw_game_game" ON "raw_etl_game_detail" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "raw_login_game" ON "raw_etl_login" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "raw_logout_game" ON "raw_etl_logout" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "raw_recharge_game" ON "raw_etl_recharge" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "raw_profile_game" ON "raw_std_master_user_profile" USING btree ("game_id");