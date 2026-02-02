<script lang="ts">
	import { browser } from '$app/environment';
	import { decodePolyline } from '$lib/utils/polyline';
	import { Map, TileLayer, Marker, Popup, Polyline } from 'sveaflet';
	interface Place {
		id: string;
		name: string;
		displayName: string;
		latitude: number | null;
		longitude: number | null;
	}

	interface Stop {
		placeId: string;
		order: number;
		place: Place;
	}

	interface Route {
		fromPlaceId: string;
		toPlaceId: string;
		distanceMeters: number;
		durationSeconds: number;
		polyline: string | null;
	}

	interface Props {
		origin: Place;
		destination: Place;
		stops: Stop[];
		routes: (Route | null)[];
	}

	// eslint-disable-next-line svelte/no-unused-props
	let { origin, destination, stops, routes }: Props = $props();

	let mapInstance: import('leaflet').Map | undefined = $state(undefined);
	let isFullscreen = $state(false);
	let isCollapsed = $state(false);

	function getDirectionsUrl(from: string, to: string) {
		return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`;
	}

	function toggleFullscreen() {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen();
			isFullscreen = true;
		} else {
			document.exitFullscreen();
			isFullscreen = false;
		}
	}

	// Handle fullscreen change
	$effect(() => {
		const handler = () => {
			isFullscreen = !!document.fullscreenElement;
			if (mapInstance) {
				setTimeout(() => mapInstance?.invalidateSize(), 100);
			}
		};
		document.addEventListener('fullscreenchange', handler);
		return () => document.removeEventListener('fullscreenchange', handler);
	});

	// Calculate all coordinates for bounds
	function getAllCoordinates(): [number, number][] {
		const coords: [number, number][] = [];
		if (origin.latitude && origin.longitude) {
			coords.push([origin.latitude, origin.longitude]);
		}
		stops.forEach((stop) => {
			if (stop.place.latitude && stop.place.longitude) {
				coords.push([stop.place.latitude, stop.place.longitude]);
			}
		});
		if (destination.latitude && destination.longitude) {
			coords.push([destination.latitude, destination.longitude]);
		}
		return coords;
	}

	// Fit map to bounds when map instance is ready
	$effect(() => {
		if (mapInstance) {
			const coords = getAllCoordinates();
			if (coords.length > 0) {
				const bounds = L.latLngBounds(coords);
				mapInstance.fitBounds(bounds, { padding: [50, 50] });
			}
		}
	});

	// Import L for bounds
	import * as L from 'leaflet';
</script>

<div class="map-card" class:fullscreen={isFullscreen}>
	<div class="map-header">
		<div>
			<h3 class="map-title">Trip Route</h3>
			<p class="map-subtitle">Interactive map showing your journey</p>
		</div>
		<div class="map-actions">
			<button
				class="action-btn"
				onclick={() => (isCollapsed = !isCollapsed)}
				aria-label={isCollapsed ? 'Expand map' : 'Collapse map'}
			>
				{#if isCollapsed}
					<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M6 9l6 6 6-6" />
					</svg>
				{:else}
					<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 15l-6-6-6 6" />
					</svg>
				{/if}
			</button>
			<button class="action-btn" onclick={toggleFullscreen} aria-label="Toggle fullscreen">
				{#if isFullscreen}
					<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path
							d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
						/>
					</svg>
				{:else}
					<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path
							d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
						/>
					</svg>
				{/if}
			</button>
		</div>
	</div>

	{#if !isCollapsed}
		<div class="map-wrapper">
			{#if browser}
				<Map
					options={{
						center:
							origin.latitude && origin.longitude
								? [origin.latitude, origin.longitude]
								: [39.8283, -98.5795], // Center of USA
						zoom: 4
					}}
					bind:instance={mapInstance}
				>
					<TileLayer
						url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
						options={{
							maxZoom: 19,
							attribution: '© OpenStreetMap contributors'
						}}
					/>

					<!-- Origin marker -->
					{#if origin.latitude && origin.longitude}
						<Marker latLng={[origin.latitude, origin.longitude]}>
							<Popup
								options={{
									content: `
									<div class="marker-popup">
										<strong>Starting Point</strong>
										<p>${origin.displayName}</p>
									</div>
								`
								}}
							/>
						</Marker>
					{/if}

					<!-- Stop markers -->
					{#each stops as stop, index (stop.placeId)}
						{#if stop.place.latitude && stop.place.longitude}
							{@const fromPlace = index === 0 ? origin : stops[index - 1].place}
							<Marker latLng={[stop.place.latitude, stop.place.longitude]}>
								<Popup
									options={{
										content: `
										<div class="marker-popup">
											<strong>Stop ${index + 1}</strong>
											<p>${stop.place.displayName}</p>
											<a href="${getDirectionsUrl(fromPlace.displayName, stop.place.displayName)}" target="_blank" rel="noopener noreferrer" class="directions-link">
												Get Directions
											</a>
										</div>
									`
									}}
								/>
							</Marker>
						{/if}
					{/each}

					<!-- Destination marker -->
					{#if destination.latitude && destination.longitude}
						{@const fromPlace = stops.length > 0 ? stops[stops.length - 1].place : origin}
						<Marker latLng={[destination.latitude, destination.longitude]}>
							<Popup
								options={{
									content: `
									<div class="marker-popup">
										<strong>Final Destination</strong>
										<p>${destination.displayName}</p>
										<a href="${getDirectionsUrl(fromPlace.displayName, destination.displayName)}" target="_blank" rel="noopener noreferrer" class="directions-link">
											Get Directions
										</a>
									</div>
								`
								}}
							/>
						</Marker>
					{/if}

					<!-- Route polylines -->
					{#each routes as route, routeIndex (routeIndex)}
						{#if route?.polyline}
							{@const decodedCoords = decodePolyline(route.polyline)}
							{#if decodedCoords.length > 0}
								<Polyline
									latLngs={decodedCoords}
									options={{
										color: '#3b82f6',
										weight: 4,
										opacity: 0.8,
										smoothFactor: 1
									}}
								/>
							{/if}
						{/if}
					{/each}
				</Map>
			{/if}
		</div>
	{/if}
</div>

<style>
	.map-card {
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		background-color: hsl(var(--card));
		overflow: hidden;
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 400px;
	}

	.map-card.fullscreen {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 9999;
		border-radius: 0;
		min-height: 100vh;
	}

	.map-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1.5rem;
		border-bottom: 1px solid hsl(var(--border));
	}

	.map-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		color: hsl(var(--card-foreground));
	}

	.map-subtitle {
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		margin: 0.25rem 0 0 0;
	}

	.map-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: var(--radius);
		display: flex;
		align-items: center;
		justify-content: center;
		color: hsl(var(--muted-foreground));
		transition: all 0.2s;
	}

	.action-btn:hover {
		background-color: hsl(var(--accent));
		color: hsl(var(--accent-foreground));
	}

	.icon {
		width: 1rem;
		height: 1rem;
	}

	.map-wrapper {
		flex: 1;
		min-height: 350px;
		position: relative;
	}

	.map-card.fullscreen .map-wrapper {
		min-height: calc(100vh - 80px);
	}

	:global(.marker-popup) {
		text-align: center;
		min-width: 200px;
	}

	:global(.marker-popup strong) {
		display: block;
		margin-bottom: 0.5rem;
		color: hsl(var(--foreground));
	}

	:global(.marker-popup p) {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
	}

	:global(.directions-link) {
		display: inline-block;
		color: hsl(var(--primary));
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
	}

	:global(.directions-link:hover) {
		text-decoration: underline;
	}

	:global(.marker-pin) {
		width: 30px;
		height: 42px;
		border-radius: 50% 50% 50% 0;
		position: relative;
		transform: rotate(-45deg);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	:global(.origin-pin) {
		background: #3b82f6;
	}

	:global(.origin-pin::after) {
		content: '';
		width: 10px;
		height: 10px;
		background: white;
		border-radius: 50%;
	}

	:global(.stop-pin) {
		background: #6b7280;
		color: white;
		font-size: 12px;
		font-weight: bold;
		transform: rotate(-45deg);
	}

	:global(.stop-pin span) {
		transform: rotate(45deg);
	}

	:global(.destination-pin) {
		background: #ef4444;
	}

	:global(.destination-pin::after) {
		content: '';
		width: 10px;
		height: 10px;
		background: white;
		border-radius: 50%;
	}

	:global(.custom-marker) {
		background: transparent !important;
		border: none !important;
	}
</style>
