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
  x: number;
  y: number;
  size: number;
  popped: boolean;
  delay: number;
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTitle(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const newBubbles: Bubble[] = [];
    const rows = 10;
    const cols = 6;
    const bubbleSize = 48;
    const gapX = 56;
    const gapY = 56;
    const offsetX = 20;
    const offsetY = 140;
    
    let id = 0;
    for (let row = 0; row < rows; row++) {
      const rowOffset = row % 2 === 0 ? 0 : gapX / 2;
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * gapX + rowOffset;
        const y = offsetY + row * gapY;
        const sizeVariation = 0.85 + Math.random() * 0.3;
        newBubbles.push({
          id: id++,
          x,
          y,
          size: bubbleSize * sizeVariation,
          popped: false,
          delay: Math.random() * 0.5,
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
  }, [poppedCount, bubbles.length, addSessionEntry]);

  const resetBubbles = () => {
    setBubbles(prev => prev.map(b => ({ ...b, popped: false })));
    setPoppedCount(0);
    startTimeRef.current = Date.now();
    hasSavedRef.current = false;
  };

  return (
    <div 
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
            className="absolute z-10 w-full text-center pointer-events-none"
            style={{ top: '14%' }}
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
                fontSize: '22px',
                letterSpacing: '0.01em',
                marginBottom: '8px',
              }}
            >
              Bubble
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
              Pop away the tension.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-10" style={{ paddingBottom: '80px' }}>
        {bubbles.map((bubble) => (
          <motion.div
            key={bubble.id}
            className="absolute cursor-pointer"
            style={{
              left: bubble.x,
              top: bubble.y,
              width: bubble.size,
              height: bubble.size,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: bubble.popped ? 0 : 1, 
              scale: bubble.popped ? 1.3 : 1 
            }}
            transition={{ 
              delay: bubble.delay,
              duration: bubble.popped ? 0.15 : 0.4,
              ease: bubble.popped ? 'easeOut' : [0.22, 0.61, 0.36, 1]
            }}
            onClick={() => !bubble.popped && popBubble(bubble.id)}
            onTouchStart={() => !bubble.popped && popBubble(bubble.id)}
            whileHover={{ scale: bubble.popped ? 1.3 : 1.08 }}
            whileTap={{ scale: 0.9 }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background: `radial-gradient(circle at 30% 30%, 
                  rgba(255, 255, 255, 0.95) 0%, 
                  rgba(255, 255, 255, 0.6) 20%,
                  rgba(220, 230, 225, 0.5) 40%,
                  rgba(180, 200, 190, 0.4) 60%,
                  rgba(150, 175, 165, 0.3) 80%,
                  rgba(130, 155, 145, 0.2) 100%)`,
                boxShadow: `
                  inset 0 0 ${bubble.size * 0.15}px rgba(255, 255, 255, 0.8),
                  inset ${bubble.size * 0.1}px ${bubble.size * 0.1}px ${bubble.size * 0.2}px rgba(255, 255, 255, 0.9),
                  inset -${bubble.size * 0.05}px -${bubble.size * 0.05}px ${bubble.size * 0.1}px rgba(100, 130, 120, 0.2),
                  0 ${bubble.size * 0.1}px ${bubble.size * 0.3}px rgba(90, 100, 95, 0.15),
                  0 ${bubble.size * 0.02}px ${bubble.size * 0.05}px rgba(90, 100, 95, 0.1)
                `,
                border: '1px solid rgba(255, 255, 255, 0.6)',
              }}
            >
              <div
                className="absolute rounded-full"
                style={{
                  top: '15%',
                  left: '20%',
                  width: '25%',
                  height: '20%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  filter: 'blur(2px)',
                  transform: 'rotate(-30deg)',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  top: '25%',
                  left: '35%',
                  width: '10%',
                  height: '8%',
                  background: 'rgba(255, 255, 255, 0.7)',
                  filter: 'blur(1px)',
                }}
              />
            </div>
          </motion.div>
        ))}
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
