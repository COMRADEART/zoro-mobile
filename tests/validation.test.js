import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateV4State, REQUIRED_V4_KEYS, loadProgress } from '../src/storage/progressStore';
import { defaultProgress } from '../src/logic/progression';

const KEY_V4 = 'santoryu:progress:v4';
const KEY_V3 = 'santoryu:progress:v3';
const KEY_BACKUP = 'santoryu:progress:v4_corrupted_backup';

beforeEach(() => AsyncStorage.clear());

describe('REQUIRED_V4_KEYS', () => {
  test('matches the spec keys', () => {
    expect(REQUIRED_V4_KEYS).toEqual([
      'totalXP', 'peakXP', 'activeSword', 'schemaVersion',
      'sessions', 'skillUnlocks', 'bossChallenges', 'dayLog',
    ]);
  });
});

describe('validateV4State', () => {
  test('valid default state passes', () => {
    expect(validateV4State(defaultProgress())).toBe(true);
  });

  test('null/undefined fails', () => {
    expect(validateV4State(null)).toBe(false);
    expect(validateV4State(undefined)).toBe(false);
  });

  test('non-object fails', () => {
    expect(validateV4State('string')).toBe(false);
    expect(validateV4State(42)).toBe(false);
    expect(validateV4State([])).toBe(false);  // arrays count as object — but no schemaVersion
  });

  test('schemaVersion !== 4 fails', () => {
    const p = { ...defaultProgress(), schemaVersion: 3 };
    expect(validateV4State(p)).toBe(false);
  });

  test('missing required key fails', () => {
    for (const key of REQUIRED_V4_KEYS) {
      const p = { ...defaultProgress() };
      delete p[key];
      expect(validateV4State(p)).toBe(false);
    }
  });

  test('negative totalXP fails', () => {
    const p = { ...defaultProgress(), totalXP: -1 };
    expect(validateV4State(p)).toBe(false);
  });

  test('non-number totalXP fails', () => {
    const p = { ...defaultProgress(), totalXP: '100' };
    expect(validateV4State(p)).toBe(false);
  });

  test('skillUnlocks missing a discipline fails', () => {
    const p = { ...defaultProgress(), skillUnlocks: { wado: {}, sandai: {} } };
    expect(validateV4State(p)).toBe(false);
  });
});

