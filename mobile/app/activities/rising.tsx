import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

import { FontFamily } from '../../constants/typography';
import Orb from '../../components/Orb';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function RisingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const sessionRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const pulseAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0.3);
  const riseAnim = useSharedValue(0);
  
  const [fontsLoaded] = useFonts({
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;

  useEffect(() => {
    sessionRef.current = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);

    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    glowAnim.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    riseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    return () => {
      if (sessionRef.current) {
        clearInterval(sessionRef.current);
      }
    };
  }, []);

  const orbContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulseAnim.value },
      { translateY: interpolate(riseAnim.value, [0, 1], [10, -10]) },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  const handleEndSession = () => {
    if (sessionRef.current) {
      clearInterval(sessionRef.current);
    }
    router.replace('/(tabs)/chat');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1B19', '#0E0F0D', '#0A0B09']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.ambientGlow}>
        <Animated.View style={[styles.glowCircle, glowStyle]}>
          <LinearGradient
            colors={['rgba(138, 155, 140, 0.15)', 'rgba(138, 155, 140, 0.05)', 'transparent']}
            locations={[0, 0.5, 1]}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      <View style={styles.content}>
        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, { fontFamily: canelaFont }]}>
            {formatTime(sessionSeconds)}
          </Text>
        </View>

        <View style={styles.orbWrapper}>
          <Animated.View style={[styles.orbContainer, orbContainerStyle]}>
            <Orb size={280} scale={1} />
          </Animated.View>
        </View>

        <View style={styles.instructionContainer}>
          <Text style={[styles.instructionText, { fontFamily: canelaFont }]}>
            Feel the gentle energy rising
          </Text>
          <Text style={[styles.subText, { fontFamily: canelaFont }]}>
            Pan the orb to explore its depth
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.endButton,
            { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
          ]}
          onPress={handleEndSession}
        >
          <Text style={[styles.endButtonText, { fontFamily: canelaFont }]}>
            End Session
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0F0D',
  },
  ambientGlow: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    borderRadius: SCREEN_WIDTH * 0.75,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContainer: {
    position: 'absolute',
    top: 80,
  },
  timerText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 2,
  },
  orbWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 160,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  endButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  endButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
});
