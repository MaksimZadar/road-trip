export interface WeatherData {
	placeId: string;
	date: Date;
	tempMax: number | null;
	tempMin: number | null;
	weatherCode: number | null;
	precipitation: number | null;
}

// Weather code mapping to Lucide icon names and descriptions
export const weatherCodeMap: Record<number, { icon: string; description: string }> = {
	0: { icon: 'Sun', description: 'Clear sky' },
	1: { icon: 'CloudSun', description: 'Mainly clear' },
	2: { icon: 'CloudSun', description: 'Partly cloudy' },
	3: { icon: 'Cloud', description: 'Overcast' },
	45: { icon: 'CloudFog', description: 'Foggy' },
	48: { icon: 'CloudFog', description: 'Depositing rime fog' },
	51: { icon: 'CloudRain', description: 'Light drizzle' },
	53: { icon: 'CloudRain', description: 'Moderate drizzle' },
	55: { icon: 'CloudRain', description: 'Dense drizzle' },
	56: { icon: 'Snowflake', description: 'Light freezing drizzle' },
	57: { icon: 'Snowflake', description: 'Dense freezing drizzle' },
	61: { icon: 'CloudRain', description: 'Slight rain' },
	63: { icon: 'CloudRain', description: 'Moderate rain' },
	65: { icon: 'CloudRain', description: 'Heavy rain' },
	66: { icon: 'Snowflake', description: 'Light freezing rain' },
	67: { icon: 'Snowflake', description: 'Heavy freezing rain' },
	71: { icon: 'Snowflake', description: 'Slight snow fall' },
	73: { icon: 'Snowflake', description: 'Moderate snow fall' },
	75: { icon: 'Snowflake', description: 'Heavy snow fall' },
	77: { icon: 'Snowflake', description: 'Snow grains' },
	80: { icon: 'CloudRain', description: 'Slight rain showers' },
	81: { icon: 'CloudRain', description: 'Moderate rain showers' },
	82: { icon: 'CloudRain', description: 'Violent rain showers' },
	85: { icon: 'Snowflake', description: 'Slight snow showers' },
	86: { icon: 'Snowflake', description: 'Heavy snow showers' },
	95: { icon: 'CloudLightning', description: 'Thunderstorm' },
	96: { icon: 'CloudLightning', description: 'Thunderstorm with slight hail' },
	99: { icon: 'CloudLightning', description: 'Thunderstorm with heavy hail' }
};

export function getWeatherInfo(code: number | null): {
	icon: string;
	description: string;
} {
	if (code === null) return { icon: 'HelpCircle', description: 'Unknown' };
	return weatherCodeMap[code] || { icon: 'HelpCircle', description: 'Unknown' };
}

export function formatTemperature(temp: number | null): string {
	if (temp === null) return '--';
	return `${Math.round(temp)}°C`;
}

export function isWeatherForecastAvailable(date: Date): boolean {
	const MAX_FORECAST_DAYS = 14; // Open-Meteo provides ~14 days of forecast
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const targetDate = new Date(date);
	targetDate.setHours(0, 0, 0, 0);

	const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

	return diffDays >= 0 && diffDays <= MAX_FORECAST_DAYS;
}
