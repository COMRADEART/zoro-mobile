export type ExerciseRequirement = {
  name: string;
  reps?: number;
  min?: number;
  km?: number;
};

/**
 * Represents a Boss Challenge configuration.
 */
export type BossChallenge = {
  id: string;
  name: string;
  kanji: string;
  desc: string;
  discipline: string;
  exercises: ExerciseRequirement[];
  xpReward: number;
  techniqueReward: string;
  weeksRequired: number;
};

/**
 * Represents progress normalization input.
 */
export type RawProgress = {
  totalXP?: unknown;
  peakXP?: unknown;
  activeSword?: unknown;
  completedByDate?: unknown;
  dayLog?: unknown;
  sessions?: unknown;
  sleepLog?: unknown;
  moodLog?: unknown;
  bodyStats?: unknown;
  skillUnlocks?: unknown;
  bossChallenges?: unknown;
  recoveryScore?: unknown;
  lastRecoveryUpdate?: unknown;
  settings?: unknown;
  unlockedThemes?: unknown;
  bossAttemptHistory?: unknown;
  hydrationLog?: unknown;
  foodLog?: unknown;
  bodyComposition?: unknown;
  breathingLog?: unknown;
  arcProgress?: unknown;
  bountyMissions?: unknown;
  swordSharpnessLog?: unknown;
  dreamArchetypeLog?: unknown;
  voyageChronicles?: unknown;
  stepLog?: unknown;
  vitalsLog?: unknown;
  userProfile?: unknown;
  unlocked?: unknown;
  completedWeeks?: unknown;
  earnedTitles?: unknown;
  weekStartDate?: unknown;
  lastLevel?: unknown;
  schemaVersion?: unknown;
  [key: string]: unknown;
} | null | undefined;