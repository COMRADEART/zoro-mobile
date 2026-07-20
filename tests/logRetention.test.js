import { normalizeProgress, defaultProgress, LOG_RETENTION_DATES } from '../src/logic/progression.js';

const datesBack = (n, make) => {
  const log = {};
  for (let i = 0; i < n; i++) {
    const d = new Date('2026-05-15T12:00:00Z');
    d.setDate(d.getDate() - i);
    log[d.toISOString().slice(0, 10)] = make(i);
  }
  return log;
};

describe('per-date log retention', () => {
  test('logs over the cap keep only the most recent dates', () => {
    const n = LOG_RETENTION_DATES + 100;
    const p = normalizeProgress({
      ...defaultProgress(),
      swordSharpnessLog: datesBack(n, () => 80),
      stepLog: datesBack(n, () => ({ steps: 1000 })),
    });
    expect(Object.keys(p.swordSharpnessLog)).toHaveLength(LOG_RETENTION_DATES);
    expect(Object.keys(p.stepLog)).toHaveLength(LOG_RETENTION_DATES);
    // Most recent survives, oldest is dropped.
    expect(p.swordSharpnessLog['2026-05-15']).toBe(80);
    const oldest = new Date('2026-05-15T12:00:00Z');
    oldest.setDate(oldest.getDate() - (n - 1));
    expect(p.swordSharpnessLog[oldest.toISOString().slice(0, 10)]).toBeUndefined();
  });

  test('logs under the cap are untouched', () => {
    const p = normalizeProgress({
      ...defaultProgress(),
      moodLog: datesBack(30, () => ({ mood: 4, energy: 3 })),
    });
    expect(Object.keys(p.moodLog)).toHaveLength(30);
  });

  test('dayLog is exempt — it is skill-tree spend currency', () => {
    const n = LOG_RETENTION_DATES + 200;
    const p = normalizeProgress({
      ...defaultProgress(),
      dayLog: datesBack(n, () => ({ wado: 1, sandai: 0, shusui: 0 })),
    });
    expect(Object.keys(p.dayLog)).toHaveLength(n);
  });
});
