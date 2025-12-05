import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../state/ThemeContext';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'night';
  
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed z-50 flex items-center justify-center px-5"
          style={{ 
            top: '100px',
            left: 0,
            right: 0,
            bottom: '90px',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="fixed inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-[340px] flex flex-col"
            style={{
              borderRadius: isDark ? '26px' : '24px',
              backgroundColor: isDark ? 'rgba(38, 42, 38, 0.98)' : '#E9E2D8',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(43, 30, 21, 0.12)',
              boxShadow: isDark 
                ? '0 20px 60px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)'
                : '0 20px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1)',
              maxHeight: '100%',
              overflow: 'hidden',
            }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <style>
              {`
                .privacy-modal-content::-webkit-scrollbar {
                  display: none;
                }
              `}
            </style>

            <div className="p-5 pb-0 flex-shrink-0">
              <div>
                <h2
                  style={{
                    fontFamily: 'Playfair Display, Georgia, serif',
                    fontSize: '20px',
                    fontWeight: 500,
                    color: isDark ? 'rgba(255, 255, 255, 0.95)' : '#4A3526',
                    marginBottom: '4px',
                    letterSpacing: '0.02em',
                  }}
                >
                  Privacy Policy
                </h2>
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '11px',
                    color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#7D6D5D',
                    marginBottom: '12px',
                    fontStyle: 'italic',
                  }}
                >
                  Last updated: January 2026
                </p>
              </div>
            </div>

            <div 
              className="flex-1 overflow-y-auto px-5 privacy-modal-content"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '12px',
                  color: isDark ? 'rgba(255, 255, 255, 0.88)' : '#5A4A3A',
                  lineHeight: '1.6',
                  marginBottom: '12px',
                }}
              >
                TRACE provides a wellness and emotional-support application designed to help users slow down, reflect, and improve their mental clarity. Your privacy matters deeply to us.
              </p>

              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '11px',
                  color: isDark ? 'rgba(255, 255, 255, 0.55)' : '#7D6D5D',
                  lineHeight: '1.55',
                  marginBottom: '14px',
                  fontStyle: 'italic',
                }}
              >
                By using TRACE, you agree to the terms in this policy.
              </p>

              <Section title="1. Information We Collect" isDark={isDark}>
                <Paragraph isDark={isDark}>
                  We collect only the data necessary to operate the app and provide your wellness experience.
                </Paragraph>
                
                <SubSection title="1.1 Account Information" isDark={isDark}>
                  <BulletList isDark={isDark} items={[
                    'Name',
                    'Email address',
                    'Password (encrypted)',
                    'Selected subscription plan',
                  ]} />
                </SubSection>

                <SubSection title="1.2 App Activity & Usage" isDark={isDark}>
                  <Paragraph isDark={isDark}>To support your emotional wellness journey, TRACE stores:</Paragraph>
                  <BulletList isDark={isDark} items={[
                    'Chat messages with TRACE',
                    'Check-ins, journal entries, and "Patterns" data',
                    'Completed sessions (breathing, maze, grounding, etc.)',
                    'App settings (tone, ambience, theme, preferences)',
                  ]} />
                </SubSection>

                <SubSection title="1.3 Device Information" isDark={isDark}>
                  <Paragraph isDark={isDark}>We may collect minimal technical information:</Paragraph>
                  <BulletList isDark={isDark} items={[
                    'Device type and operating system',
                    'Browser version',
                    'IP address (for security only)',
                  ]} />
                </SubSection>

                <SubSection title="1.4 Payment Information" isDark={isDark}>
                  <Paragraph isDark={isDark}>
                    Payments are processed securely through our payment partners. TRACE never sees or stores your full card details.
                  </Paragraph>
                </SubSection>
              </Section>

              <Section title="2. How We Use Your Information" isDark={isDark}>
                <Paragraph isDark={isDark}>We use your data to:</Paragraph>
                <BulletList isDark={isDark} items={[
                  'Provide personalized emotional support',
                  'Display your Patterns, past entries, and activities',
                  'Maintain your subscription and account',
                  'Improve app features and experience',
                  'Ensure security and prevent misuse',
                ]} />
              </Section>

              <Section title="3. AI Usage" isDark={isDark}>
                <Paragraph isDark={isDark}>
                  TRACE uses AI to generate emotional reflections and support messages.
                </Paragraph>
                <BulletList isDark={isDark} items={[
                  'Your identifiable information is never intentionally provided to the AI model.',
                  'AI responses are generated based on your input within TRACE, not shared as public content.',
                  'Models used do not train on your personal data.',
                ]} />
              </Section>

              <Section title="4. Retention Periods" isDark={isDark}>
                <SubSection title="4.1 Chats & Emotional Content" isDark={isDark}>
                  <Paragraph isDark={isDark}>Retained for 7 days, then permanently deleted.</Paragraph>
                </SubSection>
                <SubSection title="4.2 Journal Entries, Check-Ins, Patterns" isDark={isDark}>
                  <Paragraph isDark={isDark}>Saved until you delete them.</Paragraph>
                </SubSection>
                <SubSection title="4.3 Account Data" isDark={isDark}>
                  <Paragraph isDark={isDark}>Retained until your account is deleted.</Paragraph>
                </SubSection>
                <SubSection title="4.4 Logs & Analytics" isDark={isDark}>
                  <Paragraph isDark={isDark}>Limited operational logs retained until user deletion.</Paragraph>
                </SubSection>
              </Section>

              <Section title="5. What We Never Do" isDark={isDark}>
                <Paragraph isDark={isDark}>TRACE will never:</Paragraph>
                <BulletList isDark={isDark} items={[
                  'Sell your data',
                  'Share your personal information for advertising',
                  'Use your feelings to target ads',
                  'Allow third parties to access your emotional content',
                  'Train AI models on your identifiable data',
                ]} />
              </Section>

              <Section title="6. Sharing Your Information" isDark={isDark}>
                <Paragraph isDark={isDark}>
                  We only share the minimum necessary information with trusted partners who help us operate TRACE:
                </Paragraph>
                <BulletList isDark={isDark} items={[
                  'Payment processors (for subscription billing)',
                  'Cloud hosting providers (to securely store your data)',
                  'Analytics providers (anonymized usage data only)',
                ]} />
                <Paragraph isDark={isDark}>
                  These partners must comply with strict privacy and data-protection rules.
                </Paragraph>
              </Section>

              <Section title="7. Your Rights & Controls" isDark={isDark}>
                <Paragraph isDark={isDark}>You may at any time:</Paragraph>
                <BulletList isDark={isDark} items={[
                  'Access your stored data',
                  'Edit or delete individual entries',
                  'Export your data',
                  'Delete your entire account',
                  'Request correction of your information',
                ]} />
                <Paragraph isDark={isDark}>
                  When you delete your account, all personally identifiable data is permanently removed from our systems.
                </Paragraph>
              </Section>

              <Section title="8. Data Security" isDark={isDark}>
                <Paragraph isDark={isDark}>We use industry-standard security measures, including:</Paragraph>
                <BulletList isDark={isDark} items={[
                  'Encrypted data at rest',
                  'Encrypted data in transit',
                  'Secure password hashing',
                  'Strict access controls',
                  'Privacy-by-design architecture',
                ]} />
                <Paragraph isDark={isDark}>
                  No system is 100% secure, but we work continuously to protect your privacy.
                </Paragraph>
              </Section>

              <Section title="9. Children's Privacy" isDark={isDark}>
                <Paragraph isDark={isDark}>
                  TRACE is not intended for users under the age of 13 (or the minimum age required in your region).
                </Paragraph>
              </Section>

              <Section title="10. Changes to This Policy" isDark={isDark}>
                <Paragraph isDark={isDark}>
                  We may update this policy as we improve TRACE. If significant changes occur, we will notify you within the app.
                </Paragraph>
              </Section>

              <Section title="11. Contact Us" isDark={isDark}>
                <Paragraph isDark={isDark}>
                  If you have questions, privacy concerns, or data requests, email:
                </Paragraph>
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '13px',
                    color: isDark ? 'rgba(255, 255, 255, 0.9)' : '#5A4A3A',
                    fontWeight: 500,
                    marginTop: '6px',
                    marginBottom: '8px',
                  }}
                >
                  nina.mytraceapp@gmail.com
                </p>
              </Section>
            </div>

            <div className="p-5 pt-3 flex-shrink-0">
              <button
                onClick={onClose}
                className="w-full rounded-full px-5 py-3 transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#D7C8B5',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(43, 30, 21, 0.1)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'SF Pro Text, -apple-system, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: isDark ? 'rgba(255, 255, 255, 0.92)' : '#4A3526',
                    letterSpacing: '0.02em',
                  }}
                >
                  Done
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children, isDark }: { title: string; children: React.ReactNode; isDark?: boolean }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h3
        style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '14px',
          fontWeight: 500,
          color: isDark ? 'rgba(255, 255, 255, 0.93)' : '#4A3526',
          marginBottom: '8px',
          letterSpacing: '0.01em',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function SubSection({ title, children, isDark }: { title: string; children: React.ReactNode; isDark?: boolean }) {
  return (
    <div style={{ marginBottom: '10px', marginLeft: '4px' }}>
      <h4
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: '12px',
          fontWeight: 600,
          color: isDark ? 'rgba(255, 255, 255, 0.88)' : '#5A4A3A',
          marginBottom: '5px',
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function BulletList({ items, isDark }: { items: string[]; isDark?: boolean }) {
  return (
    <ul style={{ paddingLeft: '14px', marginBottom: '8px' }}>
      {items.map((item, index) => (
        <li
          key={index}
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '12px',
            color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#5A4A3A',
            lineHeight: '1.55',
            marginBottom: '3px',
            listStyleType: 'disc',
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function Paragraph({ children, isDark }: { children: React.ReactNode; isDark?: boolean }) {
  return (
    <p
      style={{
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#5A4A3A',
        lineHeight: '1.6',
        marginBottom: '10px',
      }}
    >
      {children}
    </p>
  );
}
