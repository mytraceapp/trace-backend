import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center p-4"
          style={{ borderRadius: '44px', overflow: 'hidden' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/40"
            style={{ borderRadius: '44px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full rounded-[24px] p-5 pb-6"
            style={{
              backgroundColor: '#F5F1EB',
              border: '1px solid rgba(43, 30, 21, 0.08)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1)',
              maxHeight: 'calc(100% - 32px)',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <style>
              {`
                .privacy-modal-content::-webkit-scrollbar {
                  display: none;
                }
              `}
            </style>

            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-full transition-colors hover:bg-black/10"
              style={{ 
                position: 'absolute',
                top: '14px',
                right: '14px',
                width: '28px',
                height: '28px',
                backgroundColor: 'rgba(90, 74, 58, 0.1)',
                zIndex: 10,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1L13 13M1 13L13 1"
                  stroke="#5A4A3A"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="privacy-modal-content" style={{ paddingRight: '12px' }}>
              <h2
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: '#4A3526',
                  marginBottom: '6px',
                  letterSpacing: '0.02em',
                  paddingRight: '24px',
                }}
              >
                TRACE Privacy Policy
              </h2>
              
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '11px',
                  color: '#7D6D5D',
                  marginBottom: '16px',
                  fontStyle: 'italic',
                }}
              >
                Last updated: January 2026
              </p>

              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '12px',
                  color: '#5A4A3A',
                  lineHeight: '1.6',
                  marginBottom: '14px',
                }}
              >
                TRACE ("we," "our," or "us") provides a wellness and emotional-support application designed to help users slow down, reflect, and improve their mental clarity. Your privacy matters deeply to us. This Privacy Policy explains how we collect, use, store, and protect your data when you use TRACE.
              </p>

              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '11px',
                  color: '#7D6D5D',
                  lineHeight: '1.55',
                  marginBottom: '18px',
                  fontStyle: 'italic',
                }}
              >
                By using TRACE, you agree to the terms in this policy.
              </p>

              <Section title="1. Information We Collect">
                <p style={paragraphStyle}>
                  We collect only the data necessary to operate the app and provide your wellness experience.
                </p>
                
                <SubSection title="1.1 Account Information">
                  <BulletList items={[
                    'Name',
                    'Email address',
                    'Password (encrypted)',
                    'Selected subscription plan',
                  ]} />
                </SubSection>

                <SubSection title="1.2 App Activity & Usage">
                  <p style={paragraphStyle}>To support your emotional wellness journey, TRACE stores:</p>
                  <BulletList items={[
                    'Chat messages with TRACE',
                    'Check-ins, journal entries, and "Patterns" data',
                    'Completed sessions (breathing, maze, grounding, etc.)',
                    'App settings (tone, ambience, theme, preferences)',
                  ]} />
                </SubSection>

                <SubSection title="1.3 Device Information">
                  <p style={paragraphStyle}>We may collect minimal technical information:</p>
                  <BulletList items={[
                    'Device type and operating system',
                    'Browser version',
                    'IP address (for security only)',
                  ]} />
                </SubSection>

                <SubSection title="1.4 Payment Information">
                  <p style={paragraphStyle}>
                    Payments are processed securely through our payment partners. TRACE never sees or stores your full card details.
                  </p>
                </SubSection>
              </Section>

              <Section title="2. How We Use Your Information">
                <p style={paragraphStyle}>We use your data to:</p>
                <BulletList items={[
                  'Provide personalized emotional support',
                  'Display your Patterns, past entries, and activities',
                  'Maintain your subscription and account',
                  'Improve app features and experience',
                  'Ensure security and prevent misuse',
                ]} />
              </Section>

              <Section title="3. AI Usage">
                <p style={paragraphStyle}>
                  TRACE uses AI to generate emotional reflections and support messages.
                </p>
                <BulletList items={[
                  'Your identifiable information is never intentionally provided to the AI model.',
                  'AI responses are generated based on your input within TRACE, not shared as public content.',
                  'Models used do not train on your personal data.',
                ]} />
              </Section>

              <Section title="4. Retention Periods">
                <SubSection title="4.1 Chats & Emotional Content">
                  <p style={paragraphStyle}>Retained for 7 days, then permanently deleted.</p>
                </SubSection>
                <SubSection title="4.2 Journal Entries, Check-Ins, Patterns">
                  <p style={paragraphStyle}>Saved until you delete them.</p>
                </SubSection>
                <SubSection title="4.3 Account Data">
                  <p style={paragraphStyle}>Retained until your account is deleted.</p>
                </SubSection>
                <SubSection title="4.4 Logs & Analytics">
                  <p style={paragraphStyle}>Limited operational logs retained until user deletion.</p>
                </SubSection>
              </Section>

              <Section title="5. What We Never Do">
                <p style={paragraphStyle}>TRACE will never:</p>
                <BulletList items={[
                  'Sell your data',
                  'Share your personal information for advertising',
                  'Use your feelings to target ads',
                  'Allow third parties to access your emotional content',
                  'Train AI models on your identifiable data',
                ]} />
              </Section>

              <Section title="6. Sharing Your Information">
                <p style={paragraphStyle}>
                  We only share the minimum necessary information with trusted partners who help us operate TRACE:
                </p>
                <BulletList items={[
                  'Payment processors (for subscription billing)',
                  'Cloud hosting providers (to securely store your data)',
                  'Analytics providers (anonymized usage data only)',
                ]} />
                <p style={paragraphStyle}>
                  These partners must comply with strict privacy and data-protection rules.
                </p>
              </Section>

              <Section title="7. Your Rights & Controls">
                <p style={paragraphStyle}>You may at any time:</p>
                <BulletList items={[
                  'Access your stored data',
                  'Edit or delete individual entries',
                  'Export your data',
                  'Delete your entire account',
                  'Request correction of your information',
                ]} />
                <p style={paragraphStyle}>
                  When you delete your account, all personally identifiable data is permanently removed from our systems.
                </p>
              </Section>

              <Section title="8. Data Security">
                <p style={paragraphStyle}>We use industry-standard security measures, including:</p>
                <BulletList items={[
                  'Encrypted data at rest',
                  'Encrypted data in transit',
                  'Secure password hashing',
                  'Strict access controls',
                  'Privacy-by-design architecture',
                ]} />
                <p style={paragraphStyle}>
                  No system is 100% secure, but we work continuously to protect your privacy.
                </p>
              </Section>

              <Section title="9. Children's Privacy">
                <p style={paragraphStyle}>
                  TRACE is not intended for users under the age of 13 (or the minimum age required in your region).
                </p>
              </Section>

              <Section title="10. Changes to This Policy">
                <p style={paragraphStyle}>
                  We may update this policy as we improve TRACE. If significant changes occur, we will notify you within the app.
                </p>
              </Section>

              <Section title="11. Contact Us">
                <p style={paragraphStyle}>
                  If you have questions, privacy concerns, or data requests, email:
                </p>
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '14px',
                    color: '#5A4A3A',
                    fontWeight: 500,
                    marginTop: '8px',
                  }}
                >
                  nina.mytraceapp@gmail.com
                </p>
              </Section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const paragraphStyle: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: '12px',
  color: '#5A4A3A',
  lineHeight: '1.6',
  marginBottom: '10px',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h3
        style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '14px',
          fontWeight: 500,
          color: '#4A3526',
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

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '10px', marginLeft: '4px' }}>
      <h4
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: '12px',
          fontWeight: 600,
          color: '#5A4A3A',
          marginBottom: '5px',
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: '14px', marginBottom: '8px' }}>
      {items.map((item, index) => (
        <li
          key={index}
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '12px',
            color: '#5A4A3A',
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
