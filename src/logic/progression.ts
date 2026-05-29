// @ts-nocheck
/**
 * Pure progression logic. No React, no Firebase, no side effects.
 * Copied unchanged from the web project and extended with session tracking,
 * recovery, skill trees, and boss challenges.
 */
import { SWORDS, RANKS, REWARDS, TITLE_PATHS, SKILL_TREES, BOSS_CHALLENGES, BOUNTY_MISSIONS, TRAINING_ARCS, getExerciseById } from '../data/gameData';
import type { Progress, Discipline, Session, LoggedExercise } from '../types';
import { DISCIPLINES } from '../types';

export const BOSS_HINT_FAIL_THRESHOLD = 3;
export const BOSS_ATTEMPT_HISTORY_CAP = 50;

export const XP_PER_EXERCISE = 100;

// ─── ACTIVITY RINGS GOALS ─────────────────────────────────────────────────────

export const MOVE_GOAL   = 500;  // kcal burned per day
export const EXERCISE_GOAL = 60;  // training minutes per day
export const STAND_GOAL  = 8;    // hydration cups per day (stand indicator)

// ─── ACTIVITY RINGS ──────────────────────────────────────────────────────────

/**
 * Computes activity ring progress (move, exercise, stand) for a given date.
 * @param progress - the progress object
 * @param date - date string in YYYY-MM-DD format
 * @returns object with move, exercise, stand rings showing current/goal/pct
 */
export function computeActivityRings(progress: Progress, date: string) {
  // Move: total calories burned from sessions on date
  const daySessions = (progress.sessions || []).filter(s => {
    const sd = toDateKey(new Date(s.endedAt));
    return sd === date;
  });
  const moveKcal = daySessions.reduce((a, s) => a + (s.calories || 0), 0);

  // Exercise: total training minutes on date
  const exerciseMin = daySessions.reduce((a, s) => {
    const durMs = (s.endedAt || 0) - (s.startedAt || 0);
    return a + durMs / 60000;
  }, 0);

  // Stand: hydration cups logged (1 cup = 1 "stand hour")
  const standCups = progress.hydrationLog?.[date]?.cups ?? 0;

  return {
    move:    { current: Math.round(moveKcal),    goal: MOVE_GOAL,   pct: Math.min(1, moveKcal / MOVE_GOAL) },
    exercise:{ current: Math.round(exerciseMin),  goal: EXERCISE_GOAL, pct: Math.min(1, exerciseMin / EXERCISE_GOAL) },
    stand:   { current: standCups,                goal: STAND_GOAL,   pct: Math.min(1, standCups / STAND_GOAL) },
  };
}

/**
 * Computes the percentage of days where all three activity rings were closed.
 * @param progress - the progress object
 * @param dateRange - array of {date} objects to evaluate
 * @returns percentage (0-100) of days with all rings closed
 */
export function computeRingClosureRate(progress: Progress, dateRange: { date: string }[]) {
  // dateRange: [{date}] or compute for last N days
  let closedDays = 0;
  for (const { date } of dateRange) {
    const rings = computeActivityRings(progress, date);
    if (rings.move.pct >= 1 && rings.exercise.pct >= 1 && rings.stand.pct >= 1) {
      closedDays++;
    }
  }
  return dateRange.length > 0 ? Math.round((closedDays / dateRange.length) * 100) : 0;
}
export const MAX_COMPLETIONS_PER_DAY = 50;
export const XP_PER_SESSION_HOUR = 500;
export const MAX_RECOVERY = 100;
export const RECOVERY_COST_PER_HOUR = 15;
export const RECOVERY_GAIN_PER_HOUR_SLEEP = 20;

// ─── DATE HELPERS ────────────────────────────────────────────────────────────

/**
 * Converts a Date object to a YYYY-MM-DD date key string.
 * @param date - Date object (defaults to now)
 * @returns date string in YYYY-MM-DD format
 */
export function toDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export const DISPLAY_NAME_MAX = 40;

/**
 * Sanitizes a user-entered display name before it is persisted or rendered.
 * Strips C0/C1 control chars and Unicode bidi controls (incl. U+061C ALM),
 * bidi embeddings/overrides/isolates, zero-width and invisible format chars,
 * and invisible Hangul fillers (U+115F/1160/3164/FFA0) — all vectors for later
 * UI text-spoofing. Collapses internal whitespace, trims, and caps length by
 * code point (never severing an astral char). Non-strings become ''.
 * @param raw - untrusted name value (from input or storage)
 * @returns a safe, display-ready name (possibly empty)
 */
export function sanitizeDisplayName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let cleaned = '';
  for (const ch of raw.normalize('NFC')) {
    const c = ch.codePointAt(0)!;
    if (c <= 0x1f) { cleaned += ' '; continue; }            // C0 controls -> space
    if (c >= 0x7f && c <= 0x9f) continue;                    // DEL + C1
    if (c === 0x061c) continue;                              // ARABIC LETTER MARK (bidi control)
    if (c >= 0x115f && c <= 0x1160) continue;                // HANGUL CHO/JUNG FILLERS (invisible)
    if (c === 0x3164) continue;                              // HANGUL FILLER (invisible)
    if (c === 0xffa0) continue;                              // HALFWIDTH HANGUL FILLER (invisible)
    if (c >= 0x200b && c <= 0x200f) continue;                // zero-width + LTR/RTL marks
    if (c >= 0x202a && c <= 0x202e) continue;                // bidi embeddings/overrides
    if (c >= 0x2060 && c <= 0x2064) continue;                // word joiner / invisible
    if (c >= 0x2066 && c <= 0x2069) continue;                // bidi isolates
    if (c === 0xfeff) continue;                              // BOM / ZWNBSP
    cleaned += ch;
  }
  // Cap by code point, not UTF-16 unit, so an astral char (emoji, CJK ext.)
  // at the boundary is never severed into a lone surrogate. Grapheme clusters
  // (emoji+VS16 / ZWJ sequences) may still split at the cap — acceptable for a
  // 40-char name and avoids depending on Intl.Segmenter (spotty in Hermes).
  const collapsed = cleaned.replace(/\s+/g, ' ').trim();
  return Array.from(collapsed).slice(0, DISPLAY_NAME_MAX).join('');
}

/**
 * True iff `raw` yields a non-empty name after sanitization. Single source of
 * truth for "can this be entered" — used by the welcome button's enabled state
 * AND the persistence guard so they can never disagree (a name the screen lets
 * through but sanitization empties would otherwise be a silent no-op).
 */
export function isEnterableName(raw: unknown): boolean {
  return sanitizeDisplayName(raw).length > 0;
}

/**
 * Whether the welcome/login gate should be shown. Shared by Dojo.js (the
 * runtime gate) and the welcome-gate tests so the two can never silently drift.
 * `authSkipped` is the session-only "Skip for now" flag (never persisted).
 */
export function shouldShowWelcome(
  progress: { userProfile?: { signedIn?: boolean } | null } | null | undefined,
  authSkipped: boolean,
): boolean {
  return !progress?.userProfile?.signedIn && !authSkipped;
}

/**
 * Converts a Date object to a YYYY-MM-DDTHH hour key string.
 * @param date - Date object (defaults to now)
 * @returns hour string in YYYY-MM-DDTHH format
 */
export function toHourKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 13);
}

// ─── DEFAULT / NORMALIZE ─────────────────────────────────────────────────────

/**
 * Returns the default progress object with all fields initialized.
 * @returns a new default progress object
 */
export function defaultProgress(): Progress {
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
    schemaVersion: 4,

    // v3 fields
    sessions: [],
    sleepLog: {},
    moodLog: {},
    bodyStats: { weight: 70, height: 175, unit: 'kg' },
    skillUnlocks: { wado: {}, sandai: {}, shusui: {} },
    bossChallenges: [],
    recoveryScore: MAX_RECOVERY,
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

    unlockedThemes: [...DISCIPLINES],
    bossAttemptHistory: {},
    userProfile: null,

    // v4 fields
    hydrationLog: {},
    foodLog: {},
    bodyComposition: {
      bodyFatPct: null, muscleMassPct: null,
      chest: null, waist: null, hips: null, arms: null, thighs: null,
      unit: 'cm',
    },
    breathingLog: {},
    arcProgress: {},
    bountyMissions: [],
    swordSharpnessLog: {},
    dreamArchetypeLog: {},
    voyageChronicles: [],
    stepLog: {},
    vitalsLog: {},
  };
}

/**
 * Returns the rank index for a given XP amount.
 * @param xp - total XP
 * @returns rank index or length-1 if beyond max rank
 */
export function rankIndexFor(xp: number): number {
  const i = RANKS.findIndex(r => xp >= r.min && xp < r.max);
  return i === -1 ? RANKS.length - 1 : i;
}

