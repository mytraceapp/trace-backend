import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Wind, Compass, Footprints, Moon, Droplets, Hand, Activity, Sunrise, Circle } from 'lucide-react-native';
import { useFonts } from 'expo-font';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Colors } from '../../constants/colors';
import { TraceWordmark, CardTitle, MetaText, ScreenTitle, BodyText, FontFamily } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { BorderRadius } from '../../constants/radius';
import { Shadows } from '../../constants/shadows';
import { useGlobalAudio } from '../../contexts/AudioContext';

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

const CARD_VARIANTS = {
  A: { bgColor: '#F7F0E8', titleColor: '#3E2E22', descColor: 'rgba(107, 90, 74, 0.85)', iconBg: 'rgba(255, 253, 250, 0.7)', iconColor: '#5A4538' },
  B: { bgColor: '#EADFCC', titleColor: '#3E2E22', descColor: 'rgba(107, 90, 74, 0.85)', iconBg: 'rgba(250, 246, 240, 0.75)', iconColor: '#5A4538' },
  C: { bgColor: '#DCC9AE', titleColor: '#3E2E22', descColor: 'rgba(94, 78, 62, 0.85)', iconBg: 'rgba(245, 238, 228, 0.7)', iconColor: '#5A4538' },
  D: { bgColor: '#CDB59A', titleColor: '#3E2E22', descColor: 'rgba(94, 78, 62, 0.85)', iconBg: 'rgba(235, 225, 210, 0.75)', iconColor: '#5A4538' },
  E: { bgColor: '#BFA88E', titleColor: '#4A3A2A', descColor: 'rgba(107, 90, 74, 0.85)', iconBg: 'rgba(220, 208, 192, 0.7)', iconColor: '#5A4538' },
  F: { bgColor: '#AD947B', titleColor: '#3E2E22', descColor: 'rgba(94, 78, 62, 0.85)', iconBg: 'rgba(200, 185, 165, 0.7)', iconColor: '#5A4538' },
};


const VARIANT_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
type VariantKey = typeof VARIANT_KEYS[number];

const ACTIVITIES = [
  { id: 'breathing', title: 'Breathing', description: 'A calming 30-second reset.', Icon: Wind, customIcon: null },
  { id: 'maze', title: 'Trace the Maze', description: 'Slow your mind with gentle tracing.', Icon: Compass, customIcon: null },
  { id: 'walking', title: 'Walking Reset', description: 'Two minutes of slow-paced movement.', Icon: Footprints, customIcon: null },
  { id: 'rest', title: 'Rest', description: 'Five minutes of quiet stillness.', Icon: Moon, customIcon: null },
  { id: 'ripple', title: 'Ripple', description: 'Immersive flowing light.', Icon: Droplets, customIcon: null },
  { id: 'grounding', title: 'Grounding', description: 'Connect with your surroundings.', Icon: Hand, customIcon: null },
  { id: 'window', title: 'Window', description: 'Watch the rain. Drift away.', Icon: null, customIcon: 'raindrop' },
  { id: 'echo', title: 'Echo', description: 'Gentle waves of calm.', Icon: Activity, customIcon: null },
  { id: 'rising', title: 'Rising', description: 'Gentle energy to start fresh.', Icon: Sunrise, customIcon: null },
  { id: 'bubble', title: 'Drift', description: 'Release pressure. Pop the tension.', Icon: Circle, customIcon: null },
];

function getVariantForIndex(index: number): VariantKey {
  return VARIANT_KEYS[index % 6];
}

type ActivityCardProps = {
  title: string;
  description: string;
  Icon: typeof Wind | null;
  customIcon?: string | null;
  variant: VariantKey;
  onPress?: () => void;
  fontFamily: string;
};

function ActivityCard({ 
  title, 
  description, 
  Icon, 
  customIcon,
  variant,
  onPress,
  fontFamily,
}: ActivityCardProps) {
  const v = CARD_VARIANTS[variant];
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { 
          backgroundColor: v.bgColor,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          shadowOpacity: pressed ? 0.04 : 0.06,
          shadowRadius: pressed ? 10 : 12,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.cardInner}>
        <View style={styles.cardContent}>
          <View style={styles.iconWrapper}>
            <View style={[styles.iconContainer, { backgroundColor: v.iconBg }]}>
              {customIcon === 'raindrop' ? (
                <RainDropIcon color={v.iconColor} />
              ) : Icon ? (
                <Icon size={20} color={v.iconColor} strokeWidth={1.5} />
              ) : null}
            </View>
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.cardTitle, { fontFamily, color: v.titleColor }]}>{title}</Text>
            <Text style={[styles.cardDescription, { fontFamily, color: v.descColor }]}>{description}</Text>
          </View>
        </View>
      </View>
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

  const { play, isLoaded } = useGlobalAudio();

  useFocusEffect(
    useCallback(() => {
      if (isLoaded) {
        play();
      }
    }, [isLoaded, play])
  );

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
        colors={['#E8E2D8', '#D9D0C3', '#C8BBAA']}
        locations={[0, 0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={[styles.vignetteOverlay, StyleSheet.absoluteFill]} pointerEvents="none" />

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.push('/(tabs)/chat')}>
          <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
        </Pressable>
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
          {ACTIVITIES.map((activity, index) => (
            <ActivityCard
              key={activity.id}
              title={activity.title}
              description={activity.description}
              Icon={activity.Icon}
              customIcon={activity.customIcon}
              variant={getVariantForIndex(index)}
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
          <Text style={[styles.patternsText, { fontFamily: canelaFont }]}>View Patterns</Text>
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
    paddingLeft: TraceWordmark.paddingLeft,
    textAlign: 'center',
    ...Shadows.traceWordmark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
  },
  header: {
    marginBottom: 12,
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginTop: -4,
  },
  title: {
    fontSize: ScreenTitle.fontSize,
    fontWeight: ScreenTitle.fontWeight,
    marginBottom: 6,
    color: ScreenTitle.color,
    letterSpacing: ScreenTitle.letterSpacing,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: BodyText.fontWeight,
    color: Colors.day.textSecondary,
    letterSpacing: BodyText.letterSpacing,
    textAlign: 'center',
    marginTop: 4.3,
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
    borderWidth: 0,
    shadowColor: '#9A8A78',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardInner: {
    padding: Spacing.cardPadding,
  },
  cardContent: {
    height: CARD_CONTENT_HEIGHT,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconWrapper: {
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
    letterSpacing: CardTitle.letterSpacing,
    color: '#3E342C',
  },
  cardDescription: {
    fontSize: MetaText.fontSize,
    fontWeight: MetaText.fontWeight,
    letterSpacing: MetaText.letterSpacing,
    lineHeight: MetaText.lineHeight ? MetaText.lineHeight * 1.08 : 18,
  },
  patternsButton: {
    marginTop: Spacing.sectionGap,
    marginBottom: Spacing['2xl'],
    borderRadius: BorderRadius.button,
    backgroundColor: '#D8CBB8',
    borderWidth: 0,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#A89888',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  patternsText: {
    fontSize: BodyText.fontSize,
    fontWeight: '500',
    color: '#3E342C',
    letterSpacing: 0.3,
  },
});
