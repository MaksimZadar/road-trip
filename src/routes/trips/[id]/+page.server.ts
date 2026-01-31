import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { getWeatherForTrip } from '$lib/server/services/weather';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
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
			},
			checklist: {
				with: {
					category: true
				},
				orderBy: (items, { asc }) => [asc(items.createdAt)]
			}
		}
	});

	const categories = await db.query.category.findMany();

	if (!trip) {
		throw error(404, 'Road trip not found');
	}

	// Build the stops sequence to check for distances
	const sequence = [trip.origin, ...trip.stops.map((s) => s.place), trip.destination];
	const routes = [];
	let hasMissingDistances = false;

	for (let i = 0; i < sequence.length - 1; i++) {
		const from = sequence[i];
		const to = sequence[i + 1];
		const route = await db.query.routeCache.findFirst({
			where: (rc, { and, eq }) => and(eq(rc.fromPlaceId, from.id), eq(rc.toPlaceId, to.id))
		});
		if (!route) {
			hasMissingDistances = true;
		}
		routes.push(route || null);
	}

	// Fetch weather data for all places on the trip date
	const places = [trip.origin, ...trip.stops.map((s) => s.place), trip.destination];
	const weatherMap = await getWeatherForTrip(trip.plannedDate, places);

	// Convert Map to a plain object for serialization
	const weatherData: Record<string, import('$lib/utils/weather').WeatherData> = {};
	weatherMap.forEach((weather, placeId) => {
		weatherData[placeId] = weather;
	});

	return {
		trip,
		routes,
		categories,
		hasMissingDistances,
		weatherData
	};
};

export const actions: Actions = {
	calculateDistances: async ({ params }) => {
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

		if (!trip) throw error(404, 'Trip not found');

		const sequence = [trip.origin, ...trip.stops.map((s) => s.place), trip.destination];

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

			const existing = await db.query.routeCache.findFirst({
				where: (rc, { and, eq }) => and(eq(rc.fromPlaceId, from.id), eq(rc.toPlaceId, to.id))
			});

			if (existing) {
				console.log('found existing route');
				continue;
			}

			console.log('no existing route cache found');

			try {
				const response = await fetch(
					'https://api.openrouteservice.org/v2/directions/driving-car/json',
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: env.OPENROUTE_API_KEY
						},
						body: JSON.stringify({
							coordinates: [
								[from.longitude, from.latitude],
								[to.longitude, to.latitude]
							]
						})
					}
				);
				const data = await response.json();
				console.log(data);

				if (data.routes && data.routes.length > 0) {
					const route = data.routes[0];
					await db.insert(schema.routeCache).values({
						fromPlaceId: from.id,
						toPlaceId: to.id,
						distanceMeters: Math.round(route.summary.distance),
						durationSeconds: Math.round(route.summary.duration),
						polyline: route.geometry
					});
				}
			} catch (e) {
				console.error('OpenRouteService error:', e);
			}
		}

		return { success: true };
	},
	delete: async ({ params }) => {
		const id = params.id;

		await db.delete(schema.roadTripStops).where(eq(schema.roadTripStops.roadTripId, id));
		await db.delete(schema.roadTrip).where(eq(schema.roadTrip.id, id));

		throw redirect(303, '/trips');
	},
	addChecklistItem: async ({ params, request }) => {
		const tripId = params.id;
		const formData = await request.formData();
		const item = formData.get('item') as string;
		const count = parseInt(formData.get('count') as string) || 1;
		const categoryId = formData.get('categoryId') as string;
		const newCategory = formData.get('newCategory') as string;

		if (!item) return { success: false };

		let finalCategoryId = categoryId || null;

		if (newCategory) {
			const [category] = await db
				.insert(schema.category)
				.values({
					name: newCategory
				})
				.onConflictDoUpdate({
					target: schema.category.name,
					set: { name: newCategory }
				})
				.returning();
			finalCategoryId = category.id;
		}

		await db.insert(schema.checklistItem).values({
			roadTripId: tripId,
			item,
			count,
			categoryId: finalCategoryId,
			checked: false
		});

		return { success: true };
	},
	updateChecklistItemCategory: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const categoryId = formData.get('categoryId') as string;

		await db
			.update(schema.checklistItem)
			.set({ categoryId: categoryId || null })
			.where(eq(schema.checklistItem.id, id));

		return { success: true };
	},
	toggleChecklistItem: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const checked = formData.get('checked') === 'true';

		await db.update(schema.checklistItem).set({ checked }).where(eq(schema.checklistItem.id, id));

		return { success: true };
	},
	updateChecklistItemCount: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const count = parseInt(formData.get('count') as string) || 1;

		await db.update(schema.checklistItem).set({ count }).where(eq(schema.checklistItem.id, id));

		return { success: true };
	},
	deleteChecklistItem: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		await db.delete(schema.checklistItem).where(eq(schema.checklistItem.id, id));

		return { success: true };
	}
};
