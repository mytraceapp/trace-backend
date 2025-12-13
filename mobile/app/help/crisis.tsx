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

import { FontFamily, TraceWordmark } from '../../constants/typography';
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

  const handleCall911 = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Linking.openURL('tel:911');
    } catch (error) {
      console.log('Unable to open phone');
    }
  };

  const handleCall988 = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Linking.openURL('tel:988');
    } catch (error) {
      console.log('Unable to open phone');
    }
  };

  const handleTextCrisisLine = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Linking.openURL('sms:741741&body=HOME');
    } catch (error) {
      console.log('Unable to open messaging');
    }
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
          <Text style={[styles.title, { fontFamily: canelaFont }]}>If You're in Crisis</Text>
          <Text style={[styles.subtitleDark, { fontFamily: canelaFont }]}>
            You're not alone.
          </Text>
          <Text style={[styles.subtitleLight, { fontFamily: canelaFont }]}>
            Real-world help comes first.
          </Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={[styles.cardHeader, { fontFamily: canelaFont }]}>
            TRACE can't respond to emergencies.
          </Text>

          <Pressable 
            style={({ pressed }) => [
              styles.actionCard,
              { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
            onPress={handleCall911}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="call" size={20} color="#6B6761" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { fontFamily: canelaFont }]}>Call 911</Text>
              <Text style={[styles.actionDescription, { fontFamily: canelaFont }]}>
                If you're in immediate danger.
              </Text>
            </View>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [
              styles.actionCard,
              { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
            onPress={handleCall988}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="chatbubble-outline" size={20} color="#6B6761" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { fontFamily: canelaFont }]}>Call or text 988</Text>
              <Text style={[styles.actionDescription, { fontFamily: canelaFont }]}>
                U.S. Suicide & Crisis Lifeline.
              </Text>
            </View>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [
              styles.actionCard,
              { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
            onPress={handleTextCrisisLine}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={20} color="#6B6761" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { fontFamily: canelaFont }]}>Text HOME to 741741</Text>
              <Text style={[styles.actionDescription, { fontFamily: canelaFont }]}>
                Crisis Text Line.
              </Text>
            </View>
          </Pressable>

          <Text style={[styles.footerText, { fontFamily: canelaFont }]}>
            Real people can help.
          </Text>
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
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    marginBottom: 4,
    color: '#3A3A3A',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitleDark: {
    fontSize: 15,
    fontWeight: '400',
    color: '#2B2825',
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 0,
  },
  subtitleLight: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8A857D',
    letterSpacing: 0.2,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 2,
  },
  contentCard: {
    backgroundColor: 'rgba(244, 241, 236, 0.85)',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Shadows.card,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2B2825',
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionCard: {
    backgroundColor: 'rgba(232, 226, 216, 0.7)',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(214, 207, 196, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionContent: {
    flex: 1,
    paddingTop: 2,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2B2825',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8A857D',
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#6B6761',
    letterSpacing: 0.2,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
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
