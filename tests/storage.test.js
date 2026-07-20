import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadProgress, saveProgress, resetProgress } from '../src/storage/progressStore.js';
import { defaultProgress } from '../src/logic/progression.js';

const KEY_V4 = 'santoryu:progress:v4';
const KEY_V3 = 'santoryu:progress:v3';

function buildV3Progress(overrides = {}) {
  return {
    totalXP: 0,
    peakXP: 0,
    activeSword: 'sandai',
    completedByDate: {},
    unlocked: [],
    weekStartDate: null,
    dayLog: {},
    completedWeeks: [],
    earnedTitles: [],
    lastLevel: 0,
    sessions: [],
    sleepLog: {},
    moodLog: {},
    bodyStats: { weight: 70, height: 175, unit: 'kg' },
    skillUnlocks: { wado: {}, sandai: {}, shusui: {} },
    bossChallenges: [],
    recoveryScore: 100,
    lastRecoveryUpdate: null,
    settings: {
      theme: 'sandai',
      autoTheme: false,
      defaultIntensity: 5,
      soundEnabled: true,
      hapticsEnabled: true,
      morningReminder: false,
      reminderTime: '7:00',
      restReminder: false,
      stepGoal: 10000,
      gender: 'male',
    },
    ...overrides,
  };
}

beforeEach(() => {
  AsyncStorage.clear();
});

describe('loadProgress', () => {
  test('returns defaultProgress when storage is empty', async () => {
    const { progress: result } = await loadProgress();
    expect(result.totalXP).toBe(0);
    expect(result.schemaVersion).toBe(4);
  });

  test('loads v4 progress from storage', async () => {
    const v4Data = {
      ...defaultProgress(),
      totalXP: 1234,
      schemaVersion: 4,
    };
    await AsyncStorage.setItem(KEY_V4, JSON.stringify(v4Data));

    const { progress: result } = await loadProgress();
    expect(result.totalXP).toBe(1234);
    expect(result.schemaVersion).toBe(4);
  });

  test('migrates v3 to v4', async () => {
    const v3Data = buildV3Progress({ totalXP: 500 });
    await AsyncStorage.setItem(KEY_V3, JSON.stringify(v3Data));

    const { progress: result } = await loadProgress();
    expect(result.totalXP).toBe(500);
    expect(result.schemaVersion).toBe(4);
    expect(result.hydrationLog).toBeDefined();
    expect(result.foodLog).toBeDefined();
    expect(result.arcProgress).toBeDefined();
    expect(result.bountyMissions).toBeDefined();
    expect(result.swordSharpnessLog).toBeDefined();
    expect(result.dreamArchetypeLog).toBeDefined();
  });

  test('v3 migration writes v4 key after migration', async () => {
    const v3Data = buildV3Progress({ totalXP: 500 });
    await AsyncStorage.setItem(KEY_V3, JSON.stringify(v3Data));

    await loadProgress();

    const v4Raw = await AsyncStorage.getItem(KEY_V4);
    expect(v4Raw).not.toBeNull();
    const parsed = JSON.parse(v4Raw);
    expect(parsed.schemaVersion).toBe(4);
  });

  test('removes v3 key after migration', async () => {
    const v3Data = buildV3Progress({ totalXP: 500 });
    await AsyncStorage.setItem(KEY_V3, JSON.stringify(v3Data));

    await loadProgress();

    const v3Raw = await AsyncStorage.getItem(KEY_V3);
    expect(v3Raw).toBeNull();
  });

  test('prefers v4 over v3', async () => {
    const v4Data = {
      ...defaultProgress(),
      totalXP: 999,
      schemaVersion: 4,
    };
    const v3Data = buildV3Progress({ totalXP: 111 });

    await AsyncStorage.setItem(KEY_V4, JSON.stringify(v4Data));
    await AsyncStorage.setItem(KEY_V3, JSON.stringify(v3Data));

    const { progress: result } = await loadProgress();
    expect(result.totalXP).toBe(999);
  });

  test('returns defaultProgress on JSON parse error', async () => {
    await AsyncStorage.setItem(KEY_V4, 'not valid json');

    const { progress: result } = await loadProgress();
    expect(result.totalXP).toBe(0);
  });

  test('returns defaultProgress on storage error', async () => {
    const originalGet = AsyncStorage.getItem;
    AsyncStorage.getItem = jest.fn().mockRejectedValueOnce(new Error('Storage error'));

    const { progress: result } = await loadProgress();
    expect(result.totalXP).toBe(0);

    AsyncStorage.getItem = originalGet;
    // The failed read latches save-protection (see storeSafety.test.js);
    // a healthy load clears it for the rest of this suite.
    await loadProgress();
  });
});

