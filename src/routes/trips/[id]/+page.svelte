<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import { ChevronLeft, Trash2, Route, Plus, Check, CloudSun, Pencil, Trash } from '@lucide/svelte';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Backpack from '@lucide/svelte/icons/backpack';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import MapIcon from '@lucide/svelte/icons/map';
	import MapPinCheckInside from '@lucide/svelte/icons/map-pin-check-inside';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Navigation from '@lucide/svelte/icons/navigation';
	import Landmark from '@lucide/svelte/icons/landmark';
	import StatBlock from '$lib/components/trip/StatBlock.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import PlaceSearch from '$lib/components/PlaceSearch.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { DateFormatter } from '@internationalized/date';
	import { SvelteMap } from 'svelte/reactivity';
	import WeatherCard from '$lib/components/WeatherCard.svelte';
	import TripMap from '$lib/components/TripMap.svelte';
	import ModeToggle from '$lib/components/ModeToggle.svelte';
	import NextStopHero from '$lib/components/trip/NextStopHero.svelte';
	import TimelineStop from '$lib/components/trip/TimelineStop.svelte';

	let { data, form } = $props();

	let editTripOpen = $state(false);
	let editingItinerary = $state(false);
	let confirmRemoveId = $state<string | null>(null);
	let newStop = $state<{ name: string; display: string; lat: number; lon: number } | null>(null);
	let stopSearchValue = $state('');

	const plannedDateValue = $derived.by(() => {
		const d = new Date(data.trip.plannedDate);
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${mm}-${dd}`;
	});

	let activeTab = $state('itinerary');
	let showNewCategoryInput = $state(false);
	let selectedCategoryId = $state('');
	let editingOriginTime = $state(false);
	let editingStopId = $state<string | null>(null);
	let editingArrivalTime = $state('');
	let editingDepartureTime = $state('');

	const nowMs = Date.now();

	function calculateDurationFromTimes(arrival: string, departure: string): number {
		if (!arrival || !departure) return 0;
		const [arrHours, arrMins] = arrival.split(':').map(Number);
		const [depHours, depMins] = departure.split(':').map(Number);

		let arrMinutes = arrHours * 60 + arrMins;
		let depMinutes = depHours * 60 + depMins;

		// Handle overnight
		if (depMinutes < arrMinutes) {
			depMinutes += 24 * 60;
		}

		return depMinutes - arrMinutes;
	}

	function formatDurationMinutes(minutes: number | null) {
		if (minutes === null || minutes === 0) return '';
		if (minutes < 60) return `${minutes} min`;
		const hours = Math.floor(minutes / 60);
		const remainingMins = minutes % 60;
		return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
	}

	function formatTime(timeString: string | null) {
		if (!timeString) return null;
		const [hours, minutes] = timeString.split(':').map(Number);
		const period = hours >= 12 ? 'PM' : 'AM';
		const displayHours = hours % 12 || 12;
		return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
	}

	function parseTimeOfDayMinutes(value: string | null | undefined): number | null {
		if (!value) return null;
		const [hours, minutes] = value.split(':').map(Number);
		if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
		return hours * 60 + minutes;
	}

	function minutesFromFormattedTime(value: string): number {
		const [hours, minutes] = value.replace(' AM', '').replace(' PM', '').split(':').map(Number);
		const isPM = value.includes('PM');
		return (isPM && hours !== 12 ? hours + 12 : hours === 12 && !isPM ? 0 : hours) * 60 + minutes;
	}

	function getDirectionsUrl(from: string, to: string) {
		return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`;
	}

	function formatDistance(meters: number | null) {
		if (meters === null) return '';
		const km = meters / 1000;
		return `${km.toFixed(1)} km`;
	}

	function formatDuration(seconds: number | null) {
		if (seconds === null) return '';
		const mins = Math.round(seconds / 60);
		if (mins < 60) return `${mins} min`;
		const hours = Math.floor(mins / 60);
		const remainingMins = mins % 60;
		return `${hours}h ${remainingMins}m`;
	}

	const itemsByCategory = $derived.by(() => {
		const items = data.trip.checklist;
		const categories = data.categories;

		const grouped = new SvelteMap<string | null, typeof items>();

		items.forEach((item) => {
			const catId = item.categoryId || null;
			if (!grouped.has(catId)) {
				grouped.set(catId, []);
			}
			grouped.get(catId)!.push(item);
		});

		const result: { id: string; name: string; items: typeof items; allChecked: boolean }[] = [];

		// First, add categorized items in order of categories
		categories.forEach((cat) => {
			const catItems = grouped.get(cat.id);
			if (catItems && catItems.length > 0) {
				result.push({
					id: cat.id,
					name: cat.name,
					items: catItems,
					allChecked: catItems.every((item) => item.checked)
				});
			}
		});

		// Then, add uncategorized items
		const uncategorizedItems = grouped.get(null);
		if (uncategorizedItems && uncategorizedItems.length > 0) {
			result.push({
				id: 'none',
				name: 'Uncategorized',
				items: uncategorizedItems,
				allChecked: uncategorizedItems.every((item) => item.checked)
			});
		}

		return result;
	});

	const df = new DateFormatter('en-US', {
		dateStyle: 'full'
	});

	const pillDateFormatter = new DateFormatter('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});

	const tripStart = $derived.by(() => {
		const planned = new Date(data.trip.plannedDate);
		return new Date(planned.getFullYear(), planned.getMonth(), planned.getDate());
	});

	const tripIsPast = $derived(tripStart.getTime() + 24 * 60 * 60 * 1000 < nowMs);

	function arrivalDateTimeFor(index: number): Date | null {
		const timelineEntry = data.timeline?.[index];
		const minutes =
			parseTimeOfDayMinutes(timelineEntry?.arrivalTimeRaw ?? null) ??
			parseTimeOfDayMinutes(data.trip.stops[index]?.arrivalTime ?? null);
		if (minutes === null) return null;
		return new Date(tripStart.getFullYear(), tripStart.getMonth(), tripStart.getDate(), 0, minutes);
	}

	const stopStatuses: ('done' | 'next' | 'upcoming')[] = $derived.by(() => {
		const stops = data.trip.stops;
		if (tripIsPast) {
			return stops.map(() => 'done' as const);
		}
		let nextAssigned = false;
		return stops.map((stop, i) => {
			// Manually checked in ("We're here"), or the calculated arrival already passed
			const arrival = arrivalDateTimeFor(i);
			if (stop.visitedAt != null || (arrival !== null && arrival.getTime() < nowMs)) {
				return 'done' as const;
			}
			if (!nextAssigned) {
				nextAssigned = true;
				return 'next' as const;
			}
			return 'upcoming' as const;
		});
	});

	const heroStopIndex = $derived(
		Math.max(
			stopStatuses.findIndex((status) => status !== 'done'),
			0
		)
	);
	const heroStop = $derived(data.trip.stops[heroStopIndex] ?? null);
	const heroPrevPlace = $derived(
		heroStopIndex === 0
			? data.trip.origin.displayName
			: (data.trip.stops[heroStopIndex - 1]?.place.displayName ?? null)
	);
	const heroLeg = $derived(data.routes[heroStopIndex] ?? null);

	const originDepartureMs = $derived.by(() => {
		const minutes = parseTimeOfDayMinutes(data.trip.departureTime);
		if (minutes === null) return null;
		return tripStart.getTime() + minutes * 60 * 1000;
	});

	const originStatus: 'done' | 'upcoming' = $derived(
		tripIsPast || (originDepartureMs !== null && originDepartureMs < nowMs) ? 'done' : 'upcoming'
	);

	const finalPrevPlace = $derived(
		data.trip.stops.length > 0
			? data.trip.stops[data.trip.stops.length - 1].place.displayName
			: data.trip.origin.displayName
	);

	const finalArrivalTime = $derived.by(() => {
		if (!(data.timeline && data.timeline.length > 0 && data.routes[data.routes.length - 1]))
			return null;
		const lastStop = data.timeline[data.timeline.length - 1];
		const lastRoute = data.routes[data.routes.length - 1];
		if (!lastStop.departureTime || !lastRoute?.durationSeconds) return null;

		// Parse departure time
		let currentMinutes = minutesFromFormattedTime(lastStop.departureTime);

		// Add final route duration
		currentMinutes += Math.round(lastRoute.durationSeconds / 60);

		// Format back to time string
		const finalHours = Math.floor(currentMinutes / 60) % 24;
		const finalMins = currentMinutes % 60;
		const finalPeriod = finalHours >= 12 ? 'PM' : 'AM';
		const finalDisplayHours = finalHours % 12 || 12;
		return `${finalDisplayHours}:${finalMins.toString().padStart(2, '0')} ${finalPeriod}`;
	});

	const finalArrivalMs = $derived(
		finalArrivalTime !== null
			? tripStart.getTime() + minutesFromFormattedTime(finalArrivalTime) * 60 * 1000
			: null
	);

	const destinationStatus: 'done' | 'next' | 'upcoming' = $derived.by(() => {
		const allStopsDone = stopStatuses.every((status) => status === 'done');
		if (!allStopsDone) return 'upcoming' as const;
		return finalArrivalMs !== null && finalArrivalMs < nowMs
			? ('done' as const)
			: ('next' as const);
	});

	const legDriven: boolean[] = $derived(
		data.routes.map((_, i) =>
			i < data.trip.stops.length ? stopStatuses[i] === 'done' : destinationStatus === 'done'
		)
	);

	const mapSheet = $derived.by(() => {
		if (heroStop) {
			return {
				kicker: `Next stop · ${heroStop.isLayover ? 'Overnight' : 'Stop'}`,
				name: heroStop.place.displayName,
				arrive: data.timeline?.[heroStopIndex]?.arrivalTime ?? '—',
				drive: formatDuration(heroLeg?.durationSeconds ?? null) || '—',
				distance: formatDistance(heroLeg?.distanceMeters ?? null) || '—',
				url: getDirectionsUrl(
					heroPrevPlace ?? data.trip.origin.displayName,
					heroStop.place.displayName
				)
			};
		}
		const lastLeg = data.routes[data.routes.length - 1] ?? null;
		return {
			kicker: 'Final destination',
			name: data.trip.destination.displayName,
			arrive: finalArrivalTime ?? '—',
			drive: formatDuration(lastLeg?.durationSeconds ?? null) || '—',
			distance: formatDistance(lastLeg?.distanceMeters ?? null) || '—',
			url: getDirectionsUrl(finalPrevPlace, data.trip.destination.displayName)
		};
	});

	const finalLegDistanceLabel: string | null = $derived.by(() => {
		const lastRoute = data.routes[data.routes.length - 1];
		return lastRoute ? formatDistance(lastRoute.distanceMeters) : null;
	});
</script>

<header
	class="sticky top-0 z-30 -mx-4 border-b-2 border-border bg-card px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
>
	<div class="flex items-center justify-between gap-2 py-2">
		<Button variant="ghost" size="sm" href="/trips" class="pl-0 hover:bg-transparent">
			<ChevronLeft aria-hidden="true" />
			Back to trips
		</Button>
		<ModeToggle />
	</div>
</header>

<Dialog.Root bind:open={editTripOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Edit trip</Dialog.Title>
			<Dialog.Description>Update the trip name, notes and date.</Dialog.Description>
		</Dialog.Header>
		<form
			action="?/updateTrip"
			method="POST"
			class="space-y-4"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success' || result.type === 'redirect') editTripOpen = false;
				};
			}}
		>
			<div class="space-y-1.5">
				<label for="edit-title" class="text-sm font-medium">Title</label>
				<Input id="edit-title" name="title" value={data.trip.title} maxlength={128} required />
			</div>
			<div class="space-y-1.5">
				<label for="edit-description" class="text-sm font-medium">Description</label>
				<Textarea
					id="edit-description"
					name="description"
					value={data.trip.description ?? ''}
					maxlength={500}
					rows={3}
				/>
			</div>
			<div class="space-y-1.5">
				<label for="edit-date" class="text-sm font-medium">Date</label>
				<Input id="edit-date" name="plannedDate" type="date" value={plannedDateValue} required />
			</div>
			{#if form?.message}
				<p class="text-sm text-destructive" role="alert">{form.message}</p>
			{/if}
			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (editTripOpen = false)}>Cancel</Button>
				<Button type="submit">Save</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

