/**
 * Weather service for TRACE mobile app
 * Fetches weather context from the backend API
 */

const API_BASE = 'https://ca2fbbde-8f64-4585-bf63-4c826bcfad38-00-3cma3fqph0zq1.picard.replit.dev';

export interface WeatherContext {
  temperature: number;
  windSpeed: number;
  summary: string;
  cloudCover: number;
  isDayTime: boolean;
}

interface WeatherResponse {
  summary: string;
  current: {
    Temperature?: { Imperial?: { Value: number } };
    Wind?: { Speed?: { Imperial?: { Value: number } } };
    CloudCover?: number;
    IsDayTime?: boolean;
    WeatherText?: string;
  };
}

let cachedWeather: WeatherContext | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Fetch weather data from backend using provided coordinates
 */
export async function getWeather(lat?: number, lon?: number): Promise<WeatherContext | null> {
  if (lat == null || lon == null) {
    return null;
  }

  // Return cached data if still valid
  const now = Date.now();
  if (cachedWeather && now - lastFetchTime < CACHE_DURATION) {
    return cachedWeather;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE}/api/weather`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.log('[Weather] Weather service unavailable, continuing without');
      return null;
    }

    const data: WeatherResponse = await response.json();

    const weatherContext: WeatherContext = {
      temperature: data.current?.Temperature?.Imperial?.Value ?? 70,
      windSpeed: data.current?.Wind?.Speed?.Imperial?.Value ?? 0,
      summary: data.summary || data.current?.WeatherText || 'Unknown conditions',
      cloudCover: data.current?.CloudCover ?? 0,
      isDayTime: data.current?.IsDayTime ?? true,
    };

    cachedWeather = weatherContext;
    lastFetchTime = now;
    return weatherContext;
  } catch {
    console.log('[Weather] Could not fetch weather, continuing without');
    return null;
  }
}

/**
 * Clear weather cache
 */
export function clearWeatherCache(): void {
  cachedWeather = null;
  lastFetchTime = 0;
}
