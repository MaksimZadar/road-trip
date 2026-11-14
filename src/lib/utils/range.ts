/**
 * Client-safe range planner: flags legs of a trip where the vehicle would run past
 * its safe range without a refuel/charge pin at the leg's origin.
 * No server imports here.
 */

export type FuelType = 'fuel' | 'ev';

/** One route leg (consecutive pair of trip places), in trip order. */
export interface RangeLeg {
	fromPlaceId: string;
	toPlaceId: string;
	fromName: string;
	toName: string;
	distanceMeters: number;
	/** True when a fuel/charging pin is anchored at this leg's origin. */
	hasFuelPinAtFrom: boolean;
}

export interface RangeOptions {
	/** Full-tank / full-charge range in km. */
	rangeKm: number;
	fuelType: FuelType;
}

export interface RangeWarning {
	legIndex: number;
	fromPlaceId: string;
	toPlaceId: string;
	fromName: string;
	toName: string;
	/** Length of this leg in km (one decimal). */
	legKm: number;
	/** Distance driven since last refuel, including this leg, in km (one decimal). */
	sinceRefuelKm: number;
	rangeKm: number;
	/** Map chip to show for suggested stop; EV charging lives under the 'fuel' chip. */
	suggestedChip: 'fuel';
	/** Place to add a fuel/charge pin at. */
	suggestAnchorPlaceId: string;
}

/** Fraction of range we allow before planning a refuel. */
export const RANGE_SAFETY_FACTOR = 0.85;

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Walks legs in order, tracking km since the last refuel.
 * - A leg whose origin has a fuel pin resets the counter before the leg is driven.
 * - A leg is flagged when the running total after it exceeds the safe range, or when
 *   the leg alone exceeds it (no earlier stop can fix that; the origin is still suggested).
 * - Suggested anchor is always the leg's origin: refuelling there is the latest point that
 *   keeps the flagged leg's start full. The flagged leg then restarts the counter.
 *
 * Legs with unknown distance should be passed with distanceMeters 0 (they add nothing).
 */
export function computeRangeWarnings(legs: RangeLeg[], opts: RangeOptions): RangeWarning[] {
	const limitKm = opts.rangeKm * RANGE_SAFETY_FACTOR;
	const warnings: RangeWarning[] = [];
	let sinceRefuelKm = 0;

	legs.forEach((leg, legIndex) => {
		if (leg.hasFuelPinAtFrom) sinceRefuelKm = 0;

		const legKm = leg.distanceMeters / 1000;
		const afterKm = sinceRefuelKm + legKm;
		const flagged = afterKm > limitKm || legKm > limitKm;

		if (flagged) {
			warnings.push({
				legIndex,
				fromPlaceId: leg.fromPlaceId,
				toPlaceId: leg.toPlaceId,
				fromName: leg.fromName,
				toName: leg.toName,
				legKm: round1(legKm),
				sinceRefuelKm: round1(afterKm),
				rangeKm: opts.rangeKm,
				suggestedChip: 'fuel',
				suggestAnchorPlaceId: leg.fromPlaceId
			});
			// Assume the driver refuels at the suggested anchor before this leg.
			sinceRefuelKm = legKm;
		} else {
			sinceRefuelKm = afterKm;
		}
	});

	return warnings;
}
