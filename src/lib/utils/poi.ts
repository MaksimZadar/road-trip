/** Client-safe POI ("things to do") types and chip config. No server imports here. */

export type PoiChip = 'sights' | 'history' | 'nature' | 'fun' | 'food' | 'fuel' | 'stay';

/** A row in a nearby-POI list. */
export interface PoiSummary {
	xid: string;
	name: string;
	chip: PoiChip;
	distanceMeters: number;
	/** Numeric popularity rate (OpenTripMap sends strings like "2" or "2h"; the leading digit is kept). */
	rate: number;
	lat: number;
	lon: number;
}

/** Full details for a single POI. */
export interface PoiDetail {
	xid: string;
	name: string;
	address?: string;
	description?: string;
	imageUrl?: string;
	wikipediaUrl?: string;
	websiteUrl?: string;
	otmUrl?: string;
	lat: number;
	lon: number;
	kinds: string[];
}

export type PoiResult =
	| { status: 'ok'; items: PoiSummary[]; stale: boolean; fetchedAt: string }
	| { status: 'disabled' }
	| { status: 'no-coords' }
	| { status: 'error'; message: string };

export interface PoiChipConfig {
	id: PoiChip;
	label: string;
	/** Lucide icon component name. */
	icon: string;
}

export const POI_CHIPS: PoiChipConfig[] = [
	{ id: 'sights', label: 'Sights', icon: 'Landmark' },
	{ id: 'history', label: 'History', icon: 'Castle' },
	{ id: 'nature', label: 'Nature', icon: 'Trees' },
	{ id: 'fun', label: 'Fun', icon: 'PartyPopper' },
	{ id: 'food', label: 'Food', icon: 'UtensilsCrossed' },
	{ id: 'fuel', label: 'Fuel & charging', icon: 'Fuel' },
	{ id: 'stay', label: 'Stay', icon: 'BedDouble' }
];

const POI_CHIP_IDS: readonly string[] = POI_CHIPS.map((c) => c.id);

export function isPoiChip(value: unknown): value is PoiChip {
	return typeof value === 'string' && POI_CHIP_IDS.includes(value);
}
