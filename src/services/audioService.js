import { AudioPlayer, setAudioModeAsync } from 'expo-audio';

let soundEnabled = true;

export function setSoundEnabled(value) {
  soundEnabled = value;
}

export async function initAudio() {
  await setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: false,
  });
}

async function playSound(filename) {
  if (!soundEnabled) return;
  try {
    const player = new AudioPlayer({ uri: `asset:/sounds/${filename}` });
    player.onPlaybackStatusUpdate = (status) => {
      if (status.isLoaded && status.didJustFinish) {
        player.unload();
      }
    };
    await player.play();
  } catch {
  }
}

export async function playClick() {
  await playSound('click.mp3');
}

export async function playSuccess() {
  await playSound('success.mp3');
}

export async function playRankUp() {
  await playSound('rankup.mp3');
}