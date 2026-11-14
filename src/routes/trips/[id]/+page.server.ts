import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { getWeatherForTrip, deleteCachedWeatherForTrip } from '$lib/server/services/weather';
import { getPlaceId } from '$lib/server/services/places';
import { ensureRouteLegs } from '$lib/server/services/routing';
import { isWeatherForecastAvailable } from '$lib/utils/weather';
import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq, isNull, lte, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const ssr = false;
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

	// Check if weather refresh is available (trip date is within forecast window)
	const isWeatherRefreshAvailable = isWeatherForecastAvailable(trip.plannedDate);

	// Calculate trip stats
	let totalDistanceMeters = 0;
	let totalDurationSeconds = 0;
	let calculatedRouteCount = 0;

	for (const route of routes) {
		if (route && route.distanceMeters !== null && route.durationSeconds !== null) {
			totalDistanceMeters += route.distanceMeters;
			totalDurationSeconds += route.durationSeconds;
			calculatedRouteCount++;
		}
	}

	const tripStats = {
		totalDistanceMeters: calculatedRouteCount > 0 ? totalDistanceMeters : null,
		totalDurationSeconds: calculatedRouteCount > 0 ? totalDurationSeconds : null,
		totalStops: sequence.length
	};

	// Build timeline with automatic arrival time calculation for all stops
	interface TimelineEntry {
		arrivalTime: string | null;
		arrivalTimeRaw: string | null; // For form input (24h format)
		departureTime: string | null;
		departureTimeRaw: string | null; // For form input (24h format)
		durationMinutes: number;
		isLayover: boolean;
		isArrivalCalculated: boolean;
	}

	const timeline: TimelineEntry[] = [];
	let totalStopDurationMinutes = 0;
	let previousDepartureMinutes: number | null = null;

	// Start with origin departure time if available
	if (trip.departureTime) {
		const [hours, mins] = trip.departureTime.split(':').map(Number);
		previousDepartureMinutes = hours * 60 + mins;
	}

	for (let i = 0; i < trip.stops.length; i++) {
		const stop = trip.stops[i];
		const route = routes[i]; // Route from previous location to this stop
		let durationMinutes = 0;
		let arrivalTimeRaw: string | null = null;
		let arrivalTimeFormatted: string | null = null;
		let isArrivalCalculated = false;

		// Calculate arrival time automatically for ALL stops based on driving time
		if (previousDepartureMinutes !== null && route?.durationSeconds) {
			const arrivalMinutes = previousDepartureMinutes + Math.round(route.durationSeconds / 60);
			const hours = Math.floor(arrivalMinutes / 60) % 24;
			const mins = arrivalMinutes % 60;
			arrivalTimeRaw = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
			arrivalTimeFormatted = formatTime(arrivalTimeRaw);
			isArrivalCalculated = true;
		} else if (stop.arrivalTime) {
			// Fallback to stored arrival time if auto-calc not possible
			arrivalTimeRaw = stop.arrivalTime;
			arrivalTimeFormatted = formatTime(stop.arrivalTime);
		}

		// Calculate duration
		if (arrivalTimeRaw && stop.departureTime) {
			const [arrHours, arrMins] = arrivalTimeRaw.split(':').map(Number);
			const [depHours, depMins] = stop.departureTime.split(':').map(Number);

			const arrMinutes = arrHours * 60 + arrMins;
			let depMinutes = depHours * 60 + depMins;

			// Handle overnight
			if (depMinutes < arrMinutes) {
				depMinutes += 24 * 60;
			}

			durationMinutes = depMinutes - arrMinutes;
		}

		totalStopDurationMinutes += durationMinutes;

		// Update previous departure time for next stop calculation
		if (stop.departureTime) {
			const [depHours, depMins] = stop.departureTime.split(':').map(Number);
			previousDepartureMinutes = depHours * 60 + depMins;
		} else if (arrivalTimeRaw) {
			// If no departure time set, use arrival time as fallback
			const [arrHours, arrMins] = arrivalTimeRaw.split(':').map(Number);
			previousDepartureMinutes = arrHours * 60 + arrMins;
		}

		timeline.push({
			arrivalTime: arrivalTimeFormatted,
			arrivalTimeRaw,
			departureTime: stop.departureTime ? formatTime(stop.departureTime) : null,
			departureTimeRaw: stop.departureTime || null,
			durationMinutes,
			isLayover: stop.isLayover || false,
			isArrivalCalculated
		});
	}

	// Number of pinned points of interest per anchor place (origin, stops, destination).
	const pinCountRows = await db
		.select({
			placeId: schema.tripPoiPin.anchorPlaceId,
			count: sql<number>`count(*)::int`
		})
		.from(schema.tripPoiPin)
		.where(eq(schema.tripPoiPin.roadTripId, params.id))
		.groupBy(schema.tripPoiPin.anchorPlaceId);
	const pinCounts: Record<string, number> = {};
	for (const row of pinCountRows) {
		pinCounts[row.placeId] = row.count;
	}

	return {
		trip,
		routes,
		categories,
		hasMissingDistances,
		weatherData,
		isWeatherRefreshAvailable,
		tripStats,
		timeline,
		totalStopDurationMinutes,
		pinCounts
	};
};

