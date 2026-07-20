import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultProgress, normalizeProgress, countBossDefeats, areAllSkillTreesComplete, evaluateBossExpiry, toDateKey } from '../logic/progression';
import type { Progress } from '../types';
import { DISCIPLINES } from '../types';
import { THEME_KEYS } from '../theme/themes';

const KEY_V4 = 'santoryu:progress:v4';
const KEY_V3 = 'santoryu:progress:v3';
const KEY_CORRUPTED = 'santoryu:progress:v4_corrupted_backup';
const KEY_CORRUPTED_LATEST = 'santoryu:progress:v4_corrupted_backup_latest';

// ─── MIGRATION ───────────────────────────────────────────────────────────────

export const CURRENT_SCHEMA_VERSION = 4;

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

// Sequential ladder: MIGRATIONS[v] lifts a version-v blob to v+1 (each step
// must bump schemaVersion). Adding v5 later means one entry here plus a bump
// of CURRENT_SCHEMA_VERSION — no restructuring of loadProgress.
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  3: migrateV3ToV4,
};

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

// Set when the stored data must not be written over: the native read failed
// (blob may be perfectly intact), or the blob carries a NEWER schemaVersion
// than this build understands (e.g. restored from a device running a newer
// app). In either state saves are refused — otherwise a fresh default's
// first save would permanently clobber the user's data.
let savesDisabled = false;

// Runs boss week-end expiry against the loaded state and rolls events into
// _pendingEvents so the UI can surface them on next render.
function applyStartupExpiry(progress: Progress): Progress {
  const { progress: next, events } = evaluateBossExpiry(progress, toDateKey(new Date()));
  if (events.length === 0) return progress;
  const existing = next._pendingEvents ?? [];
  return { ...next, _pendingEvents: [...existing, ...events] };
}

// Corrupt-blob evidence is two-slot: the FIRST corruption ever seen stays at
// KEY_CORRUPTED forever (a later event must not destroy the only forensic
// copy of the first), the most recent lands at KEY_CORRUPTED_LATEST.
async function backupCorrupted(raw: string): Promise<void> {
  const first = await AsyncStorage.getItem(KEY_CORRUPTED);
  if (first == null) await AsyncStorage.setItem(KEY_CORRUPTED, raw);
  else await AsyncStorage.setItem(KEY_CORRUPTED_LATEST, raw);
}

// Corrupt blob (unparseable, invalid, or unmigratable): preserve the raw
// bytes, persist a clean default, and surface a data_reset warning to the UI.
async function backupAndReset(raw: string): Promise<{ progress: Progress; wasReset: boolean }> {
  await backupCorrupted(raw);
  const fresh = defaultProgress();
  fresh._pendingEvents = [{ type: 'data_reset' }];
  await AsyncStorage.setItem(KEY_V4, JSON.stringify({ ...fresh, _pendingEvents: undefined }));
  // Clear the legacy key so the next launch loads the clean v4 blob instead
  // of re-entering recovery and re-emitting data_reset every cold start.
  await AsyncStorage.removeItem(KEY_V3);
  return { progress: fresh, wasReset: true };
}

export async function loadProgress(): Promise<{ progress: Progress; wasReset: boolean }> {
  let raw: string | null = null;
  let fromLegacyKey = false;
  try {
    raw = await AsyncStorage.getItem(KEY_V4);
    if (!raw) {
      raw = await AsyncStorage.getItem(KEY_V3);
      fromLegacyKey = raw != null;
    }
  } catch (e) {
    // Transient native read failure — the blob may be fine. Serve defaults
    // for this launch but refuse to save over the stored data.
    console.error('[progressStore] read failed; saves disabled to protect stored data:', e);
    savesDisabled = true;
    return { progress: defaultProgress(), wasReset: false };
  }
  savesDisabled = false;

  if (!raw) return { progress: defaultProgress(), wasReset: false };

  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Syntactically broken JSON — the most likely shape of real-world
      // corruption (app killed mid-write). Back up first, never silently
      // discard.
      console.error('[progressStore] stored state is not valid JSON; backing up and resetting');
      return await backupAndReset(raw);
    }

    let working = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
    // Legacy-key blobs predate the schemaVersion field; the key itself
    // identifies them as v3.
    let version = typeof working.schemaVersion === 'number'
      ? working.schemaVersion
      : fromLegacyKey ? 3 : null;

    if (version !== null && version > CURRENT_SCHEMA_VERSION) {
      // Data written by a NEWER app version (OTA rollback, device transfer).
      // This build cannot understand it — and must never overwrite it.
      console.error(`[progressStore] stored schemaVersion ${version} is newer than supported ${CURRENT_SCHEMA_VERSION}; saves disabled`);
      savesDisabled = true;
      return { progress: defaultProgress(), wasReset: false };
    }

    // Walk the ladder up to the current version. A missing step or one that
    // fails to advance the version falls through to validation, which fails
    // and takes the corruption path.
    while (version !== null && version < CURRENT_SCHEMA_VERSION) {
      const step = MIGRATIONS[version];
      if (!step) break;
      working = { ...step(working) };
      if (working.schemaVersion == null) working.schemaVersion = version + 1;
      const nextVersion = working.schemaVersion as number;
      if (typeof nextVersion !== 'number' || nextVersion <= version) break;
      version = nextVersion;
    }

    // Validate BEFORE normalize — normalize would otherwise fill defaults
    // for required fields and mask a payload that never had them.
    if (!validateV4State(working)) {
      console.error('[progressStore] stored state failed validation; backing up and resetting');
      return await backupAndReset(raw);
    }

    const normalized = normalizeProgress(working);
    if (fromLegacyKey) {
      await AsyncStorage.setItem(KEY_V4, JSON.stringify(normalized));
      await AsyncStorage.removeItem(KEY_V3);
    }
    return { progress: applyStartupExpiry(normalized), wasReset: false };
  } catch (e) {
    // The backup/reset sequence itself failed part-way — state on disk is
    // unknown, so keep saves disabled for this launch rather than risk
    // overwriting whatever survived.
    console.error('[progressStore] recovery failed; saves disabled:', e);
    savesDisabled = true;
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
  if (savesDisabled) {
    console.error('[progressStore] save refused: stored data is protected (failed read or newer schema)');
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
  savesDisabled = false; // deliberate wipe: the store is coherent again
  try {
    await AsyncStorage.multiRemove([KEY_V4, KEY_V3]);
  } catch (e) {
    console.error('[progressStore] Failed to reset progress:', e);
  }
}

export { defaultProgress, normalizeProgress };
