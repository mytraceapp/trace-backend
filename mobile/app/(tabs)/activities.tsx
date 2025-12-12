import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 14;
const SCREEN_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - SCREEN_PADDING * 2 - CARD_GAP) / 2;

const dayColors = {
  bg: '#F5F1EB',
  cardLight: 'rgba(255, 255, 255, 0.92)',
  cardMuted: '#C9BCB0',
  textPrimary: '#5A4A3A',
  textSecondary: '#8A7A6A',
  textMuted: '#A09080',
  iconBgLight: 'rgba(201, 188, 176, 0.4)',
  iconBgMuted: 'rgba(255, 255, 255, 0.45)',
  iconColor: '#8A7A6A',
};

const ACTIVITIES = [
  {
    id: 'breathing',
    title: 'Breathing',
    description: 'A calming 30-second reset.',
    icon: '≋',
    variant: 'light' as const,
  },
  {
    id: 'maze',
    title: 'Trace the Maze',
    description: 'Slow your mind with gentle tracing.',
    icon: '◎',
    variant: 'muted' as const,
  },
  {
    id: 'walking',
    title: 'Walking Reset',
    description: 'Two minutes of slow-paced movement.',
    icon: '❝❞',
    variant: 'muted' as const,
  },
  {
    id: 'rest',
    title: 'Rest',
    description: 'Five minutes of quiet stillness.',
    icon: '☽',
    variant: 'light' as const,
  },
  {
    id: 'ripple',
    title: 'Ripple',
    description: 'Watch gentle waves expand.',
    icon: '◠',
    variant: 'light' as const,
  },
  {
    id: 'grounding',
    title: 'Grounding',
    description: '5-4-3-2-1 sensory awareness.',
    icon: '✋',
    variant: 'muted' as const,
  },
  {
    id: 'rising',
    title: 'Rising',
    description: 'Gentle particles ascending.',
    icon: '✧',
    variant: 'muted' as const,
  },
  {
    id: 'drift',
    title: 'Drift',
    description: 'Pop calming bubbles.',
    icon: '○',
    variant: 'light' as const,
  },
];

type ActivityVariant = 'light' | 'muted';

type ActivityCardProps = {
  title: string;
  description: string;
  icon: string;
  variant: ActivityVariant;
  onPress?: () => void;
};

function ActivityCard({ title, description, icon, variant, onPress }: ActivityCardProps) {
  const cardBg = variant === 'light' ? dayColors.cardLight : dayColors.cardMuted;
  const iconBg = variant === 'light' ? dayColors.iconBgLight : dayColors.iconBgMuted;
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { 
          backgroundColor: cardBg,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.traceLabel}>TRACE</Text>
          <Text style={styles.title}>Activities</Text>
          <Text style={styles.subtitle}>Choose what feels right.</Text>
        </View>

        <View style={styles.grid}>
          {ACTIVITIES.map((activity) => (
            <ActivityCard
              key={activity.id}
              title={activity.title}
              description={activity.description}
              icon={activity.icon}
              variant={activity.variant}
              onPress={() => handleActivityPress(activity.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' });
const sansFont = Platform.select({ ios: 'System', android: 'Roboto' });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dayColors.bg,
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
  },
  traceLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 4,
    marginBottom: 8,
    color: dayColors.textMuted,
  },
  title: {
    fontFamily: serifFont,
    fontSize: 32,
    fontWeight: '400',
    marginBottom: 4,
    color: dayColors.textPrimary,
  },
  subtitle: {
    fontFamily: sansFont,
    fontSize: 16,
    fontWeight: '400',
    color: dayColors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    minHeight: CARD_WIDTH * 1.15,
    borderRadius: 24,
    padding: 20,
    justifyContent: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#5A4A3A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 20,
    color: dayColors.iconColor,
  },
  cardTitle: {
    fontFamily: serifFont,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: dayColors.textPrimary,
    lineHeight: 24,
  },
  cardDescription: {
    fontFamily: sansFont,
    fontSize: 14,
    fontWeight: '400',
    color: dayColors.textSecondary,
    lineHeight: 21,
  },
});
