CREATE TABLE "poi_detail_cache" (
	"xid" varchar(32) PRIMARY KEY NOT NULL,
	"data" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poi_search_cache" (
	"place_id" uuid NOT NULL,
	"chip" varchar(32) NOT NULL,
	"radius_meters" integer NOT NULL,
	"results" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "poi_search_cache_place_id_chip_pk" PRIMARY KEY("place_id","chip")
);
--> statement-breakpoint
CREATE TABLE "trip_poi_pin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"road_trip_id" uuid NOT NULL,
	"anchor_place_id" uuid NOT NULL,
	"xid" varchar(32) NOT NULL,
	"name" varchar(256) NOT NULL,
	"chip" varchar(32) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"distance_meters" integer,
	"note" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poi_search_cache" ADD CONSTRAINT "poi_search_cache_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_poi_pin" ADD CONSTRAINT "trip_poi_pin_road_trip_id_road_trip_id_fk" FOREIGN KEY ("road_trip_id") REFERENCES "public"."road_trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_poi_pin" ADD CONSTRAINT "trip_poi_pin_anchor_place_id_places_id_fk" FOREIGN KEY ("anchor_place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trip_poi_pin_trip_xid_uq" ON "trip_poi_pin" USING btree ("road_trip_id","xid");--> statement-breakpoint
CREATE INDEX "trip_poi_pin_trip_anchor_idx" ON "trip_poi_pin" USING btree ("road_trip_id","anchor_place_id");