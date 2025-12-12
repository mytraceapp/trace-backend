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
  const hasSavedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());

  const bubbleSize = 52;
  const cols = 7;
  const topOffset = 0;
  const bottomOffset = 70;

  useEffect(() => {
    const screenHeight = 844;
    const availableHeight = screenHeight - topOffset - bottomOffset;
    const rowHeight = bubbleSize * 0.88;
    const rows = Math.ceil(availableHeight / rowHeight) + 1;
    
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
        });
      }
    }
    setBubbles(newBubbles);
  }, []);

  const popBubble = (id: number) => {
    setBubbles(prev => 
      prev.map(b => b.id === id ? { ...b, popped: true } : b)
    );
    setPoppedCount(prev => prev + 1);
    
    if (navigator.vibrate) {
      navigator.vibrate(12);
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
    setBubbles(prev => prev.map(b => ({ ...b, popped: false })));
    setPoppedCount(0);
    startTimeRef.current = Date.now();
    hasSavedRef.current = false;
  };

  const getBubblePosition = (row: number, col: number) => {
    const screenWidth = 390;
    const totalRowWidth = cols * bubbleSize;
    const startX = (screenWidth - totalRowWidth) / 2;
    const rowOffset = row % 2 === 0 ? 0 : bubbleSize / 2;
    
    return {
      x: startX + col * bubbleSize + rowOffset,
      y: topOffset + row * (bubbleSize * 0.88),
    };
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{ 
        background: 'linear-gradient(to bottom, #E8E4E0 0%, #D8D4D0 50%, #C8C4C0 100%)' 
      }}
    >
      <div className="absolute inset-0 z-10" style={{ bottom: '70px' }}>
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

              <motion.div
                className="w-full h-full cursor-pointer"
                initial={{ opacity: 1 }}
                animate={{ 
                  opacity: bubble.popped ? 0 : 1, 
                  scale: bubble.popped ? 0.6 : 1,
                }}
                transition={{ 
                  duration: bubble.popped ? 0.15 : 0,
                  ease: 'easeOut'
                }}
                onClick={() => !bubble.popped && popBubble(bubble.id)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (!bubble.popped) popBubble(bubble.id);
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
              </motion.div>
            </div>
          );
        })}
      </div>

      {poppedCount > 0 && poppedCount === bubbles.length && (
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
