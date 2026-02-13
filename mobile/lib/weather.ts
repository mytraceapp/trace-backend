/**
 * Weather service for TRACE mobile app
 * Fetches weather context from the backend API
 */

import * as Location from 'expo-location';
import { apiFetch } from './apiFetch';

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
    temperature?: number;
    wind?: number;
    cloudCover?: number;
    isDayTime?: boolean;
    weatherText?: string;
  };
}

let cachedWeather: WeatherContext | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Get user's current location
 */
export async function getUserLocation(): Promise<{ lat: number; lon: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[Weather] Location permission not granted');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });

    return {
      lat: location.coords.latitude,
      lon: location.coords.longitude,
    };
  } catch {
    console.log('[Weather] Could not get location');
    return null;
  }
}

/**
 * Fetch weather data from backend
 * If lat/lon not provided, will attempt to get user's current location
 */
export async function getWeather(lat?: number, lon?: number): Promise<WeatherContext | null> {
  // Return cached data if still valid
  const now = Date.now();
  if (cachedWeather && now - lastFetchTime < CACHE_DURATION) {
    return cachedWeather;
  }

  // Get location if not provided
  let coords = lat != null && lon != null ? { lat, lon } : null;
  if (!coords) {
    coords = await getUserLocation();
    if (!coords) return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await apiFetch(`/api/weather`, {
      method: 'POST',
      body: JSON.stringify({ lat: coords.lat, lon: coords.lon }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.log('[Weather] Weather service unavailable, continuing without');
      return null;
    }

    const data: WeatherResponse = await response.json();

    const weatherContext: WeatherContext = {
      temperature: data.current?.temperature ?? 70,
      windSpeed: data.current?.wind ?? 0,
      summary: data.summary || data.current?.weatherText || 'Unknown conditions',
      cloudCover: data.current?.cloudCover ?? 0,
      isDayTime: data.current?.isDayTime ?? true,
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
