import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wind, Compass, Footprints, Moon, Droplets, Hand, Activity, Sunrise, Circle } from 'lucide-react-native';
import { useFonts } from 'expo-font';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

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
  A_cream: {
    bgColor: '#F5EDE4',
    borderColor: '#E5DBD0',
    iconBgColor: '#EBE2D8',
    titleColor: '#4A3A2A',
    descColor: '#7A6A58',
  },
  B_oat: {
    bgColor: '#E6DCD0',
    borderColor: '#D6CCC0',
    iconBgColor: '#DCD2C6',
    titleColor: '#4A3A2A',
    descColor: '#7A6A58',
  },
  C_latte: {
    bgColor: '#D4C8B8',
    borderColor: '#C4B8A8',
    iconBgColor: '#CABEB0',
    titleColor: '#4A3A2A',
    descColor: '#6A5A48',
  },
  D_mocha: {
    bgColor: '#C2B4A2',
    borderColor: '#B2A494',
    iconBgColor: '#B8AA9A',
    titleColor: '#5A4A3A',
    descColor: '#786858',
  },
};

const BACKGROUND_COLOR = '#A89888';

const VARIANT_KEYS = ['A_cream', 'B_oat', 'C_latte', 'D_mocha'] as const;
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
  return VARIANT_KEYS[index % 4];
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
  const iconColor = '#5A4A3A';
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { 
          backgroundColor: v.bgColor,
          borderColor: v.borderColor,
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.cardInner}>
        <View style={styles.cardContent}>
          <View style={styles.iconWrapper}>
            <View style={[styles.iconContainer, { backgroundColor: v.iconBgColor }]}>
              {customIcon === 'raindrop' ? (
                <RainDropIcon color={iconColor} />
              ) : Icon ? (
                <Icon size={20} color={iconColor} strokeWidth={1.5} />
              ) : null}
            </View>
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.cardTitle, { fontFamily, color: v.titleColor }]}>{title}</Text>
            <Text style={[styles.cardDescription, { color: v.descColor, fontFamily }]}>{description}</Text>
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
    <View style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
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
    marginBottom: Spacing.sectionGap,
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginTop: -6,
  },
  title: {
    fontSize: ScreenTitle.fontSize,
    fontWeight: ScreenTitle.fontWeight,
    marginBottom: 2,
    color: '#4A3A2A',
    letterSpacing: ScreenTitle.letterSpacing,
  },
  subtitle: {
    fontSize: BodyText.fontSize,
    fontWeight: BodyText.fontWeight,
    color: '#7A6A58',
    letterSpacing: BodyText.letterSpacing,
    fontStyle: 'italic',
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
    shadowColor: '#7A6A58',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
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
  },
  cardDescription: {
    fontSize: MetaText.fontSize,
    fontWeight: MetaText.fontWeight,
    letterSpacing: MetaText.letterSpacing,
    lineHeight: MetaText.lineHeight,
  },
  patternsButton: {
    marginTop: Spacing.sectionGap,
    marginBottom: Spacing['2xl'],
    borderRadius: BorderRadius.button,
    backgroundColor: '#D4C8B8',
    borderWidth: 1,
    borderColor: '#C4B8A8',
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#7A6A58',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  patternsText: {
    fontSize: BodyText.fontSize,
    fontWeight: '500',
    color: '#4A3A2A',
    letterSpacing: 0.3,
  },
});
