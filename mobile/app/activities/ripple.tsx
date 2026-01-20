import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { Audio } from 'expo-av';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';

import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { Shadows } from '../../constants/shadows';
import { stopAmbient } from '../../lib/ambientAudio';
import { storePendingActivityCompletion } from '../../lib/activityCompletion';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const TOTAL_DURATION = 60;
const COUNTDOWN_STEPS = [
  { number: '3', instruction: 'Inhale slowly' },
  { number: '2', instruction: 'Drop your shoulders' },
  { number: '1', instruction: 'Let everything soften' },
];

interface RippleRingProps {
  index: number;
  cx: number;
  cy: number;
  baseDelay: number;
  isSecondary?: boolean;
}

function RippleRing({ index, cx, cy, baseDelay, isSecondary = false }: RippleRingProps) {
  const progress = useSharedValue(0);
  
  const duration = isSecondary ? 16000 : 14000;
  const delay = isSecondary ? (index * 3500 + 1000) : (index * 2200);
  const startRadius = isSecondary ? 30 : 35;
  const maxScale = isSecondary ? 8 : 7;
  const baseOpacity = isSecondary ? (0.35 - index * 0.06) : (0.44 - index * 0.05);
  const strokeWidth = isSecondary ? 2 : 3;
  const strokeColor = isSecondary 
    ? 'rgba(154, 135, 120, 0.19)' 
    : 'rgba(168, 149, 133, 0.225)';

  useEffect(() => {
    const startAnimation = () => {
      progress.value = 0;
      progress.value = withRepeat(
        withDelay(
          delay + baseDelay,
          withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
        ),
        -1,
        false
      );
    };
    startAnimation();
  }, []);

  const animatedProps = useAnimatedProps(() => {
    const scale = interpolate(progress.value, [0, 1], [1, maxScale]);
    const opacity = interpolate(progress.value, [0, 0.1, 1], [0, baseOpacity, 0]);
    return {
      r: startRadius * scale,
      opacity,
    };
  });

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      fill="transparent"
      animatedProps={animatedProps}
    />
  );
}

