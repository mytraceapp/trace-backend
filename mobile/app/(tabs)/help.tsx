import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { FontFamily, TraceWordmark, ScreenTitle, BodyText } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';

interface HelpCard {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const helpCards: HelpCard[] = [
  {
    id: 'in-this-space',
    title: 'In This Space',
    subtitle: 'What TRACE can and can\'t do.',
    icon: 'book-outline',
    route: '/help/in-this-space',
  },
  {
    id: 'crisis',
    title: "If You're in Crisis",
    subtitle: 'Immediate options when things feel unsafe.',
    icon: 'alert-circle-outline',
    route: '/help/crisis',
  },
  {
    id: 'privacy',
    title: 'Privacy & Your Data',
    subtitle: 'How your words are protected.',
    icon: 'shield-outline',
    route: '/help/privacy',
  },
  {
    id: 'terms',
    title: 'Terms & Safety Commitment',
    subtitle: 'The serious stuff, explained simply.',
    icon: 'document-text-outline',
    route: '/help/terms',
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const handleCardPress = (route: string) => {
    router.push(route as any);
  };

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
          { paddingTop: insets.top + Spacing.traceToTitle, paddingBottom: insets.bottom + 140 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: canelaFont }]}>Help</Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>
            Support, safety, and how TRACE works.
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {helpCards.map((card) => (
            <Pressable
              key={card.id}
              style={({ pressed }) => [
                styles.card,
                Shadows.card,
                { opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
              onPress={() => handleCardPress(card.route)}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons name={card.icon} size={22} color="#9A958E" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={[styles.cardTitle, { fontFamily: canelaFont }]}>
                  {card.title}
                </Text>
                <Text style={[styles.cardSubtitle, { fontFamily: canelaFont }]}>
                  {card.subtitle}
                </Text>
              </View>
            </Pressable>
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
  },
  cardsContainer: {
    gap: 0,
  },
  card: {
    backgroundColor: 'rgba(210, 195, 175, 0.55)',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 8,
  },
  cardIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(195, 180, 160, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
    borderWidth: 1,
    borderColor: 'rgba(180, 170, 155, 0.2)',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3A3A3A',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#7A7672',
    letterSpacing: 0.1,
  },
});