describe('loadProgress corruption handling', () => {
  test('valid v4 → wasReset false, no data_reset event', async () => {
    const valid = defaultProgress();
    valid.totalXP = 500;
    await AsyncStorage.setItem(KEY_V4, JSON.stringify(valid));
    const { progress, wasReset } = await loadProgress();
    expect(wasReset).toBe(false);
    expect(progress.totalXP).toBe(500);
    expect(progress._pendingEvents ?? []).toEqual([]);
  });

  test('corrupted v4 → backup saved, reset applied, data_reset event emitted', async () => {
    const corrupted = JSON.stringify({ totalXP: -999, schemaVersion: 4 });
    await AsyncStorage.setItem(KEY_V4, corrupted);

    const { progress, wasReset } = await loadProgress();

    expect(wasReset).toBe(true);
    expect(progress.totalXP).toBe(0);
    expect(progress.schemaVersion).toBe(4);
    expect(progress._pendingEvents).toEqual([{ type: 'data_reset' }]);

    const backup = await AsyncStorage.getItem(KEY_BACKUP);
    expect(backup).toBe(corrupted);
  });

  test('after corrupted reset, v4 key holds clean default WITHOUT pendingEvents', async () => {
    await AsyncStorage.setItem(KEY_V4, JSON.stringify({ schemaVersion: 4, totalXP: -1 }));
    await loadProgress();
    const stored = JSON.parse(await AsyncStorage.getItem(KEY_V4));
    expect(stored._pendingEvents).toBeUndefined();
    expect(stored.totalXP).toBe(0);
  });

  test('garbled JSON in v4 backs up + resets + heals (no crash, no repeat reset)', async () => {
    await AsyncStorage.setItem(KEY_V4, '}}}not json{{{');
    const { progress, wasReset } = await loadProgress();
    // Unparseable v4 mirrors the validation-fail branch: back up the corrupt
    // bytes, persist a clean default, emit data_reset, and heal so the next
    // cold start loads valid v4 instead of re-entering this branch.
    expect(wasReset).toBe(true);
    expect(progress.totalXP).toBe(0);
    expect(progress._pendingEvents).toEqual([{ type: 'data_reset' }]);
    expect(await AsyncStorage.getItem(KEY_BACKUP)).toBe('}}}not json{{{');
    const v4After = JSON.parse(await AsyncStorage.getItem(KEY_V4));
    expect(v4After.totalXP).toBe(0);
    expect(v4After._pendingEvents).toBeUndefined();

    // Second cold start must NOT reset or re-emit data_reset.
    const second = await loadProgress();
    expect(second.wasReset).toBe(false);
    expect(second.progress._pendingEvents ?? []).toEqual([]);
  });

  test('v3 migration that fails validation triggers backup + reset', async () => {
    // v3 with no totalXP → migration produces invalid v4
    const garbageV3 = JSON.stringify({ schemaVersion: 3 });  // missing required keys
    await AsyncStorage.setItem(KEY_V3, garbageV3);

    const { progress, wasReset } = await loadProgress();
    expect(wasReset).toBe(true);
    expect(progress._pendingEvents).toEqual([{ type: 'data_reset' }]);
    const backup = await AsyncStorage.getItem(KEY_BACKUP);
    expect(backup).toBe(garbageV3);
  });

  test('failed v3 migration removes v3 + writes clean v4 (no repeat reset on next launch)', async () => {
    // Regression guard for the cold-start loop: a failed v3 migration must
    // persist a clean v4 and drop the broken v3, so the SECOND launch loads
    // valid v4 instead of re-running the failed migration and re-emitting
    // data_reset on every cold start.
    await AsyncStorage.setItem(KEY_V3, JSON.stringify({ schemaVersion: 3 }));

    // First launch: reset emitted once, storage cleaned up.
    const first = await loadProgress();
    expect(first.wasReset).toBe(true);
    expect(first.progress._pendingEvents).toEqual([{ type: 'data_reset' }]);
    expect(await AsyncStorage.getItem(KEY_V3)).toBeNull();
    const v4After = JSON.parse(await AsyncStorage.getItem(KEY_V4));
    expect(v4After.schemaVersion).toBe(4);
    expect(v4After.totalXP).toBe(0);
    // Persisted v4 must not carry the in-memory data_reset event.
    expect(v4After._pendingEvents).toBeUndefined();

    // Second launch (cold start): must NOT reset or re-emit data_reset.
    const second = await loadProgress();
    expect(second.wasReset).toBe(false);
    expect(second.progress._pendingEvents ?? []).toEqual([]);
  });

  test('startup boss-expiry is persisted (not re-emitted every cold start)', async () => {
    const state = {
      ...defaultProgress(),
      bossChallenges: [
        { id: 'mihawks-trial', discipline: 'sandai', weekOf: 'OLD-WEEK', startedAt: '2025-01-01', completedAt: null, failed: false },
      ],
    };
    await AsyncStorage.setItem(KEY_V4, JSON.stringify(state));

    // First cold start: expiry marks the boss failed and emits boss_failed once.
    const first = await loadProgress();
    expect(first.progress.bossChallenges[0].failed).toBe(true);
    expect((first.progress._pendingEvents ?? []).map((e) => e.type)).toContain('boss_failed');

    // The failed state must be persisted (without the in-memory pending events).
    const stored = JSON.parse(await AsyncStorage.getItem(KEY_V4));
    expect(stored.bossChallenges[0].failed).toBe(true);
    expect(stored._pendingEvents).toBeUndefined();

    // Second cold start: boss already failed → no recompute, no re-emit.
    const second = await loadProgress();
    expect((second.progress._pendingEvents ?? []).map((e) => e.type)).not.toContain('boss_failed');
  });

  test('valid v3 with all required keys migrates cleanly (no reset)', async () => {
    // Real v3 payload: a defaultProgress shape stamped with schemaVersion 3 and
    // missing the v4-only fields. migrateV3ToV4 should populate v4-only fields,
    // validation should pass, normalize should fill in any remaining defaults.
    const v3 = { ...defaultProgress(), schemaVersion: 3, totalXP: 1234 };
    // Strip v4-only fields a real v3 wouldn't have, to mirror upgrade reality.
    delete v3.hydrationLog;
    delete v3.foodLog;
    delete v3.bodyComposition;
    delete v3.breathingLog;
    delete v3.arcProgress;
    delete v3.bountyMissions;
    delete v3.swordSharpnessLog;
    delete v3.dreamArchetypeLog;
    delete v3.voyageChronicles;
    delete v3.stepLog;
    delete v3.vitalsLog;
    delete v3.unlockedThemes;
    delete v3.bossAttemptHistory;
    await AsyncStorage.setItem(KEY_V3, JSON.stringify(v3));

    const { progress, wasReset } = await loadProgress();
    expect(wasReset).toBe(false);
    expect(progress.totalXP).toBe(1234);
    expect(progress.schemaVersion).toBe(4);
    // v4-only fields filled in
    expect(progress.hydrationLog).toEqual({});
    expect(progress.bountyMissions).toEqual([]);
    expect(progress.unlockedThemes).toEqual(expect.arrayContaining(['wado', 'sandai', 'shusui']));
    // v3 key cleared, v4 key written
    expect(await AsyncStorage.getItem(KEY_V3)).toBeNull();
    const stored = JSON.parse(await AsyncStorage.getItem(KEY_V4));
    expect(stored.totalXP).toBe(1234);
    expect(stored.schemaVersion).toBe(4);
    // No corrupted backup written on happy path
    expect(await AsyncStorage.getItem(KEY_BACKUP)).toBeNull();
    expect(progress._pendingEvents ?? []).toEqual([]);
  });
});

describe('saveProgress strips _pendingEvents', () => {
  test('events do not persist across save/load cycle', async () => {
    const { saveProgress } = require('../src/storage/progressStore');
    const p = defaultProgress();
    p._pendingEvents = [{ type: 'data_reset' }, { type: 'rank_up', rank: { name: 'TEST' } }];
    await saveProgress(p);
    // saveProgress is debounced 500ms — wait for it
    await new Promise((r) => setTimeout(r, 600));
    const stored = JSON.parse(await AsyncStorage.getItem(KEY_V4));
    expect(stored._pendingEvents).toBeUndefined();
  });
});
