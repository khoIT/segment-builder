CREATE TABLE "raw_etl_game_detail" (
	"playeropenid" text NOT NULL,
	"dteventtime" timestamp with time zone NOT NULL,
	"gameresult" text,
	"killflag" integer,
	"score" integer,
	"gameduration" integer,
	"ds" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_etl_login" (
	"vopenid" text NOT NULL,
	"dteventtime" timestamp with time zone NOT NULL,
	"country" text,
	"platid" text,
	"clientversion" text,
	"deviceid" text,
	"ds" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_etl_logout" (
	"vopenid" text NOT NULL,
	"dteventtime" timestamp with time zone NOT NULL,
	"onlinetime" integer,
	"ds" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_etl_recharge" (
	"vopenid" text NOT NULL,
	"dteventtime" timestamp with time zone NOT NULL,
	"imoney_us" double precision NOT NULL,
	"currency" text,
	"platid" text,
	"productid" text,
	"ds" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_std_master_user_profile" (
	"vopenid" text PRIMARY KEY NOT NULL,
	"install_time" timestamp with time zone NOT NULL,
	"last_login_time" timestamp with time zone,
	"last_charge_time" timestamp with time zone,
	"first_country_code" text,
	"first_os" text,
	"media_source" text,
	"total_rev" double precision DEFAULT 0 NOT NULL,
	"is_retained_d1" boolean DEFAULT false NOT NULL,
	"is_retained_d7" boolean DEFAULT false NOT NULL,
	"is_retained_d30" boolean DEFAULT false NOT NULL,
	"churn_prob" double precision DEFAULT 0 NOT NULL,
	"days_since_active" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "raw_game_user" ON "raw_etl_game_detail" USING btree ("playeropenid");--> statement-breakpoint
CREATE INDEX "raw_login_user" ON "raw_etl_login" USING btree ("vopenid");--> statement-breakpoint
CREATE INDEX "raw_login_ds" ON "raw_etl_login" USING btree ("ds");--> statement-breakpoint
CREATE INDEX "raw_logout_user" ON "raw_etl_logout" USING btree ("vopenid");--> statement-breakpoint
CREATE INDEX "raw_recharge_user" ON "raw_etl_recharge" USING btree ("vopenid");--> statement-breakpoint
CREATE INDEX "raw_recharge_ds" ON "raw_etl_recharge" USING btree ("ds");