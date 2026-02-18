import { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, useColorScheme, Platform, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { ScreenTitle, BodyText, FontFamily, TraceWordmark } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { useFonts } from 'expo-font';
import { playAmbient, stopAmbient } from '../../lib/ambientAudio';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabaseClient';
import { openPlaylist } from '../../lib/music';
import { MoodSpace } from '../../lib/musicConfig';

interface NightSwimTrack {
  id: string;
  title: string;
  track_number: number;
  duration_seconds: number;
  audio_url: string;
}

export default function JournalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? Colors.night : Colors.day;

  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const [showNightSwim, setShowNightSwim] = useState(false);
  const [showMusicMode, setShowMusicMode] = useState(false);
  const [musicSpace, setMusicSpace] = useState<MoodSpace>('rooted');
  const [tracks, setTracks] = useState<NightSwimTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!showNightSwim && !showMusicMode) {
        playAmbient("main", require("../../assets/audio/trace_ambient.m4a"), 0.35);
      }
      
      return () => {
        if (soundRef.current) {
          soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      };
    }, [showNightSwim, showMusicMode])
  );

  useEffect(() => {
    if (params.openNightSwim === 'true') {
      console.log('🎵 Night Swim triggered from chat');
      setShowNightSwim(true);
      stopAmbient();
      loadNightSwimTracks();
      
      if (params.autoplay === 'true') {
        const trackNum = parseInt(params.track as string) || 0;
        setCurrentTrack(trackNum);
      }
    }
  }, [params.openNightSwim, params.autoplay, params.track]);

  useEffect(() => {
    if (params.mode === 'music') {
      const space = (params.musicSpace as MoodSpace) || 'rooted';
      console.log('🎵 Music mode triggered from chat, space:', space);
      setMusicSpace(space);
      setShowMusicMode(true);
      stopAmbient();
    }
  }, [params.mode, params.musicSpace]);

  const handlePlaylistPlay = async () => {
    console.log('🎵 Opening playlist for mood:', musicSpace);
    await openPlaylist(musicSpace);
  };

  const closeMusicMode = () => {
    setShowMusicMode(false);
    playAmbient("main", require("../../assets/audio/trace_ambient.m4a"), 0.35);
    router.push('/(tabs)/chat');
  };

  const loadNightSwimTracks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('trace_originals_tracks')
        .select('*')
        .eq('album', 'night_swim')
        .order('track_number', { ascending: true });

      if (error) {
        console.error('Error loading Night Swim tracks:', error);
        return;
      }

      if (data && data.length > 0) {
        setTracks(data);
        console.log('🎵 Loaded Night Swim tracks:', data.length);
        
        if (params.autoplay === 'true') {
          const trackNum = parseInt(params.track as string) || 0;
          playTrack(data[trackNum] || data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load Night Swim tracks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const playTrack = async (track: NightSwimTrack) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      setIsLoading(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audio_url },
        { shouldPlay: true, volume: 0.8 }
      );
      
      soundRef.current = sound;
      setIsPlaying(true);
      setCurrentTrack(track.track_number - 1);
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          const nextTrack = tracks[(track.track_number) % tracks.length];
          if (nextTrack) {
            playTrack(nextTrack);
          }
        }
      });
    } catch (err) {
      console.error('Error playing track:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    if (!soundRef.current) {
      if (tracks.length > 0) {
        playTrack(tracks[currentTrack]);
      }
      return;
    }

    const status = await soundRef.current.getStatusAsync();
    if (status.isLoaded) {
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const closeNightSwim = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setShowNightSwim(false);
    setIsPlaying(false);
    playAmbient("main", require("../../assets/audio/trace_ambient.m4a"), 0.35);
  };

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const MUSIC_DISPLAY: Record<string, { title: string; subtitle: string; emoji: string; colors: [string, string, string] }> = {
    rooted: { title: 'Rooted', subtitle: 'Grounded & steady', emoji: '🌿', colors: ['#2d3a2e', '#1a2e1c', '#0f1f10'] },
    low_orbit: { title: 'Low Orbit', subtitle: 'Floating & spacious', emoji: '🌙', colors: ['#1a1a2e', '#16213e', '#0f0f23'] },
    first_light: { title: 'First Light', subtitle: 'Warm & hopeful', emoji: '🌅', colors: ['#2e2a1a', '#3e3016', '#231f0f'] },
  };

  if (showMusicMode) {
    const display = MUSIC_DISPLAY[musicSpace] || MUSIC_DISPLAY.rooted;
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={display.colors}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={closeMusicMode}>
            <Text style={[styles.closeButton, { fontFamily: canelaFont }]}>Close</Text>
          </Pressable>
        </View>
        <View style={[styles.playerContent, { paddingTop: insets.top + 80 }]}>
          <View style={styles.albumArt}>
            <Text style={styles.albumEmoji}>{display.emoji}</Text>
          </View>
          <Text style={[styles.albumTitle, { fontFamily: canelaFont }]}>{display.title}</Text>
          <Text style={[styles.artistName, { fontFamily: canelaFont }]}>{display.subtitle}</Text>
          <Text style={[styles.trackName, { fontFamily: canelaFont, marginBottom: 32 }]}>
            TRACE Playlist on Spotify
          </Text>
          <View style={styles.controls}>
            <Pressable onPress={handlePlaylistPlay} style={styles.playButton}>
              <Text style={styles.playIcon}>▶️</Text>
            </Pressable>
          </View>
          <Text style={[styles.artistName, { fontFamily: canelaFont, marginTop: 16 }]}>
            Tap play to open in Spotify
          </Text>
        </View>
      </View>
    );
  }

  if (showNightSwim) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f0f23']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={closeNightSwim}>
            <Text style={[styles.closeButton, { fontFamily: canelaFont }]}>Close</Text>
          </Pressable>
        </View>

        <View style={[styles.playerContent, { paddingTop: insets.top + 80 }]}>
          <View style={styles.albumArt}>
            <Text style={styles.albumEmoji}>🌊</Text>
          </View>
          
          <Text style={[styles.albumTitle, { fontFamily: canelaFont }]}>Night Swim</Text>
          <Text style={[styles.artistName, { fontFamily: canelaFont }]}>TRACE Originals</Text>
          
          {tracks.length > 0 && (
            <Text style={[styles.trackName, { fontFamily: canelaFont }]}>
              {tracks[currentTrack]?.title || 'Loading...'}
            </Text>
          )}

          <View style={styles.controls}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#ffffff" />
            ) : (
              <Pressable onPress={togglePlayPause} style={styles.playButton}>
                <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.trackList}>
            {tracks.map((track, index) => (
              <Pressable 
                key={track.id} 
                onPress={() => playTrack(track)}
                style={[
                  styles.trackItem,
                  currentTrack === index && styles.trackItemActive
                ]}
              >
                <Text style={[
                  styles.trackItemText, 
                  { fontFamily: canelaFont },
                  currentTrack === index && styles.trackItemTextActive
                ]}>
                  {track.track_number}. {track.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8E2D8', '#D9D0C3', '#C8BBAA']}
        locations={[0, 0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.push('/(tabs)/chat')}>
          <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
        </Pressable>
      </View>

      <View style={[styles.content, { paddingTop: insets.top + Spacing.traceToTitle }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: canelaFont }]}>Journal</Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>
            Coming soon
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    alignItems: 'center',
    paddingBottom: Spacing.md,
    backgroundColor: 'transparent',
  },
  traceLabel: {
    fontSize: TraceWordmark.fontSize,
    fontWeight: TraceWordmark.fontWeight,
    letterSpacing: TraceWordmark.letterSpacing,
    marginLeft: TraceWordmark.marginLeft,
    color: TraceWordmark.color,
    opacity: TraceWordmark.opacity,
    paddingLeft: TraceWordmark.paddingLeft,
    textAlign: 'center',
    ...Shadows.traceWordmark,
  },
  closeButton: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginTop: -4,
  },
  title: {
    fontSize: ScreenTitle.fontSize,
    fontWeight: ScreenTitle.fontWeight,
    marginBottom: 6,
    color: ScreenTitle.color,
    letterSpacing: ScreenTitle.letterSpacing,
  },
  subtitle: {
    fontSize: BodyText.fontSize,
    color: BodyText.color,
    opacity: 0.7,
    lineHeight: 22,
  },
  playerContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
  },
  albumArt: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  albumEmoji: {
    fontSize: 80,
  },
  albumTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  trackName: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
  },
  controls: {
    marginBottom: 32,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 32,
  },
  trackList: {
    width: '100%',
    paddingHorizontal: 16,
  },
  trackItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  trackItemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  trackItemText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
  trackItemTextActive: {
    color: '#ffffff',
  },
});
