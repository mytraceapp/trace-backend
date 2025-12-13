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
  lightOat: {
    gradientColors: ['#F5EEE5', '#EDE5DA'] as [string, string],
    iconBgColors: ['#E8DFD2', '#DFD5C6'] as [string, string],
  },
  warmSand: {
    gradientColors: ['#EBE2D5', '#E3D9CA'] as [string, string],
    iconBgColors: ['#DDD3C4', '#D4C9B9'] as [string, string],
  },
  softMocha: {
    gradientColors: ['#E3D8C8', '#DBCFBE'] as [string, string],
    iconBgColors: ['#D4C8B6', '#CBBFAD'] as [string, string],
  },
  mutedLatte: {
    gradientColors: ['#DED4C5', '#D6CBBB'] as [string, string],
    iconBgColors: ['#CFC4B4', '#C6BAAA'] as [string, string],
  },
  featuredEspresso: {
    gradientColors: ['#C9BAA5', '#D4C7B4'] as [string, string],
    iconBgColors: ['#BFB099', '#B8A891'] as [string, string],
  },
};

const ACTIVITIES = [
  {
    id: 'breathing',
    title: 'Breathing',
    description: 'A calming 30-second reset.',
    Icon: Wind,
    iconColor: '#5A4A3A',
    gradientColors: CARD_VARIANTS.lightOat.gradientColors,
    iconBgColors: CARD_VARIANTS.lightOat.iconBgColors,
    descColor: '#8A7A68',
    customIcon: null,
    isFeatured: false,
  },
  {
    id: 'maze',
    title: 'Trace the Maze',
    description: 'Slow your mind with gentle tracing.',
    Icon: Compass,
    iconColor: '#4A3A2A',
    gradientColors: CARD_VARIANTS.featuredEspresso.gradientColors,
    iconBgColors: CARD_VARIANTS.featuredEspresso.iconBgColors,
    descColor: '#7A6A58',
    customIcon: null,
    isFeatured: true,
  },
  {
    id: 'walking',
    title: 'Walking Reset',
    description: 'Two minutes of slow-paced movement.',
    Icon: Footprints,
    iconColor: '#5A4A3A',
    gradientColors: CARD_VARIANTS.warmSand.gradientColors,
    iconBgColors: CARD_VARIANTS.warmSand.iconBgColors,
    descColor: '#8A7A68',
    customIcon: null,
    isFeatured: false,
  },
  {
    id: 'rest',
    title: 'Rest',
    description: 'Five minutes of quiet stillness.',
    Icon: Moon,
    iconColor: '#5A4A3A',
    gradientColors: CARD_VARIANTS.softMocha.gradientColors,
    iconBgColors: CARD_VARIANTS.softMocha.iconBgColors,
    descColor: '#8A7A68',
    customIcon: null,
    isFeatured: false,
  },
  {
    id: 'ripple',
    title: 'Ripple',
    description: 'Immersive flowing light.',
    Icon: Droplets,
    iconColor: '#5A4A3A',
    gradientColors: CARD_VARIANTS.mutedLatte.gradientColors,
    iconBgColors: CARD_VARIANTS.mutedLatte.iconBgColors,
    descColor: '#8A7A68',
    customIcon: null,
    isFeatured: false,
  },
  {
    id: 'grounding',
    title: 'Grounding',
    description: 'Connect with your surroundings.',
    Icon: Hand,
    iconColor: '#5A4A3A',
    gradientColors: CARD_VARIANTS.lightOat.gradientColors,
    iconBgColors: CARD_VARIANTS.lightOat.iconBgColors,
    descColor: '#8A7A68',
    customIcon: null,
    isFeatured: false,
  },
  {
    id: 'window',
    title: 'Window',
    description: 'Watch the rain. Drift away.',
    Icon: null,
    iconColor: '#5A4A3A',
    gradientColors: CARD_VARIANTS.warmSand.gradientColors,
    iconBgColors: CARD_VARIANTS.warmSand.iconBgColors,
    descColor: '#8A7A68',
    customIcon: 'raindrop',
    isFeatured: false,
  },
  {
    id: 'echo',
    title: 'Echo',
    description: 'Gentle waves of calm.',
    Icon: Activity,
    iconColor: '#5A4A3A',
    gradientColors: CARD_VARIANTS.softMocha.gradientColors,
    iconBgColors: CARD_VARIANTS.softMocha.iconBgColors,
    descColor: '#8A7A68',
    customIcon: null,
    isFeatured: false,
  },
  {
    id: 'rising',
    title: 'Rising',
    description: 'Gentle energy to start fresh.',
    Icon: Sunrise,
    iconColor: '#5A4A3A',
    gradientColors: CARD_VARIANTS.mutedLatte.gradientColors,
    iconBgColors: CARD_VARIANTS.mutedLatte.iconBgColors,
    descColor: '#8A7A68',
    customIcon: null,
    isFeatured: false,
  },
  {
    id: 'bubble',
    title: 'Drift',
    description: 'Release pressure. Pop the tension.',
    Icon: Circle,
    iconColor: '#5A4A3A',
    gradientColors: CARD_VARIANTS.lightOat.gradientColors,
    iconBgColors: CARD_VARIANTS.lightOat.iconBgColors,
    descColor: '#8A7A68',
    customIcon: null,
    isFeatured: false,
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
  isFeatured?: boolean;
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
  isFeatured = false,
}: ActivityCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isFeatured && styles.cardFeatured,
        { 
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardContent}>
          <View style={[styles.iconWrapper, { opacity: 0.85 }]}>
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
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[
              styles.cardTitle, 
              { fontFamily },
              isFeatured && styles.cardTitleFeatured,
            ]}>{title}</Text>
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
        colors={['#E8DFD2', '#DDD3C4', '#D4C9B8']}
        locations={[0, 0.5, 1]}
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
              isFeatured={activity.isFeatured}
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
    borderWidth: 0,
    shadowColor: '#8A7A68',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cardFeatured: {
    shadowColor: '#6A5A48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
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
    color: '#4A3A2A',
    letterSpacing: CardTitle.letterSpacing,
  },
  cardTitleFeatured: {
    color: '#3A2A1A',
  },
  cardDescription: {
    fontSize: MetaText.fontSize,
    fontWeight: MetaText.fontWeight,
    letterSpacing: MetaText.letterSpacing,
    lineHeight: MetaText.lineHeight,
    opacity: 0.85,
  },
  patternsButton: {
    marginTop: Spacing.sectionGap,
    marginBottom: Spacing['2xl'],
    borderRadius: BorderRadius.button,
    backgroundColor: '#C9BAA5',
    borderWidth: 0,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#8A7A68',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  patternsText: {
    fontSize: BodyText.fontSize,
    fontWeight: '500',
    color: '#4A3A2A',
    letterSpacing: 0.3,
  },
});
