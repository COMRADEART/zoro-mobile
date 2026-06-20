import {
  calculateXpTrend,
  calculateCalorieTrend,
  calculateRingClosureTrend,
  calculateWeightTrend,
  calculateStepTrend,
} from '../src/utils/trendCalculations';
import { defaultProgress } from '../src/logic/progression.js';

// Production toDateKey() is UTC (toISOString), so a session ending at noon UTC on
// 2024-01-15 buckets into the '2024-01-15' key on every machine regardless of TZ.
const DAY = '2024-01-15';
const ENDED_AT = Date.parse('2024-01-15T12:00:00Z');

function progressWith(sessions = [], extra = {}) {
  return { ...defaultProgress(), sessions, ...extra };
}

function session(overrides = {}) {
  return {
    id: 's',
    discipline: 'sandai',
    startedAt: ENDED_AT - 3600000,
    endedAt: ENDED_AT,
    exercises: [],
    calories: 0,
    intensity: 5,
    xpEarned: 0,
    ...overrides,
  };
}

describe('trendCalculations', () => {
  test('xp + calorie trends sum sessions bucketed by end-date', () => {
    const p = progressWith([
      session({ id: 's1', discipline: 'sandai', calories: 120, xpEarned: 250 }),
      session({ id: 's2', discipline: 'wado', calories: 80, xpEarned: 100 }),
    ]);
    expect(calculateXpTrend(p, [DAY])).toEqual([350]);
    expect(calculateCalorieTrend(p, [DAY])).toEqual([200]);
  });

  test('empty / unlogged days yield zeros, not NaN', () => {
    const p = progressWith();
    expect(calculateXpTrend(p, [DAY, '2024-01-14'])).toEqual([0, 0]);
    expect(calculateCalorieTrend(p, [DAY])).toEqual([0]);
  });

  // Regression: VoyageLogScreen crashed because the old impl did
  // Object.values(dayLog[d].exercises) — `exercises` doesn't exist on DayLog.
  test('calorie trend does NOT throw when a dayLog entry exists (VoyageLog crash)', () => {
    const p = progressWith([], { dayLog: { [DAY]: { wado: 1, sandai: 0, shusui: 0 } } });
    expect(() => calculateCalorieTrend(p, [DAY])).not.toThrow();
    expect(calculateCalorieTrend(p, [DAY])).toEqual([0]);
  });

  test('ring-closure trend reflects sessions that hit ring targets', () => {
    // sandai ring closes at 200 reps → 1 of 3 rings closed → round(1/3*100) = 33
    const p = progressWith([
      session({
        id: 's3',
        discipline: 'sandai',
        exercises: [{ id: 'x', name: 'Push-ups', unit: 'reps', amount: 200 }],
      }),
    ]);
    expect(calculateRingClosureTrend(p, [DAY])).toEqual([33]);
    expect(calculateRingClosureTrend(progressWith(), [DAY])).toEqual([0]);
  });

  test('step trend reads stepLog; weight trend is all-null (no per-day weight log)', () => {
    const p = progressWith([], { stepLog: { [DAY]: { steps: 8000 } } });
    expect(calculateStepTrend(p, [DAY, '2024-01-14'])).toEqual([8000, 0]);
    expect(calculateWeightTrend(p, [DAY, '2024-01-14'])).toEqual([null, null]);
  });
});
