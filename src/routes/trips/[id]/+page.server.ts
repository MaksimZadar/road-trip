import { db } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const trip = await db.query.roadTrip.findFirst({
		where: (roadTrip, { eq }) => eq(roadTrip.id, params.id),
		with: {
			origin: true,
			destination: true,
			stops: {
				with: {
					place: true
				},
				orderBy: (stops, { asc }) => [asc(stops.order)]
			}
		}
	});

	if (!trip) {
		throw error(404, 'Road trip not found');
	}

	return {
		trip
	};
};
