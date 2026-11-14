import { env } from '$env/dynamic/private';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { PoiChip, PoiDetail, PoiResult, PoiSummary } from '$lib/utils/poi';

// Attribution is required by OpenTripMap (see README). Data is ODbL-licensed and may be cached.
const OTM_BASE_URL = 'https://api.opentripmap.com/0.1/en/places';
const REQUEST_TIMEOUT_MS = 6000;
const LIST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DETAIL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LIST_LIMIT = 100;
const MAX_ITEMS = 50;
const NAME_MAX = 256;
const DESCRIPTION_MAX = 600;
const XID_PATTERN = /^[A-Za-z0-9]{1,32}$/;

interface ChipQuery {
	/** Comma-separated OpenTripMap kinds (OR logic). */
	kinds: string;
	/** Minimum `rate` sent to the API (1 = all named, 2 = more notable, 3 = most notable). */
	minRate: number;
	radiusMeters: number;
}

// Kind names checked against the OpenTripMap catalog. Note the API's own spelling of "accomodations".
const CHIP_QUERIES: Record<PoiChip, ChipQuery> = {
	sights: { kinds: 'interesting_places', minRate: 2, radiusMeters: 15_000 },
	history: { kinds: 'historic,cultural,architecture', minRate: 2, radiusMeters: 15_000 },
	nature: { kinds: 'natural', minRate: 1, radiusMeters: 20_000 },
	fun: { kinds: 'amusements,sport', minRate: 1, radiusMeters: 15_000 },
	food: { kinds: 'foods', minRate: 1, radiusMeters: 5_000 },
	fuel: { kinds: 'fuel,charging_station', minRate: 1, radiusMeters: 10_000 },
	stay: { kinds: 'accomodations', minRate: 1, radiusMeters: 10_000 }
};

export interface PoiAnchor {
	id: string;
	latitude: number | null;
	longitude: number | null;
}

class OpenTripMapError extends Error {}

export function isOpenTripMapEnabled(): boolean {
	return Boolean(env.OPENTRIPMAP_API_KEY?.trim());
}

/** Serializes all OpenTripMap requests so concurrent callers never burst the rate limit. */
let requestQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
	const run = requestQueue.then(task);
	requestQueue = run.catch(() => undefined);
	return run;
}

/** GET a JSON endpoint. Never includes the URL in thrown messages (it carries the API key). */
async function otmGet(path: string, params: Record<string, string>): Promise<unknown> {
	const url = new URL(`${OTM_BASE_URL}${path}`);
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
	url.searchParams.set('apikey', env.OPENTRIPMAP_API_KEY ?? '');

	return enqueue(async () => {
		const res = await fetch(url, {
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			headers: { Accept: 'application/json' }
		});
		if (!res.ok) {
			throw new OpenTripMapError(`OpenTripMap responded with ${res.status}`);
		}
		return res.json();
	});
}

function describeFailure(err: unknown): string {
	if (err instanceof OpenTripMapError) return err.message;
	if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
		return 'OpenTripMap request timed out';
	}
	return 'OpenTripMap request failed';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed === '' ? undefined : trimmed;
}

function asHttpUrl(value: unknown): string | undefined {
	const text = asText(value);
	return text && /^https?:\/\//i.test(text) ? text : undefined;
}

function hasCoords(place: PoiAnchor): place is PoiAnchor & { latitude: number; longitude: number } {
	return (
		typeof place.latitude === 'number' &&
		typeof place.longitude === 'number' &&
		Number.isFinite(place.latitude) &&
		Number.isFinite(place.longitude)
	);
}

/** "2" -> 2, "2h" -> 2 (the h suffix marks cultural heritage and is not kept). */
function parseRate(value: unknown): number {
	const match = /^(\d)/.exec(String(value ?? ''));
	return match ? Number(match[1]) : 0;
}

