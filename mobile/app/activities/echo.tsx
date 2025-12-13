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
  withRepeat,
  withSequence,
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useFrameCallback,
  runOnJS,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, G, Line } from 'react-native-svg';

import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LUNA_PALETTE = {
  charcoal: '#1a1d1a',
  sageGray: '#6b7c6b',
  midnightBlue: '#2d3a4a',
  beige: '#d4c4a8',
  sageMuted: '#4a5a4a',
  fogWhite: '#e8e4dc',
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

function generateWavePath(
  width: number,
  centerY: number,
  amplitude: number,
  frequency: number,
  phase: number,
  yOffset: number
): string {
  const points: string[] = [];
  const segments = 60;
  
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width;
    const normalizedX = i / segments;
    
    const baseWave = Math.sin(normalizedX * Math.PI * frequency + phase);
    const midWave = Math.sin(normalizedX * Math.PI * (frequency + 2) + phase * 1.3) * 0.35;
    const highWave = Math.sin(normalizedX * Math.PI * (frequency + 5) + phase * 0.8) * 0.15;
    const sharpness = Math.abs(Math.sin(normalizedX * Math.PI * 4 + phase * 0.5)) * 0.18;
    
    const envelope = Math.sin(normalizedX * Math.PI);
    const waveHeight = (baseWave + midWave + highWave + sharpness) * amplitude * envelope;
    
    const y = centerY + yOffset + waveHeight;
    
    if (i === 0) {
      points.push(`M ${x} ${y}`);
    } else {
      points.push(`L ${x} ${y}`);
    }
  }
  
  return points.join(' ');
}

