import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Video, ResizeMode, Audio, AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import Svg, { Path } from 'react-native-svg';

import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';
import { stopAmbient } from '../../lib/ambientAudio';

function RaindropIcon({ size = 24, color = 'rgba(255, 255, 255, 0.65)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size * 1.4} viewBox="0 0 24 34" fill="none">
      <Path
        d="M12 2C12 2 3 14 3 21C3 26.5228 7.02944 31 12 31C16.9706 31 21 26.5228 21 21C21 14 12 2 12 2Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function VolumeIcon({ volume, color = 'rgba(255, 255, 255, 0.55)' }: { volume: number; color?: string }) {
  return (
    <Svg width={20} height={16} viewBox="0 0 20 16" fill="none">
      <Path
        d="M2 5.5V10.5H5L10 14.5V1.5L5 5.5H2Z"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {volume > 0.01 && (
        <Path
          d="M13 5.5C13.5 6.5 13.5 9.5 13 10.5"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      )}
      {volume > 0.4 && (
        <Path
          d="M15.5 3C17 5 17 11 15.5 13"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const VOLUME_STORAGE_KEY = '@window_ambience_volume';

export default function WindowScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const [isNightMode, setIsNightMode] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [introVisible, setIntroVisible] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  
  const dayVideoRef = useRef<Video>(null);
  const nightVideoRef = useRef<Video>(null);
  const audioRef = useRef<Audio.Sound | null>(null);
  
  const dayOpacity = useSharedValue(1);
  const nightOpacity = useSharedValue(0);
  const introOpacity = useSharedValue(1);
  const toastOpacity = useSharedValue(0);

  useEffect(() => {
    stopAmbient();
  }, []);

  useEffect(() => {
    const loadVolume = async () => {
      try {
        const savedVolume = await AsyncStorage.getItem(VOLUME_STORAGE_KEY);
        if (savedVolume !== null) {
          setVolume(parseFloat(savedVolume));
        }
      } catch (e) {
        console.log('Failed to load volume preference');
      }
    };
    loadVolume();
  }, []);

  useEffect(() => {
    const saveVolume = async () => {
      try {
        await AsyncStorage.setItem(VOLUME_STORAGE_KEY, volume.toString());
      } catch (e) {
        console.log('Failed to save volume preference');
      }
    };
    saveVolume();
  }, [volume]);

  useEffect(() => {
    const setupAudio = async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/audio/rain-ambient.mp3'),
        {
          isLooping: true,
          volume: 0,
          rate: 0.575,
          shouldCorrectPitch: false,
        }
      );
      audioRef.current = sound;
      await sound.playAsync();
      
      let vol = 0;
      const fadeIn = setInterval(async () => {
        vol += 0.02;
        if (vol >= volume) {
          vol = volume;
          clearInterval(fadeIn);
        }
        await sound.setVolumeAsync(vol);
      }, 60);
    };
    
    setupAudio();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setVolumeAsync(volume);
    }
  }, [volume]);

  useEffect(() => {
    const timer = setTimeout(() => {
      introOpacity.value = withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) });
      setTimeout(() => setIntroVisible(false), 2000);
    }, 7000);
    
    return () => clearTimeout(timer);
  }, []);

  const toggleMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsNightMode(prev => {
      const newMode = !prev;
      
      if (newMode) {
        nightOpacity.value = withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) });
        dayOpacity.value = withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) });
      } else {
        dayOpacity.value = withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) });
        nightOpacity.value = withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) });
      }
      
      setToast(newMode ? "Quiet visuals on" : "Back to normal mode");
      toastOpacity.value = withTiming(1, { duration: 300 });
      setTimeout(() => {
        toastOpacity.value = withTiming(0, { duration: 400 });
        setTimeout(() => setToast(null), 400);
      }, 2000);
      
      return newMode;
    });
  }, []);

  const handleTracePress = () => {
    if (audioRef.current) {
      audioRef.current.stopAsync();
    }
    router.replace('/(tabs)/chat');
  };

  const dayVideoStyle = useAnimatedStyle(() => ({
    opacity: dayOpacity.value,
  }));

  const nightVideoStyle = useAnimatedStyle(() => ({
    opacity: nightOpacity.value,
  }));

  const introStyle = useAnimatedStyle(() => ({
    opacity: introOpacity.value,
  }));

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <Animated.View style={[styles.videoWrapper, dayVideoStyle]}>
          <Video
            ref={dayVideoRef}
            source={require('../../assets/video/window_day.mp4')}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted
            shouldPlay
            rate={0.5}
          />
        </Animated.View>
        
        <Animated.View style={[styles.videoWrapper, nightVideoStyle]}>
          <Video
            ref={nightVideoRef}
            source={require('../../assets/video/window_night.mp4')}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted
            shouldPlay
            rate={0.6}
          />
        </Animated.View>
      </View>

      <View style={styles.overlay} />
      <View style={styles.vignette} />

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={handleTracePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
        </Pressable>
      </View>

      {toast && (
        <Animated.View style={[styles.toastContainer, toastStyle]}>
          <Text style={[styles.toastText, { fontFamily: canelaFont }]}>{toast}</Text>
        </Animated.View>
      )}

      {introVisible && (
        <Animated.View style={[styles.introContainer, introStyle]} pointerEvents="none">
          <View style={styles.iconContainer}>
            <RaindropIcon size={22} />
          </View>
          <Text style={[styles.introTitle, { fontFamily: canelaFont }]}>WINDOW</Text>
          <Text style={[styles.introSubtitle, { fontFamily: canelaFont }]}>
            Watch the rain fall.{'\n'}Let your thoughts drift.
          </Text>
        </Animated.View>
      )}

      <View style={[styles.controlsContainer, { bottom: insets.bottom + 20 }]}>
        <Pressable style={styles.moonButton} onPress={toggleMode}>
          <View style={[styles.moonIcon, isNightMode && styles.moonIconFilled]} />
        </Pressable>

        <View style={styles.volumeContainer}>
          <View style={styles.volumeIconContainer}>
            <VolumeIcon volume={volume} />
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onValueChange={setVolume}
            minimumTrackTintColor="rgba(255, 255, 255, 0.25)"
            maximumTrackTintColor="rgba(255, 255, 255, 0.08)"
            thumbTintColor="rgba(245, 241, 235, 0.5)"
          />
        </View>
      </View>

      <View style={[styles.bottomGradient, { height: 160 + insets.bottom }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c0b',
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  videoWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    width: SCREEN_WIDTH * 1.15,
    height: SCREEN_HEIGHT * 1.15,
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -(SCREEN_WIDTH * 1.15) / 2 },
      { translateY: -(SCREEN_HEIGHT * 1.15) / 2 },
    ],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.43)',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingBottom: Spacing.md,
    backgroundColor: 'transparent',
  },
  traceLabel: {
    fontSize: TraceWordmark.fontSize,
    fontWeight: TraceWordmark.fontWeight,
    letterSpacing: TraceWordmark.letterSpacing,
    marginLeft: TraceWordmark.marginLeft,
    color: '#EDE8DB',
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
    paddingLeft: TraceWordmark.paddingLeft,
    textAlign: 'center',
  },
  toastContainer: {
    position: 'absolute',
    top: '14%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  toastText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  introContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  iconContainer: {
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 22,
    fontWeight: '300',
    letterSpacing: 8,
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 20,
    paddingLeft: 8,
  },
  introSubtitle: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 22,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
    letterSpacing: 0.4,
  },
  controlsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 60,
  },
  moonButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  moonIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
    transform: [{ rotate: '-30deg' }],
  },
  moonIconFilled: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  volumeIconContainer: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slider: {
    width: 100,
    height: 20,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    pointerEvents: 'none',
  },
});
