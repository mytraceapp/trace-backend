import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useEntries } from '../state/EntriesContext';

interface RainWindowScreenProps {
  onReturnToChat: () => void;
  onNavigateToActivities: () => void;
  onNavigateToJournal: () => void;
  onNavigateToProfile: () => void;
  onNavigateToHelp: () => void;
  onBack: () => void;
}

interface Raindrop {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
}

export function RainWindowScreen({
  onReturnToChat,
  onNavigateToActivities,
  onNavigateToJournal,
  onNavigateToProfile,
  onNavigateToHelp,
  onBack,
}: RainWindowScreenProps) {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [raindrops, setRaindrops] = useState<Raindrop[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<OscillatorNode[]>([]);
  const { addEntry } = useEntries();

  const ACTIVITY_DURATION = 180;

  useEffect(() => {
    const drops: Raindrop[] = [];
    for (let i = 0; i < 60; i++) {
      drops.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 4 + Math.random() * 6,
        size: 1 + Math.random() * 2,
        opacity: 0.2 + Math.random() * 0.4,
      });
    }
    setRaindrops(drops);
  }, []);

  const startRainAudio = useCallback(() => {
    if (audioContextRef.current) return;

    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);
    gainNodeRef.current = masterGain;

    const pinkNoise = () => {
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      return buffer;
    };

    const noiseBuffer = pinkNoise();
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 400;
    lowpass.Q.value = 0.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.25;

    noiseSource.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(masterGain);
    noiseSource.start();

    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 3);
  }, []);

  const stopRainAudio = useCallback(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      const ctx = audioContextRef.current;
      gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      
      setTimeout(() => {
        nodesRef.current.forEach(node => {
          try { node.stop(); } catch {}
        });
        nodesRef.current = [];
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
        audioContextRef.current = null;
        gainNodeRef.current = null;
      }, 2000);
    }
  }, []);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    setElapsedTime(0);
    startRainAudio();
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleComplete = useCallback(() => {
    setShowCompletion(true);
    stopRainAudio();

    addEntry({
      type: 'session',
      title: 'Rain Window',
      body: 'Completed a Rain Window session',
      sourceScreen: 'RainWindowScreen',
      metadata: {
        activityType: 'Rain Window',
        duration: elapsedTime,
      },
    });

    setTimeout(() => {
      onReturnToChat();
    }, 3000);
  }, [addEntry, elapsedTime, onReturnToChat, stopRainAudio]);

  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => {
          if (prev >= ACTIVITY_DURATION) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleComplete();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused, handleComplete]);

  useEffect(() => {
    return () => {
      stopRainAudio();
    };
  }, [stopRainAudio]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTime = ACTIVITY_DURATION - elapsedTime;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #101111 0%, #161918 40%, #1c211f 100%)',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 35%, rgba(180, 160, 130, 0.08) 0%, transparent 70%)',
        }}
      />

      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: '280px',
          height: '280px',
          left: '50%',
          top: '30%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200, 180, 150, 0.12) 0%, rgba(180, 160, 130, 0.06) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {raindrops.map((drop) => (
          <motion.div
            key={drop.id}
            className="absolute"
            style={{
              left: `${drop.x}%`,
              top: '-20px',
              width: `${drop.size}px`,
              height: `${20 + drop.size * 10}px`,
              background: `linear-gradient(180deg, transparent 0%, rgba(180, 200, 220, ${drop.opacity}) 50%, rgba(140, 170, 200, ${drop.opacity * 0.6}) 100%)`,
              borderRadius: '50%',
              filter: 'blur(0.5px)',
            }}
            animate={{
              y: ['0vh', '120vh'],
              opacity: [0, drop.opacity, drop.opacity, 0],
            }}
            transition={{
              duration: drop.duration,
              delay: drop.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(16, 17, 17, 0.5) 100%)',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <motion.button
        onClick={onBack}
        className="absolute top-14 left-5 z-50 w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        whileTap={{ scale: 0.95 }}
      >
        <X size={18} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
      </motion.button>

      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-8">
        <AnimatePresence mode="wait">
          {!isActive && !showCompletion && (
            <motion.div
              key="intro"
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1
                style={{
                  fontFamily: 'Georgia, serif',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '28px',
                  fontWeight: 400,
                  marginBottom: '12px',
                  letterSpacing: '-0.02em',
                }}
              >
                Rain Window
              </motion.h1>
              
              <motion.p
                style={{
                  fontFamily: 'Georgia, serif',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '15px',
                  fontWeight: 300,
                  lineHeight: 1.6,
                  maxWidth: '280px',
                  margin: '0 auto 40px',
                }}
              >
                Watch the rain fall.
                <br />
                Let your thoughts drift.
              </motion.p>

              <motion.button
                onClick={handleStart}
                className="px-10 py-4 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(180, 160, 130, 0.3) 0%, rgba(160, 140, 110, 0.2) 100%)',
                  border: '1px solid rgba(180, 160, 130, 0.3)',
                  backdropFilter: 'blur(10px)',
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: '16px',
                    fontWeight: 400,
                    letterSpacing: '0.02em',
                  }}
                >
                  Begin
                </span>
              </motion.button>
            </motion.div>
          )}

          {isActive && !showCompletion && (
            <motion.div
              key="active"
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            >
              <motion.div
                style={{
                  fontFamily: 'SF Pro Display, -apple-system, sans-serif',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '48px',
                  fontWeight: 200,
                  letterSpacing: '0.05em',
                  filter: 'blur(0.4px)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
              >
                {formatTime(remainingTime)}
              </motion.div>

              <motion.button
                onClick={handlePauseResume}
                className="mt-8 w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                whileTap={{ scale: 0.95 }}
              >
                {isPaused ? (
                  <Play size={20} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                ) : (
                  <Pause size={20} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                )}
              </motion.button>
            </motion.div>
          )}

          {showCompletion && (
            <motion.div
              key="completion"
              className="text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
            >
              <motion.h2
                style={{
                  fontFamily: 'Georgia, serif',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '26px',
                  fontWeight: 400,
                  marginBottom: '12px',
                }}
              >
                Session complete
              </motion.h2>
              <motion.p
                style={{
                  fontFamily: 'Georgia, serif',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '15px',
                  fontWeight: 300,
                }}
              >
                The rain continues, softly.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav
        activeScreen="activities"
        onNavigateHome={onReturnToChat}
        onNavigateActivities={onNavigateToActivities}
        onNavigateJournal={onNavigateToJournal}
        onNavigateProfile={onNavigateToProfile}
        onNavigateHelp={onNavigateToHelp}
        variant="neutral"
      />
    </div>
  );
}
