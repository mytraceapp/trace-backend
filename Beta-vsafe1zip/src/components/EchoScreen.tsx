import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from './BottomNav';

interface EchoScreenProps {
  onBack: () => void;
  onReturnToChat: () => void;
  onNavigateToActivities: () => void;
  onNavigateToJournal: () => void;
  onNavigateToProfile: () => void;
  onNavigateToHelp: () => void;
}

const LUNA_PALETTE = {
  charcoal: '#1a1d1a',
  sageGray: '#6b7c6b',
  midnightBlue: '#2d3a4a',
  beige: '#d4c4a8',
  sageMuted: '#4a5a4a',
  fogWhite: '#e8e4dc',
};

export default function EchoScreen({ 
  onBack, 
  onReturnToChat, 
  onNavigateToActivities, 
  onNavigateToJournal, 
  onNavigateToProfile, 
  onNavigateToHelp 
}: EchoScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const breathEnvelopeRef = useRef<number>(0); // Soft breath envelope for signature effect
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const audio = new Audio('/audio/trace-echo.mp3');
    audio.volume = 0;
    audio.loop = false;
    audio.crossOrigin = 'anonymous';
    audio.playbackRate = 0.88; // Start slower for gentle entry
    audioRef.current = audio;

    // Auto-navigate to chat 2 seconds after TRACE finishes speaking
    audio.onended = () => {
      setTimeout(() => {
        onReturnToChat();
      }, 2000);
    };

    // Start ambient music immediately when page loads
    const ambientAudio = new Audio('/audio/ambient-loop.mp3');
    ambientAudio.loop = true;
    ambientAudio.volume = 0;
    ambientAudio.playbackRate = 0.88;
    ambientAudioRef.current = ambientAudio;
    
    ambientAudio.play().then(() => {
      // Smooth fade in to fill the space
      let vol = 0;
      const fadeInterval = setInterval(() => {
        vol += 0.002;
        if (vol >= 0.10) {
          vol = 0.10;
          clearInterval(fadeInterval);
        }
        if (ambientAudioRef.current) ambientAudioRef.current.volume = vol;
      }, 30);
    }).catch(() => {});

    const setupAudioAnalyser = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    };

    const fadeIn = () => {
      let vol = 0.25; // Start at 25% so voice is present immediately
      if (audioRef.current) audioRef.current.volume = vol;
      const fadeInterval = setInterval(() => {
        vol += 0.003; // Smooth fade to full volume over ~10 seconds
        if (vol >= 0.95) {
          vol = 0.95;
          clearInterval(fadeInterval);
        }
        if (audioRef.current) audioRef.current.volume = vol;
      }, 40);

      // Gradually ease playback speed from 0.88 to 0.95 over first 18 seconds
      let currentRate = 0.88;
      const targetRate = 0.95;
      const rateEaseInterval = setInterval(() => {
        currentRate += 0.001;
        if (currentRate >= targetRate) {
          currentRate = targetRate;
          clearInterval(rateEaseInterval);
        }
        if (audioRef.current) audioRef.current.playbackRate = currentRate;
      }, 260);
    };

    // Delay TRACE's voice by 4 seconds, letting the music set the mood first
    const startTimeout = setTimeout(() => {
      setupAudioAnalyser();
      audio.play().then(fadeIn).catch(() => {});
    }, 4000);

    return () => {
      clearTimeout(startTimeout);
      if (audioRef.current) {
        let vol = audioRef.current.volume;
        const fadeInterval = setInterval(() => {
          vol -= 0.01; // Smooth fade out
          if (vol <= 0) {
            vol = 0;
            clearInterval(fadeInterval);
            audioRef.current?.pause();
            audioRef.current = null;
          } else if (audioRef.current) {
            audioRef.current.volume = vol;
          }
        }, 40);
      }
      // Fade out ambient soundtrack
      if (ambientAudioRef.current) {
        let vol = ambientAudioRef.current.volume;
        const fadeInterval = setInterval(() => {
          vol -= 0.01;
          if (vol <= 0) {
            clearInterval(fadeInterval);
            ambientAudioRef.current?.pause();
            ambientAudioRef.current = null;
          } else if (ambientAudioRef.current) {
            ambientAudioRef.current.volume = vol;
          }
        }, 30);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        setTimeout(() => {
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
          }
        }, 700);
      }
    };
  }, []);

  const handleExit = useCallback(() => {
    setIsExiting(true);
    if (audioRef.current) {
      let vol = audioRef.current.volume;
      const fadeInterval = setInterval(() => {
        vol -= 0.008; // Very smooth fade out on exit
        if (vol <= 0) {
          vol = 0;
          clearInterval(fadeInterval);
          audioRef.current?.pause();
        } else if (audioRef.current) {
          audioRef.current.volume = vol;
        }
      }, 20);
    }
    // Fade out ambient soundtrack on exit
    if (ambientAudioRef.current) {
      let vol = ambientAudioRef.current.volume;
      const fadeInterval = setInterval(() => {
        vol -= 0.005;
        if (vol <= 0) {
          clearInterval(fadeInterval);
          ambientAudioRef.current?.pause();
        } else if (ambientAudioRef.current) {
          ambientAudioRef.current.volume = vol;
        }
      }, 30);
    }
    setTimeout(() => {
      onBack();
    }, 2000);
  }, [onBack]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const verticalOffset = -40;

    const drawRadialGrid = (time: number) => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerX = width / 2;
      const centerY = height / 2 + verticalOffset;
      const maxRadius = Math.max(width, height) * 0.9;

      ctx.save();
      
      const gridPulse = 0.12 + Math.sin(time * 0.0002) * 0.03;
      
      for (let i = 1; i <= 12; i++) {
        const radius = (maxRadius / 12) * i;
        const breathe = 1 + Math.sin(time * 0.0003 + i * 0.15) * 0.015;
        const fadeOut = 1 - (i / 16);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * breathe, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(107, 124, 107, ${gridPulse * fadeOut})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2 + time * 0.00003;
        const fadeOut = 0.7;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(angle) * maxRadius,
          centerY + Math.sin(angle) * maxRadius
        );
        ctx.strokeStyle = `rgba(107, 124, 107, ${gridPulse * fadeOut * 0.6})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawOrb = (time: number, audioLevel: number) => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      if (width <= 0 || height <= 0) return;
      
      const centerX = width / 2;
      const centerY = height / 2 + verticalOffset;
      const safeAudioLevel = isNaN(audioLevel) ? 0 : audioLevel;

      const breathe = 1 + Math.sin(time * 0.00035) * 0.1;
      const audioReact = 1 + Math.min(safeAudioLevel * 0.12, 0.12); // Soft nudge, not jarring
      const baseRadius = Math.min(width, height) * 0.35;
      const radius = Math.max(1, baseRadius * breathe * audioReact);

      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius * 1.5
      );
      gradient.addColorStop(0, 'rgba(45, 58, 74, 0.36)');
      gradient.addColorStop(0.4, 'rgba(45, 58, 74, 0.23)');
      gradient.addColorStop(0.7, 'rgba(107, 124, 107, 0.13)');
      gradient.addColorStop(1, 'rgba(107, 124, 107, 0)');

      ctx.save();
      ctx.filter = 'blur(30px)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      const innerGlow = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius * 0.6
      );
      const glowIntensity = 0.22 + Math.min(safeAudioLevel * 0.1, 0.1); // Subtle glow response
      innerGlow.addColorStop(0, `rgba(212, 196, 168, ${glowIntensity})`);
      innerGlow.addColorStop(1, 'rgba(212, 196, 168, 0)');

      ctx.save();
      ctx.filter = 'blur(20px)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = innerGlow;
      ctx.fill();
      ctx.restore();
    };

    const drawWaveform = (time: number, audioLevel: number, frequencyData: Uint8Array | null) => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      if (width <= 0 || height <= 0) return;
      
      const centerY = height / 2 + verticalOffset;
      const safeAudio = isNaN(audioLevel) ? 0 : audioLevel;

      // Ultra-slow breath LFO (14 second cycle) - the signature
      const breathLFO = Math.sin(time * 0.00045) * 0.12 + 1;
      
      // Soft audio response - gentle nudge, not jarring reaction (capped at ±18%)
      const softAudioResponse = 1 + Math.min(safeAudio * 0.18, 0.18);

      // More wavy with longer wavelengths
      const layers = [
        { color: LUNA_PALETTE.midnightBlue, opacity: 0.85, amplitude: 65, frequency: 0.0025, speed: 0.00017, offset: 0, blur: 4 },
        { color: LUNA_PALETTE.sageGray, opacity: 0.78, amplitude: 55, frequency: 0.003, speed: 0.00022, offset: 1, blur: 2 },
        { color: LUNA_PALETTE.beige, opacity: 0.65, amplitude: 45, frequency: 0.0035, speed: 0.00028, offset: 2, blur: 1 },
        { color: LUNA_PALETTE.sageMuted, opacity: 0.72, amplitude: 58, frequency: 0.0028, speed: 0.00019, offset: 1.5, blur: 3 },
      ];

      layers.forEach((layer, layerIndex) => {
        ctx.save();
        
        const points: { x: number; y: number }[] = [];
        const segments = 150;

        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * width;
          const normalizedX = i / segments;

          // Gentle frequency modulation from audio (very subtle)
          const freqIndex = Math.floor((i / segments) * (frequencyData?.length || 1));
          const freqValue = frequencyData ? frequencyData[freqIndex] / 255 : 0;
          const gentleFreqNudge = 1 + freqValue * 0.08;
          
          // Slower, longer waves - meditative motion
          const wave1 = Math.sin(normalizedX * Math.PI * 2 * layer.frequency * 100 + time * layer.speed + layer.offset) * layer.amplitude;
          const wave2 = Math.sin(normalizedX * Math.PI * 1.5 * layer.frequency * 80 + time * layer.speed * 0.6 + layer.offset * 1.5) * layer.amplitude * 0.5;
          const wave3 = Math.sin(normalizedX * Math.PI * 2.5 * layer.frequency * 60 + time * layer.speed * 0.8 + layer.offset * 0.8) * layer.amplitude * 0.25;

          // Layer-specific slow breathing
          const layerBreathe = Math.sin(time * 0.00015 + layerIndex * 0.4) * 0.08 + 1;
          
          const envelope = Math.sin(normalizedX * Math.PI) * 0.8 + 0.2;
          
          // Combine: base waves * envelope * breath LFO * soft audio * layer breathe * gentle freq nudge
          const y = centerY + (wave1 + wave2 + wave3) * envelope * breathLFO * softAudioResponse * layerBreathe * gentleFreqNudge;
          points.push({ x, y });
        }

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length - 2; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }

        ctx.quadraticCurveTo(
          points[points.length - 2].x,
          points[points.length - 2].y,
          points[points.length - 1].x,
          points[points.length - 1].y
        );

        const gradient = ctx.createLinearGradient(0, centerY - 80, 0, centerY + 80);
        gradient.addColorStop(0, `${layer.color}00`);
        gradient.addColorStop(0.3, layer.color);
        gradient.addColorStop(0.7, layer.color);
        gradient.addColorStop(1, `${layer.color}00`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.globalAlpha = Math.min(layer.opacity + 0.1, 1);
        ctx.filter = `blur(${Math.max(layer.blur - 1, 0)}px)`;
        ctx.stroke();

        ctx.filter = 'none';
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = layer.opacity;
        ctx.stroke();

        ctx.restore();
      });

      ctx.save();
      const points: { x: number; y: number }[] = [];
      const segments = 120;

      const safeLevel = isNaN(audioLevel) ? 0 : audioLevel;
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * width;
        const normalizedX = i / segments;

        const audioBoost = 1 + safeLevel * 2.0;
        const wave = (Math.sin(normalizedX * Math.PI * 3 + time * 0.0004) * 40 +
                     Math.sin(normalizedX * Math.PI * 5 + time * 0.0003) * 25 +
                     Math.sin(normalizedX * Math.PI * 2 + time * 0.0005) * 30) * audioBoost;

        const envelope = Math.sin(normalizedX * Math.PI);
        const breathe = Math.sin(time * 0.00025) * 0.1 + 1;
        
        const y = centerY + wave * envelope * breathe;
        points.push({ x, y });
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 2; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }

      const coreGradient = ctx.createLinearGradient(0, centerY - 50, 0, centerY + 50);
      coreGradient.addColorStop(0, 'rgba(232, 228, 220, 0)');
      coreGradient.addColorStop(0.5, 'rgba(232, 228, 220, 0.5)');
      coreGradient.addColorStop(1, 'rgba(232, 228, 220, 0)');

      ctx.strokeStyle = coreGradient;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.75;
      ctx.stroke();
      ctx.restore();
    };

    const animate = (timestamp: number) => {
      timeRef.current = timestamp;
      
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      let audioLevel = 0;
      let frequencyData: Uint8Array | null = null;
      
      if (analyserRef.current && audioDataRef.current) {
        analyserRef.current.getByteFrequencyData(audioDataRef.current);
        frequencyData = audioDataRef.current;
        const sum = audioDataRef.current.reduce((a, b) => a + b, 0);
        const rawLevel = sum / (audioDataRef.current.length * 255);
        audioLevel = Math.min(1, rawLevel * 1.5);
      }

      // Signature "soft breath" envelope - slow attack (~1.5s), very slow release (~5s)
      const currentEnvelope = breathEnvelopeRef.current;
      const targetEnvelope = audioLevel;
      const attackRate = 0.008; // ~1.5 seconds to rise
      const releaseRate = 0.003; // ~5 seconds to fall
      
      if (targetEnvelope > currentEnvelope) {
        // Attack - voice is present, gently rise
        breathEnvelopeRef.current = currentEnvelope + (targetEnvelope - currentEnvelope) * attackRate;
      } else {
        // Release - voice fading, slowly drift down
        breathEnvelopeRef.current = currentEnvelope + (targetEnvelope - currentEnvelope) * releaseRate;
      }
      
      const breathEnvelope = breathEnvelopeRef.current;

      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = LUNA_PALETTE.charcoal;
      ctx.fillRect(0, 0, width, height);

      drawRadialGrid(timestamp);
      drawOrb(timestamp, breathEnvelope);
      drawWaveform(timestamp, breathEnvelope, frequencyData);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 z-50"
          style={{ backgroundColor: LUNA_PALETTE.charcoal }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-pointer"
            onClick={handleExit}
          />
          
          {/* TRACE Brand - top center */}
          <motion.div
            className="absolute z-20 w-full flex justify-center"
            style={{ top: '7%' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h1 style={{
              color: 'rgba(212, 196, 168, 0.5)',
              fontWeight: 300,
              letterSpacing: '0.8em',
              fontSize: '10px',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              paddingLeft: '0.8em',
            }}>
              TRACE
            </h1>
          </motion.div>
          <div className="absolute bottom-0 left-0 right-0 z-40" style={{
            background: 'linear-gradient(to top, rgba(42, 46, 42, 0.95) 0%, rgba(36, 40, 36, 0.85) 25%, rgba(30, 34, 30, 0.6) 50%, rgba(26, 29, 26, 0.3) 75%, rgba(26, 29, 26, 0) 100%)',
            paddingTop: '70px',
          }}>
            <BottomNav
              activeScreen="activities"
              onNavigateHome={onReturnToChat}
              onNavigateActivities={onNavigateToActivities}
              onNavigateJournal={onNavigateToJournal}
              onNavigateProfile={onNavigateToProfile}
              onNavigateHelp={onNavigateToHelp}
              variant="transparent"
              disableAnimation={true}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
