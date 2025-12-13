import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../constants/colors';
import { FontFamily, TraceWordmark, ScreenTitle, BodyText } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';

export default function CrisisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const handleCall988 = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Linking.openURL('tel:988');
    } catch (error) {
      console.log('Unable to open phone');
    }
  };

  const handleText988 = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Linking.openURL('sms:988');
    } catch (error) {
      console.log('Unable to open messaging');
    }
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
          { paddingTop: insets.top + Spacing.traceToTitle, paddingBottom: insets.bottom + 60 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#5A4A3A" />
          <Text style={[styles.backText, { fontFamily: canelaFont }]}>Help</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: canelaFont }]}>If You're in Crisis</Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>
            Immediate options when things feel unsafe.
          </Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={[styles.sectionTitle, { fontFamily: canelaFont }]}>
            If you're feeling unsafe right now...
          </Text>

          <Text style={[styles.paragraph, { fontFamily: canelaFont }]}>
            TRACE is not built for crisis support. In moments of emergency, you deserve real-time human support from people trained to help.
          </Text>

          <Text style={[styles.paragraph, { fontFamily: canelaFont }]}>
            Please reach out to someone who can be there for you right now.
          </Text>
        </View>

        <View style={styles.resourcesCard}>
          <View style={styles.resourceHeader}>
            <Text style={styles.flag}>🇺🇸</Text>
            <Text style={[styles.resourceTitle, { fontFamily: canelaFont }]}>
              United States
            </Text>
          </View>
          
          <Text style={[styles.resourceName, { fontFamily: canelaFont }]}>
            Suicide & Crisis Lifeline
          </Text>

          <View style={styles.buttonRow}>
            <Pressable 
              style={({ pressed }) => [
                styles.actionButton,
                { opacity: pressed ? 0.9 : 1 }
              ]}
              onPress={handleCall988}
            >
              <Ionicons name="call-outline" size={18} color="#FDFCFA" />
              <Text style={[styles.actionButtonText, { fontFamily: canelaFont }]}>
                Call 988
              </Text>
            </Pressable>

            <Pressable 
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionButtonSecondary,
                { opacity: pressed ? 0.9 : 1 }
              ]}
              onPress={handleText988}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#5A4A3A" />
              <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary, { fontFamily: canelaFont }]}>
                Text 988
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.resourcesCard}>
          <View style={styles.resourceHeader}>
            <Text style={styles.flag}>🌍</Text>
            <Text style={[styles.resourceTitle, { fontFamily: canelaFont }]}>
              Outside the U.S.
            </Text>
          </View>
          
          <Text style={[styles.paragraph, { fontFamily: canelaFont }]}>
            Contact your local emergency services or reach out to a trusted person nearby. You don't have to go through this alone.
          </Text>
        </View>

        <View style={styles.reassuranceCard}>
          <Text style={[styles.reassuranceText, { fontFamily: canelaFont }]}>
            TRACE will still be here when you're safe.
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
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 16,
    ...Shadows.card,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#4B4B4B',
    letterSpacing: 0.2,
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 16,
    fontWeight: '300',
    color: '#4B4B4B',
    letterSpacing: 0.2,
    lineHeight: 26,
    marginBottom: 12,
  },
  resourcesCard: {
    backgroundColor: '#FDFCFA',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(138, 134, 128, 0.15)',
    marginBottom: 12,
    ...Shadows.cardSubtle,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  flag: {
    fontSize: 20,
    marginRight: 10,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B4B4B',
    letterSpacing: 0.2,
  },
  resourceName: {
    fontSize: 15,
    fontWeight: '300',
    color: '#6B6761',
    letterSpacing: 0.2,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#5A4A3A',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonSecondary: {
    backgroundColor: '#F4F1EC',
    borderWidth: 1,
    borderColor: 'rgba(90, 74, 58, 0.2)',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FDFCFA',
    letterSpacing: 0.3,
  },
  actionButtonTextSecondary: {
    color: '#5A4A3A',
  },
  reassuranceCard: {
    backgroundColor: '#F4F1EC',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
  },
  reassuranceText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#5A4A3A',
    letterSpacing: 0.2,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
