import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadProgress, saveProgress, flushSave, resetProgress } from '../src/storage/progressStore';
import { defaultProgress } from '../src/logic/progression';

const KEY_V4 = 'santoryu:progress:v4';

const validBlob = () => JSON.stringify(defaultProgress());

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
  // Clear any readFailed latch left by a previous test.
  await loadProgress();
});

describe('read-failure protection', () => {
  test('a failed native read serves defaults but refuses to save over stored data', async () => {
    await AsyncStorage.setItem(KEY_V4, validBlob());

    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('sqlite glitch'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { progress, wasReset } = await loadProgress();
    expect(wasReset).toBe(false);
    expect(progress.totalXP).toBe(0);

    // The save after the glitch must NOT clobber the intact blob.
    await saveProgress({ ...defaultProgress(), totalXP: 999 }, { immediate: true });
    const stored = JSON.parse(await AsyncStorage.getItem(KEY_V4));
    expect(stored.totalXP).toBe(0);
  });

  test('a subsequent successful load re-enables saving', async () => {
    await AsyncStorage.setItem(KEY_V4, validBlob());
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('glitch'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await loadProgress(); // failed read → saves disabled
    await loadProgress(); // healthy read → saves re-enabled
    await saveProgress({ ...defaultProgress(), totalXP: 42 }, { immediate: true });
    expect(JSON.parse(await AsyncStorage.getItem(KEY_V4)).totalXP).toBe(42);
  });
});

describe('flushSave', () => {
  test('writes a pending debounced save immediately', async () => {
    const p = { ...defaultProgress(), totalXP: 123 };
    const pending = saveProgress(p); // debounced 500ms — not yet written
    await flushSave();
    expect(JSON.parse(await AsyncStorage.getItem(KEY_V4)).totalXP).toBe(123);
    await pending; // and the caller's promise resolves
  });

  test('superseded save promises resolve when the coalesced write lands', async () => {
    const first = saveProgress({ ...defaultProgress(), totalXP: 1 });
    const second = saveProgress({ ...defaultProgress(), totalXP: 2 }, { immediate: true });
    await Promise.all([first, second]); // first must not hang forever
    expect(JSON.parse(await AsyncStorage.getItem(KEY_V4)).totalXP).toBe(2);
  });

  test('is a no-op with nothing pending', async () => {
    await expect(flushSave()).resolves.toBeUndefined();
    expect(await AsyncStorage.getItem(KEY_V4)).toBeNull();
  });
});

describe('resetProgress interaction', () => {
  test('reset abandons a pending save and it cannot resurrect the wiped state', async () => {
    const pending = saveProgress({ ...defaultProgress(), totalXP: 777 });
    await resetProgress();
    await pending; // resolves rather than hanging
    await flushSave();
    expect(await AsyncStorage.getItem(KEY_V4)).toBeNull();
  });
});
