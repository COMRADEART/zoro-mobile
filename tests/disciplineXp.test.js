const {
  disciplineXPFor,
  XP_PER_EXERCISE,
  MAX_DISCIPLINE_SESSIONS_PER_DAY,
  defaultProgress,
} = require('../src/logic/progression.js');

// disciplineXPFor is the skill-tree currency. It must reward sustained training
// without letting a burst of many tiny same-day sessions farm unlocks.
describe('disciplineXPFor anti-farm cap', () => {
  test('credits honest multi-day training in full (under the daily cap)', () => {
    const p = {
      ...defaultProgress(),
      dayLog: {
        '2024-01-01': { wado: 2, sandai: 0, shusui: 0 },
        '2024-01-02': { wado: 1, sandai: 0, shusui: 0 },
      },
    };
    expect(disciplineXPFor(p, 'wado')).toBe(3 * XP_PER_EXERCISE);
  });

  test('caps a single day of many tiny sessions at the daily limit', () => {
    const p = {
      ...defaultProgress(),
      dayLog: { '2024-01-01': { wado: 30, sandai: 0, shusui: 0 } },
    };
    expect(disciplineXPFor(p, 'wado')).toBe(MAX_DISCIPLINE_SESSIONS_PER_DAY * XP_PER_EXERCISE);
  });

  test('sums the per-day cap across days', () => {
    const p = {
      ...defaultProgress(),
      dayLog: {
        '2024-01-01': { wado: 10, sandai: 0, shusui: 0 }, // capped
        '2024-01-02': { wado: 1, sandai: 0, shusui: 0 },  // +1
      },
    };
    expect(disciplineXPFor(p, 'wado')).toBe((MAX_DISCIPLINE_SESSIONS_PER_DAY + 1) * XP_PER_EXERCISE);
  });

  test('isolates disciplines from one another', () => {
    const p = {
      ...defaultProgress(),
      dayLog: { '2024-01-01': { wado: 2, sandai: 5, shusui: 0 } },
    };
    expect(disciplineXPFor(p, 'wado')).toBe(2 * XP_PER_EXERCISE);
    expect(disciplineXPFor(p, 'sandai')).toBe(MAX_DISCIPLINE_SESSIONS_PER_DAY * XP_PER_EXERCISE);
    expect(disciplineXPFor(p, 'shusui')).toBe(0);
  });
});