/**
 * Normalizes and validates raw progress data, migrating from older schemas.
 * @param raw - raw progress object from storage
 * @returns normalized progress object with all required fields
 */
export function normalizeProgress(raw: any): Progress {
  if (!raw || typeof raw !== 'object') return defaultProgress();

  const base = defaultProgress();
  const out: Progress = { ...base };

  // Primitive fields
  if (typeof raw.totalXP === 'number' && raw.totalXP >= 0 && raw.totalXP < 1e9) out.totalXP = raw.totalXP;
  if (typeof raw.peakXP === 'number' && raw.peakXP >= 0 && raw.peakXP < 1e9) out.peakXP = raw.peakXP;
  out.peakXP = Math.max(out.peakXP, out.totalXP);
  if (SWORDS[raw.activeSword]) out.activeSword = raw.activeSword;
  if (typeof raw.lastLevel === 'number' && raw.lastLevel >= 0) out.lastLevel = raw.lastLevel;
  if (typeof raw.recoveryScore === 'number') out.recoveryScore = Math.max(0, Math.min(MAX_RECOVERY, raw.recoveryScore));
  if (typeof raw.lastRecoveryUpdate === 'string') out.lastRecoveryUpdate = raw.lastRecoveryUpdate;

  // Body stats
  if (raw.bodyStats && typeof raw.bodyStats === 'object') {
    out.bodyStats = {
      weight: typeof raw.bodyStats.weight === 'number' && raw.bodyStats.weight > 0 ? raw.bodyStats.weight : 70,
      height: typeof raw.bodyStats.height === 'number' && raw.bodyStats.height > 0 ? raw.bodyStats.height : 175,
      unit: raw.bodyStats.unit === 'lb' ? 'lb' : 'kg',
    };
  }

  // completedByDate
  if (raw.completedByDate && typeof raw.completedByDate === 'object') {
    const clean = {};
    for (const [date, exMap] of Object.entries(raw.completedByDate)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!exMap || typeof exMap !== 'object') continue;
      const cleanMap = {};
      let count = 0;
      for (const [exKey, val] of Object.entries(exMap)) {
        if (count >= MAX_COMPLETIONS_PER_DAY) break;
        if (typeof exKey === 'string' && exKey.length < 200 && val === true) {
          cleanMap[exKey] = true;
          count++;
        }
      }
      clean[date] = cleanMap;
    }
    out.completedByDate = clean;
  }

  // dayLog
  if (raw.dayLog && typeof raw.dayLog === 'object') {
    const clean = {};
    for (const [date, counts] of Object.entries(raw.dayLog)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!counts || typeof counts !== 'object') continue;
      clean[date] = {
        wado:   safeNum(counts.wado),
        sandai: safeNum(counts.sandai),
        shusui: safeNum(counts.shusui),
      };
    }
    out.dayLog = clean;
  }

  // unlocked (rewards)
  if (Array.isArray(raw.unlocked)) {
    const validIds = new Set(REWARDS.map(r => r.id));
    out.unlocked = [...new Set(raw.unlocked.filter(id => validIds.has(id)))];
  }

  // completedWeeks
  if (Array.isArray(raw.completedWeeks)) {
    out.completedWeeks = raw.completedWeeks
      .filter(w => w && TITLE_PATHS[w.path] && typeof w.weekNum === 'number' && w.weekNum > 0)
      .slice(0, 520);
  }

  // earnedTitles
  if (Array.isArray(raw.earnedTitles)) {
    out.earnedTitles = raw.earnedTitles.filter(t =>
      t && TITLE_PATHS[t.path] && TITLE_PATHS[t.path].tiers.some(tier => tier.weeks === t.weeks)
    );
  }

  // weekStartDate
  if (typeof raw.weekStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.weekStartDate)) {
    out.weekStartDate = raw.weekStartDate;
  }

  // sessions
  if (Array.isArray(raw.sessions)) {
    out.sessions = raw.sessions
      .filter(s => s && typeof s.endedAt === 'number')
      .slice(-200);
  } else {
    out.sessions = [];
  }

  // sleepLog
  if (raw.sleepLog && typeof raw.sleepLog === 'object') {
    const clean = {};
    for (const [date, data] of Object.entries(raw.sleepLog)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!data || typeof data !== 'object') continue;
      clean[date] = {
        quality: safeNum(data.quality, 1, 5),
        hours:   Math.max(0, Math.min(24, Number(data.hours) || 0)),
        deepHours:  Math.max(0, Math.min(24, Number(data.deepHours) || 0)),
        lightHours: Math.max(0, Math.min(24, Number(data.lightHours) || 0)),
        remHours:   Math.max(0, Math.min(24, Number(data.remHours) || 0)),
        awakeHours: Math.max(0, Math.min(24, Number(data.awakeHours) || 0)),
      };
    }
    out.sleepLog = clean;
  }

  // moodLog
  if (raw.moodLog && typeof raw.moodLog === 'object') {
    const clean = {};
    for (const [date, data] of Object.entries(raw.moodLog)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!data || typeof data !== 'object') continue;
      clean[date] = {
        energy: Math.max(1, Math.min(10, safeNum(data.energy, 1, 10))),
        mood:   Math.max(1, Math.min(10, safeNum(data.mood,   1, 10))),
      };
    }
    out.moodLog = clean;
  }

  // skillUnlocks
  if (raw.skillUnlocks && typeof raw.skillUnlocks === 'object') {
    const clean = {};
    for (const disc of ['wado', 'sandai', 'shusui']) {
      if (raw.skillUnlocks[disc] && typeof raw.skillUnlocks[disc] === 'object') {
        clean[disc] = {};
        for (const [branch, ids] of Object.entries(raw.skillUnlocks[disc])) {
          if (Array.isArray(ids)) {
            clean[disc][branch] = ids.filter(id => typeof id === 'string');
          }
        }
      }
    }
    out.skillUnlocks = clean;
  } else {
    out.skillUnlocks = { wado: {}, sandai: {}, shusui: {} };
  }

  // bossChallenges
  if (Array.isArray(raw.bossChallenges)) {
    out.bossChallenges = raw.bossChallenges.filter(b =>
      b && b.id && typeof b.weekOf === 'string'
    );
  } else {
    out.bossChallenges = [];
  }

  {
    const valid = ['wado', 'sandai', 'shusui', 'hollow', 'solar', 'abyss'];
    const saved = Array.isArray(raw.unlockedThemes)
      ? raw.unlockedThemes.filter((t: string) => valid.includes(t))
      : [];
    out.unlockedThemes = [...new Set([...DISCIPLINES, ...saved])];
  }

  if (raw.bossAttemptHistory && typeof raw.bossAttemptHistory === 'object') {
    const clean: Record<string, { weekOf: string; success: boolean }[]> = {};
    for (const [bossId, history] of Object.entries(raw.bossAttemptHistory)) {
      if (Array.isArray(history)) {
        clean[bossId] = history
          .filter((h: any) => h && typeof h.weekOf === 'string' && typeof h.success === 'boolean')
          .slice(-BOSS_ATTEMPT_HISTORY_CAP);
      }
    }
    out.bossAttemptHistory = clean;
  } else {
    out.bossAttemptHistory = {};
  }

  // v4: hydrationLog
  if (raw.hydrationLog && typeof raw.hydrationLog === 'object') {
    const clean = {};
    for (const [date, data] of Object.entries(raw.hydrationLog)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (data && typeof data.cups === 'number') clean[date] = { cups: Math.max(0, Math.min(50, Math.floor(data.cups))) };
    }
    out.hydrationLog = clean;
  }

  // v4: foodLog
  if (raw.foodLog && typeof raw.foodLog === 'object') {
    const clean = {};
    for (const [date, entries] of Object.entries(raw.foodLog)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!Array.isArray(entries)) continue;
      clean[date] = entries
        .filter(e => e && typeof e.name === 'string' && typeof e.kcal === 'number')
        .slice(0, 30)
        .map(e => ({
          name:    String(e.name).slice(0, 100),
          kcal:    Math.max(0, Math.round(e.kcal)),
          protein: Math.max(0, e.protein || 0),
          carbs:   Math.max(0, e.carbs   || 0),
          fat:     Math.max(0, e.fat     || 0),
          mealId:  e.mealId || null,
        }));
    }
    out.foodLog = clean;
  }

  // v4: bodyComposition
  if (raw.bodyComposition && typeof raw.bodyComposition === 'object') {
    const bc = raw.bodyComposition;
    const safeNullNum = v => (typeof v === 'number' && v > 0 && v < 1000) ? v : null;
    out.bodyComposition = {
      bodyFatPct:    safeNullNum(bc.bodyFatPct),
      muscleMassPct: safeNullNum(bc.muscleMassPct),
      chest: safeNullNum(bc.chest), waist: safeNullNum(bc.waist), hips: safeNullNum(bc.hips),
      arms:  safeNullNum(bc.arms),  thighs: safeNullNum(bc.thighs),
      unit: bc.unit === 'in' ? 'in' : 'cm',
    };
  }

  // v4: breathingLog
  if (raw.breathingLog && typeof raw.breathingLog === 'object') {
    const clean = {};
    for (const [date, sessions] of Object.entries(raw.breathingLog)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!Array.isArray(sessions)) continue;
      clean[date] = sessions.filter(s => s && typeof s.programId === 'string').slice(0, 20);
    }
    out.breathingLog = clean;
  }

  // v4: arcProgress
  if (raw.arcProgress && typeof raw.arcProgress === 'object') {
    const clean = {};
    for (const [arcId, data] of Object.entries(raw.arcProgress)) {
      if (!data || typeof arcId !== 'string') continue;
      clean[arcId] = {
        startedAt:      typeof data.startedAt === 'string' ? data.startedAt : null,
        completedWeeks: Array.isArray(data.completedWeeks) ? data.completedWeeks.slice(0, 52) : [],
        status:         ['active', 'completed', 'abandoned'].includes(data.status) ? data.status : 'active',
      };
    }
    out.arcProgress = clean;
  }

  // v4: bountyMissions
  if (Array.isArray(raw.bountyMissions)) {
    out.bountyMissions = raw.bountyMissions
      .filter(m => m && typeof m.id === 'string' && typeof m.type === 'string')
      .slice(0, 200);
  }

  // v4: swordSharpnessLog
  if (raw.swordSharpnessLog && typeof raw.swordSharpnessLog === 'object') {
    const clean = {};
    for (const [date, score] of Object.entries(raw.swordSharpnessLog)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (typeof score === 'number' && score >= 0 && score <= 100) clean[date] = score;
    }
    out.swordSharpnessLog = clean;
  }

  // v4: dreamArchetypeLog
  if (raw.dreamArchetypeLog && typeof raw.dreamArchetypeLog === 'object') {
    const valid = new Set(['Ronin', 'Guardian', 'Ghost', 'Berserker']);
    const clean = {};
    for (const [date, arch] of Object.entries(raw.dreamArchetypeLog)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (valid.has(arch)) clean[date] = arch;
    }
    out.dreamArchetypeLog = clean;
  }

  // v4: stepLog
  if (raw.stepLog && typeof raw.stepLog === 'object') {
    const clean = {};
    for (const [date, data] of Object.entries(raw.stepLog)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (data && typeof data.steps === 'number') {
        clean[date] = { steps: Math.max(0, Math.floor(data.steps)) };
      }
    }
    out.stepLog = clean;
  }

  // v4: vitalsLog
  if (raw.vitalsLog && typeof raw.vitalsLog === 'object') {
    const clean = {};
    for (const [date, data] of Object.entries(raw.vitalsLog)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (data && typeof data === 'object') {
        clean[date] = {
          restingHR: typeof data.restingHR === 'number' && data.restingHR > 0 && data.restingHR < 300 ? Math.round(data.restingHR) : null,
          hrv: typeof data.hrv === 'number' && data.hrv > 0 && data.hrv < 500 ? Math.round(data.hrv) : null,
          vo2Max: typeof data.vo2Max === 'number' && data.vo2Max > 0 && data.vo2Max < 100 ? Math.round(data.vo2Max * 10) / 10 : null,
        };
      }
    }
    out.vitalsLog = clean;
  }

  // v4: voyageChronicles
  if (Array.isArray(raw.voyageChronicles)) {
    out.voyageChronicles = raw.voyageChronicles
      .filter(c => c && typeof c.monthKey === 'string' && /^\d{4}-\d{2}$/.test(c.monthKey))
      .slice(0, 36);
  }

  // settings — always preserved; merge known keys over defaults
  if (raw.settings && typeof raw.settings === 'object') {
    const def = base.settings;
    out.settings = {
      theme:            typeof raw.settings.theme === 'string'  ? raw.settings.theme            : def.theme,
      autoTheme:        typeof raw.settings.autoTheme === 'boolean' ? raw.settings.autoTheme    : def.autoTheme,
      defaultIntensity: typeof raw.settings.defaultIntensity === 'number' ? raw.settings.defaultIntensity : def.defaultIntensity,
      soundEnabled:     typeof raw.settings.soundEnabled === 'boolean'  ? raw.settings.soundEnabled  : def.soundEnabled,
      hapticsEnabled:   typeof raw.settings.hapticsEnabled === 'boolean' ? raw.settings.hapticsEnabled : def.hapticsEnabled,
      morningReminder:  typeof raw.settings.morningReminder === 'boolean' ? raw.settings.morningReminder : def.morningReminder,
      reminderTime:     typeof raw.settings.reminderTime === 'string'   ? raw.settings.reminderTime  : def.reminderTime,
      restReminder:     typeof raw.settings.restReminder === 'boolean'  ? raw.settings.restReminder  : def.restReminder,
      stepGoal:         typeof raw.settings.stepGoal === 'number' && raw.settings.stepGoal > 0 ? Math.min(100000, Math.floor(raw.settings.stepGoal)) : def.stepGoal,
      gender:           raw.settings.gender === 'female' ? 'female' : 'male',
    };
  }

  // userProfile — local-only identity. Anything malformed collapses to null
  // (so the welcome screen reappears) rather than throwing.
  out.userProfile = null;
  if (raw.userProfile && typeof raw.userProfile === 'object') {
    const up = raw.userProfile;
    const name = sanitizeDisplayName(up.name);
    if (name.length > 0 && up.signedIn === true) {
      out.userProfile = {
        name,
        provider: up.provider === 'google' ? 'google' : 'local',
        signedIn: true,
        createdAt: typeof up.createdAt === 'string' ? up.createdAt : '',
      };
    }
  }

  return out;
}

