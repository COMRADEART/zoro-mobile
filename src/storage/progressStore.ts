import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultProgress, normalizeProgress, countBossDefeats, areAllSkillTreesComplete, evaluateBossExpiry, toDateKey } from '../logic/progression';
import type { Progress } from '../types';
import { DISCIPLINES } from '../types';
import { THEME_KEYS } from '../theme/themes';

const KEY_V4 = 'santoryu:progress:v4';
const KEY_V3 = 'santoryu:progress:v3';
const KEY_CORRUPTED = 'santoryu:progress:v4_corrupted_backup';

// ─── MIGRATION ───────────────────────────────────────────────────────────────

function migrateV3ToV4(v3: Record<string, unknown>): Record<string, unknown> {
  return {
    ...v3,
    schemaVersion: 4,
    hydrationLog: {},
    foodLog: {},
    bodyComposition: {
      bodyFatPct: null,
      muscleMassPct: null,
      chest: null,
      waist: null,
      hips: null,
      arms: null,
      thighs: null,
      unit: 'cm',
    },
    breathingLog: {},
    arcProgress: {},
    bountyMissions: [],
    swordSharpnessLog: {},
    dreamArchetypeLog: {},
    voyageChronicles: [],
  };
}

// ─── VALIDATION ──────────────────────────────────────────────────────────────

export const REQUIRED_V4_KEYS = [
  'totalXP', 'peakXP', 'activeSword', 'schemaVersion',
  'sessions', 'skillUnlocks', 'bossChallenges', 'dayLog',
] as const;

export function validateV4State(state: unknown): state is Progress {
  if (!state || typeof state !== 'object') return false;
  const s = state as Record<string, unknown>;
  if (s.schemaVersion !== 4) return false;
  for (const key of REQUIRED_V4_KEYS) {
    if (!(key in s)) return false;
  }
  if (typeof s.totalXP !== 'number' || (s.totalXP as number) < 0) return false;
  const su = s.skillUnlocks as Record<string, unknown> | undefined;
  if (!su) return false;
  for (const d of DISCIPLINES) {
    if (!su[d]) return false;
  }
  return true;
}

// ─── THEME UNLOCK SYSTEM ─────────────────────────────────────────────────────

// Predicates keyed by theme. THEME_KEYS not in this map default to "always unlocked"
// so the three base disciplines never need explicit entries.
const THEME_UNLOCK_GATES: Partial<Record<string, (p: Progress) => boolean>> = {
  hollow: (p) => countBossDefeats(p) >= 1,
  solar:  (p) => areAllSkillTreesComplete(p),
  abyss:  (p) => countBossDefeats(p) >= 3,
};

export const THEME_UNLOCK_CONDITIONS: Record<string, (p: Progress) => boolean> = Object.fromEntries(
  THEME_KEYS.map(k => [k, THEME_UNLOCK_GATES[k] ?? (() => true)]),
);

export const THEME_UNLOCK_HINTS: Record<string, string> = {
  hollow: 'Defeat your first boss challenge',
  solar:  'Complete all three discipline skill trees',
  abyss:  'Defeat all three boss challenges',
};

export const DEFAULT_UNLOCKED_THEMES: readonly string[] = THEME_KEYS.filter(k => !THEME_UNLOCK_GATES[k]);

export function getUnlockedThemes(progress: Progress): string[] {
  return THEME_KEYS.filter(k => THEME_UNLOCK_CONDITIONS[k](progress));
}

export function checkThemeUnlocks(prev: Progress, next: Progress): string[] {
  const nowUnlocked = getUnlockedThemes(next);
  const alreadyKnown = prev.unlockedThemes ?? DEFAULT_UNLOCKED_THEMES;
  return nowUnlocked.filter(k => !alreadyKnown.includes(k));
}

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingProgress: Progress | null = null;
let pendingResolvers: (() => void)[] = [];

// Set when the native read itself failed (as opposed to the blob being
// corrupt). In that state the stored blob may be perfectly intact, so
// saves are refused — otherwise a one-off read glitch would return a
// fresh default whose first save permanently clobbers the user's data.
let readFailed = false;

// Runs boss week-end expiry against the loaded state and rolls events into
// _pendingEvents so the UI can surface them on next render.
function applyStartupExpiry(progress: Progress): Progress {
  const { progress: next, events } = evaluateBossExpiry(progress, toDateKey(new Date()));
  if (events.length === 0) return progress;
  const existing = next._pendingEvents ?? [];
  return { ...next, _pendingEvents: [...existing, ...events] };
}

// Corrupt blob (unparseable or invalid): preserve the raw bytes, persist a
// clean default, and surface a data_reset warning to the UI.
async function backupAndReset(raw: string): Promise<{ progress: Progress; wasReset: boolean }> {
  await AsyncStorage.setItem(KEY_CORRUPTED, raw);
  const fresh = defaultProgress();
  fresh._pendingEvents = [{ type: 'data_reset' }];
  await AsyncStorage.setItem(KEY_V4, JSON.stringify({ ...fresh, _pendingEvents: undefined }));
  return { progress: fresh, wasReset: true };
}

