<script lang="ts">
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Check, ChevronsUpDown, Loader2 } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let { value = $bindable(''), onSelect } = $props<{
		value?: string;
		onSelect?: (place: { name: string; display_name: string; lat: number; lon: number }) => void;
	}>();

	let open = $state(false);
	let searchValue = $state('');
	let results = $state<any[]>([]);
	let loading = $state(false);
	let error = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	async function handleSearch(q: string) {
		if (q.length < 3) {
			results = [];
			error = false;
			return;
		}

		loading = true;
		error = false;
		try {
			const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
			if (res.ok) {
				results = await res.json();
			} else {
				error = true;
				results = [];
			}
		} catch (e) {
			console.error(e);
			error = true;
			results = [];
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		clearTimeout(debounceTimer);
		if (searchValue) {
			debounceTimer = setTimeout(() => {
				handleSearch(searchValue);
			}, 500);
		} else {
			results = [];
		}
	});

	function closeAndSelect(place: any) {
		value = place.display_name;
		open = false;
		if (onSelect) {
			onSelect({
				name: place.name || place.display_name.split(',')[0],
				display_name: place.display_name,
				lat: place.lat,
				lon: place.lon
			});
		}
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				variant="outline"
				role="combobox"
				aria-expanded={open}
				class="w-full justify-between"
				{...props}
			>
				{value || 'Search for a place...'}
				<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[400px] p-0">
		<Command.Root shouldFilter={false}>
			<Command.Input placeholder="Type a city or address..." bind:value={searchValue} />
			<Command.List>
				{#if loading}
					<div class="flex items-center justify-center p-4">
						<Loader2 class="h-4 w-4 animate-spin" />
					</div>
				{:else if error}
					<div class="p-4 text-center text-sm text-destructive">
						Search failed. Please check your connection.
					</div>
				{:else if results.length === 0}
					<Command.Empty>No results found.</Command.Empty>
				{:else}
					<Command.Group>
						{#each results as place (place.place_id || place.display_name)}
							<Command.Item value={place.display_name} onSelect={() => closeAndSelect(place)}>
								<Check
									class={cn(
										'mr-2 h-4 w-4',
										value === place.display_name ? 'opacity-100' : 'opacity-0'
									)}
								/>
								<span class="truncate">{place.display_name}</span>
							</Command.Item>
						{/each}
					</Command.Group>
				{/if}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
