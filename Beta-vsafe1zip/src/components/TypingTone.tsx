import { useEffect } from 'react';

interface TypingToneProps {
  playing: boolean;
  currentChar?: string; // Pass the current character being typed
}

export function TypingTone({ playing, currentChar }: TypingToneProps) {
  useEffect(() => {
    if (!playing || !currentChar) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create laptop keyboard sound - crisp, modern click
    const playTypingKey = () => {
      const now = audioContext.currentTime;
      
      // Laptop key click - shorter, crisper, less mechanical
      const bufferSize = audioContext.sampleRate * 0.05; // Shorter duration
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate crisp noise burst for modern keyboard click
      for (let i = 0; i < bufferSize; i++) {
        // Very sharp attack, very quick decay
        const envelope = Math.max(0, 1 - (i / bufferSize) * 20);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }
      
      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;
      
      const noiseGain = audioContext.createGain();
      noiseGain.gain.setValueAtTime(0.05 + Math.random() * 0.03, now); // Even quieter (0.05-0.08)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      
      // Higher frequency for modern laptop keyboard
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800 + Math.random() * 1200, now); // Higher pitch (2800-4000Hz)
      filter.Q.setValueAtTime(4, now); // Tighter filter for cleaner sound
      
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioContext.destination);
      noise.start(now);
      
      // Subtle low-end click (less prominent than typewriter)
      const click = audioContext.createOscillator();
      click.frequency.setValueAtTime(220 + Math.random() * 60, now); // Higher, subtler
      click.type = 'triangle';
      
      const clickGain = audioContext.createGain();
      clickGain.gain.setValueAtTime(0.02, now); // Even more subtle
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      
      click.connect(clickGain);
      clickGain.connect(audioContext.destination);
      click.start(now);
      click.stop(now + 0.02);
    };

    // Play sound for all visible characters including spaces and punctuation
    if (currentChar && currentChar !== '…') {
      playTypingKey();
    }

    return () => {
      audioContext.close();
    };
  }, [playing, currentChar]);

  return null;
}
