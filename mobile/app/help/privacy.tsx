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

interface PrivacyPoint {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const privacyPoints: PrivacyPoint[] = [
  {
    icon: 'person-outline',
    title: 'Your entries belong to you',
    description: 'What you write stays yours. Your reflections are your own.',
  },
  {
    icon: 'shield-outline',
    title: 'No ads, no selling your data',
    description: 'We don\'t sell your information or use it for advertising. Ever.',
  },
  {
    icon: 'sparkles-outline',
    title: 'AI that supports, not profiles',
    description: 'AI responses are generated to help you reflect, not to build a profile of who you are.',
  },
  {
    icon: 'trash-outline',
    title: 'You can delete anytime',
    description: 'Your entries can be removed whenever you choose. It\'s your space.',
  },
  {
    icon: 'eye-off-outline',
    title: 'Minimal data collection',
    description: 'We only collect what\'s needed to make TRACE work for you.',
  },
];

export default function PrivacyScreen() {
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
          <Text style={[styles.title, { fontFamily: canelaFont }]}>Privacy & Your Data</Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>
            How your words are protected.
          </Text>
        </View>

        <View style={styles.introCard}>
          <Text style={[styles.introText, { fontFamily: canelaFont }]}>
            What you write stays yours.
          </Text>
          <Text style={[styles.introSubtext, { fontFamily: canelaFont }]}>
            This is a human explanation, not the full policy — because privacy shouldn't require a law degree.
          </Text>
        </View>

        <View style={styles.pointsContainer}>
          {privacyPoints.map((point, index) => (
            <View key={index} style={styles.pointCard}>
              <View style={styles.pointIconContainer}>
                <Ionicons name={point.icon} size={22} color="#5A4A3A" />
              </View>
              <View style={styles.pointContent}>
                <Text style={[styles.pointTitle, { fontFamily: canelaFont }]}>
                  {point.title}
                </Text>
                <Text style={[styles.pointDescription, { fontFamily: canelaFont }]}>
                  {point.description}
                </Text>
              </View>
            </View>
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
  introCard: {
    backgroundColor: '#F4F1EC',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 20,
    alignItems: 'center',
    ...Shadows.card,
  },
  introText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#5A4A3A',
    letterSpacing: 0.2,
    marginBottom: 8,
    textAlign: 'center',
  },
  introSubtext: {
    fontSize: 14,
    fontWeight: '300',
    color: '#8A8680',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 22,
  },
  pointsContainer: {
    gap: 12,
  },
  pointCard: {
    backgroundColor: '#FDFCFA',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(138, 134, 128, 0.12)',
    ...Shadows.cardSubtle,
  },
  pointIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F4F1EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  pointContent: {
    flex: 1,
    justifyContent: 'center',
  },
  pointTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B4B4B',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  pointDescription: {
    fontSize: 14,
    fontWeight: '300',
    color: '#6B6761',
    letterSpacing: 0.15,
    lineHeight: 20,
  },
});
