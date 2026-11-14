import { json } from '@sveltejs/kit';
import { getPoiDetail } from '$lib/server/services/opentripmap';
import { resolveTripAnchor, XID_PATTERN } from '$lib/server/services/trip-anchor';
import type { RequestHandler } from './$types';

/** Full details for one POI, only when the place is an anchor of the trip. The API key never leaves the server. */
export const GET: RequestHandler = async ({ params }) => {
	if (!XID_PATTERN.test(params.xid)) {
		return json({ status: 'error' }, { status: 404 });
	}

	const resolved = await resolveTripAnchor(params.id, params.placeId);
	if (!resolved) {
		return json({ status: 'error' }, { status: 404 });
	}

	const detail = await getPoiDetail(params.xid);
	if (!detail) {
		return json({ status: 'error' }, { status: 404 });
	}

	return json(detail);
};
