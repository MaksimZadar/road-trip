<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { SvelteMap } from 'svelte/reactivity';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import MapPinOff from '@lucide/svelte/icons/map-pin-off';
	import SearchX from '@lucide/svelte/icons/search-x';
	import PoiChipBar from '$lib/components/poi/PoiChipBar.svelte';
	import PoiCard from '$lib/components/poi/PoiCard.svelte';
	import PoiDetailSheet from '$lib/components/poi/PoiDetailSheet.svelte';
	import PinnedPoiList from '$lib/components/poi/PinnedPoiList.svelte';
	import { formatTemperature, getWeatherInfo } from '$lib/utils/weather';

	let { data } = $props();

	const PAGE_SIZE = 20;

	const placeName = $derived(data.anchor.place.displayName ?? data.anchor.place.name);

	// Optimistic overrides: xid -> pinned state while a request is in flight.
	const overrides = new SvelteMap<string, boolean>();
	function setOptimistic(xid: string, value: boolean | null) {
		if (value === null) overrides.delete(xid);
		else overrides.set(xid, value);
	}

	const hereXids = $derived(new Set(data.pins.map((p) => p.xid)));
	const tripXids = $derived(new Set(data.pinnedXids));

	function isPinned(xid: string) {
		return overrides.get(xid) ?? tripXids.has(xid);
	}
	function pinnedNear(xid: string): string | null {
		if (hereXids.has(xid)) return null;
		const a = data.pinnedAnchors[xid];
		return a && a.anchorPlaceId !== data.anchor.place.id ? a.anchorName : null;
	}

	const visiblePins = $derived(data.pins.filter((p) => overrides.get(p.xid) !== false));

	let sheetOpen = $state(false);
	let sheetPoi = $state<{ xid: string; name: string; lat: number; lon: number } | null>(null);
	function openSheet(poi: { xid: string; name: string; lat: number; lon: number }) {
		sheetPoi = poi;
		sheetOpen = true;
	}

	let shown = $state(PAGE_SIZE);
	$effect(() => {
		void data.chip;
		shown = PAGE_SIZE;
	});

	const weatherInfo = $derived(data.weather ? getWeatherInfo(data.weather.weatherCode) : null);
</script>

<svelte:head><title>Things to do · {placeName}</title></svelte:head>

<header
	class="sticky top-0 z-30 -mx-4 border-b-2 border-border bg-card px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
>
	<div class="mx-auto w-full max-w-md">
		<Button
			variant="ghost"
			size="sm"
			href="/trips/{data.trip.id}"
			class="h-11 pl-0 hover:bg-transparent"
		>
			<ChevronLeft aria-hidden="true" />
			Back to {data.trip.title}
		</Button>
		<div class="pb-3">
			<h1 class="font-heading text-2xl leading-tight break-words text-deep-teal">{placeName}</h1>
			{#if data.weather && weatherInfo}
				<p class="text-xs text-muted-foreground">
					{weatherInfo.description} · {formatTemperature(data.weather.tempMax)} / {formatTemperature(
						data.weather.tempMin
					)}
				</p>
			{/if}
		</div>
	</div>
</header>

<div class="mx-auto w-full max-w-md px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
	<PinnedPoiList pins={visiblePins} {placeName} onOpen={openSheet} onOptimistic={setOptimistic} />

	<h2 class="mb-2 text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
		Things to do
	</h2>
	<PoiChipBar active={data.chip} />

	{#snippet notice(Icon: typeof KeyRound, title: string, body: string)}
		<div
			class="flex flex-col items-center rounded-lg border-2 border-dashed border-dashed-grey p-6 text-center"
			role="status"
		>
			<Icon class="size-8 text-muted-foreground" aria-hidden="true" />
			<p class="mt-2 font-semibold">{title}</p>
			<p class="mt-1 text-sm text-muted-foreground">{body}</p>
		</div>
	{/snippet}

	{#key data.chip}
		{#await data.pois}
			<ul class="space-y-3" aria-busy="true" aria-label="Loading places">
				{#each [0, 1, 2, 3, 4] as i (i)}
					<li class="h-[84px] animate-pulse rounded-lg border-2 border-border bg-muted"></li>
				{/each}
			</ul>
		{:then result}
			{#if result.status === 'disabled'}
				{@render notice(
					KeyRound,
					'OpenTripMap key not configured',
					'Ask whoever runs this app to add an OpenTripMap API key to see nearby places.'
				)}
			{:else if result.status === 'no-coords'}
				{@render notice(
					MapPinOff,
					'No location for this place',
					"We can't search nearby without coordinates for this stop."
				)}
			{:else if result.status === 'error'}
				{@render notice(
					TriangleAlert,
					"Couldn't load places",
					'Something went wrong fetching nearby places. Try again in a moment.'
				)}
			{:else if result.items.length === 0}
				{@render notice(
					SearchX,
					'Nothing found nearby',
					'Try another category — nothing in this one is close to here.'
				)}
			{:else}
				{#if result.stale}
					<Badge variant="outline" class="mb-3">May be outdated</Badge>
				{/if}
				<ul class="space-y-3">
					{#each result.items.slice(0, shown) as poi (poi.xid)}
						<PoiCard
							{poi}
							{placeName}
							pinned={isPinned(poi.xid)}
							pinnedNear={pinnedNear(poi.xid)}
							onOpen={openSheet}
							onOptimistic={setOptimistic}
						/>
					{/each}
				</ul>
				{#if result.items.length > shown}
					<Button variant="outline" class="mt-4 h-11 w-full" onclick={() => (shown += PAGE_SIZE)}>
						Show more ({result.items.length - shown} left)
					</Button>
				{/if}
			{/if}
		{/await}
	{/key}

	<footer class="mt-8 text-center text-xs text-muted-foreground">
		Data © OpenTripMap, © OpenStreetMap contributors
	</footer>
</div>

<PoiDetailSheet
	bind:open={sheetOpen}
	poi={sheetPoi}
	tripId={data.trip.id}
	placeId={data.anchor.place.id}
/>
