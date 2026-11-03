<script lang="ts">
	import { browser } from '$app/environment';
	import { decodePolyline } from '$lib/utils/polyline';
	import { Map, TileLayer, Marker, Popup, Polyline } from 'sveaflet';
	import * as L from 'leaflet';
	import LocateFixed from '@lucide/svelte/icons/locate-fixed';

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

	type StopStatus = 'done' | 'next' | 'upcoming';

	interface Props {
		origin: Place;
		destination: Place;
		stops: Stop[];
		routes: (Route | null)[];
		/** Per-stop status (same order as `stops`). Missing entries count as upcoming. */
		stopStatuses?: StopStatus[];
		/** Per-leg flag (same order as `routes`). True = already driven. */
		legDriven?: boolean[];
	}

	// eslint-disable-next-line svelte/no-unused-props
	let { origin, destination, stops, routes, stopStatuses = [], legDriven = [] }: Props = $props();

	let mapInstance: import('leaflet').Map | undefined = $state(undefined);

	// Palette (Leaflet html / polyline options can't use Tailwind classes)
	const INK = 'var(--border)';
	const PAPER = 'var(--card)';
	const TEAL = 'var(--secondary)';
	const TERRACOTTA = 'var(--primary)';
	const MUSTARD = 'var(--accent)';
	const CREAM = 'var(--background)';

	function getDirectionsUrl(from: string, to: string) {
		return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`;
	}

	function escapeHtml(value: string) {
		return value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function labelChip(text: string, fontSize: number, extra = '') {
		return `<div style="position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:6px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:${PAPER};color:${INK};border:2px solid ${INK};border-radius:8px;box-shadow:2px 2px 0 0 ${INK};padding:1px 6px;font-size:${fontSize}px;font-weight:700;line-height:1.3;${extra}">${escapeHtml(text)}</div>`;
	}

	function circlePin(size: number, inner: string, style: string, label: string, halo = '') {
		return L.divIcon({
			className: 'trip-pin',
			iconSize: [size, size],
			iconAnchor: [size / 2, size / 2],
			popupAnchor: [0, -size / 2],
			html: `<div style="position:relative;width:${size}px;height:${size}px;">${halo}<div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;border:2px solid ${INK};box-shadow:3px 3px 0 0 ${INK};font-weight:700;${style}">${inner}</div>${label}</div>`
		});
	}

	function originIcon() {
		return circlePin(
			28,
			`<span style="width:8px;height:8px;border-radius:9999px;background:${PAPER};"></span>`,
			`background:${TEAL};`,
			labelChip("You're here", 10, 'text-transform:uppercase;letter-spacing:0.08em;')
		);
	}

	function stopIcon(stop: Stop, status: StopStatus) {
		const number = String(stop.order + 1);
		if (status === 'next') {
			const halo = `<div style="position:absolute;inset:0;border-radius:9999px;border:3px solid ${MUSTARD};opacity:0.5;transform:scale(1.6);"></div>`;
			return circlePin(
				36,
				number,
				`background:${MUSTARD};color:${INK};font-size:16px;`,
				labelChip(stop.place.displayName, 11),
				halo
			);
		}
		if (status === 'done') {
			return circlePin(28, '&#10003;', `background:${TEAL};color:${CREAM};font-size:14px;`, '');
		}
		return circlePin(28, number, `background:${PAPER};color:${INK};font-size:13px;`, '');
	}

	function destinationIcon() {
		return circlePin(
			30,
			'&#9656;',
			`background:${TERRACOTTA};color:${PAPER};font-size:14px;box-shadow:inset 0 0 0 3px ${PAPER},3px 3px 0 0 ${INK};`,
			''
		);
	}

	function popupHtml(kicker: string, name: string, link?: string) {
		return `<div class="trip-popup"><div class="trip-popup-kicker">${escapeHtml(kicker)}</div><div class="trip-popup-name">${escapeHtml(name)}</div>${
			link
				? `<a href="${link}" target="_blank" rel="noopener noreferrer" class="trip-popup-link">Get directions</a>`
				: ''
		}</div>`;
	}

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

	function recenter() {
		const coords = getAllCoordinates();
		if (!mapInstance || coords.length === 0) return;
		mapInstance.fitBounds(L.latLngBounds(coords), {
			// Reserve space for the floating pill (top) and the next-stop sheet (bottom)
			paddingTopLeft: [40, 70],
			paddingBottomRight: [40, 260]
		});
	}

	// Fit map to bounds when map instance is ready
	$effect(() => {
		if (mapInstance) recenter();
	});
</script>

