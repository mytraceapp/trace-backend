export type MoodSpace = 'ground' | 'drift' | 'rising';

export interface MusicConfig {
  spotifyClientId: string;
  playlists: Record<MoodSpace, string>;
}

const API_BASE_URL = 'https://ca2fbbde-8b20-444e-a3cf-9a3451f8b1e2-00-n5dvsa77hetw.spock.replit.dev';

export async function fetchMusicConfig(): Promise<MusicConfig> {
  const res = await fetch(`${API_BASE_URL}/api/music-config`);
  if (!res.ok) {
    throw new Error('Failed to load music config');
  }

  return res.json();
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
