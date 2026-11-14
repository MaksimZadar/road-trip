<script lang="ts">
	import type { Component } from 'svelte';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Castle from '@lucide/svelte/icons/castle';
	import Trees from '@lucide/svelte/icons/trees';
	import PartyPopper from '@lucide/svelte/icons/party-popper';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import Fuel from '@lucide/svelte/icons/fuel';
	import BedDouble from '@lucide/svelte/icons/bed-double';
	import { POI_CHIPS, type PoiChip } from '$lib/utils/poi';

	let { active }: { active: PoiChip } = $props();

	const icons: Record<string, Component> = {
		Landmark,
		Castle,
		Trees,
		PartyPopper,
		UtensilsCrossed,
		Fuel,
		BedDouble
	};
</script>

<nav aria-label="Categories">
	<ul class="flex flex-wrap gap-1.5 pt-1 pb-3">
		{#each POI_CHIPS as chip (chip.id)}
			{@const Icon = icons[chip.icon]}
			<li>
				<a
					href="?chip={chip.id}"
					data-sveltekit-replacestate
					data-sveltekit-noscroll
					aria-current={active === chip.id ? 'true' : undefined}
					class="inline-flex h-11 items-center gap-1.5 rounded-full border-2 border-border px-4 text-sm font-bold whitespace-nowrap transition-colors
						{active === chip.id
						? 'bg-accent text-accent-foreground shadow-hard'
						: 'bg-card text-foreground hover:bg-muted'}"
				>
					{#if Icon}<Icon class="size-4" aria-hidden="true" />{/if}
					{chip.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
