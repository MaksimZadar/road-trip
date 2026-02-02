ALTER TABLE "road_trip" ADD COLUMN "departure_time" time;--> statement-breakpoint
ALTER TABLE "road_trip_stops" ADD COLUMN "duration_minutes" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "road_trip_stops" ADD COLUMN "is_layover" boolean DEFAULT false;