import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
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

interface PhysicsBubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  resting: boolean;
}

interface PoppedBubble {
  x: number;
  y: number;
  radius: number;
  startTime: number;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<PhysicsBubble[]>([]);
  const poppedRef = useRef<PoppedBubble[]>([]);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  
  const [poppedCount, setPoppedCount] = useState(0);
  const hasSavedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const popAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiMessages, setAiMessages] = useState<string[]>([]);
  const [currentAiIndex, setCurrentAiIndex] = useState(0);
  const encouragementShownRef = useRef(false);
  const fetchingRef = useRef(false);
  const [allPopped, setAllPopped] = useState(false);

  const POP_RADIUS_MULTIPLIER = 1.6;
  const POP_DURATION = 180;
  const GRAVITY = 0.12;
  const DAMPING = 0.98;
  const FLOOR_BOUNCE = 0.3;

  useEffect(() => {
    popAudioRef.current = new Audio('/sounds/bubble-pop.mp3');
    popAudioRef.current.volume = 0.35;
  }, []);

  const initBubbles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const cols = 7;
    const rows = 6;
    const padding = 12;
    const radius = Math.min(canvas.width / devicePixelRatio, (canvas.height / devicePixelRatio) - 70) / (cols * 2.2);
    
    const startY = radius + 60;
    const totalWidth = cols * (radius * 2 + padding) - padding;
    const offsetX = (canvas.width / devicePixelRatio - totalWidth) / 2;
    
    const bubbles: PhysicsBubble[] = [];
    let id = 0;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * (radius * 2 + padding) + radius;
        const y = startY + row * (radius * 2 + padding);
        
        bubbles.push({
          id: id++,
          x,
          y,
          radius,
          vx: (Math.random() - 0.5) * 0.1,
          vy: 0,
          resting: false
        });
      }
    }
    
    bubblesRef.current = bubbles;
    poppedRef.current = [];
    setPoppedCount(0);
    setAllPopped(false);
  }, []);

  const updatePhysics = useCallback((dt: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const width = canvas.width / devicePixelRatio;
    const height = canvas.height / devicePixelRatio;
    const floorY = height - 90;
    
    for (const b of bubblesRef.current) {
      if (b.resting) continue;
      
      b.vy += GRAVITY * dt;
      b.vx += Math.sin((Date.now() / 1000 + b.id) * 0.4) * 0.002;
      
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      
      if (b.x - b.radius < 0) {
        b.x = b.radius;
        b.vx *= -0.5;
      }
      if (b.x + b.radius > width) {
        b.x = width - b.radius;
        b.vx *= -0.5;
      }
      
      if (b.y + b.radius > floorY) {
        b.y = floorY - b.radius - 0.01;
        b.vy *= -FLOOR_BOUNCE;
        
        if (Math.abs(b.vy) < 0.05) {
          b.vy = 0;
          b.vx *= 0.95;
          b.resting = true;
        }
      }
      
      b.vx *= DAMPING;
      b.vy *= DAMPING;
    }
  }, []);

  const drawBubble = useCallback((ctx: CanvasRenderingContext2D, b: PhysicsBubble) => {
    const r = b.radius;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.closePath();
    
    const gradient = ctx.createRadialGradient(
      b.x - r * 0.4, b.y - r * 0.4, r * 0.2,
      b.x, b.y, r
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.98)");
    gradient.addColorStop(0.5, "rgba(245,245,245,0.9)");
    gradient.addColorStop(1, "rgba(220,220,220,0.8)");
    
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(0,0,0,0.22)";
    ctx.shadowBlur = r * 0.6;
    ctx.shadowOffsetY = r * 0.3;
    ctx.fill();
    ctx.restore();
  }, []);

  const drawPopped = useCallback((ctx: CanvasRenderingContext2D, p: PoppedBubble): boolean => {
    const progress = (Date.now() - p.startTime) / POP_DURATION;
    if (progress >= 1) return false;
    
    const ease = 1 - Math.pow(1 - progress, 2);
    const r = p.radius * (1 + ease * (POP_RADIUS_MULTIPLIER - 1));
    const alpha = 1 - ease;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.closePath();
    
    const gradient = ctx.createRadialGradient(
      p.x - r * 0.4, p.y - r * 0.4, r * 0.2,
      p.x, p.y, r
    );
    gradient.addColorStop(0, `rgba(139,109,82,${alpha})`);
    gradient.addColorStop(0.5, `rgba(160,130,100,${alpha * 0.6})`);
    gradient.addColorStop(1, `rgba(180,150,120,0)`);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
    
    return true;
  }, []);

  const popAt = useCallback((x: number, y: number) => {
    const bubbles = bubblesRef.current;
    
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      const dx = x - b.x;
      const dy = y - b.y;
      
      if (dx * dx + dy * dy <= b.radius * b.radius) {
        poppedRef.current.push({
          x: b.x,
          y: b.y,
          radius: b.radius,
          startTime: Date.now()
        });
        
        bubbles.splice(i, 1);
        
        if (popAudioRef.current) {
          popAudioRef.current.currentTime = 0;
          popAudioRef.current.play().catch(() => {});
        }
        
        if (navigator.vibrate) {
          navigator.vibrate(15);
        }
        
        setPoppedCount(prev => prev + 1);
        
        if (bubbles.length === 0) {
          setAllPopped(true);
        }
        
        break;
      }
    }
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const now = performance.now();
    const dt = Math.min((now - lastTimeRef.current) / 16.67, 2);
    lastTimeRef.current = now;
    
    updatePhysics(dt);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, "#f5f6f3");
    bgGrad.addColorStop(0.5, "#e8e9e4");
    bgGrad.addColorStop(1, "#d3d7cd");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
    
    for (const b of bubblesRef.current) {
      drawBubble(ctx, b);
    }
    
    for (let i = poppedRef.current.length - 1; i >= 0; i--) {
      const still = drawPopped(ctx, poppedRef.current[i]);
      if (!still) poppedRef.current.splice(i, 1);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [updatePhysics, drawBubble, drawPopped]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      canvas.width = container.clientWidth * devicePixelRatio;
      canvas.height = container.clientHeight * devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      }
      
      if (bubblesRef.current.length === 0) {
        initBubbles();
      }
    };
    
    resize();
    window.addEventListener('resize', resize);
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [initBubbles, animate]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    popAt(x, y);
  };

  const fetchAiEncouragement = useCallback(async () => {
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
          setAiMessages(data.messages);
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
      setAiMessages(fallbackMessages);
    }
  }, []);

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
          if (currentAiIndex < aiMessages.length - 1) {
            setCurrentAiIndex(prev => prev + 1);
          }
        }, 4000);
      }
    }, 45);
    
    return () => clearInterval(typeInterval);
  }, [currentAiIndex, isTyping, showEncouragement, aiMessages]);

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
    initBubbles();
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

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
      />

      <motion.div
        className="absolute w-full text-center z-20 pointer-events-none"
        style={{ top: '3%' }}
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

      {allPopped && (
        <motion.div
          className="absolute z-20 w-full text-center pointer-events-auto"
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