function parseListItems(raw: unknown, chip: PoiChip): PoiSummary[] {
	if (!Array.isArray(raw)) throw new OpenTripMapError('Unexpected OpenTripMap list response');

	const byXid = new Map<string, PoiSummary>();
	for (const entry of raw) {
		if (!isRecord(entry)) continue;
		const xid = entry.xid;
		const name = asText(entry.name);
		const point = entry.point;
		if (typeof xid !== 'string' || !XID_PATTERN.test(xid)) continue;
		if (!name) continue;
		if (!isRecord(point) || typeof point.lat !== 'number' || typeof point.lon !== 'number')
			continue;
		if (typeof entry.dist !== 'number' || !Number.isFinite(entry.dist)) continue;
		if (byXid.has(xid)) continue;

		byXid.set(xid, {
			xid,
			name: name.slice(0, NAME_MAX),
			chip,
			distanceMeters: Math.round(entry.dist),
			rate: parseRate(entry.rate),
			lat: point.lat,
			lon: point.lon
		});
	}

	return [...byXid.values()]
		.sort((a, b) => b.rate - a.rate || a.distanceMeters - b.distanceMeters)
		.slice(0, MAX_ITEMS);
}

async function fetchPoiList(
	lat: number,
	lon: number,
	chip: PoiChip,
	query: ChipQuery
): Promise<PoiSummary[]> {
	const raw = await otmGet('/radius', {
		lat: String(lat),
		lon: String(lon),
		radius: String(query.radiusMeters),
		kinds: query.kinds,
		rate: String(query.minRate),
		limit: String(LIST_LIMIT),
		format: 'json'
	});
	return parseListItems(raw, chip);
}

async function readSearchCache(placeId: string, chip: PoiChip) {
	const rows = await db
		.select()
		.from(schema.poiSearchCache)
		.where(and(eq(schema.poiSearchCache.placeId, placeId), eq(schema.poiSearchCache.chip, chip)));
	return rows[0];
}

async function writeSearchCache(
	placeId: string,
	chip: PoiChip,
	radiusMeters: number,
	results: PoiSummary[],
	updatedAt: Date
): Promise<void> {
	try {
		await db
			.insert(schema.poiSearchCache)
			.values({ placeId, chip, radiusMeters, results, updatedAt })
			.onConflictDoUpdate({
				target: [schema.poiSearchCache.placeId, schema.poiSearchCache.chip],
				set: { radiusMeters, results, updatedAt }
			});
	} catch (err) {
		console.error('[opentripmap] failed to write search cache:', describeFailure(err));
	}
}

/**
 * Nearby "things to do" for a place and chip. Never throws.
 * Fresh cache is served without a request; on failure an expired cache entry is served as stale.
 */
export async function getPoisNearPlace(place: PoiAnchor, chip: PoiChip): Promise<PoiResult> {
	if (!isOpenTripMapEnabled()) return { status: 'disabled' };
	if (!hasCoords(place)) return { status: 'no-coords' };

	const query = CHIP_QUERIES[chip];

	try {
		const cached = await readSearchCache(place.id, chip);
		// A changed radius means the cached list was built with different parameters: ignore it.
		const usable = cached && cached.radiusMeters === query.radiusMeters ? cached : undefined;

		if (usable && Date.now() - usable.updatedAt.getTime() < LIST_TTL_MS) {
			return {
				status: 'ok',
				items: usable.results,
				stale: false,
				fetchedAt: usable.updatedAt.toISOString()
			};
		}

		try {
			const items = await fetchPoiList(place.latitude, place.longitude, chip, query);
			const fetchedAt = new Date();
			await writeSearchCache(place.id, chip, query.radiusMeters, items, fetchedAt);
			return { status: 'ok', items, stale: false, fetchedAt: fetchedAt.toISOString() };
		} catch (err) {
			const message = describeFailure(err);
			console.error('[opentripmap] list request failed:', message);
			if (usable) {
				return {
					status: 'ok',
					items: usable.results,
					stale: true,
					fetchedAt: usable.updatedAt.toISOString()
				};
			}
			return { status: 'error', message };
		}
	} catch (err) {
		console.error('[opentripmap] unexpected list failure:', describeFailure(err));
		return { status: 'error', message: 'Could not load things to do' };
	}
}

