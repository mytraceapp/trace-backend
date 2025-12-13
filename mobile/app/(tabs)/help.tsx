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
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const helpCards: HelpCard[] = [
  {
    id: 'in-this-space',
    title: 'In This Space',
    icon: 'leaf-outline',
    route: '/help/in-this-space',
  },
  {
    id: 'crisis',
    title: "If You're in Crisis",
    icon: 'heart-outline',
    route: '/help/crisis',
  },
  {
    id: 'privacy',
    title: 'Privacy & Your Data',
    icon: 'shield-checkmark-outline',
    route: '/help/privacy',
  },
  {
    id: 'terms',
    title: 'Terms & Safety Commitment',
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
        colors={[...Colors.day.backgroundGradient]}
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
                <Ionicons name={card.icon} size={24} color="#5A4A3A" />
              </View>
              <Text style={[styles.cardTitle, { fontFamily: canelaFont }]}>
                {card.title}
              </Text>
              <View style={styles.cardArrow}>
                <Ionicons name="chevron-forward" size={18} color="#8A8680" />
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
  cardsContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: '#F4F1EC',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FDFCFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 134, 128, 0.1)',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#4B4B4B',
    letterSpacing: 0.2,
  },
  cardArrow: {
    opacity: 0.6,
  },
});
