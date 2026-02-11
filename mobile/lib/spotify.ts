import { Linking, Platform } from 'react-native';
import { fetchMusicConfig, MoodSpace } from './musicConfig';

const FALLBACK_PLAYLISTS: Record<MoodSpace, { webUrl: string; appUri: string }> = {
  rooted: {
    webUrl: 'https://open.spotify.com/playlist/5cAoML12eNgt4J1XAXYU77',
    appUri: 'spotify:playlist:5cAoML12eNgt4J1XAXYU77',
  },
  low_orbit: {
    webUrl: 'https://open.spotify.com/playlist/5ahaGLZi7wB40G2PQFfdvt',
    appUri: 'spotify:playlist:5ahaGLZi7wB40G2PQFfdvt',
  },
  first_light: {
    webUrl: 'https://open.spotify.com/playlist/7LHWpQChAU89LqBO7bVYeU',
    appUri: 'spotify:playlist:7LHWpQChAU89LqBO7bVYeU',
  },
};

function extractPlaylistId(url: string): string | null {
  const match = url.match(/playlist[:/]([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function getPlaylistUrls(configUrl: string, mood: MoodSpace): { webUrl: string; appUri: string } {
  const playlistId = extractPlaylistId(configUrl);
  if (playlistId) {
    return {
      webUrl: `https://open.spotify.com/playlist/${playlistId}`,
      appUri: `spotify:playlist:${playlistId}`,
    };
  }
  console.warn('[Spotify] Invalid config URL, using fallback for:', mood);
  return FALLBACK_PLAYLISTS[mood];
}

export async function openSpotifyPlaylist(
  mood: MoodSpace
): Promise<boolean> {
  let playlist: { webUrl: string; appUri: string };
  try {
    const config = await fetchMusicConfig();
    const configUrl = config.playlists[mood];
    playlist = getPlaylistUrls(configUrl, mood);
    console.log('[Spotify] Using config playlist:', mood, playlist.appUri);
  } catch (err: any) {
    console.warn('[Spotify] Config failed, using hardcoded fallback:', err.message);
    playlist = FALLBACK_PLAYLISTS[mood];
  }
  
  try {
    const canOpenApp = await Linking.canOpenURL(playlist.appUri);
    
    if (canOpenApp) {
      await Linking.openURL(playlist.appUri);
      console.log('[Spotify] Opened app with URI:', playlist.appUri);
      return true;
    }
    
    console.log('[Spotify] App not available, trying web URL');
    await Linking.openURL(playlist.webUrl);
    console.log('[Spotify] Opened web fallback:', playlist.webUrl);
    return true;
  } catch (error: any) {
    console.error('[Spotify] Failed to open app URI:', error.message);
    
    try {
      await Linking.openURL(playlist.webUrl);
      console.log('[Spotify] Opened web fallback after error:', playlist.webUrl);
      return true;
    } catch (webError: any) {
      console.error('[Spotify] Web fallback also failed:', webError.message);
      return false;
    }
  }
}

export function getSpotifyWebUrl(mood: MoodSpace): string {
  return FALLBACK_PLAYLISTS[mood]?.webUrl || '';
}
