import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { getWeatherForTrip, deleteCachedWeatherForTrip } from '$lib/server/services/weather';
import { isWeatherForecastAvailable } from '$lib/utils/weather';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
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

			let arrMinutes = arrHours * 60 + arrMins;
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

	return {
		trip,
		routes,
		categories,
		hasMissingDistances,
		weatherData,
		isWeatherRefreshAvailable,
		tripStats,
		timeline,
		totalStopDurationMinutes
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
	updateStopDuration: async ({ request }) => {
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

			let arrMinutes = arrHours * 60 + arrMins;
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
			.where(eq(schema.roadTripStops.placeId, placeId));

		return { success: true };
	}
};