function truncateText(text: string | undefined): string | undefined {
	if (!text) return undefined;
	if (text.length <= DESCRIPTION_MAX) return text;
	const cut = text.slice(0, DESCRIPTION_MAX);
	const lastSpace = cut.lastIndexOf(' ');
	return `${(lastSpace > DESCRIPTION_MAX / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function formatAddress(value: unknown): string | undefined {
	if (!isRecord(value)) return undefined;
	const street = [asText(value.house_number), asText(value.road)].filter(Boolean).join(' ');
	const parts = [
		asText(value.house),
		street,
		asText(value.village) ?? asText(value.town) ?? asText(value.city),
		asText(value.postcode),
		asText(value.country)
	].filter((part): part is string => Boolean(part));
	const unique = [...new Set(parts)];
	return unique.length > 0 ? unique.join(', ') : undefined;
}

function parseDetail(raw: unknown, xid: string): PoiDetail | null {
	if (!isRecord(raw)) return null;
	const name = asText(raw.name);
	const point = raw.point;
	if (!name || !isRecord(point) || typeof point.lat !== 'number' || typeof point.lon !== 'number') {
		return null;
	}

	const extracts = isRecord(raw.wikipedia_extracts) ? raw.wikipedia_extracts : undefined;
	const preview = isRecord(raw.preview) ? raw.preview : undefined;

	return {
		xid,
		name: name.slice(0, NAME_MAX),
		address: formatAddress(raw.address),
		description: truncateText(asText(extracts?.text)),
		imageUrl: asHttpUrl(preview?.source),
		wikipediaUrl: asHttpUrl(raw.wikipedia),
		websiteUrl: asHttpUrl(raw.url),
		otmUrl: asHttpUrl(raw.otm),
		lat: point.lat,
		lon: point.lon,
		kinds:
			typeof raw.kinds === 'string'
				? raw.kinds
						.split(',')
						.map((k) => k.trim())
						.filter(Boolean)
				: []
	};
}

async function writeDetailCache(xid: string, data: PoiDetail): Promise<void> {
	try {
		const updatedAt = new Date();
		await db.insert(schema.poiDetailCache).values({ xid, data, updatedAt }).onConflictDoUpdate({
			target: schema.poiDetailCache.xid,
			set: { data, updatedAt }
		});
	} catch (err) {
		console.error('[opentripmap] failed to write detail cache:', describeFailure(err));
	}
}

/**
 * Full details for one POI (cached 30 days). Returns null when disabled, unknown or failed.
 * An expired cached copy is returned when a refresh fails. Never throws.
 */
export async function getPoiDetail(xid: string): Promise<PoiDetail | null> {
	if (!isOpenTripMapEnabled()) return null;
	if (!XID_PATTERN.test(xid)) return null;

	try {
		const rows = await db
			.select()
			.from(schema.poiDetailCache)
			.where(eq(schema.poiDetailCache.xid, xid));
		const row = rows[0];
		if (row?.data && Date.now() - row.updatedAt.getTime() < DETAIL_TTL_MS) {
			return row.data;
		}

		try {
			const detail = parseDetail(await otmGet(`/xid/${xid}`, {}), xid);
			if (!detail) throw new OpenTripMapError('Unexpected OpenTripMap detail response');
			await writeDetailCache(xid, detail);
			return detail;
		} catch (err) {
			console.error('[opentripmap] detail request failed:', describeFailure(err));
			return row?.data ?? null;
		}
	} catch (err) {
		console.error('[opentripmap] unexpected detail failure:', describeFailure(err));
		return null;
	}
}
