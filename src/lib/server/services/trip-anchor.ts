import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const XID_PATTERN = /^[A-Za-z0-9]{1,32}$/;

export type AnchorKind = 'origin' | 'stop' | 'destination';

export interface TripAnchor {
	place: typeof schema.places.$inferSelect;
	kind: AnchorKind;
	/** Stop order (only for kind 'stop'). */
	order?: number;
}

/**
 * Resolves a place id to an anchor of the trip: a stop, else the destination, else the origin.
 * Returns null when the trip does not exist or the place is not part of it.
 */
export async function resolveTripAnchor(
	tripId: string,
	placeId: string
): Promise<{ trip: typeof schema.roadTrip.$inferSelect; anchor: TripAnchor } | null> {
	if (!UUID_PATTERN.test(tripId) || !UUID_PATTERN.test(placeId)) return null;

	const trip = await db.query.roadTrip.findFirst({
		where: (roadTrip, { eq }) => eq(roadTrip.id, tripId),
		with: {
			origin: true,
			destination: true,
			stops: {
				with: { place: true }
			}
		}
	});
	if (!trip) return null;

	const stop = trip.stops.find((s) => s.placeId === placeId);
	if (stop) {
		return { trip, anchor: { place: stop.place, kind: 'stop', order: stop.order } };
	}
	if (trip.destinationId === placeId) {
		return { trip, anchor: { place: trip.destination, kind: 'destination' } };
	}
	if (trip.originId === placeId) {
		return { trip, anchor: { place: trip.origin, kind: 'origin' } };
	}
	return null;
}

/** Pins of one trip anchored at a place. */
export async function getPinsForAnchor(tripId: string, anchorPlaceId: string) {
	return db
		.select()
		.from(schema.tripPoiPin)
		.where(
			and(
				eq(schema.tripPoiPin.roadTripId, tripId),
				eq(schema.tripPoiPin.anchorPlaceId, anchorPlaceId)
			)
		);
}
