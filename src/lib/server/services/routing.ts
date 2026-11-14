import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';

const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/json';

export type RouteCacheRow = typeof schema.routeCache.$inferSelect;

/** A point on a trip sequence (origin, stop or destination). Coordinates may be missing. */
export interface RoutePoint {
	id: string;
	latitude: number | null;
	longitude: number | null;
}

/**
 * Returns the cached driving route between two places, fetching it from OpenRouteService
 * (and caching it) when missing. Coordinates are [lat, lon]. Returns null when no route
 * could be obtained; errors are logged, not thrown.
 */
export async function getOrFetchRoute(
	fromId: string,
	toId: string,
	fromCoord: [number, number],
	toCoord: [number, number]
): Promise<RouteCacheRow | null> {
	const existing = await db.query.routeCache.findFirst({
		where: (rc, { and, eq }) => and(eq(rc.fromPlaceId, fromId), eq(rc.toPlaceId, toId))
	});
	if (existing) return existing;

	try {
		const response = await fetch(ORS_DIRECTIONS_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: env.OPENROUTE_API_KEY ?? ''
			},
			body: JSON.stringify({
				// ORS expects [lon, lat]
				coordinates: [
					[fromCoord[1], fromCoord[0]],
					[toCoord[1], toCoord[0]]
				]
			})
		});

		if (!response.ok) {
			console.error('OpenRouteService request failed:', response.status, response.statusText);
			return null;
		}

		const data = await response.json();
		if (!data.routes || data.routes.length === 0) return null;

		const route = data.routes[0];
		const [inserted] = await db
			.insert(schema.routeCache)
			.values({
				fromPlaceId: fromId,
				toPlaceId: toId,
				distanceMeters: Math.round(route.summary.distance),
				durationSeconds: Math.round(route.summary.duration),
				polyline: route.geometry
			})
			.returning();
		return inserted;
	} catch (e) {
		console.error('OpenRouteService error:', e);
		return null;
	}
}

/**
 * Ensures every consecutive leg of the sequence (origin → stops → destination) has a cached
 * route. Legs where either place lacks coordinates are skipped.
 */
export async function ensureRouteLegs(sequence: RoutePoint[]): Promise<void> {
	for (let i = 0; i < sequence.length - 1; i++) {
		const from = sequence[i];
		const to = sequence[i + 1];

		if (
			from.latitude === null ||
			from.longitude === null ||
			to.latitude === null ||
			to.longitude === null
		) {
			continue;
		}

		await getOrFetchRoute(
			from.id,
			to.id,
			[from.latitude, from.longitude],
			[to.latitude, to.longitude]
		);
	}
}