export default function EchoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const audioRef = useRef<Audio.Sound | null>(null);
  const ambientRef = useRef<Audio.Sound | null>(null);
  
  const time = useSharedValue(0);
  const orbScale = useSharedValue(1);
  const orbGlow = useSharedValue(0.22);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const isVoicePlayingRef = useRef(false);
  
  useEffect(() => {
    isVoicePlayingRef.current = isVoicePlaying;
  }, [isVoicePlaying]);
  
  const [wave1Path, setWave1Path] = useState('');
  const [wave2Path, setWave2Path] = useState('');
  const [wave3Path, setWave3Path] = useState('');
  
  const centerY = SCREEN_HEIGHT / 2 - 40;

  useEffect(() => {
    let animationId: number;
    let startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const phase = elapsed * 0.0002;
      
      const breathLFO = Math.sin(elapsed * 0.00045) * 0.12 + 1;
      
      if (isVoicePlayingRef.current) {
        const voicePhase = elapsed * 0.0008;
        const voiceEnergy1 = Math.sin(elapsed * 0.006) * 0.4 + Math.sin(elapsed * 0.015) * 0.25 + 1;
        const voiceEnergy2 = Math.sin(elapsed * 0.008) * 0.35 + Math.sin(elapsed * 0.012) * 0.3 + 1;
        const voiceEnergy3 = Math.sin(elapsed * 0.005) * 0.3 + Math.sin(elapsed * 0.018) * 0.2 + 1;
        
        setWave1Path(generateWavePath(
          SCREEN_WIDTH, centerY, 75 * breathLFO * voiceEnergy1, 3, voicePhase + 0.7, -30
        ));
        setWave2Path(generateWavePath(
          SCREEN_WIDTH, centerY, 95 * breathLFO * voiceEnergy2, 3, voicePhase + 0.5, 0
        ));
        setWave3Path(generateWavePath(
          SCREEN_WIDTH, centerY, 65 * breathLFO * voiceEnergy3, 3, voicePhase + 0.3, 25
        ));
        
        const vibrate = Math.sin(elapsed * 0.025) * 0.015;
        const pulse = Math.sin(elapsed * 0.008) * 0.03;
        orbScale.value = 1 + Math.sin(elapsed * 0.0003) * 0.08 + vibrate + pulse;
        orbGlow.value = 0.28 + Math.sin(elapsed * 0.012) * 0.15 + Math.sin(elapsed * 0.035) * 0.08;
      } else {
        setWave1Path(generateWavePath(
          SCREEN_WIDTH, centerY, 55 * breathLFO, 3, phase + 0.7, -30
        ));
        setWave2Path(generateWavePath(
          SCREEN_WIDTH, centerY, 70 * breathLFO, 3, phase + 0.5, 0
        ));
        setWave3Path(generateWavePath(
          SCREEN_WIDTH, centerY, 50 * breathLFO, 3, phase + 0.3, 25
        ));
        
        const orbBreath = 1 + Math.sin(elapsed * 0.0003) * 0.08;
        orbScale.value = orbBreath;
        orbGlow.value = 0.22 + Math.sin(elapsed * 0.0004) * 0.1;
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [centerY]);

  useEffect(() => {
    const setupAudio = async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      
      const { sound: ambient } = await Audio.Sound.createAsync(
        require('../../assets/audio/ambient-loop.mp3'),
        {
          isLooping: true,
          volume: 0,
          rate: 0.88,
          shouldCorrectPitch: false,
        }
      );
      ambientRef.current = ambient;
      await ambient.playAsync();
      
      let vol = 0;
      const fadeIn = setInterval(async () => {
        vol += 0.002;
        if (vol >= 0.10) {
          vol = 0.10;
          clearInterval(fadeIn);
        }
        await ambient.setVolumeAsync(vol);
      }, 30);
      
      setTimeout(async () => {
        const { sound: voice } = await Audio.Sound.createAsync(
          require('../../assets/audio/trace-echo.mp3'),
          {
            volume: 0,
            rate: 0.95,
            shouldCorrectPitch: true,
          }
        );
        audioRef.current = voice;
        setIsVoicePlaying(true);
        await voice.playAsync();
        
        let voiceVol = 0;
        const targetVol = 0.75;
        const voiceFadeIn = setInterval(async () => {
          voiceVol += 0.005;
          if (voiceVol >= targetVol) {
            voiceVol = targetVol;
            clearInterval(voiceFadeIn);
          }
          await voice.setVolumeAsync(voiceVol);
        }, 30);
        
        voice.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsVoicePlaying(false);
            setTimeout(() => {
              router.replace('/(tabs)/chat');
            }, 2000);
          }
        });
      }, 4000);
    };
    
    setupAudio();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.unloadAsync();
      }
      if (ambientRef.current) {
        ambientRef.current.unloadAsync();
      }
    };
  }, []);

  const handleTracePress = async () => {
    if (audioRef.current) {
      await audioRef.current.stopAsync();
    }
    if (ambientRef.current) {
      await ambientRef.current.stopAsync();
    }
    router.replace('/(tabs)/chat');
  };

  const handleScreenPress = async () => {
    if (audioRef.current) {
      let vol = 0.12;
      const fadeInterval = setInterval(async () => {
        vol -= 0.008;
        if (vol <= 0) {
          clearInterval(fadeInterval);
          await audioRef.current?.stopAsync();
        } else if (audioRef.current) {
          await audioRef.current.setVolumeAsync(vol);
        }
      }, 20);
    }
    if (ambientRef.current) {
      let vol = 0.10;
      const fadeInterval = setInterval(async () => {
        vol -= 0.005;
        if (vol <= 0) {
          clearInterval(fadeInterval);
          await ambientRef.current?.stopAsync();
        } else if (ambientRef.current) {
          await ambientRef.current.setVolumeAsync(vol);
        }
      }, 30);
    }
    setTimeout(() => {
      router.back();
    }, 500);
  };

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  const maxRadius = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.9;

  return (
    <Pressable style={styles.container} onPress={handleScreenPress}>
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="orbGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={LUNA_PALETTE.midnightBlue} stopOpacity="0.36" />
            <Stop offset="40%" stopColor={LUNA_PALETTE.midnightBlue} stopOpacity="0.23" />
            <Stop offset="70%" stopColor={LUNA_PALETTE.sageGray} stopOpacity="0.13" />
            <Stop offset="100%" stopColor={LUNA_PALETTE.sageGray} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={LUNA_PALETTE.beige} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={LUNA_PALETTE.beige} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <Circle
            key={`grid-${i}`}
            cx={SCREEN_WIDTH / 2}
            cy={centerY}
            r={(maxRadius / 12) * i}
            stroke={LUNA_PALETTE.sageGray}
            strokeWidth={0.8}
            strokeOpacity={0.12 * (1 - i / 16)}
            fill="none"
          />
        ))}

        {[...Array(24)].map((_, i) => {
          const angle = (i / 24) * Math.PI * 2;
          return (
            <Line
              key={`line-${i}`}
              x1={SCREEN_WIDTH / 2}
              y1={centerY}
              x2={SCREEN_WIDTH / 2 + Math.cos(angle) * maxRadius}
              y2={centerY + Math.sin(angle) * maxRadius}
              stroke={LUNA_PALETTE.sageGray}
              strokeWidth={0.5}
              strokeOpacity={0.07}
            />
          );
        })}

        <Circle
          cx={SCREEN_WIDTH / 2}
          cy={centerY}
          r={Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.35}
          fill="url(#orbGradient)"
        />
        <Circle
          cx={SCREEN_WIDTH / 2}
          cy={centerY}
          r={Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.21}
          fill="url(#innerGlow)"
        />

        <Path
          d={wave1Path}
          stroke={LUNA_PALETTE.midnightBlue}
          strokeWidth={3}
          strokeOpacity={0.7}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <Path
          d={wave2Path}
          stroke={LUNA_PALETTE.sageGray}
          strokeWidth={3}
          strokeOpacity={0.85}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <Path
          d={wave3Path}
          stroke={LUNA_PALETTE.beige}
          strokeWidth={3}
          strokeOpacity={0.65}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={handleTracePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LUNA_PALETTE.charcoal,
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
    color: 'rgba(212, 196, 168, 0.5)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
