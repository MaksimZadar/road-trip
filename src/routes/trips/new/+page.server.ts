import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { getPlaceId } from '$lib/server/services/places';
import { getOrFetchRoute } from '$lib/server/services/routing';
import { fail, redirect, type Redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const plannedDateStr = formData.get('plannedDate') as string;

		const originName = formData.get('originName') as string;
		const originDisplayName = formData.get('originDisplayName') as string;
		const originLat = parseFloat(formData.get('originLat') as string);
		const originLon = parseFloat(formData.get('originLon') as string);

		const destinationName = formData.get('destinationName') as string;
		const destinationDisplayName = formData.get('destinationDisplayName') as string;
		const destinationLat = parseFloat(formData.get('destinationLat') as string);
		const destinationLon = parseFloat(formData.get('destinationLon') as string);

		const stopNames = formData.getAll('stopName') as string[];
		const stopDisplayNames = formData.getAll('stopDisplayName') as string[];
		const stopLats = formData.getAll('stopLat').map((l) => parseFloat(l as string));
		const stopLons = formData.getAll('stopLon').map((l) => parseFloat(l as string));

		if (!title || !plannedDateStr || !originDisplayName || !destinationDisplayName) {
			return fail(400, { message: 'Missing required fields' });
		}

		try {
			const originId = await getPlaceId(originName, originDisplayName, originLat, originLon);
			const destinationId = await getPlaceId(
				destinationName,
				destinationDisplayName,
				destinationLat,
				destinationLon
			);

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

			const stopsData: { id: string; lat: number; lon: number }[] = [];
			stopsData.push({ id: originId, lat: originLat, lon: originLon });

			// Insert stops
			if (stopNames.length > 0) {
				for (let i = 0; i < stopNames.length; i++) {
					const placeId = await getPlaceId(
						stopNames[i],
						stopDisplayNames[i],
						stopLats[i],
						stopLons[i]
					);
					await db.insert(schema.roadTripStops).values({
						roadTripId: newTrip.id,
						placeId,
						order: i
					});
					stopsData.push({ id: placeId, lat: stopLats[i], lon: stopLons[i] });
				}
			}

			stopsData.push({ id: destinationId, lat: destinationLat, lon: destinationLon });

			// Calculate distances between each pair
			for (let i = 0; i < stopsData.length - 1; i++) {
				const from = stopsData[i];
				const to = stopsData[i + 1];
				await getOrFetchRoute(from.id, to.id, [from.lat, from.lon], [to.lat, to.lon]);
			}

			return redirect(303, `/trips/${newTrip.id}`);
		} catch (error) {
			if (isRedirect(error)) {
				throw error;
			}
			console.error('Error creating trip:', error);
			return fail(500, { message: 'Internal server error' });
		}
	}
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isRedirect(error: any): error is Redirect {
	return 'status' in error && 'location' in error;
}
