import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useEntries } from '../state/EntriesContext';

interface GroundingExperienceProps {
  onBack?: () => void;
  onComplete?: () => void;
  onReturnToChat?: () => void;
  onNavigateToActivities?: () => void;
  onNavigateToJournal?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHelp?: () => void;
}

interface StepData {
  number: string;
  instruction: string;
  hint: string;
}

const steps: StepData[] = [
  {
    number: '5',
    instruction: 'Look around. Name five things you can see.',
    hint: 'Let your eyes rest on simple details.',
  },
  {
    number: '4',
    instruction: 'Notice four sensations on your body.',
    hint: 'Fabric, temperature, the chair beneath you…',
  },
  {
    number: '3',
    instruction: 'Listen for three sounds around you.',
    hint: 'Near or far, loud or subtle.',
  },
  {
    number: '2',
    instruction: 'Identify two scents nearby.',
    hint: 'Or simply notice the air as it is.',
  },
  {
    number: '1',
    instruction: 'Notice the taste in your mouth.',
    hint: 'Whatever is present, without judgment.',
  },
];

export function GroundingExperience({ onBack, onComplete, onReturnToChat, onNavigateToActivities, onNavigateToJournal, onNavigateToProfile, onNavigateToHelp }: GroundingExperienceProps) {
  const { addSessionEntry } = useEntries();
  const [currentStep, setCurrentStep] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const hasSavedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);

  // Audio setup with slow playback and fade transitions
  useEffect(() => {
    const audio = new Audio('/grounding-ambient.mp3');
    audio.loop = true;
    audio.volume = 0;
    audio.playbackRate = 0.7; // Slowed down by ~30% for calmer feel
    audioRef.current = audio;

    // Fade in over 2 seconds
    audio.play().then(() => {
      let vol = 0;
      const fadeIn = setInterval(() => {
        vol += 0.02;
        if (vol >= 0.5) {
          audio.volume = 0.5;
          clearInterval(fadeIn);
        } else {
          audio.volume = vol;
        }
      }, 40); // 2 second fade in
      fadeIntervalRef.current = fadeIn as unknown as number;
    }).catch(() => {});

    return () => {
      // Fade out on unmount
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (audioRef.current) {
        const currentVol = audioRef.current.volume;
        let vol = currentVol;
        const fadeOut = setInterval(() => {
          vol -= 0.05;
          if (vol <= 0 || !audioRef.current) {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
            }
            clearInterval(fadeOut);
          } else {
            audioRef.current!.volume = vol;
          }
        }, 50);
      }
    };
  }, []);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-save entry when grounding completes
  useEffect(() => {
    if (showCompletion && !hasSavedRef.current) {
      hasSavedRef.current = true;
      addSessionEntry('Grounding', {
        title: 'Grounding – Present',
        body: 'You anchored yourself through 5-4-3-2-1 sensory awareness.',
        tags: ['grounding', 'mindfulness', 'sensory'],
        metadata: { duration: timeElapsed }
      });
    }
  }, [showCompletion, timeElapsed, addSessionEntry]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowCompletion(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleEndSession = () => {
    if (onReturnToChat) onReturnToChat();
    else if (onComplete) onComplete();
    else if (onBack) onBack();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentStepData = steps[currentStep];

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F8F6F3 25%, #F0EDE8 50%, #E8E4DF 75%, #E0DCD7 100%)',
      }}
    >
      {/* Ambient glow base */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.5) 0%, transparent 60%)',
        }}
      />

      {/* Central soft glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '400px',
          height: '400px',
          left: '50%',
          top: '50%',
          marginLeft: '-200px',
          marginTop: '-200px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(248, 246, 243, 0.4) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.7, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* TRACE Brand Name - fixed position below camera earpiece */}
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
          }}
        >
          TRACE
        </h1>
      </motion.div>

      {/* Top UI Bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-6 z-20">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300"
          style={{
            background: 'rgba(255, 255, 255, 0.35)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          }}
        >
          <ArrowLeft size={18} style={{ color: '#A49485', strokeWidth: 2 }} />
        </button>

        {/* Timer */}
        <div
          className="px-5 py-2.5 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.35)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(220, 226, 216, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            fontFamily: 'Georgia, serif',
            fontSize: '13px',
            fontWeight: 300,
            color: '#8DA18F',
            letterSpacing: '0.05em',
            filter: 'blur(0.4px)',
          }}
        >
          {formatTime(timeElapsed)}
        </div>
      </div>

      {/* Main Content - Steps */}
      <AnimatePresence mode="wait">
        {!showCompletion && (
          <motion.div
            key={currentStep}
            className="absolute inset-0 flex flex-col items-center justify-center px-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {/* Large Number with subtle glow */}
            <motion.div
              className="relative mb-8"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              {/* Glow behind number */}
              <div
                className="absolute inset-0"
                style={{
                  filter: 'blur(40px)',
                  opacity: 0.3,
                  transform: 'scale(1.5)',
                }}
              >
                <div
                  style={{
                    width: '180px',
                    height: '180px',
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%)',
                  }}
                />
              </div>

              {/* Number */}
              <div
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '140px',
                  fontWeight: 300,
                  color: '#A49485',
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                  textShadow: '0 2px 30px rgba(164, 148, 133, 0.2)',
                  WebkitTextStroke: '1px rgba(164, 148, 133, 0.37)',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {currentStepData.number}
              </div>
            </motion.div>

            {/* Instruction Text */}
            <motion.div
              className="text-center mb-4 max-w-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '20px',
                fontWeight: 300,
                color: '#8DA18F',
                letterSpacing: '0.06em',
                lineHeight: '1.6',
              }}
            >
              {currentStepData.instruction}
            </motion.div>

            {/* Hint Text */}
            <motion.div
              className="text-center max-w-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                fontWeight: 300,
                color: '#8B7E74',
                letterSpacing: '0.05em',
                lineHeight: '1.5',
                opacity: 0.8,
              }}
            >
              {currentStepData.hint}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Screen */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center px-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            {/* Central glow for completion */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(248, 246, 243, 0.5) 50%, transparent 70%)',
                filter: 'blur(60px)',
              }}
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.6, 0.9, 0.6],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Main completion text */}
            <motion.div
              className="text-center mb-6 relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '32px',
                fontWeight: 300,
                color: '#8DA18F',
                letterSpacing: '0.08em',
                textShadow: '0 2px 20px rgba(255, 255, 255, 0.8)',
              }}
            >
              You're here now.
            </motion.div>

            {/* Subtext */}
            <motion.div
              className="text-center max-w-xs relative z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '15px',
                fontWeight: 300,
                color: '#A49485',
                letterSpacing: '0.05em',
                lineHeight: '1.6',
              }}
            >
              Your mind has returned to the present moment.
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Dots - Bottom Center */}
      {!showCompletion && (
        <div className="absolute bottom-44 left-0 right-0 flex items-center justify-center gap-2 z-20">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className="rounded-full"
              style={{
                width: index === currentStep ? '10px' : '7px',
                height: index === currentStep ? '10px' : '7px',
                background:
                  index <= currentStep
                    ? index % 2 === 0
                      ? '#8DA18F'
                      : '#A49485'
                    : 'rgba(164, 148, 133, 0.25)',
                transition: 'all 0.3s ease',
                boxShadow:
                  index === currentStep
                    ? '0 0 12px rgba(141, 161, 143, 0.4)'
                    : 'none',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
            />
          ))}
        </div>
      )}

      {/* Navigation Buttons - Bottom */}
      <div className="absolute bottom-28 left-0 right-0 flex items-center justify-center gap-4 px-8 z-20">
        {!showCompletion && (
          <>
            {/* Back Button (only show if not on first step) */}
            {currentStep > 0 && (
              <motion.button
                onClick={handleBack}
                className="px-6 py-3 rounded-full transition-all duration-300"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.35)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(220, 226, 216, 0.3)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  fontWeight: 300,
                  color: '#8B7E74',
                  letterSpacing: '0.06em',
                }}
              >
                Previous
              </motion.button>
            )}

            {/* Next Button */}
            <motion.button
              onClick={handleNext}
              className="px-8 py-3 rounded-full transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'rgba(220, 226, 216, 0.3)',
                backdropFilter: 'blur(30px)',
                border: '1px solid rgba(141, 161, 143, 0.4)',
                boxShadow: '0 8px 32px rgba(141, 161, 143, 0.15)',
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                fontWeight: 300,
                color: '#8DA18F',
                letterSpacing: '0.06em',
              }}
            >
              {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
            </motion.button>
          </>
        )}

        {/* End Session Button on Completion */}
        {showCompletion && (
          <motion.button
            onClick={handleEndSession}
            className="px-10 py-3.5 rounded-full transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(30px)',
              border: '1px solid rgba(141, 161, 143, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              fontFamily: 'Georgia, serif',
              fontSize: '14px',
              fontWeight: 300,
              color: '#A49485',
              letterSpacing: '0.08em',
            }}
          >
            End Session
          </motion.button>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <BottomNav
          activeScreen="activities"
          onNavigateHome={onReturnToChat}
          onNavigateActivities={onNavigateToActivities}
          onNavigateJournal={onNavigateToJournal}
          onNavigateProfile={onNavigateToProfile}
          onNavigateHelp={onNavigateToHelp}
          variant="sage-fixed"
        />
      </div>
    </div>
  );
}