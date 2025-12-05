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
        filter.frequency.setValueAtTime(600, now + startTime);
        filter.frequency.linearRampToValueAtTime(900, now + startTime + duration * 0.5);
        filter.frequency.linearRampToValueAtTime(400, now + startTime + duration);
        filter.Q.setValueAtTime(0.7, now + startTime);
        
        gain.gain.setValueAtTime(0, now + startTime);
        gain.gain.linearRampToValueAtTime(maxGain * 0.3, now + startTime + duration * 0.15);
        gain.gain.linearRampToValueAtTime(maxGain, now + startTime + duration * 0.4);
        gain.gain.setValueAtTime(maxGain, now + startTime + duration * 0.6);
        gain.gain.exponentialRampToValueAtTime(maxGain * 0.3, now + startTime + duration * 0.85);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startTime + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start(now + startTime);
        osc.stop(now + startTime + duration + 0.1);
      };
      
      createSoftPad(130.81, 0, 8, 0.05);
      createSoftPad(174.61, 0.3, 7.7, 0.045);
      createSoftPad(196.00, 0.8, 7.2, 0.04);
      createSoftPad(261.63, 1.2, 6.8, 0.04);
      createSoftPad(293.66, 1.8, 6.2, 0.035);
      createSoftPad(329.63, 2.5, 5.5, 0.035);
      createSoftPad(392.00, 3.2, 4.8, 0.03);
      createSoftPad(440.00, 4.0, 4, 0.025);
      createSoftPad(523.25, 4.8, 3.2, 0.02);
    };

    playAwakeningTone();

    return () => {
      setTimeout(() => {
        audioContext.close();
      }, 9000);
    };
  }, [trigger]);

  return null;
}