export const BOSS_TIERS = {
  ROOKIE:    { xpMultiplier: 1.0, statReq: 0,     timeLimit: null },
  SUPERNOVA: { xpMultiplier: 1.5, statReq: 500,   timeLimit: 300 },
  WARLORD:   { xpMultiplier: 2.0, statReq: 1500,  timeLimit: 180 },
  YONKO:     { xpMultiplier: 3.0, statReq: 4000,  timeLimit: 120 },
  LEGEND:    { xpMultiplier: 5.0, statReq: 10000, timeLimit: 60  },
};

export function resolveTier(totalXP) {
  const tiers = Object.entries(BOSS_TIERS).reverse();
  for (const [name, tier] of tiers) {
    if (totalXP >= tier.statReq) return { name, ...tier };
  }
  return { name: 'ROOKIE', ...BOSS_TIERS.ROOKIE };
}

// lastFailed: boolean — true if the most recent history entry for this boss was a failure
export function getBossChallenge(boss, { totalXP, lastFailed }) {
  const tier = resolveTier(totalXP);
  const factor = tier.xpMultiplier * (lastFailed ? 0.9 : 1.0);
  const exercises = boss.exercises.map(ex => ({
    ...ex,
    reps: ex.reps != null ? Math.round(ex.reps * factor) : undefined,
    km:   ex.km   != null ? +(ex.km   * factor).toFixed(2) : undefined,
    min:  ex.min  != null ? Math.round(ex.min  * factor) : undefined,
  }));
  return {
    tier,
    exercises,
    timeLimit: tier.timeLimit,
    xpReward: Math.round(boss.xpReward * tier.xpMultiplier),
  };
}
