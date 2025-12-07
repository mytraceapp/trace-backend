import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Send } from 'lucide-react';
import { TypingTone } from './TypingTone';
import { BottomNav } from './BottomNav';
import { useTheme } from '../state/ThemeContext';
import { useAuth } from '../state/AuthContext';
import { 
  sendMessageToTrace, 
  getTraceGreeting,
  getAIGreeting, 
  detectUserAgreement, 
  getLastSuggestedActivity,
  clearLastSuggestedActivity,
  ActivityType 
} from '../services/traceAI';
import { getCurrentUserId, saveTraceMessage, loadRecentTraceMessages, getTodayStitch, getLastHourSummary } from '../lib/messageService';

const TRACE_SUPPORT_PROMPTS = [
  "Things feel a bit intense right now. If you want, we can slow down and journal a little together.",
  "I'm here with you. Would a short grounding moment or a few written thoughts help right now?",
  "It's okay if this feels like a lot. We can unpack it gently, one step at a time, if you'd like.",
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  emotion?: string | null;
  intensity?: number | null;
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
  onNavigateToRest?: () => void;
  onNavigateToWindow?: () => void;
  onNavigateToEcho?: () => void;
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
  onNavigateToRest,
  onNavigateToWindow,
  onNavigateToEcho,
  shouldStartGreeting = true,
}: ChatScreenProps = {}) {
  void _onNavigateToPatterns;
  const { theme } = useTheme();
  const { currentProfile } = useAuth();
  const [message, setMessage] = React.useState('');
  const [hasResponded, setHasResponded] = React.useState(false);
  const [hasOfferedSupportThisSession, setHasOfferedSupportThisSession] = React.useState(false);
  const [hasShownRecallThisSession, setHasShownRecallThisSession] = React.useState(false);
  const [lastHourSummary, setLastHourSummary] = React.useState<{
    total: number;
    calm: number;
    flat: number;
    heavy: number;
    anxious: number;
    avgIntensity: number;
    arc: 'softening' | 'rising' | 'steady' | null;
  } | null>(null);
  const [hasOfferedRecallThisSession, setHasOfferedRecallThisSession] = React.useState(false);
  const [_userMessage, setUserMessage] = React.useState('');
  void _userMessage;
  const [showTypewriter, setShowTypewriter] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  

  const userName = currentProfile?.name || null;

  
  // Crossfade transition state for smooth activity navigation
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const pendingNavigationRef = React.useRef<(() => void) | null>(null);
  
  const [greetingText, setGreetingText] = React.useState('');
  const [displayedText, setDisplayedText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isLoadingGreeting, setIsLoadingGreeting] = React.useState(true);
  void isLoadingGreeting; // Used for future loading indicator
  
  // Privacy mode - activated by shaking device
  const [privacyMode, setPrivacyMode] = React.useState(false);
  const lastShakeRef = React.useRef(0);
  const shakeThreshold = 15; // Acceleration threshold for shake detection
  
  // Shake detection for emergency privacy
  React.useEffect(() => {
    let lastX = 0, lastY = 0, lastZ = 0;
    let lastUpdate = 0;
    
    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;
      
      const currentTime = Date.now();
      const timeDiff = currentTime - lastUpdate;
      
      if (timeDiff > 100) {
        const diffTime = currentTime - lastUpdate;
        lastUpdate = currentTime;
        
        const x = acc.x;
        const y = acc.y;
        const z = acc.z;
        
        const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;
        
        if (speed > shakeThreshold) {
          // Prevent rapid toggling
          if (currentTime - lastShakeRef.current > 1000) {
            lastShakeRef.current = currentTime;
            setPrivacyMode(prev => !prev);
          }
        }
        
        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };
    
    // Request permission on iOS 13+
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      // Will need user gesture to request permission
    } else {
      window.addEventListener('devicemotion', handleMotion);
    }
    
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, []);
  
  // Fetch AI-generated greeting when chat starts
  const fetchAIGreeting = React.useCallback(async () => {
    setIsLoadingGreeting(true);
    try {
      const greeting = await getAIGreeting(userName);
      setGreetingText(greeting);
    } catch (error) {
      console.error('Failed to fetch AI greeting:', error);
      // Fallback to static greeting
      setGreetingText(userName ? `Hi ${userName}. I'm here.` : getTraceGreeting());
    } finally {
      setIsLoadingGreeting(false);
    }
  }, [userName]);

  // Load messages from Supabase (1-hour recall) on mount - silent failure
  const hasLoadedRef = React.useRef(false);
  
  React.useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    const loadHistory = async () => {
      try {
        await loadRecentTraceMessages((loadedMessages) => {
          if (loadedMessages.length > 0) {
            // Resume conversation with recalled messages
            setMessages(loadedMessages);
            setHasResponded(true);
            setShowTypewriter(false);
            setIsLoadingGreeting(false);
          } else {
            // No recent messages - start fresh with greeting
            startFreshGreeting();
          }
        });
      } catch {
        // Silent failure - TRACE simply forgets and starts fresh
        startFreshGreeting();
      }
    };
    
    const startFreshGreeting = () => {
      if (shouldStartGreeting) {
        setDisplayedText('');
        setCurrentIndex(0);
        setMessages([]);
        setHasResponded(false);
        
        // Fetch AI greeting then start typewriter
        fetchAIGreeting().then(() => {
          setTimeout(() => {
            setShowTypewriter(true);
          }, 500);
        });
      }
    };
    
    loadHistory();
  }, [fetchAIGreeting, shouldStartGreeting]);

  // Emotional recall - gently check in if earlier today was heavy
  React.useEffect(() => {
    if (hasShownRecallThisSession) return;

    let cancelled = false;

    async function maybeShowRecall() {
      try {
        const userId = await getCurrentUserId();
        if (!userId || cancelled) return;

        const stitch = await getTodayStitch(userId);
        if (!stitch || cancelled) return;

        if (stitch.total < 3) return;

        const total = stitch.total;
        const heavyCount = stitch.heavy ?? 0;
        const anxiousCount = stitch.anxious ?? 0;
        const heavyishRatio = total > 0 ? (heavyCount + anxiousCount) / total : 0;
        const avgIntensity = stitch.avg_intensity ?? 0;
        const arc = stitch.arc ?? null;

        const isNotable =
          heavyishRatio >= 0.4 ||
          avgIntensity >= 3 ||
          arc === "rising";

        if (!isNotable || cancelled) return;

        let recallText: string;
        if (heavyishRatio >= 0.4 && avgIntensity >= 3) {
          recallText = "Earlier today felt pretty heavy. Is any of that still with you right now?";
        } else if (arc === "rising") {
          recallText = "Earlier today your emotions felt like they were ramping up a bit. How are you feeling coming back in?";
        } else {
          recallText = "I remember you checked in earlier today. How is your heart doing right now?";
        }

        const recallMessage: Message = {
          id: `recall-${Date.now()}`,
          role: "assistant",
          content: recallText,
          createdAt: new Date().toISOString(),
          emotion: "calm",
          intensity: 1,
        };

        setMessages((prev) => [...prev, recallMessage]);
        setHasShownRecallThisSession(true);

        // Also save to Supabase
        saveTraceMessage(userId, "assistant", recallText);
      } catch (err) {
        console.error("TRACE/recallEffect ❌", err);
      }
    }

    // Small delay to let history load first
    const timer = setTimeout(maybeShowRecall, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasShownRecallThisSession]);

  // Fetch last hour summary for emotional recall feature
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId || cancelled) return;

        const summary = await getLastHourSummary(userId);
        if (!cancelled) {
          setLastHourSummary(summary);
        }
      } catch (err) {
        console.error('TRACE emotional recall: failed to load summary', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Suppress unused warnings for now - will be used in future recall logic
  void lastHourSummary;
  void hasOfferedRecallThisSession;
  void setHasOfferedRecallThisSession;

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
  
  // Emotional state for orb responsiveness
  type OrbEmotion = 'idle' | 'listening' | 'thinking' | 'speaking' | 'surprised' | 'empathetic' | 'joyful' | 'calm';
  const [orbEmotion, setOrbEmotion] = React.useState<OrbEmotion>('idle');
  
  // Map activity names from AI response to internal activity types
  const mapActivityName = (name: string): ActivityType => {
    const mapping: Record<string, ActivityType> = {
      'Breathing': 'breathing',
      'Trace the Maze': 'maze',
      'Walking Reset': 'walking',
      'Rest': 'rest',
      'Window': 'window',
      'Echo': 'echo',
    };
    return mapping[name] || null;
  };
  
  // Detect emotion from AI response
  const detectEmotion = (text: string): OrbEmotion => {
    const lower = text.toLowerCase();
    // Surprised/excited indicators
    if (lower.includes('!') || lower.includes('wonderful') || lower.includes('amazing') || lower.includes('that\'s great')) {
      return 'surprised';
    }
    // Empathetic/understanding
    if (lower.includes('i understand') || lower.includes('i hear you') || lower.includes('that sounds') || lower.includes('i\'m here') || lower.includes('must be')) {
      return 'empathetic';
    }
    // Joyful/positive
    if (lower.includes('happy') || lower.includes('glad') || lower.includes('love') || lower.includes('beautiful')) {
      return 'joyful';
    }
    // Calm/soothing
    if (lower.includes('breathe') || lower.includes('gentle') || lower.includes('slow') || lower.includes('calm') || lower.includes('peace')) {
      return 'calm';
    }
    return 'speaking';
  };
  
  // Update to listening state when user types
  React.useEffect(() => {
    if (message.length > 0 && !isThinking) {
      setOrbEmotion('listening');
    } else if (!isThinking && orbEmotion === 'listening') {
      setOrbEmotion('idle');
    }
  }, [message.length, isThinking, orbEmotion]);

  // Navigate to a specific activity with smooth crossfade
  const navigateToActivity = React.useCallback((activity: ActivityType) => {
    if (!activity) return;
    
    clearLastSuggestedActivity();
    setPendingActivity(null);
    
    // Determine the navigation callback
    let navigateCallback: (() => void) | null = null;
    switch (activity) {
      case 'breathing':
        navigateCallback = onNavigateToBreathing || null;
        break;
      case 'grounding':
        navigateCallback = onNavigateToGrounding || null;
        break;
      case 'walking':
        navigateCallback = onNavigateToWalking || null;
        break;
      case 'maze':
        navigateCallback = onNavigateToMaze || null;
        break;
      case 'powernap':
        navigateCallback = onNavigateToPowerNap || null;
        break;
      case 'pearlripple':
        navigateCallback = onNavigateToPearlRipple || null;
        break;
      case 'rest':
        navigateCallback = onNavigateToRest || null;
        break;
      case 'window':
        navigateCallback = onNavigateToWindow || null;
        break;
      case 'echo':
        navigateCallback = onNavigateToEcho || null;
        break;
    }
    
    if (navigateCallback) {
      // Store the callback and trigger crossfade
      pendingNavigationRef.current = navigateCallback;
      setIsTransitioning(true);
      
      // Navigate after fade completes (longer for smoother feel)
      setTimeout(() => {
        pendingNavigationRef.current?.();
        pendingNavigationRef.current = null;
      }, 900);
    }
  }, [onNavigateToBreathing, onNavigateToGrounding, onNavigateToWalking, onNavigateToMaze, onNavigateToPowerNap, onNavigateToPearlRipple, onNavigateToRest, onNavigateToWindow, onNavigateToEcho]);

  const handleSend = async () => {
    if (message.trim() && !isThinking) {
      const userMsg = message.trim();
      
      // Check if user is agreeing to a previously suggested activity
      const lastActivity = getLastSuggestedActivity();
      if (lastActivity && detectUserAgreement(userMsg)) {
        // Add a brief confirmation message before navigating
        setMessages(prev => [...prev, {
          id: `user-${Date.now()}`,
          role: 'user',
          content: userMsg
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
          pearlripple: "Let's feel the ripples… just breathe.",
          rest: "Time to rest… I'll be here when you're ready.",
          window: "Let's watch the rain together… find some peace.",
          echo: "Let's listen to the echoes… find your calm.",
        };
        
        setMessages(prev => [...prev, {
          id: `ai-${Date.now() + 1}`,
          role: 'assistant',
          content: transitionMessages[lastActivity] || "Let's do this together…"
        }]);
        
        // Navigate after a brief pause
        setTimeout(() => {
          navigateToActivity(lastActivity);
        }, 1500);
        
        return;
      }
      
      // Add user message
      setMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userMsg
      }]);
      
      // Save user message to Supabase
      getCurrentUserId().then(userId => {
        if (userId) {
          saveTraceMessage(userId, 'user', userMsg);
        }
      });
      
      setUserMessage(userMsg);
      setHasResponded(true);
      setMessage('');
      setIsThinking(true);
      setOrbEmotion('thinking');
      
      try {
        // Get real response from TRACE AI (now returns object with message and activity_suggestion)
        const chatStyle = (currentProfile?.chat_style as 'minimal' | 'conversation') || 'conversation';
        const traceResponse = await sendMessageToTrace(userMsg, userName, chatStyle);
        const { message: responseMessage, activity_suggestion } = traceResponse;
        
        // Detect emotion and animate orb accordingly
        const emotion = detectEmotion(responseMessage);
        setOrbEmotion(emotion);
        
        // Check if TRACE suggested an activity (from the structured response)
        if (activity_suggestion?.name) {
          const activityType = mapActivityName(activity_suggestion.name);
          if (activityType) {
            setPendingActivity(activityType);
          }
        }
        
        setMessages(prev => [...prev, {
          id: `ai-${Date.now() + 1}`,
          role: 'assistant',
          content: responseMessage
        }]);
        
        // Save TRACE's response to Supabase
        getCurrentUserId().then(userId => {
          if (userId) {
            saveTraceMessage(userId, 'assistant', responseMessage);
          }
        });
        
        // Check if we should offer a gentle support micro-prompt (once per session)
        // Get the updated messages including the new user message and AI response
        setMessages(prev => {
          const updatedMessages = prev;
          
          // Get last 3 user messages
          const lastUserMessages = updatedMessages
            .filter((m) => m.role === 'user')
            .slice(-3);
          
          // Only trigger if we have 3 user messages and haven't offered support yet
          if (lastUserMessages.length === 3 && !hasOfferedSupportThisSession) {
            const allHeavyOrAnxiousAndStrong = lastUserMessages.every((m) => {
              const emotion = m.emotion ?? 'neutral';
              const intensity = typeof m.intensity === 'number' ? m.intensity : 2;
              const isHeavyOrAnxious = emotion === 'heavy' || emotion === 'anxious';
              const isHighIntensity = intensity >= 4;
              return isHeavyOrAnxious && isHighIntensity;
            });
            
            if (allHeavyOrAnxiousAndStrong) {
              const supportText = TRACE_SUPPORT_PROMPTS[Math.floor(Math.random() * TRACE_SUPPORT_PROMPTS.length)];
              
              // Add micro-prompt after a gentle delay
              setTimeout(() => {
                const supportMessage: Message = {
                  id: `support-${Date.now()}`,
                  role: 'assistant',
                  content: supportText,
                  createdAt: new Date().toISOString(),
                  emotion: 'calm',
                  intensity: 1,
                };
                
                setMessages(p => [...p, supportMessage]);
                
                // Save support message to Supabase
                getCurrentUserId().then(userId => {
                  if (userId) {
                    saveTraceMessage(userId, 'assistant', supportText);
                  }
                });
              }, 2000);
              
              setHasOfferedSupportThisSession(true);
            }
          }
          
          return updatedMessages;
        });
        
        // If should_navigate is true, navigate to the activity after showing the message
        if (activity_suggestion?.should_navigate && activity_suggestion?.name) {
          const activityType = mapActivityName(activity_suggestion.name);
          console.log('Activity navigation triggered:', activity_suggestion.name, '->', activityType);
          if (activityType) {
            setTimeout(() => {
              console.log('Navigating to activity:', activityType);
              navigateToActivity(activityType);
            }, 1500);
          }
        }
        
        // Return to idle after response settles
        setTimeout(() => setOrbEmotion('idle'), 5000);
      } catch (error) {
        console.error('Error getting TRACE response:', error);
        setOrbEmotion('empathetic');
        setMessages(prev => [...prev, {
          id: `ai-${Date.now() + 1}`,
          role: 'assistant',
          content: "I'm here with you… let me gather my thoughts for a moment."
        }]);
        setTimeout(() => setOrbEmotion('idle'), 3000);
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

  const isDark = theme === 'night';

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
      // Reduce opacity by 12% in dark mode
      const baseOpacity = 0.18 + (i % 10) * 0.02;
      const opacity = isDark ? baseOpacity - 0.12 : baseOpacity;
      
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

  return (
    <div 
      className="relative w-full h-full flex flex-col transition-colors duration-300"
      style={{ 
        background: isDark 
          ? 'transparent' 
          : 'linear-gradient(180deg, #9FB5A1 0%, #96AA98 8%, #8FA393 15%, #889C8D 25%, #819588 35%, #7A8E81 45%, #768A7D 55%, #7A8E81 65%, #819588 75%, #889C8D 85%, #8FA393 92%, #96AA98 100%)',
      }}
    >
      
      {/* Privacy Mode Overlay - activated by shaking device */}
      <AnimatePresence>
        {privacyMode && (
          <motion.div
            className="absolute inset-0 z-[100] flex items-center justify-center cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setPrivacyMode(false)}
            style={{
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              background: isDark 
                ? 'rgba(14, 15, 13, 0.85)' 
                : 'rgba(139, 169, 152, 0.85)',
            }}
          >
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '2px solid rgba(255,255,255,0.3)',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </div>
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 300,
                  opacity: 0.8,
                }}
              >
                Tap anywhere to return
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
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
          // Emotion-aware breathing - dramatic and responsive
          opacity: orbEmotion === 'thinking' ? [0.7, 1, 0.7] : 
                   orbEmotion === 'surprised' ? [0.8, 1, 0.8] :
                   orbEmotion === 'joyful' ? [0.85, 1, 0.85] :
                   orbEmotion === 'empathetic' ? [0.75, 0.95, 0.75] :
                   orbEmotion === 'calm' ? [0.8, 0.95, 0.8] :
                   orbEmotion === 'speaking' ? [0.8, 1, 0.8] :
                   orbEmotion === 'listening' ? [0.85, 1, 0.85] : 
                   showTypewriter && currentIndex < greetingText.length ? [0.8, 1, 0.8] : 
                   [0.9, 1, 0.9],
          
          scale: orbEmotion === 'thinking' ? [0.95, 1.15, 0.95] : 
                 orbEmotion === 'surprised' ? [1, 1.2, 1] :
                 orbEmotion === 'joyful' ? [1, 1.15, 1] :
                 orbEmotion === 'empathetic' ? [0.98, 1.1, 0.98] :
                 orbEmotion === 'calm' ? [0.98, 1.08, 0.98] :
                 orbEmotion === 'speaking' ? [1, 1.12, 1] :
                 orbEmotion === 'listening' ? [1, 1.1, 1] : 
                 showTypewriter && currentIndex < greetingText.length ? [1, 1.08, 1] : 
                 [1, 1.06, 1],
          
          // Floating movement - very noticeable
          x: orbEmotion === 'thinking' ? [0, -8, 0, 8, 0] : 
             orbEmotion === 'surprised' ? [0, -6, 2, 6, 0] :
             orbEmotion === 'joyful' ? [0, -5, 0, 5, 0] :
             orbEmotion === 'empathetic' ? [0, -4, 0, 4, 0] :
             orbEmotion === 'speaking' ? [0, -6, 0, 6, 0] :
             orbEmotion === 'listening' ? [0, -5, 0, 5, 0] : 
             showTypewriter && currentIndex < greetingText.length ? [0, -4, 0, 4, 0] : 
             [0, -3, 0, 3, 0],
          
          y: orbEmotion === 'thinking' ? [0, -6, 0, 6, 0] : 
             orbEmotion === 'surprised' ? [0, -10, -2, 0] :
             orbEmotion === 'joyful' ? [0, -6, -2, 0] :
             orbEmotion === 'empathetic' ? [0, -4, 0, 4, 0] :
             orbEmotion === 'speaking' ? [0, -5, 0, 5, 0] :
             orbEmotion === 'listening' ? [0, -4, 0, 4, 0] : 
             showTypewriter && currentIndex < greetingText.length ? [0, -3, 0, 3, 0] : 
             [0, -3, 0, 3, 0],
          
          // Rotation for more life
          rotate: orbEmotion === 'thinking' ? [0, -2, 0, 2, 0] :
                  orbEmotion === 'surprised' ? [0, -3, 0, 3, 0] :
                  orbEmotion === 'joyful' ? [0, -2, 0, 2, 0] :
                  orbEmotion === 'speaking' ? [0, -1, 0, 1, 0] :
                  [0, -0.5, 0, 0.5, 0],
        }}
        transition={{ 
          // Faster, more responsive transitions
          default: {
            duration: 0.8,
            ease: "easeInOut"
          },
          opacity: { 
            duration: orbEmotion === 'thinking' ? 1.5 : 
                      orbEmotion === 'surprised' ? 1 :
                      orbEmotion === 'joyful' ? 1.5 :
                      orbEmotion === 'speaking' ? 1.8 :
                      orbEmotion === 'listening' ? 2 : 2.5, 
            repeat: Infinity, 
            ease: "easeInOut"
          },
          scale: { 
            duration: orbEmotion === 'thinking' ? 1.5 : 
                      orbEmotion === 'surprised' ? 1 :
                      orbEmotion === 'joyful' ? 1.5 :
                      orbEmotion === 'speaking' ? 2 :
                      orbEmotion === 'listening' ? 2 : 3, 
            repeat: Infinity, 
            ease: "easeInOut"
          },
          x: { 
            duration: orbEmotion === 'thinking' ? 3 : 
                      orbEmotion === 'surprised' ? 2 :
                      orbEmotion === 'speaking' ? 4 :
                      orbEmotion === 'listening' ? 4 : 5, 
            repeat: Infinity, 
            ease: "easeInOut"
          },
          y: { 
            duration: orbEmotion === 'thinking' ? 2.5 : 
                      orbEmotion === 'surprised' ? 1.5 :
                      orbEmotion === 'speaking' ? 3.5 :
                      orbEmotion === 'listening' ? 5 : 6, 
            repeat: Infinity, 
            ease: "easeInOut"
          },
          rotate: {
            duration: orbEmotion === 'thinking' ? 4 :
                      orbEmotion === 'surprised' ? 2 : 6,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
      >
        {/* Outer breathing glow - responds to emotional state */}
        <motion.div
          className="absolute inset-[-60px] rounded-full"
          style={{
            background: orbEmotion === 'surprised' 
              ? 'radial-gradient(circle, rgba(255,255,240,0.35) 0%, rgba(255,250,230,0.2) 25%, rgba(255,245,220,0.1) 40%, transparent 65%)'
              : orbEmotion === 'joyful'
              ? 'radial-gradient(circle, rgba(255,252,240,0.28) 0%, rgba(250,248,230,0.16) 25%, rgba(245,240,220,0.08) 40%, transparent 65%)'
              : orbEmotion === 'empathetic'
              ? 'radial-gradient(circle, rgba(255,240,235,0.25) 0%, rgba(245,230,225,0.14) 25%, rgba(235,220,215,0.08) 40%, transparent 65%)'
              : 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(230,240,235,0.12) 25%, rgba(210,235,230,0.08) 40%, transparent 65%)',
            filter: 'blur(40px)',
          }}
          animate={{
            scale: orbEmotion === 'thinking' ? [0.92, 1.15, 0.92] :
                   orbEmotion === 'surprised' ? [0.93, 1.18, 0.93] :
                   orbEmotion === 'joyful' ? [0.93, 1.14, 0.93] :
                   orbEmotion === 'listening' ? [0.94, 1.12, 0.94] :
                   showTypewriter && currentIndex < greetingText.length ? [0.95, 1.08, 0.95] :
                   [0.96, 1.06, 0.96],
            
            opacity: orbEmotion === 'thinking' ? [0.25, 0.55, 0.25] :
                     orbEmotion === 'surprised' ? [0.3, 0.6, 0.3] :
                     orbEmotion === 'joyful' ? [0.28, 0.55, 0.28] :
                     orbEmotion === 'listening' ? [0.25, 0.48, 0.25] :
                     showTypewriter && currentIndex < greetingText.length ? [0.26, 0.42, 0.26] :
                     [0.28, 0.4, 0.28],
          }}
          transition={{
            duration: orbEmotion === 'thinking' ? 3 :
                      orbEmotion === 'surprised' ? 2.5 :
                      orbEmotion === 'joyful' ? 3 :
                      orbEmotion === 'listening' ? 3.5 : 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Inner breathing halo - responds to emotional state */}
        <motion.div
          className="absolute inset-[-80px] rounded-full"
          style={{
            background: orbEmotion === 'surprised' 
              ? 'radial-gradient(circle, rgba(255,250,235,0.22) 0%, rgba(245,238,220,0.12) 30%, transparent 55%)'
              : orbEmotion === 'empathetic'
              ? 'radial-gradient(circle, rgba(240,225,220,0.18) 0%, rgba(230,215,210,0.1) 30%, transparent 55%)'
              : 'radial-gradient(circle, rgba(210,235,230,0.15) 0%, rgba(200,218,215,0.08) 30%, transparent 55%)',
            filter: 'blur(50px)',
          }}
          animate={{
            scale: orbEmotion === 'thinking' ? [0.93, 1.12, 0.93] :
                   orbEmotion === 'surprised' ? [0.94, 1.14, 0.94] :
                   orbEmotion === 'joyful' ? [0.94, 1.1, 0.94] :
                   orbEmotion === 'listening' ? [0.95, 1.1, 0.95] :
                   showTypewriter && currentIndex < greetingText.length ? [0.96, 1.06, 0.96] :
                   [0.97, 1.05, 0.97],
            
            opacity: orbEmotion === 'thinking' ? [0.12, 0.38, 0.12] :
                     orbEmotion === 'surprised' ? [0.16, 0.42, 0.16] :
                     orbEmotion === 'joyful' ? [0.14, 0.38, 0.14] :
                     orbEmotion === 'listening' ? [0.12, 0.32, 0.12] :
                     showTypewriter && currentIndex < greetingText.length ? [0.12, 0.28, 0.12] :
                     [0.14, 0.26, 0.14],
          }}
          transition={{
            duration: orbEmotion === 'thinking' ? 3.5 :
                      orbEmotion === 'surprised' ? 3 :
                      orbEmotion === 'joyful' ? 3.5 :
                      orbEmotion === 'listening' ? 4 : 5.5,
            repeat: Infinity,
            ease: "easeInOut",
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

          {/* Soft inner core glow - the heart of TRACE, responds to emotions */}
          <motion.div
            className="absolute inset-[18%] rounded-full"
            style={{
              background: orbEmotion === 'surprised' 
                ? 'radial-gradient(circle, rgba(255,255,230,0.55) 0%, rgba(255,252,235,0.4) 35%, rgba(255,248,225,0.25) 60%, transparent 80%)'
                : orbEmotion === 'joyful'
                ? 'radial-gradient(circle, rgba(255,255,240,0.45) 0%, rgba(255,252,235,0.32) 35%, rgba(250,248,230,0.2) 60%, transparent 80%)'
                : orbEmotion === 'empathetic'
                ? 'radial-gradient(circle, rgba(255,245,240,0.42) 0%, rgba(252,240,235,0.3) 35%, rgba(248,235,230,0.18) 60%, transparent 80%)'
                : 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(248,252,250,0.25) 35%, rgba(240,248,245,0.15) 60%, transparent 80%)',
              filter: 'blur(25px)',
            }}
            animate={{
              scale: orbEmotion === 'thinking' ? [0.85, 1.2, 0.85] :
                     orbEmotion === 'surprised' ? [0.88, 1.22, 0.88] :
                     orbEmotion === 'joyful' ? [0.88, 1.18, 0.88] :
                     orbEmotion === 'empathetic' ? [0.9, 1.12, 0.9] :
                     orbEmotion === 'listening' ? [0.88, 1.15, 0.88] :
                     showTypewriter && currentIndex < greetingText.length ? [0.9, 1.1, 0.9] :
                     [0.92, 1.08, 0.92],
              
              opacity: orbEmotion === 'thinking' ? [0.28, 0.6, 0.28] :
                       orbEmotion === 'surprised' ? [0.35, 0.68, 0.35] :
                       orbEmotion === 'joyful' ? [0.32, 0.62, 0.32] :
                       orbEmotion === 'empathetic' ? [0.3, 0.55, 0.3] :
                       orbEmotion === 'listening' ? [0.28, 0.52, 0.28] :
                       showTypewriter && currentIndex < greetingText.length ? [0.28, 0.45, 0.28] :
                       [0.3, 0.42, 0.3],
            }}
            transition={{
              duration: orbEmotion === 'thinking' ? 3 :
                        orbEmotion === 'surprised' ? 2.5 :
                        orbEmotion === 'joyful' ? 3 :
                        orbEmotion === 'listening' ? 3.5 : 5,
              repeat: Infinity,
              ease: "easeInOut",
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
          {/* Scrollable messages container with fade mask at top */}
          <div 
            className="h-full overflow-y-auto px-6 pb-4"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 8%, rgba(0,0,0,0.75) 15%, black 25%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 8%, rgba(0,0,0,0.75) 15%, black 25%)',
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
              <AnimatePresence initial={false} mode="popLayout">
                {messages.map((msg, index) => {
                  const totalMessages = messages.length;
                  const positionFromEnd = totalMessages - 1 - index;
                  const messageOpacity = positionFromEnd >= 5 
                    ? 0 
                    : positionFromEnd >= 4 
                      ? 0.05
                      : positionFromEnd >= 3 
                        ? 0.22
                        : positionFromEnd >= 2 
                          ? 0.6
                          : positionFromEnd >= 1 
                            ? 0.85
                            : 1;
                  
                  return (
                    <motion.div
                      key={msg.id}
                      layout
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      initial={{ 
                        opacity: 0, 
                        y: 20,
                        scale: 0.95,
                        x: msg.role === 'user' ? 15 : -15 
                      }}
                      animate={{ 
                        opacity: Math.min(1, messageOpacity), 
                        y: 0,
                        scale: 1,
                        x: 0 
                      }}
                      exit={{ 
                        opacity: 0, 
                        y: -10,
                        scale: 0.95,
                        transition: { duration: 0.2 }
                      }}
                      transition={{ 
                        type: "tween",
                        duration: 1.8,
                        ease: [0.25, 0.1, 0.25, 1],
                        opacity: { duration: 2.5, ease: "easeOut" },
                        layout: { type: "tween", duration: 1.5, ease: [0.22, 0.61, 0.36, 1] }
                      }}
                    >
                      <motion.div 
                        className={`max-w-[75%] px-5 py-4 rounded-3xl ${
                          msg.role === 'user' ? 'rounded-tr-md' : 'rounded-tl-md'
                        }`}
                        style={{
                          background: msg.role === 'user' 
                            ? '#EDE8DB' 
                            : 'rgba(237, 232, 219, 0.15)',
                          boxShadow: msg.role === 'user'
                            ? '0 2px 8px rgba(0, 0, 0, 0.1)'
                            : '0 2px 8px rgba(0, 0, 0, 0.08)',
                        }}
                        initial={{ scale: 0.98 }}
                        animate={{ scale: 1 }}
                        transition={{ 
                          type: "tween",
                          duration: 1.2,
                          ease: [0.22, 0.61, 0.36, 1]
                        }}
                      >
                        <p 
                          className={msg.role === 'user' ? 'text-[#6B7A6E]' : 'text-[#EDE8DB]'}
                          style={{
                            fontSize: '14px',
                            lineHeight: '1.5',
                            letterSpacing: '0.01em',
                            opacity: 0.9,
                          }}
                        >
                          {msg.content}
                        </p>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
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

      {/* Bottom Menu Bar - always visible */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <BottomNav 
          activeScreen="chat"
          variant="sage"
          onNavigateHome={() => {}}
          onNavigateActivities={onNavigateToActivities}
          onNavigateJournal={onNavigateToJournal}
          onNavigateProfile={onNavigateToProfile}
          onNavigateHelp={onNavigateToHelp}
          disableAnimation
        />
      </div>

      {/* Crossfade transition overlay - super smooth with blur and glow */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{
              background: isDark 
                ? 'linear-gradient(180deg, #2a3328 0%, #3d4a3a 50%, #2a3328 100%)'
                : 'linear-gradient(180deg, #8BA998 0%, #9DB8A7 50%, #8BA998 100%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
          >
            {/* Subtle centered glow during transition */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 200,
                height: 200,
                background: isDark
                  ? 'radial-gradient(circle, rgba(157, 184, 167, 0.25) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Blur overlay that activates during transition */}
      <motion.div
        className="absolute inset-0 z-40 pointer-events-none"
        style={{
          backdropFilter: isTransitioning ? 'blur(20px)' : 'blur(0px)',
          WebkitBackdropFilter: isTransitioning ? 'blur(20px)' : 'blur(0px)',
        }}
        animate={{
          opacity: isTransitioning ? 1 : 0,
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />

    </div>
  );
}