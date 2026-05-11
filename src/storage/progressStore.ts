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

// Runs boss week-end expiry against the loaded state and rolls events into
// _pendingEvents so the UI can surface them on next render.
function applyStartupExpiry(progress: Progress): Progress {
  const { progress: next, events } = evaluateBossExpiry(progress, toDateKey(new Date()));
  if (events.length === 0) return progress;
  const existing = next._pendingEvents ?? [];
  return { ...next, _pendingEvents: [...existing, ...events] };
}

export async function loadProgress(): Promise<{ progress: Progress; wasReset: boolean }> {
  try {
    const raw4 = await AsyncStorage.getItem(KEY_V4);
    if (raw4) {
      const parsed = JSON.parse(raw4);
      if (validateV4State(parsed)) {
        return { progress: applyStartupExpiry(normalizeProgress(parsed)), wasReset: false };
      }
      console.error('[progressStore] v4 state failed validation; backing up and resetting');
      await AsyncStorage.setItem(KEY_CORRUPTED, raw4);
      const fresh = defaultProgress();
      fresh._pendingEvents = [{ type: 'data_reset' }];
      await AsyncStorage.setItem(KEY_V4, JSON.stringify({ ...fresh, _pendingEvents: undefined }));
      return { progress: fresh, wasReset: true };
    }

    const raw3 = await AsyncStorage.getItem(KEY_V3);
    if (raw3) {
      const migratedRaw = migrateV3ToV4(JSON.parse(raw3));
      // Validate the raw migration before normalize — normalize would otherwise
      // fill in defaults for v3-required fields (totalXP, sessions, etc.) and
      // mask a v3 payload that never had them.
      if (!validateV4State(migratedRaw)) {
        console.error('[progressStore] v3 migration failed validation; backing up and resetting');
        await AsyncStorage.setItem(KEY_CORRUPTED, raw3);
        const fresh = defaultProgress();
        fresh._pendingEvents = [{ type: 'data_reset' }];
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
  } catch {
    return { progress: defaultProgress(), wasReset: false };
  }
}

export function saveProgress(progress: Progress): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer);
  return new Promise((resolve) => {
    saveTimer = setTimeout(async () => {
      try {
        const { _pendingEvents, ...toSave } = progress;
        await AsyncStorage.setItem(KEY_V4, JSON.stringify(toSave));
        resolve();
      } catch (e) {
        console.error('[progressStore] Failed to save progress:', e);
        resolve();
      }
    }, 500);
  });
}

export async function resetProgress(): Promise<void> {
  // Cancel any pending debounced save so it can't restore the deleted state
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    await AsyncStorage.multiRemove([KEY_V4, KEY_V3]);
  } catch (e) {
    console.error('[progressStore] Failed to reset progress:', e);
  }
}

export { defaultProgress, normalizeProgress };
