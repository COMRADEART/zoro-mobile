import { evaluateBossCompletion, weekOfYear, defaultProgress } from '../src/logic/progression';

// mihawks-trial is a Sandai boss requiring Push-ups, Pull-ups, Squats, Sit-ups, Run.
// completedByDate keys are `${discipline}-${exerciseName}`.
const DATE = '2026-05-15';
const WEEK = weekOfYear(DATE);
const EXACT = ['sandai-Push-ups', 'sandai-Pull-ups', 'sandai-Squats', 'sandai-Sit-ups', 'sandai-Run'];

function withBoss(completedKeys) {
  const p = defaultProgress();
  p.bossChallenges = [
    { id: 'mihawks-trial', discipline: 'sandai', weekOf: WEEK, startedAt: DATE, completedAt: null, failed: false },
  ];
  p.completedByDate = { [DATE]: {} };
  for (const k of completedKeys) p.completedByDate[DATE][k] = true;
  return p;
}

describe('evaluateBossCompletion exercise matching', () => {
  test('completes when every required exercise is logged under the boss discipline', () => {
    const p = withBoss(EXACT);
    const { progress, events } = evaluateBossCompletion(p, 'mihawks-trial', DATE);
    expect(events.some(e => e.type === 'boss_completed')).toBe(true);
    expect(progress.totalXP).toBe(p.totalXP + 5000);
    expect(progress.bossChallenges[0].completedAt).toBe(DATE);
  });

  test('does NOT complete when one requirement is missing', () => {
    const p = withBoss(EXACT.slice(0, 4)); // missing sandai-Run
    const { events } = evaluateBossCompletion(p, 'mihawks-trial', DATE);
    expect(events).toEqual([]);
  });

  // Regression: a substring of the requirement from another discipline must not
  // satisfy it. "shusui-Endurance Run" used to falsely complete Sandai's "Run".
  test('does NOT complete via a cross-discipline substring match', () => {
    const p = withBoss([...EXACT.slice(0, 4), 'shusui-Endurance Run']);
    const { progress, events } = evaluateBossCompletion(p, 'mihawks-trial', DATE);
    expect(events).toEqual([]);
    expect(progress).toBe(p); // identity returned — no XP awarded
  });
});
