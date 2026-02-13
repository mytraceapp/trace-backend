import { apiFetch } from './apiFetch';

export type MoodSpace = 'rooted' | 'low_orbit' | 'first_light';

export interface MusicConfig {
  spotifyClientId: string;
  playlists: Record<MoodSpace, string>;
}

export async function fetchMusicConfig(): Promise<MusicConfig> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
  
  try {
    const res = await apiFetch(`/api/music-config`, {
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
    return {
      spotifyClientId: '',
      playlists: {
        rooted: 'https://open.spotify.com/playlist/5cAoML12eNgt4J1XAXYU77',
        low_orbit: 'https://open.spotify.com/playlist/5ahaGLZi7wB40G2PQFfdvt',
        first_light: 'https://open.spotify.com/playlist/7LHWpQChAU89LqBO7bVYeU',
      },
    };
  }
}

export async function getPlaylistItem(mood: MoodSpace) {
  const cfg = await fetchMusicConfig();

  return {
    id: `playlist-${mood}`,
    title:
      mood === 'rooted'
        ? 'Rooted'
        : mood === 'low_orbit'
        ? 'Low Orbit'
        : 'First Light',
    subtitle: 'Curated by TRACE',
    source: 'spotify' as const,
    spotifyUri: cfg.playlists[mood],
    moodSpace: mood,
  };
}
