import { useEffect, useRef } from 'react';

interface GroundingToneProps {
  isPlaying: boolean;
  volume?: number;
}

export function GroundingTone({ isPlaying, volume = 0.38 }: GroundingToneProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainsRef = useRef<GainNode[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const lfosRef = useRef<OscillatorNode[]>([]);

  useEffect(() => {
    if (isPlaying) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const masterGain = audioContext.createGain();
      masterGain.gain.setValueAtTime(0, audioContext.currentTime);
      masterGain.connect(audioContext.destination);
      masterGainRef.current = masterGain;

      const createGroundingVoice = (freq: number, gain: number, filterFreq: number = 300) => {
        const osc = audioContext.createOscillator();
        const oscGain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioContext.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, audioContext.currentTime);
        filter.Q.setValueAtTime(0.3, audioContext.currentTime);

        oscGain.gain.setValueAtTime(gain, audioContext.currentTime);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(masterGain);

        osc.start();
        oscillatorsRef.current.push(osc);
        gainsRef.current.push(oscGain);

        return { osc, oscGain, filter };
      };

      createGroundingVoice(40, 0.12, 120);
      createGroundingVoice(55, 0.10, 150);
      createGroundingVoice(82.41, 0.085, 200);
      createGroundingVoice(110, 0.07, 280);
      createGroundingVoice(164.81, 0.05, 350);
      createGroundingVoice(220, 0.035, 400);

      const lfo1 = audioContext.createOscillator();
      const lfo1Gain = audioContext.createGain();
      lfo1.type = 'sine';
      lfo1.frequency.setValueAtTime(0.04, audioContext.currentTime);
      lfo1Gain.gain.setValueAtTime(0.08, audioContext.currentTime);
      lfo1.connect(lfo1Gain);
      
      gainsRef.current.forEach((gain, index) => {
        if (index < 3) {
          const modGain = audioContext.createGain();
          modGain.gain.setValueAtTime(0.06 + (index * 0.02), audioContext.currentTime);
          lfo1Gain.connect(modGain);
          modGain.connect(gain.gain);
        }
      });
      
      lfo1.start();
      lfosRef.current.push(lfo1);

      const lfo2 = audioContext.createOscillator();
      const lfo2Gain = audioContext.createGain();
      lfo2.type = 'sine';
      lfo2.frequency.setValueAtTime(0.025, audioContext.currentTime);
      lfo2Gain.gain.setValueAtTime(0.06, audioContext.currentTime);
      lfo2.connect(lfo2Gain);
      
      gainsRef.current.forEach((gain, index) => {
        if (index >= 3) {
          const modGain = audioContext.createGain();
          modGain.gain.setValueAtTime(0.04 + (index * 0.01), audioContext.currentTime);
          lfo2Gain.connect(modGain);
          modGain.connect(gain.gain);
        }
      });
      
      lfo2.start();
      lfosRef.current.push(lfo2);

      masterGain.gain.linearRampToValueAtTime(volume * 0.2, audioContext.currentTime + 0.5);
      masterGain.gain.linearRampToValueAtTime(volume * 0.5, audioContext.currentTime + 2);
      masterGain.gain.linearRampToValueAtTime(volume * 0.8, audioContext.currentTime + 4);
      masterGain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 6);

    } else {
      if (masterGainRef.current && audioContextRef.current) {
        const currentTime = audioContextRef.current.currentTime;
        masterGainRef.current.gain.linearRampToValueAtTime(0, currentTime + 2.5);
        
        setTimeout(() => {
          oscillatorsRef.current.forEach(osc => {
            try { osc.stop(); } catch (e) {}
          });
          lfosRef.current.forEach(lfo => {
            try { lfo.stop(); } catch (e) {}
          });
          if (audioContextRef.current) {
            audioContextRef.current.close();
          }
          oscillatorsRef.current = [];
          gainsRef.current = [];
          lfosRef.current = [];
          audioContextRef.current = null;
          masterGainRef.current = null;
        }, 3000);
      }
    }

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        oscillatorsRef.current.forEach(osc => {
          try { osc.stop(); } catch (e) {}
        });
        lfosRef.current.forEach(lfo => {
          try { lfo.stop(); } catch (e) {}
        });
        audioContextRef.current.close();
        oscillatorsRef.current = [];
        gainsRef.current = [];
        lfosRef.current = [];
      }
    };
  }, [isPlaying, volume]);

  return null;
}
