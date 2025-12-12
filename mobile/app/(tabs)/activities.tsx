import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Wind, Compass, Footprints, Moon, Droplets, Hand, TrendingUp, ChevronRight } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 16;
const SCREEN_PADDING = 24;
const CARD_WIDTH = (SCREEN_WIDTH - SCREEN_PADDING * 2 - CARD_GAP) / 2;

const dayColors = {
  bg: '#EBE7E1',
  textPrimary: '#3D3D3D',
  textSecondary: '#7A7570',
  traceBrand: '#5A4A3A',
};

const ACTIVITIES = [
  {
    id: 'breathing',
    title: 'Breathing',
    description: 'A calming 30-second reset.',
    Icon: Wind,
    iconColor: '#5A5550',
    gradientColors: ['#FAFAFA', '#F5F3F0'] as [string, string],
    iconBgColors: ['rgba(90, 85, 80, 0.08)', 'rgba(90, 85, 80, 0.04)'] as [string, string],
    descColor: '#8A8580',
  },
  {
    id: 'maze',
    title: 'Trace the Maze',
    description: 'Slow your mind with gentle tracing.',
    Icon: Compass,
    iconColor: '#7A7570',
    gradientColors: ['#C8C2BA', '#C0BAB2'] as [string, string],
    iconBgColors: ['rgba(255, 255, 255, 0.35)', 'rgba(255, 255, 255, 0.2)'] as [string, string],
    descColor: '#5A5550',
  },
  {
    id: 'walking',
    title: 'Walking Reset',
    description: 'Two minutes of slow-paced movement.',
    Icon: Footprints,
    iconColor: '#5A5550',
    gradientColors: ['#CCC6BE', '#C4BEB6'] as [string, string],
    iconBgColors: ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.18)'] as [string, string],
    descColor: '#5A5550',
  },
  {
    id: 'rest',
    title: 'Rest',
    description: 'Five minutes of quiet stillness.',
    Icon: Moon,
    iconColor: '#7A7570',
    gradientColors: ['#D8D4CE', '#D0CCC6'] as [string, string],
    iconBgColors: ['rgba(255, 255, 255, 0.35)', 'rgba(255, 255, 255, 0.2)'] as [string, string],
    descColor: '#6A6560',
  },
  {
    id: 'ripple',
    title: 'Ripple',
    description: 'Immersive flowing light.',
    Icon: Droplets,
    iconColor: '#8A7A6A',
    gradientColors: ['#FAFAFA', '#F5F3F0'] as [string, string],
    iconBgColors: ['rgba(138, 122, 106, 0.1)', 'rgba(138, 122, 106, 0.05)'] as [string, string],
    descColor: '#8A8580',
  },
  {
    id: 'grounding',
    title: 'Grounding',
    description: 'Connect with your surroundings.',
    Icon: Hand,
    iconColor: '#8A7A6A',
    gradientColors: ['#FAFAFA', '#F5F3F0'] as [string, string],
    iconBgColors: ['rgba(138, 122, 106, 0.1)', 'rgba(138, 122, 106, 0.05)'] as [string, string],
    descColor: '#8A8580',
  },
];

type ActivityCardProps = {
  title: string;
  description: string;
  Icon: typeof Wind;
  iconColor: string;
  gradientColors: [string, string];
  iconBgColors: [string, string];
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

  const handlePatternsPress = () => {
    console.log('Opening Patterns');
  };

  return (
    <View style={styles.container}>
      {/* Fixed TRACE Header */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.traceLabel}>T R A C E</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 50, paddingBottom: 140 },
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
              descColor={activity.descColor}
              onPress={() => handleActivityPress(activity.id)}
            />
          ))}
        </View>

        {/* Patterns Section */}
        <Pressable
          style={({ pressed }) => [
            styles.patternsCard,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
          ]}
          onPress={handlePatternsPress}
        >
          <LinearGradient
            colors={['#A8B5A0', '#9AAD92']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.patternsGradient}
          >
            <View style={styles.patternsContent}>
              <View style={styles.patternsIconContainer}>
                <TrendingUp size={24} color="#FFFFFF" strokeWidth={1.5} />
              </View>
              <View style={styles.patternsTextContainer}>
                <Text style={styles.patternsTitle}>Patterns</Text>
                <Text style={styles.patternsDescription}>Discover your emotional rhythms and insights.</Text>
              </View>
              <ChevronRight size={20} color="rgba(255,255,255,0.7)" strokeWidth={2} />
            </View>
          </LinearGradient>
        </Pressable>
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
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  traceLabel: {
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 8,
    color: dayColors.traceBrand,
    opacity: 0.7,
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
  },
  title: {
    fontFamily: serifFont,
    fontSize: 32,
    fontWeight: '400',
    marginBottom: 6,
    color: dayColors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: serifFont,
    fontSize: 17,
    fontWeight: '300',
    color: dayColors.textSecondary,
    letterSpacing: 0.2,
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
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(60, 60, 60, 1)',
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
    height: 160,
    flexDirection: 'column',
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: dayColors.textPrimary,
    letterSpacing: 0.1,
  },
  cardDescription: {
    fontFamily: serifFont,
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 0.05,
    lineHeight: 20,
  },
  patternsCard: {
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(60, 80, 60, 1)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  patternsGradient: {
    padding: 20,
  },
  patternsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patternsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  patternsTextContainer: {
    flex: 1,
  },
  patternsTitle: {
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  patternsDescription: {
    fontFamily: serifFont,
    fontSize: 13,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
});
