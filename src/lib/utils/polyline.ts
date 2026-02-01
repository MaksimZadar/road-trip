import polyline from '@mapbox/polyline';

/**
 * Decode an encoded polyline string to an array of [lat, lng] coordinates
 * OpenRoute API uses precision 5 encoding
 */
export function decodePolyline(encoded: string | null): [number, number][] {
	if (!encoded) return [];
	try {
		// OpenRoute uses precision 5 (Google Maps standard)
		return polyline.decode(encoded, 5) as [number, number][];
	} catch (e) {
		console.error('Failed to decode polyline:', e);
		return [];
	}
}
