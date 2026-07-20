import {
  getActiveBossChallenge,
  getBossBoardState,
  evaluateAllActiveBossChallenges,
  defaultProgress,
  normalizeProgress,
} from '../src/logic/progression';
import { getBossChallenge } from '../src/logic/bossTiers';
import { BOSS_CHALLENGES } from '../src/data/gameData';

const TODAY = '2026-05-15'; // Friday
const MIHAWK = BOSS_CHALLENGES.find(b => b.id === 'mihawks-trial');

// Enough completed sandai weeks to pass Mihawk's weeksRequired gate.
const eligibleProgress = (overrides = {}) =>
  normalizeProgress({
    ...defaultProgress(),
    completedWeeks: Array.from({ length: MIHAWK.weeksRequired }, (_, i) => ({
      path: 'sandai',
      weekNum: i + 1,
      completedAt: `2026-04-0${i + 1}`,
    })),
    ...overrides,
  });

// One ended session today logging the given {name: amount} map.
const sessionToday = (amounts) => ({
  id: 's1',
  discipline: 'sandai',
  startedAt: new Date(`${TODAY}T10:00:00`).getTime(),
  endedAt: new Date(`${TODAY}T11:00:00`).getTime(),
  exercises: Object.entries(amounts).map(([name, amount], i) => ({
    id: `ex${i}`, name, unit: 'reps', amount,
  })),
  calories: 500,
  intensity: 5,
  xpEarned: 0,
});

const startTrial = (progress) => {
  const { challenge, progress: withBoss } = getActiveBossChallenge(progress, TODAY);
  expect(challenge).not.toBeNull();
  return withBoss;
};

// The requirements the boss card displays for this progress state.
const scaledFor = (progress) =>
  getBossChallenge(MIHAWK, { totalXP: progress.totalXP, lastFailed: false });

const fullAmounts = (progress) => {
  const amounts = {};
  for (const ex of scaledFor(progress).exercises) {
    amounts[ex.name] = ex.reps ?? ex.km ?? ex.min;
  }
  return amounts;
};

describe('boss challenge start flow', () => {
  test('getActiveBossChallenge refuses when the weeks gate is unmet', () => {
    const { challenge } = getActiveBossChallenge(normalizeProgress(defaultProgress()), TODAY);
    expect(challenge).toBeNull();
  });

  test('start persists an active entry and the board reports it', () => {
    const withBoss = startTrial(eligibleProgress());
    expect(withBoss.bossChallenges).toHaveLength(1);
    const board = getBossBoardState(withBoss, TODAY);
    expect(board.entry?.id).toBe('mihawks-trial');
    expect(board.nextBossId).toBeNull();
  });

  test('board gates BEGIN TRIAL on completed weeks', () => {
    const fresh = getBossBoardState(normalizeProgress(defaultProgress()), TODAY);
    expect(fresh.eligible).toBe(false);
    expect(fresh.nextBossId).toBe('mihawks-trial');
    const ready = getBossBoardState(eligibleProgress(), TODAY);
    expect(ready.eligible).toBe(true);
  });
});

describe('evaluateBossCompletion via evaluateAllActiveBossChallenges', () => {
  test('completes only when logged amounts meet every scaled requirement', () => {
    let p = startTrial(eligibleProgress());
    p = { ...p, sessions: [sessionToday(fullAmounts(p))] };
    const { progress: done, events } = evaluateAllActiveBossChallenges(p, TODAY);
    expect(events.some(e => e.type === 'boss_completed')).toBe(true);
    expect(done.bossChallenges[0].completedAt).toBe(TODAY);
    // Scaled reward, not necessarily base: ROOKIE tier here, so equal to base.
    expect(done.totalXP - p.totalXP).toBe(scaledFor(p).xpReward);
  });

  test('one rep of each exercise does NOT clear the trial', () => {
    let p = startTrial(eligibleProgress());
    const oneEach = Object.fromEntries(Object.keys(fullAmounts(p)).map(n => [n, 1]));
    p = { ...p, sessions: [sessionToday(oneEach)] };
    const { events } = evaluateAllActiveBossChallenges(p, TODAY);
    expect(events).toEqual([]);
  });

  test('exact name match: similarly-named exercises give no cross credit', () => {
    let p = startTrial(eligibleProgress());
    const amounts = fullAmounts(p);
    // Log 'Endurance Run' instead of 'Run' — the old substring check
    // ('...Endurance Run'.includes('Run')) wrongly credited this.
    amounts['Endurance Run'] = amounts.Run;
    delete amounts.Run;
    p = { ...p, sessions: [sessionToday(amounts)] };
    const { events } = evaluateAllActiveBossChallenges(p, TODAY);
    expect(events).toEqual([]);
  });

  test('amounts accumulate across multiple sessions in the day', () => {
    let p = startTrial(eligibleProgress());
    const amounts = fullAmounts(p);
    const half = Object.fromEntries(Object.entries(amounts).map(([n, v]) => [n, v / 2]));
    p = { ...p, sessions: [sessionToday(half), { ...sessionToday(half), id: 's2' }] };
    const { events } = evaluateAllActiveBossChallenges(p, TODAY);
    expect(events.some(e => e.type === 'boss_completed')).toBe(true);
  });
});
