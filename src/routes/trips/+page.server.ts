import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

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
