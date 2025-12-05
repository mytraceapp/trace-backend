import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  delay?: number;
  speed?: number;
}

export function TypewriterText({ text, delay = 800, speed = 80 }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [started, setStarted] = useState(false);

  // Function to play a subtle beep sound
  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 520; // Softer, warmer frequency
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.03, audioContext.currentTime); // Much quieter volume
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.03);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.03); // Shorter duration
    } catch (error) {
      // Silently fail if audio context is not available
    }
  };

  useEffect(() => {
    // Initial delay before typing starts
    const startTimer = setTimeout(() => {
      setStarted(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
        playBeep(); // Play beep when character is typed
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed, started]);

  return (
    <p className="text-center whitespace-nowrap" style={{ 
      color: '#3A493F',
      fontSize: '16px',
      fontWeight: 300,
      letterSpacing: '-0.01em',
      lineHeight: '1.5',
      minHeight: '24px',
      opacity: 0.9,
    }}>
      {displayedText}
      {currentIndex < text.length && started && (
        <span className="inline-block w-[2px] h-[16px] bg-current ml-[2px] animate-pulse" style={{ opacity: 0.4 }} />
      )}
    </p>
  );
}