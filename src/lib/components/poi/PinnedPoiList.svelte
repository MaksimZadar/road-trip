<script lang="ts">
	import { enhance } from '$app/forms';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import BookmarkCheck from '@lucide/svelte/icons/bookmark-check';
	import { POI_CHIPS } from '$lib/utils/poi';

	type Pin = {
		id: string;
		xid: string;
		name: string;
		chip: string;
		latitude: number;
		longitude: number;
		distanceMeters: number | null;
		note: string | null;
	};

	let {
		pins,
		placeName,
		onOpen,
		onOptimistic
	}: {
		pins: Pin[];
		placeName: string;
		onOpen: (poi: { xid: string; name: string; lat: number; lon: number }) => void;
		onOptimistic: (xid: string, value: boolean | null) => void;
	} = $props();

	function label(chip: string) {
		return POI_CHIPS.find((c) => c.id === chip)?.label ?? chip;
	}
</script>

<section aria-labelledby="pinned-heading" class="mb-6">
	<h2
		id="pinned-heading"
		class="mb-2 text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase"
	>
		Pinned here ({pins.length})
	</h2>
	{#if pins.length === 0}
		<p
			class="rounded-lg border-2 border-dashed border-dashed-grey p-4 text-sm text-muted-foreground"
		>
			Nothing pinned yet. Tap the bookmark on a place to save it for this stop.
		</p>
	{:else}
		<ul class="space-y-3">
			{#each pins as pin (pin.id)}
				<li class="rounded-lg border-2 border-border bg-mustard-tint p-3 shadow-hard">
					<div class="flex items-start gap-2">
						<button
							type="button"
							class="min-w-0 flex-1 space-y-1.5 text-left focus-visible:outline-2"
							onclick={() =>
								onOpen({ xid: pin.xid, name: pin.name, lat: pin.latitude, lon: pin.longitude })}
						>
							<span class="block text-base leading-snug font-semibold break-words">{pin.name}</span>
							<span class="flex flex-wrap items-center gap-x-2 gap-y-1">
								<Badge variant="secondary">{label(pin.chip)}</Badge>
								{#if pin.distanceMeters != null}
									<span class="text-xs text-muted-foreground">
										{(pin.distanceMeters / 1000).toFixed(1)} km from {placeName}
									</span>
								{/if}
							</span>
						</button>
						<form
							method="POST"
							action="?/unpin"
							use:enhance={() => {
								onOptimistic(pin.xid, false);
								return async ({ update }) => {
									await update({ reset: false });
									onOptimistic(pin.xid, null);
								};
							}}
						>
							<input type="hidden" name="xid" value={pin.xid} />
							<button
								type="submit"
								class="inline-flex size-11 items-center justify-center rounded-full border-2 border-border bg-accent text-accent-foreground"
								aria-pressed="true"
								aria-label={`Unpin ${pin.name}`}
							>
								<BookmarkCheck class="size-5" aria-hidden="true" />
							</button>
						</form>
					</div>
					<form
						method="POST"
						action="?/updatePinNote"
						use:enhance={() =>
							async ({ update }) =>
								update({ reset: false })}
						class="mt-2 flex gap-2"
					>
						<input type="hidden" name="xid" value={pin.xid} />
						<input
							name="note"
							value={pin.note ?? ''}
							maxlength={500}
							placeholder="Add a note…"
							aria-label={`Note for ${pin.name}`}
							class="h-11 min-w-0 flex-1 rounded-md border-2 border-input bg-card px-3 text-sm"
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
						/>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</section>
