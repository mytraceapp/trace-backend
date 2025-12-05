import { useEffect } from 'react';

interface EtherealToneProps {
  trigger: boolean;
}

export function EtherealTone({ trigger }: EtherealToneProps) {
  useEffect(() => {
    if (!trigger) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a mellow "hello" tone - friendly and simple
    const playHello = () => {
      const now = audioContext.currentTime;
      const duration = 3.5; // Match the orb rising animation
      
      // Whisper-soft melody - very gentle and calming
      const notes = [
        { freq: 261.63, time: 0, gain: 0.08 }, // C4 - quieter first note
        { freq: 523.25, time: 1.0, gain: 0.10 }, // C5
        { freq: 659.25, time: 2.0, gain: 0.09 }, // E5
        { freq: 783.99, time: 3.0, gain: 0.08 }, // G5
      ];
      
      // Create whisper-soft tone with very gentle fade-in
      notes.forEach(({ freq, time, gain }) => {
        // Fundamental frequency - pure, gentle tone
        const fundamental = audioContext.createOscillator();
        fundamental.frequency.setValueAtTime(freq, now + time);
        fundamental.type = 'sine';
        
        const fundamentalGain = audioContext.createGain();
        fundamentalGain.gain.setValueAtTime(0, now + time);
        fundamentalGain.gain.linearRampToValueAtTime(gain, now + time + 0.06); // Very soft fade-in
        fundamentalGain.gain.exponentialRampToValueAtTime(gain * 0.5, now + time + 0.15); // Gentle hold
        fundamentalGain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.6); // Soft fade-out
        
        fundamental.connect(fundamentalGain);
        fundamentalGain.connect(audioContext.destination);
        fundamental.start(now + time);
        fundamental.stop(now + time + 0.6);
      });
    };

    playHello();

    return () => {
      audioContext.close();
    };
  }, [trigger]);

  return null;
}