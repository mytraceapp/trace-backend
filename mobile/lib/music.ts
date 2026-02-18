import { Linking, Platform } from 'react-native';
import { fetchMusicConfig, MoodSpace } from './musicConfig';

export type MusicPlatform = 'spotify' | 'apple';

interface PlaylistInfo {
  name: string;
  spotifyUri: string;
  spotifyWebUrl: string;
  moodSpace: MoodSpace;
}

const FALLBACK_PLAYLISTS: Record<MoodSpace, PlaylistInfo> = {
  rooted: {
    name: 'Rooted',
    spotifyUri: 'spotify:playlist:5cAoML12eNgt4J1XAXYU77',
    spotifyWebUrl: 'https://open.spotify.com/playlist/5cAoML12eNgt4J1XAXYU77',
    moodSpace: 'rooted',
  },
  low_orbit: {
    name: 'Low Orbit',
    spotifyUri: 'spotify:playlist:5ahaGLZi7wB40G2PQFfdvt',
    spotifyWebUrl: 'https://open.spotify.com/playlist/5ahaGLZi7wB40G2PQFfdvt',
    moodSpace: 'low_orbit',
  },
  first_light: {
    name: 'First Light',
    spotifyUri: 'spotify:playlist:7LHWpQChAU89LqBO7bVYeU',
    spotifyWebUrl: 'https://open.spotify.com/playlist/7LHWpQChAU89LqBO7bVYeU',
    moodSpace: 'first_light',
  },
};

function extractPlaylistId(url: string): string | null {
  const match = url.match(/playlist[:/]([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export async function getMoodPlaylists(): Promise<Record<MoodSpace, PlaylistInfo>> {
  try {
    const config = await fetchMusicConfig();
    const result: Record<string, PlaylistInfo> = {};
    for (const mood of ['rooted', 'low_orbit', 'first_light'] as MoodSpace[]) {
      const configUrl = config.playlists[mood];
      const playlistId = extractPlaylistId(configUrl);
      if (playlistId) {
        result[mood] = {
          name: mood === 'rooted' ? 'Rooted' : mood === 'low_orbit' ? 'Low Orbit' : 'First Light',
          spotifyUri: `spotify:playlist:${playlistId}`,
          spotifyWebUrl: `https://open.spotify.com/playlist/${playlistId}`,
          moodSpace: mood,
        };
      } else {
        result[mood] = FALLBACK_PLAYLISTS[mood];
      }
    }
    return result as Record<MoodSpace, PlaylistInfo>;
  } catch (err: any) {
    console.warn('[Music] getMoodPlaylists failed, using fallbacks:', err.message);
    return { ...FALLBACK_PLAYLISTS };
  }
}

export async function isSpotifyInstalled(): Promise<boolean> {
  try {
    return await Linking.canOpenURL('spotify:');
  } catch {
    return false;
  }
}

export async function openPlaylist(
  moodSpace: MoodSpace,
  preferredPlatform?: MusicPlatform
): Promise<boolean> {
  const playlists = await getMoodPlaylists();
  const playlist = playlists[moodSpace];

  console.log(`🎵 [MUSIC] Opening ${moodSpace} playlist:`, playlist.name);

  if (preferredPlatform !== 'apple') {
    const hasSpotify = await isSpotifyInstalled();
    if (hasSpotify) {
      try {
        await Linking.openURL(playlist.spotifyUri);
        console.log('[Music] Opened Spotify app:', playlist.spotifyUri);
        return true;
      } catch (error: any) {
        console.error('[Music] Spotify app open failed:', error.message);
      }
    }
  }

  try {
    await Linking.openURL(playlist.spotifyWebUrl);
    console.log('[Music] Opened Spotify web:', playlist.spotifyWebUrl);
    return true;
  } catch (webError: any) {
    console.error('[Music] Web fallback failed:', webError.message);
    return false;
  }
}
