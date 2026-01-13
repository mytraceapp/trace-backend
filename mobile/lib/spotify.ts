import { Linking, Platform } from 'react-native';

// Playlist URLs - web URLs can be opened by browser or Spotify app
const SPOTIFY_PLAYLISTS: Record<string, { webUrl: string; appUri: string }> = {
  ground: {
    webUrl: 'https://open.spotify.com/playlist/5cAoML12eNgt4J1XAXYU77',
    appUri: 'spotify:playlist:5cAoML12eNgt4J1XAXYU77',
  },
  drift: {
    webUrl: 'https://open.spotify.com/playlist/5ahaGLZi7wB40G2PQFfdvt',
    appUri: 'spotify:playlist:5ahaGLZi7wB40G2PQFfdvt',
  },
  rising: {
    webUrl: 'https://open.spotify.com/playlist/7LHWpQChAU89LqBO7bVYeU',
    appUri: 'spotify:playlist:7LHWpQChAU89LqBO7bVYeU',
  },
};

export async function openSpotifyPlaylist(
  mood: 'ground' | 'drift' | 'rising'
): Promise<boolean> {
  const playlist = SPOTIFY_PLAYLISTS[mood];
  if (!playlist) {
    console.warn('[Spotify] Unknown mood:', mood);
    return false;
  }
  
  try {
    // First, try to open the Spotify app directly with app URI
    const canOpenApp = await Linking.canOpenURL(playlist.appUri);
    
    if (canOpenApp) {
      await Linking.openURL(playlist.appUri);
      console.log('[Spotify] Opened app with URI:', playlist.appUri);
      return true;
    }
    
    // Fallback: Try to open web URL (will open in browser or Spotify if installed)
    console.log('[Spotify] App not available, trying web URL');
    await Linking.openURL(playlist.webUrl);
    console.log('[Spotify] Opened web fallback:', playlist.webUrl);
    return true;
  } catch (error: any) {
    console.error('[Spotify] Failed to open app URI:', error.message);
    
    // Last resort: try web URL
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

export function getSpotifyWebUrl(mood: 'ground' | 'drift' | 'rising'): string {
  return SPOTIFY_PLAYLISTS[mood]?.webUrl || '';
}