function formatTime(timeInput: string | number): string {
	let hours: number;
	let mins: number;

	if (typeof timeInput === 'string') {
		// Parse time string like "14:30"
		[hours, mins] = timeInput.split(':').map(Number);
	} else {
		// Convert minutes from midnight
		hours = Math.floor(timeInput / 60) % 24;
		mins = timeInput % 60;
	}

	const period = hours >= 12 ? 'PM' : 'AM';
	const displayHours = hours % 12 || 12;
	return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

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

		await ensureRouteLegs([trip.origin, ...trip.stops.map((s) => s.place), trip.destination]);

		return { success: true };
	},
	refreshWeather: async ({ params }) => {
		const trip = await db.query.roadTrip.findFirst({
			where: (roadTrip, { eq }) => eq(roadTrip.id, params.id),
			with: {
				origin: true,
				destination: true,
				stops: {
					with: {
						place: true
					}
				}
			}
		});

		if (!trip) throw error(404, 'Trip not found');

		// Check if forecast is available for this date
		if (!isWeatherForecastAvailable(trip.plannedDate)) {
			return { success: false, error: 'Trip date is outside the forecast window' };
		}

		// Delete cached weather for all places
		const places = [trip.origin, ...trip.stops.map((s) => s.place), trip.destination];
		await deleteCachedWeatherForTrip(trip.plannedDate, places);

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
	updateChecklistItemCategory: async ({ params, request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const categoryId = formData.get('categoryId') as string;

		await db
			.update(schema.checklistItem)
			.set({ categoryId: categoryId || null })
			.where(and(eq(schema.checklistItem.id, id), eq(schema.checklistItem.roadTripId, params.id)));

		return { success: true };
	},
	toggleChecklistItem: async ({ params, request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const checked = formData.get('checked') === 'true';

		await db
			.update(schema.checklistItem)
			.set({ checked })
			.where(and(eq(schema.checklistItem.id, id), eq(schema.checklistItem.roadTripId, params.id)));

		return { success: true };
	},
	updateChecklistItemCount: async ({ params, request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const count = parseInt(formData.get('count') as string) || 1;

		await db
			.update(schema.checklistItem)
			.set({ count })
			.where(and(eq(schema.checklistItem.id, id), eq(schema.checklistItem.roadTripId, params.id)));

		return { success: true };
	},
	deleteChecklistItem: async ({ params, request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		await db
			.delete(schema.checklistItem)
			.where(and(eq(schema.checklistItem.id, id), eq(schema.checklistItem.roadTripId, params.id)));

		return { success: true };
	},
	updateDepartureTime: async ({ params, request }) => {
		const formData = await request.formData();
		const departureTime = formData.get('departureTime') as string;

		if (!departureTime) {
			await db
				.update(schema.roadTrip)
				.set({ departureTime: null })
				.where(eq(schema.roadTrip.id, params.id));
		} else {
			await db
				.update(schema.roadTrip)
				.set({ departureTime })
				.where(eq(schema.roadTrip.id, params.id));
		}

		return { success: true };
	},
	updateStopDuration: async ({ params, request }) => {
		const formData = await request.formData();
		const placeId = formData.get('placeId') as string;
		const arrivalTime = formData.get('arrivalTime') as string;
		const departureTime = formData.get('departureTime') as string;
		const isLayover = formData.get('isLayover') === 'true';

		// Calculate duration from arrival and departure times
		let durationMinutes = 0;
		if (arrivalTime && departureTime) {
			const [arrHours, arrMins] = arrivalTime.split(':').map(Number);
			const [depHours, depMins] = departureTime.split(':').map(Number);

			const arrMinutes = arrHours * 60 + arrMins;
			let depMinutes = depHours * 60 + depMins;

			// Handle overnight (departure is on next day)
			if (depMinutes < arrMinutes) {
				depMinutes += 24 * 60; // Add 24 hours
			}

			durationMinutes = depMinutes - arrMinutes;
		}

		await db
			.update(schema.roadTripStops)
			.set({
				arrivalTime: arrivalTime || null,
				departureTime: departureTime || null,
				durationMinutes,
				isLayover
			})
			.where(
				and(
					eq(schema.roadTripStops.placeId, placeId),
					eq(schema.roadTripStops.roadTripId, params.id)
				)
			);

		return { success: true };
	},
	checkInStop: async ({ params, request }) => {
		const formData = await request.formData();
		const placeId = formData.get('placeId') as string;
		if (!placeId) return { success: false };

		const target = await db.query.roadTripStops.findFirst({
			where: (stops, { and, eq }) =>
				and(eq(stops.roadTripId, params.id), eq(stops.placeId, placeId))
		});
		if (!target) return { success: false };

		// "We're here" at this stop means we already drove through every earlier one:
		// mark this stop and all before it as visited (only those not already visited).
		await db
			.update(schema.roadTripStops)
			.set({ visitedAt: new Date() })
			.where(
				and(
					eq(schema.roadTripStops.roadTripId, params.id),
					lte(schema.roadTripStops.order, target.order),
					isNull(schema.roadTripStops.visitedAt)
				)
			);

		return { success: true };
	},
	undoCheckIn: async ({ params, request }) => {
		const formData = await request.formData();
		const placeId = formData.get('placeId') as string;
		if (!placeId) return { success: false };

		await db
			.update(schema.roadTripStops)
			.set({ visitedAt: null })
			.where(
				and(
					eq(schema.roadTripStops.roadTripId, params.id),
					eq(schema.roadTripStops.placeId, placeId)
				)
			);

		return { success: true };
	},
	updateTrip: async ({ params, request }) => {
		const formData = await request.formData();
		const title = readField(formData, 'title').trim();
		const description = readField(formData, 'description').trim();
		const plannedDateStr = readField(formData, 'plannedDate').trim();

		if (!title) return fail(400, { message: 'Title is required' });
		if (title.length > 128) return fail(400, { message: 'Title must be 128 characters or fewer' });
		if (description.length > 500) {
			return fail(400, { message: 'Description must be 500 characters or fewer' });
		}
		if (!/^\d{4}-\d{2}-\d{2}$/.test(plannedDateStr) || isNaN(new Date(plannedDateStr).getTime())) {
			return fail(400, { message: 'A valid planned date is required' });
		}

		const updated = await db
			.update(schema.roadTrip)
			.set({
				title,
				description: description || null,
				plannedDate: new Date(plannedDateStr)
			})
			.where(eq(schema.roadTrip.id, params.id))
			.returning({ id: schema.roadTrip.id });

		if (updated.length === 0) return fail(404, { message: 'Trip not found' });

		return { success: true };
	},
	addStop: async ({ params, request }) => {
		const formData = await request.formData();
		const displayName = readField(formData, 'stopDisplayName').trim();
		const name = readField(formData, 'stopName').trim() || displayName.split(',')[0];
		const lat = parseFloat(readField(formData, 'stopLat'));
		const lon = parseFloat(readField(formData, 'stopLon'));

		if (!displayName) return fail(400, { message: 'Please select a place to add as a stop' });
		if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
			return fail(400, { message: 'Selected place is missing coordinates' });
		}

		const trip = await findTripWithStops(params.id);
		if (!trip) return fail(404, { message: 'Trip not found' });

		const placeId = await getPlaceId(name, displayName, lat, lon);

		// roadTripStops primary key is (roadTripId, placeId), so a place can appear only once.
		if (trip.stops.some((s) => s.placeId === placeId)) {
			return fail(400, { message: 'This place is already a stop on this trip' });
		}

		await db.insert(schema.roadTripStops).values({
			roadTripId: params.id,
			placeId,
			order: trip.stops.length
		});

		await normalizeStopOrder(params.id);
		await refreshRouteLegs(params.id);

		return { success: true };
	},
	removeStop: async ({ params, request }) => {
		const formData = await request.formData();
		const placeId = readField(formData, 'placeId');
		if (!placeId) return fail(400, { message: 'Missing stop' });

		const removed = await db
			.delete(schema.roadTripStops)
			.where(
				and(
					eq(schema.roadTripStops.roadTripId, params.id),
					eq(schema.roadTripStops.placeId, placeId)
				)
			)
			.returning({ placeId: schema.roadTripStops.placeId });

		if (removed.length === 0) return fail(404, { message: 'Stop not found on this trip' });

		// Pins found near this stop go with it, unless the place is also the trip's origin or destination.
		const tripEnds = await db.query.roadTrip.findFirst({
			where: (roadTrip, { eq }) => eq(roadTrip.id, params.id),
			columns: { originId: true, destinationId: true }
		});
		if (tripEnds && placeId !== tripEnds.originId && placeId !== tripEnds.destinationId) {
			await db
				.delete(schema.tripPoiPin)
				.where(
					and(
						eq(schema.tripPoiPin.roadTripId, params.id),
						eq(schema.tripPoiPin.anchorPlaceId, placeId)
					)
				);
		}

		await normalizeStopOrder(params.id);
		await refreshRouteLegs(params.id);

		return { success: true };
	},
	moveStop: async ({ params, request }) => {
		const formData = await request.formData();
		const placeId = readField(formData, 'placeId');
		const direction = readField(formData, 'direction');

		if (!placeId) return fail(400, { message: 'Missing stop' });
		if (direction !== 'up' && direction !== 'down') {
			return fail(400, { message: 'Direction must be "up" or "down"' });
		}

		const orderedIds = await normalizeStopOrder(params.id);
		const index = orderedIds.indexOf(placeId);
		if (index === -1) return fail(404, { message: 'Stop not found on this trip' });

		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= orderedIds.length) {
			return fail(400, {
				message: `Stop is already at the ${direction === 'up' ? 'top' : 'bottom'}`
			});
		}

		// Swap the two neighbouring stops, then write the contiguous order back.
		[orderedIds[index], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[index]];
		await writeStopOrder(params.id, orderedIds);
		await refreshRouteLegs(params.id);

		return { success: true };
	}
};

function readField(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === 'string' ? value : '';
}

async function findTripWithStops(tripId: string) {
	return db.query.roadTrip.findFirst({
		where: (roadTrip, { eq }) => eq(roadTrip.id, tripId),
		with: {
			origin: true,
			destination: true,
			stops: {
				with: { place: true },
				orderBy: (stops, { asc }) => [asc(stops.order)]
			}
		}
	});
}

/** Renumbers a trip's stops to contiguous 0..n-1 and returns their place IDs in order. */
async function normalizeStopOrder(tripId: string): Promise<string[]> {
	const stops = await db.query.roadTripStops.findMany({
		where: (stops, { eq }) => eq(stops.roadTripId, tripId),
		orderBy: (stops, { asc }) => [asc(stops.order)]
	});
	const orderedIds = stops.map((s) => s.placeId);
	await writeStopOrder(tripId, orderedIds);
	return orderedIds;
}

async function writeStopOrder(tripId: string, orderedPlaceIds: string[]): Promise<void> {
	for (let i = 0; i < orderedPlaceIds.length; i++) {
		await db
			.update(schema.roadTripStops)
			.set({ order: i })
			.where(
				and(
					eq(schema.roadTripStops.roadTripId, tripId),
					eq(schema.roadTripStops.placeId, orderedPlaceIds[i])
				)
			);
	}
}

/** Fetches any missing route legs (origin → stops → destination) for the trip. */
async function refreshRouteLegs(tripId: string): Promise<void> {
	const trip = await findTripWithStops(tripId);
	if (!trip) return;
	await ensureRouteLegs([trip.origin, ...trip.stops.map((s) => s.place), trip.destination]);
}
