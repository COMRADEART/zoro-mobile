import { BOSS_TIERS, resolveTier, getBossChallenge } from '../src/logic/bossTiers';

describe('BOSS_TIERS', () => {
  test('all 5 tiers present with correct shape', () => {
    expect(Object.keys(BOSS_TIERS)).toEqual(['ROOKIE', 'SUPERNOVA', 'WARLORD', 'YONKO', 'LEGEND']);
    for (const tier of Object.values(BOSS_TIERS)) {
      expect(typeof tier.xpMultiplier).toBe('number');
      expect(typeof tier.statReq).toBe('number');
      expect(tier.timeLimit === null || typeof tier.timeLimit === 'number').toBe(true);
    }
  });

  test('tier values match spec', () => {
    expect(BOSS_TIERS.ROOKIE).toEqual({ xpMultiplier: 1.0, statReq: 0, timeLimit: null });
    expect(BOSS_TIERS.SUPERNOVA).toEqual({ xpMultiplier: 1.5, statReq: 500, timeLimit: 300 });
    expect(BOSS_TIERS.WARLORD).toEqual({ xpMultiplier: 2.0, statReq: 1500, timeLimit: 180 });
    expect(BOSS_TIERS.YONKO).toEqual({ xpMultiplier: 3.0, statReq: 4000, timeLimit: 120 });
    expect(BOSS_TIERS.LEGEND).toEqual({ xpMultiplier: 5.0, statReq: 10000, timeLimit: 60 });
  });
});

describe('resolveTier', () => {
  test('0 XP → ROOKIE', () => expect(resolveTier(0).name).toBe('ROOKIE'));
  test('499 XP → ROOKIE (boundary, exclusive)', () => expect(resolveTier(499).name).toBe('ROOKIE'));
  test('500 XP → SUPERNOVA (boundary, inclusive)', () => expect(resolveTier(500).name).toBe('SUPERNOVA'));
  test('1499 XP → SUPERNOVA', () => expect(resolveTier(1499).name).toBe('SUPERNOVA'));
  test('1500 XP → WARLORD', () => expect(resolveTier(1500).name).toBe('WARLORD'));
  test('4000 XP → YONKO', () => expect(resolveTier(4000).name).toBe('YONKO'));
  test('10000 XP → LEGEND', () => expect(resolveTier(10000).name).toBe('LEGEND'));
  test('999999 XP → LEGEND (above max)', () => expect(resolveTier(999999).name).toBe('LEGEND'));
  test('negative XP → ROOKIE (defensive)', () => expect(resolveTier(-1).name).toBe('ROOKIE'));

  test('returns full tier shape including name', () => {
    const t = resolveTier(2000);
    expect(t).toEqual({ name: 'WARLORD', xpMultiplier: 2.0, statReq: 1500, timeLimit: 180 });
  });
});

describe('getBossChallenge', () => {
  const boss = {
    id: 'test-boss',
    name: 'Test Boss',
    exercises: [
      { id: 'pushups', name: 'Push-ups', reps: 100 },
      { id: 'run', name: 'Run', km: 5 },
      { id: 'plank', name: 'Plank', min: 10 },
    ],
    xpReward: 500,
  };

  test('ROOKIE tier with no failure: 1.0× scaling', () => {
    const r = getBossChallenge(boss, { totalXP: 0, lastFailed: false });
    expect(r.tier.name).toBe('ROOKIE');
    expect(r.exercises[0].reps).toBe(100);
    expect(r.exercises[1].km).toBe(5);
    expect(r.exercises[2].min).toBe(10);
    expect(r.timeLimit).toBeNull();
    expect(r.xpReward).toBe(500);
  });

  test('WARLORD tier with no failure: 2.0× scaling', () => {
    const r = getBossChallenge(boss, { totalXP: 1500, lastFailed: false });
    expect(r.tier.name).toBe('WARLORD');
    expect(r.exercises[0].reps).toBe(200);
    expect(r.exercises[1].km).toBe(10);
    expect(r.exercises[2].min).toBe(20);
    expect(r.timeLimit).toBe(180);
    expect(r.xpReward).toBe(1000);
  });

  test('WARLORD tier with lastFailed: 2.0 × 0.9 = 1.8× scaling', () => {
    const r = getBossChallenge(boss, { totalXP: 1500, lastFailed: true });
    expect(r.exercises[0].reps).toBe(180);   // round(100 * 1.8)
    expect(r.exercises[1].km).toBe(9.00);    // 5 * 1.8 = 9.00
    expect(r.exercises[2].min).toBe(18);     // round(10 * 1.8)
    // xpReward NOT reduced by failure factor — only requirements are
    expect(r.xpReward).toBe(1000);
  });

  test('LEGEND tier scales 5× and timeLimit 60s', () => {
    const r = getBossChallenge(boss, { totalXP: 50000, lastFailed: false });
    expect(r.tier.name).toBe('LEGEND');
    expect(r.exercises[0].reps).toBe(500);
    expect(r.timeLimit).toBe(60);
    expect(r.xpReward).toBe(2500);
  });

  test('preserves exercise fields not being scaled', () => {
    const bossWithExtra = { ...boss, exercises: [{ id: 'x', name: 'X', reps: 10, customField: 'keep' }] };
    const r = getBossChallenge(bossWithExtra, { totalXP: 0, lastFailed: false });
    expect(r.exercises[0].customField).toBe('keep');
    expect(r.exercises[0].id).toBe('x');
    expect(r.exercises[0].name).toBe('X');
  });

  test('exercises with no scalable field stay undefined for that field', () => {
    const bossNoReps = { ...boss, exercises: [{ id: 'p', name: 'Plank', min: 5 }] };
    const r = getBossChallenge(bossNoReps, { totalXP: 0, lastFailed: false });
    expect(r.exercises[0].reps).toBeUndefined();
    expect(r.exercises[0].km).toBeUndefined();
    expect(r.exercises[0].min).toBe(5);
  });
});
