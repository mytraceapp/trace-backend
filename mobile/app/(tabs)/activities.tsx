import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Wind, Compass, Footprints, Moon, Droplets, Hand, Activity, Sunrise, Circle } from 'lucide-react-native';
import { useFonts } from 'expo-font';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 16;
const SCREEN_PADDING = 24;
const CARD_WIDTH = (SCREEN_WIDTH - SCREEN_PADDING * 2 - CARD_GAP) / 2;
const CARD_CONTENT_HEIGHT = 175;
const CARD_PADDING = 20;

const dayColors = {
  textPrimary: '#4B4B4B',
  textSecondary: '#8A8680',
  traceBrand: '#5A4A3A',
};

function RainDropIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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

const ACTIVITIES = [
  {
    id: 'breathing',
    title: 'Breathing',
    description: 'A calming 30-second reset.',
    Icon: Wind,
    iconColor: '#4B4B4B',
    gradientColors: ['#FFFFFF', '#FAF9F7'] as [string, string],
    iconBgColors: ['rgba(138, 134, 128, 0.12)', 'rgba(138, 134, 128, 0.06)'] as [string, string],
    descColor: '#8A8680',
    customIcon: null,
  },
  {
    id: 'maze',
    title: 'Trace the Maze',
    description: 'Slow your mind with gentle tracing.',
    Icon: Compass,
    iconColor: '#A29485',
    gradientColors: ['#D3CFC8', '#CCC8C1'] as [string, string],
    iconBgColors: ['rgba(162, 148, 133, 0.2)', 'rgba(162, 148, 133, 0.1)'] as [string, string],
    descColor: '#6B6761',
    customIcon: null,
  },
  {
    id: 'walking',
    title: 'Walking Reset',
    description: 'Two minutes of slow-paced movement.',
    Icon: Footprints,
    iconColor: '#4B4B4B',
    gradientColors: ['#DDD9D2', '#D3CFC8'] as [string, string],
    iconBgColors: ['rgba(138, 134, 128, 0.15)', 'rgba(138, 134, 128, 0.08)'] as [string, string],
    descColor: '#8A8680',
    customIcon: null,
  },
  {
    id: 'rest',
    title: 'Rest',
    description: 'Five minutes of quiet stillness.',
    Icon: Moon,
    iconColor: '#4B4B4B',
    gradientColors: ['#E8E4DD', '#DDD9D2'] as [string, string],
    iconBgColors: ['rgba(138, 134, 128, 0.18)', 'rgba(138, 134, 128, 0.09)'] as [string, string],
    descColor: '#8A8680',
    customIcon: null,
  },
  {
    id: 'ripple',
    title: 'Ripple',
    description: 'Immersive flowing light.',
    Icon: Droplets,
    iconColor: '#9A8778',
    gradientColors: ['#FFFFFF', '#FAF8F5'] as [string, string],
    iconBgColors: ['rgba(190, 185, 180, 0.15)', 'rgba(190, 185, 180, 0.08)'] as [string, string],
    descColor: '#8A8680',
    customIcon: null,
  },
  {
    id: 'grounding',
    title: 'Grounding',
    description: 'Connect with your surroundings.',
    Icon: Hand,
    iconColor: '#9A8778',
    gradientColors: ['#FFFFFF', '#FAF8F5'] as [string, string],
    iconBgColors: ['rgba(190, 185, 180, 0.15)', 'rgba(190, 185, 180, 0.08)'] as [string, string],
    descColor: '#8A8680',
    customIcon: null,
  },
  {
    id: 'window',
    title: 'Window',
    description: 'Watch the rain. Drift away.',
    Icon: null,
    iconColor: '#6B6358',
    gradientColors: ['#C9C3BA', '#B8B2A8'] as [string, string],
    iconBgColors: ['rgba(120, 110, 100, 0.18)', 'rgba(120, 110, 100, 0.09)'] as [string, string],
    descColor: '#6B6761',
    customIcon: 'raindrop',
  },
  {
    id: 'echo',
    title: 'Echo',
    description: 'Gentle waves of calm.',
    Icon: Activity,
    iconColor: '#9A8778',
    gradientColors: ['#D8D4CD', '#D0CCC5'] as [string, string],
    iconBgColors: ['rgba(107, 124, 107, 0.18)', 'rgba(107, 124, 107, 0.08)'] as [string, string],
    descColor: '#6B6761',
    customIcon: null,
  },
  {
    id: 'rising',
    title: 'Rising',
    description: 'Gentle energy to start fresh.',
    Icon: Sunrise,
    iconColor: '#9A8778',
    gradientColors: ['#F3EFE7', '#E6E1D9'] as [string, string],
    iconBgColors: ['rgba(154, 135, 120, 0.18)', 'rgba(154, 135, 120, 0.09)'] as [string, string],
    descColor: '#8A8680',
    customIcon: null,
  },
  {
    id: 'bubble',
    title: 'Drift',
    description: 'Release pressure. Pop the tension.',
    Icon: Circle,
    iconColor: '#9A8778',
    gradientColors: ['#ECE9E4', '#E5E2DD'] as [string, string],
    iconBgColors: ['rgba(154, 135, 120, 0.15)', 'rgba(154, 135, 120, 0.08)'] as [string, string],
    descColor: '#8A8680',
    customIcon: null,
  },
];

