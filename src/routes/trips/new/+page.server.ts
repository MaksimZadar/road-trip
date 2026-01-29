import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const plannedDateStr = formData.get('plannedDate') as string;

		const originName = formData.get('originName') as string;
		const originDisplayName = formData.get('originDisplayName') as string;

		const destinationName = formData.get('destinationName') as string;
		const destinationDisplayName = formData.get('destinationDisplayName') as string;

		const stopNames = formData.getAll('stopName') as string[];
		const stopDisplayNames = formData.getAll('stopDisplayName') as string[];

		if (!title || !plannedDateStr || !originDisplayName || !destinationDisplayName) {
			return fail(400, { message: 'Missing required fields' });
		}

		try {
			// Helper function to upsert a place and return its ID
			async function getPlaceId(name: string, displayName: string) {
				const existing = await db.query.places.findFirst({
					where: (places, { eq }) => eq(places.displayName, displayName)
				});
				if (existing) return existing.id;

				const result = await db
					.insert(schema.places)
					.values({
						name,
						displayName
					})
					.returning({ id: schema.places.id });
				return result[0].id;
			}

			const originId = await getPlaceId(originName, originDisplayName);
			const destinationId = await getPlaceId(destinationName, destinationDisplayName);

			const [newTrip] = await db
				.insert(schema.roadTrip)
				.values({
					title,
					description,
					plannedDate: new Date(plannedDateStr),
					originId,
					destinationId
				})
				.returning({ id: schema.roadTrip.id });

			// Insert stops
			if (stopNames.length > 0) {
				for (let i = 0; i < stopNames.length; i++) {
					const placeId = await getPlaceId(stopNames[i], stopDisplayNames[i]);
					await db.insert(schema.roadTripStops).values({
						roadTripId: newTrip.id,
						placeId,
						order: i
					});
				}
			}

			return redirect(303, `/trips/${newTrip.id}`);
		} catch (error) {
			console.error('Error creating trip:', error);
			return fail(500, { message: 'Internal server error' });
		}
	}
};
