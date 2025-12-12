import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from './BottomNav';
import { useEntries } from '../state/EntriesContext';

interface BubbleScreenProps {
  onBack: () => void;
  onReturnToChat: () => void;
  onNavigateToActivities: () => void;
  onNavigateToJournal: () => void;
  onNavigateToProfile: () => void;
  onNavigateToHelp: () => void;
}

interface Bubble {
  id: number;
  row: number;
  col: number;
  popped: boolean;
  falling: boolean;
  targetRow: number;
}

export function BubbleScreen({
  onBack: _onBack,
  onReturnToChat,
  onNavigateToActivities,
  onNavigateToJournal,
  onNavigateToProfile,
  onNavigateToHelp,
}: BubbleScreenProps) {
  const { addSessionEntry } = useEntries();
  const [poppedCount, setPoppedCount] = useState(0);
  const hasSavedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const popAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiMessages, setAiMessages] = useState<string[]>([]);
  const [currentAiIndex, setCurrentAiIndex] = useState(0);
  const encouragementShownRef = useRef(false);
  const fetchingRef = useRef(false);

  const bubbleSize = 48;
  const cols = 9;
  const topOffset = 0;
  const bottomOffset = 70;

  // Create bubbles synchronously to avoid post-mount re-render that blocks BottomNav animation
  const [bubbles, setBubbles] = useState<Bubble[]>(() => {
    const screenHeight = 844;
    const availableHeight = screenHeight - topOffset - bottomOffset;
    const rowHeight = bubbleSize * 0.86;
    const rows = Math.ceil(availableHeight / rowHeight) + 1;
    
    const newBubbles: Bubble[] = [];
    let id = 0;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        newBubbles.push({
          id: id++,
          row,
          col,
          popped: false,
          falling: false,
          targetRow: row,
        });
      }
    }
    return newBubbles;
  });

  useEffect(() => {
    popAudioRef.current = new Audio('/sounds/bubble-pop.mp3');
    popAudioRef.current.volume = 0.35;
  }, []);

  const fetchAiEncouragement = useCallback(async (append: boolean = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    try {
      const response = await fetch('/api/bubble-encouragement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 8 }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          if (append) {
            setAiMessages(prev => [...prev, ...data.messages]);
          } else {
            setAiMessages(data.messages);
          }
        } else {
          throw new Error('No messages received');
        }
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch AI encouragement:', error);
      const fallbackMessages = [
        "Each pop is a tiny release.",
        "You're giving yourself permission to pause.",
        "There's something calming about this rhythm.",
        "Let each pop carry away a little tension.",
        "This moment belongs to you.",
        "Notice how satisfying each one feels.",
        "You're doing something gentle for yourself.",
        "Stay as long as you need.",
      ];
      if (append) {
        setAiMessages(prev => [...prev, ...fallbackMessages]);
      } else {
        setAiMessages(fallbackMessages);
      }
    }
    fetchingRef.current = false;
  }, []);

  const popBubble = (id: number) => {
    setBubbles(prev => {
      const bubbleIndex = prev.findIndex(b => b.id === id);
      if (bubbleIndex === -1) return prev;
      
      const poppedBubble = prev[bubbleIndex];
      if (poppedBubble.popped) return prev;
      
      const poppedCol = poppedBubble.col;
      const poppedRow = poppedBubble.targetRow;
      
      const newBubbles = prev.map(b => {
        if (b.id === id) {
          return { ...b, popped: true };
        }
        if (b.col === poppedCol && b.targetRow < poppedRow && !b.popped) {
          return { 
            ...b, 
            falling: true,
            targetRow: b.targetRow + 1 
          };
        }
        return b;
      });
      
      return newBubbles;
    });
    
    setPoppedCount(prev => prev + 1);
    
    if (popAudioRef.current) {
      popAudioRef.current.currentTime = 0;
      popAudioRef.current.play().catch(() => {});
    }
    
    if (navigator.vibrate) {
      navigator.vibrate(12);
    }
  };

  useEffect(() => {
    if (!encouragementShownRef.current && poppedCount >= 10) {
      encouragementShownRef.current = true;
      fetchAiEncouragement();
      setShowEncouragement(true);
      setIsTyping(true);
    }
  }, [poppedCount, fetchAiEncouragement]);

  useEffect(() => {
    if (!isTyping || !showEncouragement || aiMessages.length === 0) return;
    
    const message = aiMessages[currentAiIndex];
    if (!message) return;
    
    let charIndex = 0;
    setDisplayedText('');
    
    const typeInterval = setInterval(() => {
      if (charIndex < message.length) {
        setDisplayedText(message.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        
        setTimeout(() => {
          const nextIndex = currentAiIndex + 1;
          if (nextIndex >= aiMessages.length - 2) {
            fetchAiEncouragement(true);
          }
          setCurrentAiIndex(nextIndex);
        }, 4000);
      }
    }, 45);
    
    return () => clearInterval(typeInterval);
  }, [currentAiIndex, isTyping, showEncouragement, aiMessages, fetchAiEncouragement]);

  useEffect(() => {
    const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
    
    if (!hasSavedRef.current && poppedCount >= 10 && timeElapsed >= 5) {
      hasSavedRef.current = true;
      addSessionEntry('Bubble', {
        title: 'Bubble – Popped',
        body: `You took a moment to pop some bubbles and release tension. ${poppedCount} bubbles popped.`,
        tags: ['calm', 'playful', 'bubble'],
        metadata: { duration: Math.round(timeElapsed), poppedCount }
      });
    }
  }, [poppedCount, addSessionEntry]);

  const resetBubbles = () => {
    const screenHeight = 844;
    const availableHeight = screenHeight - topOffset - bottomOffset;
    const rowHeight = bubbleSize * 0.86;
    const rows = Math.ceil(availableHeight / rowHeight) + 1;
    
    const newBubbles: Bubble[] = [];
    let id = 0;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        newBubbles.push({
          id: id++,
          row,
          col,
          popped: false,
          falling: false,
          targetRow: row,
        });
      }
    }
    setBubbles(newBubbles);
    setPoppedCount(0);
    startTimeRef.current = Date.now();
    hasSavedRef.current = false;
    encouragementShownRef.current = false;
    fetchingRef.current = false;
    setShowEncouragement(false);
    setCurrentAiIndex(0);
    setDisplayedText('');
    setIsTyping(false);
    setAiMessages([]);
  };

  const getBubblePosition = (row: number, col: number, targetRow: number) => {
    const overlap = bubbleSize * 0.08;
    const effectiveSize = bubbleSize - overlap;
    const rowOffset = row % 2 === 0 ? 0 : effectiveSize / 2;
    const startX = -bubbleSize / 2;
    
    return {
      x: startX + col * effectiveSize + rowOffset,
      y: topOffset + targetRow * (bubbleSize * 0.86),
    };
  };

  const allPopped = bubbles.length > 0 && bubbles.every(b => b.popped);

  useEffect(() => {
    if (allPopped) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          onReturnToChat();
        }, 500);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [allPopped, onReturnToChat]);

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{ 
        background: 'linear-gradient(to bottom, #F5F1EB 0%, #E8E4DC 18%, #D8DCD5 45%, #C5CABE 78%, #B4BFB3 100%)' 
      }}
    >
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 1 }}
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      >
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          opacity: 0.03,
        }}
      />

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
            color: 'rgba(90, 74, 58, 0.88)',
            fontWeight: 300,
            letterSpacing: '1em',
            fontSize: '11px',
            textShadow: '0 0 15px rgba(180, 160, 140, 0.3), 0 0 30px rgba(180, 160, 140, 0.2), 0 2px 4px rgba(0,0,0,0.15)',
            opacity: 0.88,
            paddingLeft: '1em',
          }}
        >
          TRACE
        </h1>
      </motion.div>

      {showEncouragement && displayedText && (
        <motion.div
          className="absolute w-full flex justify-center px-6 pointer-events-none"
          style={{ top: '45%', transform: 'translateY(-50%)', zIndex: 5 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.p
            key={currentAiIndex}
            className="text-center"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '20px',
              fontWeight: 400,
              color: 'rgba(90, 74, 58, 0.95)',
              letterSpacing: '0.02em',
              lineHeight: 1.6,
              maxWidth: '300px',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            {displayedText}
          </motion.p>
        </motion.div>
      )}

      <div className="absolute inset-0 z-10" style={{ bottom: '70px' }}>
        {bubbles.map((bubble) => {
          const pos = getBubblePosition(bubble.row, bubble.col, bubble.targetRow);
          return (
            <motion.div
              key={bubble.id}
              className="absolute"
              style={{
                left: pos.x,
                width: bubbleSize,
                height: bubbleSize,
              }}
              initial={{ top: topOffset + bubble.row * (bubbleSize * 0.86) }}
              animate={{ 
                top: pos.y,
                opacity: bubble.popped ? 0 : 1,
                scale: bubble.popped ? 0.5 : 1,
              }}
              transition={{ 
                top: { 
                  type: 'spring', 
                  stiffness: 300, 
                  damping: 25,
                  mass: 0.8 
                },
                opacity: { duration: 0.15 },
                scale: { duration: 0.15 }
              }}
            >
              <AnimatePresence>
                {bubble.popped && (
                  <motion.div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: bubbleSize,
                      height: bubbleSize,
                      marginLeft: -bubbleSize / 2,
                      marginTop: -bubbleSize / 2,
                      border: '2px solid rgba(139, 109, 82, 0.5)',
                      background: 'transparent',
                    }}
                    initial={{ scale: 1, opacity: 0.7 }}
                    animate={{ scale: 2, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                )}
              </AnimatePresence>

              <div
                className="w-full h-full cursor-pointer"
                onClick={() => !bubble.popped && popBubble(bubble.id)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (!bubble.popped) popBubble(bubble.id);
                }}
                style={{
                  opacity: bubble.popped ? 0 : 1,
                  pointerEvents: bubble.popped ? 'none' : 'auto',
                }}
              >
                <div
                  className="w-full h-full rounded-full relative"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, 
                      rgba(255, 255, 255, 0.95) 0%, 
                      rgba(255, 255, 255, 0.5) 20%,
                      rgba(230, 235, 232, 0.4) 40%,
                      rgba(200, 210, 205, 0.35) 60%,
                      rgba(180, 190, 185, 0.3) 80%,
                      rgba(160, 170, 165, 0.25) 100%)`,
                    boxShadow: `
                      inset 2px 2px 8px rgba(255, 255, 255, 0.9),
                      inset 8px 8px 16px rgba(255, 255, 255, 0.6),
                      inset -4px -4px 12px rgba(100, 110, 105, 0.15),
                      0 2px 6px rgba(80, 90, 85, 0.15)
                    `,
                    border: '1px solid rgba(200, 205, 202, 0.5)',
                  }}
                >
                  <div
                    className="absolute rounded-full"
                    style={{
                      top: '10%',
                      left: '15%',
                      width: '35%',
                      height: '25%',
                      background: 'rgba(255, 255, 255, 0.9)',
                      filter: 'blur(2px)',
                      transform: 'rotate(-20deg)',
                    }}
                  />
                  <div
                    className="absolute rounded-full"
                    style={{
                      top: '20%',
                      left: '40%',
                      width: '15%',
                      height: '12%',
                      background: 'rgba(255, 255, 255, 0.7)',
                      filter: 'blur(1px)',
                    }}
                  />
                  <div
                    className="absolute rounded-full"
                    style={{
                      bottom: '15%',
                      right: '20%',
                      width: '20%',
                      height: '15%',
                      background: 'rgba(255, 255, 255, 0.3)',
                      filter: 'blur(2px)',
                    }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {allPopped && (
        <motion.div
          className="absolute z-20 w-full text-center"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.button
            onClick={resetBubbles}
            className="px-8 py-4 rounded-full"
            style={{
              background: 'rgba(90, 74, 58, 0.9)',
              color: '#FAF6F0',
              fontFamily: 'Georgia, serif',
              fontSize: '16px',
              fontWeight: 400,
              letterSpacing: '0.02em',
              boxShadow: '0 6px 24px rgba(90, 74, 58, 0.4)',
              border: 'none',
              cursor: 'pointer',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Pop again
          </motion.button>
        </motion.div>
      )}
      </motion.div>

      <div 
        className="absolute bottom-0 left-0 right-0 z-50"
        style={{ 
          background: '#B4BFB3',
          paddingTop: '8px',
        }}
      >
        <BottomNav
          activeScreen="activities"
          variant="sage-fixed"
          onNavigateHome={onReturnToChat}
          onNavigateActivities={onNavigateToActivities}
          onNavigateJournal={onNavigateToJournal}
          onNavigateProfile={onNavigateToProfile}
          onNavigateHelp={onNavigateToHelp}
        />
      </div>
    </div>
  );
}
