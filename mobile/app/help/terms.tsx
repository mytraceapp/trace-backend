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
import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [safetyModalVisible, setSafetyModalVisible] = useState(false);
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const anyModalVisible = termsModalVisible || safetyModalVisible;

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

      {!anyModalVisible && (
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
          <Text style={[styles.title, { fontFamily: canelaFont }]}>Terms & Safety{'\n'}Commitment</Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>
            The serious stuff, written softly.
          </Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={[styles.introText, { fontFamily: canelaFont }]}>
            TRACE supports calm and reflection, not diagnosis, treatment, or emergency care.
          </Text>

          <View style={styles.section}>
            <View style={styles.iconContainer}>
              <Ionicons name="time-outline" size={20} color="#8A857D" />
            </View>
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionTitle, { fontFamily: canelaFont }]}>Not medical advice</Text>
              <Text style={[styles.sectionBody, { fontFamily: canelaFont }]}>
                TRACE doesn't replace therapy or clinical care.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.iconContainer}>
              <Ionicons name="heart-outline" size={20} color="#8A857D" />
            </View>
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionTitle, { fontFamily: canelaFont }]}>Respectful space</Text>
              <Text style={[styles.sectionBody, { fontFamily: canelaFont }]}>
                Conversation stays kind and steady.
              </Text>
            </View>
          </View>

          <View style={[styles.section, { marginBottom: 0, paddingBottom: 0, borderBottomWidth: 0 }]}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-outline" size={20} color="#8A857D" />
            </View>
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionTitle, { fontFamily: canelaFont }]}>Safety first</Text>
              <Text style={[styles.sectionBody, { fontFamily: canelaFont }]}>
                We guide you toward real-world help when needed.
              </Text>
            </View>
          </View>

          <Pressable onPress={() => setTermsModalVisible(true)} style={styles.linkContainer}>
            <Text style={[styles.linkText, { fontFamily: canelaFont }]}>Open Terms of Use</Text>
          </Pressable>

          <Pressable onPress={() => setSafetyModalVisible(true)} style={[styles.linkContainer, { marginTop: 48 }]}>
            <Text style={[styles.linkText, { fontFamily: canelaFont }]}>Open Safety Commitment</Text>
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
        visible={termsModalVisible}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalCard}>
              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <Text style={[styles.modalTitle, { fontFamily: canelaFont }]}>Terms of Use</Text>
                <Text style={[styles.modalDate, { fontFamily: canelaFont }]}>Last updated: January 2026</Text>
                
                <Text style={[styles.modalIntro, { fontFamily: canelaFont }]}>
                  Welcome to TRACE. These Terms of Use govern your access to and use of the TRACE mobile application. Please read them carefully.
                </Text>
                
                <Text style={[styles.modalAgreement, { fontFamily: canelaFont }]}>
                  By using TRACE, you agree to these Terms.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>1. Purpose of TRACE</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  TRACE is a wellness and emotional-support tool designed to help you slow down, breathe, reflect, and better understand your emotional patterns.
                </Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  TRACE is not a medical, psychological, or crisis service.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>2. Not Medical Advice</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>TRACE does not provide:</Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Professional counseling or therapy</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Medical or psychiatric advice</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Diagnosis or treatment of any condition</Text>
                </View>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  If you are in crisis or need urgent help, contact local emergency services or a qualified professional.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>3. Eligibility</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>You may use TRACE only if:</Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• You are at least 13 years old (or the minimum age required in your region)</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• You can legally agree to these Terms</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• You use the app for personal, non-commercial purposes</Text>
                </View>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>4. Your TRACE Account</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>When you create an account, you agree to:</Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Provide accurate information</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Keep your login details secure</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Be responsible for all activity in your account</Text>
                </View>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  If you believe your account is compromised, notify us immediately.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>5. Subscriptions & Payments</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>TRACE offers:</Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Light (Free)</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Premium ($9.99/mo)</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Studio ($14.99/mo)</Text>
                </View>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  By subscribing, you authorize recurring payments until you cancel. You may cancel anytime in the app or through your platform account (Apple/Google).
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>6. Acceptable Use</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>You agree not to:</Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Use TRACE for harmful, abusive, or illegal activity</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Attempt to disrupt or reverse-engineer the app</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Upload content that is threatening, hateful, or unsafe</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Use TRACE if you are prohibited by law from doing so</Text>
                </View>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  We may suspend or terminate accounts that violate these rules.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>7. Your Content</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  You own your journal entries, messages, and activities. By using TRACE, you give us permission to:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Store your content securely</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Process it to provide AI-driven emotional support</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Display it back to you in the app</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Improve your experience and app functionality</Text>
                </View>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  We do not sell or share your emotional content.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>8. AI & Limitations</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  TRACE uses artificial intelligence for reflections and emotional guidance. While thoughtful and supportive, AI responses:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• May not always be accurate</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Should not replace human judgment</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Are for wellness support only</Text>
                </View>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  Use TRACE mindfully and at your own discretion.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>9. Termination</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  You may delete your account at any time. We may suspend or terminate access if you violate these Terms, misuse the app, or we need to protect the platform or community.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>10. Changes to TRACE</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  We may modify or update features, pricing, or these Terms. When changes are significant, we will notify you in the app. Continued use means you accept the updated Terms.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>11. Limitation of Liability</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  TRACE is provided "as-is." We do not guarantee uninterrupted access or perfect accuracy. To the fullest extent allowed by law, TRACE is not liable for emotional distress, decisions, or outcomes based on app content.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>12. Contact Us</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  If you have questions about these Terms:
                </Text>
                <Text style={[styles.modalEmail, { fontFamily: canelaFont }]}>
                  nina.mytraceapp@gmail.com
                </Text>

                <Pressable 
                  style={styles.doneButton}
                  onPress={() => setTermsModalVisible(false)}
                >
                  <Text style={[styles.doneButtonText, { fontFamily: canelaFont }]}>Done</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={safetyModalVisible}
        onRequestClose={() => setSafetyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalCard}>
              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <Text style={[styles.modalTitle, { fontFamily: canelaFont }]}>Safety Commitment</Text>
                <Text style={[styles.modalDate, { fontFamily: canelaFont }]}>Last updated: January 2026</Text>
                
                <Text style={[styles.modalIntro, { fontFamily: canelaFont }]}>
                  TRACE is designed to support emotional well-being, reflection, and personal clarity. We care deeply about your safety. This policy explains what TRACE can and cannot do, and the commitments we make to protect you.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>1. TRACE is a Wellness Companion — Not a Clinician</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  TRACE provides emotional support, grounding tools, journaling, and guided reflection. However:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• TRACE is not a substitute for therapy, counseling, or medical care.</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• TRACE cannot diagnose conditions or give medical, legal, or crisis advice.</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• TRACE should be used to support your wellness, not replace professional help.</Text>
                </View>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>2. Crisis Safety</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  If you ever feel unsafe, overwhelmed, or in danger, please contact:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• 988 (U.S.) – Suicide & Crisis Lifeline</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Your local emergency number</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• A trusted friend, family member, or mental health professional</Text>
                </View>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  TRACE does not monitor or intervene in real-time emergencies.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>3. Emotional Boundaries</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  TRACE is built with ethical guidelines to ensure safe, respectful responses:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• No judgment or shame</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• No manipulation or persuasion</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• No harmful or triggering content</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• No romantic or inappropriate behavior</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• No false promises or guarantees</Text>
                </View>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  Your emotional safety comes first.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>4. Data Safety</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  Your reflections and emotional content are private. We commit to:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Never selling your data</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Never using your feelings for ads</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Never training external AI models on your identifiable content</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Encrypting your information for safety</Text>
                </View>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>5. Age Requirement</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  TRACE is designed for individuals 13+. Users under the required age should not use the app.
                </Text>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>6. Respectful Use</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  To keep TRACE safe for everyone:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Use TRACE responsibly</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Do not attempt to misuse or exploit the app</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Do not input harmful content aimed at others</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Do not use TRACE for illegal or violent intent</Text>
                </View>

                <Text style={[styles.modalSectionHeader, { fontFamily: canelaFont }]}>7. Our Promise to You</Text>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  We commit to:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Designing TRACE with safety and ethics at its core</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Constantly improving emotional-support features</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Providing clarity, grounding, and peace—not confusion</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Being transparent about your data and rights</Text>
                  <Text style={[styles.bulletItem, { fontFamily: canelaFont }]}>• Never crossing emotional, ethical, or psychological boundaries</Text>
                </View>
                <Text style={[styles.modalParagraph, { fontFamily: canelaFont }]}>
                  TRACE exists to slow you down, not overwhelm you.
                </Text>

                <Pressable 
                  style={styles.doneButton}
                  onPress={() => setSafetyModalVisible(false)}
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
    marginBottom: 24,
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginTop: -6,
  },
  title: {
    fontSize: 26,
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
    marginTop: 8,
  },
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Shadows.card,
  },
  introText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#2B2825',
    letterSpacing: 0.2,
    lineHeight: 24,
    marginBottom: 28,
  },
  section: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(180, 170, 155, 0.25)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(220, 215, 205, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2B2825',
    letterSpacing: 0.2,
    marginBottom: 6,
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
    paddingTop: 32,
    paddingHorizontal: 28,
    paddingBottom: 24,
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
    paddingBottom: 32,
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
    marginTop: 36,
    marginBottom: 16,
  },
  modalParagraph: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B665E',
    lineHeight: 20,
    marginBottom: 18,
  },
  bulletList: {
    marginLeft: 2,
    marginBottom: 20,
  },
  bulletItem: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B665E',
    lineHeight: 24,
    marginBottom: 14,
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
    marginTop: 36,
    alignSelf: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