describe('saveProgress', () => {
  test('saves progress to v4 key', async () => {
    const progress = { ...defaultProgress(), totalXP: 500 };
    await saveProgress(progress);

    const raw = await AsyncStorage.getItem(KEY_V4);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.totalXP).toBe(500);
  });

  test('overwrites existing progress', async () => {
    const initial = { ...defaultProgress(), totalXP: 100 };
    const updated = { ...defaultProgress(), totalXP: 200 };

    await saveProgress(initial);
    await saveProgress(updated);

    const raw = await AsyncStorage.getItem(KEY_V4);
    expect(JSON.parse(raw).totalXP).toBe(200);
  });

  test('does not throw on storage error', async () => {
    const originalSet = AsyncStorage.setItem;
    AsyncStorage.setItem = jest.fn().mockRejectedValueOnce(new Error('Write error'));

    const progress = { ...defaultProgress(), totalXP: 500 };
    await expect(saveProgress(progress)).resolves.not.toThrow();

    AsyncStorage.setItem = originalSet;
  });

  test('saves complex progress with all v4 fields', async () => {
    const complexProgress = {
      ...defaultProgress(),
      totalXP: 5000,
      dayLog: {
        '2024-01-15': { wado: 2, sandai: 1, shusui: 0 },
      },
      sessions: [{
        id: 'sess_1',
        discipline: 'wado',
        startedAt: Date.now() - 3600000,
        endedAt: Date.now(),
        exercises: [],
        calories: 50,
        intensity: 5,
        xpEarned: 100,
      }],
      hydrationLog: { '2024-01-15': { cups: 5 } },
      arcProgress: {
        'arc-east-blue': {
          startedAt: '2024-01-01',
          completedWeeks: [1],
          status: 'active',
        },
      },
      bountyMissions: [
        { id: 'bm-iron-week', type: 'streak', status: 'active', assignedAt: '2024-01-15' },
      ],
      skillUnlocks: {
        wado: { focus: ['wado-focus-1'] },
        sandai: {},
        shusui: {},
      },
    };

    await saveProgress(complexProgress);
    const raw = await AsyncStorage.getItem(KEY_V4);
    const parsed = JSON.parse(raw);

    expect(parsed.totalXP).toBe(5000);
    expect(parsed.dayLog['2024-01-15'].wado).toBe(2);
    expect(parsed.sessions.length).toBe(1);
    expect(parsed.hydrationLog['2024-01-15'].cups).toBe(5);
    expect(parsed.arcProgress['arc-east-blue'].completedWeeks).toContain(1);
    expect(parsed.bountyMissions[0].id).toBe('bm-iron-week');
    expect(parsed.skillUnlocks.wado.focus).toContain('wado-focus-1');
  });
});

describe('resetProgress', () => {
  test('removes both v3 and v4 keys', async () => {
    const v4Data = { ...defaultProgress(), totalXP: 500 };
    const v3Data = buildV3Progress({ totalXP: 200 });

    await AsyncStorage.setItem(KEY_V4, JSON.stringify(v4Data));
    await AsyncStorage.setItem(KEY_V3, JSON.stringify(v3Data));

    await resetProgress();

    expect(await AsyncStorage.getItem(KEY_V4)).toBeNull();
    expect(await AsyncStorage.getItem(KEY_V3)).toBeNull();
  });

  test('does not throw if keys do not exist', async () => {
    await expect(resetProgress()).resolves.not.toThrow();
  });

  test('succeeds when only v4 exists', async () => {
    await AsyncStorage.setItem(KEY_V4, JSON.stringify({ totalXP: 500 }));
    await resetProgress();
    expect(await AsyncStorage.getItem(KEY_V4)).toBeNull();
  });

  test('succeeds when only v3 exists', async () => {
    await AsyncStorage.setItem(KEY_V3, JSON.stringify(buildV3Progress()));
    await resetProgress();
    expect(await AsyncStorage.getItem(KEY_V3)).toBeNull();
  });
});

