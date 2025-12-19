import { useRef, useCallback, useEffect } from 'react';
import { AudioContext } from 'react-native-audio-api';

interface UsePowerNapAudioOptions {
  volume?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

interface OscillatorNode {
  oscillator: OscillatorNode;
  gain: GainNode;
}

export function usePowerNapAudio({
  volume = 0.35,
  fadeInDuration = 3000,
  fadeOutDuration = 1000,
}: UsePowerNapAudioOptions = {}) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<any[]>([]);
  const gainNodesRef = useRef<any[]>([]);
  const lfoRef = useRef<any>(null);
  const chimeContextsRef = useRef<AudioContext[]>([]);
  const chimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    gainNodesRef.current.forEach((gainNode) => {
      try {
        const now = gainNode.context.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(0, now);
      } catch {}
    });
    oscillatorsRef.current = [];
    gainNodesRef.current = [];

    if (lfoRef.current) {
      try {
        lfoRef.current.stop();
      } catch {}
      lfoRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    if (chimeIntervalRef.current) {
      clearInterval(chimeIntervalRef.current);
      chimeIntervalRef.current = null;
    }

    chimeContextsRef.current.forEach((ctx) => {
      try {
        ctx.close();
      } catch {}
    });
    chimeContextsRef.current = [];
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startAmbientDrone = useCallback(() => {
    if (audioContextRef.current) return;

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.setValueAtTime(0, audioContext.currentTime);
    masterGain.gain.linearRampToValueAtTime(
      volume,
      audioContext.currentTime + fadeInDuration / 1000
    );

    const createOscillator = (
      freq: number,
      type: 'sine' | 'triangle' | 'square' | 'sawtooth',
      targetGain: number
    ) => {
      const osc = audioContext.createOscillator();
      const oscGain = audioContext.createGain();

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.frequency.setValueAtTime(freq, audioContext.currentTime);
      osc.type = type;

      oscGain.gain.setValueAtTime(0, audioContext.currentTime);
      oscGain.gain.linearRampToValueAtTime(
        targetGain,
        audioContext.currentTime + fadeInDuration / 1000
      );

      osc.start(audioContext.currentTime);
      oscillatorsRef.current.push(osc);
      gainNodesRef.current.push(oscGain);

      return { osc, gain: oscGain };
    };

    const bass = createOscillator(55, 'sine', 0.018);
    const harmonic = createOscillator(110, 'sine', 0.012);
    createOscillator(220, 'triangle', 0.006);

    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();

    lfo.frequency.setValueAtTime(0.08, audioContext.currentTime);
    lfo.type = 'sine';
    lfoGain.gain.setValueAtTime(0.5, audioContext.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(bass.gain.gain);
    lfoGain.connect(harmonic.gain.gain);

    lfo.start(audioContext.currentTime);
    lfoRef.current = lfo;
    gainNodesRef.current.push(masterGain);
  }, [volume, fadeInDuration]);

  const stopAmbientDrone = useCallback(() => {
    gainNodesRef.current.forEach((gainNode) => {
      try {
        const now = gainNode.context.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0, now + fadeOutDuration / 1000);
      } catch {}
    });

    setTimeout(() => {
      oscillatorsRef.current.forEach((osc) => {
        try {
          osc.stop();
        } catch {}
      });
      oscillatorsRef.current = [];
      gainNodesRef.current = [];

      if (lfoRef.current) {
        try {
          lfoRef.current.stop();
        } catch {}
        lfoRef.current = null;
      }

      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
      }
    }, fadeOutDuration + 100);
  }, [fadeOutDuration]);

  const playWakeUpChime = useCallback(() => {
    const audioContext = new AudioContext();
    chimeContextsRef.current.push(audioContext);

    const now = audioContext.currentTime;

    const notes = [
      { freq: 261.63, time: 0, gain: 0.2 },
      { freq: 523.25, time: 1.0, gain: 0.21 },
      { freq: 659.25, time: 2.0, gain: 0.19 },
      { freq: 783.99, time: 3.0, gain: 0.18 },
    ];

    notes.forEach(({ freq, time, gain }) => {
      const fundamental = audioContext.createOscillator();
      fundamental.frequency.setValueAtTime(freq, now + time);
      fundamental.type = 'sine';

      const fundamentalGain = audioContext.createGain();
      fundamentalGain.gain.setValueAtTime(0, now + time);
      fundamentalGain.gain.linearRampToValueAtTime(gain, now + time + 0.001);
      fundamentalGain.gain.exponentialRampToValueAtTime(
        gain * 0.25,
        now + time + 0.05
      );
      fundamentalGain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.9);

      fundamental.connect(fundamentalGain);
      fundamentalGain.connect(audioContext.destination);
      fundamental.start(now + time);
      fundamental.stop(now + time + 0.9);

      const harmonic2 = audioContext.createOscillator();
      harmonic2.frequency.setValueAtTime(freq * 2.03, now + time);
      harmonic2.type = 'sine';

      const harmonic2Gain = audioContext.createGain();
      harmonic2Gain.gain.setValueAtTime(0, now + time);
      harmonic2Gain.gain.linearRampToValueAtTime(
        gain * 0.22,
        now + time + 0.0008
      );
      harmonic2Gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.4);

      harmonic2.connect(harmonic2Gain);
      harmonic2Gain.connect(audioContext.destination);
      harmonic2.start(now + time);
      harmonic2.stop(now + time + 0.4);

      const harmonic3 = audioContext.createOscillator();
      harmonic3.frequency.setValueAtTime(freq * 3.05, now + time);
      harmonic3.type = 'sine';

      const harmonic3Gain = audioContext.createGain();
      harmonic3Gain.gain.setValueAtTime(0, now + time);
      harmonic3Gain.gain.linearRampToValueAtTime(
        gain * 0.1,
        now + time + 0.0005
      );
      harmonic3Gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.25);

      harmonic3.connect(harmonic3Gain);
      harmonic3Gain.connect(audioContext.destination);
      harmonic3.start(now + time);
      harmonic3.stop(now + time + 0.25);
    });

    setTimeout(() => {
      chimeContextsRef.current = chimeContextsRef.current.filter((ctx) => {
        if (ctx === audioContext) {
          try {
            ctx.close();
          } catch {}
          return false;
        }
        return true;
      });
    }, 5000);

    return audioContext;
  }, []);

  const startRepeatingChime = useCallback(
    (intervalMs: number = 6000) => {
      playWakeUpChime();

      chimeIntervalRef.current = setInterval(() => {
        playWakeUpChime();
      }, intervalMs);
    },
    [playWakeUpChime]
  );

  const stopRepeatingChime = useCallback(() => {
    if (chimeIntervalRef.current) {
      clearInterval(chimeIntervalRef.current);
      chimeIntervalRef.current = null;
    }

    chimeContextsRef.current.forEach((ctx) => {
      try {
        ctx.close();
      } catch {}
    });
    chimeContextsRef.current = [];
  }, []);

  return {
    startAmbientDrone,
    stopAmbientDrone,
    playWakeUpChime,
    startRepeatingChime,
    stopRepeatingChime,
    cleanup,
  };
}
