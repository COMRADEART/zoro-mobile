import {
  assignBountyMissions,
  evaluateBountyMissions,
  defaultProgress,
  normalizeProgress,
} from '../src/logic/progression.js';
import { BOUNTY_MISSIONS } from '../src/data/gameData.js';

const freshProgress = (overrides = {}) => normalizeProgress({ ...defaultProgress(), ...overrides });

describe('assignBountyMissions (bounty board persistence)', () => {
  test('fills an empty board with 3 active missions', () => {
    const next = assignBountyMissions(freshProgress(), '2024-01-15');
    const active = next.bountyMissions.filter(m => m.status === 'active');
    expect(active).toHaveLength(3);
    expect(active.every(m => m.assignedAt === '2024-01-15')).toBe(true);
  });

  test('is a no-op (same reference) when 3 missions are already active', () => {
    const seeded = assignBountyMissions(freshProgress(), '2024-01-15');
    expect(assignBountyMissions(seeded, '2024-01-16')).toBe(seeded);
  });

  test('preserves completed records and never re-assigns a completed mission', () => {
    const first = BOUNTY_MISSIONS[0];
    const progress = freshProgress({
      bountyMissions: [
        { id: first.id, type: first.type, status: 'completed', assignedAt: '2024-01-01', completedAt: '2024-01-08', weekOf: '2024-W01' },
      ],
    });
    const next = assignBountyMissions(progress, '2024-01-15');
    const records = next.bountyMissions.filter(m => m.id === first.id);
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe('completed');
    expect(next.bountyMissions.filter(m => m.status === 'active')).toHaveLength(3);
  });

  test('assigned missions are completable by evaluateBountyMissions (full loop)', () => {
    // 30-day wado streak satisfies every streak-style requirement in the first
    // assignment wave; the point is that at least one assigned mission can
    // actually transition to completed now that assignments persist.
    const dayLog = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date('2024-01-30T12:00:00Z');
      d.setDate(d.getDate() - i);
      dayLog[d.toISOString().slice(0, 10)] = { wado: 1, sandai: 1, shusui: 1 };
    }
    const assigned = assignBountyMissions(freshProgress({ dayLog }), '2024-01-30');
    const { progress: next } = evaluateBountyMissions(assigned, '2024-01-30');
    expect(next.bountyMissions.some(m => m.status === 'completed')).toBe(true);
    expect(next.totalXP).toBeGreaterThan(assigned.totalXP);
  });
});
