import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, X, Delete } from 'lucide-react';

interface PasscodeLockScreenProps {
  onUnlock: () => void;
  onCancel?: () => void;
  mode: 'unlock' | 'setup' | 'confirm' | 'change';
  biometricAvailable?: boolean;
  onBiometricUnlock?: () => void;
}

export function PasscodeLockScreen({ 
  onUnlock, 
  onCancel,
  mode, 
  biometricAvailable = false,
  onBiometricUnlock 
}: PasscodeLockScreenProps) {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [error, setError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [shake, setShake] = useState(false);

  const storedPasscode = localStorage.getItem('trace-passcode');

  const handleDigitPress = (digit: string) => {
    if (passcode.length < 4) {
      const newPasscode = passcode + digit;
      setPasscode(newPasscode);
      setError('');

      if (newPasscode.length === 4) {
        setTimeout(() => handleComplete(newPasscode), 150);
      }
    }
  };

  const handleDelete = () => {
    setPasscode(prev => prev.slice(0, -1));
    setError('');
  };

  const handleComplete = (code: string) => {
    if (mode === 'unlock') {
      if (code === storedPasscode) {
        onUnlock();
      } else {
        setShake(true);
        setError('Incorrect passcode');
        setPasscode('');
        setTimeout(() => setShake(false), 500);
      }
    } else if (mode === 'setup' || mode === 'change') {
      if (!isConfirming) {
        setConfirmPasscode(code);
        setPasscode('');
        setIsConfirming(true);
      } else {
        if (code === confirmPasscode) {
          localStorage.setItem('trace-passcode', code);
          onUnlock();
        } else {
          setShake(true);
          setError('Passcodes don\'t match');
          setPasscode('');
          setConfirmPasscode('');
          setIsConfirming(false);
          setTimeout(() => setShake(false), 500);
        }
      }
    }
  };

  const getTitle = () => {
    if (mode === 'unlock') return 'Enter Passcode';
    if (mode === 'setup' || mode === 'change') {
      return isConfirming ? 'Confirm Passcode' : 'Create Passcode';
    }
    return 'Enter Passcode';
  };

  const getSubtitle = () => {
    if (mode === 'unlock') return 'Enter your 4-digit passcode to unlock TRACE';
    if (mode === 'setup' || mode === 'change') {
      return isConfirming ? 'Re-enter your passcode to confirm' : 'Choose a 4-digit passcode';
    }
    return '';
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: 'var(--bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {onCancel && (
        <button
          className="absolute top-6 right-6 p-2 rounded-full transition-opacity hover:opacity-70"
          onClick={onCancel}
        >
          <X size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
      )}

      <motion.div
        className="flex flex-col items-center"
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <h2
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '22px',
            fontWeight: 400,
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          {getTitle()}
        </h2>
        <p
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '40px',
            textAlign: 'center',
            maxWidth: '280px',
          }}
        >
          {getSubtitle()}
        </p>

        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-4 h-4 rounded-full"
              style={{
                background: passcode.length > i ? 'var(--text-primary)' : 'transparent',
                border: '2px solid var(--text-secondary)',
              }}
              animate={passcode.length > i ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.15 }}
            />
          ))}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '13px',
              color: '#C4635F',
              marginBottom: '20px',
            }}
          >
            {error}
          </motion.p>
        )}

        <div className="grid grid-cols-3 gap-4" style={{ width: '240px' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, i) => (
            <React.Fragment key={i}>
              {key === '' ? (
                <div className="w-16 h-16" />
              ) : key === 'del' ? (
                <button
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                  style={{
                    background: 'transparent',
                  }}
                  onClick={handleDelete}
                >
                  <Delete size={22} style={{ color: 'var(--text-secondary)' }} />
                </button>
              ) : (
                <button
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 hover:opacity-80"
                  style={{
                    background: 'var(--accent-soft)',
                    border: '1px solid var(--border)',
                  }}
                  onClick={() => handleDigitPress(key)}
                >
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '24px',
                      color: 'var(--text-primary)',
                      fontWeight: 300,
                    }}
                  >
                    {key}
                  </span>
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {mode === 'unlock' && biometricAvailable && onBiometricUnlock && (
          <motion.button
            className="mt-8 flex items-center gap-2 py-3 px-6 rounded-full transition-all duration-200 hover:opacity-80"
            style={{
              background: 'var(--accent-soft)',
              border: '1px solid var(--border)',
            }}
            onClick={onBiometricUnlock}
            whileTap={{ scale: 0.95 }}
          >
            <Fingerprint size={20} style={{ color: 'var(--text-primary)' }} />
            <span
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                color: 'var(--text-primary)',
              }}
            >
              Use Face ID
            </span>
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
