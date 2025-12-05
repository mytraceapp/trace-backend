import React from 'react';
import { motion } from 'motion/react';

interface PaymentSuccessOverlayProps {
  userName?: string;
  onStartChatting: () => void;
}

export function PaymentSuccessOverlay({ userName = 'there', onStartChatting }: PaymentSuccessOverlayProps) {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'rgba(141, 161, 143, 0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Success Card */}
      <motion.div
        className="w-full max-w-sm rounded-[32px] px-8 py-10 text-center"
        style={{
          background: '#F5F1EB',
          boxShadow: '0 8px 32px rgba(138, 122, 106, 0.25), 0 2px 8px rgba(138, 122, 106, 0.15)',
        }}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {/* Success Icon - Simple checkmark */}
        <motion.div
          className="mx-auto mb-6 flex items-center justify-center"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(138, 122, 106, 0.08)',
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5, type: 'spring', stiffness: 200 }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5A4A3A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>

        {/* Title */}
        <motion.h2
          className="mb-3"
          style={{
            fontFamily: 'Georgia, serif',
            color: '#5A4A3A',
            fontWeight: 400,
            fontSize: '24px',
            letterSpacing: '0.01em',
            lineHeight: '1.3',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          You're all set, {userName}.
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          className="mb-8"
          style={{
            fontFamily: 'Georgia, serif',
            color: '#8A7A6A',
            fontWeight: 300,
            fontSize: '15px',
            letterSpacing: '0.01em',
            lineHeight: '1.5',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          TRACE is here when you need it.
        </motion.p>

        {/* Start Chatting Button */}
        <motion.button
          onClick={onStartChatting}
          className="w-full rounded-full px-8 py-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: '#E8E4DC',
            boxShadow: '0 4px 20px rgba(138, 122, 106, 0.15)',
            border: '1px solid rgba(138, 122, 106, 0.12)',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <span
            style={{
              fontFamily: 'Georgia, serif',
              color: '#5A4A3A',
              fontWeight: 400,
              fontSize: '15px',
              letterSpacing: '0.05em',
            }}
          >
            Start chatting
          </span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
