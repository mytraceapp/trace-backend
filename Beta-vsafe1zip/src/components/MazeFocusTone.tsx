import { useEffect, useRef } from 'react';
import { audioManager } from '../lib/audioManager';

interface MazeFocusToneProps {
  isPlaying: boolean;
  volume?: number;
}

let mazeInstanceCounter = 0;

export function MazeFocusTone({ isPlaying, volume = 0.35 }: MazeFocusToneProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainsRef = useRef<GainNode[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const instanceIdRef = useRef<string>('');

  useEffect(() => {
    if (isPlaying) {
      mazeInstanceCounter++;
      const instanceId = `maze-${mazeInstanceCounter}`;
      instanceIdRef.current = instanceId;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Register with audio manager - stops any other audio sources
      audioManager.register(
        instanceId,
        audioContext,
        () => {
          oscillatorsRef.current.forEach(osc => { try { osc.stop(); } catch (e) {} });
          if (lfoRef.current) { try { lfoRef.current.stop(); } catch (e) {} }
        },
        'activity'
      );

      const masterGain = audioContext.createGain();
      masterGain.gain.setValueAtTime(0, audioContext.currentTime);
      masterGain.connect(audioContext.destination);
      masterGainRef.current = masterGain;

      const createFocusPad = (freq: number, gain: number, detune: number = 0) => {
        const osc = audioContext.createOscillator();
        const oscGain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioContext.currentTime);
        osc.detune.setValueAtTime(detune, audioContext.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, audioContext.currentTime);
        filter.Q.setValueAtTime(0.7, audioContext.currentTime);

        oscGain.gain.setValueAtTime(gain, audioContext.currentTime);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(masterGain);

        osc.start();
        oscillatorsRef.current.push(osc);
        gainsRef.current.push(oscGain);

        return { osc, oscGain, filter };
      };

      createFocusPad(68.68, 0.08);
      createFocusPad(102.90, 0.07, 3);
      createFocusPad(137.35, 0.065, -2);
      createFocusPad(205.80, 0.055, 5);
      createFocusPad(274.71, 0.045, -3);
      createFocusPad(346.11, 0.035, 2);

      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.084, audioContext.currentTime);
      lfoGain.gain.setValueAtTime(0.15, audioContext.currentTime);
      lfo.connect(lfoGain);
      
      gainsRef.current.forEach((gain, index) => {
        const modDepth = 0.1 + (index * 0.02);
        const modGain = audioContext.createGain();
        modGain.gain.setValueAtTime(modDepth, audioContext.currentTime);
        lfoGain.connect(modGain);
        modGain.connect(gain.gain);
      });
      
      lfo.start();
      lfoRef.current = lfo;

      masterGain.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.5);
      masterGain.gain.linearRampToValueAtTime(volume * 0.6, audioContext.currentTime + 2);
      masterGain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 5);

    } else {
      if (masterGainRef.current && audioContextRef.current) {
        const currentTime = audioContextRef.current.currentTime;
        masterGainRef.current.gain.linearRampToValueAtTime(0, currentTime + 2);
        
        setTimeout(() => {
          oscillatorsRef.current.forEach(osc => {
            try { osc.stop(); } catch (e) {}
          });
          if (lfoRef.current) {
            try { lfoRef.current.stop(); } catch (e) {}
          }
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
          }
          oscillatorsRef.current = [];
          gainsRef.current = [];
          audioContextRef.current = null;
          masterGainRef.current = null;
          lfoRef.current = null;
        }, 2500);
      }
    }

    return () => {
      if (instanceIdRef.current) {
        audioManager.unregister(instanceIdRef.current);
      }
      oscillatorsRef.current = [];
      gainsRef.current = [];
    };
  }, [isPlaying, volume]);

  return null;
}
