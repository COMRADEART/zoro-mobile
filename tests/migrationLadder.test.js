import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadProgress, saveProgress, CURRENT_SCHEMA_VERSION } from '../src/storage/progressStore';
import { defaultProgress } from '../src/logic/progression';

const KEY_V4 = 'santoryu:progress:v4';
const KEY_BACKUP = 'santoryu:progress:v4_corrupted_backup';
const KEY_BACKUP_LATEST = 'santoryu:progress:v4_corrupted_backup_latest';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
  await loadProgress(); // clear any savesDisabled latch from a previous test
});

describe('newer-schema protection', () => {
  test('a blob from a newer app version is never overwritten', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const futureBlob = JSON.stringify({ ...defaultProgress(), schemaVersion: CURRENT_SCHEMA_VERSION + 1, totalXP: 5000 });
    await AsyncStorage.setItem(KEY_V4, futureBlob);

    const { progress, wasReset } = await loadProgress();
    // Served defaults for this launch, but no reset and no backup churn.
    expect(wasReset).toBe(false);
    expect(progress.totalXP).toBe(0);
    expect(await AsyncStorage.getItem(KEY_V4)).toBe(futureBlob);
    expect(await AsyncStorage.getItem(KEY_BACKUP)).toBeNull();

    // And saves are refused so the newer data survives the whole session.
    await saveProgress({ ...defaultProgress(), totalXP: 1 }, { immediate: true });
    expect(await AsyncStorage.getItem(KEY_V4)).toBe(futureBlob);
  });
});

describe('migration ladder', () => {
  test('a v3 blob under the v4 key migrates via the ladder', async () => {
    // schemaVersion 3 stored at the CURRENT key (not the legacy key): the
    // old hardcoded branch treated any non-4 version at KEY_V4 as corruption
    // and wiped it; the ladder migrates it.
    const v3 = {
      ...defaultProgress(),
      schemaVersion: 3,
      totalXP: 800,
    };
    await AsyncStorage.setItem(KEY_V4, JSON.stringify(v3));

    const { progress, wasReset } = await loadProgress();
    expect(wasReset).toBe(false);
    expect(progress.totalXP).toBe(800);
    expect(progress.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(await AsyncStorage.getItem(KEY_BACKUP)).toBeNull();
  });

  test('an unknown ancient version still takes the corruption path', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const ancient = JSON.stringify({ schemaVersion: 1, totalXP: 42 });
    await AsyncStorage.setItem(KEY_V4, ancient);
    const { wasReset } = await loadProgress();
    expect(wasReset).toBe(true);
    expect(await AsyncStorage.getItem(KEY_BACKUP)).toBe(ancient);
  });
});

describe('two-slot corruption backups', () => {
  test('a second corruption event does not destroy the first backup', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await AsyncStorage.setItem(KEY_V4, 'first-corruption');
    await loadProgress();
    expect(await AsyncStorage.getItem(KEY_BACKUP)).toBe('first-corruption');

    await AsyncStorage.setItem(KEY_V4, 'second-corruption');
    await loadProgress();
    expect(await AsyncStorage.getItem(KEY_BACKUP)).toBe('first-corruption');
    expect(await AsyncStorage.getItem(KEY_BACKUP_LATEST)).toBe('second-corruption');
  });
});