<div class="absolute inset-0">
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
					url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}
					options={{
						maxZoom: 19,
						attribution: '© OpenStreetMap contributors'
					}}
				/>

				<!-- Route polylines (under the pins) -->
				{#each routes as route, routeIndex (routeIndex)}
					{#if route?.polyline}
						{@const decodedCoords = decodePolyline(route.polyline)}
						{@const driven = legDriven[routeIndex] === true}
						{#if decodedCoords.length > 0}
							<Polyline
								latLngs={decodedCoords}
								options={driven
									? { color: '#3FA39B', weight: 5, opacity: 0.9, smoothFactor: 1 }
									: {
											color: '#B4492A',
											weight: 4,
											opacity: 0.85,
											dashArray: '8 10',
											smoothFactor: 1
										}}
							/>
						{/if}
					{/if}
				{/each}

				<!-- Origin marker -->
				{#if origin.latitude && origin.longitude}
					<Marker
						latLng={[origin.latitude, origin.longitude]}
						options={{ icon: originIcon(), zIndexOffset: 100, title: origin.displayName }}
					/>
				{/if}

				<!-- Stop markers -->
				{#each stops as stop, index (stop.placeId)}
					{#if stop.place.latitude && stop.place.longitude}
						{@const fromPlace = index === 0 ? origin : stops[index - 1].place}
						{@const status = stopStatuses[index] ?? 'upcoming'}
						<Marker
							latLng={[stop.place.latitude, stop.place.longitude]}
							options={{
								icon: stopIcon(stop, status),
								zIndexOffset: status === 'next' ? 1000 : status === 'done' ? 150 : 200,
								title: stop.place.displayName
							}}
						>
							<Popup
								options={{
									content: popupHtml(
										`Stop ${stop.order + 1}`,
										stop.place.displayName,
										getDirectionsUrl(fromPlace.displayName, stop.place.displayName)
									)
								}}
							/>
						</Marker>
					{/if}
				{/each}

				<!-- Destination marker -->
				{#if destination.latitude && destination.longitude}
					{@const fromPlace = stops.length > 0 ? stops[stops.length - 1].place : origin}
					<Marker
						latLng={[destination.latitude, destination.longitude]}
						options={{ icon: destinationIcon(), zIndexOffset: 300, title: destination.displayName }}
					>
						<Popup
							options={{
								content: popupHtml(
									'Final destination',
									destination.displayName,
									getDirectionsUrl(fromPlace.displayName, destination.displayName)
								)
							}}
						/>
					</Marker>
				{/if}
			</Map>
		{/if}
	</div>

	<button
		type="button"
		onclick={recenter}
		aria-label="Recenter map"
		class="absolute top-3 right-3 z-20 flex size-11 items-center justify-center rounded-full border-2 border-border bg-card shadow-hard transition-transform active:translate-y-0.5"
	>
		<LocateFixed class="size-5 text-deep-teal" />
	</button>
</div>

<style>
	.map-wrapper {
		/* One-place tweak for the retro tint (OSM tiles are more colourful than Positron) */
		--map-tile-filter: sepia(0.3) saturate(0.8) hue-rotate(-10deg) brightness(1.02) contrast(0.95);
		position: relative;
		isolation: isolate;
		width: 100%;
		height: 100%;
		background: var(--sand);
	}

	:global(.dark) .map-wrapper {
		--map-tile-filter: invert(0.9) hue-rotate(180deg) sepia(0.2) saturate(0.35) brightness(0.85)
			contrast(0.85);
	}

	.map-wrapper :global(.leaflet-container) {
		width: 100%;
		height: 100%;
		background: var(--sand);
		font-family: inherit;
	}

	.map-wrapper :global(.leaflet-tile-pane) {
		filter: var(--map-tile-filter);
	}

	.map-wrapper :global(.trip-pin) {
		background: transparent;
		border: none;
		overflow: visible;
	}

	.map-wrapper :global(.leaflet-control-attribution) {
		background: var(--card);
		color: var(--foreground);
		border-top: 2px solid var(--border);
		border-left: 2px solid var(--border);
		border-top-left-radius: 8px;
	}

	.map-wrapper :global(.leaflet-control-attribution a) {
		color: var(--deep-teal);
	}

	.map-wrapper :global(.leaflet-control-zoom) {
		display: none;
	}

	.map-wrapper :global(.leaflet-popup-content-wrapper) {
		background: var(--card);
		color: var(--foreground);
		border: 2px solid var(--border);
		border-radius: 10px;
		box-shadow: 3px 3px 0 0 var(--border);
	}

	.map-wrapper :global(.leaflet-popup-content) {
		margin: 10px 14px;
	}

	.map-wrapper :global(.leaflet-popup-tip) {
		background: var(--card);
		border: 2px solid var(--border);
		box-shadow: none;
	}

	.map-wrapper :global(.leaflet-popup-close-button) {
		color: var(--foreground);
	}

	.map-wrapper :global(.trip-popup-kicker) {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}

	.map-wrapper :global(.trip-popup-name) {
		margin-top: 2px;
		font-size: 15px;
		font-weight: 700;
		color: var(--deep-teal);
	}

	.map-wrapper :global(.trip-popup-link) {
		display: inline-block;
		margin-top: 6px;
		font-size: 14px;
		font-weight: 700;
		color: var(--primary);
		text-decoration: underline;
	}
</style>
