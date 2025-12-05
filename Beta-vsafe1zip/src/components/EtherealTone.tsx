import { useEffect } from 'react';

interface EtherealToneProps {
  trigger: boolean;
}

export function EtherealTone({ trigger }: EtherealToneProps) {
  useEffect(() => {
    if (!trigger) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playAwakeningTone = () => {
      const now = audioContext.currentTime;
      
      const createSoftPad = (freq: number, startTime: number, duration: number, maxGain: number) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + startTime);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now + startTime);
        filter.frequency.linearRampToValueAtTime(700, now + startTime + duration * 0.4);
        filter.frequency.linearRampToValueAtTime(500, now + startTime + duration * 0.7);
        filter.frequency.linearRampToValueAtTime(300, now + startTime + duration);
        filter.Q.setValueAtTime(0.5, now + startTime);
        
        gain.gain.setValueAtTime(0, now + startTime);
        gain.gain.linearRampToValueAtTime(maxGain * 0.35, now + startTime + duration * 0.08);
        gain.gain.linearRampToValueAtTime(maxGain * 0.55, now + startTime + duration * 0.2);
        gain.gain.linearRampToValueAtTime(maxGain * 0.85, now + startTime + duration * 0.5);
        gain.gain.setValueAtTime(maxGain * 0.85, now + startTime + duration * 0.55);
        gain.gain.exponentialRampToValueAtTime(maxGain * 0.5, now + startTime + duration * 0.75);
        gain.gain.exponentialRampToValueAtTime(maxGain * 0.15, now + startTime + duration * 0.9);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startTime + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start(now + startTime);
        osc.stop(now + startTime + duration + 0.5);
      };
      
      createSoftPad(130.81, 0, 8, 0.055);
      createSoftPad(196.00, 0, 8, 0.05);
      createSoftPad(261.63, 0, 8, 0.045);
      createSoftPad(329.63, 0.1, 7.5, 0.04);
      createSoftPad(392.00, 0.1, 7.5, 0.035);
    };

    playAwakeningTone();

    return () => {
      setTimeout(() => {
        audioContext.close();
      }, 10000);
    };
  }, [trigger]);

  return null;
}