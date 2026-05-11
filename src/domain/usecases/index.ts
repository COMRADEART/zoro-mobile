import {
  applySessionStart,
  applySessionEnd,
  updateRecoveryFromSleep,
  updateMood,
  updateBodyStats,
  computeActivityRings,
  computeRingClosureRate,
  getDailyRecommendation,
  completionsForDate,
  currentStreak,
  currentWeekView,
  weeklyVolume,
  totalWeeklyVolume,
  recentSessions,
  getReadinessLevel,
  getReadinessColor,
  computeSwordSharpness,
  getSharpnessLabel,
  getSharpnessColor,
  computeDreamArchetype,
  computeRingProgress,
  logBreathingSession,
  toDateKey,
  rankIndexFor,
  evaluateBossCompletion,
  getActiveBossChallenge,
} from '../../logic/progression';
import type {
  Progress,
  Discipline,
  ProgressionEvent,
  LoggedExercise,
  Session,
} from '../../types';

export class SessionUseCases {
  constructor(private getProgress: () => Progress, private apply: (updater: Progress | ((p: Progress) => Progress)) => void) {}

  startSession(discipline: Discipline): ProgressionEvent[] {
    const result = applySessionStart(this.getProgress(), { discipline });
    this.apply(result.progress);
    return result.events;
  }

  endSession(sessionId: string, exercises: LoggedExercise[], intensity: number): ProgressionEvent[] {
    const result = applySessionEnd(this.getProgress(), { sessionId, exercises, intensity });
    this.apply(result.progress);
    return result.events;
  }

  getCurrentSession(): Session | undefined {
    return this.getProgress().currentSession;
  }
}

export class HealthUseCases {
  constructor(private getProgress: () => Progress, private apply: (updater: Progress | ((p: Progress) => Progress)) => void) {}

  logSleep(date: string, quality: number, hours: number, deepHours = 0, lightHours = 0, remHours = 0, awakeHours = 0): ProgressionEvent[] {
    const result = updateRecoveryFromSleep(this.getProgress(), { date, quality, hours, deepHours, lightHours, remHours, awakeHours });
    this.apply(result.progress);
    return result.events;
  }

  logMood(date: string, energy: number, mood: number): ProgressionEvent[] {
    const result = updateMood(this.getProgress(), { date, energy, mood });
    this.apply(result.progress);
    return result.events;
  }

  updateBodyStats(weight: number, height: number, unit?: string): ProgressionEvent[] {
    const result = updateBodyStats(this.getProgress(), { weight, height, unit });
    this.apply(result.progress);
    return result.events;
  }

  logBreathing(date: string, programId: string, durationMin: number, xpReward = 0): ProgressionEvent[] {
    const result = logBreathingSession(this.getProgress(), { date, programId, durationMin, xpReward });
    this.apply(result.progress);
    return result.events;
  }
}

export class GameUseCases {
  constructor(private getProgress: () => Progress, private apply: (updater: Progress | ((p: Progress) => Progress)) => void) {}

  getActivityRings(date: string) {
    return computeActivityRings(this.getProgress(), date);
  }

  getRingClosureRate(dateRange: { date: string }[]) {
    return computeRingClosureRate(this.getProgress(), dateRange);
  }

  getDailyRecommendation(date = new Date()) {
    return getDailyRecommendation(this.getProgress(), date);
  }

  getCompletionsForDate(date: string): number {
    return completionsForDate(this.getProgress(), date);
  }

  getCurrentStreak(date: string): number {
    return currentStreak(this.getProgress(), date);
  }

  getCurrentWeekView(date: string) {
    return currentWeekView(this.getProgress(), date);
  }

  getWeeklyVolume(discipline: Discipline, date: string): number {
    return weeklyVolume(this.getProgress(), discipline, date);
  }

  getTotalWeeklyVolume(date: string) {
    return totalWeeklyVolume(this.getProgress(), date);
  }

  getRecentSessions(count = 5): Session[] {
    return recentSessions(this.getProgress(), count);
  }

  getReadinessLevel(): 'READY' | 'PUSH' | 'RECOVER' {
    return getReadinessLevel(this.getProgress());
  }

  getReadinessColor(): string {
    return getReadinessColor(this.getProgress());
  }

  getSwordSharpness(date: string): number {
    return computeSwordSharpness(this.getProgress(), date);
  }

  getSharpnessLabel(score: number): string {
    return getSharpnessLabel(score);
  }

  getSharpnessColor(score: number): string {
    return getSharpnessColor(score);
  }

  getDreamArchetype(date: string): string {
    return computeDreamArchetype(this.getProgress(), date);
  }

  getRingProgress(date: string) {
    return computeRingProgress(this.getProgress(), date);
  }

  getRankIndex(): number {
    return rankIndexFor(this.getProgress().totalXP);
  }

  getActiveBossChallenge(date: string) {
    return getActiveBossChallenge(this.getProgress(), date);
  }

  evaluateBossCompletion(bossId: string, date: string): ProgressionEvent[] {
    const result = evaluateBossCompletion(this.getProgress(), bossId, date);
    if (result.events.length > 0) {
      this.apply(result.progress);
    }
    return result.events;
  }
}

export { toDateKey };