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

import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';

export default function InThisSpaceScreen() {
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
          <Text style={[styles.title, { fontFamily: canelaFont }]}>In This Space</Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>
            What TRACE is here for.
          </Text>
        </View>

        <View style={styles.introSection}>
          <Text style={[styles.introParagraph, styles.introDark, { fontFamily: canelaFont }]}>
            TRACE offers emotional support, reflection, grounding, and gentle companionship.
          </Text>
          <Text style={[styles.introParagraph, styles.introLight, { fontFamily: canelaFont }]}>
            TRACE does not diagnose, prescribe, or replace therapy or emergency services.
          </Text>
        </View>

        <View style={styles.contentCard}>
          <View style={styles.cardSection}>
            <Text style={[styles.sectionTitle, { fontFamily: canelaFont }]}>TRACE can...</Text>
            <Text style={[styles.sectionBody, { fontFamily: canelaFont }]}>
              Listen, reflect, and offer gentle activities.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardSection}>
            <Text style={[styles.sectionTitle, { fontFamily: canelaFont }]}>TRACE can't...</Text>
            <Text style={[styles.sectionBody, { fontFamily: canelaFont }]}>
              Replace therapy, medical care, or crisis support.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardSection}>
            <Text style={[styles.sectionTitle, { fontFamily: canelaFont }]}>You're in control.</Text>
            <Text style={[styles.sectionBody, { fontFamily: canelaFont }]}>
              Share what you want, at your own pace.
            </Text>
          </View>
        </View>

        <Pressable 
          style={({ pressed }) => [
            styles.returnButton,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
          ]}
          onPress={() => router.push('/(tabs)/chat')}
        >
          <Text style={[styles.returnButtonText, { fontFamily: canelaFont }]}>Return to Chat</Text>
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
    marginBottom: 16,
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginTop: -6,
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
  introSection: {
    marginBottom: 12,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  introParagraph: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.2,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 8,
  },
  introDark: {
    color: '#2B2825',
  },
  introLight: {
    color: '#8A857D',
  },
  contentCard: {
    backgroundColor: 'rgba(244, 241, 236, 0.85)',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Shadows.card,
  },
  cardSection: {
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2B2825',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8A857D',
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(138, 134, 128, 0.15)',
  },
  returnButton: {
    marginTop: 28,
    backgroundColor: 'rgba(180, 170, 155, 0.5)',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(180, 170, 155, 0.3)',
  },
  returnButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3A3A3A',
    letterSpacing: 0.3,
  },
});
