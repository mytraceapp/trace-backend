import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scan, X, Eye, EyeOff } from 'lucide-react';
import traceLogo from 'figma:asset/513ec3c351285cce0b15e678c8f6d864d8269d64.png';

interface AuthScreenProps {
  onCreateAccount?: () => void;
  onLogin?: () => void;
}

export function AuthScreen({ onCreateAccount, onLogin }: AuthScreenProps) {
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsLoading(false);
    setShowLoginModal(false);
    onLogin?.();
  };

  const handleFaceIDLogin = async () => {
    setIsLoading(true);
    setError('');
    
    // Simulate Face ID authentication
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setIsLoading(false);
    setShowLoginModal(false);
    onLogin?.();
  };

  return (
    <div 
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #8DA18F 0%, #7D9180 100%)',
      }}
    >
      {/* Soft vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(75, 75, 75, 0.12) 100%)',
        }}
      />

      {/* Bottom gradient fade for depth */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: '50%',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(75, 75, 75, 0.04) 100%)',
        }}
      />

      {/* Subtle texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center w-full px-8 pt-6 pb-12">
        
        {/* TRACE Brand Name - at very top */}
        <motion.div
          className="w-full text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1.5, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <h1 
            style={{ 
              fontFamily: 'ALORE, Georgia, serif',
              color: '#EDE8DB',
              fontWeight: 300,
              letterSpacing: '1em',
              fontSize: '9px',
              textShadow: '0 4px 16px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.65), 0 1px 4px rgba(0,0,0,0.5), 0 0 30px rgba(237, 232, 219, 0.25)',
              opacity: 0.95,
            }}
          >
            TRACE
          </h1>
        </motion.div>
        
        {/* Logo Section with Glow */}
        <motion.div 
          className="relative flex items-center justify-center mb-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 1.5, ease: [0.22, 0.61, 0.36, 1] }}
        >
          {/* Soft radial glow behind logo */}
          <motion.div 
            className="absolute w-[220px] h-[220px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(237, 232, 219, 0.25) 0%, rgba(237, 232, 219, 0.15) 35%, rgba(237, 232, 219, 0.08) 55%, transparent 75%)',
              filter: 'blur(45px)',
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* TRACE Logo Image - same size as home page */}
          <img 
            src={traceLogo} 
            alt="TRACE" 
            className="relative w-[100px] h-[100px]"
            style={{
              filter: 'drop-shadow(0 4px 20px rgba(237, 232, 219, 0.4))',
            }}
          />
        </motion.div>

        {/* Welcome Text with Tagline */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <p 
            className="text-[#EDE8DB] mb-3"
            style={{
              fontFamily: 'Georgia, serif',
              fontWeight: 300,
              fontSize: '16px',
              lineHeight: '1.65',
              letterSpacing: '0.03em',
              opacity: 0.92,
            }}
          >
            Welcome to <span style={{ fontFamily: 'ALORE, Georgia, serif', letterSpacing: '0.5em' }}>TRACE</span>
          </p>
          <p
            style={{
              fontFamily: 'Georgia, serif',
              fontWeight: 300,
              fontSize: '13px',
              lineHeight: '1.6',
              letterSpacing: '0.02em',
              color: '#B8A896',
              opacity: 0.90,
              fontStyle: 'italic',
              textShadow: '0 1px 2px rgba(82, 66, 50, 0.4), 0 0 4px rgba(82, 66, 50, 0.2)',
            }}
          >
            Your mind, at its pace.
          </p>
        </motion.div>

        {/* Button Container */}
        <motion.div 
          className="flex flex-col items-center w-full max-w-[320px] space-y-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
        >
          
          {/* Create Account Button */}
          <button
            className="w-[85%] py-4 px-6 rounded-full bg-[#E8E2D4] text-[#889582] transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
            style={{
              fontFamily: 'Georgia, serif',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
              letterSpacing: '0.05em',
              fontWeight: 400,
              fontSize: '15px',
            }}
            onClick={onCreateAccount}
          >
            Create Account
          </button>

          {/* Log In Button */}
          <button
            className="w-[85%] py-4 px-6 rounded-full bg-transparent border-2 border-[#E8E2D4] text-[#E8E2D4] transition-all duration-300 hover:bg-[#E8E2D4]/10 hover:scale-[1.02]"
            style={{
              fontFamily: 'Georgia, serif',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.03), 0 2px 8px rgba(0, 0, 0, 0.02)',
              letterSpacing: '0.05em',
              fontWeight: 400,
              fontSize: '15px',
            }}
            onClick={() => setShowLoginModal(true)}
          >
            Log In
          </button>

          {/* Divider */}
          <div className="flex items-center w-[85%] mt-1 mb-1">
            <div className="flex-1 h-px bg-[#E8E2D4]/20" />
            <span 
              className="px-4 text-[#E8E2D4]/50"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '11px',
                fontWeight: 300,
                letterSpacing: '0.05em',
              }}
            >
              or
            </span>
            <div className="flex-1 h-px bg-[#E8E2D4]/20" />
          </div>

          {/* Face ID / Biometric Login */}
          <button
            className="flex items-center justify-center gap-3 w-[85%] py-4 px-6 rounded-full bg-[#E8E2D4]/10 border border-[#E8E2D4]/30 text-[#E8E2D4] transition-all duration-300 hover:bg-[#E8E2D4]/20 hover:scale-[1.02] -mt-1"
            style={{
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.05em',
              fontWeight: 400,
              fontSize: '15px',
            }}
            onClick={handleFaceIDLogin}
          >
            <Scan size={18} strokeWidth={1.5} />
            Sign in with Face ID
          </button>
        </motion.div>

      </div>

      {/* Bottom Microtext */}
      <motion.div
        className="absolute bottom-8 left-0 right-0 text-center z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1.5 }}
      >
        <p
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '10px',
            fontWeight: 300,
            color: '#EDE8DB',
            letterSpacing: '0.05em',
            opacity: 0.25,
          }}
        >
          Designed for calm.
        </p>
      </motion.div>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            className="absolute inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowLoginModal(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal Content */}
            <motion.div
              className="relative w-full max-w-md mx-4 mb-8 rounded-[32px] p-8"
              style={{
                background: 'linear-gradient(to bottom, #F5F1EB 0%, #E8E4DC 100%)',
                boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.15), 0 4px 20px rgba(0, 0, 0, 0.1)',
              }}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Close Button */}
              <button
                className="absolute top-5 right-5 p-2 rounded-full transition-colors hover:bg-black/5"
                onClick={() => setShowLoginModal(false)}
              >
                <X size={20} strokeWidth={1.5} style={{ color: '#8A7A6A' }} />
              </button>

              {/* Modal Header */}
              <div className="text-center mb-8">
                <h2
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '22px',
                    fontWeight: 400,
                    color: '#5A4A3A',
                    letterSpacing: '0.02em',
                    marginBottom: '8px',
                  }}
                >
                  Welcome back
                </h2>
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '14px',
                    fontWeight: 300,
                    color: '#8A7A6A',
                    letterSpacing: '0.01em',
                  }}
                >
                  Sign in to continue your journey
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  className="mb-4 p-3 rounded-xl text-center"
                  style={{
                    background: 'rgba(176, 125, 108, 0.1)',
                    border: '1px solid rgba(176, 125, 108, 0.2)',
                  }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '13px',
                      color: '#B07D6C',
                      fontWeight: 300,
                    }}
                  >
                    {error}
                  </p>
                </motion.div>
              )}

              {/* Email Input */}
              <div className="mb-4">
                <label
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    fontWeight: 300,
                    color: '#8A7A6A',
                    letterSpacing: '0.03em',
                    display: 'block',
                    marginBottom: '8px',
                    marginLeft: '4px',
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full px-5 py-4 rounded-2xl outline-none transition-all duration-200 focus:ring-2 focus:ring-[#8DA18F]/30"
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '15px',
                    fontWeight: 300,
                    color: '#5A4A3A',
                    background: '#FFFFFF',
                    border: '1px solid rgba(138, 122, 106, 0.15)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                  }}
                />
              </div>

              {/* Password Input */}
              <div className="mb-6">
                <label
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    fontWeight: 300,
                    color: '#8A7A6A',
                    letterSpacing: '0.03em',
                    display: 'block',
                    marginBottom: '8px',
                    marginLeft: '4px',
                  }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-5 py-4 pr-12 rounded-2xl outline-none transition-all duration-200 focus:ring-2 focus:ring-[#8DA18F]/30"
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '15px',
                      fontWeight: 300,
                      color: '#5A4A3A',
                      background: '#FFFFFF',
                      border: '1px solid rgba(138, 122, 106, 0.15)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={18} strokeWidth={1.5} style={{ color: '#8A7A6A' }} />
                    ) : (
                      <Eye size={18} strokeWidth={1.5} style={{ color: '#8A7A6A' }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="text-center mb-6">
                <button
                  className="transition-opacity hover:opacity-70"
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '13px',
                    fontWeight: 300,
                    color: '#8A7A6A',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In Button */}
              <button
                className="w-full py-4 px-6 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '15px',
                  fontWeight: 400,
                  letterSpacing: '0.05em',
                  background: '#8DA18F',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 16px rgba(141, 161, 143, 0.3)',
                }}
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              {/* Divider */}
              <div className="flex items-center my-5">
                <div className="flex-1 h-px bg-[#8A7A6A]/15" />
                <span 
                  className="px-4"
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '11px',
                    fontWeight: 300,
                    color: '#8A7A6A',
                    opacity: 0.6,
                  }}
                >
                  or
                </span>
                <div className="flex-1 h-px bg-[#8A7A6A]/15" />
              </div>

              {/* Face ID Option in Modal */}
              <button
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full transition-all duration-300 hover:bg-[#8DA18F]/10 disabled:opacity-50"
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '15px',
                  fontWeight: 400,
                  letterSpacing: '0.03em',
                  color: '#5A4A3A',
                  border: '1.5px solid rgba(141, 161, 143, 0.4)',
                }}
                onClick={handleFaceIDLogin}
                disabled={isLoading}
              >
                <Scan size={18} strokeWidth={1.5} />
                Use Face ID instead
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}