<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { CalendarIcon, MapPin, ChevronLeft, Navigation, Flag, Circle } from '@lucide/svelte';
	import { DateFormatter } from '@internationalized/date';

	let { data } = $props();

	const df = new DateFormatter('en-US', {
		dateStyle: 'full'
	});
</script>

<div class="container mx-auto max-w-3xl py-10">
	<div class="mb-6">
		<Button variant="ghost" href="/trips" class="pl-0 hover:bg-transparent">
			<ChevronLeft class="mr-1 h-4 w-4" />
			Back to Trips
		</Button>
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
				<Card.Title>Route Timeline</Card.Title>
				<Card.Description>Your journey from start to finish.</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-3">
					<!-- Origin -->
					<div class="flex items-start gap-2">
						<div>
							<h3 class="text-lg leading-none font-semibold">Starting Point</h3>
							<p class="mt-2 text-muted-foreground">{data.trip.origin.displayName}</p>
						</div>
					</div>

					<!-- Stops -->
					{#each data.trip.stops as stop (stop.placeId)}
						<div class="flex items-start gap-2">
							<div>
								<h3 class="text-base leading-none font-medium">Stop {stop.order + 1}</h3>
								<p class="text-sm text-muted-foreground">{stop.place.displayName}</p>
							</div>
						</div>
					{/each}

					<!-- Destination -->
					<div class="flex items-start gap-2">
						<div>
							<h3 class="text-lg leading-none font-semibold">Final Destination</h3>
							<p class="mt-2 text-muted-foreground">{data.trip.destination.displayName}</p>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
