import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

let soundEnabled = true;

export function setSoundEnabled(value: boolean) {
  soundEnabled = value;
}

export async function initAudio() {
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
  } catch {
    // Audio configuration is best-effort; playback stays a no-op on failure.
  }
}

// NOTE: no sound files ship in the repo yet (there is no assets/sounds/), so
// playback is a graceful no-op until they are added to the Android assets
// directory that asset:/ URIs resolve to. The previous implementation also
// called an API that does not exist in expo-audio (`new AudioPlayer(...)`,
// `player.unload()`, expo-av-era AudioMode keys) — every call threw and was
// swallowed, which is why the feature never made a sound.
async function playSound(filename: string) {
  if (!soundEnabled) return;
  try {
    const player = createAudioPlayer({ uri: `asset:/sounds/${filename}` });
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) player.remove();
    });
    player.play();
  } catch {
    // Missing asset or unsupported platform — silent fallback.
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
