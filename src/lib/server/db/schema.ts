import { relations } from 'drizzle-orm';
import {
	date,
	integer,
	pgTable,
	primaryKey,
	doublePrecision,
	text,
	time,
	timestamp,
	uuid,
	varchar,
	boolean
} from 'drizzle-orm/pg-core';

export const roadTrip = pgTable('road_trip', {
	id: uuid('id').primaryKey().defaultRandom(),
	title: varchar('title', { length: 128 }).notNull(),
	description: varchar('description', { length: 500 }),
	plannedDate: date('planned_date', { mode: 'date' }).notNull(),
	departureTime: time('departure_time', { withTimezone: false }),
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
	stops: many(roadTripStops),
	checklist: many(checklistItem)
}));

export const category = pgTable('category', {
	id: uuid().primaryKey().defaultRandom(),
	name: varchar({ length: 128 }).notNull().unique(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const categoryRelations = relations(category, ({ many }) => ({
	items: many(checklistItem)
}));

export const places = pgTable('places', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 500 }).notNull(),
	displayName: text('display_name').notNull(),
	latitude: doublePrecision('latitude'),
	longitude: doublePrecision('longitude')
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
		order: integer('order').notNull(),
		durationMinutes: integer('duration_minutes').default(0),
		isLayover: boolean('is_layover').default(false),
		arrivalTime: time('arrival_time', { withTimezone: false }),
		departureTime: time('departure_time', { withTimezone: false })
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

export const checklistItem = pgTable('check_list_item', {
	id: uuid().primaryKey().defaultRandom(),
	roadTripId: uuid('road_trip_id').references(() => roadTrip.id),
	categoryId: uuid('category_id').references(() => category.id),
	item: varchar({ length: 256 }).notNull(),
	count: integer().default(1),
	checked: boolean().default(false),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const checklistItemRelations = relations(checklistItem, ({ one }) => ({
	roadTrip: one(roadTrip, {
		fields: [checklistItem.roadTripId],
		references: [roadTrip.id],
		relationName: 'road_trip'
	}),
	category: one(category, {
		fields: [checklistItem.categoryId],
		references: [category.id]
	})
}));

export const weatherCache = pgTable(
	'weather_cache',
	{
		placeId: uuid('place_id')
			.notNull()
			.references(() => places.id),
		date: date('date', { mode: 'date' }).notNull(),
		tempMax: doublePrecision('temp_max'),
		tempMin: doublePrecision('temp_min'),
		weatherCode: integer('weather_code'),
		precipitation: doublePrecision('precipitation'),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(t) => [primaryKey({ columns: [t.placeId, t.date] })]
);

export const weatherCacheRelations = relations(weatherCache, ({ one }) => ({
	place: one(places, {
		fields: [weatherCache.placeId],
		references: [places.id]
	})
}));
