<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import PlaceSearch from '$lib/components/PlaceSearch.svelte';
	import { CalendarIcon, Plus, Trash2, ChevronLeft } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import { DateFormatter, type DateValue, getLocalTimeZone, today } from '@internationalized/date';

	const df = new DateFormatter('en-US', {
		dateStyle: 'long'
	});

	let title = $state('');
	let description = $state('');
	let plannedDate = $state<DateValue | undefined>(today(getLocalTimeZone()));

	let origin = $state({ name: '', displayName: '', lat: 0, lon: 0 });
	let destination = $state({ name: '', displayName: '', lat: 0, lon: 0 });
	let stops = $state<{ name: string; displayName: string; lat: number; lon: number }[]>([]);

	function addStop() {
		stops = [...stops, { name: '', displayName: '', lat: 0, lon: 0 }];
	}

	function removeStop(index: number) {
		stops = stops.filter((_, i) => i !== index);
	}

	function setOrigin(place: { name: string; display_name: string; lat: number; lon: number }) {
		origin = { name: place.name, displayName: place.display_name, lat: place.lat, lon: place.lon };
	}

	function setDestination(place: { name: string; display_name: string; lat: number; lon: number }) {
		destination = {
			name: place.name,
			displayName: place.display_name,
			lat: place.lat,
			lon: place.lon
		};
	}

	function setStop(
		index: number,
		place: { name: string; display_name: string; lat: number; lon: number }
	) {
		stops[index] = {
			name: place.name,
			displayName: place.display_name,
			lat: place.lat,
			lon: place.lon
		};
	}
</script>

<div class="container mx-auto max-w-2xl py-10">
	<div class="mb-6">
		<Button variant="ghost" href="/trips" class="pl-0 hover:bg-transparent">
			<ChevronLeft class="mr-1 h-4 w-4" />
			Back to Trips
		</Button>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Create New Road Trip</Card.Title>
			<Card.Description>Plan your next adventure. Fill in the details below.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" class="space-y-6">
				<div class="space-y-2">
					<Label for="title">Trip Title</Label>
					<Input
						id="title"
						name="title"
						placeholder="Summer Road Trip 2026"
						required
						bind:value={title}
					/>
				</div>

				<div class="space-y-2">
					<Label for="description">Description (Optional)</Label>
					<Textarea
						id="description"
						name="description"
						placeholder="A trip across the coast..."
						bind:value={description}
					/>
				</div>

				<div class="flex flex-col space-y-2">
					<Label>Planned Date</Label>
					<input type="hidden" name="plannedDate" value={plannedDate?.toString()} />
					<Popover.Root>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button
									variant="outline"
									class={cn(
										'w-full justify-start text-left font-normal',
										!plannedDate && 'text-muted-foreground'
									)}
									{...props}
								>
									<CalendarIcon class="mr-2 h-4 w-4" />
									{plannedDate ? df.format(plannedDate.toDate(getLocalTimeZone())) : 'Pick a date'}
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0">
							<Calendar type="single" bind:value={plannedDate} initialFocus />
						</Popover.Content>
					</Popover.Root>
				</div>

				<div class="space-y-4 border-t pt-4">
					<div class="space-y-2">
						<Label>Starting Point</Label>
						<input type="hidden" name="originName" value={origin.name} />
						<input type="hidden" name="originDisplayName" value={origin.displayName} />
						<input type="hidden" name="originLat" value={origin.lat} />
						<input type="hidden" name="originLon" value={origin.lon} />
						<PlaceSearch onSelect={setOrigin} />
					</div>

					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<Label>Stops</Label>
							<Button type="button" variant="outline" size="sm" onclick={addStop}>
								<Plus class="mr-2 h-4 w-4" />
								Add Stop
							</Button>
						</div>

						{#if stops.length === 0}
							<p class="text-sm text-muted-foreground italic">No stops added yet.</p>
						{/if}

						<div class="space-y-3">
							{#each stops as stop, i (i)}
								<div class="flex items-start gap-2">
									<div class="grow">
										<input type="hidden" name="stopName" value={stop.name} />
										<input type="hidden" name="stopDisplayName" value={stop.displayName} />
										<input type="hidden" name="stopLat" value={stop.lat} />
										<input type="hidden" name="stopLon" value={stop.lon} />
										<PlaceSearch onSelect={(p) => setStop(i, p)} />
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onclick={() => removeStop(i)}
										class="text-destructive"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							{/each}
						</div>
					</div>

					<div class="space-y-2">
						<Label>Destination</Label>
						<input type="hidden" name="destinationName" value={destination.name} />
						<input type="hidden" name="destinationDisplayName" value={destination.displayName} />
						<input type="hidden" name="destinationLat" value={destination.lat} />
						<input type="hidden" name="destinationLon" value={destination.lon} />
						<PlaceSearch onSelect={setDestination} />
					</div>
				</div>

				<Card.Footer class="px-0 pt-6">
					<Button type="submit" class="w-full">Create Trip</Button>
				</Card.Footer>
			</form>
		</Card.Content>
	</Card.Root>
</div>
