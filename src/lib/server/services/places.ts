import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';

/**
 * Finds a place by its display name (creating it if missing) and returns its ID.
 * Coordinates are back-filled on an existing place when it has none.
 */
export async function getPlaceId(
	name: string,
	displayName: string,
	lat?: number,
	lon?: number
): Promise<string> {
	const existing = await db.query.places.findFirst({
		where: (places, { eq }) => eq(places.displayName, displayName)
	});

	if (existing) {
		if (
			lat !== undefined &&
			lon !== undefined &&
			(existing.latitude === null || existing.longitude === null)
		) {
			await db
				.update(schema.places)
				.set({ latitude: lat, longitude: lon })
				.where(eq(schema.places.id, existing.id));
		}
		return existing.id;
	}

	const result = await db
		.insert(schema.places)
		.values({
			name,
			displayName,
			latitude: lat,
			longitude: lon
		})
		.returning({ id: schema.places.id });
	return result[0].id;
}
