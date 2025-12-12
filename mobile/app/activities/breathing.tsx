import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { Shadows } from '../../constants/shadows';
import Orb from '../../components/Orb';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORB_SIZE = 200;

const TOTAL_DURATION = 30;
const PHASE_DURATION = 3000;

export default function BreathingActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [progress, setProgress] = useState(0);
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
      orbScale.value = withTiming(0.92, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
    } else {
      orbScale.value = withTiming(1.08, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
    }
  }, [phase]);

  const animatedOrbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  const progressPercentage = (progress / TOTAL_DURATION) * 100;
  const remainingTime = Math.max(0, Math.ceil(TOTAL_DURATION - progress));

  const handleFinish = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (phaseInterval.current) clearInterval(phaseInterval.current);
    router.back();
  };

  const TAB_BAR_HEIGHT = 60;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#9AB09C', '#8DA58F', '#809882']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
        <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
      </View>

      <View style={styles.orbContainer}>
        <Animated.View style={[styles.orbWrapper, animatedOrbStyle]}>
          <Orb size={ORB_SIZE} />
        </Animated.View>
      </View>

      <View style={styles.contentBelow}>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={[styles.timerText, { fontFamily: canelaFont }]}>
            {remainingTime}s remaining
          </Text>
        </View>

        <Text style={[styles.guidanceText, { fontFamily: canelaFont }]}>
          Just follow the orb. You're doing great.
        </Text>

        <Text style={[styles.soundPrompt, { fontFamily: canelaFont }]}>
          Tap anywhere to enable breathing sounds
        </Text>

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
    color: '#EDE8DB',
    opacity: 0.7,
    ...Shadows.traceWordmark,
  },
  orbContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  orbWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBelow: {
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(237, 232, 219, 0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(237, 232, 219, 0.8)',
    borderRadius: 1,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#4B4B4B',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  guidanceText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#4B4B4B',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  soundPrompt: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B6761',
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 32,
    letterSpacing: 0.3,
  },
  finishButton: {
    marginTop: 16,
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
