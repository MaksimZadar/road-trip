import { relations } from 'drizzle-orm';
import {
	date,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';

export const roadTrip = pgTable('road_trip', {
	id: uuid('id').primaryKey().defaultRandom(),
	title: varchar('title', { length: 128 }).notNull(),
	description: varchar('description', { length: 500 }),
	plannedDate: date('planned_date', { mode: 'date' }).notNull(),
	originId: uuid('origin_id')
		.references(() => places.id)
		.notNull(),
	destinationId: uuid('destination_id')
		.references(() => places.id)
		.notNull()
});

export const roadTripRelations = relations(roadTrip, ({ one, many }) => ({
	origin: one(places, {
		fields: [roadTrip.originId],
		references: [places.id],
		relationName: 'origin'
	}),
	destination: one(places, {
		fields: [roadTrip.destinationId],
		references: [places.id],
		relationName: 'destination'
	}),
	stops: many(roadTripStops)
}));

export const places = pgTable('places', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 500 }).notNull(),
	displayName: text('display_name').notNull()
});

export const placesRelations = relations(places, ({ many }) => ({
	roadTripsAsOrigin: many(roadTrip, { relationName: 'origin' }),
	roadTripsAsDestination: many(roadTrip, { relationName: 'destination' }),
	stops: many(roadTripStops),
	routesFrom: many(routeCache, { relationName: 'routes_from' }),
	routesTo: many(routeCache, { relationName: 'routes_to' })
}));

export const roadTripStops = pgTable(
	'road_trip_stops',
	{
		roadTripId: uuid('road_trip_id')
			.notNull()
			.references(() => roadTrip.id, { onDelete: 'cascade' }),
		placeId: uuid('place_id')
			.notNull()
			.references(() => places.id, { onDelete: 'cascade' }),
		order: integer('order').notNull()
	},
	(t) => [primaryKey({ columns: [t.roadTripId, t.placeId] })]
);

export const roadTripStopsRelations = relations(roadTripStops, ({ one }) => ({
	roadTrip: one(roadTrip, {
		fields: [roadTripStops.roadTripId],
		references: [roadTrip.id]
	}),
	place: one(places, {
		fields: [roadTripStops.placeId],
		references: [places.id]
	})
}));

export const routeCache = pgTable(
	'route_cache',
	{
		fromPlaceId: uuid('from_place_id')
			.notNull()
			.references(() => places.id),
		toPlaceId: uuid('to_place_id')
			.notNull()
			.references(() => places.id),
		distanceMeters: integer('distance_meters').notNull(),
		durationSeconds: integer('duration_seconds').notNull(),
		polyline: text('polyline'),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(t) => [primaryKey({ columns: [t.fromPlaceId, t.toPlaceId] })]
);

export const routeCacheRelations = relations(routeCache, ({ one }) => ({
	fromPlace: one(places, {
		fields: [routeCache.fromPlaceId],
		references: [places.id],
		relationName: 'routes_from'
	}),
	toPlace: one(places, {
		fields: [routeCache.toPlaceId],
		references: [places.id],
		relationName: 'routes_to'
	})
}));
