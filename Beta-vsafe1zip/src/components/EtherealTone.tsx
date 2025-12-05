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
        filter.frequency.setValueAtTime(800, now + startTime);
        filter.Q.setValueAtTime(1, now + startTime);
        
        gain.gain.setValueAtTime(0, now + startTime);
        gain.gain.linearRampToValueAtTime(maxGain, now + startTime + duration * 0.3);
        gain.gain.setValueAtTime(maxGain, now + startTime + duration * 0.7);
        gain.gain.linearRampToValueAtTime(maxGain * 0.6, now + startTime + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start(now + startTime);
        osc.stop(now + startTime + duration);
      };
      
      createSoftPad(174.61, 0, 6, 0.06);
      createSoftPad(261.63, 0.5, 5.5, 0.05);
      createSoftPad(329.63, 1.0, 5, 0.04);
      createSoftPad(392.00, 1.5, 4.5, 0.04);
      createSoftPad(440.00, 2.5, 3.5, 0.03);
      createSoftPad(523.25, 3.5, 2.5, 0.03);
    };

    playAwakeningTone();

    return () => {
      setTimeout(() => {
        audioContext.close();
      }, 7000);
    };
  }, [trigger]);

  return null;
}