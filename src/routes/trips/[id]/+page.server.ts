import { db } from '$lib/server/db';
import { roadTrip, roadTripStops } from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

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

export const actions: Actions = {
	delete: async ({ params }) => {
		const id = params.id;

		await db.delete(roadTripStops).where(eq(roadTripStops.roadTripId, id));
		await db.delete(roadTrip).where(eq(roadTrip.id, id));

		throw redirect(303, '/trips');
	}
};
