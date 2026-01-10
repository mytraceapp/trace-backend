import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, Line } from 'react-native-svg';

import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { stopAmbient } from '../../lib/ambientAudio';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LUNA_PALETTE = {
  charcoal: '#1a1d1a',
  sageGray: '#6b7c6b',
  midnightBlue: '#2d3a4a',
  beige: '#d4c4a8',
  sageMuted: '#4a5a4a',
  fogWhite: '#e8e4dc',
};

export default function EchoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const audioRef = useRef<Audio.Sound | null>(null);
  
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const isVoicePlayingRef = useRef(false);
  const playbackProgressRef = useRef(0);
  
  useEffect(() => {
    isVoicePlayingRef.current = isVoicePlaying;
  }, [isVoicePlaying]);
  
  const [waveAmplitudes, setWaveAmplitudes] = useState({ w1: 20, w2: 30, w3: 15 });
  const [orbScale, setOrbScale] = useState(1);
  
  const centerY = SCREEN_HEIGHT / 2 - 40;

  useEffect(() => {
    let animationId: number;
    let time = 0;
    
    const smoothAmps = { w1: 20, w2: 30, w3: 15 };
    let smoothOrbScale = 1;
    
    const animate = () => {
      time += 16;
      
      let targetW1 = 15;
      let targetW2 = 25;
      let targetW3 = 12;
      let targetOrb = 1;
      
      if (isVoicePlayingRef.current) {
        const progress = playbackProgressRef.current;
        
        const breathPhase = Math.sin(time * 0.002);
        const voicePulse = Math.sin(time * 0.004) * 0.5 + Math.sin(time * 0.007) * 0.3;
        
        const intensity = 0.6 + breathPhase * 0.2 + voicePulse * 0.2;
        
        targetW1 = 25 + intensity * 35;
        targetW2 = 40 + intensity * 50;
        targetW3 = 20 + intensity * 30;
        targetOrb = 1 + intensity * 0.12;
      } else {
        const idleBreath = Math.sin(time * 0.001) * 0.3 + 0.7;
        targetW1 = 10 + idleBreath * 8;
        targetW2 = 15 + idleBreath * 12;
        targetW3 = 8 + idleBreath * 6;
        targetOrb = 1 + idleBreath * 0.03;
      }
      
      const smoothing = 0.08;
      smoothAmps.w1 += (targetW1 - smoothAmps.w1) * smoothing;
      smoothAmps.w2 += (targetW2 - smoothAmps.w2) * smoothing;
      smoothAmps.w3 += (targetW3 - smoothAmps.w3) * smoothing;
      smoothOrbScale += (targetOrb - smoothOrbScale) * smoothing;
      
      setWaveAmplitudes({ 
        w1: smoothAmps.w1, 
        w2: smoothAmps.w2, 
        w3: smoothAmps.w3 
      });
      setOrbScale(smoothOrbScale);
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  useEffect(() => {
    const setupAudio = async () => {
      await stopAmbient();
      
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      
      setTimeout(async () => {
        const { sound: voice } = await Audio.Sound.createAsync(
          require('../../assets/audio/echo.mp3'),
          {
            volume: 0,
            rate: 0.99,
            shouldCorrectPitch: true,
          }
        );
        audioRef.current = voice;
        setIsVoicePlaying(true);
        await voice.playAsync();
        
        let vol = 0;
        const targetVol = 0.85;
        const fadeIn = setInterval(async () => {
          vol += 0.01;
          if (vol >= targetVol) {
            vol = targetVol;
            clearInterval(fadeIn);
          }
          await voice.setVolumeAsync(vol);
        }, 50);
        
        voice.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            if (status.durationMillis && status.positionMillis) {
              playbackProgressRef.current = status.positionMillis / status.durationMillis;
            }
            if (status.didJustFinish) {
              setIsVoicePlaying(false);
              setTimeout(() => {
                const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
                router.replace({
                  pathname: '/(tabs)/chat',
                  params: {
                    completedActivity: 'Echo',
                    activityDuration: durationSeconds.toString(),
                  },
                });
              }, 2000);
            }
          }
        });
      }, 3000);
    };
    
    setupAudio();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.unloadAsync();
      }
    };
  }, []);

  const handleTracePress = async () => {
    if (audioRef.current) {
      await audioRef.current.stopAsync();
    }
    const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
    router.replace({
      pathname: '/(tabs)/chat',
      params: {
        completedActivity: 'Echo',
        activityDuration: durationSeconds.toString(),
      },
    });
  };
  
  const sessionStartRef = useRef<number>(Date.now());

  const handleScreenPress = async () => {
    if (audioRef.current) {
      let vol = 0.85;
      const fadeInterval = setInterval(async () => {
        vol -= 0.04;
        if (vol <= 0) {
          clearInterval(fadeInterval);
          await audioRef.current?.stopAsync();
        } else if (audioRef.current) {
          await audioRef.current.setVolumeAsync(vol);
        }
      }, 20);
    }
    setTimeout(() => {
      router.back();
    }, 500);
  };

  const maxRadius = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.9;
  
  const createWavePath = (amplitude: number, yOffset: number) => {
    const startX = 0;
    const endX = SCREEN_WIDTH;
    const midX = SCREEN_WIDTH / 2;
    const baseY = centerY + yOffset;
    const peakY = baseY - amplitude;
    
    return `M ${startX} ${baseY} Q ${midX} ${peakY} ${endX} ${baseY}`;
  };

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
          r={Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.35 * orbScale}
          fill="url(#orbGradient)"
        />
        <Circle
          cx={SCREEN_WIDTH / 2}
          cy={centerY}
          r={Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.21 * orbScale}
          fill="url(#innerGlow)"
        />

        <Path
          d={createWavePath(waveAmplitudes.w1, -30)}
          stroke={LUNA_PALETTE.midnightBlue}
          strokeWidth={2}
          strokeOpacity={0.5}
          fill="none"
          strokeLinecap="round"
        />
        
        <Path
          d={createWavePath(waveAmplitudes.w2, 0)}
          stroke={LUNA_PALETTE.sageGray}
          strokeWidth={2.5}
          strokeOpacity={0.7}
          fill="none"
          strokeLinecap="round"
        />
        
        <Path
          d={createWavePath(waveAmplitudes.w3, 25)}
          stroke={LUNA_PALETTE.beige}
          strokeWidth={2}
          strokeOpacity={0.5}
          fill="none"
          strokeLinecap="round"
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
    paddingLeft: TraceWordmark.paddingLeft,
    textAlign: 'center',
  },
});
