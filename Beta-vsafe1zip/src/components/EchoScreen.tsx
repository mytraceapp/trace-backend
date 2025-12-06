import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';

interface EchoScreenProps {
  onBack: () => void;
}

const LUNA_PALETTE = {
  charcoal: '#1a1d1a',
  sageGray: '#6b7c6b',
  midnightBlue: '#2d3a4a',
  beige: '#d4c4a8',
  sageMuted: '#4a5a4a',
  fogWhite: '#e8e4dc',
};

export default function EchoScreen({ onBack }: EchoScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const [isExiting, setIsExiting] = useState(false);

  const handleExit = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onBack();
    }, 600);
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

    const drawRadialGrid = (time: number) => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.max(width, height) * 0.7;

      ctx.save();
      
      const gridPulse = 0.03 + Math.sin(time * 0.0002) * 0.01;
      
      for (let i = 1; i <= 8; i++) {
        const radius = (maxRadius / 8) * i;
        const breathe = 1 + Math.sin(time * 0.0003 + i * 0.2) * 0.02;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * breathe, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(107, 124, 107, ${gridPulse * (1 - i * 0.1)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + time * 0.00005;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(angle) * maxRadius,
          centerY + Math.sin(angle) * maxRadius
        );
        ctx.strokeStyle = `rgba(107, 124, 107, ${gridPulse * 0.5})`;
        ctx.lineWidth = 0.3;
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawOrb = (time: number) => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerX = width / 2;
      const centerY = height / 2;

      const breathe = 1 + Math.sin(time * 0.0004) * 0.08;
      const baseRadius = Math.min(width, height) * 0.25;
      const radius = baseRadius * breathe;

      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius * 1.5
      );
      gradient.addColorStop(0, 'rgba(45, 58, 74, 0.20)');
      gradient.addColorStop(0.4, 'rgba(45, 58, 74, 0.12)');
      gradient.addColorStop(0.7, 'rgba(107, 124, 107, 0.06)');
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
      innerGlow.addColorStop(0, 'rgba(212, 196, 168, 0.10)');
      innerGlow.addColorStop(1, 'rgba(212, 196, 168, 0)');

      ctx.save();
      ctx.filter = 'blur(20px)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = innerGlow;
      ctx.fill();
      ctx.restore();
    };

    const drawWaveform = (time: number) => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerY = height / 2;

      const layers = [
        { color: LUNA_PALETTE.midnightBlue, opacity: 0.4, amplitude: 60, frequency: 0.008, speed: 0.0003, offset: 0, blur: 8 },
        { color: LUNA_PALETTE.sageGray, opacity: 0.35, amplitude: 45, frequency: 0.012, speed: 0.0004, offset: 1, blur: 5 },
        { color: LUNA_PALETTE.beige, opacity: 0.25, amplitude: 35, frequency: 0.015, speed: 0.0005, offset: 2, blur: 3 },
        { color: LUNA_PALETTE.sageMuted, opacity: 0.3, amplitude: 50, frequency: 0.01, speed: 0.00035, offset: 1.5, blur: 6 },
      ];

      layers.forEach((layer, layerIndex) => {
        ctx.save();
        
        const points: { x: number; y: number }[] = [];
        const segments = 100;

        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * width;
          const normalizedX = i / segments;

          const wave1 = Math.sin(normalizedX * Math.PI * 4 * layer.frequency * 100 + time * layer.speed + layer.offset) * layer.amplitude;
          const wave2 = Math.sin(normalizedX * Math.PI * 2 * layer.frequency * 80 + time * layer.speed * 0.7 + layer.offset * 1.5) * layer.amplitude * 0.6;
          const wave3 = Math.sin(normalizedX * Math.PI * 6 * layer.frequency * 60 + time * layer.speed * 1.2 + layer.offset * 0.8) * layer.amplitude * 0.3;

          const breathe = Math.sin(time * 0.0002 + layerIndex * 0.5) * 0.15 + 1;
          
          const envelope = Math.sin(normalizedX * Math.PI) * 0.8 + 0.2;
          
          const y = centerY + (wave1 + wave2 + wave3) * envelope * breathe;
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
        ctx.lineWidth = 2;
        ctx.globalAlpha = layer.opacity;
        ctx.filter = `blur(${layer.blur}px)`;
        ctx.stroke();

        ctx.filter = 'none';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = layer.opacity * 0.8;
        ctx.stroke();

        ctx.restore();
      });

      ctx.save();
      const points: { x: number; y: number }[] = [];
      const segments = 120;

      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * width;
        const normalizedX = i / segments;

        const wave = Math.sin(normalizedX * Math.PI * 3 + time * 0.0004) * 40 +
                     Math.sin(normalizedX * Math.PI * 5 + time * 0.0003) * 25 +
                     Math.sin(normalizedX * Math.PI * 2 + time * 0.0005) * 30;

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
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.restore();
    };

    const animate = (timestamp: number) => {
      timeRef.current = timestamp;
      
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = LUNA_PALETTE.charcoal;
      ctx.fillRect(0, 0, width, height);

      drawRadialGrid(timestamp);
      drawOrb(timestamp);
      drawWaveform(timestamp);

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
            className="absolute inset-0 w-full h-full"
          />

          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            onClick={handleExit}
            className="absolute top-14 left-6 z-10 p-3 rounded-full"
            style={{ 
              backgroundColor: 'rgba(107, 124, 107, 0.2)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <ArrowLeft size={20} color={LUNA_PALETTE.fogWhite} strokeWidth={1.5} />
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            onClick={handleExit}
            className="absolute top-14 right-6 z-10 p-3 rounded-full"
            style={{ 
              backgroundColor: 'rgba(107, 124, 107, 0.2)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <X size={20} color={LUNA_PALETTE.fogWhite} strokeWidth={1.5} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
