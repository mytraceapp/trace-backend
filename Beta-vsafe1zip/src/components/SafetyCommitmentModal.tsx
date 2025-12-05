import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SafetyCommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SafetyCommitmentModal({ isOpen, onClose }: SafetyCommitmentModalProps) {
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
            className="relative z-10 w-full max-w-[340px] rounded-[24px] flex flex-col"
            style={{
              backgroundColor: '#E9E2D8',
              border: '1px solid rgba(43, 30, 21, 0.12)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1)',
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
                .safety-modal-content::-webkit-scrollbar {
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
                    color: '#4A3526',
                    marginBottom: '4px',
                    letterSpacing: '0.02em',
                  }}
                >
                  Safety Commitment
                </h2>
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '11px',
                    color: '#7D6D5D',
                    marginBottom: '12px',
                    fontStyle: 'italic',
                  }}
                >
                  Last updated: January 2026
                </p>
              </div>
            </div>

            <div 
              className="flex-1 overflow-y-auto px-5 safety-modal-content"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '12px',
                  color: '#5A4A3A',
                  lineHeight: '1.6',
                  marginBottom: '14px',
                }}
              >
                TRACE is designed to support emotional well-being, reflection, and personal clarity. We care deeply about your safety. This policy explains what TRACE can and cannot do, and the commitments we make to protect you.
              </p>

              <Section title="1. TRACE is a Wellness Companion — Not a Clinician">
                <p style={paragraphStyle}>
                  TRACE provides emotional support, grounding tools, journaling, and guided reflection. However:
                </p>
                <BulletList items={[
                  'TRACE is not a substitute for therapy, counseling, or medical care.',
                  'TRACE cannot diagnose conditions or give medical, legal, or crisis advice.',
                  'TRACE should be used to support your wellness, not replace professional help.',
                ]} />
              </Section>

              <Section title="2. Crisis Safety">
                <p style={paragraphStyle}>
                  If you ever feel unsafe, overwhelmed, or in danger, please contact:
                </p>
                <BulletList items={[
                  '988 (U.S.) – Suicide & Crisis Lifeline',
                  'Your local emergency number',
                  'A trusted friend, family member, or mental health professional',
                ]} />
                <p style={paragraphStyle}>
                  TRACE does not monitor or intervene in real-time emergencies.
                </p>
              </Section>

              <Section title="3. Emotional Boundaries">
                <p style={paragraphStyle}>
                  TRACE is built with ethical guidelines to ensure safe, respectful responses:
                </p>
                <BulletList items={[
                  'No judgment or shame',
                  'No manipulation or persuasion',
                  'No harmful or triggering content',
                  'No romantic or inappropriate behavior',
                  'No false promises or guarantees',
                ]} />
                <p style={paragraphStyle}>
                  Your emotional safety comes first.
                </p>
              </Section>

              <Section title="4. Data Safety">
                <p style={paragraphStyle}>
                  Your reflections and emotional content are private. We commit to:
                </p>
                <BulletList items={[
                  'Never selling your data',
                  'Never using your feelings for ads',
                  'Never training external AI models on your identifiable content',
                  'Encrypting your information for safety',
                ]} />
                <p style={{ ...paragraphStyle, fontStyle: 'italic', opacity: 0.85 }}>
                  (See the full Privacy Policy for details.)
                </p>
              </Section>

              <Section title="5. Age Requirement">
                <p style={paragraphStyle}>
                  TRACE is designed for individuals 13+. Users under the required age should not use the app.
                </p>
              </Section>

              <Section title="6. Respectful Use">
                <p style={paragraphStyle}>
                  To keep TRACE safe for everyone:
                </p>
                <BulletList items={[
                  'Use TRACE responsibly',
                  'Do not attempt to misuse or exploit the app',
                  'Do not input harmful content aimed at others',
                  'Do not use TRACE for illegal or violent intent',
                ]} />
                <p style={paragraphStyle}>
                  This keeps the community and the brand protected.
                </p>
              </Section>

              <Section title="7. Our Promise to You">
                <p style={paragraphStyle}>
                  We commit to:
                </p>
                <BulletList items={[
                  'Designing TRACE with safety and ethics at its core',
                  'Constantly improving emotional-support features',
                  'Providing clarity, grounding, and peace—not confusion',
                  'Being transparent about your data and rights',
                  'Never crossing emotional, ethical, or psychological boundaries',
                ]} />
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    color: '#5A4A3A',
                    fontStyle: 'italic',
                    marginTop: '10px',
                    marginBottom: '8px',
                    textAlign: 'center',
                  }}
                >
                  TRACE exists to slow you down, not overwhelm you.
                </p>
              </Section>
            </div>

            <div className="p-5 pt-3 flex-shrink-0">
              <button
                onClick={onClose}
                className="w-full rounded-full px-5 py-3 transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: '#D7C8B5',
                  border: '1px solid rgba(43, 30, 21, 0.1)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'SF Pro Text, -apple-system, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#4A3526',
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
