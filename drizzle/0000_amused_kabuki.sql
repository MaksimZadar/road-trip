CREATE TABLE "check_list_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"road_trip_id" uuid,
	"item" varchar(256) NOT NULL,
	"count" integer DEFAULT 1,
	"checked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(500) NOT NULL,
	"display_name" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision
);
--> statement-breakpoint
CREATE TABLE "road_trip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(128) NOT NULL,
	"description" varchar(500),
	"planned_date" date NOT NULL,
	"origin_id" uuid NOT NULL,
	"destination_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "road_trip_stops" (
	"road_trip_id" uuid NOT NULL,
	"place_id" uuid NOT NULL,
	"order" integer NOT NULL,
	CONSTRAINT "road_trip_stops_road_trip_id_place_id_pk" PRIMARY KEY("road_trip_id","place_id")
);
--> statement-breakpoint
CREATE TABLE "route_cache" (
	"from_place_id" uuid NOT NULL,
	"to_place_id" uuid NOT NULL,
	"distance_meters" integer NOT NULL,
	"duration_seconds" integer NOT NULL,
	"polyline" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "route_cache_from_place_id_to_place_id_pk" PRIMARY KEY("from_place_id","to_place_id")
);
--> statement-breakpoint
ALTER TABLE "check_list_item" ADD CONSTRAINT "check_list_item_road_trip_id_road_trip_id_fk" FOREIGN KEY ("road_trip_id") REFERENCES "public"."road_trip"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "road_trip" ADD CONSTRAINT "road_trip_origin_id_places_id_fk" FOREIGN KEY ("origin_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "road_trip" ADD CONSTRAINT "road_trip_destination_id_places_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "road_trip_stops" ADD CONSTRAINT "road_trip_stops_road_trip_id_road_trip_id_fk" FOREIGN KEY ("road_trip_id") REFERENCES "public"."road_trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "road_trip_stops" ADD CONSTRAINT "road_trip_stops_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_cache" ADD CONSTRAINT "route_cache_from_place_id_places_id_fk" FOREIGN KEY ("from_place_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_cache" ADD CONSTRAINT "route_cache_to_place_id_places_id_fk" FOREIGN KEY ("to_place_id") REFERENCES "public"."places"("id") ON DELETE no action ON UPDATE no action;