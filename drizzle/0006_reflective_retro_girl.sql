ALTER TABLE "check_list_item" DROP CONSTRAINT "check_list_item_road_trip_id_road_trip_id_fk";
--> statement-breakpoint
ALTER TABLE "check_list_item" ADD CONSTRAINT "check_list_item_road_trip_id_road_trip_id_fk" FOREIGN KEY ("road_trip_id") REFERENCES "public"."road_trip"("id") ON DELETE cascade ON UPDATE no action;