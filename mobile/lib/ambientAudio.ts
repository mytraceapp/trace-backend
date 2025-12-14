import { Audio } from "expo-av";

let currentSound: Audio.Sound | null = null;
let currentKey: string | null = null;

export async function initAudioMode() {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });
}

export async function playAmbient(key: string, source: any, volume = 0.35) {
  if (currentKey === key && currentSound) return;

  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {}
    currentSound = null;
    currentKey = null;
  }

  const { sound } = await Audio.Sound.createAsync(source, {
    isLooping: true,
    volume,
  });

  currentSound = sound;
  currentKey = key;

  await sound.playAsync();
}

export async function setAmbientVolume(volume: number) {
  if (!currentSound) return;
  await currentSound.setVolumeAsync(volume);
}

export async function stopAmbient() {
  if (!currentSound) return;
  try {
    await currentSound.stopAsync();
    await currentSound.unloadAsync();
  } catch {}
  currentSound = null;
  currentKey = null;
}

export async function fadeTo(target: number, ms = 250) {
  if (!currentSound) return;
  const steps = 10;
  const stepMs = ms / steps;
  const status = await currentSound.getStatusAsync();
  if (!status.isLoaded) return;
  const start = status.volume ?? 0;

  for (let i = 1; i <= steps; i++) {
    const v = start + ((target - start) * i) / steps;
    await currentSound.setVolumeAsync(v);
    await new Promise(r => setTimeout(r, stepMs));
  }
}

export function isPlaying(): boolean {
  return currentSound !== null && currentKey !== null;
}
