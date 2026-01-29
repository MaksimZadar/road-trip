<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { CalendarIcon, MapPin, ArrowRight, Plus } from '@lucide/svelte';
	import { DateFormatter } from '@internationalized/date';

	let { data } = $props();

	const df = new DateFormatter('en-US', {
		dateStyle: 'medium'
	});

	function togglePast(checked: boolean) {
		const url = new URL(page.url);
		if (checked) {
			url.searchParams.set('showPast', 'true');
		} else {
			url.searchParams.delete('showPast');
		}
		goto(url.toString());
	}
</script>

<div class="container mx-auto py-10">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">My Road Trips</h1>
			<p class="text-muted-foreground">Manage and view your upcoming adventures.</p>
		</div>
		<Button href="/trips/new">
			<Plus class="mr-2 h-4 w-4" />
			New Trip
		</Button>
	</div>

	<div class="mb-6 flex items-center space-x-2">
		<input
			type="checkbox"
			id="show-past"
			checked={data.showPast}
			onchange={(e) => togglePast(e.currentTarget.checked)}
			class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
		/>
		<label
			for="show-past"
			class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
		>
			Show past trips
		</label>
	</div>

	{#if data.trips.length === 0}
		<Card.Root>
			<Card.Content class="py-10 text-center">
				<p class="text-muted-foreground">No road trips found. Time to plan one!</p>
				<Button variant="outline" class="mt-4" href="/trips/new">Create your first trip</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each data.trips as trip (trip.id)}
				<Card.Root class="overflow-hidden transition-shadow hover:shadow-md">
					<Card.Header class="pb-3">
						<Card.Title>{trip.title}</Card.Title>
						<Card.Description class="flex items-center">
							<CalendarIcon class="mr-1 h-3.5 w-3.5" />
							{df.format(new Date(trip.plannedDate))}
						</Card.Description>
					</Card.Header>
					<Card.Content class="pb-3">
						{#if trip.description}
							<p class="mb-4 line-clamp-2 text-sm text-muted-foreground">{trip.description}</p>
						{/if}
						<div class="flex items-center text-sm">
							<div class="flex items-center font-medium">
								<MapPin class="mr-1 h-3.5 w-3.5 text-primary" />
								<span class="max-w-[100px] truncate">{trip.origin.displayName.split(',')[0]}</span>
							</div>
							<ArrowRight class="mx-2 h-3.5 w-3.5 text-muted-foreground" />
							<div class="flex items-center font-medium">
								<MapPin class="mr-1 h-3.5 w-3.5 text-primary" />
								<span class="max-w-[100px] truncate"
									>{trip.destination.displayName.split(',')[0]}</span
								>
							</div>
						</div>
					</Card.Content>
					<Card.Footer class="pt-3">
						<Button variant="secondary" size="sm" class="w-full" href="/trips/{trip.id}">
							View Details
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
