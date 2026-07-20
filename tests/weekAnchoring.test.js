import {
  evaluateWeekCompletion,
  evaluateArcWeekCompletion,
  defaultProgress,
  normalizeProgress,
} from '../src/logic/progression.js';

const freshProgress = (overrides = {}) => normalizeProgress({ ...defaultProgress(), ...overrides });

// dayLog with `n` consecutive trained days ending at `endDate`.
const streakDayLog = (endDate, n) => {
  const log = {};
  for (let i = 0; i < n; i++) {
    const d = new Date(`${endDate}T12:00:00Z`);
    d.setDate(d.getDate() - i);
    log[d.toISOString().slice(0, 10)] = { wado: 0, sandai: 1, shusui: 0 };
  }
  return log;
};

describe('evaluateWeekCompletion window anchoring', () => {
  test('7 consecutive trained days complete a week', () => {
    const p = freshProgress({ dayLog: streakDayLog('2024-01-15', 7) });
    const result = evaluateWeekCompletion(p, '2024-01-15');
    expect(result).not.toBeNull();
    expect(result.progress.completedWeeks).toHaveLength(1);
    expect(result.events.some(e => e.type === 'week_completed')).toBe(true);
  });

  test('day 8 of the same streak does NOT mint a second week', () => {
    const p = freshProgress({ dayLog: streakDayLog('2024-01-16', 8) });
    const first = evaluateWeekCompletion(p, '2024-01-15');
    // Old behavior: days 2-8 also form a fully-trained trailing window, so a
    // new week completed every single day of a streak (~7x title inflation).
    expect(evaluateWeekCompletion(first.progress, '2024-01-16')).toBeNull();
  });

  test('day 14 mints week 2 (non-overlapping window)', () => {
    const p = freshProgress({ dayLog: streakDayLog('2024-01-22', 14) });
    const first = evaluateWeekCompletion(p, '2024-01-15');
    const second = evaluateWeekCompletion(first.progress, '2024-01-22');
    expect(second).not.toBeNull();
    expect(second.progress.completedWeeks).toHaveLength(2);
  });
});

describe('evaluateArcWeekCompletion timeline anchoring', () => {
  // Sessions on `n` consecutive days ending at endDate, sandai discipline.
  const dailySessions = (endDate, n) =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date(`${endDate}T18:00:00Z`);
      d.setDate(d.getDate() - i);
      return {
        id: `s${i}`, discipline: 'sandai', startedAt: d.getTime() - 3600000,
        endedAt: d.getTime(), exercises: [], calories: 100, intensity: 5, xpEarned: 50,
      };
    });

  const arcProgressAt = (startedAt) => ({
    'arc-east-blue': { startedAt, completedWeeks: [], status: 'active' },
  });

  test('week 1 cannot complete before startedAt+6', () => {
    const p = freshProgress({
      sessions: dailySessions('2024-01-12', 6),
      arcProgress: arcProgressAt('2024-01-10'),
    });
    const { events } = evaluateArcWeekCompletion(p, 'arc-east-blue', 1, '2024-01-12');
    expect(events).toEqual([]);
  });

  test('one burst of sessions cannot complete week 1 and week 2 on the same date', () => {
    // 7 trained days ending at startedAt+6: enough sessions for both weeks'
    // targets (3 and 4), but week 2's window hasn't elapsed yet.
    const p = freshProgress({
      sessions: dailySessions('2024-01-16', 7),
      arcProgress: arcProgressAt('2024-01-10'),
    });
    const w1 = evaluateArcWeekCompletion(p, 'arc-east-blue', 1, '2024-01-16');
    expect(w1.events.some(e => e.type === 'arc_week_complete')).toBe(true);
    const w2 = evaluateArcWeekCompletion(w1.progress, 'arc-east-blue', 2, '2024-01-16');
    expect(w2.events).toEqual([]);
  });

  test('week 2 completes in its own window', () => {
    const p = freshProgress({
      sessions: dailySessions('2024-01-23', 14),
      arcProgress: { 'arc-east-blue': { startedAt: '2024-01-10', completedWeeks: [1], status: 'active' } },
    });
    const { events } = evaluateArcWeekCompletion(p, 'arc-east-blue', 2, '2024-01-23');
    expect(events.some(e => e.type === 'arc_week_complete')).toBe(true);
  });
});
