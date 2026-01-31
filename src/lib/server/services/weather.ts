import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import type { WeatherData } from '$lib/utils/weather';
import { isWeatherForecastAvailable } from '$lib/utils/weather';

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

export async function fetchWeatherFromAPI(
	lat: number,
	lon: number,
	startDate: string,
	endDate: string
): Promise<WeatherData[]> {
	const url = new URL(WEATHER_API_URL);
	url.searchParams.append('latitude', lat.toString());
	url.searchParams.append('longitude', lon.toString());
	url.searchParams.append('start_date', startDate);
	url.searchParams.append('end_date', endDate);
	url.searchParams.append(
		'daily',
		'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum'
	);
	url.searchParams.append('timezone', 'auto');

	console.log('Fetching weather from:', url.toString());

	const response = await fetch(url.toString());
	if (!response.ok) {
		const errorText = await response.text();
		console.error('Weather API error:', response.status, errorText);
		throw new Error(`Weather API error: ${response.status} - ${errorText}`);
	}

	const data = await response.json();
	const daily = data.daily;

	const weatherData: WeatherData[] = [];
	for (let i = 0; i < daily.time.length; i++) {
		weatherData.push({
			placeId: '', // Will be set by caller
			date: new Date(daily.time[i]),
			tempMax: daily.temperature_2m_max[i],
			tempMin: daily.temperature_2m_min[i],
			weatherCode: daily.weather_code[i],
			precipitation: daily.precipitation_sum[i]
		});
	}

	return weatherData;
}

export async function getCachedWeather(placeId: string, date: Date): Promise<WeatherData | null> {
	const cached = await db
		.select()
		.from(schema.weatherCache)
		.where(and(eq(schema.weatherCache.placeId, placeId), eq(schema.weatherCache.date, date)));

	if (cached.length === 0) return null;

	// Check if cache is older than 24 hours
	const cacheAge = Date.now() - new Date(cached[0].updatedAt).getTime();
	if (cacheAge > 24 * 60 * 60 * 1000) {
		return null; // Cache expired
	}

	return {
		placeId: cached[0].placeId,
		date: cached[0].date,
		tempMax: cached[0].tempMax,
		tempMin: cached[0].tempMin,
		weatherCode: cached[0].weatherCode,
		precipitation: cached[0].precipitation
	};
}

export async function cacheWeather(weatherData: WeatherData): Promise<void> {
	await db
		.insert(schema.weatherCache)
		.values({
			placeId: weatherData.placeId,
			date: weatherData.date,
			tempMax: weatherData.tempMax,
			tempMin: weatherData.tempMin,
			weatherCode: weatherData.weatherCode,
			precipitation: weatherData.precipitation,
			updatedAt: new Date()
		})
		.onConflictDoUpdate({
			target: [schema.weatherCache.placeId, schema.weatherCache.date],
			set: {
				tempMax: weatherData.tempMax,
				tempMin: weatherData.tempMin,
				weatherCode: weatherData.weatherCode,
				precipitation: weatherData.precipitation,
				updatedAt: new Date()
			}
		});
}

export async function getWeatherForPlace(
	placeId: string,
	lat: number,
	lon: number,
	date: Date
): Promise<WeatherData | null> {
	// Validate coordinates
	if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
		console.log('Invalid coordinates for place:', placeId, { lat, lon });
		return null;
	}

	// Check cache first
	const cached = await getCachedWeather(placeId, date);
	if (cached) return cached;

	// Check if forecast is available for this date
	if (!isWeatherForecastAvailable(date)) {
		console.log('Date not within forecast window:', date);
		return null;
	}

	try {
		// Format date as YYYY-MM-DD
		// Handle both Date objects and date strings from the database
		const dateObj = date instanceof Date ? date : new Date(date);
		const year = dateObj.getFullYear();
		const month = String(dateObj.getMonth() + 1).padStart(2, '0');
		const day = String(dateObj.getDate()).padStart(2, '0');
		const dateStr = `${year}-${month}-${day}`;

		console.log('Formatting date for weather:', { input: date, formatted: dateStr, lat, lon });

		// Fetch from API
		const weatherData = await fetchWeatherFromAPI(lat, lon, dateStr, dateStr);

		if (weatherData.length === 0) return null;

		// Cache and return the data
		const data = { ...weatherData[0], placeId };
		await cacheWeather(data);
		return data;
	} catch (error) {
		console.error('Failed to fetch weather:', error);
		return null;
	}
}

export async function getWeatherForTrip(
	tripDate: Date,
	places: Array<{
		id: string;
		latitude: number | null;
		longitude: number | null;
	}>
): Promise<Map<string, WeatherData>> {
	const weatherMap = new Map<string, WeatherData>();

	// Check if forecast is available
	if (!isWeatherForecastAvailable(tripDate)) {
		return weatherMap;
	}

	// Process each place
	for (const place of places) {
		if (!place.latitude || !place.longitude) continue;

		const weather = await getWeatherForPlace(place.id, place.latitude, place.longitude, tripDate);

		if (weather) {
			weatherMap.set(place.id, weather);
		}
	}

	return weatherMap;
}
