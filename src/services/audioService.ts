import {
  setAudioModeAsync,
  createAudioPlayer,
} from 'expo-audio';

let soundEnabled = true;

export function setSoundEnabled(value: boolean): void {
  soundEnabled = value;
}

export async function initAudio(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'mixWithOthers',
  });
}

async function playSound(filename: string): Promise<void> {
  if (!soundEnabled) return;
  try {
    const player = createAudioPlayer(
      { uri: `asset:/sounds/${filename}` },
      { updateInterval: 200 }
    );
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded && status.didJustFinish) {
        sub.remove();
        player.remove();
      }
    });
    player.play();
  } catch (err) {
    if (__DEV__) {
      console.warn(`[audio] Failed to play ${filename}:`, (err as Error)?.message);
    }
  }
}

export async function playClick(): Promise<void> {
  await playSound('click.mp3');
}

export async function playSuccess(): Promise<void> {
  await playSound('success.mp3');
}

export async function playRankUp(): Promise<void> {
  await playSound('rankup.mp3');
}
