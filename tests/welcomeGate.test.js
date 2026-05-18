import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadProgress, saveProgress } from '../src/storage/progressStore.js';
import { defaultProgress, toDateKey } from '../src/logic/progression.js';

const KEY_V4 = 'santoryu:progress:v4';

// Mirrors the gate expression in Dojo.js:
//   if (!progress.userProfile?.signedIn && !authSkipped) -> show WelcomeScreen
const welcomeShows = (progress, authSkipped) =>
  !progress.userProfile?.signedIn && !authSkipped;

// Mirrors the exact payload Dojo.js writes in onSignIn.
const signInPayload = (name) => ({
  ...defaultProgress(),
  userProfile: { name, provider: 'local', signedIn: true, createdAt: toDateKey(new Date()) },
});

beforeEach(() => {
  AsyncStorage.clear();
});

describe('welcome gate: first launch', () => {
  test('fresh install (nothing persisted) shows the welcome screen', async () => {
    const { progress, wasReset } = await loadProgress();
    expect(wasReset).toBe(false);
    expect(progress.userProfile).toBeNull();
    expect(welcomeShows(progress, false)).toBe(true);
  });

  test('Skip is session-only: nothing persisted, so it shows again next cold start', async () => {
    // Skip in Dojo.js only calls setAuthSkipped(true); it never persists.
    // Same launch: gate is dismissed.
    const { progress } = await loadProgress();
    expect(welcomeShows(progress, /* authSkipped */ true)).toBe(false);

    // Next cold start: authSkipped resets to false, storage still has no profile.
    const { progress: relaunch } = await loadProgress();
    expect(relaunch.userProfile).toBeNull();
    expect(welcomeShows(relaunch, false)).toBe(true);
  });
});

describe('welcome gate: sign-in persists', () => {
  test('signed-in profile survives a real save -> load cycle and skips the gate', async () => {
    await saveProgress(signInPayload('Zoro'));

    const { progress: loaded, wasReset } = await loadProgress();
    expect(wasReset).toBe(false); // state validated, not treated as corrupt
    expect(loaded.userProfile).toEqual(
      expect.objectContaining({ name: 'Zoro', provider: 'local', signedIn: true })
    );
    expect(loaded.userProfile.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Next cold start: signed in -> welcome never shows.
    expect(welcomeShows(loaded, false)).toBe(false);
  });

  test('over-long / padded name is trimmed and capped to 40 chars on reload', async () => {
    const raw = { ...defaultProgress(), userProfile: { name: '  ' + 'z'.repeat(80) + '  ', provider: 'local', signedIn: true, createdAt: '2026-05-17' } };
    await AsyncStorage.setItem(KEY_V4, JSON.stringify(raw));

    const { progress: loaded } = await loadProgress();
    expect(loaded.userProfile.name).toBe('z'.repeat(40));
    expect(welcomeShows(loaded, false)).toBe(false);
  });
});

describe('welcome gate: corruption is non-destructive', () => {
  test('a malformed userProfile re-shows the gate WITHOUT wiping other progress', async () => {
    const raw = {
      ...defaultProgress(),
      totalXP: 4200,
      userProfile: { name: 123, signedIn: 'yes' }, // garbage
    };
    await AsyncStorage.setItem(KEY_V4, JSON.stringify(raw));

    const { progress: loaded, wasReset } = await loadProgress();
    expect(wasReset).toBe(false);          // not flagged corrupt — other data is fine
    expect(loaded.totalXP).toBe(4200);     // unrelated progress preserved
    expect(loaded.userProfile).toBeNull(); // bad profile collapses to null
    expect(welcomeShows(loaded, false)).toBe(true); // user just signs in again
  });

  test('signedIn:false is treated as not signed in (gate shows)', async () => {
    const raw = {
      ...defaultProgress(),
      userProfile: { name: 'Zoro', provider: 'local', signedIn: false, createdAt: '2026-05-17' },
    };
    await AsyncStorage.setItem(KEY_V4, JSON.stringify(raw));

    const { progress: loaded } = await loadProgress();
    expect(loaded.userProfile).toBeNull();
    expect(welcomeShows(loaded, false)).toBe(true);
  });
});
