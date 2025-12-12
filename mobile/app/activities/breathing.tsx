import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Activity, BookOpen, User, HelpCircle } from 'lucide-react-native';
import { useFonts } from 'expo-font';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { FontFamily } from '../../constants/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORB_SIZE = 240;

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
  const glowOpacity = useSharedValue(0.6);

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
      orbScale.value = withTiming(0.9, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
      glowOpacity.value = withTiming(0.5, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
    } else {
      orbScale.value = withTiming(1.1, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
      glowOpacity.value = withTiming(0.8, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
    }
  }, [phase]);

  const animatedOrbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
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

      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
      </View>

      <View style={styles.orbContainer}>
        <Animated.View style={[styles.outerGlow, animatedGlowStyle]} />
        <Animated.View style={[styles.middleGlow, animatedGlowStyle]} />
        <Animated.View style={[styles.orbWrapper, animatedOrbStyle]}>
          <View style={styles.orb} />
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

      <View style={[styles.tabBar, { paddingBottom: bottomPadding, height: TAB_BAR_HEIGHT + bottomPadding }]}>
        <LinearGradient
          colors={[
            'rgba(168, 181, 170, 0.673)',
            'rgba(158, 173, 160, 0.873)',
            'rgba(148, 165, 150, 0.973)',
            'rgba(138, 158, 142, 1.0)',
            'rgba(128, 150, 134, 1.0)',
          ]}
          locations={[0, 0.25, 0.5, 0.75, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.tabBarContent}>
          <Pressable style={styles.tabItem} onPress={() => router.replace('/(tabs)/chat')}>
            <Home size={18} color="#E8E5DE" strokeWidth={1.5} />
            <Text style={styles.tabLabel}>Home</Text>
          </Pressable>
          <Pressable style={styles.tabItem} onPress={() => router.replace('/(tabs)/activities')}>
            <Activity size={18} color="#E8E5DE" strokeWidth={1.5} />
            <Text style={styles.tabLabel}>Activity</Text>
          </Pressable>
          <Pressable style={styles.tabItem} onPress={() => router.replace('/(tabs)/entries')}>
            <BookOpen size={18} color="#E8E5DE" strokeWidth={1.5} />
            <Text style={styles.tabLabel}>Entries</Text>
          </Pressable>
          <Pressable style={styles.tabItem} onPress={() => router.replace('/(tabs)/profile')}>
            <User size={18} color="#E8E5DE" strokeWidth={1.5} />
            <Text style={styles.tabLabel}>Profile</Text>
          </Pressable>
          <Pressable style={styles.tabItem} onPress={() => router.replace('/(tabs)/journal')}>
            <HelpCircle size={18} color="#E8E5DE" strokeWidth={1.5} />
            <Text style={styles.tabLabel}>Help</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  traceLabel: {
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 4,
    color: '#EDE8DB',
    opacity: 0.7,
  },
  orbContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40,
  },
  outerGlow: {
    position: 'absolute',
    width: ORB_SIZE + 120,
    height: ORB_SIZE + 120,
    borderRadius: (ORB_SIZE + 120) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  middleGlow: {
    position: 'absolute',
    width: ORB_SIZE + 60,
    height: ORB_SIZE + 60,
    borderRadius: (ORB_SIZE + 60) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
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
    color: '#EDE8DB',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  guidanceText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#EDE8DB',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  soundPrompt: {
    fontSize: 12,
    fontWeight: '400',
    color: '#EDE8DB',
    opacity: 0.6,
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
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 1,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 50,
    marginTop: 20,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.3,
    textAlign: 'center',
    color: '#E8E5DE',
    fontFamily: 'Georgia',
  },
});