describe('round-trip save/load', () => {
  test('save then load returns equivalent progress', async () => {
    const original = {
      ...defaultProgress(),
      totalXP: 2500,
      peakXP: 3000,
      activeSword: 'wado',
      recoveryScore: 75,
      dayLog: {
        '2024-01-15': { wado: 3, sandai: 1, shusui: 2 },
      },
      completedWeeks: [
        { path: 'sandai', weekNum: 1, completedAt: '2024-01-14' },
      ],
      settings: {
        theme: 'wado',
        autoTheme: true,
        defaultIntensity: 7,
        soundEnabled: false,
        hapticsEnabled: true,
        morningReminder: true,
        reminderTime: '06:30',
        restReminder: true,
        stepGoal: 12000,
        gender: 'female',
      },
    };

    await saveProgress(original);
    const { progress: loaded } = await loadProgress();

    expect(loaded.totalXP).toBe(original.totalXP);
    expect(loaded.peakXP).toBe(original.peakXP);
    expect(loaded.activeSword).toBe(original.activeSword);
    expect(loaded.recoveryScore).toBe(original.recoveryScore);
    expect(loaded.settings.theme).toBe(original.settings.theme);
    expect(loaded.settings.autoTheme).toBe(original.settings.autoTheme);
    expect(loaded.settings.morningReminder).toBe(original.settings.morningReminder);
    expect(loaded.dayLog['2024-01-15'].wado).toBe(3);
  });

  test('recovery score of 0 is preserved', async () => {
    const progress = { ...defaultProgress(), recoveryScore: 0 };
    await saveProgress(progress);
    const { progress: loaded } = await loadProgress();
    expect(loaded.recoveryScore).toBe(0);
  });

  test('recovery score does not go negative (floor at 0)', async () => {
    const progress = { ...defaultProgress(), recoveryScore: -5 };
    await saveProgress(progress);
    const { progress: loaded } = await loadProgress();
    expect(loaded.recoveryScore).toBeGreaterThanOrEqual(0);
  });
});

describe('corruption handling', () => {
  test('rejects v4 state missing required keys and resets', async () => {
    // Task 3: validateV4State requires schemaVersion + 8 keys; missing keys → reset
    const incomplete = {
      totalXP: 100,
      schemaVersion: 4,
    };
    await AsyncStorage.setItem(KEY_V4, JSON.stringify(incomplete));
    const { progress: result, wasReset } = await loadProgress();
    expect(wasReset).toBe(true);
    expect(result.totalXP).toBe(0);
    expect(result.schemaVersion).toBe(4);
    // _pendingEvents should contain a data_reset event so the UI can warn the user
    expect(result._pendingEvents).toEqual([{ type: 'data_reset' }]);
    // The corrupted raw should be backed up
    const backup = await AsyncStorage.getItem('santoryu:progress:v4_corrupted_backup');
    expect(backup).not.toBeNull();
  });

  test('handles malformed date strings in dayLog', async () => {
    const badDates = {
      ...defaultProgress(),
      dayLog: {
        '2024-01-15': { wado: 1, sandai: 0, shusui: 0 },
        '01-15-2024': { wado: 1, sandai: 0, shusui: 0 },
        'invalid': { wado: 1 },
        '2024/01/15': { wado: 1 },
      },
    };
    await AsyncStorage.setItem(KEY_V4, JSON.stringify(badDates));
    const { progress: result } = await loadProgress();
    expect(result.dayLog['2024-01-15']).toBeDefined();
    expect(result.dayLog['01-15-2024']).toBeUndefined();
    expect(result.dayLog['invalid']).toBeUndefined();
  });

  test('handles sessions without endedAt', async () => {
    const badSessions = {
      ...defaultProgress(),
      sessions: [
        { endedAt: Date.now() },
        { startedAt: Date.now() },
        {},
        null,
      ],
    };
    await AsyncStorage.setItem(KEY_V4, JSON.stringify(badSessions));
    const { progress: result } = await loadProgress();
    expect(result.sessions.length).toBe(1);
  });

  test('handles invalid reward IDs in unlocked', async () => {
    const badUnlocked = {
      ...defaultProgress(),
      unlocked: ['oni-giri', 'fake-reward', 'tora-gari', null, undefined],
    };
    await AsyncStorage.setItem(KEY_V4, JSON.stringify(badUnlocked));
    const { progress: result } = await loadProgress();
    expect(result.unlocked).toContain('oni-giri');
    expect(result.unlocked).toContain('tora-gari');
    expect(result.unlocked).not.toContain('fake-reward');
  });

  test('handles negative body stats', async () => {
    const badStats = {
      ...defaultProgress(),
      bodyStats: { weight: -50, height: 200, unit: 'kg' },
    };
    await AsyncStorage.setItem(KEY_V4, JSON.stringify(badStats));
    const { progress: result } = await loadProgress();
    expect(result.bodyStats.weight).toBe(70);
    expect(result.bodyStats.height).toBe(200);
  });
});