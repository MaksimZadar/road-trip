import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	if (!query) {
		return json([]);
	}

	try {
		const response = await fetch(
			`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`
		);

		if (!response.ok) {
			throw new Error('Failed to fetch from Photon');
		}

		const data = await response.json();

		// Map Photon GeoJSON to a simpler format for the frontend
		const results = data.features.map((feature: any) => {
			const p = feature.properties;

			// Build a descriptive display name while avoiding duplicates
			const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);

			// Simple deduplication of adjacent identical parts
			const uniqueParts: string[] = [];
			for (const part of parts) {
				if (uniqueParts.length === 0 || uniqueParts[uniqueParts.length - 1] !== part) {
					uniqueParts.push(part);
				}
			}

			return {
				name: p.name || uniqueParts[0],
				display_name: uniqueParts.join(', '),
				place_id: `${p.osm_type}-${p.osm_id}`,
				lat: feature.geometry.coordinates[1],
				lon: feature.geometry.coordinates[0]
			};
		});

		return json(results);
	} catch (error) {
		console.error('Search error:', error);
		return json({ error: 'Failed to fetch places' }, { status: 500 });
	}
};