export async function loadProgress(): Promise<{ progress: Progress; wasReset: boolean }> {
  let raw4: string | null = null;
  let raw3: string | null = null;
  try {
    raw4 = await AsyncStorage.getItem(KEY_V4);
    if (!raw4) raw3 = await AsyncStorage.getItem(KEY_V3);
  } catch (e) {
    // Transient native read failure — the blob may be fine. Serve defaults
    // for this launch but refuse to save over the stored data.
    console.error('[progressStore] read failed; saves disabled to protect stored data:', e);
    readFailed = true;
    return { progress: defaultProgress(), wasReset: false };
  }
  readFailed = false;

  try {
    if (raw4) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw4);
      } catch {
        // Syntactically broken JSON — the most likely shape of real-world
        // corruption (app killed mid-write). Same treatment as validation
        // failure: back up first, never silently discard.
        console.error('[progressStore] v4 state is not valid JSON; backing up and resetting');
        return await backupAndReset(raw4);
      }
      if (validateV4State(parsed)) {
        return { progress: applyStartupExpiry(normalizeProgress(parsed)), wasReset: false };
      }
      console.error('[progressStore] v4 state failed validation; backing up and resetting');
      return await backupAndReset(raw4);
    }

    if (raw3) {
      let parsedV3: unknown;
      try {
        parsedV3 = JSON.parse(raw3);
      } catch {
        console.error('[progressStore] v3 state is not valid JSON; backing up and resetting');
        const result = await backupAndReset(raw3);
        await AsyncStorage.removeItem(KEY_V3);
        return result;
      }
      const migratedRaw = migrateV3ToV4(parsedV3 as Record<string, unknown>);
      // Validate the raw migration before normalize — normalize would otherwise
      // fill in defaults for v3-required fields (totalXP, sessions, etc.) and
      // mask a v3 payload that never had them.
      if (!validateV4State(migratedRaw)) {
        console.error('[progressStore] v3 migration failed validation; backing up and resetting');
        await AsyncStorage.setItem(KEY_CORRUPTED, raw3);
        const fresh = defaultProgress();
        fresh._pendingEvents = [{ type: 'data_reset' }];
        // Persist clean v4 (explicitly without the in-memory data_reset event)
        // and clear the broken v3 so the next launch loads valid v4 instead of
        // re-entering this branch and re-emitting data_reset every cold start.
        // Mirrors the v4-corruption branch above — invariant holds regardless
        // of statement order, not just because stringify precedes the mutation.
        await AsyncStorage.setItem(KEY_V4, JSON.stringify({ ...fresh, _pendingEvents: undefined }));
        await AsyncStorage.removeItem(KEY_V3);
        return { progress: fresh, wasReset: true };
      }
      // Normalize after validation to fill v4-only fields the v3 schema lacks
      // (unlockedThemes, bossAttemptHistory, stepLog, vitalsLog).
      const migrated = normalizeProgress(migratedRaw);
      await AsyncStorage.setItem(KEY_V4, JSON.stringify(migrated));
      await AsyncStorage.removeItem(KEY_V3);
      return { progress: applyStartupExpiry(migrated), wasReset: false };
    }

    return { progress: defaultProgress(), wasReset: false };
  } catch (e) {
    // The backup/reset sequence itself failed part-way — state on disk is
    // unknown, so keep saves disabled for this launch rather than risk
    // overwriting whatever survived.
    console.error('[progressStore] recovery failed; saves disabled:', e);
    readFailed = true;
    return { progress: defaultProgress(), wasReset: false };
  }
}

/**
 * Debounced by default (500ms) to coalesce bursts of small updates. Pass
 * `immediate: true` for writes that must not sit in the debounce window
 * (session end — losing it loses a whole workout). All superseded callers'
 * promises resolve when the coalesced write lands.
 */
export function saveProgress(progress: Progress, { immediate = false }: { immediate?: boolean } = {}): Promise<void> {
  if (readFailed) {
    console.error('[progressStore] save refused: last read failed, stored data may be intact');
    return Promise.resolve();
  }
  pendingProgress = progress;
  return new Promise((resolve) => {
    pendingResolvers.push(resolve);
    if (saveTimer) clearTimeout(saveTimer);
    if (immediate) {
      saveTimer = null;
      void flushSave();
    } else {
      saveTimer = setTimeout(() => { void flushSave(); }, 500);
    }
  });
}

/**
 * Writes any pending debounced save immediately. Call when the app is
 * backgrounded: RN timers don't fire while suspended, so without this the
 * last debounce window of writes dies with the process.
 */
export async function flushSave(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const progress = pendingProgress;
  const resolvers = pendingResolvers;
  pendingProgress = null;
  pendingResolvers = [];
  if (!progress) return;
  try {
    const { _pendingEvents, ...toSave } = progress;
    await AsyncStorage.setItem(KEY_V4, JSON.stringify(toSave));
  } catch (e) {
    console.error('[progressStore] Failed to save progress:', e);
  } finally {
    resolvers.forEach(r => r());
  }
}

export async function resetProgress(): Promise<void> {
  // Cancel any pending debounced save so it can't restore the deleted state
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pendingProgress = null;
  const abandoned = pendingResolvers;
  pendingResolvers = [];
  abandoned.forEach(r => r());
  readFailed = false; // deliberate wipe: the store is coherent again
  try {
    await AsyncStorage.multiRemove([KEY_V4, KEY_V3]);
  } catch (e) {
    console.error('[progressStore] Failed to reset progress:', e);
  }
}

export { defaultProgress, normalizeProgress };
