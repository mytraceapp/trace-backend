import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Fingerprint, Trash2 } from 'lucide-react';
import { PasscodeLockScreen } from './PasscodeLockScreen';

interface PasscodeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasscodeSettingsModal({ isOpen, onClose }: PasscodeSettingsModalProps) {
  const [passcodeEnabled, setPasscodeEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showPasscodeScreen, setShowPasscodeScreen] = useState(false);
  const [passcodeMode, setPasscodeMode] = useState<'setup' | 'change'>('setup');

  useEffect(() => {
    const storedPasscode = localStorage.getItem('trace-passcode');
    setPasscodeEnabled(!!storedPasscode);
    
    const storedBiometric = localStorage.getItem('trace-biometric-enabled');
    setBiometricEnabled(storedBiometric === 'true');

    checkBiometricAvailability();
  }, [isOpen]);

  const checkBiometricAvailability = async () => {
    if (window.PublicKeyCredential) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setBiometricAvailable(available);
      } catch {
        setBiometricAvailable(false);
      }
    }
  };

  const handleTogglePasscode = () => {
    if (passcodeEnabled) {
      localStorage.removeItem('trace-passcode');
      localStorage.removeItem('trace-biometric-enabled');
      setPasscodeEnabled(false);
      setBiometricEnabled(false);
    } else {
      setPasscodeMode('setup');
      setShowPasscodeScreen(true);
    }
  };

  const handleChangePasscode = () => {
    setPasscodeMode('change');
    setShowPasscodeScreen(true);
  };

  const handlePasscodeComplete = () => {
    setShowPasscodeScreen(false);
    setPasscodeEnabled(true);
  };

  const handleToggleBiometric = () => {
    const newValue = !biometricEnabled;
    setBiometricEnabled(newValue);
    localStorage.setItem('trace-biometric-enabled', String(newValue));
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-sm rounded-[28px] p-6"
            style={{
              background: 'var(--card)',
              boxShadow: '0 4px 24px var(--shadow)',
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <button
              className="absolute top-4 right-4 p-2 rounded-full transition-opacity hover:opacity-70"
              onClick={onClose}
            >
              <X size={18} style={{ color: 'var(--text-secondary)' }} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <Lock size={20} style={{ color: 'var(--text-primary)' }} />
              <h3
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '18px',
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                }}
              >
                Passcode & Security
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Lock size={16} style={{ color: 'var(--text-secondary)' }} />
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Passcode Lock
                  </span>
                </div>
                <button
                  onClick={handleTogglePasscode}
                  className="relative w-12 h-7 rounded-full transition-all duration-200"
                  style={{
                    background: passcodeEnabled 
                      ? 'linear-gradient(135deg, #8A7A6A 0%, #6A5A4A 100%)' 
                      : 'var(--accent-soft)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <motion.div
                    className="absolute top-0.5 w-6 h-6 rounded-full"
                    style={{
                      background: 'white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                    animate={{ left: passcodeEnabled ? '22px' : '2px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {passcodeEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pl-7"
                >
                  <button
                    onClick={handleChangePasscode}
                    className="w-full text-left py-2 transition-opacity hover:opacity-70"
                  >
                    <span
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        textDecoration: 'underline',
                        textUnderlineOffset: '3px',
                      }}
                    >
                      Change Passcode
                    </span>
                  </button>

                  {biometricAvailable && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <Fingerprint size={16} style={{ color: 'var(--text-secondary)' }} />
                        <span
                          style={{
                            fontFamily: 'Georgia, serif',
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                          }}
                        >
                          Face ID / Touch ID
                        </span>
                      </div>
                      <button
                        onClick={handleToggleBiometric}
                        className="relative w-12 h-7 rounded-full transition-all duration-200"
                        style={{
                          background: biometricEnabled 
                            ? 'linear-gradient(135deg, #8A7A6A 0%, #6A5A4A 100%)' 
                            : 'var(--accent-soft)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <motion.div
                          className="absolute top-0.5 w-6 h-6 rounded-full"
                          style={{
                            background: 'white',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }}
                          animate={{ left: biometricEnabled ? '22px' : '2px' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  marginTop: '16px',
                }}
              >
                When enabled, you'll need to enter your passcode each time you open TRACE.
                {biometricAvailable && ' You can also use Face ID or Touch ID for quick access.'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showPasscodeScreen && (
          <PasscodeLockScreen
            mode={passcodeMode}
            onUnlock={handlePasscodeComplete}
            onCancel={() => setShowPasscodeScreen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