type ActivityCardProps = {
  title: string;
  description: string;
  Icon: typeof Wind | null;
  iconColor: string;
  gradientColors: [string, string];
  iconBgColors: [string, string];
  descColor: string;
  customIcon?: string | null;
  onPress?: () => void;
  fontFamily: string;
};

function ActivityCard({ 
  title, 
  description, 
  Icon, 
  iconColor, 
  gradientColors, 
  iconBgColors,
  descColor,
  customIcon,
  onPress,
  fontFamily,
}: ActivityCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { 
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardContent}>
          <LinearGradient
            colors={iconBgColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            {customIcon === 'raindrop' ? (
              <RainDropIcon color={iconColor} />
            ) : Icon ? (
              <Icon size={20} color={iconColor} strokeWidth={1.5} />
            ) : null}
          </LinearGradient>
          
          <View style={styles.textContainer}>
            <Text style={[styles.cardTitle, { fontFamily }]}>{title}</Text>
            <Text style={[styles.cardDescription, { color: descColor, fontFamily }]}>{description}</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function ActivitiesScreen() {
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
  });

  const handleActivityPress = (activityId: string) => {
    console.log(`Opening activity: ${activityId}`);
  };

  const handlePatternsPress = () => {
    console.log('Opening Patterns');
  };

  const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const aloreFont = fontsLoaded ? 'Alore' : serifFont;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EDE5DA', '#D8CDBF', '#C9BBAA']}
        locations={[0, 0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={[styles.vignetteOverlay, StyleSheet.absoluteFill]} pointerEvents="none" />

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
        <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: serifFont }]}>Activities</Text>
          <Text style={[styles.subtitle, { fontFamily: serifFont }]}>Choose what feels right.</Text>
        </View>

        <View style={styles.grid}>
          {ACTIVITIES.map((activity) => (
            <ActivityCard
              key={activity.id}
              title={activity.title}
              description={activity.description}
              Icon={activity.Icon}
              iconColor={activity.iconColor}
              gradientColors={activity.gradientColors}
              iconBgColors={activity.iconBgColors}
              descColor={activity.descColor}
              customIcon={activity.customIcon}
              fontFamily={serifFont}
              onPress={() => handleActivityPress(activity.id)}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.patternsButton,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
          ]}
          onPress={handlePatternsPress}
        >
          <LinearGradient
            colors={['#CFCAC2', '#C3BDB4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.patternsGradient}
          >
            <Text style={[styles.patternsText, { fontFamily: serifFont }]}>View Patterns</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  vignetteOverlay: {
    backgroundColor: 'transparent',
    opacity: 0.05,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    alignItems: 'center',
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  traceLabel: {
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 11,
    paddingLeft: 11,
    color: dayColors.traceBrand,
    opacity: 0.88,
    textShadowColor: 'rgba(90, 74, 58, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
    marginTop: -6,
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    marginBottom: 2,
    color: dayColors.textPrimary,
    letterSpacing: -0.56,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '300',
    color: dayColors.textSecondary,
    letterSpacing: 0.15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: CARD_GAP,
    columnGap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(75, 75, 75, 1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardGradient: {
    padding: CARD_PADDING,
  },
  cardContent: {
    height: CARD_CONTENT_HEIGHT,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: dayColors.textPrimary,
    letterSpacing: 0.16,
  },
  cardDescription: {
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 0.06,
    lineHeight: 16.8,
  },
  patternsButton: {
    marginTop: 32,
    marginBottom: 24,
    borderRadius: 9999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(75, 75, 75, 1)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  patternsGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    width: '100%',
  },
  patternsText: {
    fontSize: 15,
    fontWeight: '500',
    color: dayColors.textPrimary,
    letterSpacing: 0.3,
  },
});
