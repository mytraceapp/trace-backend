import React from 'react';
import { motion } from 'motion/react';
import { CreditCard, Smartphone } from 'lucide-react';
import { useUser, planLabels } from '../state/PlanContext';

interface PaymentScreenProps {
  onComplete?: () => void;
}

export function PaymentScreen({ onComplete }: PaymentScreenProps) {
  const { selectedPlan, updatePlan } = useUser();
  const [paymentMethod, setPaymentMethod] = React.useState<'wallet' | 'card'>('card');
  const [cardNumber, setCardNumber] = React.useState('');
  const [expiration, setExpiration] = React.useState('');
  const [cvc, setCvc] = React.useState('');
  const [country, setCountry] = React.useState('United States');

  const currentPlanName = planLabels[selectedPlan].name;
  const currentPlanPrice = planLabels[selectedPlan].price;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlan(selectedPlan, true);
    onComplete?.();
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{ 
        background: 'linear-gradient(to bottom, #F5F1EB 0%, #E8E4DC 18%, #D8DCD5 45%, #C5CABE 78%, #B4BFB3 100%)' 
      }}
    >
      {/* Subtle grain texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
        }}
      />

      {/* TRACE Brand Name at top */}
      <motion.div
        className="absolute w-full text-center z-20"
        style={{ top: '7%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 1.5, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <h1
          style={{
            fontFamily: 'ALORE, Georgia, serif',
            color: '#5A4A3A',
            fontWeight: 300,
            letterSpacing: '1em',
            fontSize: '11px',
            textShadow: '0 0 15px rgba(90, 74, 58, 0.45), 0 0 30px rgba(90, 74, 58, 0.25), 0 2px 4px rgba(0,0,0,0.15)',
            opacity: 0.88,
            paddingLeft: '1em',
          }}
        >
          TRACE
        </h1>
      </motion.div>

      {/* Scrollable Content Wrapper */}
      <div 
        className="relative z-10 flex flex-col h-full overflow-y-auto overflow-x-hidden pb-12" 
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>
          {`
            div::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>

        {/* Top spacing for TRACE title */}
        <div className="flex-shrink-0" style={{ height: '13%' }} />

        {/* Centered Content Container */}
        <div className="w-full max-w-md mx-auto px-6 flex flex-col">
          
          {/* Title Section */}
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <h2
              style={{
                fontFamily: 'Georgia, serif',
                color: '#5A4A3A',
                fontWeight: 400,
                fontSize: '22px',
                letterSpacing: '0.01em',
                marginBottom: '8px',
              }}
            >
              Secure checkout
            </h2>
            <p
              style={{
                fontFamily: 'Georgia, serif',
                color: '#8A7A6A',
                fontWeight: 300,
                fontSize: '14px',
                letterSpacing: '0.01em',
                lineHeight: '1.5',
              }}
            >
              Your plan, at your pace. Cancel anytime.
            </p>
          </motion.div>

          {/* Plan Card */}
          <motion.div
            className="w-full rounded-[28px] px-6 py-5 mb-5"
            style={{
              background: '#F5F1EB',
              boxShadow: '0 2px 16px rgba(138, 122, 106, 0.08)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#5A4A3A',
                    fontWeight: 400,
                    fontSize: '16px',
                    letterSpacing: '0.01em',
                  }}
                >
                  {currentPlanName} · {currentPlanPrice}
                </h3>
                <p 
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#8A7A6A',
                    fontSize: '12px',
                    letterSpacing: '0.01em',
                    marginTop: '4px',
                  }}
                >
                  Renews monthly. Cancel anytime.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Payment Method Toggle */}
          <motion.div
            className="w-full mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          >
            {/* Wallet Button */}
            <button
              onClick={() => setPaymentMethod('wallet')}
              className="w-full rounded-2xl px-5 py-4 mb-4 transition-all duration-300"
              style={{
                background: paymentMethod === 'wallet' ? '#E8E4DC' : '#F5F1EB',
                boxShadow: paymentMethod === 'wallet' 
                  ? '0 2px 16px rgba(138, 122, 106, 0.12)' 
                  : '0 2px 8px rgba(138, 122, 106, 0.06)',
                border: paymentMethod === 'wallet' ? '1.5px solid #8A7A6A' : '1.5px solid transparent',
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <Smartphone size={18} style={{ color: '#5A4A3A' }} />
                <span 
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#5A4A3A',
                    fontWeight: 400,
                    fontSize: '15px',
                    letterSpacing: '0.01em',
                  }}
                >
                  Pay with Wallet
                </span>
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: 'rgba(138, 122, 106, 0.2)' }} />
              <span 
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#8A7A6A',
                  fontSize: '11px',
                  letterSpacing: '0.02em',
                  opacity: 0.7,
                }}
              >
                Or use a card
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(138, 122, 106, 0.2)' }} />
            </div>
          </motion.div>

          {/* Card Form Panel */}
          <motion.form
            onSubmit={handleSubmit}
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div 
              className="rounded-[28px] p-6 mb-5"
              style={{
                background: '#F5F1EB',
                boxShadow: '0 2px 16px rgba(138, 122, 106, 0.08)',
              }}
            >
              {/* Card Number */}
              <div className="mb-5">
                <label 
                  htmlFor="cardNumber"
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    color: '#8A7A6A',
                    letterSpacing: '0.02em',
                    fontWeight: 400,
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Card number
                </label>
                <div className="relative">
                  <input
                    id="cardNumber"
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-4 py-3 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#8A7A6A]/20"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(138, 122, 106, 0.15)',
                      fontFamily: 'Georgia, serif',
                      fontSize: '15px',
                      color: '#5A4A3A',
                    }}
                  />
                  <CreditCard 
                    size={18} 
                    style={{ 
                      position: 'absolute', 
                      right: '14px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: '#8A7A6A',
                      opacity: 0.5,
                    }} 
                  />
                </div>
              </div>

              {/* Expiration + CVC Row */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label 
                    htmlFor="expiration"
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '12px',
                      color: '#8A7A6A',
                      letterSpacing: '0.02em',
                      fontWeight: 400,
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    Expiration
                  </label>
                  <input
                    id="expiration"
                    type="text"
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value)}
                    placeholder="MM / YY"
                    className="w-full px-4 py-3 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#8A7A6A]/20"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(138, 122, 106, 0.15)',
                      fontFamily: 'Georgia, serif',
                      fontSize: '15px',
                      color: '#5A4A3A',
                    }}
                  />
                </div>
                <div>
                  <label 
                    htmlFor="cvc"
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '12px',
                      color: '#8A7A6A',
                      letterSpacing: '0.02em',
                      fontWeight: 400,
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    CVC
                  </label>
                  <input
                    id="cvc"
                    type="text"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="123"
                    className="w-full px-4 py-3 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#8A7A6A]/20"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(138, 122, 106, 0.15)',
                      fontFamily: 'Georgia, serif',
                      fontSize: '15px',
                      color: '#5A4A3A',
                    }}
                  />
                </div>
              </div>

              {/* Country Selector */}
              <div>
                <label 
                  htmlFor="country"
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    color: '#8A7A6A',
                    letterSpacing: '0.02em',
                    fontWeight: 400,
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Country
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#8A7A6A]/20"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(138, 122, 106, 0.15)',
                    fontFamily: 'Georgia, serif',
                    fontSize: '15px',
                    color: '#5A4A3A',
                  }}
                >
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Canada</option>
                  <option>Australia</option>
                  <option>Germany</option>
                  <option>France</option>
                  <option>Japan</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            {/* Security Note */}
            <motion.p
              className="text-center mb-6 px-4"
              style={{
                fontFamily: 'Georgia, serif',
                color: '#8A7A6A',
                fontSize: '11px',
                lineHeight: '1.6',
                letterSpacing: '0.01em',
                opacity: 0.75,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              Payments are processed securely. TRACE never sees your full card details.
            </motion.p>

            {/* CTA Button */}
            <motion.button
              type="submit"
              className="w-full rounded-full px-8 py-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: '#F5F1EB',
                boxShadow: '0 4px 20px rgba(138, 122, 106, 0.15)',
                border: '1px solid rgba(138, 122, 106, 0.12)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
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
                Start TRACE
              </span>
            </motion.button>
          </motion.form>
        </div>
      </div>
    </div>
  );
}
