import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AboutTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutTraceModal({ isOpen, onClose }: AboutTraceModalProps) {
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
            className="relative z-10 w-full rounded-[24px] p-6 pb-8"
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
                .about-modal-content::-webkit-scrollbar {
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

            <div className="about-modal-content text-center">
              <h1
                style={{
                  fontFamily: 'ALORE, Georgia, serif',
                  color: '#5A4A3A',
                  fontWeight: 300,
                  letterSpacing: '0.3em',
                  fontSize: '18px',
                  textShadow: '0 0 15px rgba(90, 74, 58, 0.3), 0 0 30px rgba(90, 74, 58, 0.15)',
                  opacity: 0.9,
                  marginBottom: '24px',
                  marginTop: '8px',
                }}
              >
                TRACE
              </h1>

              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  color: '#5A4A3A',
                  lineHeight: '1.7',
                  marginBottom: '16px',
                }}
              >
                TRACE is your quiet space to slow down, breathe, and reconnect with yourself.
              </p>

              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  color: '#5A4A3A',
                  lineHeight: '1.7',
                  marginBottom: '16px',
                }}
              >
                Designed with intention, TRACE blends emotional awareness, soft guidance, and gentle AI reflections to help you understand your inner patterns and return to calm.
              </p>

              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  color: '#5A4A3A',
                  lineHeight: '1.7',
                  marginBottom: '24px',
                }}
              >
                Here, you can check in, explore grounding tools, follow the light, and find moments of clarity whenever you need them. TRACE doesn't replace your voice—it helps you hear it more clearly.
              </p>

              <div
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '15px',
                  color: '#4A3526',
                  lineHeight: '1.8',
                  fontStyle: 'italic',
                }}
              >
                <p style={{ marginBottom: '4px' }}>This is your space.</p>
                <p style={{ marginBottom: '4px' }}>Your pace.</p>
                <p>Your TRACE.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
