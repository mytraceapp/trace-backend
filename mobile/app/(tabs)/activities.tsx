import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Wind, Compass, Footprints, Moon, Droplets, Hand, Activity, Sunrise, Circle } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 16;
const SCREEN_PADDING = 24;
const CARD_WIDTH = (SCREEN_WIDTH - SCREEN_PADDING * 2 - CARD_GAP) / 2;
const CARD_CONTENT_HEIGHT = 160;

const dayColors = {
  bg: '#F5F1EB',
  textPrimary: '#4B4B4B',
  textSecondary: '#8A8680',
  textMuted: '#6B6761',
  traceBrand: '#5A4A3A',
};

const ACTIVITIES = [
  {
    id: 'breathing',
    title: 'Breathing',
    description: 'A calming 30-second reset.',
    Icon: Wind,
    iconColor: '#4B4B4B',
    gradientColors: ['#F4F1EC', '#EEEBE6'] as [string, string],
    iconBgColors: ['rgba(138, 134, 128, 0.12)', 'rgba(138, 134, 128, 0.06)'] as [string, string],
    borderColor: 'rgba(255, 255, 255, 0.4)',
    descColor: '#8A8680',
  },
  {
    id: 'maze',
    title: 'Trace the Maze',
    description: 'Slow your mind with gentle tracing.',
    Icon: Compass,
    iconColor: '#A29485',
    gradientColors: ['#D3CFC8', '#CCC8C1'] as [string, string],
    iconBgColors: ['rgba(162, 148, 133, 0.2)', 'rgba(162, 148, 133, 0.1)'] as [string, string],
    borderColor: 'rgba(255, 255, 255, 0.3)',
    descColor: '#6B6761',
  },
  {
    id: 'walking',
    title: 'Walking Reset',
    description: 'Two minutes of slow-paced movement.',
    Icon: Footprints,
    iconColor: '#4B4B4B',
    gradientColors: ['#DDD9D2', '#D3CFC8'] as [string, string],
    iconBgColors: ['rgba(138, 134, 128, 0.15)', 'rgba(138, 134, 128, 0.08)'] as [string, string],
    borderColor: 'rgba(255, 255, 255, 0.35)',
    descColor: '#8A8680',
  },
  {
    id: 'rest',
    title: 'Rest',
    description: 'Five minutes of quiet stillness.',
    Icon: Moon,
    iconColor: '#4B4B4B',
    gradientColors: ['#E8E4DD', '#DDD9D2'] as [string, string],
    iconBgColors: ['rgba(138, 134, 128, 0.18)', 'rgba(138, 134, 128, 0.09)'] as [string, string],
    borderColor: 'rgba(255, 255, 255, 0.4)',
    descColor: '#8A8680',
  },
  {
    id: 'ripple',
    title: 'Ripple',
    description: 'Immersive flowing light.',
    Icon: Droplets,
    iconColor: '#9A8778',
    gradientColors: ['#FDFCFB', '#F5F3F0'] as [string, string],
    iconBgColors: ['rgba(190, 185, 180, 0.15)', 'rgba(190, 185, 180, 0.08)'] as [string, string],
    borderColor: 'rgba(255, 255, 255, 0.5)',
    descColor: '#8A8680',
  },
  {
    id: 'grounding',
    title: 'Grounding',
    description: 'Connect with your surroundings.',
    Icon: Hand,
    iconColor: '#9A8778',
    gradientColors: ['#FDFCFB', '#F5F3F0'] as [string, string],
    iconBgColors: ['rgba(190, 185, 180, 0.15)', 'rgba(190, 185, 180, 0.08)'] as [string, string],
    borderColor: 'rgba(255, 255, 255, 0.5)',
    descColor: '#8A8680',
  },
  {
    id: 'rising',
    title: 'Rising',
    description: 'Gentle particles ascending.',
    Icon: Sunrise,
    iconColor: '#9A8778',
    gradientColors: ['#D8D4CD', '#D0CCC5'] as [string, string],
    iconBgColors: ['rgba(107, 124, 107, 0.18)', 'rgba(107, 124, 107, 0.08)'] as [string, string],
    borderColor: 'rgba(255, 255, 255, 0.3)',
    descColor: '#6B6761',
  },
  {
    id: 'drift',
    title: 'Drift',
    description: 'Pop calming bubbles.',
    Icon: Circle,
    iconColor: '#4B4B4B',
    gradientColors: ['#F4F1EC', '#EEEBE6'] as [string, string],
    iconBgColors: ['rgba(138, 134, 128, 0.12)', 'rgba(138, 134, 128, 0.06)'] as [string, string],
    borderColor: 'rgba(255, 255, 255, 0.4)',
    descColor: '#8A8680',
  },
];

type ActivityCardProps = {
  title: string;
  description: string;
  Icon: typeof Wind;
  iconColor: string;
  gradientColors: [string, string];
  iconBgColors: [string, string];
  borderColor: string;
  descColor: string;
  onPress?: () => void;
};

function ActivityCard({ 
  title, 
  description, 
  Icon, 
  iconColor, 
  gradientColors, 
  iconBgColors,
  borderColor,
  descColor,
  onPress 
}: ActivityCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { 
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          borderColor: borderColor,
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
            <Icon size={20} color={iconColor} strokeWidth={1.5} />
          </LinearGradient>
          
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={[styles.cardDescription, { color: descColor }]}>{description}</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function ActivitiesScreen() {
  const insets = useSafeAreaInsets();

  const handleActivityPress = (activityId: string) => {
    console.log(`Opening activity: ${activityId}`);
  };

  return (
    <View style={styles.container}>
      {/* Fixed TRACE Header */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.traceLabel}>TRACE</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 55, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Activities</Text>
          <Text style={styles.subtitle}>Choose what feels right.</Text>
        </View>

        {/* Activities Grid */}
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
              borderColor={activity.borderColor}
              descColor={activity.descColor}
              onPress={() => handleActivityPress(activity.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dayColors.bg,
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
    fontFamily: serifFont,
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
    marginBottom: 24,
    alignItems: 'center',
    marginTop: -6,
  },
  title: {
    fontFamily: serifFont,
    fontSize: 28,
    fontWeight: '400',
    marginBottom: 2,
    color: dayColors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: serifFont,
    fontSize: 15,
    fontWeight: '300',
    color: dayColors.textSecondary,
    letterSpacing: 0.15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
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
    padding: 20,
  },
  cardContent: {
    height: CARD_CONTENT_HEIGHT,
    justifyContent: 'space-between',
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
    fontFamily: serifFont,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: dayColors.textPrimary,
    letterSpacing: 0.16,
  },
  cardDescription: {
    fontFamily: serifFont,
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 0.06,
    lineHeight: 16.8,
  },
});