// ─── THEME UNLOCK HELPERS ─────────────────────────────────────────────────────

export function countBossDefeats(progress: Progress): number {
  return (progress.bossChallenges || []).filter(b => b.completedAt).length;
}

export function isSkillTreeComplete(progress: Progress, discipline: Discipline): boolean {
  const tree = SKILL_TREES[discipline];
  if (!tree) return false;
  const unlocked = Object.values(progress.skillUnlocks?.[discipline] || {}).flat() as string[];
  for (const branch of Object.values(tree.branches)) {
    for (const unlock of branch.unlocks) {
      if (!unlocked.includes(unlock.id)) return false;
    }
  }
  return true;
}

export function areAllSkillTreesComplete(progress: Progress): boolean {
  return DISCIPLINES.every(d => isSkillTreeComplete(progress, d));
}

function appendAttempt(
  history: Record<string, { weekOf: string; success: boolean }[]>,
  bossId: string,
  entry: { weekOf: string; success: boolean },
): Record<string, { weekOf: string; success: boolean }[]> {
  const prev = history[bossId] ?? [];
  const updated = [...prev, entry];
  const capped = updated.length > BOSS_ATTEMPT_HISTORY_CAP ? updated.slice(-BOSS_ATTEMPT_HISTORY_CAP) : updated;
  return { ...history, [bossId]: capped };
}

// ─── BOSS EVALUATION (active + expiry) ───────────────────────────────────────

/**
 * Evaluates all active boss challenges for the current week. Records
 * completion in attemptHistory and emits boss_completed events.
 */
export function evaluateAllActiveBossChallenges(progress: Progress, date: string): { progress: Progress; events: ProgressionEvent[] } {
  const weekOf = weekOfYear(date);
  const activeIds = (progress.bossChallenges || [])
    .filter(b => b.weekOf === weekOf && !b.completedAt && !b.failed)
    .map(b => b.id);

  let next = progress;
  const events: ProgressionEvent[] = [];

  for (const bossId of activeIds) {
    const result = evaluateBossCompletion(next, bossId, date);
    if (result.events.length === 0) continue;

    next = {
      ...result.progress,
      bossAttemptHistory: appendAttempt(next.bossAttemptHistory || {}, bossId, { weekOf, success: true }),
    };
    events.push(...result.events);
  }

  return { progress: next, events };
}

