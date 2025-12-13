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

interface TermsPoint {
  title: string;
  description: string;
}

const termsPoints: TermsPoint[] = [
  {
    title: 'For personal reflection and wellness',
    description: 'TRACE is designed to support your personal journey of self-awareness and emotional grounding.',
  },
  {
    title: 'Not medical or mental health treatment',
    description: 'TRACE is not a substitute for professional therapy, counseling, or medical care. It\'s a companion, not a clinician.',
  },
  {
    title: 'Use at your own discretion',
    description: 'You choose when and how to engage with TRACE. There are no right or wrong ways to use this space.',
  },
  {
    title: 'Our commitment to you',
    description: 'We\'re committed to your safety, privacy, and transparency. We build with care, and we listen to feedback.',
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

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
          { paddingTop: insets.top + Spacing.traceToTitle, paddingBottom: insets.bottom + 60 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#5A4A3A" />
          <Text style={[styles.backText, { fontFamily: canelaFont }]}>Help</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: canelaFont }]}>Terms & Safety Commitment</Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>
            The serious stuff, explained simply.
          </Text>
        </View>

        <View style={styles.contentCard}>
          {termsPoints.map((point, index) => (
            <View 
              key={index} 
              style={[
                styles.termItem,
                index < termsPoints.length - 1 && styles.termItemBorder
              ]}
            >
              <View style={styles.termNumberContainer}>
                <Text style={[styles.termNumber, { fontFamily: canelaFont }]}>
                  {index + 1}
                </Text>
              </View>
              <View style={styles.termContent}>
                <Text style={[styles.termTitle, { fontFamily: canelaFont }]}>
                  {point.title}
                </Text>
                <Text style={[styles.termDescription, { fontFamily: canelaFont }]}>
                  {point.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.valuesCard}>
          <Ionicons name="heart" size={24} color="#5A4A3A" style={styles.valuesIcon} />
          <Text style={[styles.valuesText, { fontFamily: canelaFont }]}>
            We built TRACE to support care, not replace it.
          </Text>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#5A4A3A',
    letterSpacing: 0.2,
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    marginBottom: 4,
    color: '#3A3A3A',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#6E6861',
    letterSpacing: 0.2,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 0,
  },
  contentCard: {
    backgroundColor: '#F4F1EC',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 20,
    ...Shadows.card,
  },
  termItem: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  termItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 134, 128, 0.12)',
  },
  termNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDFCFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(138, 134, 128, 0.1)',
  },
  termNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5A4A3A',
  },
  termContent: {
    flex: 1,
  },
  termTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B4B4B',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  termDescription: {
    fontSize: 14,
    fontWeight: '300',
    color: '#6B6761',
    letterSpacing: 0.15,
    lineHeight: 22,
  },
  valuesCard: {
    backgroundColor: '#FDFCFA',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(138, 134, 128, 0.12)',
    alignItems: 'center',
    ...Shadows.cardSubtle,
  },
  valuesIcon: {
    marginBottom: 12,
    opacity: 0.9,
  },
  valuesText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#5A4A3A',
    letterSpacing: 0.2,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 26,
  },
});
