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
          <Text style={[styles.title, { fontFamily: canelaFont }]}>In This Space</Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>
            What TRACE can and can't do.
          </Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={[styles.paragraph, { fontFamily: canelaFont }]}>
            TRACE is a space for reflection, grounding, and emotional awareness. It's here to listen, respond gently, and help you slow down when life feels fast.
          </Text>

          <Text style={[styles.paragraph, { fontFamily: canelaFont }]}>
            TRACE does not diagnose, treat, or replace professional care. It's not a therapist, a doctor, or a crisis line. It's a companion — one that encourages noticing, not fixing.
          </Text>

          <Text style={[styles.paragraph, { fontFamily: canelaFont }]}>
            Think of TRACE as a place to pause. To breathe. To write things down. To sit with how you're feeling without needing to have all the answers.
          </Text>

          <Text style={[styles.paragraph, { fontFamily: canelaFont }]}>
            TRACE is designed for moments, not emergencies. It's best used when you want to check in with yourself, reflect on your day, or simply find a bit of calm.
          </Text>

          <View style={styles.reassuranceContainer}>
            <Text style={[styles.reassuranceText, { fontFamily: canelaFont }]}>
              You don't need to be "doing it right" here.
            </Text>
          </View>
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
    marginBottom: 24,
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
  },
  title: {
    fontSize: ScreenTitle.fontSize,
    fontWeight: ScreenTitle.fontWeight,
    marginBottom: 4,
    color: ScreenTitle.color,
    letterSpacing: ScreenTitle.letterSpacing,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: BodyText.fontSize,
    fontWeight: BodyText.fontWeight,
    color: Colors.day.textSecondary,
    letterSpacing: BodyText.letterSpacing,
    textAlign: 'center',
  },
  contentCard: {
    backgroundColor: '#F4F1EC',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Shadows.card,
  },
  paragraph: {
    fontSize: 16,
    fontWeight: '300',
    color: '#4B4B4B',
    letterSpacing: 0.2,
    lineHeight: 26,
    marginBottom: 20,
  },
  reassuranceContainer: {
    backgroundColor: '#FDFCFA',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(138, 134, 128, 0.1)',
    alignItems: 'center',
  },
  reassuranceText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#5A4A3A',
    letterSpacing: 0.2,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
