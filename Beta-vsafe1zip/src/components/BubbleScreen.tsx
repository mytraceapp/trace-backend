import { useState, useEffect, useRef } from 'react';
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
  popTime: number | null;
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
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [poppedCount, setPoppedCount] = useState(0);
  const [showTitle, setShowTitle] = useState(true);
  const hasSavedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  const bubbleSize = 48;
  const gap = 4;
  const cols = 7;
  const topOffset = 100;
  const bottomOffset = 80;

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTitle(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const screenHeight = 844;
    const availableHeight = screenHeight - topOffset - bottomOffset;
    const rowHeight = bubbleSize + gap;
    const rows = Math.floor(availableHeight / rowHeight);
    
    const newBubbles: Bubble[] = [];
    let id = 0;
    
    for (let row = 0; row < rows; row++) {
      const colsInRow = row % 2 === 0 ? cols : cols - 1;
      for (let col = 0; col < colsInRow; col++) {
        newBubbles.push({
          id: id++,
          row,
          col,
          popped: false,
          popTime: null,
        });
      }
    }
    setBubbles(newBubbles);
  }, []);

  const popBubble = (id: number) => {
    setBubbles(prev => 
      prev.map(b => b.id === id ? { ...b, popped: true, popTime: Date.now() } : b)
    );
    setPoppedCount(prev => prev + 1);
    
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

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
    setBubbles(prev => prev.map(b => ({ ...b, popped: false, popTime: null })));
    setPoppedCount(0);
    startTimeRef.current = Date.now();
    hasSavedRef.current = false;
  };

  const getBubblePosition = (row: number, col: number) => {
    const totalRowWidth = cols * bubbleSize + (cols - 1) * gap;
    const screenWidth = 366;
    const startX = (screenWidth - totalRowWidth) / 2;
    const rowOffset = row % 2 === 0 ? 0 : (bubbleSize + gap) / 2;
    
    return {
      x: startX + col * (bubbleSize + gap) + rowOffset,
      y: topOffset + row * (bubbleSize + gap),
    };
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ 
        background: 'linear-gradient(to bottom, #F5F1EB 0%, #E8E4DC 18%, #D8DCD5 45%, #C5CABE 78%, #B4BFB3 100%)' 
      }}
    >
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
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

      <AnimatePresence>
        {showTitle && (
          <motion.div
            className="absolute z-30 w-full text-center pointer-events-none"
            style={{ top: '45%', transform: 'translateY(-50%)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.3, duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <h2
              style={{
                fontFamily: 'Georgia, serif',
                color: '#5A4A3A',
                fontWeight: 400,
                fontSize: '26px',
                letterSpacing: '0.02em',
                marginBottom: '8px',
                textShadow: '0 2px 10px rgba(255,255,255,0.5)',
              }}
            >
              Bubble
            </h2>
            <p
              style={{
                fontFamily: 'Georgia, serif',
                color: '#7A6A5A',
                fontWeight: 300,
                fontSize: '15px',
                letterSpacing: '0.01em',
                lineHeight: '1.5',
              }}
            >
              Pop away the tension.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-10" style={{ bottom: '80px' }}>
        {bubbles.map((bubble) => {
          const pos = getBubblePosition(bubble.row, bubble.col);
          return (
            <div
              key={bubble.id}
              className="absolute"
              style={{
                left: pos.x,
                top: pos.y,
                width: bubbleSize,
                height: bubbleSize,
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
                      border: '2px solid rgba(139, 109, 82, 0.6)',
                      background: 'transparent',
                    }}
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                )}
              </AnimatePresence>

              <motion.div
                className="w-full h-full cursor-pointer"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: bubble.popped ? 0 : 1, 
                  scale: bubble.popped ? 0.5 : 1,
                  backgroundColor: bubble.popped ? 'rgba(139, 109, 82, 0.4)' : 'transparent',
                }}
                transition={{ 
                  duration: bubble.popped ? 0.2 : 0.3,
                  delay: bubble.popped ? 0 : bubble.id * 0.008,
                  ease: bubble.popped ? 'easeOut' : [0.22, 0.61, 0.36, 1]
                }}
                onClick={() => !bubble.popped && popBubble(bubble.id)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (!bubble.popped) popBubble(bubble.id);
                }}
                whileHover={{ scale: bubble.popped ? 0.5 : 1.05 }}
                whileTap={{ scale: 0.9 }}
              >
                <div
                  className="w-full h-full rounded-full relative"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, 
                      rgba(255, 255, 255, 0.98) 0%, 
                      rgba(255, 255, 255, 0.7) 15%,
                      rgba(235, 240, 238, 0.55) 35%,
                      rgba(200, 215, 210, 0.45) 55%,
                      rgba(170, 190, 185, 0.35) 75%,
                      rgba(150, 170, 165, 0.25) 100%)`,
                    boxShadow: `
                      inset 0 0 8px rgba(255, 255, 255, 0.9),
                      inset 6px 6px 12px rgba(255, 255, 255, 0.95),
                      inset -3px -3px 8px rgba(120, 145, 140, 0.15),
                      0 4px 12px rgba(100, 115, 110, 0.12),
                      0 1px 3px rgba(100, 115, 110, 0.08)
                    `,
                    border: '1px solid rgba(255, 255, 255, 0.7)',
                  }}
                >
                  <div
                    className="absolute rounded-full"
                    style={{
                      top: '12%',
                      left: '18%',
                      width: '30%',
                      height: '22%',
                      background: 'rgba(255, 255, 255, 0.95)',
                      filter: 'blur(1.5px)',
                      transform: 'rotate(-25deg)',
                    }}
                  />
                  <div
                    className="absolute rounded-full"
                    style={{
                      top: '22%',
                      left: '38%',
                      width: '12%',
                      height: '10%',
                      background: 'rgba(255, 255, 255, 0.8)',
                      filter: 'blur(1px)',
                    }}
                  />
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {poppedCount > 0 && poppedCount === bubbles.length && (
        <motion.div
          className="absolute z-20 w-full text-center"
          style={{ bottom: '120px' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.button
            onClick={resetBubbles}
            className="px-6 py-3 rounded-full"
            style={{
              background: 'rgba(90, 74, 58, 0.9)',
              color: '#FAF6F0',
              fontFamily: 'Georgia, serif',
              fontSize: '14px',
              fontWeight: 400,
              letterSpacing: '0.02em',
              boxShadow: '0 4px 20px rgba(90, 74, 58, 0.3)',
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

      <div className="absolute bottom-0 left-0 right-0 z-30">
        <BottomNav
          activeScreen="activities"
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
