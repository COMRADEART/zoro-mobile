// Proves the local-date conversion: date keys must follow the LOCAL calendar,
// not the UTC instant. Rather than depend on the host/CI timezone (Node ignores
// runtime process.env.TZ changes on some platforms, making that flaky), these
// tests feed a fake date whose LOCAL and UTC views deliberately disagree and
// assert the LOCAL view wins — a host-timezone-independent proof that toDateKey
// reads getFullYear/getMonth/getDate, never toISOString()/getUTC*.
const {
  toDateKey,
  parseDateKey,
  toHourKey,
  applySessionEnd,
  defaultProgress,
} = require('../src/logic/progression.js');

// A stand-in Date whose local getters say Jan 14 21:00 while its UTC view says
// Jan 15 05:00 — exactly the cross-midnight case that broke streaks for non-UTC
// users under the old toISOString() implementation.
const splitDate = {
  getFullYear: () => 2024,
  getMonth: () => 0, // January (0-based)
  getDate: () => 14,
  getHours: () => 21,
  getUTCFullYear: () => 2024,
  getUTCMonth: () => 0,
  getUTCDate: () => 15,
  getUTCHours: () => 5,
  toISOString: () => '2024-01-15T05:00:00.000Z',
};

describe('local date keys', () => {
  test('toDateKey uses the LOCAL calendar date, not UTC', () => {
    expect(toDateKey(splitDate)).toBe('2024-01-14');
  });

  test('toHourKey uses the LOCAL hour, not UTC', () => {
    expect(toHourKey(splitDate)).toBe('2024-01-14T21');
  });

  test('toDateKey zero-pads month and day', () => {
    const d = { getFullYear: () => 2024, getMonth: () => 8, getDate: () => 3 };
    expect(toDateKey(d)).toBe('2024-09-03');
  });

  test('parseDateKey returns local midnight and round-trips through toDateKey', () => {
    const key = '2024-03-09';
    const d = parseDateKey(key);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(9);
    expect(d.getHours()).toBe(0); // local midnight
    expect(toDateKey(d)).toBe(key);
  });

  test('applySessionEnd buckets a session under the LOCAL date of endedAt', () => {
    const endedAt = new Date(2024, 0, 14, 21, 0, 0).getTime(); // local Jan 14, 9pm
    const progress = {
      ...defaultProgress(),
      currentSession: {
        id: 'sess_tz',
        discipline: 'wado',
        startedAt: endedAt - 3600000,
        endedAt: null,
        exercises: [],
        calories: 0,
        intensity: 0,
        xpEarned: 0,
      },
    };
    const { progress: next } = applySessionEnd(progress, {
      sessionId: 'sess_tz',
      exercises: [{ id: 'wado-meditation', name: 'Meditation', amount: 10, unit: 'min' }],
      intensity: 5,
      endedAt,
    });
    expect(next.dayLog['2024-01-14']).toBeDefined();
    expect(next.dayLog['2024-01-14'].wado).toBeGreaterThan(0);
  });
});
