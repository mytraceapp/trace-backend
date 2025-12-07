import React, { useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { useUser, planLabels, UserProfile } from "../state/PlanContext";

interface AccountSetupScreenProps {
  onContinue?: () => void;
  onChangePlan?: () => void;
}

export function AccountSetupScreen({
  onContinue,
  onChangePlan,
}: AccountSetupScreenProps) {
  const { selectedPlan, setProfile } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(true);

  const handleContinue = () => {
    const newProfile: UserProfile = {
      name,
      email,
      plan: selectedPlan,
      hasPaid: selectedPlan === 'light',
    };
    setProfile(newProfile);
    onContinue?.();
  };

  const buttonText =
    selectedPlan === "light"
      ? "Start with Light"
      : selectedPlan === "premium"
      ? "Start with Premium"
      : "Start with Studio";

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background:
          "linear-gradient(to bottom, #F5F1EB 0%, #E8E4DC 18%, #D8DCD5 45%, #C5CABE 78%, #B4BFB3 100%)",
      }}
    >
      {/* Subtle grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          mixBlendMode: "overlay",
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
            opacity: 0.9,
            paddingLeft: '1em',
          }}
        >
          TRACE
        </h1>
      </motion.div>

      {/* Scrollable Content Wrapper */}
      <div
        className="relative z-10 flex flex-col h-full overflow-y-auto overflow-x-hidden pb-12"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>
          {`
            div::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>

        {/* Top spacing for TRACE title */}
        <div
          className="flex-shrink-0"
          style={{ height: "13%" }}
        />

        {/* Centered Content Container */}
        <div className="w-full max-w-md mx-auto px-6 flex flex-col">
          {/* Title Section */}
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: [0.22, 0.61, 0.36, 1],
            }}
          >
            <h2
              style={{
                fontFamily: "Georgia, serif",
                color: "#5A4A3A",
                fontWeight: 400,
                fontSize: "22px",
                letterSpacing: "0.01em",
                marginBottom: "8px",
              }}
            >
              Set up your account
            </h2>
            <p
              style={{
                fontFamily: "Georgia, serif",
                color: "#8A7A6A",
                fontWeight: 300,
                fontSize: "14px",
                letterSpacing: "0.01em",
                lineHeight: "1.5",
              }}
            >
              A few details so TRACE can save your progress.
            </p>
          </motion.div>

          {/* Form Card */}
          <motion.div
            className="w-full rounded-[28px] p-6 mb-5"
            style={{
              background: "#F5F1EB",
              boxShadow: "0 2px 16px rgba(138, 122, 106, 0.08)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.4,
              duration: 0.8,
              ease: [0.22, 0.61, 0.36, 1],
            }}
          >
            {/* Name Input */}
            <div className="mb-5">
              <label
                htmlFor="name"
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "12px",
                  color: "#8A7A6A",
                  letterSpacing: "0.02em",
                  fontWeight: 400,
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should TRACE call you?"
                className="w-full px-4 py-3 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#8A7A6A]/20"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(138, 122, 106, 0.15)",
                  fontFamily: "Georgia, serif",
                  fontSize: "15px",
                  color: "#5A4A3A",
                }}
              />
            </div>

            {/* Email Input */}
            <div className="mb-5">
              <label
                htmlFor="email"
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "12px",
                  color: "#8A7A6A",
                  letterSpacing: "0.02em",
                  fontWeight: 400,
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#8A7A6A]/20"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(138, 122, 106, 0.15)",
                  fontFamily: "Georgia, serif",
                  fontSize: "15px",
                  color: "#5A4A3A",
                }}
              />
            </div>

            {/* Password Input */}
            <div className="mb-2">
              <label
                htmlFor="password"
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "12px",
                  color: "#8A7A6A",
                  letterSpacing: "0.02em",
                  fontWeight: 400,
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full px-4 py-3 pr-12 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#8A7A6A]/20"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border:
                      "1px solid rgba(138, 122, 106, 0.15)",
                    fontFamily: "Georgia, serif",
                    fontSize: "15px",
                    color: "#5A4A3A",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#8A7A6A] opacity-50 hover:opacity-80 transition-opacity"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "11px",
                  color: "#8A7A6A",
                  letterSpacing: "0.01em",
                  opacity: 0.6,
                  marginTop: "6px",
                  marginLeft: "4px",
                }}
              >
                At least 8 characters.
              </p>
            </div>

            {/* Stay Signed In Toggle */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#8A7A6A]/10">
              <label
                htmlFor="stay-signed-in"
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "14px",
                  color: "#5A4A3A",
                  letterSpacing: "0.01em",
                  fontWeight: 300,
                }}
              >
                Stay signed in on this device
              </label>
              <button
                id="stay-signed-in"
                type="button"
                onClick={() => setStaySignedIn(!staySignedIn)}
                className="relative w-12 h-7 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: staySignedIn
                    ? "#8A7A6A"
                    : "rgba(138, 122, 106, 0.25)",
                }}
              >
                <motion.div
                  className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                  animate={{
                    left: staySignedIn ? "26px" : "4px",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              </button>
            </div>
          </motion.div>

          {/* Plan Summary Card */}
          <motion.div
            className="w-full rounded-[28px] p-5 mb-6"
            style={{
              background: "#F5F1EB",
              boxShadow: "0 2px 16px rgba(138, 122, 106, 0.08)",
              marginTop: "-12px",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.5,
              duration: 0.8,
              ease: [0.22, 0.61, 0.36, 1],
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: "11px",
                    color: "#8A7A6A",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    opacity: 0.6,
                    marginBottom: "6px",
                  }}
                >
                  Your plan
                </p>
                <p
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: "16px",
                    color: "#5A4A3A",
                    fontWeight: 400,
                    letterSpacing: "0.01em",
                  }}
                >
                  {planLabels[selectedPlan].label}
                </p>
              </div>
              <button
                onClick={onChangePlan}
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "13px",
                  color: "#8A7A6A",
                  letterSpacing: "0.01em",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
                className="hover:opacity-70 transition-opacity"
              >
                Change plan
              </button>
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.button
            onClick={handleContinue}
            className="w-full py-4 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-[1.01] mb-6"
            style={{
              background: "rgba(138, 122, 106, 0.12)",
              color: "#5A4A3A",
              fontFamily: "Georgia, serif",
              fontSize: "15px",
              fontWeight: 400,
              letterSpacing: "0.03em",
              boxShadow: "0 2px 12px rgba(138, 122, 106, 0.1)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.6,
              duration: 0.8,
              ease: [0.22, 0.61, 0.36, 1],
            }}
          >
            {buttonText}
          </motion.button>

          {/* Footer Text */}
          <motion.p
            className="text-center px-6 mb-6"
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "11px",
              color: "#8A7A6A",
              letterSpacing: "0.01em",
              lineHeight: "1.6",
              opacity: 0.5,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            By continuing, you agree to TRACE's Terms and
            Privacy Policy.
          </motion.p>
        </div>
      </div>
    </div>
  );
}