export function evaluateBossExpiry(progress: Progress, date: string): { progress: Progress; events: ProgressionEvent[] } {
  const currentWeek = weekOfYear(date);
  const events: ProgressionEvent[] = [];

  let bossChallenges = progress.bossChallenges;
  let bossAttemptHistory = progress.bossAttemptHistory || {};
  let changed = false;

  for (let i = 0; i < bossChallenges.length; i++) {
    const entry = bossChallenges[i];
    if (entry.completedAt || entry.failed || entry.weekOf === currentWeek) continue;

    if (!changed) {
      bossChallenges = [...bossChallenges];
      changed = true;
    }

    bossChallenges[i] = { ...entry, failed: true };
    bossAttemptHistory = appendAttempt(bossAttemptHistory, entry.id, { weekOf: entry.weekOf, success: false });

    const boss = BOSS_CHALLENGES.find(b => b.id === entry.id);
    events.push({ type: 'boss_failed', boss });

    const history = bossAttemptHistory[entry.id];
    const recent = history.slice(-BOSS_HINT_FAIL_THRESHOLD);
    if (recent.length === BOSS_HINT_FAIL_THRESHOLD && recent.every(h => !h.success)) {
      events.push({ type: 'boss_hint', boss });
    }
  }

  if (!changed) return { progress, events: [] };
  return { progress: { ...progress, bossChallenges, bossAttemptHistory }, events };
}

function safeNum(v, min = 0, max = Infinity) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

// ─── LEGACY TOGGLE (kept for backward compat) ────────────────────────────────

/**
 * Legacy toggle function for marking exercises complete/incomplete.
 * @param progress - current progress object
 * @param action - toggle action with sword, exercise, date
 * @returns updated progress and events array
 */
export function applyToggle(progress: Progress, action: { sword: Discipline; exercise: string; date: string }) {
  const { sword, exercise, date } = action;

  if (!SWORDS[sword]) return { progress, events: [] };
  const swordData = SWORDS[sword];
  const matchedEx = swordData.exercises.find(e =>
    e.name.toLowerCase() === exercise.toLowerCase()
  );
  if (!matchedEx) return { progress, events: [] };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { progress, events: [] };

  const exKey = `${sword}-${exercise}`;
  const dayExercises = progress.completedByDate[date] || {};
  const wasCompleted = dayExercises[exKey] === true;

  if (!wasCompleted && Object.keys(dayExercises).length >= MAX_COMPLETIONS_PER_DAY) {
    return { progress, events: [{ type: 'rate_limit' as const }] };
  }

  const events = [];
  let next = { ...progress };

  const newDayExercises = { ...dayExercises };
  if (wasCompleted) {
    delete newDayExercises[exKey];
  } else {
    newDayExercises[exKey] = true;
  }
  next.completedByDate = { ...progress.completedByDate };
  if (Object.keys(newDayExercises).length === 0) {
    next.completedByDate[date] = {};
  } else {
    next.completedByDate[date] = newDayExercises;
  }

  const currentDay = progress.dayLog[date] || { wado: 0, sandai: 0, shusui: 0 };
  const delta = wasCompleted ? -1 : 1;
  const newDay = {
    ...currentDay,
    [sword]: Math.max(0, currentDay[sword] + delta),
  };
  next.dayLog = { ...progress.dayLog };
  if (newDay.wado + newDay.sandai + newDay.shusui === 0) {
    delete next.dayLog[date];
  } else {
    next.dayLog[date] = newDay;
  }

  const xpDelta = wasCompleted ? -XP_PER_EXERCISE : XP_PER_EXERCISE;
  next.totalXP = Math.max(0, progress.totalXP + xpDelta);
  next.peakXP = Math.max(progress.peakXP, next.totalXP);

  const oldRank = rankIndexFor(progress.totalXP);
  const newRank = rankIndexFor(next.totalXP);
  if (newRank > oldRank && !wasCompleted) {
    next.lastLevel = newRank;
    events.push({ type: 'rank_up' as const, rank: RANKS[newRank] });
  }

  for (const reward of REWARDS) {
    if (next.unlocked.includes(reward.id)) continue;
    if (reward.req === 'xp' && next.peakXP >= reward.value) {
      next.unlocked = [...next.unlocked, reward.id];
      events.push({ type: 'technique_unlocked' as const, reward });
    }
  }

  if (!wasCompleted) {
    const weekResult = evaluateWeekCompletion(next, date);
    if (weekResult) {
      next = weekResult.progress;
      for (const ev of weekResult.events) events.push(ev);
    }
  }

  return { progress: next, events };
}

// ─── WEEK COMPLETION ─────────────────────────────────────────────────────────

function evaluateWeekCompletion(progress, date) {
  const end = new Date(date + 'T00:00:00Z');
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    days.push(toDateKey(d));
  }

  for (const dk of days) {
    const day = progress.dayLog[dk];
    if (!day || (day.wado + day.sandai + day.shusui === 0)) return null;
  }

  const totals = days.reduce(
    (acc, dk) => {
      const d = progress.dayLog[dk];
      return {
        wado:   acc.wado   + (d.wado   || 0),
        sandai: acc.sandai + (d.sandai || 0),
        shusui: acc.shusui + (d.shusui || 0),
      };
    },
    { wado: 0, sandai: 0, shusui: 0 }
  );

  const dominantPath = Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
  const weeksForPath = progress.completedWeeks.filter(w => w.path === dominantPath).length + 1;

  // deduplicate per path+date so two different paths can complete on the same day
  if (progress.completedWeeks.some(w => w.completedAt === date && w.path === dominantPath)) return null;

  const next = { ...progress };
  next.completedWeeks = [
    ...progress.completedWeeks,
    { path: dominantPath, weekNum: weeksForPath, completedAt: date },
  ];

  const events = [{ type: 'week_completed' as const, path: dominantPath, weekNum: weeksForPath }];

  const path = TITLE_PATHS[dominantPath];
  const earnedTier = path.tiers.find(t => t.weeks === weeksForPath);
  if (earnedTier) {
    const alreadyHave = progress.earnedTitles.some(
      t => t.path === dominantPath && t.weeks === earnedTier.weeks
    );
    if (!alreadyHave) {
      next.earnedTitles = [
        ...progress.earnedTitles,
        { path: dominantPath, weeks: earnedTier.weeks, earnedAt: date },
      ];
      events.push({ type: 'title_earned' as const, path: dominantPath, tier: earnedTier });
    }
  }

  return { progress: next, events };
}

// ─── SESSION MANAGEMENT ───────────────────────────────────────────────────────

/**
 * Starts a new training session.
 * @param progress - current progress object
 * @param param1 - session parameters including discipline
 * @returns updated progress with currentSession set
 */
export function applySessionStart(progress: Progress, { discipline }: { discipline: Discipline }) {
  if (!SWORDS[discipline]) return { progress, events: [] };
  const session = {
    id: `sess_${Date.now()}`,
    discipline,
    startedAt: Date.now(),
    endedAt: null,
    exercises: [],
    calories: 0,
    intensity: 0,
    xpEarned: 0,
  };
  return {
    progress: { ...progress, currentSession: session },
    events: [],
  };
}

/**
 * Ends the current training session and computes XP/calories.
 * @param progress - current progress object
 * @param param1 - session end parameters
 * @returns updated progress and events array
 */
export function applySessionEnd(progress: Progress, { sessionId, exercises, intensity, endedAt = Date.now() }: { sessionId: string; exercises: LoggedExercise[]; intensity: number; endedAt?: number }) {
  const session = progress.currentSession;
  if (!session || session.id !== sessionId) return { progress, events: [] };

// Calculate calories from exercises
  let totalCalories = 0;
  for (const ex of exercises) {
    const exData = getExerciseById(ex.id);
    if (exData) {
      if (ex.unit === 'min') {
        totalCalories += (exData.caloriePerUnit || 0) * ex.amount;
      } else if (ex.unit === 'reps') {
        totalCalories += (exData.caloriePerRep || 0) * ex.amount;
      } else if (ex.unit === 'km') {
        totalCalories += (exData.caloriePerUnit || 0) * ex.amount;
      }
    }
  }

  // Floor at 0: a wrong device clock (endedAt < startedAt) or a missing endedAt
  // must never produce negative duration → negative XP / inflated recovery.
  const durationMs = Math.max(0, endedAt - session.startedAt);
  const durationHours = durationMs / (1000 * 60 * 60);
  const xpFromSession = Math.round(XP_PER_SESSION_HOUR * durationHours * (intensity / 5));

  const completedSession = {
    ...session,
    endedAt,
    exercises,
    calories: Math.round(totalCalories),
    intensity,
    xpEarned: xpFromSession,
  };

  let next = { ...progress };
  delete next.currentSession;

  next.sessions = [...(progress.sessions || []), completedSession].slice(-200);
  next.totalXP = progress.totalXP + xpFromSession;
  next.peakXP = Math.max(progress.peakXP, next.totalXP);

  // Update dayLog
  const date = toDateKey(new Date(endedAt));
  const currentDay = progress.dayLog[date] || { wado: 0, sandai: 0, shusui: 0 };
  const newDay = {
    ...currentDay,
    [session.discipline]: currentDay[session.discipline] + 1,
  };
  next.dayLog = { ...progress.dayLog, [date]: newDay };

  // Update completedByDate for each exercise
  next.completedByDate = { ...progress.completedByDate };
  if (!next.completedByDate[date]) next.completedByDate[date] = {};
  for (const ex of exercises) {
    const exKey = `${session.discipline}-${ex.name}`;
    if (!next.completedByDate[date][exKey]) {
      next.completedByDate[date][exKey] = true;
    }
  }

  // Recovery cost
  next.recoveryScore = Math.max(0, progress.recoveryScore - Math.round(durationHours * RECOVERY_COST_PER_HOUR));
  next.lastRecoveryUpdate = date;

  // Rank up check
  const events = [];
  const oldRank = rankIndexFor(progress.totalXP);
  const newRank = rankIndexFor(next.totalXP);
  if (newRank > oldRank) {
    next.lastLevel = newRank;
    events.push({ type: 'rank_up' as const, rank: RANKS[newRank] });
  }

  // Reward check
  for (const reward of REWARDS) {
    if (next.unlocked.includes(reward.id)) continue;
    if (reward.req === 'xp' && next.peakXP >= reward.value) {
      next.unlocked = [...next.unlocked, reward.id];
      events.push({ type: 'technique_unlocked' as const, reward });
    }
  }

  // Week completion
  const weekResult = evaluateWeekCompletion(next, date);
  if (weekResult) {
    next = weekResult.progress;
    for (const ev of weekResult.events) events.push(ev);
  }

  // Skill unlock check
  const skillResult = evaluateSkillUnlock(next, session.discipline);
  if (skillResult) {
    next = skillResult.progress;
    for (const ev of skillResult.events) events.push(ev);
  }

  return { progress: next, events };
}

