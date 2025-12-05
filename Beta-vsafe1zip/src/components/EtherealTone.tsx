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
        gain.gain.linearRampToValueAtTime(maxGain * 0.2, now + startTime + duration * 0.2);
        gain.gain.linearRampToValueAtTime(maxGain, now + startTime + duration * 0.45);
        gain.gain.setValueAtTime(maxGain, now + startTime + duration * 0.55);
        gain.gain.exponentialRampToValueAtTime(maxGain * 0.5, now + startTime + duration * 0.75);
        gain.gain.exponentialRampToValueAtTime(maxGain * 0.15, now + startTime + duration * 0.9);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startTime + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.start(now + startTime);
        osc.stop(now + startTime + duration + 0.5);
      };
      
      createSoftPad(110.00, 0, 10, 0.04);
      createSoftPad(130.81, 0.2, 9.8, 0.045);
      createSoftPad(164.81, 0.5, 9.5, 0.04);
      createSoftPad(196.00, 0.9, 9.1, 0.038);
      createSoftPad(220.00, 1.4, 8.6, 0.035);
      createSoftPad(261.63, 2.0, 8, 0.035);
      createSoftPad(293.66, 2.6, 7.4, 0.032);
      createSoftPad(329.63, 3.3, 6.7, 0.03);
      createSoftPad(392.00, 4.0, 6, 0.028);
      createSoftPad(440.00, 4.8, 5.2, 0.025);
      createSoftPad(493.88, 5.5, 4.5, 0.022);
      createSoftPad(523.25, 6.2, 3.8, 0.02);
    };

    playAwakeningTone();

    return () => {
      setTimeout(() => {
        audioContext.close();
      }, 12000);
    };
  }, [trigger]);

  return null;
}