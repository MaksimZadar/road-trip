<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Navigation from '@lucide/svelte/icons/navigation';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import ImageOff from '@lucide/svelte/icons/image-off';
	import type { PoiDetail } from '$lib/utils/poi';

	let {
		open = $bindable(false),
		poi,
		tripId,
		placeId
	}: {
		open: boolean;
		poi: { xid: string; name: string; lat: number; lon: number } | null;
		tripId: string;
		placeId: string;
	} = $props();

	let detail = $state<PoiDetail | null>(null);
	let failed = $state(false);
	let loading = $state(false);
	let imageFailed = $state(false);

	$effect(() => {
		if (!open || !poi) return;
		const xid = poi.xid;
		const controller = new AbortController();
		detail = null;
		failed = false;
		imageFailed = false;
		loading = true;
		fetch(`/trips/${tripId}/stops/${placeId}/poi/${encodeURIComponent(xid)}`, {
			signal: controller.signal
		})
			.then((res) => res.json())
			.then((body: PoiDetail | { status: 'error' }) => {
				if ('status' in body) failed = true;
				else detail = body;
			})
			.catch((err) => {
				if (err?.name !== 'AbortError') failed = true;
			})
			.finally(() => {
				if (!controller.signal.aborted) loading = false;
			});
		return () => controller.abort();
	});

	const directionsUrl = $derived(
		poi ? `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lon}` : '#'
	);
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="top-auto bottom-0 left-0 max-h-[85dvh] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none px-4 pt-6 pb-[calc(1rem+env(safe-area-inset-bottom))] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:left-[50%] sm:max-w-lg sm:-translate-x-1/2"
	>
		<div class="mx-auto -mt-3 mb-1 h-1 w-10 rounded-full bg-dashed-grey" aria-hidden="true"></div>
		<Dialog.Header>
			<Dialog.Title class="pr-6 font-heading text-2xl text-deep-teal">{poi?.name}</Dialog.Title>
			<Dialog.Description class="sr-only">Details for {poi?.name}</Dialog.Description>
		</Dialog.Header>

		{#if loading}
			<div class="space-y-3" aria-busy="true">
				<div class="h-40 animate-pulse rounded-lg bg-muted"></div>
				<div class="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
				<div class="h-4 w-1/2 animate-pulse rounded bg-muted"></div>
			</div>
		{:else if failed}
			<p class="text-sm text-muted-foreground">
				Couldn't load more details. You can still get directions below.
			</p>
		{:else if detail}
			{#if detail.imageUrl}
				{#if imageFailed}
					<div
						class="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-dashed-grey text-muted-foreground"
					>
						<ImageOff class="size-6" aria-hidden="true" />
						<span class="sr-only">Image unavailable</span>
					</div>
				{:else}
					<img
						src={detail.imageUrl}
						alt=""
						loading="lazy"
						class="max-h-56 w-full rounded-lg border-2 border-border object-cover"
						onerror={() => (imageFailed = true)}
					/>
				{/if}
			{/if}
			{#if detail.description}
				<p class="text-sm leading-relaxed">{detail.description}</p>
			{/if}
			{#if detail.address}
				<p class="text-sm text-muted-foreground">{detail.address}</p>
			{/if}
			{#if !detail.description && !detail.address && !detail.imageUrl}
				<p class="text-sm text-muted-foreground">No extra details available.</p>
			{/if}
			<div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
				{#if detail.websiteUrl}
					<a
						href={detail.websiteUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex min-h-11 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
					>
						Website <ExternalLink class="size-3.5" aria-hidden="true" />
					</a>
				{/if}
				{#if detail.otmUrl}
					<a
						href={detail.otmUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex min-h-11 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
					>
						OpenTripMap <ExternalLink class="size-3.5" aria-hidden="true" />
					</a>
				{/if}
				{#if detail.wikipediaUrl}
					<a
						href={detail.wikipediaUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex min-h-11 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
					>
						Source: Wikipedia <ExternalLink class="size-3.5" aria-hidden="true" />
					</a>
				{/if}
			</div>
		{/if}

		<Button
			href={directionsUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="h-12 w-full text-base font-bold"
		>
			<Navigation class="size-5" aria-hidden="true" />
			Directions
		</Button>
	</Dialog.Content>
</Dialog.Root>
