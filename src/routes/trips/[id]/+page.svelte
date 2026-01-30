<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import {
		CalendarIcon,
		MapPin,
		ChevronLeft,
		Navigation,
		Flag,
		Circle,
		ChevronDown,
		ChevronUp,
		Trash2,
		Route
	} from '@lucide/svelte';
	import { DateFormatter } from '@internationalized/date';
	import { slide } from 'svelte/transition';

	let { data } = $props();

	let isTimelineCollapsed = $state(false);

	const df = new DateFormatter('en-US', {
		dateStyle: 'full'
	});

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
</script>

<div class="container mx-auto max-w-3xl py-10">
	<div class="mb-6 flex items-center justify-between">
		<Button variant="ghost" href="/trips" class="pl-0 hover:bg-transparent">
			<ChevronLeft class="mr-1 h-4 w-4" />
			Back to Trips
		</Button>

		<div class="flex gap-2">
			{#if data.hasMissingDistances}
				<form action="?/calculateDistances" method="POST" use:enhance>
					<Button type="submit" variant="outline" size="sm">
						<Route class="mr-2 h-4 w-4" />
						Calculate Distances
					</Button>
				</form>
			{/if}
			<form action="?/delete" method="POST" use:enhance>
				<Button
					type="submit"
					variant="outline"
					size="sm"
					class="hover:text-destructive-foreground text-destructive hover:bg-destructive"
				>
					<Trash2 class="mr-2 h-4 w-4" />
					Delete Trip
				</Button>
			</form>
		</div>
	</div>

	<div class="space-y-8">
		<header>
			<h1 class="mb-2 text-4xl font-bold tracking-tight">{data.trip.title}</h1>
			<div class="flex items-center text-muted-foreground">
				<CalendarIcon class="mr-2 h-4 w-4" />
				{df.format(new Date(data.trip.plannedDate))}
			</div>
			{#if data.trip.description}
				<p class="mt-4 text-lg text-muted-foreground">
					{data.trip.description}
				</p>
			{/if}
		</header>

		<Card.Root>
			<Card.Header>
				<div class="flex items-start justify-between">
					<div class="space-y-1.5">
						<Card.Title>Route Timeline</Card.Title>
						<Card.Description>
							Your journey from start to finish. Click on a stop to view directions.
						</Card.Description>
					</div>
					<Card.Action>
						<Button
							variant="ghost"
							size="icon"
							onclick={() => (isTimelineCollapsed = !isTimelineCollapsed)}
							aria-label={isTimelineCollapsed ? 'Expand timeline' : 'Collapse timeline'}
						>
							{#if isTimelineCollapsed}
								<ChevronDown class="h-4 w-4" />
							{:else}
								<ChevronUp class="h-4 w-4" />
							{/if}
						</Button>
					</Card.Action>
				</div>
			</Card.Header>
			{#if !isTimelineCollapsed}
				<div transition:slide>
					<Card.Content>
						<div class="flex flex-col">
							<!-- Origin -->
							<div class="flex gap-4">
								<div class="flex flex-col items-center">
									<div class="rounded-full bg-primary/10 p-2">
										<Navigation class="size-4 fill-primary text-primary" />
									</div>
									<div class="w-0.5 grow bg-muted"></div>
								</div>
								<div class="mb-2 flex-1">
									<div
										class="group block flex-1 rounded-lg border border-border p-3 transition-colors"
									>
										<h3 class="text-lg leading-none font-semibold">Starting Point</h3>
										<p class="mt-2 text-muted-foreground">{data.trip.origin.displayName}</p>
									</div>
									<!-- Distance between Origin and First Stop/Destination -->
									{#if data.routes[0]}
										{@const route = data.routes[0]}
										<div class="flex items-center gap-2 py-2 text-xs text-muted-foreground">
											<Route class="h-3 w-3" />
											<span>{formatDistance(route.distanceMeters)}</span>
											<span class="opacity-50">•</span>
											<span>{formatDuration(route.durationSeconds)}</span>
										</div>
									{:else if data.routes.length > 0}
										<div class="h-8"></div>
									{/if}
								</div>
							</div>

							<!-- Stops -->
							{#each data.trip.stops as stop, i (stop.placeId)}
								{@const prevPlace =
									i === 0 ? data.trip.origin.displayName : data.trip.stops[i - 1].place.displayName}
								<div class="flex gap-4">
									<div class="flex flex-col items-center">
										<div class="rounded-full bg-muted p-2">
											<Circle class="size-4 fill-muted-foreground text-muted-foreground" />
										</div>
										<div class="w-0.5 grow bg-muted"></div>
									</div>
									<div class="flex-1">
										<a
											href={getDirectionsUrl(prevPlace, stop.place.displayName)}
											target="_blank"
											rel="noopener noreferrer"
											class="group block rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
										>
											<div class="flex items-center justify-between">
												<div>
													<h3 class="text-base leading-none font-medium group-hover:text-primary">
														Stop {stop.order + 1}
													</h3>
													<p class="mt-2 text-sm text-muted-foreground">{stop.place.displayName}</p>
												</div>
												<MapPin
													class="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
												/>
											</div>
										</a>
										<!-- Distance between Stops -->
										{#if data.routes[i + 1]}
											{@const route = data.routes[i + 1]}
											{#if route}
												<div class="flex items-center gap-2 py-2 text-xs text-muted-foreground">
													<Route class="h-3 w-3" />
													<span>{formatDistance(route.distanceMeters)}</span>
													<span class="opacity-50">•</span>
													<span>{formatDuration(route.durationSeconds)}</span>
												</div>
											{/if}
										{:else if i < data.trip.stops.length - 1}
											<div class="h-8"></div>
										{/if}
									</div>
								</div>
							{/each}

							<!-- Destination -->
							{#if data.trip.destination}
								{@const finalPrevPlace =
									data.trip.stops.length > 0
										? data.trip.stops[data.trip.stops.length - 1].place.displayName
										: data.trip.origin.displayName}
								<div class="flex gap-4">
									<div class="flex flex-col items-center">
										<div class="rounded-full bg-destructive/10 p-2">
											<Flag class="size-4 fill-destructive text-destructive" />
										</div>
										<!-- No line for the last item -->
									</div>
									<div class="flex-1 pb-2">
										<a
											href={getDirectionsUrl(finalPrevPlace, data.trip.destination.displayName)}
											target="_blank"
											rel="noopener noreferrer"
											class="group block rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
										>
											<div class="flex items-center justify-between">
												<div>
													<h3 class="text-lg leading-none font-semibold group-hover:text-primary">
														Final Destination
													</h3>
													<p class="mt-2 text-muted-foreground">
														{data.trip.destination.displayName}
													</p>
												</div>
												<MapPin
													class="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
												/>
											</div>
										</a>
									</div>
								</div>
							{/if}
						</div>
					</Card.Content>
				</div>
			{/if}
		</Card.Root>
	</div>
</div>
