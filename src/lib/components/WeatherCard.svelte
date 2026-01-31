<script lang="ts">
	import {
		Sun,
		CloudSun,
		Cloud,
		CloudFog,
		CloudRain,
		Snowflake,
		CloudLightning,
		HelpCircle
	} from '@lucide/svelte';
	import {
		getWeatherInfo,
		formatTemperature,
		isWeatherForecastAvailable,
		type WeatherData
	} from '$lib/utils/weather';

	let { weather, tripDate }: { weather: WeatherData | null; tripDate: Date } = $props();

	const weatherInfo = $derived(weather ? getWeatherInfo(weather.weatherCode) : null);
	const isAvailable = $derived(isWeatherForecastAvailable(tripDate));
</script>

{#if weather && weatherInfo}
	<div class="flex items-center gap-2 text-sm text-muted-foreground">
		<div class="flex items-center">
			{#if weatherInfo.icon === 'Sun'}
				<Sun class="h-4 w-4 text-yellow-500" />
			{:else if weatherInfo.icon === 'CloudSun'}
				<CloudSun class="h-4 w-4 text-blue-400" />
			{:else if weatherInfo.icon === 'Cloud'}
				<Cloud class="h-4 w-4 text-gray-400" />
			{:else if weatherInfo.icon === 'CloudFog'}
				<CloudFog class="h-4 w-4 text-gray-400" />
			{:else if weatherInfo.icon === 'CloudRain'}
				<CloudRain class="h-4 w-4 text-blue-500" />
			{:else if weatherInfo.icon === 'CloudSnow' || weatherInfo.icon === 'Snowflake'}
				<Snowflake class="h-4 w-4 text-blue-300" />
			{:else if weatherInfo.icon === 'CloudLightning'}
				<CloudLightning class="h-4 w-4 text-yellow-600" />
			{:else}
				<HelpCircle class="h-4 w-4" />
			{/if}
		</div>
		<span class="font-medium">
			{formatTemperature(weather.tempMax)} / {formatTemperature(weather.tempMin)}
		</span>
		{#if weather.precipitation && weather.precipitation > 0}
			<span class="text-xs">💧 {weather.precipitation.toFixed(1)}mm</span>
		{/if}
	</div>
{:else if isAvailable}
	<span class="text-xs text-muted-foreground italic">Loading weather...</span>
{:else}
	<span class="text-xs text-muted-foreground italic">Weather unavailable</span>
{/if}
