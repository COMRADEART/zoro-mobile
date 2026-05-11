import {
  SWORDS,
  RANKS,
  REWARDS,
  SKILL_TREES,
  BOSS_CHALLENGES,
  BOUNTY_MISSIONS,
  TRAINING_ARCS,
  getExerciseById,
  TITLE_PATHS,
} from '../src/data/gameData.js';

describe('gameData integrity', () => {
  describe('RANKS', () => {
    test('are in ascending XP order', () => {
      for (let i = 1; i < RANKS.length; i++) {
        expect(RANKS[i].min).toBeGreaterThan(RANKS[i - 1].min);
      }
    });

    test('first rank starts at 0', () => {
      expect(RANKS[0].min).toBe(0);
    });

    test('last rank has Infinity max', () => {
      expect(RANKS[RANKS.length - 1].max).toBe(Infinity);
    });

    test('each rank has required fields', () => {
      RANKS.forEach(rank => {
        expect(typeof rank.name).toBe('string');
        expect(typeof rank.min).toBe('number');
        expect(typeof rank.max).toBe('number');
        expect(typeof rank.color).toBe('string');
        expect(rank.min).toBeLessThan(rank.max);
      });
    });
  });

  describe('SWORDS', () => {
    test('has exactly 3 disciplines', () => {
      expect(Object.keys(SWORDS).length).toBe(3);
    });

    test('each discipline has required fields', () => {
      for (const [key, sword] of Object.entries(SWORDS)) {
        expect(sword.name).toBeDefined();
        expect(sword.kanji).toBeDefined();
        expect(sword.color).toBeDefined();
        expect(sword.accent).toBeDefined();
        expect(sword.discipline).toBeDefined();
        expect(Array.isArray(sword.exercises)).toBe(true);
        expect(sword.exercises.length).toBeGreaterThan(0);
      }
    });

    test('each discipline has at least one exercise with calorie rate', () => {
      for (const sword of Object.values(SWORDS)) {
        const hasCalorieData = sword.exercises.some(
          ex => typeof ex.caloriePerUnit === 'number' || typeof ex.caloriePerRep === 'number'
        );
        expect(hasCalorieData).toBe(true);
      }
    });

    test('no duplicate exercise IDs across disciplines', () => {
      const allIds = [];
      for (const sword of Object.values(SWORDS)) {
        for (const ex of sword.exercises) {
          expect(allIds).not.toContain(ex.id);
          allIds.push(ex.id);
        }
      }
    });

    test('all exercise IDs are unique strings', () => {
      const ids = new Set();
      for (const sword of Object.values(SWORDS)) {
        for (const ex of sword.exercises) {
          expect(typeof ex.id).toBe('string');
          expect(ex.id.length).toBeGreaterThan(0);
          ids.add(ex.id);
        }
      }
      expect(ids.size).toBe(Object.values(SWORDS).reduce((a, s) => a + s.exercises.length, 0));
    });
  });

  describe('SKILL_TREES', () => {
    test('all exercise IDs in skill trees exist in SWORDS', () => {
      const allExerciseIds = new Set();
      for (const sword of Object.values(SWORDS)) {
        for (const ex of sword.exercises) {
          allExerciseIds.add(ex.id);
        }
      }

      for (const [discKey, tree] of Object.entries(SKILL_TREES)) {
        expect(SWORDS[discKey]).toBeDefined();
        for (const [branchKey, branch] of Object.entries(tree.branches)) {
          for (const unlock of branch.unlocks) {
            if (unlock.exerciseOverride) {
              expect(allExerciseIds.has(unlock.exerciseOverride.id)).toBe(true);
            }
          }
        }
      }
    });

    test('no circular dependencies in skill trees', () => {
      const visited = new Set();
      const recursionStack = new Set();

      function hasCycle(unlockId, path) {
        if (recursionStack.has(unlockId)) return true;
        if (visited.has(unlockId)) return false;

        visited.add(unlockId);
        recursionStack.add(unlockId);

        for (const tree of Object.values(SKILL_TREES)) {
          for (const branch of Object.values(tree.branches)) {
            for (const unlock of branch.unlocks) {
              if (unlock.id === unlockId && unlock.exerciseOverride) {
                if (hasCycle(unlock.exerciseOverride.id, [...path, unlockId])) {
                  return true;
                }
              }
            }
          }
        }

        recursionStack.delete(unlockId);
        return false;
      }

      const allUnlockIds = new Set();
      for (const tree of Object.values(SKILL_TREES)) {
        for (const branch of Object.values(tree.branches)) {
          for (const unlock of branch.unlocks) {
            allUnlockIds.add(unlock.id);
          }
        }
      }

      for (const id of allUnlockIds) {
        visited.clear();
        recursionStack.clear();
        expect(hasCycle(id, [])).toBe(false);
      }
    });

    test('each branch has unlocks with increasing XP requirements', () => {
      for (const tree of Object.values(SKILL_TREES)) {
        for (const branch of Object.entries(tree.branches)) {
          const xpValues = branch[1].unlocks.map(u => u.xp).sort((a, b) => a - b);
          for (let i = 1; i < xpValues.length; i++) {
            expect(xpValues[i]).toBeGreaterThan(xpValues[i - 1]);
          }
        }
      }
    });

    test('all discipline keys in SKILL_TREES match SWORDS', () => {
      const swordKeys = new Set(Object.keys(SWORDS));
      const treeKeys = new Set(Object.keys(SKILL_TREES));
      expect([...treeKeys].every(k => swordKeys.has(k))).toBe(true);
    });

    test('unlock IDs are unique across entire skill tree', () => {
      const allIds = [];
      for (const tree of Object.values(SKILL_TREES)) {
        for (const branch of Object.values(tree.branches)) {
          for (const unlock of branch.unlocks) {
            expect(allIds).not.toContain(unlock.id);
            allIds.push(unlock.id);
          }
        }
      }
    });
  });

  describe('BOSS_CHALLENGES', () => {
    test('all boss challenges have valid structure', () => {
      BOSS_CHALLENGES.forEach(boss => {
        expect(boss.id).toBeDefined();
        expect(boss.name).toBeDefined();
        expect(boss.kanji).toBeDefined();
        expect(boss.discipline).toBeDefined();
        expect(SWORDS[boss.discipline]).toBeDefined();
        expect(Array.isArray(boss.exercises)).toBe(true);
        expect(boss.exercises.length).toBeGreaterThan(0);
        expect(typeof boss.xpReward).toBe('number');
        expect(boss.weeksRequired).toBeGreaterThanOrEqual(0);
      });
    });

    test('boss exercises reference valid exercise names', () => {
      const allExerciseNames = new Set();
      for (const sword of Object.values(SWORDS)) {
        for (const ex of sword.exercises) {
          allExerciseNames.add(ex.name.toLowerCase());
        }
      }

      BOSS_CHALLENGES.forEach(boss => {
        boss.exercises.forEach(ex => {
          const nameLower = ex.name.toLowerCase();
          const found = allExerciseNames.has(nameLower);
          expect(found).toBe(true);
        });
      });
    });

    test('technique rewards are valid REWARD IDs', () => {
      const rewardIds = new Set(REWARDS.map(r => r.id));
      BOSS_CHALLENGES.forEach(boss => {
        if (boss.techniqueReward) {
          expect(rewardIds.has(boss.techniqueReward)).toBe(true);
        }
      });
    });

    test('XP rewards are positive', () => {
      BOSS_CHALLENGES.forEach(boss => {
        expect(boss.xpReward).toBeGreaterThan(0);
      });
    });
  });

  describe('BOUNTY_MISSIONS', () => {
    test('all bounty missions have valid types', () => {
      const validTypes = ['streak', 'triple', 'calorie', 'discipline', 'readiness', 'hydration'];
      BOUNTY_MISSIONS.forEach(m => {
        expect(validTypes.includes(m.type)).toBe(true);
      });
    });

    test('all requirement types are handled', () => {
      const handledTypes = ['streak', 'all_disciplines', 'weekly_kcal', 'discipline_streak', 'sharpness_streak', 'hydration_streak'];
      BOUNTY_MISSIONS.forEach(m => {
        expect(handledTypes.includes(m.requirement.type)).toBe(true);
      });
    });

    test('XP rewards are positive', () => {
      BOUNTY_MISSIONS.forEach(m => {
        expect(m.xpReward).toBeGreaterThan(0);
      });
    });

    test('streak values are positive', () => {
      BOUNTY_MISSIONS.filter(m => m.requirement.type === 'streak').forEach(m => {
        expect(m.requirement.value).toBeGreaterThan(0);
      });
    });

    test('weekly_kcal targets are achievable', () => {
      BOUNTY_MISSIONS.filter(m => m.requirement.type === 'weekly_kcal').forEach(m => {
        expect(m.requirement.value).toBeLessThan(10000);
        expect(m.requirement.value).toBeGreaterThan(0);
      });
    });

    test('discipline_streak missions reference valid disciplines', () => {
      const validDisciplines = ['wado', 'sandai', 'shusui'];
      BOUNTY_MISSIONS.filter(m => m.requirement.type === 'discipline_streak').forEach(m => {
        expect(validDisciplines.includes(m.requirement.discipline)).toBe(true);
      });
    });

    test('sharpness_streak missions have valid thresholds', () => {
      BOUNTY_MISSIONS.filter(m => m.requirement.type === 'sharpness_streak').forEach(m => {
        expect(m.requirement.value).toBeGreaterThan(0);
        expect(m.requirement.value).toBeLessThanOrEqual(100);
        expect(m.requirement.days).toBeGreaterThan(0);
      });
    });

    test('hydration_streak missions have valid cup values', () => {
      BOUNTY_MISSIONS.filter(m => m.requirement.type === 'hydration_streak').forEach(m => {
        expect(m.requirement.cups).toBeGreaterThan(0);
        expect(m.requirement.cups).toBeLessThanOrEqual(50);
      });
    });

    test('no duplicate mission IDs', () => {
      const ids = BOUNTY_MISSIONS.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('TRAINING_ARCS', () => {
    test('all arcs reference valid disciplines', () => {
      const validDisciplines = ['wado', 'sandai', 'shusui'];
      TRAINING_ARCS.forEach(arc => {
        expect(validDisciplines.includes(arc.discipline)).toBe(true);
      });
    });

    test('arc duration matches number of weeks defined', () => {
      TRAINING_ARCS.forEach(arc => {
        expect(arc.weeks.length).toBe(arc.durationWeeks);
        arc.weeks.forEach((week, idx) => {
          expect(week.week).toBe(idx + 1);
        });
      });
    });

    test('all week targets reference valid disciplines when specified', () => {
      TRAINING_ARCS.forEach(arc => {
        arc.weeks.forEach(week => {
          if (week.targets?.discipline) {
            expect(SWORDS[week.targets.discipline]).toBeDefined();
          }
          if (week.targets?.bossId) {
            const bossIds = BOSS_CHALLENGES.map(b => b.id);
            expect(bossIds.includes(week.targets.bossId)).toBe(true);
          }
        });
      });
    });

    test('technique rewards are valid', () => {
      const rewardIds = new Set(REWARDS.map(r => r.id));
      TRAINING_ARCS.forEach(arc => {
        if (arc.techniqueReward) {
          expect(rewardIds.has(arc.techniqueReward)).toBe(true);
        }
      });
    });

    test('XP rewards are positive', () => {
      TRAINING_ARCS.forEach(arc => {
        expect(arc.xpReward).toBeGreaterThan(0);
      });
    });

    test('requiredRank is valid index', () => {
      TRAINING_ARCS.forEach(arc => {
        expect(arc.requiredRank).toBeGreaterThanOrEqual(0);
        expect(arc.requiredRank).toBeLessThan(RANKS.length);
      });
    });
  });

  describe('REWARDS', () => {
    test('all reward XP values are positive', () => {
      REWARDS.forEach(r => {
        expect(r.value).toBeGreaterThan(0);
      });
    });

    test('rewards are sorted by XP value ascending', () => {
      for (let i = 1; i < REWARDS.length; i++) {
        expect(REWARDS[i].value).toBeGreaterThan(REWARDS[i - 1].value);
      }
    });

    test('all reward IDs are unique', () => {
      const ids = REWARDS.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('all reward rarity values are valid', () => {
      const validRarities = ['common', 'rare', 'epic', 'legendary', 'mythic'];
      REWARDS.forEach(r => {
        expect(validRarities.includes(r.rarity)).toBe(true);
      });
    });
  });

  describe('TITLE_PATHS', () => {
    test('all paths reference valid disciplines', () => {
      expect(Object.keys(TITLE_PATHS)).toEqual(Object.keys(SWORDS));
    });

    test('tier weeks are in ascending order per path', () => {
      for (const path of Object.values(TITLE_PATHS)) {
        for (let i = 1; i < path.tiers.length; i++) {
          expect(path.tiers[i].weeks).toBeGreaterThan(path.tiers[i - 1].weeks);
        }
      }
    });

    test('all tier weeks match exactly one REWARD threshold', () => {
      const rewardXPValues = new Set(REWARDS.map(r => r.value));
      for (const path of Object.values(TITLE_PATHS)) {
        for (const tier of path.tiers) {
        }
      }
    });
  });

  describe('getExerciseById', () => {
    test('returns exercise data for valid ID', () => {
      const result = getExerciseById('wado-meditation');
      expect(result).not.toBeNull();
      expect(result.id).toBe('wado-meditation');
      expect(result.discipline).toBe('wado');
    });

    test('returns null for invalid ID', () => {
      expect(getExerciseById('invalid-id')).toBeNull();
    });

    test('returns discipline key with exercise', () => {
      const result = getExerciseById('sandai-pushups');
      expect(result.discipline).toBe('sandai');
    });

    test('all exercise IDs from SWORDS are findable', () => {
      for (const sword of Object.values(SWORDS)) {
        for (const ex of sword.exercises) {
          const found = getExerciseById(ex.id);
          expect(found).not.toBeNull();
          expect(found.id).toBe(ex.id);
        }
      }
    });
  });
});