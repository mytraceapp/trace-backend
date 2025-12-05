import React from 'react';
import { motion } from 'motion/react';
import { Mic, Send } from 'lucide-react';
import { TypingTone } from './TypingTone';
import { BottomNav } from './BottomNav';
import { useTheme } from '../state/ThemeContext';
import { 
  sendMessageToTrace, 
  getTraceGreeting, 
  detectActivitySuggestion, 
  detectUserAgreement, 
  getLastSuggestedActivity,
  clearLastSuggestedActivity,
  ActivityType 
} from '../services/traceAI';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

interface ChatScreenProps {
  onNavigateToActivities?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToPatterns?: () => void;
  onNavigateToHelp?: () => void;
  onNavigateToJournal?: () => void;
  onNavigateToBreathing?: () => void;
  onNavigateToGrounding?: () => void;
  onNavigateToWalking?: () => void;
  onNavigateToMaze?: () => void;
  onNavigateToPowerNap?: () => void;
  onNavigateToPearlRipple?: () => void;
  shouldStartGreeting?: boolean;
}

export function ChatScreen({
  onNavigateToActivities,
  onNavigateToProfile,
  onNavigateToPatterns: _onNavigateToPatterns,
  onNavigateToHelp,
  onNavigateToJournal,
  onNavigateToBreathing,
  onNavigateToGrounding,
  onNavigateToWalking,
  onNavigateToMaze,
  onNavigateToPowerNap,
  onNavigateToPearlRipple,
  shouldStartGreeting = true,
}: ChatScreenProps = {}) {
  void _onNavigateToPatterns;
  const { theme } = useTheme();
  const [message, setMessage] = React.useState('');
  const [hasResponded, setHasResponded] = React.useState(false);
  const [_userMessage, setUserMessage] = React.useState('');
  void _userMessage;
  const [showTypewriter, setShowTypewriter] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Typewriter effect with dynamic greeting - refreshes each visit
  const [greetingText, setGreetingText] = React.useState(() => getTraceGreeting());
  const [displayedText, setDisplayedText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Chat UI starts fresh each visit - TRACE's memory is kept in localStorage separately
  // This means the visible chat clears when leaving, but TRACE remembers context
  React.useEffect(() => {
    // Always start with fresh UI - get a new greeting each time
    if (shouldStartGreeting) {
      setGreetingText(getTraceGreeting());
      setDisplayedText('');
      setCurrentIndex(0);
      setMessages([]);
      setHasResponded(false);
      
      const startDelay = setTimeout(() => {
        setShowTypewriter(true);
      }, 1500);

      return () => clearTimeout(startDelay);
    }
  }, [shouldStartGreeting]);

  React.useEffect(() => {
    if (showTypewriter && currentIndex < greetingText.length && !hasResponded) {
      let delay = 100; // Base speed - faster (was 140)
      
      const char = greetingText[currentIndex];
      const prevChar = currentIndex > 0 ? greetingText[currentIndex - 1] : '';
      
      // Special pauses for punctuation and spaces
      if (char === '…') {
        delay = 650; // Reduced from 900
      } else if (char === '?' || char === '.') {
        delay = 400; // Reduced from 550
      } else if (char === ' ') {
        // Variable word breaks - sometimes quick, sometimes thoughtful
        const rand = Math.random();
        if (rand < 0.2) {
          delay = 80; // Reduced from 120
        } else if (rand < 0.6) {
          delay = 140 + Math.random() * 70; // Reduced range
        } else {
          delay = 220 + Math.random() * 120; // Reduced range
        }
      } else {
        // Natural human typing rhythm - not mechanical
        const rand = Math.random();
        
        // After space = start of new word, sometimes faster
        if (prevChar === ' ' && rand < 0.4) {
          delay = 60 + Math.random() * 30; // Faster
        }
        // Occasional micro-hesitation (like rethinking)
        else if (rand < 0.08) {
          delay = 300 + Math.random() * 180; // Reduced
        }
        // Quick burst typing (familiar letters)
        else if (rand < 0.35) {
          delay = 65 + Math.random() * 35; // Faster
        }
        // Thoughtful, careful typing
        else if (rand > 0.75) {
          delay = 160 + Math.random() * 90; // Reduced
        }
        // Normal human variation
        else {
          delay = 85 + Math.random() * 60; // Faster
        }
      }

      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + greetingText[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [showTypewriter, currentIndex, greetingText, hasResponded]);

  const [isThinking, setIsThinking] = React.useState(false);
  const [_pendingActivity, setPendingActivity] = React.useState<ActivityType>(null);
  void _pendingActivity;

  // Navigate to a specific activity
  const navigateToActivity = React.useCallback((activity: ActivityType) => {
    if (!activity) return;
    
    clearLastSuggestedActivity();
    setPendingActivity(null);
    
    switch (activity) {
      case 'breathing':
        onNavigateToBreathing?.();
        break;
      case 'grounding':
        onNavigateToGrounding?.();
        break;
      case 'walking':
        onNavigateToWalking?.();
        break;
      case 'maze':
        onNavigateToMaze?.();
        break;
      case 'powernap':
        onNavigateToPowerNap?.();
        break;
      case 'pearlripple':
        onNavigateToPearlRipple?.();
        break;
    }
  }, [onNavigateToBreathing, onNavigateToGrounding, onNavigateToWalking, onNavigateToMaze, onNavigateToPowerNap, onNavigateToPearlRipple]);

  const handleSend = async () => {
    if (message.trim() && !isThinking) {
      const userMsg = message.trim();
      
      // Check if user is agreeing to a previously suggested activity
      const lastActivity = getLastSuggestedActivity();
      if (lastActivity && detectUserAgreement(userMsg)) {
        // Add a brief confirmation message before navigating
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: userMsg,
          sender: 'user'
        }]);
        
        setHasResponded(true);
        setMessage('');
        
        // Show TRACE's gentle transition message
        const transitionMessages: Record<string, string> = {
          breathing: "Let's breathe together… I'll be right here with you.",
          grounding: "Let's ground ourselves… I'll guide you through it.",
          walking: "Let's take a gentle walk… one step at a time.",
          maze: "Let's trace the maze together… nice and slow.",
          powernap: "Rest now… I'll be here when you wake.",
          pearlripple: "Let's listen to the waves… just breathe.",
        };
        
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: transitionMessages[lastActivity] || "Let's do this together…",
          sender: 'ai'
        }]);
        
        // Navigate after a brief pause
        setTimeout(() => {
          navigateToActivity(lastActivity);
        }, 1500);
        
        return;
      }
      
      // Add user message
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: userMsg,
        sender: 'user'
      }]);
      
      setUserMessage(userMsg);
      setHasResponded(true);
      setMessage('');
      setIsThinking(true);
      
      try {
        // Get real response from TRACE AI
        const response = await sendMessageToTrace(userMsg);
        
        // Check if TRACE suggested an activity
        const suggestedActivity = detectActivitySuggestion(response);
        if (suggestedActivity) {
          setPendingActivity(suggestedActivity);
        }
        
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: response,
          sender: 'ai'
        }]);
      } catch (error) {
        console.error('Error getting TRACE response:', error);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: "I'm here with you… let me gather my thoughts for a moment.",
          sender: 'ai'
        }]);
      } finally {
        setIsThinking(false);
      }
    }
  };
  
  // Auto-scroll to bottom when messages update
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Generate liquid light swirls with sage, pearl, and pale aqua (same as Home)
  const generateLiquidSwirls = () => {
    const swirls = [];
    const centerX = 160;
    const centerY = 160;
    
    const colors = [
      { r: 255, g: 255, b: 255, name: 'white' },
      { r: 248, g: 252, b: 250, name: 'pearl' },
      { r: 230, g: 240, b: 235, name: 'sage-light' },
      { r: 210, g: 235, b: 230, name: 'aqua' },
      { r: 240, g: 248, b: 245, name: 'mist' },
      { r: 200, g: 218, b: 215, name: 'sage' },
    ];
    
    for (let i = 0; i < 35; i++) { // Reduced from 60 to 35 for better performance
      const angle = (i * 137.5) % 360;
      const radius = 20 + (i % 18) * 7;
      const sweep = 120 + (i % 12) * 25;
      
      const startAngle = angle + (i % 10) * 4;
      const endAngle = startAngle + sweep;
      const midAngle = startAngle + sweep / 2;
      
      const x1 = centerX + Math.cos((startAngle * Math.PI) / 180) * radius;
      const y1 = centerY + Math.sin((startAngle * Math.PI) / 180) * radius;
      
      const curvature = radius * 1.2 + (i % 6) * 4;
      const x2 = centerX + Math.cos((midAngle * Math.PI) / 180) * curvature;
      const y2 = centerY + Math.sin((midAngle * Math.PI) / 180) * curvature;
      
      const x3 = centerX + Math.cos((endAngle * Math.PI) / 180) * radius;
      const y3 = centerY + Math.sin((endAngle * Math.PI) / 180) * radius;
      
      const pathD = `M ${x1} ${y1} Q ${x2} ${y2}, ${x3} ${y3}`;
      
      const colorIndex = i % colors.length;
      const color = colors[colorIndex];
      const opacity = 0.18 + (i % 10) * 0.02;
      
      const strokeWidth = 5 + (i % 10) * 3;
      const blur = 3 + (i % 5) * 1.5;
      const duration = 45 + (i % 35);
      const direction = i % 2 === 0 ? [0, 360] : [360, 0];
      const delay = (i % 20) * 0.15;
      
      swirls.push(
        <motion.svg
          key={`swirl-${i}`}
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 320 320"
          style={{ zIndex: 1 }}
          animate={{
            rotate: direction,
            opacity: [opacity * 0.6, opacity, opacity * 0.6],
          }}
          transition={{
            rotate: { duration, repeat: Infinity, ease: "linear" },
            opacity: { duration: 7 + (i % 4), repeat: Infinity, ease: "easeInOut", delay },
          }}
        >
          <path
            d={pathD}
            fill="none"
            stroke={`rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ filter: `blur(${blur}px)` }}
          />
        </motion.svg>
      );
    }
    
    return swirls;
  };

  // Generate smoke particles (same as Home)
  const generateSmokeParticles = () => {
    const particles = [];
    
    for (let i = 0; i < 6; i++) { // Reduced from 12 to 6 for better performance
      const angle = (i * 60) % 360; // Adjusted spacing
      const delay = i * 0.5;
      const duration = 8 + (i % 4) * 2;
      
      particles.push(
        <motion.div
          key={`smoke-${i}`}
          className="absolute w-[80px] h-[80px] rounded-full"
          style={{
            left: '50%',
            top: '50%',
            marginLeft: '-40px',
            marginTop: '-40px',
            background: `radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(240,248,245,0.08) 40%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
          animate={{
            x: Math.cos((angle * Math.PI) / 180) * 100,
            y: Math.sin((angle * Math.PI) / 180) * 100,
            scale: [0.5, 1.5, 0.5],
            opacity: [0, 0.4, 0],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay,
          }}
        />
      );
    }
    
    return particles;
  };

  const isDark = theme === 'night';

  return (
    <div 
      className="relative w-full h-full flex flex-col transition-colors duration-300"
      style={{ 
        background: isDark 
          ? 'transparent' 
          : 'linear-gradient(180deg, #9AB09C 0%, #8DA18F 25%, #7A9180 50%, #8DA18F 75%, #9AB09C 100%)',
      }}
    >
      
      {/* Typing sound - plays while typewriter is active */}
      <TypingTone 
        playing={showTypewriter && currentIndex < greetingText.length && !hasResponded} 
        currentChar={greetingText[currentIndex - 1]}
      />
      
      {/* TRACE Brand Name at top */}
      <motion.div
        className="absolute z-10 w-full text-center"
        style={{ top: '7%' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 1.5, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <h1 style={{ 
          fontFamily: 'ALORE, Georgia, serif',
          color: isDark ? 'var(--text-primary)' : '#EDE8DB',
          fontWeight: 300,
          letterSpacing: '1em',
          fontSize: '11px',
          textShadow: isDark 
            ? '0 0 15px var(--orb-glow), 0 2px 5px rgba(0,0,0,0.3)' 
            : '0 2px 5px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.3)',
          opacity: 0.95,
        }}>
          TRACE
        </h1>
      </motion.div>

      {/* Centered Orb - right below TRACE title, perfectly centered */}
      <div className="absolute w-full" style={{ top: '13%' }}>
        <motion.div
          className="w-[200px] h-[200px] mx-auto"
          style={{ 
            position: 'relative',
          }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          // Breathing-like states - slow, intuitive, steady
          opacity: isThinking ? [0.88, 1, 0.88] : // Thinking - gentle dimming as it processes
                   message.length > 0 ? [0.92, 1, 0.92] : // User typing - attentive
                   showTypewriter && currentIndex < greetingText.length ? [0.9, 0.98, 0.9] : // Speaking - gentle
                   [0.94, 1, 0.94], // Idle - barely perceptible breathing
          
          scale: isThinking ? [1, 1.06, 1] : // Thinking - slow, deep breath expansion
                 message.length > 0 ? [1, 1.04, 1] : // User typing - slightly more present
                 showTypewriter && currentIndex < greetingText.length ? [1, 1.03, 1] : // Speaking - gentle pulse
                 [1, 1.02, 1], // Idle - very subtle breathing
          
          // Movement - gentle, floating, never jarring
          x: isThinking ? [0, -6, 0, 6, 0] : // Thinking - gentle contemplative sway
             message.length > 0 ? [0, -4, 0, 4, 0] : // User typing - slight lean in
             showTypewriter && currentIndex < greetingText.length ? [0, -3, 0, 3, 0] : // Speaking
             [0, -2, 0, 2, 0], // Idle - almost still, peaceful
          
          y: isThinking ? [0, -4, 0, 4, 0] : // Thinking - gentle rise and fall
             message.length > 0 ? [0, -3, 0, 3, 0] : // User typing
             showTypewriter && currentIndex < greetingText.length ? [0, -2, 0, 2, 0] : // Speaking
             [0, -1, 0, 1, 0], // Idle - barely floating
          
          // Very subtle rotation - like a slow exhale
          rotate: isThinking ? [0, 2, 0, -2, 0] : // Thinking - slight turn
                  message.length > 0 ? [0, 1.5, 0, -1.5, 0] : // User typing
                  showTypewriter && currentIndex < greetingText.length ? [0, 1, 0, -1, 0] : // Speaking
                  [0, 0.5, 0, -0.5, 0], // Idle - nearly still
        }}
        transition={{ 
          opacity: { 
            duration: isThinking ? 3 : message.length > 0 ? 3.5 : showTypewriter && currentIndex < greetingText.length ? 4 : 6, 
            repeat: Infinity, 
            ease: [0.45, 0.05, 0.55, 0.95] // Smooth breath-like easing
          },
          scale: { 
            duration: isThinking ? 3.5 : message.length > 0 ? 4 : showTypewriter && currentIndex < greetingText.length ? 5 : 7, 
            repeat: Infinity, 
            ease: [0.45, 0.05, 0.55, 0.95]
          },
          x: { 
            duration: isThinking ? 6 : message.length > 0 ? 7 : showTypewriter && currentIndex < greetingText.length ? 8 : 10, 
            repeat: Infinity, 
            ease: [0.45, 0.05, 0.55, 0.95]
          },
          y: { 
            duration: isThinking ? 7 : message.length > 0 ? 8 : showTypewriter && currentIndex < greetingText.length ? 9 : 12, 
            repeat: Infinity, 
            ease: [0.45, 0.05, 0.55, 0.95]
          },
          rotate: {
            duration: isThinking ? 8 : message.length > 0 ? 10 : showTypewriter && currentIndex < greetingText.length ? 12 : 15,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95]
          }
        }}
      >
        {/* Outer breathing glow - slow, steady like a deep breath */}
        <motion.div
          className="absolute inset-[-60px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(230,240,235,0.12) 25%, rgba(210,235,230,0.08) 40%, transparent 65%)',
            filter: 'blur(40px)',
          }}
          animate={{
            scale: isThinking ? [0.9, 1.2, 0.9] : // Thinking - deeper breath
                   message.length > 0 ? [0.92, 1.15, 0.92] : // User typing - attentive
                   showTypewriter && currentIndex < greetingText.length ? [0.95, 1.1, 0.95] : // Speaking - gentle
                   [0.97, 1.06, 0.97], // Idle - slow, calm breathing
            
            opacity: isThinking ? [0.3, 0.55, 0.3] : // Thinking - gentle glow
                     message.length > 0 ? [0.25, 0.5, 0.25] : // User typing
                     showTypewriter && currentIndex < greetingText.length ? [0.28, 0.45, 0.28] : // Speaking
                     [0.3, 0.42, 0.3], // Idle - soft, steady
          }}
          transition={{
            duration: isThinking ? 3 : message.length > 0 ? 3.5 : showTypewriter && currentIndex < greetingText.length ? 4 : 6,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95], // Smooth breath-like easing
          }}
        />

        {/* Inner breathing halo - subtle dimming and glowing */}
        <motion.div
          className="absolute inset-[-80px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(210,235,230,0.15) 0%, rgba(200,218,215,0.08) 30%, transparent 55%)',
            filter: 'blur(50px)',
          }}
          animate={{
            scale: isThinking ? [0.95, 1.18, 0.95] : // Thinking - contemplative expansion
                   message.length > 0 ? [0.97, 1.12, 0.97] : // User typing
                   showTypewriter && currentIndex < greetingText.length ? [0.98, 1.08, 0.98] : // Speaking
                   [1, 1.05, 1], // Idle - barely perceptible breath
            
            opacity: isThinking ? [0.15, 0.4, 0.15] : // Thinking - soft glow
                     message.length > 0 ? [0.12, 0.35, 0.12] : // User typing
                     showTypewriter && currentIndex < greetingText.length ? [0.14, 0.32, 0.14] : // Speaking
                     [0.18, 0.28, 0.18], // Idle - gentle presence
          }}
          transition={{
            duration: isThinking ? 3.5 : message.length > 0 ? 4 : showTypewriter && currentIndex < greetingText.length ? 5 : 7,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95], // Smooth breath-like easing
          }}
        />

        {/* Main orb body - translucent */}
        <div className="absolute inset-0 rounded-full overflow-hidden" style={{
          background: 'radial-gradient(circle at 45% 35%, rgba(255,255,255,0.35) 0%, rgba(245,250,245,0.3) 20%, rgba(230,240,235,0.25) 40%, rgba(210,230,225,0.2) 60%, rgba(195,220,215,0.15) 80%, transparent 100%)',
          boxShadow: '0 10px 40px rgba(236,230,216,0.2)',
        }}>
          {/* Liquid light swirls inside */}
          {generateLiquidSwirls()}

          {/* White smoke diffusion spreading outward */}
          <div className="absolute inset-0">
            {generateSmokeParticles()}
          </div>

          {/* Soft inner core glow - the heart of TRACE, breathes with calm presence */}
          <motion.div
            className="absolute inset-[18%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(248,252,250,0.25) 35%, rgba(240,248,245,0.15) 60%, transparent 80%)',
              filter: 'blur(25px)',
            }}
            animate={{
              scale: isThinking ? [0.8, 1.25, 0.8] : // Thinking - deep, contemplative pulse
                     message.length > 0 ? [0.85, 1.18, 0.85] : // User typing - attentive
                     showTypewriter && currentIndex < greetingText.length ? [0.88, 1.12, 0.88] : // Speaking - gentle
                     [0.92, 1.08, 0.92], // Idle - slow, steady heartbeat
              
              opacity: isThinking ? [0.3, 0.6, 0.3] : // Thinking - soft glow intensifying
                       message.length > 0 ? [0.28, 0.52, 0.28] : // User typing
                       showTypewriter && currentIndex < greetingText.length ? [0.3, 0.48, 0.3] : // Speaking
                       [0.32, 0.45, 0.32], // Idle - warm, steady presence
            }}
            transition={{
              duration: isThinking ? 2.5 : message.length > 0 ? 3 : showTypewriter && currentIndex < greetingText.length ? 4 : 6,
              repeat: Infinity,
              ease: [0.45, 0.05, 0.55, 0.95], // Smooth breath-like easing
            }}
          />

          {/* Pearlescent highlight - soft shimmer that breathes with TRACE */}
          <motion.div
            className="absolute top-[20%] left-[32%] w-[90px] h-[90px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(248,252,250,0.3) 45%, rgba(230,240,235,0.15) 70%, transparent 85%)',
              filter: 'blur(18px)',
            }}
            animate={{
              opacity: isThinking ? [0.35, 0.65, 0.35] : // Thinking - soft glow
                       message.length > 0 ? [0.38, 0.6, 0.38] : // User typing
                       showTypewriter && currentIndex < greetingText.length ? [0.4, 0.58, 0.4] : // Speaking
                       [0.45, 0.55, 0.45], // Idle - subtle shimmer
              
              scale: isThinking ? [0.9, 1.1, 0.9] : // Thinking - gentle pulse
                     message.length > 0 ? [0.92, 1.08, 0.92] : // User typing
                     showTypewriter && currentIndex < greetingText.length ? [0.94, 1.06, 0.94] : // Speaking
                     [0.96, 1.04, 0.96], // Idle - barely breathing
            }}
            transition={{
              duration: isThinking ? 3 : message.length > 0 ? 4 : showTypewriter && currentIndex < greetingText.length ? 5 : 7,
              repeat: Infinity,
              ease: [0.45, 0.05, 0.55, 0.95],
            }}
          />

          {/* Pale aqua accent - gentle secondary glow */}
          <motion.div
            className="absolute bottom-[30%] right-[28%] w-[70px] h-[70px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(210,235,230,0.4) 0%, rgba(200,218,215,0.2) 55%, transparent 80%)',
              filter: 'blur(15px)',
            }}
            animate={{
              opacity: isThinking ? [0.3, 0.5, 0.3] : // Thinking - soft
                       message.length > 0 ? [0.32, 0.48, 0.32] : // User typing
                       showTypewriter && currentIndex < greetingText.length ? [0.35, 0.45, 0.35] : // Speaking
                       [0.38, 0.42, 0.38], // Idle - barely visible pulse
              
              scale: isThinking ? [0.92, 1.08, 0.92] : // Thinking
                     message.length > 0 ? [0.94, 1.06, 0.94] : // User typing
                     showTypewriter && currentIndex < greetingText.length ? [0.96, 1.04, 0.96] : // Speaking
                     [0.98, 1.02, 0.98], // Idle - subtle
            }}
            transition={{
              duration: isThinking ? 4 : message.length > 0 ? 5 : showTypewriter && currentIndex < greetingText.length ? 6 : 8,
              repeat: Infinity,
              ease: [0.45, 0.05, 0.55, 0.95],
            }}
          />
        </div>

        {/* Slow breathing pulse animation - the main breath */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            scale: isThinking ? [1, 1.02, 1] : [1, 1.01, 1],
          }}
          transition={{
            duration: isThinking ? 4 : 6,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95], // Natural breath curve
          }}
          style={{ pointerEvents: 'none' }}
        />
        </motion.div>
      </div>

      {/* Typewriter Greeting Text - shown initially, hides when user responds */}
      {!hasResponded && (
        <motion.div
          className="absolute z-20 w-full px-6 text-center"
          style={{ top: '41.3%' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <p 
            className="text-[#EDE8DB]"
            style={{
              fontFamily: 'Georgia, serif',
              fontWeight: 400,
              letterSpacing: '0.03em',
              opacity: 0.92,
              minHeight: '24px',
            }}
          >
            {displayedText}
            {currentIndex < greetingText.length && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                |
              </motion.span>
            )}
          </p>
        </motion.div>
      )}

      {/* Chat Messages Area - shown after user responds */}
      {hasResponded && messages.length > 0 && (
        <div 
          className="absolute z-20 w-full"
          style={{ 
            top: '45%',
            bottom: '22%',
          }}
        >
          {/* Gradient fade at top - messages disappear before hitting orb */}
          <div 
            className="absolute top-0 left-0 right-0 z-30 pointer-events-none"
            style={{
              height: '100px',
              background: isDark 
                ? 'linear-gradient(to bottom, transparent 0%, transparent 100%)'
                : 'linear-gradient(to bottom, rgba(154, 176, 156, 1) 0%, rgba(154, 176, 156, 0.95) 20%, rgba(154, 176, 156, 0.7) 45%, rgba(154, 176, 156, 0.4) 65%, rgba(154, 176, 156, 0.2) 80%, rgba(154, 176, 156, 0.08) 92%, transparent 100%)',
            }}
          />
          
          {/* Scrollable messages container */}
          <div 
            className="h-full overflow-y-auto px-6 pb-4"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <style>
              {`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}
            </style>
            
            <div className="space-y-4 min-h-full flex flex-col justify-end">
              {messages.map((msg, index) => {
                const totalMessages = messages.length;
                const positionFromEnd = totalMessages - 1 - index;
                const messageOpacity = positionFromEnd >= 5 
                  ? 0 
                  : positionFromEnd >= 4 
                    ? 0.15
                    : positionFromEnd >= 3 
                      ? 0.4
                      : positionFromEnd >= 2 
                        ? 0.65
                        : positionFromEnd >= 1 
                          ? 0.85
                          : 1;
                
                return (
                  <motion.div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20 }}
                    animate={{ opacity: Math.min(1, messageOpacity), x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                  >
                    <div 
                      className={`max-w-[75%] px-5 py-4 rounded-3xl ${
                        msg.sender === 'user' ? 'rounded-tr-md' : 'rounded-tl-md'
                      }`}
                      style={{
                        background: msg.sender === 'user' 
                          ? '#EDE8DB' 
                          : 'rgba(237, 232, 219, 0.15)',
                        boxShadow: msg.sender === 'user'
                          ? '0 2px 8px rgba(0, 0, 0, 0.1)'
                          : '0 2px 8px rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      <p 
                        className={msg.sender === 'user' ? 'text-[#6B7A6E]' : 'text-[#EDE8DB]'}
                        style={{
                          fontSize: '14px',
                          lineHeight: '1.5',
                          letterSpacing: '0.01em',
                          opacity: 0.9,
                        }}
                      >
                        {msg.text}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              
              {/* Invisible div for auto-scroll */}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Input Bar - positioned at bottom with more spacing */}
      <motion.div
        className="absolute left-0 right-0 z-30 px-6"
        style={{ bottom: hasResponded ? '130px' : '100px' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          bottom: hasResponded ? '130px' : '100px'
        }}
        transition={{ 
          opacity: { delay: 1, duration: 1 },
          y: { delay: 1, duration: 1 },
          bottom: { duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }
        }}
      >
        <div 
          className="flex items-center gap-3 px-5 py-4 rounded-full transition-colors duration-300"
          style={{
            background: 'var(--input-bg)',
            boxShadow: `0 4px 20px var(--shadow)`,
          }}
        >
          <input
            type="text"
            placeholder="Type anything… or tap the mic"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-transparent outline-none transition-colors duration-300"
            style={{
              fontSize: '14px',
              letterSpacing: '0.01em',
              color: 'var(--text-primary)',
            }}
          />
          <button className="p-2 hover:opacity-70 transition-opacity">
            <Mic size={20} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
          </button>
          <button 
            onClick={handleSend}
            className="p-2 hover:opacity-70 transition-opacity"
          >
            <Send size={20} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
          </button>
        </div>
      </motion.div>

      {/* Bottom Menu Bar - shown after user responds */}
      {hasResponded && (
        <div className="absolute bottom-0 left-0 right-0 z-30">
          <BottomNav 
            activeScreen="chat"
            variant="sage"
            onNavigateHome={() => {}}
            onNavigateActivities={onNavigateToActivities}
            onNavigateJournal={onNavigateToJournal}
            onNavigateProfile={onNavigateToProfile}
            onNavigateHelp={onNavigateToHelp}
          />
        </div>
      )}

    </div>
  );
}