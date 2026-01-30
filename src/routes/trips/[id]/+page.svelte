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
		Route,
		Plus,
		Check
	} from '@lucide/svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { DateFormatter } from '@internationalized/date';
	import { slide } from 'svelte/transition';
	import { SvelteMap } from 'svelte/reactivity';

	let { data } = $props();
	let isTimelineCollapsed = $state(false);
	let isChecklistCollapsed = $state(false);
	let showNewCategoryInput = $state(false);
	let selectedCategoryId = $state('');

	const itemsByCategory = $derived.by(() => {
		const items = data.trip.checklist;
		const categories = data.categories;

		const grouped = new SvelteMap<string | null, typeof items>();

		items.forEach((item) => {
			const catId = item.categoryId || null;
			if (!grouped.has(catId)) {
				grouped.set(catId, []);
			}
			grouped.get(catId)!.push(item);
		});

		const result: { id: string; name: string; items: typeof items; allChecked: boolean }[] = [];

		// First, add categorized items in order of categories
		categories.forEach((cat) => {
			const catItems = grouped.get(cat.id);
			if (catItems && catItems.length > 0) {
				result.push({
					id: cat.id,
					name: cat.name,
					items: catItems,
					allChecked: catItems.every((item) => item.checked)
				});
			}
		});

		// Then, add uncategorized items
		const uncategorizedItems = grouped.get(null);
		if (uncategorizedItems && uncategorizedItems.length > 0) {
			result.push({
				id: 'none',
				name: 'Uncategorized',
				items: uncategorizedItems,
				allChecked: uncategorizedItems.every((item) => item.checked)
			});
		}

		return result;
	});

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

		<Card.Root>
			<Card.Header>
				<div class="flex items-start justify-between">
					<div class="space-y-1.5">
						<Card.Title>Road Trip Checklist</Card.Title>
						<Card.Description>Don't forget the essentials for your journey.</Card.Description>
					</div>
					<Card.Action>
						<Button
							variant="ghost"
							size="icon"
							onclick={() => (isChecklistCollapsed = !isChecklistCollapsed)}
							aria-label={isChecklistCollapsed ? 'Expand checklist' : 'Collapse checklist'}
						>
							{#if isChecklistCollapsed}
								<ChevronDown class="h-4 w-4" />
							{:else}
								<ChevronUp class="h-4 w-4" />
							{/if}
						</Button>
					</Card.Action>
				</div>
			</Card.Header>
			{#if !isChecklistCollapsed}
				<div transition:slide>
					<Card.Content>
						<div class="space-y-4">
							<form
								action="?/addChecklistItem"
								method="POST"
								use:enhance={() => {
									return async ({ update }) => {
										await update();
										showNewCategoryInput = false;
										selectedCategoryId = '';
									};
								}}
								class="space-y-2"
							>
								<div class="flex gap-2">
									<Input name="item" placeholder="Add new item..." required />
									{#if showNewCategoryInput}
										<Input name="newCategory" placeholder="New category name..." required />
										<Button
											type="button"
											size="icon"
											variant="outline"
											onclick={() => {
												showNewCategoryInput = false;
												selectedCategoryId = '';
											}}
										>
											<ChevronLeft class="h-4 w-4" />
										</Button>
									{:else}
										<Select.Root
											type="single"
											bind:value={selectedCategoryId}
											onValueChange={(v) => {
												showNewCategoryInput = v === 'new';
											}}
										>
											<Select.Trigger class="w-50">
												{data.categories.find((c) => c.id === selectedCategoryId)?.name ??
													(selectedCategoryId === 'new' ? 'Add New Category...' : 'No Category')}
											</Select.Trigger>
											<Select.Content>
												<Select.Item value="">No Category</Select.Item>
												{#each data.categories as cat (cat.id)}
													<Select.Item value={cat.id}>{cat.name}</Select.Item>
												{/each}
												<Select.Separator />
												<Select.Item value="new">+ Add New Category...</Select.Item>
											</Select.Content>
											<input
												type="hidden"
												name="categoryId"
												value={selectedCategoryId === 'new' ? '' : selectedCategoryId}
											/>
										</Select.Root>
									{/if}
									<Input
										name="count"
										type="number"
										placeholder="Qty"
										class="max-w-20 min-w-20"
										min="1"
										value="1"
									/>
									<Button type="submit" size="icon" variant="outline">
										<Plus class="h-4 w-4" />
									</Button>
								</div>
							</form>

							<div class="space-y-6">
								{#each itemsByCategory as group (group.id)}
									<div class="space-y-3">
										<div class="flex items-center gap-2 px-1">
											<h4 class="text-sm font-semibold text-muted-foreground">{group.name}</h4>
											{#if group.allChecked}
												<Check class="h-4 w-4 text-primary" />
											{/if}
										</div>
										<div class="space-y-2">
											{#each group.items as item (item.id)}
												<div class="flex flex-col rounded-lg border p-3">
													<div class="flex items-center justify-between gap-2">
														<div class="flex flex-1 items-center gap-3">
															<form action="?/toggleChecklistItem" method="POST" use:enhance>
																<input type="hidden" name="id" value={item.id} />
																<input type="hidden" name="checked" value={!item.checked} />
																<Checkbox
																	checked={item.checked ?? false}
																	onCheckedChange={() => {
																		const form = document
																			.querySelector(
																				`form[action="?/toggleChecklistItem"] input[name="id"][value="${item.id}"]`
																			)
																			?.closest('form');
																		if (form) form.requestSubmit();
																	}}
																/>
															</form>
															<span
																class={item.checked ? 'text-muted-foreground line-through' : ''}
															>
																{item.item}
															</span>
														</div>

														<div class="flex items-center gap-2">
															<form
																action="?/updateChecklistItemCategory"
																method="POST"
																use:enhance
															>
																<input type="hidden" name="id" value={item.id} />
																<Select.Root
																	type="single"
																	disabled={item.checked ?? false}
																	value={item.categoryId ?? ''}
																	onValueChange={(v) => {
																		const form = document
																			.querySelector(
																				`form[action="?/updateChecklistItemCategory"] input[name="id"][value="${item.id}"]`
																			)
																			?.closest('form');
																		if (form) {
																			// Create a temporary hidden input for the categoryId since Select doesn't use a real select
																			let input = form.querySelector(
																				'input[name="categoryId"]'
																			) as HTMLInputElement;
																			if (!input) {
																				input = document.createElement('input');
																				input.type = 'hidden';
																				input.name = 'categoryId';
																				form.appendChild(input);
																			}
																			input.value = v;
																			form.requestSubmit();
																		}
																	}}
																>
																	<Select.Trigger
																		class="h-7 px-2 py-0 text-xs text-muted-foreground"
																	>
																		{data.categories.find((c) => c.id === item.categoryId)?.name ??
																			'No Category'}
																	</Select.Trigger>
																	<Select.Content>
																		<Select.Item value="">No Category</Select.Item>
																		{#each data.categories as cat (cat.id)}
																			<Select.Item value={cat.id}>{cat.name}</Select.Item>
																		{/each}
																	</Select.Content>
																</Select.Root>
															</form>
														</div>

														<div class="flex items-center gap-2">
															<form action="?/updateChecklistItemCount" method="POST" use:enhance>
																<input type="hidden" name="id" value={item.id} />
																<Input
																	name="count"
																	type="number"
																	value={item.count}
																	min="1"
																	disabled={item.checked}
																	class="h-8 w-16 text-center"
																	onchange={(e) => {
																		e.currentTarget.closest('form')?.requestSubmit();
																	}}
																/>
															</form>

															<form action="?/deleteChecklistItem" method="POST" use:enhance>
																<input type="hidden" name="id" value={item.id} />
																<Button
																	type="submit"
																	variant="ghost"
																	size="icon"
																	class="text-muted-foreground hover:text-destructive"
																>
																	<Trash2 class="h-4 w-4" />
																</Button>
															</form>
														</div>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{:else}
									<p class="py-4 text-center text-sm text-muted-foreground">
										No items in your checklist.
									</p>
								{/each}
							</div>
						</div>
					</Card.Content>
				</div>
			{/if}
		</Card.Root>
	</div>
</div>
