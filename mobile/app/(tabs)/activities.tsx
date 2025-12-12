import { View, Text, StyleSheet, ScrollView, useColorScheme, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, CardSpacing, ScreenPadding, BorderRadius, CardRadius, Shadows, Typography, LetterSpacing, FontFamily, FontSize, FontWeight } from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = CardSpacing.gridGap;
const CARD_WIDTH = (SCREEN_WIDTH - ScreenPadding.horizontal * 2 - CARD_GAP) / 2;

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
  colors: typeof Colors.day;
  onPress?: () => void;
};

function ActivityCard({ title, description, icon, variant, colors, onPress }: ActivityCardProps) {
  const cardBg = variant === 'light' ? colors.card : colors.cardAlt;
  const iconBg = variant === 'light' 
    ? colors.iconContainer 
    : 'rgba(255, 255, 255, 0.35)';
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { 
          backgroundColor: cardBg,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        Shadows.card,
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Text style={[styles.iconText, { color: colors.iconColor }]}>{icon}</Text>
      </View>
      
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>{description}</Text>
    </Pressable>
  );
}

export default function ActivitiesScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? 'night' : 'day';
  const colors = Colors[theme];

  const handleActivityPress = (activityId: string) => {
    console.log(`Opening activity: ${activityId}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.traceLabel, { color: colors.textMuted }]}>TRACE</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Activities</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose what feels right.
          </Text>
        </View>

        <View style={styles.grid}>
          {ACTIVITIES.map((activity) => (
            <ActivityCard
              key={activity.id}
              title={activity.title}
              description={activity.description}
              icon={activity.icon}
              variant={activity.variant}
              colors={colors}
              onPress={() => handleActivityPress(activity.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ScreenPadding.horizontal,
  },
  header: {
    marginBottom: Spacing['2xl'],
    alignItems: 'center',
  },
  traceLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    letterSpacing: LetterSpacing.trace,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.normal,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.base,
    fontWeight: FontWeight.normal,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    minHeight: CARD_WIDTH * 1.1,
    borderRadius: CardRadius.card,
    padding: CardSpacing.padding,
    justifyContent: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: CardRadius.iconContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: CardSpacing.iconMargin,
  },
  iconText: {
    fontSize: 20,
  },
  cardTitle: {
    fontFamily: FontFamily.serif,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
    lineHeight: FontSize.lg * 1.3,
  },
  cardDescription: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.normal,
    lineHeight: FontSize.sm * 1.5,
  },
});
