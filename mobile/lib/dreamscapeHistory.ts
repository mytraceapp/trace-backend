import { getStableId } from './stableId';

export interface DreamscapeHistory {
  lastTrack: string | null;
  daysAgo: number | null;
  completedAt?: string | null;
}

const API_BASE = 'https://ca2fbbde-8b20-444e-a3cf-9a3451f8b1e2-00-n5dvsa77hetw.spock.replit.dev';
const TIMEOUT_MS = 8000;

export async function fetchDreamscapeHistory(): Promise<DreamscapeHistory> {
  const fallback: DreamscapeHistory = { lastTrack: null, daysAgo: null };
  
  try {
    const userId = await getStableId();
    if (!userId) {
      console.log('[DREAMSCAPE] No user ID available');
      return fallback;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(
      `${API_BASE}/api/dreamscape/history?userId=${encodeURIComponent(userId)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[DREAMSCAPE] History fetch failed:', response.status);
      return fallback;
    }

    const data = await response.json();
    
    if (!data.success) {
      console.warn('[DREAMSCAPE] History response not successful');
      return fallback;
    }

    console.log('[DREAMSCAPE] History loaded:', data.lastTrack, data.daysAgo, 'days ago');
    
    return {
      lastTrack: data.lastTrack || null,
      daysAgo: data.daysAgo ?? null,
      completedAt: data.completedAt || null,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[DREAMSCAPE] History fetch timed out');
    } else {
      console.warn('[DREAMSCAPE] History fetch error:', err.message);
    }
    return fallback;
  }
}

export function formatDreamscapeHistoryMessage(history: DreamscapeHistory): string | null {
  if (!history.lastTrack) return null;
  
  const trackNames: Record<string, string> = {
    forest: 'Forest',
    ocean: 'Ocean',
    rain: 'Rain',
    night: 'Night Sky',
    meadow: 'Meadow',
  };
  
  const trackName = trackNames[history.lastTrack] || history.lastTrack;
  
  if (history.daysAgo === 0) {
    return `You chose ${trackName} earlier today.`;
  } else if (history.daysAgo === 1) {
    return `Last time you chose ${trackName}.`;
  } else if (history.daysAgo && history.daysAgo <= 7) {
    return `A few days ago you chose ${trackName}.`;
  } else if (history.daysAgo && history.daysAgo <= 14) {
    return `Last time you visited Dreamscape, you chose ${trackName}.`;
  }
  
  return null;
}