// ─── RECOVERY ────────────────────────────────────────────────────────────────

/**
 * Updates recovery score based on sleep data.
 * @param progress - current progress object
 * @param param1 - sleep parameters
 * @returns updated progress and empty events array
 */
export function updateRecoveryFromSleep(progress: Progress, { date, quality, hours, deepHours = 0, lightHours = 0, remHours = 0, awakeHours = 0 }: { date: string; quality: number; hours: number; deepHours?: number; lightHours?: number; remHours?: number; awakeHours?: number }) {
  const recoveryGain = Math.round(RECOVERY_GAIN_PER_HOUR_SLEEP * hours * (quality / 3));
  const next = {
    ...progress,
    recoveryScore: Math.min(MAX_RECOVERY, progress.recoveryScore + recoveryGain),
    lastRecoveryUpdate: date,
    sleepLog: {
      ...progress.sleepLog,
      [date]: { quality, hours, deepHours, lightHours, remHours, awakeHours },
    },
  };
  return { progress: next, events: [] };
}

/**
 * Updates mood/energy log for a date.
 * @param progress - current progress object
 * @param param1 - mood parameters
 * @returns updated progress and empty events array
 */
export function updateMood(progress: Progress, { date, energy, mood }: { date: string; energy: number; mood: number }) {
  return {
    progress: {
      ...progress,
      moodLog: { ...progress.moodLog, [date]: { energy, mood } },
    },
    events: [],
  };
}

/**
 * Updates body statistics (weight, height).
 * @param progress - current progress object
 * @param param1 - body stat parameters
 * @returns updated progress and empty events array
 */
export function updateBodyStats(progress: Progress, { weight, height, unit }: { weight: number; height: number; unit?: string }) {
  return {
    progress: {
      ...progress,
      bodyStats: { weight, height, unit: unit || progress.bodyStats.unit || 'kg' },
    },
    events: [],
  };
}

// ─── SKILL UNLOCKS ───────────────────────────────────────────────────────────

/**
 * Evaluates and unlocks skills based on discipline XP spent.
 * @param progress - current progress object
 * @param discipline - the discipline to evaluate
 * @returns updated progress and skill unlock events if any
 */
export function evaluateSkillUnlock(progress: Progress, discipline: Discipline) {
  const tree = SKILL_TREES[discipline];
  if (!tree) return null;

  const events = [];
  let next = { ...progress };
  const discUnlocks = { ...(next.skillUnlocks[discipline] || {}) };

  for (const [branchKey, branch] of Object.entries(tree.branches)) {
    discUnlocks[branchKey] = discUnlocks[branchKey] || [];
    for (const unlock of branch.unlocks) {
      if (discUnlocks[branchKey].includes(unlock.id)) continue;
      // Spend XP in this discipline as proxy for skill points
      const disciplineXP = disciplineXPFor(progress, discipline);
      if (disciplineXP >= unlock.xp) {
        discUnlocks[branchKey] = [...discUnlocks[branchKey], unlock.id];
        events.push({ type: 'skill_unlocked' as const, discipline, branch: branchKey, unlock });
      }
    }
  }

  next.skillUnlocks = { ...next.skillUnlocks, [discipline]: discUnlocks };
  return { progress: next, events };
}

export function disciplineXPFor(progress, discipline) {
  // Approximate XP spent in a discipline by counting dayLog entries
  let total = 0;
  for (const day of Object.values(progress.dayLog)) {
    total += day[discipline] || 0;
  }
  return total * XP_PER_EXERCISE;
}

// ─── BOSS CHALLENGE ───────────────────────────────────────────────────────────

// Returns { challenge, progress } so the caller can persist the new entry.
// Uses .length directly on the array for index calculation.
/**
 * Gets or creates the active boss challenge for a given week.
 * @param progress - current progress object
 * @param date - current date string
 * @returns object with challenge and updated progress
 */
export function getActiveBossChallenge(progress: Progress, date: string) {
  const weekOf = weekOfYear(date);
  const existing = progress.bossChallenges.find(b => b.weekOf === weekOf);
  if (existing) return { challenge: existing, progress };

  // Pick a boss challenge based on how many have been attempted so far
  const idx = progress.bossChallenges.length % BOSS_CHALLENGES.length;
  const boss = BOSS_CHALLENGES[idx];

  // Check if user meets week requirement
  const discWeeks = progress.completedWeeks.filter(w => w.path === boss.discipline).length;
  if (discWeeks < boss.weeksRequired) return { challenge: null, progress };

  // Persist the new challenge into progress so evaluateBossCompletion can find it
  const newChallenge = { id: boss.id, discipline: boss.discipline, weekOf, startedAt: date, completedAt: null, failed: false };
  const updatedProgress = { ...progress, bossChallenges: [...progress.bossChallenges, newChallenge] };
  return { challenge: newChallenge, progress: updatedProgress };
}

/**
 * Evaluates if a boss challenge is completed.
 * @param progress - current progress object
 * @param bossId - the boss challenge ID
 * @param date - current date
 * @returns updated progress and events if completed
 */
export function evaluateBossCompletion(progress: Progress, bossId: string, date: string) {
  const boss = BOSS_CHALLENGES.find(b => b.id === bossId);
  if (!boss) return { progress, events: [] };

  const weekOf = weekOfYear(date);
  const challengeIdx = progress.bossChallenges.findIndex(b => b.id === bossId && b.weekOf === weekOf);
  if (challengeIdx === -1) return { progress, events: [] };

  const challenge = progress.bossChallenges[challengeIdx];
  if (challenge.completedAt) return { progress, events: [] }; // already done

  // Verify every required exercise was logged today, under the boss's own
  // discipline. Exact `discipline-name` key match: the previous substring check
  // (`k.includes(ex.name)`) let e.g. a Shusui "Endurance Run" satisfy Sandai's
  // "Run" requirement — a cross-discipline false-positive completion.
  const todayExercises = progress.completedByDate[date] || {};
  const allDone = boss.exercises.every(
    ex => todayExercises[`${boss.discipline}-${ex.name}`] === true,
  );

  if (!allDone) return { progress, events: [] };

  const next = { ...progress };
  next.bossChallenges = [...progress.bossChallenges];
  next.bossChallenges[challengeIdx] = { ...challenge, completedAt: date };
  next.totalXP = progress.totalXP + boss.xpReward;
  next.peakXP = Math.max(next.peakXP, next.totalXP);

  const events = [{ type: 'boss_completed' as const, boss }];

  if (boss.techniqueReward && !next.unlocked.includes(boss.techniqueReward)) {
    next.unlocked = [...next.unlocked, boss.techniqueReward];
    const reward = REWARDS.find(r => r.id === boss.techniqueReward);
    if (reward) events.push({ type: 'technique_unlocked' as const, reward });
  }

  return { progress: next, events };
}

