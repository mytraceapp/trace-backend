import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  generateMaze,
  MazeData,
  mazeToSvgPath,
  getPointOnPath,
} from '../utils/mazeGenerator';

interface InteractiveMazeProps {
  width?: number;
  height?: number;
  cellSize?: number;
  padding?: number;
  onComplete?: () => void;
  onProgressChange?: (progress: number) => void;
}

export function InteractiveMaze({
  width = 10,
  height = 13,
  cellSize = 20,
  padding = 10,
  onComplete,
  onProgressChange,
}: InteractiveMazeProps) {
  const [maze, setMaze] = useState<MazeData | null>(null);
  const [progress, setProgress] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [isTracing, setIsTracing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showOffPath, setShowOffPath] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const offPathTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const svgWidth = useMemo(() => width * cellSize + padding * 2, [width, cellSize, padding]);
  const svgHeight = useMemo(() => height * cellSize + padding * 2, [height, cellSize, padding]);

  useEffect(() => {
    const newMaze = generateMaze(width, height);
    setMaze(newMaze);
    setProgress(0);
    setSmoothProgress(0);
    setIsCompleted(false);
  }, [width, height]);

  useEffect(() => {
    const diff = progress - smoothProgress;
    if (Math.abs(diff) > 0.001) {
      const animationId = requestAnimationFrame(() => {
        setSmoothProgress(prev => prev + diff * 0.12);
      });
      return () => cancelAnimationFrame(animationId);
    }
  }, [progress, smoothProgress]);

  const mazePath = useMemo(() => {
    if (!maze) return '';
    return mazeToSvgPath(maze, cellSize, padding);
  }, [maze, cellSize, padding]);

  const orbPosition = useMemo(() => {
    if (!maze) return { x: padding + cellSize / 2, y: padding + cellSize / 2 };
    return getPointOnPath(maze, smoothProgress, cellSize, padding);
  }, [maze, smoothProgress, cellSize, padding]);

  const endPosition = useMemo(() => {
    if (!maze) return { x: 0, y: 0 };
    return {
      x: padding + maze.end.x * cellSize + cellSize / 2,
      y: padding + maze.end.y * cellSize + cellSize / 2,
    };
  }, [maze, cellSize, padding]);

  const getSvgCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      if (!svgRef.current) return null;

      const rect = svgRef.current.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return null;
      }

      return {
        x: ((clientX - rect.left) / rect.width) * svgWidth,
        y: ((clientY - rect.top) / rect.height) * svgHeight,
      };
    },
    [svgWidth, svgHeight]
  );

  const findClosestProgressOnPath = useCallback(
    (x: number, y: number): { progress: number; distance: number } => {
      if (!maze || !pathRef.current) return { progress: 0, distance: Infinity };

      const pathLength = pathRef.current.getTotalLength();
      let closestDistance = Infinity;
      let closestProgress = 0;

      for (let i = 0; i <= pathLength; i += 2) {
        const point = pathRef.current.getPointAtLength(i);
        const dx = point.x - x;
        const dy = point.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestProgress = i / pathLength;
        }
      }

      return { progress: closestProgress, distance: closestDistance };
    },
    [maze]
  );

  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (isCompleted) return;

      const coords = getSvgCoordinates(e);
      if (!coords) return;

      const { progress: closestProgress, distance } = findClosestProgressOnPath(
        coords.x,
        coords.y
      );

      if (distance < 35 && closestProgress < 0.1) {
        setIsTracing(true);
        setProgress(0);
        setSmoothProgress(0);
      } else if (distance < 35) {
        const distToOrb = Math.sqrt(
          Math.pow(coords.x - orbPosition.x, 2) + Math.pow(coords.y - orbPosition.y, 2)
        );
        if (distToOrb < 35) {
          setIsTracing(true);
        }
      }
    },
    [getSvgCoordinates, findClosestProgressOnPath, isCompleted, orbPosition]
  );

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isTracing || isCompleted) return;

      const coords = getSvgCoordinates(e);
      if (!coords) return;

      const { progress: closestProgress, distance } = findClosestProgressOnPath(
        coords.x,
        coords.y
      );

      const tolerance = 32;

      if (distance > tolerance) {
        if (!showOffPath && !offPathTimeoutRef.current) {
          setShowOffPath(true);
          offPathTimeoutRef.current = setTimeout(() => {
            setShowOffPath(false);
            offPathTimeoutRef.current = null;
          }, 300);
        }
        return;
      }

      if (closestProgress > progress) {
        const maxJump = 0.2;
        const newProgress = Math.min(closestProgress, progress + maxJump);
        setProgress(newProgress);
        onProgressChange?.(newProgress);

        if (newProgress > 0.92) {
          setIsCompleted(true);
          setIsTracing(false);
          setProgress(1);
          setSmoothProgress(1);
          onComplete?.();
        }
      }
    },
    [
      isTracing,
      isCompleted,
      getSvgCoordinates,
      findClosestProgressOnPath,
      progress,
      showOffPath,
      onProgressChange,
      onComplete,
    ]
  );

  const handleEnd = useCallback(() => {
    setIsTracing(false);
  }, []);

  useEffect(() => {
    return () => {
      if (offPathTimeoutRef.current) {
        clearTimeout(offPathTimeoutRef.current);
      }
    };
  }, []);

  const trailSegments = useMemo(() => {
    if (!pathRef.current || smoothProgress < 0.01) return [];
    
    const pathLength = pathRef.current.getTotalLength();
    const trailLengthPercent = 0.18;
    const numSegments = 10;
    const segments = [];
    
    const trailStart = Math.max(0, smoothProgress - trailLengthPercent);
    const segmentSize = (smoothProgress - trailStart) / numSegments;
    
    for (let i = 0; i < numSegments; i++) {
      const segStart = trailStart + (i * segmentSize);
      const segEnd = trailStart + ((i + 1) * segmentSize);
      const t = (i + 1) / numSegments;
      const easedOpacity = t * t * (3 - 2 * t);
      const opacity = easedOpacity * 0.92;
      
      segments.push({
        start: segStart * pathLength,
        end: segEnd * pathLength,
        length: (segEnd - segStart) * pathLength,
        opacity,
        hasGlow: i >= numSegments - 3,
      });
    }
    
    return segments;
  }, [smoothProgress]);

  if (!maze) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: svgWidth, height: svgHeight }}
      >
        <div className="animate-pulse text-[#6B8E6B]">Loading...</div>
      </div>
    );
  }

  const pathLength = pathRef.current?.getTotalLength() || 1000;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      style={{
        cursor: isTracing ? 'grabbing' : 'pointer',
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
    >
      <defs>
        <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(107, 142, 107, 0.55)" />
          <stop offset="50%" stopColor="rgba(95, 130, 100, 0.5)" />
          <stop offset="100%" stopColor="rgba(85, 120, 90, 0.45)" />
        </linearGradient>

        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="trailGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="trailGlowStrong" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="trailGlowSoft" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        ref={pathRef}
        d={mazePath}
        fill="none"
        stroke="url(#pathGradient)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: 'drop-shadow(0 3px 8px rgba(85, 120, 90, 0.3))',
        }}
      />

      {trailSegments.map((segment, index) => {
        const isNearOrb = index >= trailSegments.length - 2;
        const isMidTrail = index >= trailSegments.length - 5 && index < trailSegments.length - 2;
        const glowFilter = isNearOrb 
          ? 'url(#trailGlowStrong)' 
          : isMidTrail 
            ? 'url(#trailGlow)' 
            : segment.opacity > 0.3 
              ? 'url(#trailGlowSoft)' 
              : 'none';
        
        return (
          <path
            key={index}
            d={mazePath}
            fill="none"
            stroke={`rgba(200, 220, 200, ${segment.opacity})`}
            strokeWidth={isNearOrb ? "13" : "12"}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: `${segment.length + 2} ${pathLength}`,
              strokeDashoffset: -segment.start,
              filter: glowFilter,
            }}
          />
        );
      })}

      <motion.circle
        cx={endPosition.x}
        cy={endPosition.y}
        r="7"
        fill="rgba(107, 142, 107, 0.35)"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.35, 0.55, 0.35],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <circle
        cx={endPosition.x}
        cy={endPosition.y}
        r="3.5"
        fill="rgba(95, 130, 100, 0.6)"
      />

      <motion.circle
        cx={orbPosition.x}
        cy={orbPosition.y}
        r="12"
        fill="none"
        stroke="rgba(180, 205, 185, 0.3)"
        strokeWidth="1.5"
        animate={{
          scale: [0.9, 1.25, 0.9],
          opacity: [0.35, 0.12, 0.35],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.circle
        cx={orbPosition.x}
        cy={orbPosition.y}
        r="7"
        fill="#EDE8DB"
        filter="url(#softGlow)"
        style={{
          filter: 'drop-shadow(0 0 9px rgba(180, 205, 185, 0.8)) drop-shadow(0 0 18px rgba(107, 142, 107, 0.35))',
        }}
        animate={
          showOffPath
            ? { x: [0, -2, 2, -2, 0], opacity: [1, 0.75, 1] }
            : isCompleted
            ? { scale: [1, 1.25, 1], opacity: [1, 0.9, 1] }
            : { scale: [1, 1.06, 1], opacity: [0.95, 1, 0.95] }
        }
        transition={
          showOffPath
            ? { duration: 0.25, ease: 'easeInOut' }
            : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
        }
      />

      {isCompleted && (
        <motion.circle
          cx={orbPosition.x}
          cy={orbPosition.y}
          r="16"
          fill="none"
          stroke="rgba(180, 205, 185, 0.55)"
          strokeWidth="1.5"
          initial={{ scale: 0.8, opacity: 0.65 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
    </svg>
  );
}
