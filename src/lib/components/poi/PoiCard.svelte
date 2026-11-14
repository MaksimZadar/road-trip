<script lang="ts">
	import { enhance } from '$app/forms';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import BookmarkCheck from '@lucide/svelte/icons/bookmark-check';
	import { POI_CHIPS, type PoiChip } from '$lib/utils/poi';

	type CardPoi = {
		xid: string;
		name: string;
		chip: PoiChip;
		distanceMeters: number;
		lat: number;
		lon: number;
	};

	let {
		poi,
		placeName,
		pinned,
		pinnedNear = null,
		onOpen,
		onOptimistic
	}: {
		poi: CardPoi;
		placeName: string;
		pinned: boolean;
		/** Name of another stop this POI is pinned near, if any. */
		pinnedNear?: string | null;
		onOpen: (poi: CardPoi) => void;
		/** Called with the new state on submit, and null when the request settles. */
		onOptimistic: (xid: string, value: boolean | null) => void;
	} = $props();

	const chipLabel = $derived(POI_CHIPS.find((c) => c.id === poi.chip)?.label ?? poi.chip);
	const km = $derived((poi.distanceMeters / 1000).toFixed(1));
</script>

<li class="flex items-stretch rounded-lg border-2 border-border bg-card shadow-hard">
	<button
		type="button"
		class="min-w-0 flex-1 space-y-1.5 rounded-l-lg p-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2"
		onclick={() => onOpen(poi)}
	>
		<span class="block text-base leading-snug font-semibold break-words">{poi.name}</span>
		<span class="flex flex-wrap items-center gap-x-2 gap-y-1">
			<Badge variant="secondary">{chipLabel}</Badge>
			<span class="text-xs text-muted-foreground">{km} km from {placeName}</span>
		</span>
		{#if pinnedNear}
			<span class="block text-xs font-medium text-primary">Pinned near {pinnedNear}</span>
		{/if}
	</button>
	<form
		method="POST"
		action={pinned ? '?/unpin' : '?/pin'}
		class="flex shrink-0 items-center pr-2"
		use:enhance={() => {
			onOptimistic(poi.xid, !pinned);
			return async ({ update }) => {
				await update({ reset: false });
				onOptimistic(poi.xid, null);
			};
		}}
	>
		<input type="hidden" name="xid" value={poi.xid} />
		{#if !pinned}
			<input type="hidden" name="name" value={poi.name} />
			<input type="hidden" name="chip" value={poi.chip} />
			<input type="hidden" name="lat" value={poi.lat} />
			<input type="hidden" name="lon" value={poi.lon} />
			<input type="hidden" name="distanceMeters" value={poi.distanceMeters} />
		{/if}
		<button
			type="submit"
			class="inline-flex size-11 items-center justify-center rounded-full border-2 border-border transition-colors
				{pinned ? 'bg-accent text-accent-foreground' : 'bg-card text-foreground hover:bg-muted'}"
			aria-pressed={pinned}
			aria-label={pinned ? `Unpin ${poi.name}` : `Pin ${poi.name}`}
		>
			{#if pinned}
				<BookmarkCheck class="size-5" aria-hidden="true" />
			{:else}
				<Bookmark class="size-5" aria-hidden="true" />
			{/if}
		</button>
	</form>
</li>
