import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Wind, Compass, Footprints, Moon, Droplets, Hand, Activity, Sunrise, Circle } from 'lucide-react-native';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Colors } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function RainDropIcon({ color, size = 48 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5C12 2.5 5 10 5 14.5C5 18.366 8.134 21.5 12 21.5C15.866 21.5 19 18.366 19 14.5C19 10 12 2.5 12 2.5Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const ACTIVITY_DATA: Record<string, {
  title: string;
  description: string;
  duration: string;
  instruction: string;
  Icon: typeof Wind | null;
  customIcon?: string;
  gradientColors: [string, string, string];
  iconColor: string;
}> = {
  breathing: {
    title: 'Breathing',
    description: 'A calming 30-second reset.',
    duration: '30 seconds',
    instruction: 'Breathe in slowly for 4 counts, hold for 4, exhale for 4. Let your body relax with each breath.',
    Icon: Wind,
    gradientColors: ['#F5F1EB', '#E8E4DD', '#DDD9D2'],
    iconColor: '#4B4B4B',
  },
  maze: {
    title: 'Trace the Maze',
    description: 'Slow your mind with gentle tracing.',
    duration: '2-3 minutes',
    instruction: 'Follow the path with your finger. There\'s no rush. Let your thoughts quiet as you trace.',
    Icon: Compass,
    gradientColors: ['#D3CFC8', '#C9C3BA', '#BEB8AF'],
    iconColor: '#A29485',
  },
  walking: {
    title: 'Walking Reset',
    description: 'Two minutes of slow-paced movement.',
    duration: '2 minutes',
    instruction: 'Walk slowly and deliberately. Feel each step. Notice your surroundings without judgment.',
    Icon: Footprints,
    gradientColors: ['#DDD9D2', '#D3CFC8', '#C9C3BA'],
    iconColor: '#4B4B4B',
  },
  rest: {
    title: 'Rest',
    description: 'Five minutes of quiet stillness.',
    duration: '5 minutes',
    instruction: 'Find a comfortable position. Close your eyes. Let your mind drift into stillness.',
    Icon: Moon,
    gradientColors: ['#E8E4DD', '#DDD9D2', '#D3CFC8'],
    iconColor: '#4B4B4B',
  },
  ripple: {
    title: 'Ripple',
    description: 'Immersive flowing light.',
    duration: '1-2 minutes',
    instruction: 'Watch the gentle ripples. Let the movement calm your thoughts.',
    Icon: Droplets,
    gradientColors: ['#FAF8F5', '#F5F1EB', '#EDE9E2'],
    iconColor: '#9A8778',
  },
  grounding: {
    title: 'Grounding',
    description: 'Connect with your surroundings.',
    duration: '2-3 minutes',
    instruction: 'Name 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste.',
    Icon: Hand,
    gradientColors: ['#FAF8F5', '#F5F1EB', '#EDE9E2'],
    iconColor: '#9A8778',
  },
  window: {
    title: 'Window',
    description: 'Watch the rain. Drift away.',
    duration: '3-5 minutes',
    instruction: 'Listen to the rain. Watch each drop. Let the rhythm soothe your mind.',
    Icon: null,
    customIcon: 'raindrop',
    gradientColors: ['#C9C3BA', '#BEB8AF', '#B3ADA4'],
    iconColor: '#6B6358',
  },
  echo: {
    title: 'Echo',
    description: 'Gentle waves of calm.',
    duration: '2 minutes',
    instruction: 'Listen to the gentle echoes. Let them wash over you like waves.',
    Icon: Activity,
    gradientColors: ['#D8D4CD', '#D0CCC5', '#C8C4BD'],
    iconColor: '#9A8778',
  },
  rising: {
    title: 'Rising',
    description: 'Gentle energy to start fresh.',
    duration: '1-2 minutes',
    instruction: 'Feel the energy slowly building. Let it lift you gently.',
    Icon: Sunrise,
    gradientColors: ['#F3EFE7', '#EBE7DF', '#E3DFD7'],
    iconColor: '#9A8778',
  },
  bubble: {
    title: 'Drift',
    description: 'Release pressure. Pop the tension.',
    duration: '2-3 minutes',
    instruction: 'Tap to release. Each pop is a worry floating away.',
    Icon: Circle,
    gradientColors: ['#ECE9E4', '#E5E2DD', '#DDD9D4'],
    iconColor: '#9A8778',
  },
};

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const activity = ACTIVITY_DATA[id || 'breathing'];
  
  if (!activity) {
    return (
      <View style={styles.container}>
        <Text>Activity not found</Text>
      </View>
    );
  }

  const { title, description, duration, instruction, Icon, customIcon, gradientColors, iconColor } = activity;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable 
          style={styles.backButton} 
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color="#4B4B4B" strokeWidth={1.5} />
        </Pressable>
        <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <LinearGradient
            colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.3)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.largeIconContainer}
          >
            {customIcon === 'raindrop' ? (
              <RainDropIcon color={iconColor} size={48} />
            ) : Icon ? (
              <Icon size={48} color={iconColor} strokeWidth={1.2} />
            ) : null}
          </LinearGradient>
        </View>

        <Text style={[styles.title, { fontFamily: canelaFont }]}>{title}</Text>
        <Text style={[styles.description, { fontFamily: canelaFont }]}>{description}</Text>
        
        <View style={styles.durationBadge}>
          <Text style={[styles.durationText, { fontFamily: canelaFont }]}>{duration}</Text>
        </View>

        <Text style={[styles.instruction, { fontFamily: canelaFont }]}>{instruction}</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
          ]}
          onPress={() => console.log(`Starting ${id} activity...`)}
        >
          <LinearGradient
            colors={['#8A9B8C', '#7A8B7C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.startButtonGradient}
          >
            <Text style={[styles.startButtonText, { fontFamily: canelaFont }]}>Begin</Text>
          </LinearGradient>
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
    color: '#5A4A3A',
    opacity: 0.7,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrapper: {
    marginBottom: 32,
  },
  largeIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#4B4B4B',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: '#8A8680',
    marginBottom: 20,
    textAlign: 'center',
  },
  durationBadge: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 32,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B6761',
  },
  instruction: {
    fontSize: 15,
    fontWeight: '400',
    color: '#6B6761',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 24,
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  startButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
