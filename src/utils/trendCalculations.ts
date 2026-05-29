import type { Progress, Session } from '../types';
import { computeRingProgress, toDateKey } from '../logic/progression';

/**
 * Buckets completed sessions by their end-date key (YYYY-MM-DD). Built once per
 * trend call so the per-day reducers below are O(sessions) total, not O(days×sessions).
 */
function sessionsByDate(progress: Progress): Record<string, Session[]> {
  const map: Record<string, Session[]> = {};
  for (const s of progress.sessions || []) {
    if (s.endedAt == null) continue;
    const key = toDateKey(new Date(s.endedAt));
    (map[key] ||= []).push(s);
  }
  return map;
}

/**
 * Returns an array of date keys for the last N days, excluding today.
 * @param today - Current date in YYYY-MM-DD format.
 * @param n - Number of days to include.
 * @returns Array of date keys (YYYY-MM-DD).
 */
export function getLastNDays(today: string, n: number): string[] {
  const days = [];
  for (let i = 1; i <= n; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split('T')[0]);
  }
  return days;
}

/**
 * Calculates XP trend over a range of days.
 * @param progress - Current progress state.
 * @param days - Array of date keys.
 * @returns Array of XP values for each day.
 */
export function calculateXpTrend(progress: Progress, days: string[]): number[] {
  const byDate = sessionsByDate(progress);
  return days.map(d => (byDate[d] || []).reduce((sum, s) => sum + (s.xpEarned || 0), 0));
}

/**
 * Calculates calorie trend over a range of days.
 * @param progress - Current progress state.
 * @param days - Array of date keys.
 * @returns Array of calorie values for each day.
 */
export function calculateCalorieTrend(progress: Progress, days: string[]): number[] {
  const byDate = sessionsByDate(progress);
  return days.map(d => (byDate[d] || []).reduce((sum, s) => sum + (s.calories || 0), 0));
}

/**
 * Calculates step trend over a range of days.
 * @param progress - Current progress state.
 * @param days - Array of date keys.
 * @returns Array of step values for each day.
 */
export function calculateStepTrend(progress: Progress, days: string[]): number[] {
  return days.map(d => progress.stepLog?.[d]?.steps ?? 0);
}

/**
 * Calculates sword sharpness trend over a range of days.
 * @param progress - Current progress state.
 * @param days - Array of date keys.
 * @returns Array of sharpness values for each day (or null if not logged).
 */
export function calculateSharpnessTrend(progress: Progress, days: string[]): (number | null)[] {
  return days.map(d => progress.swordSharpnessLog?.[d] ?? null);
}

/**
 * Calculates sleep hours trend over a range of days.
 * @param progress - Current progress state.
 * @param days - Array of date keys.
 * @returns Array of sleep hours for each day (or null if not logged).
 */
export function calculateSleepTrend(progress: Progress, days: string[]): (number | null)[] {
  return days.map(d => progress.sleepLog?.[d]?.hours ?? null);
}

/**
 * Calculates body weight trend over a range of days.
 * @param progress - Current progress state.
 * @param days - Array of date keys.
 * @returns Array of weight values for each day (or null if not logged).
 */
export function calculateWeightTrend(_progress: Progress, days: string[]): (number | null)[] {
  // No per-day body-weight history is persisted — `bodyStats.weight` and
  // `bodyComposition` are single current snapshots, not date-keyed logs. A daily
  // trend therefore has no data source and is all-null until a `bodyWeightLog`
  // (Record<dateKey, number>) is added to the Progress schema + normalizer.
  return days.map(() => null);
}

/**
 * Calculates ring closure progress trend over a range of days.
 * @param progress - Current progress state.
 * @param days - Array of date keys.
 * @returns Array of ring closure percentages for each day.
 */
export function calculateRingClosureTrend(progress: Progress, days: string[]): number[] {
  return days.map(d => {
    const rings = computeRingProgress(progress, d);
    const closed = [rings.wado, rings.sandai, rings.shusui].filter(r => r.pct >= 1).length;
    return Math.round((closed / 3) * 100);
  });
}

/**
 * Shortens date keys to day abbreviations (e.g., "Mon").
 * @param dateKey - Date in YYYY-MM-DD format.
 * @returns Shortened day abbreviation.
 */
export function shortDay(dateKey: string): string {
  const date = new Date(dateKey);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Shortens date keys to MM/DD format.
 * @param dateKey - Date in YYYY-MM-DD format.
 * @returns Formatted date string.
 */
export function shortDate(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  return `${month}/${day}`;
}