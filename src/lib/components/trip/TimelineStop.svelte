<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { cn } from '$lib/utils.js';
	import Check from '@lucide/svelte/icons/check';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Moon from '@lucide/svelte/icons/moon';
	import Route from '@lucide/svelte/icons/route';
	import StopStamp from './StopStamp.svelte';

	let {
		name,
		status,
		typeLabel = null,
		arrivalTime = null,
		distanceLabel = null,
		isLast = false,
		goHref = null,
		children,
		class: className
	}: {
		name: string;
		status: 'done' | 'next' | 'upcoming';
		typeLabel?: string | null;
		arrivalTime?: string | null;
		distanceLabel?: string | null;
		isLast?: boolean;
		goHref?: string | null;
		children?: Snippet;
		class?: string;
	} = $props();
</script>

{#snippet card()}
	<Card.Root class={cn('relative text-card-foreground', status === 'next' && 'bg-mustard-tint')}>
		<Card.Content class="space-y-2 p-4">
			<div class="flex items-start justify-between gap-2">
				<h3 class="text-base leading-snug font-semibold">{name}</h3>
				{#if distanceLabel}
					<span class="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
						<Route class="size-3" aria-hidden="true" />
						{distanceLabel}
					</span>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				{#if typeLabel}
					<Badge>{typeLabel}</Badge>
				{/if}
				{#if arrivalTime}
					<span class="text-sm text-muted-foreground">Arrive {arrivalTime}</span>
				{/if}
			</div>
			{#if children}
				<div class="relative z-20 space-y-2">
					{@render children?.()}
				</div>
			{/if}
		</Card.Content>
		{#if goHref}
			<a
				class="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2"
				href={goHref}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={`Directions to ${name}`}
			></a>
		{/if}
	</Card.Root>
{/snippet}

<div data-slot="timeline-stop" class={cn('flex gap-3', className)}>
	<div class="flex flex-col items-center">
		<div
			class="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-border
			{status === 'done'
				? 'bg-secondary text-secondary-foreground'
				: status === 'next'
					? 'bg-accent text-accent-foreground'
					: 'bg-card text-foreground'}"
		>
			{#if status === 'done'}
				<Check class="size-5" aria-hidden="true" />
			{:else if status === 'upcoming' && typeLabel === 'OVERNIGHT'}
				<Moon class="size-5" aria-hidden="true" />
			{:else}
				<MapPin class="size-5" aria-hidden="true" />
			{/if}
		</div>
		{#if !isLast}
			<div class="my-1 w-0 grow border-l-2 border-dashed border-dashed-grey"></div>
		{/if}
	</div>

	<div class="relative flex-1">
		{@render card()}

		{#if status === 'done'}
			<StopStamp class="-top-3 -right-3" />
		{/if}
	</div>
</div>
