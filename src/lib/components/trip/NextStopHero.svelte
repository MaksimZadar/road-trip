<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import Clock from '@lucide/svelte/icons/clock';
	import Navigation from '@lucide/svelte/icons/navigation';

	let {
		stopName,
		typeLabel,
		arriveBy,
		eta,
		distance,
		goHref,
		actions,
		class: className
	}: {
		stopName: string;
		typeLabel: string;
		arriveBy: string | null;
		eta: string | null;
		distance: string | null;
		goHref: string | null;
		/** Extra buttons rendered beside "Go" (e.g. a check-in form). */
		actions?: Snippet;
		class?: string;
	} = $props();
</script>

<section
	data-slot="next-stop-hero"
	class={cn(
		'relative overflow-hidden rounded-lg border-2 border-border bg-secondary text-secondary-foreground shadow-hard-lg',
		className
	)}
>
	<div class="p-5">
		<p class="text-xs font-bold tracking-[0.2em] text-secondary-foreground/80 uppercase">UP NEXT</p>
		<Badge class="mt-3">{typeLabel}</Badge>
		<h2 class="mt-3 font-heading text-3xl leading-tight text-secondary-foreground">
			{stopName}
		</h2>
		{#if arriveBy}
			<p class="mt-2 flex items-center gap-1.5 text-sm font-medium text-secondary-foreground/90">
				<Clock class="size-4 shrink-0" aria-hidden="true" />
				Arrive by {arriveBy}
			</p>
		{/if}
	</div>

	<div class="relative">
		<div class="border-t-2 border-dashed border-dashed-grey"></div>
		<div
			aria-hidden="true"
			class="absolute top-[-13px] left-[-13px] size-[26px] rounded-full border-2 border-border bg-background"
		></div>
		<div
			aria-hidden="true"
			class="absolute top-[-13px] right-[-13px] size-[26px] rounded-full border-2 border-border bg-background"
		></div>
	</div>

	<div class="flex flex-wrap items-end justify-between gap-4 p-5">
		<div class="flex gap-6">
			<div data-slot="stat-block">
				<div class="text-xs font-bold tracking-[0.2em] text-secondary-foreground/80 uppercase">
					ETA
				</div>
				<div class="font-heading text-2xl text-mustard-light">{eta ?? '—'}</div>
			</div>
			<div data-slot="stat-block">
				<div class="text-xs font-bold tracking-[0.2em] text-secondary-foreground/80 uppercase">
					DISTANCE
				</div>
				<div class="font-heading text-2xl text-mustard-light">{distance ?? '—'}</div>
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if goHref}
				<Button variant="highlight" href={goHref} target="_blank" rel="noopener noreferrer">
					<Navigation aria-hidden="true" />
					Go
				</Button>
			{/if}
			{@render actions?.()}
		</div>
	</div>
</section>