export function weekOfYear(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dayOfWeek = d.getUTCDay();
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() - dayOfWeek);
  const yearStart = new Date(Date.UTC(sunday.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((sunday - yearStart) / 86400000) + 1;
  return `${sunday.getUTCFullYear()}-W${Math.floor((dayOfYear - 1) / 7) + 1}`;
}

// ─── DAILY RECOMMENDATION ENGINE ─────────────────────────────────────────────

/**
 * Gets the daily training recommendation based on time, recovery, and streak.
 * @param progress - current progress object
 * @param date - Date object (defaults to now)
 * @returns recommendation object with type, discipline, reason, phrase, intensity
 */
export function getDailyRecommendation(progress: Progress, date: Date = new Date()) {
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

const recovery = progress.recoveryScore;

  // If recovery is very low, recommend rest
  if (recovery < 20) {
    return {
      type: 'rest',
      discipline: null,
      reason: 'recovery_low',
      phrase: 'Even the strongest steel must cool. Recover.',
      intensity: 0,
    };
  }

  // pass the caller's date through to suggestDiscipline
  const dateKey = toDateKey(date);

  // If weekend and high recovery, suggest something epic
  if (isWeekend && recovery > 60) {
    return {
      type: 'boss',
      discipline: suggestDiscipline(progress, dateKey),
      reason: 'weekend_warrior',
      phrase: 'The weekend is your stage. Prove your worth.',
      intensity: 8,
    };
  }

  // Morning training
  if (hour >= 5 && hour < 10) {
    const disc = suggestDiscipline(progress, dateKey);
    return {
      type: 'session',
      discipline: disc,
      reason: 'morning_training',
      phrase: disc === 'wado'
        ? 'The mind is sharpest at dawn. Meditate first.'
        : disc === 'sandai'
        ? 'The cursed blade hungers at dawn. Feed it.'
        : 'The spirit burns brightest in the cold morning air.',
      intensity: recovery > 50 ? 7 : 5,
    };
  }

  // Evening training
  if (hour >= 17 && hour < 21) {
    const disc = suggestDiscipline(progress, dateKey);
    return {
      type: 'session',
      discipline: disc,
      reason: 'evening_training',
      phrase: 'End the day with steel. The night belongs to the disciplined.',
      intensity: recovery > 40 ? 6 : 4,
    };
  }

  // Default
  return {
    type: 'session',
    discipline: suggestDiscipline(progress, dateKey),
    reason: 'default',
    phrase: 'Train the body, sharpen the mind, forge the spirit.',
    intensity: recovery > 50 ? 6 : 4,
  };
}

// accept a dateKey so the caller's date is used, not always new Date()
function suggestDiscipline(progress, dateKey) {
  const key = dateKey || toDateKey(new Date());
  const today = progress.dayLog[key] || { wado: 0, sandai: 0, shusui: 0 };
  const weakest = Object.entries(today).sort((a, b) => a[1] - b[1])[0];
  return weakest[0];
}

// ─── QUERY HELPERS ───────────────────────────────────────────────────────────

/**
 * Gets the number of exercise completions for a given date.
 * @param progress - current progress object
 * @param date - date string in YYYY-MM-DD format
 * @returns number of completed exercises
 */
export function completionsForDate(progress: Progress, date: string): number {
  return Object.keys(progress.completedByDate[date] || {}).length;
}

/**
 * Calculates the current consecutive training streak.
 * @param progress - current progress object
 * @param date - ending date string
 * @returns number of consecutive days with training
 */
export function currentStreak(progress: Progress, date: string): number {
  let streak = 0;
  const d = new Date(date + 'T00:00:00Z');
  while (true) {
    const key = toDateKey(d);
    const day = progress.dayLog[key];
    if (!day || (day.wado + day.sandai + day.shusui === 0)) break;
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
    if (streak > 400) break;
  }
  return streak;
}

/**
 * Gets a 7-day week view of training logs.
 * @param progress - current progress object
 * @param date - end date string
 * @returns array of day objects with date, log, total, dominant, isToday
 */
export function currentWeekView(progress: Progress, date: string) {
  const d = new Date(date + 'T00:00:00Z');
  const dayOfWeek = d.getUTCDay();
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() - dayOfWeek);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(sunday);
    dayDate.setUTCDate(sunday.getUTCDate() + i);
    const key = toDateKey(dayDate);
    const log = progress.dayLog[key] || { wado: 0, sandai: 0, shusui: 0 };
    const total = log.wado + log.sandai + log.shusui;
    const dominant = total === 0 ? null :
      Object.entries(log).sort((a, b) => b[1] - a[1])[0][0];
    days.push({ date: key, log, total, dominant, isToday: key === date });
  }
  return days;
}

/**
 * Calculates weekly training volume for a discipline.
 * @param progress - current progress object
 * @param discipline - the discipline key
 * @param date - end date string
 * @returns total count for the week
 */
export function weeklyVolume(progress: Progress, discipline: Discipline, date: string): number {
  const d = new Date(date + 'T00:00:00Z');
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() - d.getUTCDay());
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(sunday);
    dayDate.setUTCDate(sunday.getUTCDate() + i);
    const key = toDateKey(dayDate);
    total += (progress.dayLog[key]?.[discipline] || 0);
  }
  return total;
}

/**
 * Calculates total weekly training volume across all disciplines.
 * @param progress - current progress object
 * @param date - end date string
 * @returns object with wado, sandai, shusui totals
 */
export function totalWeeklyVolume(progress: Progress, date: string) {
  const d = new Date(date + 'T00:00:00Z');
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() - d.getUTCDay());
  let totals = { wado: 0, sandai: 0, shusui: 0 };
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(sunday);
    dayDate.setUTCDate(sunday.getUTCDate() + i);
    const key = toDateKey(dayDate);
    const log = progress.dayLog[key];
    if (log) {
      totals.wado   += log.wado   || 0;
      totals.sandai += log.sandai || 0;
      totals.shusui += log.shusui || 0;
    }
  }
  return totals;
}

/**
 * Gets the most recent training sessions.
 * @param progress - current progress object
 * @param count - number of sessions to return (default 5)
 * @returns array of recent sessions
 */
export function recentSessions(progress: Progress, count = 5): Session[] {
  return [...(progress.sessions || [])].reverse().slice(0, count);
}

/**
 * Gets the readiness level based on recovery score.
 * @param progress - current progress object
 * @returns 'READY' | 'PUSH' | 'RECOVER'
 */
export function getReadinessLevel(progress: Progress): 'READY' | 'PUSH' | 'RECOVER' {
  const r = progress.recoveryScore;
  if (r >= 70) return 'READY';
  if (r >= 40) return 'PUSH';
  return 'RECOVER';
}

/**
 * Gets the color for the readiness level.
 * @param progress - current progress object
 * @returns hex color string
 */
export function getReadinessColor(progress: Progress): string {
  const r = progress.recoveryScore;
  if (r >= 70) return '#4ade80';
  if (r >= 40) return '#fbbf24';
  return '#f87171';
}

// ─── SWORD SHARPNESS SCORE ───────────────────────────────────────────────────

