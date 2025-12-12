import { View, Text, StyleSheet, ScrollView, useColorScheme, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

type ActivityCardProps = {
  title: string;
  subtitle: string;
  duration: string;
  colors: typeof Colors.night;
  onPress?: () => void;
};

function ActivityCard({ title, subtitle, duration, colors, onPress }: ActivityCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.activityCard,
        { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={styles.activityIconContainer}>
        <View style={[styles.activityIcon, { backgroundColor: Colors.shared.activityIcon }]} />
      </View>
      <View style={styles.activityContent}>
        <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.activitySubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <Text style={[styles.activityDuration, { color: colors.textTertiary }]}>{duration}</Text>
    </Pressable>
  );
}

export default function ActivitiesScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? 'night' : 'day';
  const colors = Colors[theme];

  const activities = [
    { title: 'Rising', subtitle: 'Watch gentle particles rise', duration: '2 min' },
    { title: 'Drift', subtitle: 'Pop calming bubbles', duration: '2 min' },
    { title: 'Breathing', subtitle: 'Guided breath work', duration: '3 min' },
    { title: 'Grounding', subtitle: '5-4-3-2-1 sensory exercise', duration: '5 min' },
    { title: 'Pearl Ripple', subtitle: 'Ocean wave immersion', duration: '1 min' },
    { title: 'Maze', subtitle: 'Trace a calming path', duration: '2 min' },
    { title: 'Echo', subtitle: 'Reflect and release', duration: '3 min' },
    { title: 'Power Nap', subtitle: 'Quick rest with gentle wake', duration: '5 min' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Activities</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Find a moment of calm
          </Text>
        </View>

        <View style={styles.activitiesGrid}>
          {activities.map((activity, index) => (
            <ActivityCard
              key={index}
              title={activity.title}
              subtitle={activity.subtitle}
              duration={activity.duration}
              colors={colors}
              onPress={() => console.log(`Opening ${activity.title}`)}
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
    paddingHorizontal: Spacing.base,
  },
  header: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal,
  },
  activitiesGrid: {
    gap: Spacing.md,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(154, 135, 120, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  activityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: Typography.fontSize.sm,
  },
  activityDuration: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});
