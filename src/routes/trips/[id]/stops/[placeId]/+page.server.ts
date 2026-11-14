import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { getPoisNearPlace, isOpenTripMapEnabled } from '$lib/server/services/opentripmap';
import { getWeatherForPlace } from '$lib/server/services/weather';
import { getPinsForAnchor, resolveTripAnchor, XID_PATTERN } from '$lib/server/services/trip-anchor';
import { isPoiChip, type PoiChip } from '$lib/utils/poi';
import { error, fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

const NAME_MAX = 256;
const NOTE_MAX = 500;

export const load: PageServerLoad = async ({ params, url }) => {
	const resolved = await resolveTripAnchor(params.id, params.placeId);
	if (!resolved) {
		throw error(404, 'Stop not found on this trip');
	}
	const { trip, anchor } = resolved;

	const chipParam = url.searchParams.get('chip');
	const chip: PoiChip = isPoiChip(chipParam) ? chipParam : 'sights';

	// Weather for the anchor on the trip date, like the trip page. Null when unavailable.
	let weather = null;
	if (anchor.place.latitude !== null && anchor.place.longitude !== null) {
		try {
			weather = await getWeatherForPlace(
				anchor.place.id,
				anchor.place.latitude,
				anchor.place.longitude,
				trip.plannedDate
			);
		} catch {
			weather = null;
		}
	}

	// All pins in this trip, with the name of the place each was found near.
	const allPins = await db.query.tripPoiPin.findMany({
		where: (pin, { eq }) => eq(pin.roadTripId, trip.id),
		with: { anchorPlace: true }
	});
	const pinnedXids = allPins.map((p) => p.xid);
	const pinnedAnchors: Record<string, { anchorPlaceId: string; anchorName: string }> = {};
	for (const pin of allPins) {
		pinnedAnchors[pin.xid] = { anchorPlaceId: pin.anchorPlaceId, anchorName: pin.anchorPlace.name };
	}

	const pins = await getPinsForAnchor(trip.id, anchor.place.id);

	return {
		trip: { id: trip.id, title: trip.title },
		anchor,
		weather,
		pins,
		pinnedXids,
		pinnedAnchors,
		chip,
		enabled: isOpenTripMapEnabled(),
		// Intentionally not awaited: streamed to the client. Never rejects.
		pois: getPoisNearPlace(anchor.place, chip)
	};
};

async function requireAnchor(tripId: string, placeId: string) {
	const resolved = await resolveTripAnchor(tripId, placeId);
	return resolved?.anchor ?? null;
}

function readField(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === 'string' ? value : '';
}

export const actions: Actions = {
	pin: async ({ params, request }) => {
		const formData = await request.formData();
		const xid = readField(formData, 'xid').trim();
		const name = readField(formData, 'name').trim();
		const chipValue = readField(formData, 'chip');
		const lat = parseFloat(readField(formData, 'lat'));
		const lon = parseFloat(readField(formData, 'lon'));
		const distanceRaw = readField(formData, 'distanceMeters');

		if (!XID_PATTERN.test(xid)) return fail(400, { message: 'Invalid point of interest' });
		if (name.length < 1 || name.length > NAME_MAX) {
			return fail(400, { message: `Name must be 1-${NAME_MAX} characters` });
		}
		if (!isPoiChip(chipValue)) return fail(400, { message: 'Invalid category' });
		if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
			return fail(400, { message: 'Point of interest is missing coordinates' });
		}
		const distance = parseInt(distanceRaw, 10);
		const distanceMeters = Number.isFinite(distance) && distance >= 0 ? distance : null;

		const anchor = await requireAnchor(params.id, params.placeId);
		if (!anchor) return fail(404, { message: 'Stop not found on this trip' });

		const inserted = await db
			.insert(schema.tripPoiPin)
			.values({
				roadTripId: params.id,
				anchorPlaceId: anchor.place.id,
				xid,
				name,
				chip: chipValue,
				latitude: lat,
				longitude: lon,
				distanceMeters
			})
			.onConflictDoNothing({ target: [schema.tripPoiPin.roadTripId, schema.tripPoiPin.xid] })
			.returning({ id: schema.tripPoiPin.id });

		return { success: true, alreadyPinned: inserted.length === 0 };
	},

	unpin: async ({ params, request }) => {
		const formData = await request.formData();
		const xid = readField(formData, 'xid').trim();
		if (!XID_PATTERN.test(xid)) return fail(400, { message: 'Invalid point of interest' });

		await db
			.delete(schema.tripPoiPin)
			.where(and(eq(schema.tripPoiPin.roadTripId, params.id), eq(schema.tripPoiPin.xid, xid)));

		return { success: true };
	},

	updatePinNote: async ({ params, request }) => {
		const formData = await request.formData();
		const xid = readField(formData, 'xid').trim();
		const note = readField(formData, 'note').trim();

		if (!XID_PATTERN.test(xid)) return fail(400, { message: 'Invalid point of interest' });
		if (note.length > NOTE_MAX) {
			return fail(400, { message: `Note must be ${NOTE_MAX} characters or fewer` });
		}

		const updated = await db
			.update(schema.tripPoiPin)
			.set({ note: note || null })
			.where(and(eq(schema.tripPoiPin.roadTripId, params.id), eq(schema.tripPoiPin.xid, xid)))
			.returning({ id: schema.tripPoiPin.id });

		if (updated.length === 0) return fail(404, { message: 'Pin not found on this trip' });

		return { success: true };
	}
};
