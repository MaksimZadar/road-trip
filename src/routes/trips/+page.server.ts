import { db } from '$lib/server/db';
import { roadTrip, roadTripStops } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const showPast = url.searchParams.get('showPast') === 'true';
	const now = new Date();
	now.setHours(0, 0, 0, 0);

	const trips = await db.query.roadTrip.findMany({
		where: (roadTrip, { gte }) => (showPast ? undefined : gte(roadTrip.plannedDate, now)),
		orderBy: (roadTrip, { asc }) => [asc(roadTrip.plannedDate)],
		with: {
			origin: true,
			destination: true
		}
	});

	return {
		trips,
		showPast
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return { success: false };

		await db.delete(roadTripStops).where(eq(roadTripStops.roadTripId, id));
		await db.delete(roadTrip).where(eq(roadTrip.id, id));

		return { success: true };
	}
};
