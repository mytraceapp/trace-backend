import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TermsOfUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsOfUseModal({ isOpen, onClose }: TermsOfUseModalProps) {
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
                .terms-modal-content::-webkit-scrollbar {
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

            <div className="terms-modal-content" style={{ paddingRight: '12px' }}>
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
                TRACE Terms of Use
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
                  marginBottom: '10px',
                }}
              >
                Welcome to TRACE. These Terms of Use ("Terms") govern your access to and use of the TRACE mobile application ("TRACE," "we," "us," or "our"). Please read them carefully.
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
                By using TRACE, you agree to these Terms.
              </p>

              <Section title="1. Purpose of TRACE">
                <p style={paragraphStyle}>
                  TRACE is a wellness and emotional-support tool designed to help you slow down, breathe, reflect, and better understand your emotional patterns.
                </p>
                <p style={paragraphStyle}>
                  TRACE is not a medical, psychological, or crisis service.
                </p>
              </Section>

              <Section title="2. Not Medical Advice">
                <p style={paragraphStyle}>TRACE does not provide:</p>
                <BulletList items={[
                  'Professional counseling or therapy',
                  'Medical or psychiatric advice',
                  'Diagnosis or treatment of any condition',
                ]} />
                <p style={paragraphStyle}>
                  If you are in crisis or need urgent help, contact local emergency services or a qualified professional.
                </p>
              </Section>

              <Section title="3. Eligibility">
                <p style={paragraphStyle}>You may use TRACE only if:</p>
                <BulletList items={[
                  'You are at least 13 years old (or the minimum age required in your region)',
                  'You can legally agree to these Terms',
                  'You use the app for personal, non-commercial purposes',
                ]} />
              </Section>

              <Section title="4. Your TRACE Account">
                <p style={paragraphStyle}>When you create an account, you agree to:</p>
                <BulletList items={[
                  'Provide accurate information',
                  'Keep your login details secure',
                  'Be responsible for all activity in your account',
                ]} />
                <p style={paragraphStyle}>
                  If you believe your account is compromised, notify us immediately.
                </p>
              </Section>

              <Section title="5. Subscriptions & Payments">
                <p style={paragraphStyle}>TRACE offers:</p>
                <BulletList items={[
                  'Light (Free)',
                  'Premium ($9.99/mo)',
                  'Studio ($14.99/mo)',
                ]} />
                <p style={paragraphStyle}>
                  By subscribing, you authorize recurring payments until you cancel. You may cancel anytime in the app or through your platform account (Apple/Google).
                </p>
                <p style={paragraphStyle}>
                  Paid plans unlock additional features. Refunds follow the policies of the App Store or payment provider.
                </p>
              </Section>

              <Section title="6. Acceptable Use">
                <p style={paragraphStyle}>You agree not to:</p>
                <BulletList items={[
                  'Use TRACE for harmful, abusive, or illegal activity',
                  'Attempt to disrupt or reverse-engineer the app',
                  'Upload content that is threatening, hateful, or unsafe',
                  'Use TRACE if you are prohibited by law from doing so',
                ]} />
                <p style={paragraphStyle}>
                  We may suspend or terminate accounts that violate these rules.
                </p>
              </Section>

              <Section title="7. Your Content">
                <p style={paragraphStyle}>
                  You own your journal entries, messages, and activities.
                </p>
                <p style={paragraphStyle}>By using TRACE, you give us permission to:</p>
                <BulletList items={[
                  'Store your content securely',
                  'Process it to provide AI-driven emotional support',
                  'Display it back to you in the app',
                  'Improve your experience and app functionality',
                ]} />
                <p style={paragraphStyle}>
                  We do not sell or share your emotional content.
                </p>
              </Section>

              <Section title="8. AI & Limitations">
                <p style={paragraphStyle}>
                  TRACE uses artificial intelligence for reflections and emotional guidance. While thoughtful and supportive, AI responses:
                </p>
                <BulletList items={[
                  'May not always be accurate',
                  'Should not replace human judgment',
                  'Are for wellness support only',
                ]} />
                <p style={paragraphStyle}>
                  Use TRACE mindfully and at your own discretion.
                </p>
              </Section>

              <Section title="9. Termination">
                <p style={paragraphStyle}>
                  You may delete your account at any time. We may suspend or terminate access if:
                </p>
                <BulletList items={[
                  'You violate these Terms',
                  'You misuse the app',
                  'We need to protect the platform or community',
                ]} />
                <p style={paragraphStyle}>
                  Upon deletion, your personal data is removed in accordance with our Privacy Policy.
                </p>
              </Section>

              <Section title="10. Changes to TRACE">
                <p style={paragraphStyle}>
                  We may modify or update features, pricing, or these Terms. When changes are significant, we will notify you in the app.
                </p>
                <p style={paragraphStyle}>
                  Continued use means you accept the updated Terms.
                </p>
              </Section>

              <Section title="11. Limitation of Liability">
                <p style={paragraphStyle}>
                  TRACE is provided "as-is." We do not guarantee uninterrupted access or perfect accuracy.
                </p>
                <p style={paragraphStyle}>
                  To the fullest extent allowed by law, TRACE is not liable for:
                </p>
                <BulletList items={[
                  'Emotional distress, decisions, or outcomes based on app content',
                  'Loss of data',
                  'Service interruptions',
                  'Indirect or consequential damages',
                ]} />
                <p style={paragraphStyle}>
                  Use TRACE at your own discretion.
                </p>
              </Section>

              <Section title="12. Contact Us">
                <p style={paragraphStyle}>
                  If you have questions about these Terms:
                </p>
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
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
