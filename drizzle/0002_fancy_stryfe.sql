CREATE TABLE "weather_cache" (
	"place_id" uuid NOT NULL,
	"date" date NOT NULL,
	"temp_max" double precision,
	"temp_min" double precision,
	"weather_code" integer,
	"precipitation" double precision,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weather_cache_place_id_date_pk" PRIMARY KEY("place_id","date")
);
--> statement-breakpoint
ALTER TABLE "weather_cache" ADD CONSTRAINT "weather_cache_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;