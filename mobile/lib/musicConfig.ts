export type MoodSpace = 'ground' | 'drift' | 'rising';

export interface MusicConfig {
  spotifyClientId: string;
  playlists: Record<MoodSpace, string>;
}

const API_BASE_URL = 'https://ca2fbbde-8b20-444e-a3cf-9a3451f8b1e2-00-n5dvsa77hetw.spock.replit.dev';

export async function fetchMusicConfig(): Promise<MusicConfig> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/music-config`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!res.ok) {
      throw new Error('Failed to load music config');
    }

    return res.json();
  } catch (err: any) {
    clearTimeout(timeout);
    console.warn('[Music] Config fetch failed:', err.message);
    // Return fallback config with hardcoded playlist URLs
    return {
      spotifyClientId: '',
      playlists: {
        ground: 'https://open.spotify.com/playlist/5cAoML12eNgt4J1XAXYU77',
        drift: 'https://open.spotify.com/playlist/5ahaGLZi7wB40G2PQFfdvt',
        rising: 'https://open.spotify.com/playlist/7LHWpQChAU89LqBO7bVYeU',
      },
    };
  }
}

export async function getPlaylistItem(mood: MoodSpace) {
  const cfg = await fetchMusicConfig();

  return {
    id: `playlist-${mood}`,
    title:
      mood === 'ground'
        ? 'Ground'
        : mood === 'drift'
        ? 'Drift'
        : 'Rising',
    subtitle: 'Curated by TRACE',
    source: 'spotify' as const,
    spotifyUri: cfg.playlists[mood],
    moodSpace: mood,
  };
}
