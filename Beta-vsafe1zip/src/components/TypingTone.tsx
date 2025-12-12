import { useEffect, useRef } from 'react';

interface TypingToneProps {
  playing: boolean;
  currentChar?: string;
}

export function TypingTone({ playing, currentChar }: TypingToneProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastCharRef = useRef<string | undefined>(undefined);

  // Initialize audio context once
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!playing || !currentChar || currentChar === '…') return;
    if (lastCharRef.current === currentChar) return;
    lastCharRef.current = currentChar;

    // Create or resume audio context
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const now = audioContext.currentTime;
    
    // Laptop key click - short, crisp, modern
    const bufferSize = audioContext.sampleRate * 0.05;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.max(0, 1 - (i / bufferSize) * 20);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    
    const noiseGain = audioContext.createGain();
    // Chimes/event sounds - never peak louder than -3 dB (0.7)
    noiseGain.gain.setValueAtTime(0.04 + Math.random() * 0.02, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800 + Math.random() * 1200, now);
    filter.Q.setValueAtTime(4, now);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noise.start(now);
    
    // Subtle low-end click
    const click = audioContext.createOscillator();
    click.frequency.setValueAtTime(220 + Math.random() * 60, now);
    click.type = 'triangle';
    
    const clickGain = audioContext.createGain();
    // Keep click subtle - well under -3 dB peak
    clickGain.gain.setValueAtTime(0.015, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    
    click.connect(clickGain);
    clickGain.connect(audioContext.destination);
    click.start(now);
    click.stop(now + 0.02);
  }, [playing, currentChar]);

  return null;
}
