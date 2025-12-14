import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Platform,
  Modal,
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

const privacyPolicyContent = `Privacy Policy
Last updated: January 2026

TRACE provides a wellness and emotional-support application designed to help users slow down, reflect, and improve their mental clarity. Your privacy matters deeply to us.

By using TRACE, you agree to the terms in this policy.

1. Information We Collect
We collect only the data necessary to operate the app and provide your wellness experience.

1.1 Account Information
• Name
• Email address
• Password (encrypted)
• Selected subscription plan

1.2 App Activity & Usage
To support your emotional wellness journey, TRACE stores:
• Chat messages with TRACE
• Check-ins, journal entries, and "Patterns" data
• Completed sessions (breathing, maze, grounding, etc.)
• App settings (tone, ambience, theme, preferences)

1.3 Device Information
We may collect minimal technical information:
• Device type and operating system
• Browser version
• IP address (for security only)

1.4 Payment Information
Payments are processed securely through our payment partners. TRACE never sees or stores your full card details.

2. How We Use Your Information
We use your data to:
• Provide personalized emotional support
• Display your Patterns, past entries, and activities
• Maintain your subscription and account
• Improve app features and experience
• Ensure security and prevent misuse

3. AI Usage
TRACE uses AI to generate emotional reflections and support messages.
• Your identifiable information is never intentionally provided to the AI model.
• AI responses are generated based on your input within TRACE, not shared as public content.
• Models used do not train on your personal data.

4. Retention Periods

4.1 Chats & Emotional Content
Retained for 7 days, then permanently deleted.

4.2 Journal Entries, Check-Ins, Patterns
Saved until you delete them.

4.3 Account Data
Retained until your account is deleted.

4.4 Logs & Analytics
Limited operational logs retained until user deletion.

5. What We Never Do
TRACE will never:
• Sell your data
• Share your personal information for advertising
• Use your feelings to target ads
• Allow third parties to access your emotional content
• Train AI models on your identifiable data

6. Sharing Your Information
We only share the minimum necessary information with trusted partners who help us operate TRACE:
• Payment processors (for subscription billing)
• Cloud hosting providers (to securely store your data)
• Analytics providers (anonymized usage data only)

These partners must comply with strict privacy and data-protection rules.

7. Your Rights & Controls
You may at any time:
• Access your stored data
• Edit or delete individual entries
• Export your data
• Delete your entire account
• Request correction of your information

When you delete your account, all personally identifiable data is permanently removed from our systems.

8. Data Security
We use industry-standard security measures, including:
• Encrypted data at rest
• Encrypted data in transit
• Secure password hashing
• Strict access controls
• Privacy-by-design architecture

No system is 100% secure, but we work continuously to protect your privacy.

9. Children's Privacy
TRACE is not intended for users under the age of 13 (or the minimum age required in your region).

10. Changes to This Policy
We may update this policy as we improve TRACE. If significant changes occur, we will notify you within the app.

11. Contact Us
If you have questions, privacy concerns, or data requests, email:
nina.mytraceapp@gmail.com`;

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  
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

      {!modalVisible && (
        <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={() => router.push('/(tabs)/chat')}>
            <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
          </Pressable>
        </View>
      )}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.traceToTitle, paddingBottom: insets.bottom + 120 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: canelaFont }]}>Privacy & Your Data</Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>
            Kept safe. Never sold.
          </Text>
        </View>

        <View style={styles.contentCard}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: canelaFont }]}>What we store</Text>
            <Text style={[styles.sectionBody, { fontFamily: canelaFont }]}>
              Your messages, entries, and patterns so you can revisit them.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontFamily: canelaFont }]}>What we don't do</Text>
            <Text style={[styles.sectionBody, { fontFamily: canelaFont }]}>
              No selling data. No ads based on your feelings.
            </Text>
          </View>

          <View style={[styles.section, { marginBottom: 0, paddingBottom: 0, borderBottomWidth: 0 }]}>
            <Text style={[styles.sectionTitle, { fontFamily: canelaFont }]}>Your control</Text>
            <Text style={[styles.sectionBody, { fontFamily: canelaFont }]}>
              Edit, export, or delete entries anytime.
            </Text>
          </View>

          <Pressable onPress={() => setModalVisible(true)} style={styles.linkContainer}>
            <Text style={[styles.linkText, { fontFamily: canelaFont }]}>Open Full Privacy Policy</Text>
          </Pressable>
        </View>

        <Pressable 
          style={styles.returnButton}
          onPress={() => router.push('/(tabs)/chat')}
        >
          <Text style={[styles.returnButtonText, { fontFamily: canelaFont }]}>Return to Chat</Text>
        </Pressable>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalCard}>
              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <Text style={[styles.modalTitle, { fontFamily: canelaFont }]}>Privacy Policy</Text>
                <Text style={[styles.modalDate, { fontFamily: canelaFont }]}>Last updated: January 2026</Text>
                
                <Text style={[styles.modalIntro, { fontFamily: canelaFont }]}>
                  TRACE provides a wellness and emotional-support application designed to help users slow down, reflect, and improve their mental clarity. Your privacy matters deeply to us.
                </Text>
                
                <Text style={[styles.modalAgreement, { fontFamily: canelaFont }]}>
                  By using TRACE, you agree to the terms in this policy.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>1. Information We Collect</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  We collect only the data necessary to operate the app and provide your wellness experience.
                </Text>

                <Text style={[styles.modalSubHeader, { fontFamily: canelaFont }]}>1.1 Account Information</Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Name</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Email address</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Password (encrypted)</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Selected subscription plan</Text>
                </View>

                <Text style={[styles.modalSubHeader, { fontFamily: canelaFont }]}>1.2 App Activity & Usage</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  To support your emotional wellness journey, TRACE stores:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Chat messages with TRACE</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Check-ins, journal entries, and "Patterns" data</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Completed sessions (breathing, maze, grounding, etc.)</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• App settings (tone, ambience, theme, preferences)</Text>
                </View>

                <Text style={[styles.modalSubHeader, { fontFamily: canelaFont }]}>1.3 Device Information</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  We may collect minimal technical information:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Device type and operating system</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Browser version</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• IP address (for security only)</Text>
                </View>

                <Text style={[styles.modalSubHeader, { fontFamily: canelaFont }]}>1.4 Payment Information</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  Payments are processed securely through our payment partners. TRACE never sees or stores your full card details.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>2. How We Use Your Information</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>We use your data to:</Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Provide personalized emotional support</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Display your Patterns, past entries, and activities</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Maintain your subscription and account</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Improve app features and experience</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Ensure security and prevent misuse</Text>
                </View>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>3. AI Usage</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  TRACE uses AI to generate emotional reflections and support messages.
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Your identifiable information is never intentionally provided to the AI model.</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• AI responses are generated based on your input within TRACE, not shared as public content.</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Models used do not train on your personal data.</Text>
                </View>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>4. Retention Periods</Text>
                
                <Text style={[styles.modalSubHeader, { fontFamily: canelaFont }]}>4.1 Chats & Emotional Content</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>Retained for 7 days, then permanently deleted.</Text>

                <Text style={[styles.modalSubHeader, { fontFamily: canelaFont }]}>4.2 Journal Entries, Check-Ins, Patterns</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>Saved until you delete them.</Text>

                <Text style={[styles.modalSubHeader, { fontFamily: canelaFont }]}>4.3 Account Data</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>Retained until your account is deleted.</Text>

                <Text style={[styles.modalSubHeader, { fontFamily: canelaFont }]}>4.4 Logs & Analytics</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>Limited operational logs retained until user deletion.</Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>5. What We Never Do</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>TRACE will never:</Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Sell your data</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Share your personal information for advertising</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Use your feelings to target ads</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Allow third parties to access your emotional content</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Train AI models on your identifiable data</Text>
                </View>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>6. Sharing Your Information</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  We only share the minimum necessary information with trusted partners who help us operate TRACE:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Payment processors (for subscription billing)</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Cloud hosting providers (to securely store your data)</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Analytics providers (anonymized usage data only)</Text>
                </View>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  These partners must comply with strict privacy and data-protection rules.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>7. Your Rights & Controls</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>You may at any time:</Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Access your stored data</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Edit or delete individual entries</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Export your data</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Delete your entire account</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Request correction of your information</Text>
                </View>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  When you delete your account, all personally identifiable data is permanently removed from our systems.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>8. Data Security</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  We use industry-standard security measures, including:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Encrypted data at rest</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Encrypted data in transit</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Secure password hashing</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Strict access controls</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Privacy-by-design architecture</Text>
                </View>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  No system is 100% secure, but we work continuously to protect your privacy.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>9. Children's Privacy</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  TRACE is not intended for users under the age of 13 (or the minimum age required in your region).
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>10. Changes to This Policy</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  We may update this policy as we improve TRACE. If significant changes occur, we will notify you within the app.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>11. Contact Us</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  If you have questions, privacy concerns, or data requests, email:
                </Text>
                <Text style={[styles.modalEmail, { fontFamily: canelaFont }]}>
                  nina.mytraceapp@gmail.com
                </Text>

                <Pressable 
                  style={styles.doneButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={[styles.doneButtonText, { fontFamily: canelaFont }]}>Done</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 21,
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginTop: -5.7,
  },
  title: {
    fontSize: 26,
    fontWeight: '400',
    marginBottom: 6,
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
    marginTop: 6.3,
  },
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 24,
    paddingVertical: 52,
    paddingHorizontal: 38,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Shadows.card,
  },
  section: {
    marginBottom: 48,
    paddingBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(180, 170, 155, 0.25)',
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
    letterSpacing: 0.15,
    lineHeight: 22,
  },
  linkContainer: {
    marginTop: 36,
    alignItems: 'flex-start',
  },
  linkText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#2B2825',
    letterSpacing: 0.2,
    textDecorationLine: 'underline',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalCard: {
    flex: 1,
    backgroundColor: 'rgba(240, 236, 228, 0.98)',
    borderRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E1D1B',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  modalDate: {
    fontSize: 13,
    fontWeight: '400',
    color: '#7A756D',
    fontStyle: 'italic',
    marginBottom: 18,
  },
  modalIntro: {
    fontSize: 14,
    fontWeight: '400',
    color: '#5A5650',
    lineHeight: 21,
    marginBottom: 10,
  },
  modalAgreement: {
    fontSize: 13,
    fontWeight: '400',
    color: '#7A756D',
    fontStyle: 'italic',
    marginBottom: 18,
  },
  modalSectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1D1B',
    letterSpacing: 0.2,
    marginTop: 18,
    marginBottom: 8,
  },
  modalSubHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2825',
    letterSpacing: 0.2,
    marginTop: 12,
    marginBottom: 6,
  },
  modalParagraph: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B665E',
    lineHeight: 20,
    marginBottom: 6,
  },
  bulletList: {
    marginLeft: 2,
    marginBottom: 6,
  },
  bulletItem: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B665E',
    lineHeight: 24,
  },
  modalEmail: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2B2825',
    marginTop: 4,
  },
  doneButton: {
    backgroundColor: 'rgba(120, 115, 105, 0.7)',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 24,
    alignSelf: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
