import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, Line } from 'react-native-svg';

import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { useGlobalAudio } from '../../contexts/AudioContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LUNA_PALETTE = {
  charcoal: '#1a1d1a',
  sageGray: '#6b7c6b',
  midnightBlue: '#2d3a4a',
  beige: '#d4c4a8',
  sageMuted: '#4a5a4a',
  fogWhite: '#e8e4dc',
};

function generateFlowingWavePath(
  width: number,
  centerY: number,
  amplitude: number,
  phase: number,
  yOffset: number
): string {
  const points: { x: number; y: number }[] = [];
  const segments = 60;
  
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width;
    const normalizedX = i / segments;
    
    const envelope = Math.sin(normalizedX * Math.PI);
    const wave = Math.sin(normalizedX * Math.PI * 2 + phase);
    const y = centerY + yOffset + wave * amplitude * envelope;
    
    points.push({ x, y });
  }
  
  if (points.length < 2) return '';
  
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    const cpX = (prev.x + curr.x) / 2;
    const cpY = prev.y;
    
    path += ` Q ${cpX.toFixed(1)} ${cpY.toFixed(1)} ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }
  
  return path;
}

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
  const voiceEnergyRef = useRef(0);
  const phaseRef = useRef(0);
  
  useEffect(() => {
    isVoicePlayingRef.current = isVoicePlaying;
  }, [isVoicePlaying]);
  
  const [wave1Path, setWave1Path] = useState('');
  const [wave2Path, setWave2Path] = useState('');
  const [wave3Path, setWave3Path] = useState('');
  const [orbScaleState, setOrbScaleState] = useState(1);
  
  const centerY = SCREEN_HEIGHT / 2 - 40;

  const { stop } = useGlobalAudio();

  useEffect(() => {
    stop();
  }, [stop]);

  useEffect(() => {
    let animationId: number;
    let lastTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      
      if (isVoicePlayingRef.current) {
        phaseRef.current += delta * 0.003;
        
        const voiceModulation = Math.sin(now * 0.002) * 0.4 + 0.6;
        const targetEnergy = 0.8 + voiceModulation * 0.4;
        voiceEnergyRef.current += (targetEnergy - voiceEnergyRef.current) * 0.1;
      } else {
        phaseRef.current += delta * 0.001;
        voiceEnergyRef.current += (0.3 - voiceEnergyRef.current) * 0.05;
      }
      
      const energy = voiceEnergyRef.current;
      const phase = phaseRef.current;
      
      const amp1 = 30 * energy;
      const amp2 = 45 * energy;
      const amp3 = 25 * energy;
      
      setWave1Path(generateFlowingWavePath(SCREEN_WIDTH, centerY, amp1, phase + 1.0, -35));
      setWave2Path(generateFlowingWavePath(SCREEN_WIDTH, centerY, amp2, phase, 0));
      setWave3Path(generateFlowingWavePath(SCREEN_WIDTH, centerY, amp3, phase - 0.8, 30));
      
      const orbPulse = 1 + energy * 0.08 + Math.sin(phase * 0.5) * 0.03;
      setOrbScaleState(orbPulse);
      
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
        
        voice.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsVoicePlaying(false);
            setTimeout(() => {
              router.replace('/(tabs)/chat');
            }, 2000);
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
    router.replace('/(tabs)/chat');
  };

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
          r={Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.35 * orbScaleState}
          fill="url(#orbGradient)"
        />
        <Circle
          cx={SCREEN_WIDTH / 2}
          cy={centerY}
          r={Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.21 * orbScaleState}
          fill="url(#innerGlow)"
        />

        <Path
          d={wave1Path}
          stroke={LUNA_PALETTE.midnightBlue}
          strokeWidth={2.5}
          strokeOpacity={0.6}
          fill="none"
          strokeLinecap="round"
        />
        
        <Path
          d={wave2Path}
          stroke={LUNA_PALETTE.sageGray}
          strokeWidth={2.5}
          strokeOpacity={0.75}
          fill="none"
          strokeLinecap="round"
        />
        
        <Path
          d={wave3Path}
          stroke={LUNA_PALETTE.beige}
          strokeWidth={2.5}
          strokeOpacity={0.55}
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
