export type Discipline = 'wado' | 'sandai' | 'shusui';

export const DISCIPLINES: readonly Discipline[] = ['wado', 'sandai', 'shusui'];

export interface Exercise {
  id: string;
  name: string;
  unit: string;
  base: number;
  caloriePerUnit?: number;
  caloriePerRep?: number;
}

export interface SwordData {
  name: string;
  kanji: string;
  color: string;
  accent: string;
  discipline: string;
  desc: string;
  theme: string;
  exercises: Exercise[];
  baseExercises: string[];
  baseExerciseIds: string[];
}

export interface Rank {
  name: string;
  min: number;
  max: number;
  color: string;
}

export interface Reward {
  id: string;
  type: string;
  name: string;
  kanji: string;
  req: string;
  value: number;
  rarity: string;
}

export interface Session {
  id: string;
  discipline: Discipline;
  startedAt: number;
  endedAt: number | null;
  exercises: LoggedExercise[];
  calories: number;
  intensity: number;
  xpEarned: number;
  // Set only while a session is in progress (i.e. on Progress.currentSession).
  // Lets TrainScreen restore the user's place if the app is killed mid-session.
  // Stripped on applySessionEnd — completed entries in `sessions[]` never carry this.
  exerciseIndex?: number;
}

export interface LoggedExercise {
  id: string;
  name: string;
  unit: string;
  amount: number;
}

export interface DayLog {
  wado: number;
  sandai: number;
  shusui: number;
}

export interface SleepEntry {
  quality: number;
  hours: number;
  deepHours: number;
  lightHours: number;
  remHours: number;
  awakeHours: number;
}

export interface MoodEntry {
  energy: number;
  mood: number;
}

export interface Progress {
  totalXP: number;
  peakXP: number;
  activeSword: Discipline;
  completedByDate: Record<string, Record<string, boolean>>;
  unlocked: string[];
  weekStartDate: string | null;
  dayLog: Record<string, DayLog>;
  completedWeeks: CompletedWeek[];
  earnedTitles: EarnedTitle[];
  lastLevel: number;
  schemaVersion: number;
  sessions: Session[];
  sleepLog: Record<string, SleepEntry>;
  moodLog: Record<string, MoodEntry>;
  bodyStats: BodyStats;
  skillUnlocks: Record<Discipline, Record<string, string[]>>;
  bossChallenges: BossChallenge[];
  recoveryScore: number;
  lastRecoveryUpdate: string | null;
  settings: Settings;
  hydrationLog: Record<string, { cups: number }>;
  foodLog: Record<string, FoodEntry[]>;
  bodyComposition: BodyComposition;
  breathingLog: Record<string, BreathingSession[]>;
  arcProgress: Record<string, ArcProgressEntry>;
  bountyMissions: BountyMission[];
  swordSharpnessLog: Record<string, number>;
  dreamArchetypeLog: Record<string, string>;
  voyageChronicles: VoyageChronicle[];
  stepLog: Record<string, { steps: number }>;
  vitalsLog: Record<string, VitalsEntry>;
  unlockedThemes?: string[];
  bossAttemptHistory?: Record<string, { weekOf: string; success: boolean }[]>;
  userProfile?: UserProfile | null;
  currentSession?: Session;
  _pendingEvents?: ProgressionEvent[];
}

// Local-only identity captured by the welcome screen. There is no backend, so
// `provider` documents how the name was obtained — it is always 'local' today
// (Google-styled capture, no OAuth round-trip), kept for forward compat.
export interface UserProfile {
  name: string;
  provider: 'local' | 'google';
  signedIn: boolean;
  createdAt: string;
}

export interface CompletedWeek {
  path: string;
  weekNum: number;
  completedAt: string;
}

export interface EarnedTitle {
  path: string;
  weeks: number;
  earnedAt: string;
}

export interface BodyStats {
  weight: number;
  height: number;
  unit: string;
}

export interface Settings {
  theme: string;
  autoTheme: boolean;
  defaultIntensity: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  morningReminder: boolean;
  reminderTime: string;
  restReminder: boolean;
  stepGoal: number;
  gender: string;
}

export interface BossChallenge {
  id: string;
  discipline: Discipline;
  weekOf: string;
  startedAt: string;
  completedAt: string | null;
  failed: boolean;
}

export interface FoodEntry {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  mealId: string | null;
}

export interface BodyComposition {
  bodyFatPct: number | null;
  muscleMassPct: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  arms: number | null;
  thighs: number | null;
  unit: string;
}

export interface BreathingSession {
  programId: string;
  durationMin: number;
  completedAt: string;
}

export interface ArcProgressEntry {
  startedAt: string | null;
  completedWeeks: number[];
  status: 'active' | 'completed' | 'abandoned';
}

export interface BountyMission {
  id: string;
  type: string;
  status: 'active' | 'completed';
  assignedAt: string;
  completedAt: string | null;
  weekOf: string;
}

export interface VoyageChronicle {
  monthKey: string;
  stats: {
    totalXP: number;
    totalCal: number;
    activeDays: number;
    discCounts: Record<Discipline, number>;
    dominant: Discipline;
    avgSharpness: number | null;
  };
  narrative: string;
  generatedAt: string;
}

export interface VitalsEntry {
  restingHR: number | null;
  hrv: number | null;
  vo2Max: number | null;
}

export type RankName = 'EAST BLUE ROOKIE' | 'PIRATE HUNTER' | 'SUPERNOVA' | 'WARLORD' | 'YONKO COMMANDER' | 'KING OF HELL';

export interface ProgressionEvent {
  type: 'rank_up' | 'technique_unlocked' | 'week_completed' | 'title_earned' | 'skill_unlocked' | 'boss_completed' | 'boss_failed' | 'boss_hint' | 'theme_unlocked' | 'data_reset' | 'breathing_complete' | 'bounty_completed' | 'arc_week_complete' | 'arc_completed' | 'rate_limit';
  rank?: Rank;
  reward?: Reward;
  path?: string;
  weekNum?: number;
  tier?: { weeks: number; name: string; kanji: string; rarity: string; desc: string };
  discipline?: Discipline;
  branch?: string;
  unlock?: { id: string; name: string; desc: string; xp: number };
  boss?: { id: string; name: string; kanji: string; desc: string; discipline: string; exercises: unknown[]; xpReward: number; techniqueReward?: string; weeksRequired: number };
  themeKey?: string;
  bounty?: BountyMission;
  arcId?: string;
  arc?: { id: string; name: string; kanji: string; xpReward: number; techniqueReward?: string };
  programId?: string;
}