import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../state/ThemeContext';

interface TermsOfUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsOfUseModal({ isOpen, onClose }: TermsOfUseModalProps) {
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
                .terms-modal-content::-webkit-scrollbar {
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
                  Terms of Use
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
              className="flex-1 overflow-y-auto px-5 terms-modal-content"
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
                Welcome to TRACE. These Terms of Use govern your access to and use of the TRACE mobile application. Please read them carefully.
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
                By using TRACE, you agree to these Terms.
              </p>

              <Section title="1. Purpose of TRACE" isDark={isDark}>
                <Paragraph isDark={isDark}>
                  TRACE is a wellness and emotional-support tool designed to help you slow down, breathe, reflect, and better understand your emotional patterns.
                </Paragraph>
                <Paragraph isDark={isDark}>
                  TRACE is not a medical, psychological, or crisis service.
                </Paragraph>
              </Section>

              <Section title="2. Not Medical Advice" isDark={isDark}>
                <Paragraph isDark={isDark}>TRACE does not provide:</Paragraph>
                <BulletList isDark={isDark} items={[
                  'Professional counseling or therapy',
                  'Medical or psychiatric advice',
                  'Diagnosis or treatment of any condition',
                ]} />
                <Paragraph isDark={isDark}>
                  If you are in crisis or need urgent help, contact local emergency services or a qualified professional.
                </Paragraph>
              </Section>

              <Section title="3. Eligibility" isDark={isDark}>
                <Paragraph isDark={isDark}>You may use TRACE only if:</Paragraph>
                <BulletList isDark={isDark} items={[
                  'You are at least 13 years old (or the minimum age required in your region)',
                  'You can legally agree to these Terms',
                  'You use the app for personal, non-commercial purposes',
                ]} />
              </Section>

              <Section title="4. Your TRACE Account" isDark={isDark}>
                <Paragraph isDark={isDark}>When you create an account, you agree to:</Paragraph>
                <BulletList isDark={isDark} items={[
                  'Provide accurate information',
                  'Keep your login details secure',
                  'Be responsible for all activity in your account',
                ]} />
                <Paragraph isDark={isDark}>
                  If you believe your account is compromised, notify us immediately.
                </Paragraph>
              </Section>

              <Section title="5. Subscriptions & Payments" isDark={isDark}>
                <Paragraph isDark={isDark}>TRACE offers:</Paragraph>
                <BulletList isDark={isDark} items={[
                  'Light (Free)',
                  'Premium ($9.99/mo)',
                  'Studio ($14.99/mo)',
                ]} />
                <Paragraph isDark={isDark}>
                  By subscribing, you authorize recurring payments until you cancel. You may cancel anytime in the app or through your platform account (Apple/Google).
                </Paragraph>
                <Paragraph isDark={isDark}>
                  Paid plans unlock additional features. Refunds follow the policies of the App Store or payment provider.
                </Paragraph>
              </Section>

              <Section title="6. Acceptable Use" isDark={isDark}>
                <Paragraph isDark={isDark}>You agree not to:</Paragraph>
                <BulletList isDark={isDark} items={[
                  'Use TRACE for harmful, abusive, or illegal activity',
                  'Attempt to disrupt or reverse-engineer the app',
                  'Upload content that is threatening, hateful, or unsafe',
                  'Use TRACE if you are prohibited by law from doing so',
                ]} />
                <Paragraph isDark={isDark}>
                  We may suspend or terminate accounts that violate these rules.
                </Paragraph>
              </Section>

              <Section title="7. Your Content" isDark={isDark}>
                <Paragraph isDark={isDark}>
                  You own your journal entries, messages, and activities.
                </Paragraph>
                <Paragraph isDark={isDark}>By using TRACE, you give us permission to:</Paragraph>
                <BulletList isDark={isDark} items={[
                  'Store your content securely',
                  'Process it to provide AI-driven emotional support',
                  'Display it back to you in the app',
                  'Improve your experience and app functionality',
                ]} />
                <Paragraph isDark={isDark}>
                  We do not sell or share your emotional content.
                </Paragraph>
              </Section>

              <Section title="8. AI & Limitations" isDark={isDark}>
                <Paragraph isDark={isDark}>
                  TRACE uses artificial intelligence for reflections and emotional guidance. While thoughtful and supportive, AI responses:
                </Paragraph>
                <BulletList isDark={isDark} items={[
                  'May not always be accurate',
                  'Should not replace human judgment',
                  'Are for wellness support only',
                ]} />
                <Paragraph isDark={isDark}>
                  Use TRACE mindfully and at your own discretion.
                </Paragraph>
              </Section>

              <Section title="9. Termination" isDark={isDark}>
                <Paragraph isDark={isDark}>
                  You may delete your account at any time. We may suspend or terminate access if:
                </Paragraph>
                <BulletList isDark={isDark} items={[
                  'You violate these Terms',
                  'You misuse the app',
                  'We need to protect the platform or community',
                ]} />
                <Paragraph isDark={isDark}>
                  Upon deletion, your personal data is removed in accordance with our Privacy Policy.
                </Paragraph>
              </Section>

              <Section title="10. Changes to TRACE" isDark={isDark}>
                <Paragraph isDark={isDark}>
                  We may modify or update features, pricing, or these Terms. When changes are significant, we will notify you in the app.
                </Paragraph>
                <Paragraph isDark={isDark}>
                  Continued use means you accept the updated Terms.
                </Paragraph>
              </Section>

              <Section title="11. Limitation of Liability" isDark={isDark}>
                <Paragraph isDark={isDark}>
                  TRACE is provided "as-is." We do not guarantee uninterrupted access or perfect accuracy.
                </Paragraph>
                <Paragraph isDark={isDark}>
                  To the fullest extent allowed by law, TRACE is not liable for:
                </Paragraph>
                <BulletList isDark={isDark} items={[
                  'Emotional distress, decisions, or outcomes based on app content',
                  'Loss of data',
                  'Service interruptions',
                  'Indirect or consequential damages',
                ]} />
                <Paragraph isDark={isDark}>
                  Use TRACE at your own discretion.
                </Paragraph>
              </Section>

              <Section title="12. Contact Us" isDark={isDark}>
                <Paragraph isDark={isDark}>
                  If you have questions about these Terms:
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