{#snippet thingsToDo(placeId: string)}
	{@const count = data.pinCounts[placeId] ?? 0}
	<a
		href="/trips/{data.trip.id}/stops/{placeId}"
		class="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary underline-offset-4 hover:underline"
	>
		<Landmark class="size-4" aria-hidden="true" />
		Things to do{count > 0 ? ` (${count})` : ''}
	</a>
{/snippet}

<Tabs.Root bind:value={activeTab} class="gap-0">
	<Tabs.Content value="itinerary" class="pb-24">
		<div class="mx-auto w-full max-w-md px-4 py-6">
			<header>
				<span
					class="inline-flex rounded-full border-2 border-border bg-accent px-3 py-1 text-xs
					font-bold tracking-[0.15em] text-accent-foreground uppercase"
				>
					{pillDateFormatter.format(new Date(data.trip.plannedDate))}
				</span>
				<h1 class="mt-3 font-heading text-4xl leading-tight break-words text-deep-teal">
					{data.trip.title}
				</h1>
				<p class="mt-2 text-sm text-muted-foreground">
					{df.format(new Date(data.trip.plannedDate))}
					{#if data.tripStats.totalDistanceMeters !== null}
						· {formatDistance(data.tripStats.totalDistanceMeters)}
					{/if}
					· {data.tripStats.totalStops} stops
				</p>
				{#if data.trip.description}
					<p class="mt-2 text-muted-foreground">
						{data.trip.description}
					</p>
				{/if}
			</header>

			<div class="mt-4 flex flex-wrap items-center gap-2">
				<Button variant="outline" size="sm" onclick={() => (editTripOpen = true)}>
					<Pencil class="size-4" aria-hidden="true" />
					Edit Trip
				</Button>
				{#if data.hasMissingDistances}
					<form action="?/calculateDistances" method="POST" use:enhance>
						<Button type="submit" variant="outline" size="sm">
							<Route class="size-4" aria-hidden="true" />
							Calculate Distances
						</Button>
					</form>
				{/if}
				{#if data.isWeatherRefreshAvailable}
					<form action="?/refreshWeather" method="POST" use:enhance>
						<Button type="submit" variant="outline" size="sm">
							<CloudSun class="size-4" aria-hidden="true" />
							Refresh Weather
						</Button>
					</form>
				{/if}
				<form action="?/delete" method="POST" use:enhance>
					<Button type="submit" variant="outline" size="sm" class="text-destructive">
						<Trash class="size-4" aria-hidden="true" />
						Delete Trip
					</Button>
				</form>
			</div>

			{#if heroStop}
				<NextStopHero
					class="mt-6"
					stopName={heroStop.place.displayName}
					typeLabel={heroStop.isLayover ? 'OVERNIGHT' : 'STOP'}
					arriveBy={data.timeline?.[heroStopIndex]?.arrivalTime ?? null}
					eta={heroLeg?.durationSeconds != null ? formatDuration(heroLeg.durationSeconds) : null}
					distance={heroLeg?.distanceMeters != null ? formatDistance(heroLeg.distanceMeters) : null}
					goHref={heroPrevPlace
						? getDirectionsUrl(heroPrevPlace, heroStop.place.displayName)
						: null}
				>
					{#snippet actions()}
						{#if stopStatuses[heroStopIndex] !== 'done'}
							<form action="?/checkInStop" method="POST" use:enhance>
								<input type="hidden" name="placeId" value={heroStop.placeId} />
								<Button type="submit" variant="outline" size="lg">
									<MapPinCheckInside aria-hidden="true" />
									We're here
								</Button>
							</form>
						{/if}
					{/snippet}
				</NextStopHero>
			{/if}

			<div class="mt-8 mb-3 flex items-center justify-between gap-2">
				<p class="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
					Today's Route
				</p>
				<Button
					variant={editingItinerary ? 'default' : 'outline'}
					size="sm"
					aria-pressed={editingItinerary}
					onclick={() => {
						editingItinerary = !editingItinerary;
						confirmRemoveId = null;
					}}
				>
					{#if editingItinerary}
						<Check class="size-4" aria-hidden="true" />
						Done
					{:else}
						<Pencil class="size-4" aria-hidden="true" />
						Edit stops
					{/if}
				</Button>
			</div>
			{#if form?.message}
				<p class="mb-3 text-sm text-destructive" role="alert">{form.message}</p>
			{/if}

			<div class="space-y-4">
				<!-- Origin -->
				<TimelineStop
					name={data.trip.origin.displayName}
					typeLabel="START"
					status={originStatus}
					isLast={!data.trip.destination && data.trip.stops.length === 0}
				>
					<div class="space-y-2">
						<div class="flex items-center justify-end gap-2">
							{#if data.trip.departureTime && !editingOriginTime}
								<p class="mr-auto text-sm font-medium text-primary">
									Depart: {formatTime(data.trip.departureTime)}
								</p>
							{/if}
							{#if !editingOriginTime}
								<Button
									variant="ghost"
									size="icon-sm"
									class="size-9"
									aria-label="Edit departure time"
									onclick={() => (editingOriginTime = true)}
								>
									<Pencil class="size-4" aria-hidden="true" />
								</Button>
							{/if}
						</div>
						{#if editingOriginTime}
							<form
								action="?/updateDepartureTime"
								method="POST"
								use:enhance={() => {
									return async ({ update }) => {
										await update();
										editingOriginTime = false;
									};
								}}
								class="flex items-center gap-2"
							>
								<Input
									type="time"
									name="departureTime"
									value={data.trip.departureTime || ''}
									class="w-32"
								/>
								<Button type="submit" size="sm">Save</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onclick={() => (editingOriginTime = false)}
								>
									Cancel
								</Button>
							</form>
						{/if}
						{@render thingsToDo(data.trip.origin.id)}
						{#if data.weatherData[data.trip.origin.id]}
							<WeatherCard
								weather={data.weatherData[data.trip.origin.id]}
								tripDate={new Date(data.trip.plannedDate)}
							/>
						{/if}
					</div>
				</TimelineStop>

				<!-- Stops -->
				{#each data.trip.stops as stop, i (stop.placeId)}
					{@const prevPlace =
						i === 0 ? data.trip.origin.displayName : data.trip.stops[i - 1].place.displayName}
					{@const timelineEntry = data.timeline && data.timeline[i] ? data.timeline[i] : null}
					<TimelineStop
						name={stop.place.displayName}
						status={stopStatuses[i]}
						typeLabel={stop.isLayover ? 'OVERNIGHT' : 'STOP'}
						arrivalTime={timelineEntry?.arrivalTime ?? null}
						distanceLabel={data.routes[i] ? formatDistance(data.routes[i].distanceMeters) : null}
						goHref={getDirectionsUrl(prevPlace, stop.place.displayName)}
						isLast={!data.trip.destination && i === data.trip.stops.length - 1}
					>
						{#if editingStopId === stop.placeId}
							{@const isArrivalCalculated = timelineEntry?.isArrivalCalculated}
							<form
								action="?/updateStopDuration"
								method="POST"
								use:enhance={() => {
									return async ({ update }) => {
										await update();
										editingStopId = null;
									};
								}}
								class="space-y-3"
							>
								<input type="hidden" name="placeId" value={stop.placeId} />
								<div class="grid grid-cols-2 gap-2">
									<div>
										{#if isArrivalCalculated}
											<!-- Auto-calculated arrival time - read only for all stops -->
											<input type="hidden" name="arrivalTime" value={editingArrivalTime} />
											<div class="rounded-md border border-input bg-muted px-3 py-2 text-sm">
												<span class="text-muted-foreground">{formatTime(editingArrivalTime)}</span>
												<span class="ml-1 text-xs text-amber-600">(auto)</span>
											</div>
										{:else}
											<!-- Manual arrival time when auto-calc not available -->
											<Input
												type="time"
												name="arrivalTime"
												value={editingArrivalTime}
												onchange={(e) => (editingArrivalTime = e.currentTarget.value)}
												class="w-full"
												aria-label="Arrival time"
											/>
										{/if}
									</div>
									<div>
										<Input
											type="time"
											name="departureTime"
											value={editingDepartureTime}
											onchange={(e) => (editingDepartureTime = e.currentTarget.value)}
											class="w-full"
											aria-label="Departure time"
										/>
									</div>
								</div>
								{#if editingArrivalTime && editingDepartureTime}
									{@const duration = calculateDurationFromTimes(
										editingArrivalTime,
										editingDepartureTime
									)}
									<p class="text-xs text-muted-foreground">
										Duration: {formatDurationMinutes(duration)}
									</p>
								{/if}
								<div class="flex items-center gap-2">
									<Checkbox name="isLayover" checked={stop.isLayover || false} value="true" />
									<span class="text-sm">Staying overnight (layover)</span>
								</div>
								<div class="flex gap-2">
									<Button type="submit" size="sm">Save</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => (editingStopId = null)}
									>
										Cancel
									</Button>
								</div>
							</form>
						{:else}
							<div class="flex items-center justify-end gap-2">
								{#if timelineEntry?.departureTime}
									<p class="mr-auto text-sm text-muted-foreground">
										Depart {timelineEntry.departureTime}
										<span class="text-xs">
											({formatDurationMinutes(timelineEntry.durationMinutes)})
										</span>
									</p>
								{/if}
								{#if stopStatuses[i] !== 'done'}
									<form action="?/checkInStop" method="POST" use:enhance>
										<input type="hidden" name="placeId" value={stop.placeId} />
										<Button type="submit" size="sm" variant="outline">
											<MapPinCheckInside class="size-4" aria-hidden="true" />
											We're here
										</Button>
									</form>
								{:else if stop.visitedAt != null}
									<form action="?/undoCheckIn" method="POST" use:enhance>
										<input type="hidden" name="placeId" value={stop.placeId} />
										<Button
											type="submit"
											variant="ghost"
											size="icon-sm"
											class="size-9"
											aria-label="Undo check-in"
										>
											<RotateCcw class="size-4" aria-hidden="true" />
										</Button>
									</form>
								{/if}
								<Button
									variant="ghost"
									size="icon-sm"
									class="size-9"
									aria-label="Edit stop times"
									onclick={() => {
										editingStopId = stop.placeId;
										// Use calculated arrival time for non-layover stops
										editingArrivalTime = timelineEntry?.arrivalTimeRaw || stop.arrivalTime || '';
										editingDepartureTime = stop.departureTime || '';
									}}
								>
									<Pencil class="size-4" aria-hidden="true" />
								</Button>
							</div>
						{/if}
						{#if editingItinerary}
							<div
								class="mt-2 flex items-center gap-2 border-t-2 border-dashed border-dashed-grey pt-2"
							>
								{#if confirmRemoveId === stop.placeId}
									<p class="mr-auto text-sm font-medium text-destructive">Remove this stop?</p>
									<form action="?/removeStop" method="POST" use:enhance>
										<input type="hidden" name="placeId" value={stop.placeId} />
										<Button type="submit" size="sm" variant="destructive" class="h-11"
											>Remove</Button
										>
									</form>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										class="h-11"
										onclick={() => (confirmRemoveId = null)}
									>
										Cancel
									</Button>
								{:else}
									<form action="?/moveStop" method="POST" use:enhance>
										<input type="hidden" name="placeId" value={stop.placeId} />
										<input type="hidden" name="direction" value="up" />
										<Button
											type="submit"
											variant="outline"
											size="icon"
											class="size-11"
											disabled={i === 0}
											aria-label="Move stop up"
										>
											<ArrowUp class="size-4" aria-hidden="true" />
										</Button>
									</form>
									<form action="?/moveStop" method="POST" use:enhance>
										<input type="hidden" name="placeId" value={stop.placeId} />
										<input type="hidden" name="direction" value="down" />
										<Button
											type="submit"
											variant="outline"
											size="icon"
											class="size-11"
											disabled={i === data.trip.stops.length - 1}
											aria-label="Move stop down"
										>
											<ArrowDown class="size-4" aria-hidden="true" />
										</Button>
									</form>
									<Button
										type="button"
										variant="ghost"
										class="ml-auto h-11 text-destructive"
										onclick={() => (confirmRemoveId = stop.placeId)}
									>
										<Trash2 class="size-4" aria-hidden="true" />
										Remove
									</Button>
								{/if}
							</div>
						{/if}
						{@render thingsToDo(stop.place.id)}
						{#if data.weatherData[stop.place.id]}
							<WeatherCard
								weather={data.weatherData[stop.place.id]}
								tripDate={new Date(data.trip.plannedDate)}
							/>
						{/if}
					</TimelineStop>
				{/each}

				{#if editingItinerary}
					<form
						action="?/addStop"
						method="POST"
						class="space-y-3 rounded-lg border-2 border-dashed border-border bg-card p-3"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								newStop = null;
								stopSearchValue = '';
							};
						}}
					>
						<p class="text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">
							Add stop
						</p>
						<PlaceSearch
							bind:value={stopSearchValue}
							onSelect={(p) =>
								(newStop = { name: p.name, display: p.display_name, lat: p.lat, lon: p.lon })}
						/>
						{#if newStop}
							<input type="hidden" name="stopName" value={newStop.name} />
							<input type="hidden" name="stopDisplayName" value={newStop.display} />
							<input type="hidden" name="stopLat" value={newStop.lat} />
							<input type="hidden" name="stopLon" value={newStop.lon} />
						{/if}
						<Button type="submit" class="h-11 w-full" disabled={!newStop}>
							<Plus class="size-4" aria-hidden="true" />
							Add stop
						</Button>
					</form>
				{/if}

				<!-- Destination -->
				{#if data.trip.destination}
					<TimelineStop
						name={data.trip.destination.displayName}
						typeLabel="FINISH"
						status={destinationStatus}
						arrivalTime={finalArrivalTime}
						distanceLabel={finalLegDistanceLabel}
						isLast
						goHref={getDirectionsUrl(finalPrevPlace, data.trip.destination.displayName)}
					>
						{@render thingsToDo(data.trip.destination.id)}
						{#if data.weatherData[data.trip.destination.id]}
							<WeatherCard
								weather={data.weatherData[data.trip.destination.id]}
								tripDate={new Date(data.trip.plannedDate)}
							/>
						{/if}
					</TimelineStop>
				{/if}
			</div>
		</div>
	</Tabs.Content>

	<!-- Map -->
	<Tabs.Content
		value="map"
		class="-mx-4 h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] w-full overflow-hidden sm:-mx-6 lg:-mx-8"
	>
		<div class="relative h-full w-full">
			<TripMap
				origin={data.trip.origin}
				destination={data.trip.destination}
				stops={data.trip.stops}
				routes={data.routes}
				active={activeTab === 'map'}
				{stopStatuses}
				{legDriven}
			/>

			<div
				class="absolute top-3 left-3 z-20 max-w-[55vw] rounded-full border-2 border-border bg-card px-3 py-1.5 text-xs font-bold tracking-[0.1em] text-foreground uppercase shadow-hard"
			>
				<span class="block truncate">
					{pillDateFormatter.format(new Date(data.trip.plannedDate))} · {data.trip.title}
				</span>
			</div>

			<div
				class="absolute inset-x-0 bottom-0 z-20 rounded-t-[26px] border-x-2 border-t-2 border-border bg-card shadow-hard"
			>
				<div class="mx-auto max-w-md px-4 pt-3 pb-4">
					<div class="mx-auto mb-3 h-1 w-10 rounded-full bg-dashed-grey" aria-hidden="true"></div>
					{#if mapSheet}
						<p class="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
							{mapSheet.kicker}
						</p>
						<h2 class="font-heading text-2xl text-deep-teal">{mapSheet.name}</h2>
						<div
							class="mt-3 flex divide-x-2 divide-dashed divide-dashed-grey [&>*]:flex-1 [&>*]:px-3 [&>*:first-child]:pl-0 [&>*:last-child]:pr-0"
						>
							<StatBlock label="Arrive" value={mapSheet.arrive} />
							<StatBlock label="Drive" value={mapSheet.drive} />
							<StatBlock label="Distance" value={mapSheet.distance} />
						</div>
						<Button
							href={mapSheet.url}
							target="_blank"
							rel="noopener noreferrer"
							class="mt-4 h-12 w-full text-base font-bold"
						>
							<Navigation class="size-5" />
							Start navigation
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</Tabs.Content>

	<!-- Packing -->
	<Tabs.Content value="packing" class="pb-24">
		<div class="mx-auto w-full max-w-md px-4 py-6">
			<Card.Root>
				<Card.Header>
					<div class="flex items-start justify-between">
						<div class="space-y-1.5">
							<p class="text-xs font-bold tracking-[0.15em] text-primary uppercase">Packing</p>
							<Card.Title class="font-heading text-2xl font-normal text-deep-teal">
								Road Trip Checklist
							</Card.Title>
							<Card.Description>Don't forget the essentials for your journey.</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						<form
							action="?/addChecklistItem"
							method="POST"
							use:enhance={() => {
								return async ({ update }) => {
									await update();
									showNewCategoryInput = false;
									selectedCategoryId = '';
								};
							}}
							class="space-y-2"
						>
							<div class="flex flex-1 flex-row items-center justify-center gap-4 align-middle">
								<div class="flex flex-1 flex-col flex-wrap gap-2">
									<Input name="item" placeholder="Add new item..." required class="flex-2" />
									{#if showNewCategoryInput}
										<div class="flex flex-4 flex-row gap-2">
											<Input
												name="newCategory"
												placeholder="New category name..."
												required
												class="flex-1"
											/>
											<Button
												type="button"
												size="icon"
												variant="outline"
												class="shrink-0"
												aria-label="Back to category list"
												onclick={() => {
													showNewCategoryInput = false;
													selectedCategoryId = '';
												}}
											>
												<ChevronLeft class="h-4 w-4" />
											</Button>
										</div>
									{:else}
										<div class="flex flex-1 flex-row">
											<Select.Root
												type="single"
												bind:value={selectedCategoryId}
												onValueChange={(v) => {
													showNewCategoryInput = v === 'new';
												}}
											>
												<Select.Trigger class="w-full">
													{data.categories.find((c) => c.id === selectedCategoryId)?.name ??
														(selectedCategoryId === 'new' ? 'Add New Category...' : 'No Category')}
												</Select.Trigger>
												<Select.Content>
													<Select.Item value="">No Category</Select.Item>
													{#each data.categories as cat (cat.id)}
														<Select.Item value={cat.id}>{cat.name}</Select.Item>
													{/each}
													<Select.Separator />
													<Select.Item value="new">+ Add New Category...</Select.Item>
												</Select.Content>
												<input
													type="hidden"
													name="categoryId"
													value={selectedCategoryId === 'new' ? '' : selectedCategoryId}
												/>
											</Select.Root>
										</div>
									{/if}
									<Input
										name="count"
										type="number"
										placeholder="Qty"
										class="w-20 shrink-0 text-center"
										min="1"
										value="1"
									/>
								</div>
								<Button
									type="submit"
									size="icon"
									variant="outline"
									class="shrink-0"
									aria-label="Add item"
								>
									<Plus class="h-4 w-4" />
								</Button>
							</div>
						</form>

						<div class="space-y-6">
							{#each itemsByCategory as group (group.id)}
								<div class="space-y-3">
									<div class="flex items-center gap-2 px-1">
										<h4 class="text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">
											{group.name}
										</h4>
										{#if group.allChecked}
											<Check class="h-4 w-4 text-primary" />
										{/if}
									</div>
									<div class="space-y-2">
										{#each group.items as item (item.id)}
											<div class="flex flex-col rounded-lg border-2 border-border bg-card p-3">
												<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
													<div class="flex w-full items-center gap-3 sm:w-auto sm:flex-1">
														<form action="?/toggleChecklistItem" method="POST" use:enhance>
															<input type="hidden" name="id" value={item.id} />
															<input type="hidden" name="checked" value={!item.checked} />
															<Checkbox
																checked={item.checked ?? false}
																onCheckedChange={() => {
																	const form = document
																		.querySelector(
																			`form[action="?/toggleChecklistItem"] input[name="id"][value="${item.id}"]`
																		)
																		?.closest('form');
																	if (form) form.requestSubmit();
																}}
															/>
														</form>
														<span class={item.checked ? 'text-muted-foreground line-through' : ''}>
															{item.item}
														</span>
													</div>

													<div class="flex min-w-0 flex-1 items-center sm:flex-none">
														<form
															action="?/updateChecklistItemCategory"
															method="POST"
															use:enhance
															class="w-full"
														>
															<input type="hidden" name="id" value={item.id} />
															<Select.Root
																type="single"
																disabled={item.checked ?? false}
																value={item.categoryId ?? ''}
																onValueChange={(v) => {
																	const form = document
																		.querySelector(
																			`form[action="?/updateChecklistItemCategory"] input[name="id"][value="${item.id}"]`
																		)
																		?.closest('form');
																	if (form) {
																		// Create a temporary hidden input for the categoryId since Select doesn't use a real select
																		let input = form.querySelector(
																			'input[name="categoryId"]'
																		) as HTMLInputElement;
																		if (!input) {
																			input = document.createElement('input');
																			input.type = 'hidden';
																			input.name = 'categoryId';
																			form.appendChild(input);
																		}
																		input.value = v;
																		form.requestSubmit();
																	}
																}}
															>
																<Select.Trigger
																	class="h-11 w-full px-2 py-0 text-xs text-muted-foreground sm:w-auto"
																>
																	{data.categories.find((c) => c.id === item.categoryId)?.name ??
																		'No Category'}
																</Select.Trigger>
																<Select.Content>
																	<Select.Item value="">No Category</Select.Item>
																	{#each data.categories as cat (cat.id)}
																		<Select.Item value={cat.id}>{cat.name}</Select.Item>
																	{/each}
																</Select.Content>
															</Select.Root>
														</form>
													</div>

													<div class="flex items-center gap-2">
														<form action="?/updateChecklistItemCount" method="POST" use:enhance>
															<input type="hidden" name="id" value={item.id} />
															<Input
																name="count"
																type="number"
																value={item.count}
																min="1"
																disabled={item.checked}
																class="h-11 w-16 text-center"
																onchange={(e) => {
																	e.currentTarget.closest('form')?.requestSubmit();
																}}
															/>
														</form>

														<form action="?/deleteChecklistItem" method="POST" use:enhance>
															<input type="hidden" name="id" value={item.id} />
															<Button
																type="submit"
																variant="ghost"
																size="icon"
																class="text-muted-foreground hover:text-destructive"
																aria-label="Delete item"
															>
																<Trash2 class="h-4 w-4" />
															</Button>
														</form>
													</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{:else}
								<p class="py-4 text-center text-sm text-muted-foreground">
									No items in your checklist.
								</p>
							{/each}
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</Tabs.Content>

	<!-- Budget -->
	<Tabs.Content value="budget" class="pb-24">
		<div class="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 text-center">
			<Wallet class="size-10 text-muted-foreground" aria-hidden="true" />
			<h2 class="mt-4 font-heading text-2xl text-deep-teal">Budget</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				Coming soon — fuel, lodging and food costs will live here.
			</p>
		</div>
	</Tabs.Content>

	<!-- Bottom tab bar -->
	<Tabs.List
		class="fixed inset-x-0 bottom-0 z-40 w-full rounded-none border-x-0 border-b-0 pt-1 pb-[max(env(safe-area-inset-bottom),0.25rem)]"
	>
		<div class="mx-auto grid max-w-md grid-cols-4 items-stretch gap-1 px-2">
			<Tabs.Trigger
				value="itinerary"
				class="gap-1 px-2 text-xs"
				aria-current={activeTab === 'itinerary' ? 'page' : undefined}
			>
				<ListOrdered aria-hidden="true" />
				Itinerary
			</Tabs.Trigger>
			<Tabs.Trigger
				value="map"
				class="gap-1 px-2 text-xs"
				aria-current={activeTab === 'map' ? 'page' : undefined}
			>
				<MapIcon aria-hidden="true" />
				Map
			</Tabs.Trigger>
			<Tabs.Trigger
				value="packing"
				class="gap-1 px-2 text-xs"
				aria-current={activeTab === 'packing' ? 'page' : undefined}
			>
				<Backpack aria-hidden="true" />
				Packing
			</Tabs.Trigger>
			<Tabs.Trigger
				value="budget"
				class="gap-1 px-2 text-xs"
				aria-current={activeTab === 'budget' ? 'page' : undefined}
			>
				<Wallet aria-hidden="true" />
				Budget
			</Tabs.Trigger>
		</div>
	</Tabs.List>
</Tabs.Root>