export default function RippleActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [countdownStep, setCountdownStep] = useState<number | null>(0);
  const [showMainText, setShowMainText] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_DURATION);
  const [sessionActive, setSessionActive] = useState(true);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const countdownOpacity = useSharedValue(1);
  const mainTextOpacity = useSharedValue(0);
  const centralGlowScale = useSharedValue(1);
  const centralGlowOpacity = useSharedValue(0.6);

  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT * 0.45;

  useEffect(() => {
    let isMounted = true;
    let localSound: Audio.Sound | null = null;

    const loadAndPlayAudio = async () => {
      try {
        await stopAmbient();
        
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        if (!isMounted) return;

        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/audio/ripple-ambient.mp3'),
          { 
            isLooping: false, 
            volume: 0,
            positionMillis: 0,
            rate: 0.75,
            shouldCorrectPitch: true,
          }
        );
        
        if (!isMounted) {
          await sound.unloadAsync();
          return;
        }
        
        localSound = sound;
        soundRef.current = sound;

        sound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.isLoaded && status.didJustFinish && isMounted) {
            await storePendingActivityCompletion('Ripple', TOTAL_DURATION);
            router.replace({
              pathname: '/(tabs)/chat',
              params: {
                completedActivity: 'Ripple',
                activityDuration: TOTAL_DURATION.toString(),
              },
            });
          }
        });

        setTimeout(async () => {
          if (isMounted && soundRef.current) {
            await soundRef.current.playAsync();
            const maxVolume = 0.28;
            for (let i = 1; i <= 20; i++) {
              setTimeout(async () => {
                if (isMounted && soundRef.current) {
                  const vol = Math.min((maxVolume / 20) * i, maxVolume);
                  await soundRef.current.setVolumeAsync(vol);
                }
              }, i * 150);
            }
          }
        }, 500);
      } catch (error) {
        console.log('Audio loading error:', error);
      }
    };

    loadAndPlayAudio();

    return () => {
      isMounted = false;
      const fadeOutAndUnload = async () => {
        const soundToClean = localSound || soundRef.current;
        if (soundToClean) {
          try {
            const status = await soundToClean.getStatusAsync();
            if (status.isLoaded) {
              const currentVolume = status.volume || 0.35;
              for (let i = 10; i >= 0; i--) {
                await new Promise(resolve => setTimeout(resolve, 50));
                await soundToClean.setVolumeAsync(currentVolume * (i / 10));
              }
              await soundToClean.stopAsync();
              await soundToClean.unloadAsync();
            }
          } catch (error) {
            console.log('Audio cleanup error:', error);
          }
        }
        soundRef.current = null;
      };
      fadeOutAndUnload();
    };
  }, []);

  useEffect(() => {
    centralGlowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    centralGlowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (countdownStep === null) return;

    const timer = setTimeout(() => {
      if (countdownStep < 2) {
        countdownOpacity.value = withTiming(0, { duration: 400 }, () => {
          runOnJS(setCountdownStep)(countdownStep + 1);
          countdownOpacity.value = withTiming(1, { duration: 400 });
        });
      } else {
        countdownOpacity.value = withTiming(0, { duration: 500 }, () => {
          runOnJS(setCountdownStep)(null);
          runOnJS(setShowMainText)(true);
          mainTextOpacity.value = withTiming(1, { duration: 1500 });
          
          setTimeout(() => {
            mainTextOpacity.value = withTiming(0, { duration: 1500 }, () => {
              runOnJS(setShowMainText)(false);
            });
          }, 6000);
        });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [countdownStep]);

  useEffect(() => {
    if (!sessionActive || timeRemaining <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setSessionActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionActive]);

  const handleEndSession = async () => {
    setSessionActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          const currentVolume = status.volume || 0.35;
          for (let i = 10; i >= 0; i--) {
            await new Promise(resolve => setTimeout(resolve, 40));
            if (soundRef.current) {
              await soundRef.current.setVolumeAsync(currentVolume * (i / 10));
            }
          }
        }
      } catch (error) {
        console.log('Fade out error:', error);
      }
    }
    
    setTimeout(async () => {
      const durationSeconds = TOTAL_DURATION - timeRemaining;
      await storePendingActivityCompletion('Ripple', durationSeconds);
      router.replace({
        pathname: '/(tabs)/chat',
        params: {
          completedActivity: 'Ripple',
          activityDuration: durationSeconds.toString(),
        },
      });
    }, 500);
  };

  const countdownAnimatedStyle = useAnimatedStyle(() => ({
    opacity: countdownOpacity.value,
  }));

  const mainTextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mainTextOpacity.value,
  }));

  const centralGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: centralGlowScale.value }],
    opacity: centralGlowOpacity.value,
  }));

  const TAB_BAR_HEIGHT = 60;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#F8F6F3', '#F0EDE8', '#E8E4DF', '#E0DCD7']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.ambientGlow, { top: centerY - 140, left: centerX - 140 }]} />

      <Animated.View 
        style={[
          styles.centralGlow, 
          { top: centerY - 105, left: centerX - 105 },
          centralGlowStyle
        ]} 
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <RippleRing 
              key={`primary-${i}`} 
              index={i} 
              cx={centerX} 
              cy={centerY}
              baseDelay={0}
            />
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <RippleRing 
              key={`secondary-${i}`} 
              index={i} 
              cx={centerX} 
              cy={centerY}
              baseDelay={0}
              isSecondary
            />
          ))}
        </Svg>
      </View>

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
        <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
      </View>

      {countdownStep !== null && (
        <Animated.View style={[styles.countdownContainer, { top: centerY - 34 }, countdownAnimatedStyle]}>
          <Text style={[styles.countdownNumber, { fontFamily: canelaFont }]}>
            {COUNTDOWN_STEPS[countdownStep].number}
          </Text>
          <Text style={[styles.countdownInstruction, { fontFamily: canelaFont }]}>
            {COUNTDOWN_STEPS[countdownStep].instruction}
          </Text>
        </Animated.View>
      )}

      {showMainText && (
        <Animated.View style={[styles.mainTextContainer, { top: centerY - 30 }, mainTextAnimatedStyle]}>
          <Text style={[styles.mainText, { fontFamily: canelaFont }]}>
            Let this moment take over.
          </Text>
        </Animated.View>
      )}

      <View style={[styles.endButtonContainer, { bottom: TAB_BAR_HEIGHT + bottomPadding + 30 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.endButton,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
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
  },
  ambientGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  centralGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
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
    color: '#5A4A3A',
    opacity: 0.88,
    paddingLeft: TraceWordmark.paddingLeft,
    textAlign: 'center',
    ...Shadows.traceWordmark,
  },
  countdownContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: '300',
    color: '#9A8778',
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 20,
    marginBottom: 16,
  },
  countdownInstruction: {
    fontSize: 18,
    fontWeight: '300',
    color: '#A89585',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  mainTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 10,
  },
  mainText: {
    fontSize: 22,
    fontWeight: '300',
    color: '#9A8778',
    letterSpacing: 1.5,
    lineHeight: 32,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 15,
  },
  endButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  endButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
  },
  endButtonText: {
    fontSize: 14,
    fontWeight: '300',
    color: 'rgba(154, 135, 120, 0.85)',
    letterSpacing: 1.5,
  },
});
