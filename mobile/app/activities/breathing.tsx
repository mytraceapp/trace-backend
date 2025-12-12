import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

import { FontFamily } from '../../constants/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ORB_SIZE = 200;

const TOTAL_DURATION = 30;
const PHASE_DURATION = 3000;

export default function BreathingActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const phaseInterval = useRef<NodeJS.Timeout | null>(null);

  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const orbScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const innerGlowScale = useSharedValue(0.8);

  useEffect(() => {
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= TOTAL_DURATION) {
          if (progressInterval.current) clearInterval(progressInterval.current);
          return TOTAL_DURATION;
        }
        return prev + 0.1;
      });
    }, 100);

    phaseInterval.current = setInterval(() => {
      setPhase((prev) => (prev === 'inhale' ? 'exhale' : 'inhale'));
    }, PHASE_DURATION);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (phaseInterval.current) clearInterval(phaseInterval.current);
    };
  }, []);

  useEffect(() => {
    if (phase === 'inhale') {
      orbScale.value = withTiming(0.85, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
      glowOpacity.value = withTiming(0.5, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
      innerGlowScale.value = withTiming(1.3, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
    } else {
      orbScale.value = withTiming(1.15, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
      glowOpacity.value = withTiming(0.7, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
      innerGlowScale.value = withTiming(1.5, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
    }
  }, [phase]);

  const animatedOrbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const animatedInnerGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerGlowScale.value }],
  }));

  const progressPercentage = (progress / TOTAL_DURATION) * 100;
  const remainingTime = Math.max(0, Math.ceil(TOTAL_DURATION - progress));

  const handleFinish = () => {
    setIsActive(false);
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (phaseInterval.current) clearInterval(phaseInterval.current);
    router.back();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#9AB09C', '#8AA08C', '#7A907C']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={styles.backButton}
          onPress={handleFinish}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color="#EDE8DB" strokeWidth={1.5} />
        </Pressable>
        <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.instructionTop}>
        <Text style={[styles.phaseText, { fontFamily: canelaFont }]}>
          {phase === 'inhale' ? 'inhale…' : 'exhale…'}
        </Text>
      </View>

      <View style={styles.orbContainer}>
        <Animated.View style={[styles.outerGlow, animatedGlowStyle]} />
        
        <Animated.View style={[styles.orbWrapper, animatedOrbStyle]}>
          <LinearGradient
            colors={[
              'rgba(255,255,255,0.4)',
              'rgba(245,250,245,0.35)',
              'rgba(230,240,235,0.28)',
              'rgba(210,230,225,0.22)',
            ]}
            locations={[0, 0.3, 0.6, 1]}
            start={{ x: 0.45, y: 0.35 }}
            end={{ x: 0.55, y: 0.65 }}
            style={styles.orb}
          >
            <Animated.View style={[styles.innerGlow, animatedInnerGlowStyle]}>
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.45)',
                  'rgba(248,252,250,0.32)',
                  'rgba(240,248,245,0.2)',
                  'transparent',
                ]}
                locations={[0, 0.35, 0.6, 0.8]}
                style={styles.innerGlowGradient}
              />
            </Animated.View>

            <View style={styles.pearlHighlight}>
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.6)',
                  'rgba(248,252,250,0.38)',
                  'transparent',
                ]}
                locations={[0, 0.45, 0.85]}
                style={styles.pearlGradient}
              />
            </View>

            <View style={styles.aquaAccent}>
              <LinearGradient
                colors={[
                  'rgba(210,235,230,0.5)',
                  'rgba(200,218,215,0.28)',
                  'transparent',
                ]}
                locations={[0, 0.55, 0.8]}
                style={styles.aquaGradient}
              />
            </View>
          </LinearGradient>
        </Animated.View>
      </View>

      <View style={styles.instructionBottom}>
        <Text style={[styles.phaseTextSecondary, { fontFamily: canelaFont }]}>
          {phase === 'exhale' ? 'exhale…' : 'inhale…'}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
        </View>
        <Text style={[styles.timerText, { fontFamily: canelaFont }]}>
          {remainingTime}s remaining
        </Text>
      </View>

      <View style={styles.guidanceContainer}>
        <Text style={[styles.guidanceText, { fontFamily: canelaFont }]}>
          Just follow the orb. You're doing great.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.finishButton,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          onPress={handleFinish}
        >
          <View style={styles.finishButtonInner}>
            <Text style={[styles.finishButtonText, { fontFamily: canelaFont }]}>
              Finish Session
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  traceLabel: {
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 4,
    color: '#EDE8DB',
    opacity: 0.7,
  },
  placeholder: {
    width: 44,
  },
  instructionTop: {
    alignItems: 'center',
    marginTop: 20,
  },
  phaseText: {
    fontSize: 20,
    fontWeight: '300',
    color: '#EDE8DB',
    letterSpacing: 2,
    opacity: 0.9,
  },
  orbContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40,
  },
  outerGlow: {
    position: 'absolute',
    width: ORB_SIZE + 140,
    height: ORB_SIZE + 140,
    borderRadius: (ORB_SIZE + 140) / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  orbWrapper: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
  },
  orb: {
    width: '100%',
    height: '100%',
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerGlow: {
    position: 'absolute',
    width: '70%',
    height: '70%',
    borderRadius: ORB_SIZE * 0.35,
    overflow: 'hidden',
  },
  innerGlowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: ORB_SIZE * 0.35,
  },
  pearlHighlight: {
    position: 'absolute',
    top: '20%',
    left: '25%',
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  pearlGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  aquaAccent: {
    position: 'absolute',
    bottom: '25%',
    right: '20%',
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  aquaGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  instructionBottom: {
    alignItems: 'center',
    marginTop: -60,
  },
  phaseTextSecondary: {
    fontSize: 18,
    fontWeight: '300',
    color: '#EDE8DB',
    letterSpacing: 2,
    opacity: 0.7,
  },
  progressContainer: {
    paddingHorizontal: 48,
    marginTop: 24,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(237, 232, 219, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(237, 232, 219, 0.8)',
    borderRadius: 2,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '300',
    color: '#EDE8DB',
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 1,
  },
  guidanceContainer: {
    paddingHorizontal: 32,
    marginTop: 20,
  },
  guidanceText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#EDE8DB',
    opacity: 0.7,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  finishButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  finishButtonInner: {
    backgroundColor: '#EDE8DB',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 30,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7A6E',
    letterSpacing: 0.5,
  },
});
