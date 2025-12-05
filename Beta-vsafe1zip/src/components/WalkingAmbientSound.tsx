import React from 'react';

interface WalkingAmbientSoundProps {
  isPlaying: boolean;
  stepTrigger?: number;
}

export function WalkingAmbientSound({ isPlaying, stepTrigger = 0 }: WalkingAmbientSoundProps) {
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const masterGainRef = React.useRef<GainNode | null>(null);
  const windNoiseRef = React.useRef<AudioBufferSourceNode | null>(null);
  const leavesNoiseRef = React.useRef<AudioBufferSourceNode | null>(null);
  const isInitializedRef = React.useRef(false);

  const createNoiseBuffer = React.useCallback((ctx: AudioContext, type: 'white' | 'pink' | 'brown') => {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else {
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    }
    return buffer;
  }, []);

  const playGravelCrunch = React.useCallback(() => {
    if (!audioContextRef.current || !masterGainRef.current) return;
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    const noiseBuffer = createNoiseBuffer(ctx, 'white');
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 2000;
    highpass.Q.value = 0.5;
    
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 6000;
    lowpass.Q.value = 0.3;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.008, now + 0.02);
    gain.gain.setValueAtTime(0.008, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    noise.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(masterGainRef.current);
    
    noise.start(now);
    noise.stop(now + 0.2);
  }, [createNoiseBuffer]);

  const playFootstep = React.useCallback(() => {
    if (!audioContextRef.current || !masterGainRef.current) return;
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.016, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    osc.connect(gain);
    gain.connect(masterGainRef.current);
    
    osc.start(now);
    osc.stop(now + 0.15);
    
    setTimeout(() => playGravelCrunch(), 20 + Math.random() * 30);
  }, [playGravelCrunch]);

  React.useEffect(() => {
    if (!isPlaying) return;
    
    const initAudio = () => {
      if (isInitializedRef.current) return;
      
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.7;
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;
      
      const windBuffer = createNoiseBuffer(ctx, 'pink');
      const windNoise = ctx.createBufferSource();
      windNoise.buffer = windBuffer;
      windNoise.loop = true;
      
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 400;
      windFilter.Q.value = 0.3;
      
      const windGain = ctx.createGain();
      windGain.gain.value = 0.008;
      
      const windLfo = ctx.createOscillator();
      windLfo.frequency.value = 0.15;
      const windLfoGain = ctx.createGain();
      windLfoGain.gain.value = 0.003;
      windLfo.connect(windLfoGain);
      windLfoGain.connect(windGain.gain);
      windLfo.start();
      
      windNoise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(masterGain);
      windNoise.start();
      windNoiseRef.current = windNoise;
      
      const leavesBuffer = createNoiseBuffer(ctx, 'white');
      const leavesNoise = ctx.createBufferSource();
      leavesNoise.buffer = leavesBuffer;
      leavesNoise.loop = true;
      
      const leavesHighpass = ctx.createBiquadFilter();
      leavesHighpass.type = 'highpass';
      leavesHighpass.frequency.value = 3000;
      
      const leavesLowpass = ctx.createBiquadFilter();
      leavesLowpass.type = 'lowpass';
      leavesLowpass.frequency.value = 8000;
      
      const leavesGain = ctx.createGain();
      leavesGain.gain.value = 0.004;
      
      const leavesLfo = ctx.createOscillator();
      leavesLfo.frequency.value = 0.08;
      const leavesLfoGain = ctx.createGain();
      leavesLfoGain.gain.value = 0.002;
      leavesLfo.connect(leavesLfoGain);
      leavesLfoGain.connect(leavesGain.gain);
      leavesLfo.start();
      
      leavesNoise.connect(leavesHighpass);
      leavesHighpass.connect(leavesLowpass);
      leavesLowpass.connect(leavesGain);
      leavesGain.connect(masterGain);
      leavesNoise.start();
      leavesNoiseRef.current = leavesNoise;
      
      isInitializedRef.current = true;
    };
    
    initAudio();
    
    return () => {
      if (windNoiseRef.current) {
        try { windNoiseRef.current.stop(); } catch {}
      }
      if (leavesNoiseRef.current) {
        try { leavesNoiseRef.current.stop(); } catch {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      isInitializedRef.current = false;
    };
  }, [isPlaying, createNoiseBuffer]);

  React.useEffect(() => {
    if (stepTrigger > 0 && isPlaying) {
      playFootstep();
    }
  }, [stepTrigger, isPlaying, playFootstep]);

  return null;
}
