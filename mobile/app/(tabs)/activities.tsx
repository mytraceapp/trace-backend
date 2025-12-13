import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Wind, Compass, Footprints, Moon, Droplets, Hand, Activity, Sunrise, Circle } from 'lucide-react-native';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Colors } from '../../constants/colors';
import { TraceWordmark, CardTitle, MetaText, ScreenTitle, BodyText, FontFamily } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { BorderRadius } from '../../constants/radius';
import { Shadows } from '../../constants/shadows';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.screenPadding * 2 - Spacing.cardGap) / 2;
const CARD_CONTENT_HEIGHT = 175;

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
    iconColor: Colors.day.textPrimary,
    gradientColors: [Colors.day.cardWhite, Colors.day.cardCream] as [string, string],
    iconBgColors: ['rgba(138, 134, 128, 0.12)', 'rgba(138, 134, 128, 0.06)'] as [string, string],
    descColor: Colors.day.textSecondary,
    customIcon: null,
  },
  {
    id: 'maze',
    title: 'Trace the Maze',
    description: 'Slow your mind with gentle tracing.',
    Icon: Compass,
    iconColor: '#A29485',
    gradientColors: [Colors.day.cardMuted, '#CCC8C1'] as [string, string],
    iconBgColors: ['rgba(162, 148, 133, 0.2)', 'rgba(162, 148, 133, 0.1)'] as [string, string],
    descColor: '#6B6761',
    customIcon: null,
  },
  {
    id: 'walking',
    title: 'Walking Reset',
    description: 'Two minutes of slow-paced movement.',
    Icon: Footprints,
    iconColor: Colors.day.textPrimary,
    gradientColors: ['#DDD9D2', Colors.day.cardMuted] as [string, string],
    iconBgColors: ['rgba(138, 134, 128, 0.15)', 'rgba(138, 134, 128, 0.08)'] as [string, string],
    descColor: Colors.day.textSecondary,
    customIcon: null,
  },
  {
    id: 'rest',
    title: 'Rest',
    description: 'Five minutes of quiet stillness.',
    Icon: Moon,
    iconColor: Colors.day.textPrimary,
    gradientColors: ['#E8E4DD', '#DDD9D2'] as [string, string],
    iconBgColors: ['rgba(138, 134, 128, 0.18)', 'rgba(138, 134, 128, 0.09)'] as [string, string],
    descColor: Colors.day.textSecondary,
    customIcon: null,
  },
  {
    id: 'ripple',
    title: 'Ripple',
    description: 'Immersive flowing light.',
    Icon: Droplets,
    iconColor: '#9A8778',
    gradientColors: [Colors.day.cardWhite, '#FAF8F5'] as [string, string],
    iconBgColors: ['rgba(190, 185, 180, 0.15)', 'rgba(190, 185, 180, 0.08)'] as [string, string],
    descColor: Colors.day.textSecondary,
    customIcon: null,
  },
  {
    id: 'grounding',
    title: 'Grounding',
    description: 'Connect with your surroundings.',
    Icon: Hand,
    iconColor: '#9A8778',
    gradientColors: [Colors.day.cardWhite, '#FAF8F5'] as [string, string],
    iconBgColors: ['rgba(190, 185, 180, 0.15)', 'rgba(190, 185, 180, 0.08)'] as [string, string],
    descColor: Colors.day.textSecondary,
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
    descColor: Colors.day.textSecondary,
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
    descColor: Colors.day.textSecondary,
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
  const router = useRouter();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const handleActivityPress = (activityId: string) => {
    if (activityId === 'bubble') {
      router.push('/activities/drift');
    } else if (activityId === 'window') {
      router.push('/activities/window');
    } else if (activityId === 'echo') {
      router.push('/activities/echo');
    } else {
      router.push(`/activities/${activityId}`);
    }
  };

  const handlePatternsPress = () => {
    console.log('Opening Patterns');
  };

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...Colors.day.backgroundGradient]}
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
          { paddingTop: insets.top + Spacing.traceToTitle, paddingBottom: 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: canelaFont }]}>Activities</Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>Choose what feels right.</Text>
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
              fontFamily={canelaFont}
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
            <Text style={[styles.patternsText, { fontFamily: canelaFont }]}>View Patterns</Text>
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
    paddingBottom: Spacing.md,
    backgroundColor: 'transparent',
  },
  traceLabel: {
    fontSize: TraceWordmark.fontSize,
    fontWeight: TraceWordmark.fontWeight,
    letterSpacing: TraceWordmark.letterSpacing,
    marginLeft: TraceWordmark.marginLeft,
    color: TraceWordmark.color,
    opacity: TraceWordmark.opacity,
    ...Shadows.traceWordmark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
  },
  header: {
    marginBottom: Spacing.sectionGap,
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginTop: -6,
  },
  title: {
    fontSize: ScreenTitle.fontSize,
    fontWeight: ScreenTitle.fontWeight,
    marginBottom: 2,
    color: ScreenTitle.color,
    letterSpacing: ScreenTitle.letterSpacing,
  },
  subtitle: {
    fontSize: BodyText.fontSize,
    fontWeight: BodyText.fontWeight,
    color: Colors.day.textSecondary,
    letterSpacing: BodyText.letterSpacing,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.cardGap,
    columnGap: Spacing.cardGap,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Shadows.card,
  },
  cardGradient: {
    padding: Spacing.cardPadding,
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
    borderRadius: BorderRadius.iconContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: CardTitle.fontSize,
    fontWeight: CardTitle.fontWeight,
    marginBottom: 4,
    color: CardTitle.color,
    letterSpacing: CardTitle.letterSpacing,
  },
  cardDescription: {
    fontSize: MetaText.fontSize,
    fontWeight: MetaText.fontWeight,
    letterSpacing: MetaText.letterSpacing,
    lineHeight: MetaText.lineHeight,
    opacity: MetaText.opacity,
  },
  patternsButton: {
    marginTop: Spacing.sectionGap,
    marginBottom: Spacing['2xl'],
    borderRadius: BorderRadius.button,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    ...Shadows.button,
  },
  patternsGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    width: '100%',
  },
  patternsText: {
    fontSize: BodyText.fontSize,
    fontWeight: '500',
    color: Colors.day.textPrimary,
    letterSpacing: 0.3,
  },
});
