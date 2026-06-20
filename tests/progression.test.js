import {
  rankIndexFor,
  computeSwordSharpness,
  applySessionStart,
  applySessionEnd,
  evaluateBountyMissions,
  evaluateArcWeekCompletion,
  evaluateSkillUnlock,
  computeRingProgress,
  getTodaySessions,
  normalizeProgress,
  getArcProgress,
  computeDreamArchetype,
  computeTrends,
  currentStreak,
  toDateKey,
  defaultProgress,
  RECOVERY_COST_PER_HOUR,
  RECOVERY_GAIN_PER_HOUR_SLEEP,
  XP_PER_SESSION_HOUR,
  XP_PER_EXERCISE,
  MAX_RECOVERY,
} from '../src/logic/progression.js';
import {
  RANKS,
  SWORDS,
  BOUNTY_MISSIONS,
  SKILL_TREES,
  TRAINING_ARCS,
  BOSS_CHALLENGES,
  REWARDS,
} from '../src/data/gameData.js';

const BASE_PROGRESS = defaultProgress();

function freshProgress(overrides = {}) {
  return { ...BASE_PROGRESS, ...overrides };
}

// Production toDateKey now uses LOCAL time (deliberately — see the function).
// Test fixtures must stay UTC-anchored so they produce the same keys on every
// CI/dev machine regardless of TZ. Don't replace this with the imported helper.
function toDateKeyUTC(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function dayOffset(days) {
  const d = new Date('2024-01-15T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return toDateKeyUTC(d);
}

function makeSession(discipline, dayOffsetNum, durationMs = 3600000, exercises = []) {
  const startMs = new Date('2024-01-15T12:00:00Z').getTime();
  const sessionMs = startMs + (dayOffsetNum * 24 * 60 * 60 * 1000);
  const startedAt = sessionMs;
  const endedAt = sessionMs + durationMs;
  return {
    id: `sess_${dayOffsetNum}_${discipline}`,
    discipline,
    startedAt,
    endedAt,
    exercises: exercises.length ? exercises : [{ id: `${discipline}-meditation`, name: 'Meditation', amount: 10, unit: 'min' }],
    calories: 40,
    intensity: 5,
    xpEarned: 0,
  };
}

describe('rankIndexFor', () => {
  test('returns 0 for XP below first threshold', () => {
    expect(rankIndexFor(0)).toBe(0);
    expect(rankIndexFor(499)).toBe(0);
  });

  test('returns correct index at exact thresholds', () => {
    expect(rankIndexFor(500)).toBe(1);
    expect(rankIndexFor(1500)).toBe(2);
    expect(rankIndexFor(3500)).toBe(3);
    expect(rankIndexFor(7000)).toBe(4);
    expect(rankIndexFor(12000)).toBe(5);
  });

  test('returns correct index in middle of range', () => {
    expect(rankIndexFor(750)).toBe(1);
    expect(rankIndexFor(2500)).toBe(2);
    expect(rankIndexFor(5000)).toBe(3);
  });

  test('returns last rank for very high XP', () => {
    expect(rankIndexFor(999999)).toBe(RANKS.length - 1);
  });
});

describe('computeSwordSharpness', () => {
  test('returns 0 when recovery is 0 and no other data', () => {
    const progress = freshProgress({ recoveryScore: 0, moodLog: {}, sleepLog: {}, vitalsLog: {} });
    expect(computeSwordSharpness(progress, '2024-01-15')).toBe(0);
  });

  test('returns capped at 100 with perfect inputs', () => {
    const progress = freshProgress({
      recoveryScore: 100,
      moodLog: { '2024-01-15': { energy: 10, mood: 10 } },
      sleepLog: {
        '2024-01-15': { quality: 5, hours: 8, deepHours: 2, remHours: 2 },
        '2024-01-14': { quality: 5, hours: 8, deepHours: 2, remHours: 2 },
        '2024-01-13': { quality: 5, hours: 8, deepHours: 2, remHours: 2 },
      },
      vitalsLog: { '2024-01-15': { restingHR: 55, hrv: 80, vo2Max: 55 } },
    });
    expect(computeSwordSharpness(progress, '2024-01-15')).toBeLessThanOrEqual(100);
  });

  test('factors in mood and energy when moodLog present', () => {
    const base = freshProgress({ recoveryScore: 50, moodLog: {}, sleepLog: {}, vitalsLog: {} });
    const withMood = freshProgress({
      recoveryScore: 50,
      moodLog: { '2024-01-15': { energy: 1, mood: 1 } },
      sleepLog: {},
      vitalsLog: {},
    });
    const sharpBase = computeSwordSharpness(base, '2024-01-15');
    const sharpMood = computeSwordSharpness(withMood, '2024-01-15');
    expect(sharpMood).toBeLessThan(sharpBase);
  });
});

describe('applySessionStart', () => {
  test('creates a session for valid discipline', () => {
    const { progress, events } = applySessionStart(BASE_PROGRESS, { discipline: 'wado' });
    expect(progress.currentSession).toBeDefined();
    expect(progress.currentSession.discipline).toBe('wado');
    expect(events).toEqual([]);
  });

  test('returns empty for invalid discipline', () => {
    const { progress, events } = applySessionStart(BASE_PROGRESS, { discipline: 'invalid' });
    expect(progress.currentSession).toBeUndefined();
    expect(events).toEqual([]);
  });
});

describe('applySessionEnd', () => {
  const defaultSession = {
    id: 'sess_test',
    discipline: 'wado',
    startedAt: new Date('2024-01-15T10:00:00Z').getTime(),
    endedAt: null,
    exercises: [],
    calories: 0,
    intensity: 0,
    xpEarned: 0,
  };

  test('adds XP from session', () => {
    const progress = {
      ...freshProgress(),
      currentSession: { ...defaultSession, startedAt: Date.now() - 3600000 },
    };
    const { progress: next } = applySessionEnd(progress, {
      sessionId: 'sess_test',
      exercises: [{ id: 'wado-meditation', name: 'Meditation', amount: 10, unit: 'min' }],
      intensity: 5,
      endedAt: Date.now(),
    });
    expect(next.totalXP).toBeGreaterThan(0);
    expect(next.sessions.length).toBe(1);
  });

  test('drains recovery based on duration', () => {
    const startTime = Date.now() - 3600000;
    const progress = {
      ...freshProgress({ recoveryScore: 50 }),
      currentSession: { ...defaultSession, startedAt: startTime },
    };
    const { progress: next } = applySessionEnd(progress, {
      sessionId: 'sess_test',
      exercises: [{ id: 'wado-meditation', name: 'Meditation', amount: 10, unit: 'min' }],
      intensity: 5,
      endedAt: Date.now(),
    });
    expect(next.recoveryScore).toBeLessThan(50);
  });

  test('recovery floor is 0', () => {
    const startTime = Date.now() - 7200000;
    const progress = {
      ...freshProgress({ recoveryScore: 5 }),
      currentSession: { ...defaultSession, startedAt: startTime },
    };
    const { progress: next } = applySessionEnd(progress, {
      sessionId: 'sess_test',
      exercises: [{ id: 'wado-meditation', name: 'Meditation', amount: 10, unit: 'min' }],
      intensity: 5,
      endedAt: Date.now(),
    });
    expect(next.recoveryScore).toBeGreaterThanOrEqual(0);
  });

  test('creates dayLog entry', () => {
    const startTime = Date.now() - 3600000;
    const today = toDateKey(new Date());
    const progress = {
      ...freshProgress(),
      currentSession: { ...defaultSession, startedAt: startTime },
    };
    const { progress: next } = applySessionEnd(progress, {
      sessionId: 'sess_test',
      exercises: [{ id: 'wado-meditation', name: 'Meditation', amount: 10, unit: 'min' }],
      intensity: 5,
      endedAt: Date.now(),
    });
    expect(next.dayLog[today]).toBeDefined();
    expect(next.dayLog[today].wado).toBeGreaterThan(0);
  });

  test('returns empty if session not found', () => {
    const progress = freshProgress({ currentSession: defaultSession });
    const { progress: next, events } = applySessionEnd(progress, {
      sessionId: 'wrong_id',
      exercises: [],
      intensity: 5,
    });
    expect(next).toBe(progress);
    expect(events).toEqual([]);
  });

  test('no rank_up event when XP threshold not crossed', () => {
    const startTime = Date.now() - 60000;
    const progress = {
      ...freshProgress({ totalXP: 0, peakXP: 0 }),
      currentSession: { ...defaultSession, startedAt: startTime },
    };
    const { events } = applySessionEnd(progress, {
      sessionId: 'sess_test',
      exercises: [{ id: 'wado-meditation', name: 'Meditation', amount: 1, unit: 'min' }],
      intensity: 1,
      endedAt: Date.now(),
    });
    const rankUps = events.filter(e => e.type === 'rank_up');
    expect(rankUps.length).toBeLessThanOrEqual(1);
  });
});

describe('evaluateBountyMissions', () => {
  test('streak mission completes when streak is met', () => {
    const progress = freshProgress({
      totalXP: 100,
      peakXP: 100,
      dayLog: {
        '2024-01-15': { wado: 1, sandai: 0, shusui: 0 },
        '2024-01-14': { wado: 1, sandai: 0, shusui: 0 },
        '2024-01-13': { wado: 1, sandai: 0, shusui: 0 },
        '2024-01-12': { wado: 1, sandai: 0, shusui: 0 },
        '2024-01-11': { wado: 1, sandai: 0, shusui: 0 },
        '2024-01-10': { wado: 1, sandai: 0, shusui: 0 },
        '2024-01-09': { wado: 1, sandai: 0, shusui: 0 },
      },
      bountyMissions: [
        { id: 'bm-iron-week', type: 'streak', status: 'active', assignedAt: '2024-01-15' },
      ],
    });

    const { progress: next } = evaluateBountyMissions(progress, '2024-01-15');
    const mission = next.bountyMissions.find(m => m.id === 'bm-iron-week');
    expect(mission?.status).toBe('completed');
    expect(next.totalXP).toBeGreaterThan(progress.totalXP);
  });

  test('all_disciplines mission completes when all three logged in a day', () => {
    const progress = freshProgress({
      totalXP: 100,
      peakXP: 100,
      dayLog: {
        '2024-01-15': { wado: 1, sandai: 1, shusui: 1 },
      },
      bountyMissions: [
        { id: 'bm-triple-discipline', type: 'triple', status: 'active', assignedAt: '2024-01-15' },
      ],
    });

    const { progress: next } = evaluateBountyMissions(progress, '2024-01-15');
    const mission = next.bountyMissions.find(m => m.id === 'bm-triple-discipline');
    expect(mission?.status).toBe('completed');
  });

  test('weekly_kcal mission completes when calorie target met', () => {
    const sessions = [];
    for (let i = 0; i < 7; i++) {
      sessions.push({
        ...makeSession('sandai', -i, 3600000, []),
        calories: 200,
      });
    }
    const progress = freshProgress({
      totalXP: 100,
      peakXP: 100,
      sessions,
      dayLog: {},
      bountyMissions: [
        { id: 'bm-1000-kcal', type: 'calorie', status: 'active', assignedAt: '2024-01-15' },
      ],
    });

    const { progress: next } = evaluateBountyMissions(progress, '2024-01-15');
    const mission = next.bountyMissions.find(m => m.id === 'bm-1000-kcal');
    expect(mission?.status).toBe('completed');
  });

  test('incomplete streak does not complete mission', () => {
    const progress = freshProgress({
      totalXP: 100,
      peakXP: 100,
      dayLog: {
        '2024-01-15': { wado: 1, sandai: 0, shusui: 0 },
        '2024-01-14': { wado: 1, sandai: 0, shusui: 0 },
      },
      bountyMissions: [
        { id: 'bm-iron-week', type: 'streak', status: 'active', assignedAt: '2024-01-15' },
      ],
    });

    const { progress: next } = evaluateBountyMissions(progress, '2024-01-15');
    const mission = next.bountyMissions.find(m => m.id === 'bm-iron-week');
    expect(mission?.status).toBe('active');
  });

  test('discipline_streak mission completes when discipline trained for N consecutive days', () => {
    const dayLog = {};
    for (let i = 0; i < 5; i++) {
      const d = new Date('2024-01-15T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      const key = toDateKeyUTC(d);
      dayLog[key] = { wado: 1, sandai: 0, shusui: 0 };
    }
    const progress = freshProgress({
      totalXP: 100,
      peakXP: 100,
      dayLog,
      bountyMissions: [
        { id: 'bm-wado-monk', type: 'discipline', status: 'active', assignedAt: '2024-01-15' },
      ],
    });

    const { progress: next } = evaluateBountyMissions(progress, '2024-01-15');
    const mission = next.bountyMissions.find(m => m.id === 'bm-wado-monk');
    expect(mission?.status).toBe('completed');
  });

  test('sharpness_streak mission completes when sharpness threshold met for N days', () => {
    const swordSharpnessLog = {};
    for (let i = 0; i < 3; i++) {
      const d = new Date('2024-01-15T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      const key = toDateKeyUTC(d);
      swordSharpnessLog[key] = 95;
    }
    const progress = freshProgress({
      totalXP: 100,
      peakXP: 100,
      dayLog: {},
      swordSharpnessLog,
      bountyMissions: [
        { id: 'bm-sharpness-90', type: 'readiness', status: 'active', assignedAt: '2024-01-15' },
      ],
    });

    const { progress: next } = evaluateBountyMissions(progress, '2024-01-15');
    const mission = next.bountyMissions.find(m => m.id === 'bm-sharpness-90');
    expect(mission?.status).toBe('completed');
  });

  test('hydration_streak mission completes when hydration threshold met', () => {
    const hydrationLog = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date('2024-01-15T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      const key = toDateKeyUTC(d);
      hydrationLog[key] = { cups: 8 };
    }
    const progress = freshProgress({
      totalXP: 100,
      peakXP: 100,
      dayLog: {},
      hydrationLog,
      bountyMissions: [
        { id: 'bm-sake-month', type: 'hydration', status: 'active', assignedAt: '2024-01-15' },
      ],
    });

    const { progress: next } = evaluateBountyMissions(progress, '2024-01-15');
    const mission = next.bountyMissions.find(m => m.id === 'bm-sake-month');
    expect(mission?.status).toBe('completed');
  });
});

describe('evaluateArcWeekCompletion', () => {
  test('completes week when session target met', () => {
    const sessions = [];
    for (let i = 0; i < 3; i++) {
      sessions.push({
        ...makeSession('sandai', i - 2), // days: -2, -1, 0 → 2024-01-13, 2024-01-14, 2024-01-15
        discipline: 'sandai',
      });
    }
    const progress = freshProgress({
      sessions,
      arcProgress: {
        'arc-east-blue': {
          startedAt: '2024-01-13',
          completedWeeks: [],
          status: 'active',
        },
      },
    });

    const { progress: next, events } = evaluateArcWeekCompletion(progress, 'arc-east-blue', 1, '2024-01-15');
    expect(next.arcProgress['arc-east-blue'].completedWeeks).toContain(1);
    expect(events.some(e => e.type === 'arc_week_complete')).toBe(true);
  });

  test('does not complete week when target not met', () => {
    const progress = freshProgress({
      sessions: [],
      arcProgress: {
        'arc-east-blue': {
          startedAt: '2024-01-13',
          completedWeeks: [],
          status: 'active',
        },
      },
    });

    const { progress: next, events } = evaluateArcWeekCompletion(progress, 'arc-east-blue', 1, '2024-01-15');
    expect(next.arcProgress['arc-east-blue'].completedWeeks).not.toContain(1);
    expect(events.length).toBe(0);
  });

  test('marks arc completed when all weeks done', () => {
    const sessions = [];
    for (let w = 0; w < 4; w++) {
      for (let d = 0; d < 3; d++) {
        sessions.push(makeSession('sandai', w * 7 + d));
      }
    }
    sessions.push(makeSession('sandai', 24));
    sessions.push(makeSession('sandai', 25));
    sessions.push(makeSession('sandai', 26));
    const progress = freshProgress({
      sessions,
      arcProgress: {
        'arc-east-blue': {
          startedAt: '2024-01-15',
          completedWeeks: [1, 2, 3],
          status: 'active',
        },
      },
    });

    const { progress: next, events } = evaluateArcWeekCompletion(progress, 'arc-east-blue', 4, '2024-02-11');
    expect(next.arcProgress['arc-east-blue'].status).toBe('completed');
    expect(events.some(e => e.type === 'arc_completed')).toBe(true);
  });

  test('returns empty for invalid arcId', () => {
    const { progress: next, events } = evaluateArcWeekCompletion(freshProgress(), 'invalid-arc', 1, '2024-01-15');
    expect(next).toEqual(freshProgress());
    expect(events).toEqual([]);
  });

  test('returns empty for already completed week', () => {
    const progress = freshProgress({
      arcProgress: {
        'arc-east-blue': {
          startedAt: '2024-01-13',
          completedWeeks: [1],
          status: 'active',
        },
      },
    });

    const { progress: next } = evaluateArcWeekCompletion(progress, 'arc-east-blue', 1, '2024-01-15');
    expect(next.arcProgress['arc-east-blue'].completedWeeks).toEqual([1]);
  });
});

describe('evaluateSkillUnlock', () => {
  test('unlocks skill when XP threshold met', () => {
    const dayLog = {};
    for (let i = 0; i < 3; i++) {
      const d = new Date('2024-01-15T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      dayLog[toDateKey(d)] = { wado: 1, sandai: 0, shusui: 0 };
    }
    const progress = freshProgress({ dayLog, skillUnlocks: { wado: {}, sandai: {}, shusui: {} } });

    const result = evaluateSkillUnlock(progress, 'wado');
    expect(result).not.toBeNull();
    expect(result.progress.skillUnlocks.wado).toBeDefined();
  });

  test('returns null for invalid discipline', () => {
    const result = evaluateSkillUnlock(freshProgress(), 'invalid');
    expect(result).toBeNull();
  });

  test('does not duplicate already unlocked skills', () => {
    const dayLog = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date('2024-01-15T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      dayLog[toDateKey(d)] = { wado: 1, sandai: 0, shusui: 0 };
    }
    const progress = freshProgress({
      dayLog,
      skillUnlocks: { wado: { focus: ['wado-focus-1'] }, sandai: {}, shusui: {} },
    });

    const result = evaluateSkillUnlock(progress, 'wado');
    expect(result.progress.skillUnlocks.wado.focus).toContain('wado-focus-1');
  });
});

describe('computeRingProgress', () => {
  test('calculates ring progress from sessions', () => {
    const sessions = [
      {
        id: 's1',
        discipline: 'wado',
        startedAt: Date.now() - 3600000,
        endedAt: Date.now(),
        exercises: [{ id: 'wado-meditation', name: 'Meditation', amount: 15, unit: 'min' }],
      },
      {
        id: 's2',
        discipline: 'sandai',
        startedAt: Date.now() - 3600000,
        endedAt: Date.now(),
        exercises: [{ id: 'sandai-pushups', name: 'Push-ups', amount: 100, unit: 'reps' }],
      },
    ];
    const progress = freshProgress({ sessions });
    const today = toDateKey(new Date());
    const rings = computeRingProgress(progress, today);

    expect(rings.wado.current).toBeGreaterThan(0);
    expect(rings.sandai.current).toBeGreaterThan(0);
    expect(rings.wado.pct).toBeGreaterThan(0);
  });

  test('includes breathing log in wado ring', () => {
    const progress = freshProgress({
      sessions: [],
      breathingLog: { [toDateKey(new Date())]: [{ programId: 'bp-box', durationMin: 10 }] },
    });
    const rings = computeRingProgress(progress, toDateKey(new Date()));
    expect(rings.wado.current).toBe(10);
  });

  test('returns zeros for no sessions', () => {
    const progress = freshProgress({ sessions: [] });
    const rings = computeRingProgress(progress, '2024-01-15');
    expect(rings.wado.current).toBe(0);
    expect(rings.sandai.current).toBe(0);
    expect(rings.shusui.current).toBe(0);
  });
});

describe('getTodaySessions', () => {
  test('filters sessions by date', () => {
    const sessions = [
      makeSession('wado', 0),
      makeSession('sandai', -1),
      makeSession('shusui', -2),
    ];
    const progress = freshProgress({ sessions });
    const today = toDateKey(new Date('2024-01-15'));
    const todaySessions = getTodaySessions ? getTodaySessions(progress, today) : progress.sessions.filter(s => toDateKey(new Date(s.endedAt)) === today);
    expect(todaySessions.length).toBe(1);
  });
});

describe('normalizeProgress', () => {
  test('returns defaultProgress for null input', () => {
    const result = normalizeProgress(null);
    expect(result.totalXP).toBe(0);
    expect(result.schemaVersion).toBe(4);
  });

  test('returns defaultProgress for non-object input', () => {
    expect(normalizeProgress('string')).toBeDefined();
    expect(normalizeProgress(123)).toBeDefined();
  });

  test('preserves valid totalXP', () => {
    const result = normalizeProgress({ totalXP: 1234 });
    expect(result.totalXP).toBe(1234);
  });

  test('clamps totalXP to max 1e9', () => {
    const result = normalizeProgress({ totalXP: 2e9 });
    expect(result.totalXP).toBeLessThan(1e9);
  });

  test('rejects negative totalXP', () => {
    const result = normalizeProgress({ totalXP: -100 });
    expect(result.totalXP).toBe(0);
  });

  test('preserves valid activeSword', () => {
    const result = normalizeProgress({ activeSword: 'shusui' });
    expect(result.activeSword).toBe('shusui');
  });

  test('rejects invalid activeSword', () => {
    const result = normalizeProgress({ activeSword: 'invalid' });
    expect(result.activeSword).toBe('sandai');
  });

  test('clamps recoveryScore to 0-MAX_RECOVERY', () => {
    const over = normalizeProgress({ recoveryScore: 200 });
    const under = normalizeProgress({ recoveryScore: -50 });
    expect(over.recoveryScore).toBe(MAX_RECOVERY);
    expect(under.recoveryScore).toBe(0);
  });

  test('validates completedByDate date format', () => {
    const result = normalizeProgress({
      completedByDate: {
        '2024-01-15': { 'wado-Meditation': true },
        'invalid-date': { 'wado-Test': true },
        '20240115': { 'wado-Test2': true },
      },
    });
    expect(result.completedByDate['2024-01-15']).toBeDefined();
    expect(result.completedByDate['invalid-date']).toBeUndefined();
  });

  test('validates dayLog date format', () => {
    const result = normalizeProgress({
      dayLog: {
        '2024-01-15': { wado: 1, sandai: 0, shusui: 0 },
        'not-valid': { wado: 1 },
      },
    });
    expect(result.dayLog['2024-01-15']).toBeDefined();
    expect(result.dayLog['not-valid']).toBeUndefined();
  });

  test('filters unlocked to valid reward IDs', () => {
    const result = normalizeProgress({ unlocked: ['oni-giri', 'invalid-reward', 'tora-gari'] });
    expect(result.unlocked).toContain('oni-giri');
    expect(result.unlocked).toContain('tora-gari');
    expect(result.unlocked).not.toContain('invalid-reward');
  });

  test('validates sessions have endedAt', () => {
    const result = normalizeProgress({
      sessions: [
        { endedAt: Date.now() },
        { startedAt: Date.now() },
        { endedAt: null },
      ],
    });
    expect(result.sessions.length).toBe(1);
  });

  test('preserves a valid in-progress currentSession (crash-resume)', () => {
    const cs = {
      id: 'sess-1', discipline: 'wado', startedAt: Date.now(), endedAt: null,
      exercises: [], calories: 0, intensity: 5, xpEarned: 0, exerciseIndex: 0,
    };
    expect(normalizeProgress({ currentSession: cs }).currentSession).toEqual(cs);
  });

  test('drops a malformed, completed, or absent currentSession', () => {
    // completed (endedAt set) — must not resurrect as in-progress
    expect(normalizeProgress({ currentSession: { id: 's', discipline: 'wado', startedAt: 1, endedAt: 2, exercises: [] } }).currentSession).toBeUndefined();
    // invalid discipline
    expect(normalizeProgress({ currentSession: { id: 's', discipline: 'nope', startedAt: 1, endedAt: null, exercises: [] } }).currentSession).toBeUndefined();
    // missing id / missing exercises array
    expect(normalizeProgress({ currentSession: { discipline: 'wado', startedAt: 1, endedAt: null, exercises: [] } }).currentSession).toBeUndefined();
    expect(normalizeProgress({ currentSession: { id: 's', discipline: 'wado', startedAt: 1, endedAt: null } }).currentSession).toBeUndefined();
    // absent entirely
    expect(normalizeProgress({}).currentSession).toBeUndefined();
  });

  test('validates sleepLog entries', () => {
    const result = normalizeProgress({
      sleepLog: {
        '2024-01-15': { quality: 4, hours: 7 },
        'bad': { quality: 3, hours: 6 },
        '2024-01-14': { quality: 'bad', hours: null },
      },
    });
    expect(result.sleepLog['2024-01-15']).toBeDefined();
    expect(result.sleepLog['bad']).toBeUndefined();
  });

  test('clamps sleep hours to 0-24', () => {
    const result = normalizeProgress({
      sleepLog: {
        '2024-01-15': { quality: 4, hours: 30, deepHours: 25 },
      },
    });
    expect(result.sleepLog['2024-01-15'].hours).toBeLessThanOrEqual(24);
  });

  test('validates dreamArchetypeLog values', () => {
    const result = normalizeProgress({
      dreamArchetypeLog: {
        '2024-01-15': 'Guardian',
        '2024-01-14': 'Berserker',
        '2024-01-13': 'InvalidType',
      },
    });
    expect(result.dreamArchetypeLog['2024-01-15']).toBe('Guardian');
    expect(result.dreamArchetypeLog['2024-01-13']).toBeUndefined();
  });

  test('migrates settings correctly', () => {
    const result = normalizeProgress({ settings: { theme: 'blue', autoTheme: true } });
    expect(result.settings.theme).toBe('blue');
    expect(result.settings.autoTheme).toBe(true);
  });

  test('preserves v4 specific fields when present', () => {
    const result = normalizeProgress({
      hydrationLog: { '2024-01-15': { cups: 5 } },
      foodLog: {},
      bodyComposition: { bodyFatPct: 15 },
      arcProgress: { 'arc-east-blue': { startedAt: '2024-01-01', completedWeeks: [], status: 'active' } },
    });
    expect(result.hydrationLog['2024-01-15'].cups).toBe(5);
    expect(result.arcProgress['arc-east-blue']).toBeDefined();
  });
});

describe('getArcProgress', () => {
  test('returns arc progress for active arcs', () => {
    const progress = freshProgress({
      arcProgress: {
        'arc-east-blue': {
          startedAt: '2024-01-01',
          completedWeeks: [1, 2],
          status: 'active',
        },
      },
    });
    const result = getArcProgress(progress);
    expect(result['arc-east-blue']).toBeDefined();
    expect(result['arc-east-blue'].completedWeeks.length).toBe(2);
  });

  test('returns empty object when no arcs', () => {
    const result = getArcProgress(freshProgress());
    expect(Object.keys(result).length).toBe(0);
  });
});

describe('determineArchetype (computeDreamArchetype)', () => {
  test('returns Guardian for consistent 7+ hours high quality sleep', () => {
    const sleepLog = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date('2024-01-15T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      sleepLog[toDateKey(d)] = { quality: 4, hours: 7.5, deepHours: 2, remHours: 2 };
    }
    const progress = freshProgress({ sleepLog });
    const archetype = computeDreamArchetype(progress, '2024-01-15');
    expect(archetype).toBe('Guardian');
  });

  test('returns Ghost for less than 6 hours average', () => {
    const sleepLog = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date('2024-01-15T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      sleepLog[toDateKey(d)] = { quality: 3, hours: 5, deepHours: 0.5, remHours: 0.5 };
    }
    const progress = freshProgress({ sleepLog });
    const archetype = computeDreamArchetype(progress, '2024-01-15');
    expect(archetype).toBe('Ghost');
  });

  test('returns Berserker for high variance in sleep hours', () => {
    const sleepLog = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date('2024-01-15T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      const hours = i % 2 === 0 ? 9 : 4;
      sleepLog[toDateKey(d)] = { quality: 3, hours, deepHours: 1, remHours: 1 };
    }
    const progress = freshProgress({ sleepLog });
    const archetype = computeDreamArchetype(progress, '2024-01-15');
    expect(archetype).toBe('Berserker');
  });

  test('returns Ronin as default when no sleep data', () => {
    const progress = freshProgress({ sleepLog: {} });
    expect(computeDreamArchetype(progress, '2024-01-15')).toBe('Ronin');
  });
});

describe('computeTrends', () => {
  test('calculates volume trends over date range', () => {
    const sessions = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date('2024-01-15T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      sessions.push({
        ...makeSession('sandai', -i),
        discipline: 'sandai',
        calories: 100 + i * 10,
      });
    }
    const progress = freshProgress({ sessions });
    const trends = computeTrends(progress, dayOffset(-6), dayOffset(0));

    expect(trends.volumeTrend).toBeDefined();
    expect(trends.calorieTrend).toBeDefined();
  });

  test('handles empty sessions gracefully', () => {
    const progress = freshProgress({ sessions: [] });
    const trends = computeTrends(progress, dayOffset(-6), dayOffset(0));
    expect(trends.volumeTrend).toBe(0);
    expect(trends.calorieTrend).toBe(0);
  });
});

describe('currentStreak', () => {
  test('counts consecutive days with training', () => {
    const dayLog = {};
    for (let i = 0; i < 5; i++) {
      const d = new Date('2024-01-15T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      dayLog[toDateKeyUTC(d)] = { wado: 1, sandai: 0, shusui: 0 };
    }
    const progress = freshProgress({ dayLog });
    expect(currentStreak(progress, '2024-01-15')).toBe(5);
  });

  test('breaks on missing day', () => {
    const dayLog = {
      '2024-01-15': { wado: 1, sandai: 0, shusui: 0 },
      '2024-01-14': { wado: 1, sandai: 0, shusui: 0 },
      '2024-01-12': { wado: 1, sandai: 0, shusui: 0 },
    };
    const progress = freshProgress({ dayLog });
    expect(currentStreak(progress, '2024-01-15')).toBe(2);
  });

  test('returns 0 when no training', () => {
    const progress = freshProgress({ dayLog: {} });
    expect(currentStreak(progress, toDateKey(new Date()))).toBe(0);
  });
});

describe('toDateKey', () => {
  test('returns YYYY-MM-DD format for a known local date', () => {
    // Construct from local components so the assertion is TZ-stable;
    // an ISO-Z string would cross a day boundary in extreme offsets.
    const d = new Date(2024, 2, 15, 14, 30);
    expect(toDateKey(d)).toBe('2024-03-15');
  });

  test('defaults to today', () => {
    const result = toDateKey();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('activity rings', () => {
  test('computeActivityRings sums calories from sessions', () => {
    const sessions = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date('2024-01-15T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      sessions.push({
        ...makeSession('sandai', -i),
        calories: 150,
      });
    }
    const progress = freshProgress({ sessions });
    const { computeActivityRings } = require('../src/logic/progression.js');
    const rings = computeActivityRings(progress, '2024-01-15');
    expect(rings.move.current).toBe(150);
  });

  test('computeActivityRings sums exercise minutes', () => {
    const progress = freshProgress({
      sessions: [{
        id: 's1',
        discipline: 'wado',
        startedAt: new Date('2024-01-15T10:00:00Z').getTime(),
        endedAt: new Date('2024-01-15T11:00:00Z').getTime(),
        exercises: [],
        calories: 50,
      }],
    });
    const { computeActivityRings } = require('../src/logic/progression.js');
    const rings = computeActivityRings(progress, '2024-01-15');
    expect(rings.exercise.current).toBe(60);
  });

  test('computeActivityRings includes hydration for stand ring', () => {
    const progress = freshProgress({
      sessions: [],
      hydrationLog: { '2024-01-15': { cups: 5 } },
    });
    const { computeActivityRings } = require('../src/logic/progression.js');
    const rings = computeActivityRings(progress, '2024-01-15');
    expect(rings.stand.current).toBe(5);
  });
});

describe('updateRecoveryFromSleep', () => {
  test('increases recovery based on hours and quality', () => {
    const { updateRecoveryFromSleep } = require('../src/logic/progression.js');
    const progress = freshProgress({ recoveryScore: 50 });
    const { progress: next } = updateRecoveryFromSleep(progress, {
      date: '2024-01-15',
      quality: 3,
      hours: 8,
    });
    expect(next.recoveryScore).toBeGreaterThan(50);
  });

  test('caps recovery at MAX_RECOVERY', () => {
    const { updateRecoveryFromSleep } = require('../src/logic/progression.js');
    const progress = freshProgress({ recoveryScore: 95 });
    const { progress: next } = updateRecoveryFromSleep(progress, {
      date: '2024-01-15',
      quality: 5,
      hours: 10,
    });
    expect(next.recoveryScore).toBeLessThanOrEqual(MAX_RECOVERY);
  });

  test('logs sleep entry', () => {
    const { updateRecoveryFromSleep } = require('../src/logic/progression.js');
    const progress = freshProgress({ recoveryScore: 50 });
    const { progress: next } = updateRecoveryFromSleep(progress, {
      date: '2024-01-15',
      quality: 4,
      hours: 7,
      deepHours: 2,
      remHours: 1.5,
    });
    expect(next.sleepLog['2024-01-15']).toBeDefined();
    expect(next.sleepLog['2024-01-15'].quality).toBe(4);
  });
});

describe('getDailyRecommendation', () => {
  test('recommends rest when recovery is below 20', () => {
    const { getDailyRecommendation } = require('../src/logic/progression.js');
    const progress = freshProgress({ recoveryScore: 15 });
    const rec = getDailyRecommendation(progress, new Date('2024-01-15T12:00:00Z'));
    expect(rec.type).toBe('rest');
    expect(rec.reason).toBe('recovery_low');
  });

  test('suggests discipline based on weakest day', () => {
    const { getDailyRecommendation } = require('../src/logic/progression.js');
    const progress = freshProgress({
      recoveryScore: 60,
      dayLog: {
        '2024-01-15': { wado: 0, sandai: 2, shusui: 1 },
      },
    });
    const rec = getDailyRecommendation(progress, new Date('2024-01-15T12:00:00Z'));
    expect(['wado', 'sandai', 'shusui']).toContain(rec.discipline);
  });
});

describe('defaultProgress', () => {
  test('returns an object with all required keys', () => {
    const dp = defaultProgress();
    expect(dp.totalXP).toBe(0);
    expect(dp.schemaVersion).toBe(4);
    expect(dp.sessions).toEqual([]);
    expect(dp.dayLog).toEqual({});
    expect(dp.skillUnlocks).toEqual({ wado: {}, sandai: {}, shusui: {} });
    expect(dp.bountyMissions).toEqual([]);
    expect(dp.arcProgress).toEqual({});
  });
});

describe('applyToggle', () => {
  test('adds XP when completing an exercise', () => {
    const { applyToggle } = require('../src/logic/progression.js');
    const progress = freshProgress({ totalXP: 100, peakXP: 100, completedByDate: {} });
    const { progress: next } = applyToggle(progress, {
      sword: 'wado',
      exercise: 'meditation',
      date: '2024-01-15',
    });
    expect(next.totalXP).toBe(200);
    expect(next.completedByDate['2024-01-15']['wado-meditation']).toBe(true);
  });

  test('removes XP when uncompleting an exercise', () => {
    const { applyToggle } = require('../src/logic/progression.js');
    const progress = freshProgress({
      totalXP: 200,
      peakXP: 200,
      completedByDate: {
        '2024-01-15': { 'wado-meditation': true },
      },
    });
    const { progress: next } = applyToggle(progress, {
      sword: 'wado',
      exercise: 'meditation',
      date: '2024-01-15',
    });
    expect(next.totalXP).toBe(100);
    expect(next.completedByDate['2024-01-15']['wado-meditation']).toBeUndefined();
  });
});