function getLast3DaysSleep(progress, date) {
  const results = [];
  const d = new Date(date + 'T00:00:00Z');
  for (let i = 0; i < 3; i++) {
    const key = toDateKey(d);
    const entry = progress.sleepLog[key];
    if (entry) results.push(entry);
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return results;
}

/**
 * Computes sword sharpness score (0-100) based on recovery, mood, and sleep.
 * @param progress - current progress object
 * @param date - date string
 * @returns sharpness score 0-100
 */
export function computeSwordSharpness(progress: Progress, date: string): number {
  const recovery = progress.recoveryScore;

  const moodEntry = progress.moodLog?.[date];
  const avgMoodEnergy = moodEntry ? ((moodEntry.energy + moodEntry.mood) / 2) : 5;
  // Centered at neutral (5): positive mood helps, low mood hurts, no data = 0
  const moodContrib = moodEntry ? ((avgMoodEnergy - 5) / 5) * 50 : 0;

  const sleepDays = getLast3DaysSleep(progress, date);
  // Default quality=1 when no sleep data → sleepContrib=0
  const avgQuality = sleepDays.length
    ? sleepDays.reduce((a, s) => a + s.quality, 0) / sleepDays.length
    : 1;
  const sleepContrib = ((avgQuality - 1) / 4) * 100;

  // Sleep stages bonus: deep + rem = better sharpness
  let stageBonus = 0;
  for (const s of sleepDays) {
    const deepRatio = (s.deepHours || 0) / (s.hours || 1);
    const remRatio = (s.remHours || 0) / (s.hours || 1);
    if (deepRatio >= 0.2) stageBonus += 5;
    if (remRatio >= 0.2) stageBonus += 5;
  }
  stageBonus = Math.min(20, stageBonus); // cap at +20

  // Vitals bonus: lower resting HR = sharper
  const vitals = progress.vitalsLog?.[date];
  let hrBonus = 0;
  if (vitals?.restingHR) {
    if (vitals.restingHR < 60) hrBonus = 10;
    else if (vitals.restingHR < 70) hrBonus = 5;
  }

  const raw = 0.4 * recovery + 0.25 * moodContrib + 0.25 * sleepContrib;
  return Math.round(Math.min(100, Math.max(0, raw + stageBonus + hrBonus)));
}

/**
 * Gets the label for a sharpness score.
 * @param score - sharpness score (0-100)
 * @returns label string
 */
export function getSharpnessLabel(score: number): string {
  if (score >= 85) return 'RAZOR SHARP';
  if (score >= 65) return 'WELL HONED';
  if (score >= 45) return 'BATTLE WORN';
  if (score >= 25) return 'NOTCHED';
  return 'BROKEN BLADE';
}

/**
 * Gets the color for a sharpness score.
 * @param score - sharpness score (0-100)
 * @returns hex color string
 */
export function getSharpnessColor(score: number): string {
  if (score >= 85) return '#4ade80';
  if (score >= 65) return '#a3e635';
  if (score >= 45) return '#fbbf24';
  if (score >= 25) return '#f97316';
  return '#f87171';
}

// ─── DREAM SWORDSMAN ARCHETYPE ───────────────────────────────────────────────

export const DREAM_ARCHETYPES = {
  Guardian:  { icon: '盾', color: '#4ade80', desc: 'Deep, consistent rest. Your blade is always ready.' },
  Ronin:     { icon: '浪', color: '#D4A853', desc: 'A wandering sleeper. Good enough, but untamed.' },
  Ghost:     { icon: '霊', color: '#8EAABE', desc: 'Sleep-starved. You fight well, but at what cost?' },
  Berserker: { icon: '狂', color: '#E52030', desc: 'Chaotic sleep. Raw power with no guarantee of sharpness.' },
};

/**
 * Computes the dream swordsman archetype based on sleep patterns.
 * @param progress - current progress object
 * @param date - date string
 * @returns archetype name: 'Guardian' | 'Ronin' | 'Ghost' | 'Berserker'
 */
export function computeDreamArchetype(progress: Progress, date: string): string {
  const logs = [];
  const d = new Date(date + 'T00:00:00Z');
  for (let i = 0; i < 7; i++) {
    const key = toDateKey(d);
    const entry = progress.sleepLog?.[key];
    if (entry) logs.push(entry);
    d.setUTCDate(d.getUTCDate() - 1);
  }
  if (logs.length === 0) return 'Ronin';

  const avgHours   = logs.reduce((a, l) => a + l.hours, 0) / logs.length;
  const avgQuality = logs.reduce((a, l) => a + l.quality, 0) / logs.length;
  const variance   = logs.reduce((a, l) => a + Math.pow(l.hours - avgHours, 2), 0) / logs.length;
  const stdDev     = Math.sqrt(variance);

  if (avgQuality >= 3.5 && stdDev < 1.5 && avgHours >= 7) return 'Guardian';
  if (avgHours < 6) return 'Ghost';
  if (stdDev >= 2.0) return 'Berserker';
  return 'Ronin';
}

// ─── THREE SWORD RINGS ───────────────────────────────────────────────────────

export const RING_TARGETS = {
  wado:   { label: 'WADO',   closesAt: 20  },
  sandai: { label: 'SANDAI', closesAt: 200 },
  shusui: { label: 'SHUSUI', closesAt: 15  },
};

/**
 * Computes progress toward the three sword ring daily goals.
 * @param progress - current progress object
 * @param date - date string
 * @returns object with wado, sandai, shusui rings showing current/target/pct
 */
export function computeRingProgress(progress: Progress, date: string) {
  const daySessions = (progress.sessions || []).filter(s => {
    const sesDate = toDateKey(new Date(s.endedAt));
    return sesDate === date;
  });

  let wadoMin = 0, sandaiReps = 0, shusuiMin = 0;

  for (const sess of daySessions) {
    for (const ex of (sess.exercises || [])) {
      if (sess.discipline === 'wado') {
        if (ex.unit === 'min') wadoMin += ex.amount || 0;
      } else if (sess.discipline === 'sandai') {
        if (ex.unit === 'reps') sandaiReps += ex.amount || 0;
        if (ex.unit === 'km')   sandaiReps += (ex.amount || 0) * 100;
      } else if (sess.discipline === 'shusui') {
        if (ex.unit === 'min') shusuiMin += ex.amount || 0;
        if (ex.unit === 'km')  shusuiMin += (ex.amount || 0) * 10;
      }
    }
  }

  const breathDay = (progress.breathingLog?.[date] || []);
  wadoMin += breathDay.reduce((a, b) => a + (b.durationMin || 0), 0);

  return {
    wado:   { current: wadoMin,    target: RING_TARGETS.wado.closesAt,   pct: Math.min(1, wadoMin    / RING_TARGETS.wado.closesAt) },
    sandai: { current: sandaiReps, target: RING_TARGETS.sandai.closesAt, pct: Math.min(1, sandaiReps / RING_TARGETS.sandai.closesAt) },
    shusui: { current: shusuiMin,  target: RING_TARGETS.shusui.closesAt, pct: Math.min(1, shusuiMin  / RING_TARGETS.shusui.closesAt) },
  };
}

// ─── BATTLE INTENSITY ZONES ──────────────────────────────────────────────────

export const INTENSITY_ZONES = [
  { zone: 1, name: 'Ittoryu Warm-up', kanji: '一刀流', range: [1, 2],  color: '#60a5fa', desc: 'Light activation. The blade barely wakes.' },
  { zone: 2, name: 'Nitoryu Rhythm',  kanji: '二刀流', range: [3, 4],  color: '#4ade80', desc: 'Steady effort. Building momentum.' },
  { zone: 3, name: 'Santoryu Tempo',  kanji: '三刀流', range: [5, 6],  color: '#fbbf24', desc: 'Controlled intensity. The three blades synchronize.' },
  { zone: 4, name: 'Asura Surge',     kanji: '阿修羅', range: [7, 8],  color: '#f97316', desc: 'High-output. The demon spirit rises.' },
  { zone: 5, name: 'King of Hell',    kanji: '閻魔',   range: [9, 10], color: '#dc143c', desc: 'Maximum effort. Beyond human limits.' },
];

/**
 * Gets the intensity zone for a given intensity level.
 * @param intensity - intensity value (1-10)
 * @returns intensity zone object
 */
export function getIntensityZone(intensity: number) {
  return INTENSITY_ZONES.find(z => intensity >= z.range[0] && intensity <= z.range[1]) || INTENSITY_ZONES[2];
}

// ─── BREATHING SESSION ───────────────────────────────────────────────────────

/**
 * Logs a breathing session and optionally awards XP.
 * @param progress - current progress object
 * @param param1 - breathing session parameters
 * @returns updated progress and breathing_complete event
 */
export function logBreathingSession(progress: Progress, { date, programId, durationMin, xpReward = 0 }: { date: string; programId: string; durationMin: number; xpReward?: number }) {
  const dayLog = progress.breathingLog?.[date] || [];
  const next = {
    ...progress,
    breathingLog: {
      ...progress.breathingLog,
      [date]: [...dayLog, { programId, durationMin, completedAt: new Date().toISOString() }],
    },
  };
  if (xpReward > 0) {
    next.totalXP = progress.totalXP + xpReward;
    next.peakXP = Math.max(next.peakXP, next.totalXP);
  }
  return { progress: next, events: [{ type: 'breathing_complete' as const, programId }] };
}

// ─── VOYAGE CHRONICLE ────────────────────────────────────────────────────────

/**
 * Generates a narrative voyage chronicle for a month.
 * @param progress - current progress object
 * @param monthKey - month string in YYYY-MM format
 * @returns chronicle object with stats, narrative, generatedAt
 */
export function generateVoyageChronicle(progress: Progress, monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const monthDates = [];
  for (let d = 1; d <= daysInMonth; d++) {
    monthDates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  const monthSessions = (progress.sessions || []).filter(s => {
    const sd = toDateKey(new Date(s.endedAt));
    return monthDates.includes(sd);
  });

  const totalXP      = monthSessions.reduce((a, s) => a + (s.xpEarned || 0), 0);
  const totalCal     = monthSessions.reduce((a, s) => a + (s.calories || 0), 0);
  const activeDays   = new Set(monthSessions.map(s => toDateKey(new Date(s.endedAt)))).size;
  const discCounts   = { wado: 0, sandai: 0, shusui: 0 };
  for (const s of monthSessions) discCounts[s.discipline] = (discCounts[s.discipline] || 0) + 1;
  const dominant     = Object.entries(discCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'sandai';

  const monthSharpness = monthDates.map(d => progress.swordSharpnessLog?.[d]).filter(v => v !== undefined);
  const avgSharpness   = monthSharpness.length
    ? Math.round(monthSharpness.reduce((a, v) => a + v, 0) / monthSharpness.length)
    : null;

  const intensity = totalXP > 8000 ? 'legendary' : totalXP > 4000 ? 'strong' : totalXP > 1500 ? 'steady' : 'humble';
  const NARRATIVES = {
    legendary: `The seas spoke your name this month. ${activeDays} days of pure devastation — ${totalXP.toLocaleString()} XP claimed. Even Mihawk would acknowledge this voyage.`,
    strong:    `A strong voyage. ${activeDays} active days, ${totalCal.toLocaleString()} calories consumed in battle. The ${dominant} blade led the charge.`,
    steady:    `A steady march forward. ${activeDays} days on the water. Not legend yet — but the foundation is being laid.`,
    humble:    `The voyage begins. Even a single day on the training ground is a step toward the world's greatest swordsman.`,
  };

  return {
    monthKey,
    stats: { totalXP, totalCal, activeDays, discCounts, dominant, avgSharpness },
    narrative: NARRATIVES[intensity],
    generatedAt: new Date().toISOString(),
  };
}

// ─── BOUNTY MISSIONS ─────────────────────────────────────────────────────────

/**
 * Gets active bounty missions, creating new ones if needed.
 * @param progress - current progress object
 * @param date - current date string
 * @returns array of active bounty missions
 */
export function getActiveBountyMissions(progress: Progress, date: string) {
  const activeMissions = (progress.bountyMissions || []).filter(m => m.status === 'active');
  if (activeMissions.length >= 3) return activeMissions;

  const completedIds = new Set(
    (progress.bountyMissions || []).filter(m => m.status !== 'active').map(m => m.id)
  );
  const available = BOUNTY_MISSIONS.filter(
    m => !completedIds.has(m.id) && !activeMissions.find(am => am.id === m.id)
  );

  const newMissions = available.slice(0, 3 - activeMissions.length).map(bm => ({
    id: bm.id,
    type: bm.type,
    status: 'active',
    assignedAt: date,
    completedAt: null,
    weekOf: weekOfYear(date),
  }));

  return [...activeMissions, ...newMissions];
}

/**
 * Evaluates and completes bounty missions if requirements are met.
 * @param progress - current progress object
 * @param date - current date string
 * @returns updated progress and bounty completion events
 */
export function evaluateBountyMissions(progress: Progress, date: string) {
  const events = [];
  let next = { ...progress, bountyMissions: [...(progress.bountyMissions || [])] };

  for (let i = 0; i < next.bountyMissions.length; i++) {
    const mission = next.bountyMissions[i];
    if (mission.status !== 'active') continue;
    const bm = BOUNTY_MISSIONS.find(b => b.id === mission.id);
    if (!bm) continue;

    if (checkBountyCompletion(progress, bm, date)) {
      next.bountyMissions[i] = { ...mission, status: 'completed', completedAt: date };
      next.totalXP = (next.totalXP || 0) + bm.xpReward;
      next.peakXP  = Math.max(next.peakXP || 0, next.totalXP);
      events.push({ type: 'bounty_completed' as const, bounty: bm });
    }
  }

  return { progress: next, events };
}

function checkBountyCompletion(progress, bm, date) {
  const req = bm.requirement;
  switch (req.type) {
    case 'streak':
      return currentStreak(progress, date) >= req.value;
    case 'all_disciplines': {
      const today = progress.dayLog?.[date];
      return today && today.wado > 0 && today.sandai > 0 && today.shusui > 0;
    }
    case 'weekly_kcal': {
      const end = new Date(date + 'T00:00:00Z');
      let total = 0;
      for (let i = 6; i >= 0; i--) {
        const d = new Date(end); d.setUTCDate(end.getUTCDate() - i);
        const daySessions = (progress.sessions || []).filter(s => toDateKey(new Date(s.endedAt)) === toDateKey(d));
        total += daySessions.reduce((a, s) => a + (s.calories || 0), 0);
      }
      return total >= req.value;
    }
    case 'discipline_streak': {
      let streak = 0;
      const d = new Date(date + 'T00:00:00Z');
      while (streak < req.value) {
        const key = toDateKey(d);
        if (!(progress.dayLog?.[key]?.[req.discipline] > 0)) break;
        streak++;
        d.setUTCDate(d.getUTCDate() - 1);
      }
      return streak >= req.value;
    }
    case 'sharpness_streak': {
      let streak = 0;
      const d = new Date(date + 'T00:00:00Z');
      while (streak < req.days) {
        const key = toDateKey(d);
        if ((progress.swordSharpnessLog?.[key] || 0) < req.value) break;
        streak++;
        d.setUTCDate(d.getUTCDate() - 1);
      }
      return streak >= req.days;
    }
    case 'hydration_streak': {
      let streak = 0;
      const d = new Date(date + 'T00:00:00Z');
      while (streak < req.days) {
        const key = toDateKey(d);
        if ((progress.hydrationLog?.[key]?.cups || 0) < req.cups) break;
        streak++;
        d.setUTCDate(d.getUTCDate() - 1);
      }
      return streak >= req.days;
    }
    default: return false;
  }
}

// ─── TRAINING ARCS ───────────────────────────────────────────────────────────

/**
 * Evaluates and completes a training arc week if targets are met.
 * @param progress - current progress object
 * @param arcId - the arc ID
 * @param weekNum - week number
 * @param date - current date string
 * @returns updated progress and arc completion events
 */
export function evaluateArcWeekCompletion(progress: Progress, arcId: string, weekNum: number, date: string) {
  const arc = TRAINING_ARCS.find(a => a.id === arcId);
  if (!arc) return { progress, events: [] };

  const arcData = progress.arcProgress?.[arcId];
  if (!arcData || arcData.completedWeeks.includes(weekNum)) return { progress, events: [] };

  const weekDef = arc.weeks[weekNum - 1];
  if (!weekDef) return { progress, events: [] };
  const targets = weekDef.targets;

  const end = new Date(date + 'T00:00:00Z');
  let weekSessions = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end); d.setUTCDate(end.getUTCDate() - i);
    const sesDate = toDateKey(d);
    const daySessions = (progress.sessions || []).filter(s => {
      const sd = toDateKey(new Date(s.endedAt));
      return sd === sesDate && (!targets.discipline || s.discipline === targets.discipline);
    });
    if (daySessions.length > 0) weekSessions++;
  }

  if (targets.sessions && weekSessions < targets.sessions) return { progress, events: [] };

if (targets.bossId) { 
    const boss = (progress.bossChallenges || []).find(b => b.id === targets.bossId && b.completedAt); 
    if (!boss) return { progress, events: [] }; 
  }

  const next = { ...progress };
  const updatedWeeks = [...arcData.completedWeeks, weekNum];
  const isCompleted = updatedWeeks.length >= arc.durationWeeks;
  next.arcProgress = {
    ...next.arcProgress,
    [arcId]: { ...arcData, completedWeeks: updatedWeeks, status: isCompleted ? 'completed' : 'active' },
  };

  const events = [{ type: 'arc_week_complete' as const, arcId, weekNum }];

  if (isCompleted) {
    next.totalXP = (progress.totalXP || 0) + arc.xpReward;
    next.peakXP  = Math.max(next.peakXP || 0, next.totalXP);
    if (arc.techniqueReward && !next.unlocked.includes(arc.techniqueReward)) {
      next.unlocked = [...next.unlocked, arc.techniqueReward];
    }
    events.push({ type: 'arc_completed' as const, arcId, arc });
  }

  return { progress: next, events };
}

// ─── ARC / TREND / SESSION HELPERS ───────────────────────────────────────────

export function getArcProgress(progress: Progress): Record<string, any> {
  return progress.arcProgress || {};
}

export function computeTrends(progress: Progress, startDate: string, endDate: string): { volumeTrend: number; calorieTrend: number } {
  const start = new Date(startDate + 'T00:00:00Z').getTime();
  const end   = new Date(endDate   + 'T23:59:59Z').getTime();
  const sessions = (progress.sessions || []).filter(s => {
    const t = s.endedAt || 0;
    return t >= start && t <= end;
  });
  return {
    volumeTrend:  sessions.length,
    calorieTrend: sessions.reduce((a, s) => a + (s.calories || 0), 0),
  };
}

export function getTodaySessions(progress: Progress, date: string): Session[] {
  return (progress.sessions || []).filter(s => toDateKey(new Date(s.endedAt)) === date);
}
