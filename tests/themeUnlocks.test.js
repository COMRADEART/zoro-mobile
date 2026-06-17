import {
  THEME_UNLOCK_CONDITIONS,
  THEME_UNLOCK_HINTS,
  getUnlockedThemes,
  checkThemeUnlocks,
} from '../src/storage/progressStore';
import { defaultProgress, isSkillTreeComplete, areAllSkillTreesComplete, countBossDefeats } from '../src/logic/progression';
import { SKILL_TREES } from '../src/data/gameData';

const allSkillUnlocksFor = (discipline) => {
  const tree = SKILL_TREES[discipline];
  const out = {};
  for (const [branchKey, branch] of Object.entries(tree.branches)) {
    out[branchKey] = branch.unlocks.map((u) => u.id);
  }
  return out;
};

describe('THEME_UNLOCK_CONDITIONS', () => {
  test('black/white always unlocked', () => {
    const p = defaultProgress();
    expect(THEME_UNLOCK_CONDITIONS.black(p)).toBe(true);
    expect(THEME_UNLOCK_CONDITIONS.white(p)).toBe(true);
  });

  test('blue gated on totalXP >= 500', () => {
    const p = defaultProgress();
    expect(THEME_UNLOCK_CONDITIONS.blue(p)).toBe(false);
    p.totalXP = 500;
    expect(THEME_UNLOCK_CONDITIONS.blue(p)).toBe(true);
  });

  test('green gated on any completed training arc', () => {
    const p = defaultProgress();
    expect(THEME_UNLOCK_CONDITIONS.green(p)).toBe(false);
    p.arcProgress = { 'arc-east-blue': { status: 'completed' } };
    expect(THEME_UNLOCK_CONDITIONS.green(p)).toBe(true);
  });

  test('violet gated on totalXP >= 1500', () => {
    const p = defaultProgress();
    p.totalXP = 500;
    expect(THEME_UNLOCK_CONDITIONS.violet(p)).toBe(false);
    p.totalXP = 1500;
    expect(THEME_UNLOCK_CONDITIONS.violet(p)).toBe(true);
  });

  test('gold gated on >=3 boss defeats', () => {
    const p = defaultProgress();
    p.bossChallenges = [
      { id: 'a', weekOf: 'w1', completedAt: '2026-01-01', failed: false },
      { id: 'b', weekOf: 'w2', completedAt: '2026-01-08', failed: false },
    ];
    expect(THEME_UNLOCK_CONDITIONS.gold(p)).toBe(false);
    p.bossChallenges.push({ id: 'c', weekOf: 'w3', completedAt: '2026-01-15', failed: false });
    expect(THEME_UNLOCK_CONDITIONS.gold(p)).toBe(true);
  });

  test('failed bosses do not count as defeats', () => {
    const p = defaultProgress();
    p.bossChallenges = [
      { id: 'a', weekOf: 'w1', completedAt: null, failed: true },
      { id: 'b', weekOf: 'w2', completedAt: null, failed: true },
      { id: 'c', weekOf: 'w3', completedAt: null, failed: true },
    ];
    expect(countBossDefeats(p)).toBe(0);
    expect(THEME_UNLOCK_CONDITIONS.gold(p)).toBe(false);
  });
});

describe('THEME_UNLOCK_HINTS', () => {
  test('hints provided for all gated themes', () => {
    expect(THEME_UNLOCK_HINTS.blue).toMatch(/xp/i);
    expect(THEME_UNLOCK_HINTS.green).toMatch(/arc/i);
    expect(THEME_UNLOCK_HINTS.violet).toMatch(/xp/i);
    expect(THEME_UNLOCK_HINTS.gold).toMatch(/boss/i);
  });
});

describe('getUnlockedThemes', () => {
  test('default progress has only base 2 themes', () => {
    expect(getUnlockedThemes(defaultProgress())).toEqual(['black', 'white']);
  });

  test('500 XP adds blue', () => {
    const p = defaultProgress();
    p.totalXP = 500;
    expect(getUnlockedThemes(p)).toEqual(['black', 'white', 'blue']);
  });

  test('three boss defeats add gold', () => {
    const p = defaultProgress();
    p.bossChallenges = [
      { id: 'a', weekOf: 'w1', completedAt: '2026-01-01', failed: false },
      { id: 'b', weekOf: 'w2', completedAt: '2026-01-08', failed: false },
      { id: 'c', weekOf: 'w3', completedAt: '2026-01-15', failed: false },
    ];
    expect(getUnlockedThemes(p)).toEqual(['black', 'white', 'gold']);
  });

  test('full progression unlocks all 6 themes', () => {
    const p = defaultProgress();
    p.totalXP = 1500;
    p.bossChallenges = [
      { id: 'a', weekOf: 'w1', completedAt: '2026-01-01', failed: false },
      { id: 'b', weekOf: 'w2', completedAt: '2026-01-08', failed: false },
      { id: 'c', weekOf: 'w3', completedAt: '2026-01-15', failed: false },
    ];
    p.arcProgress = { 'arc-east-blue': { status: 'completed' } };
    expect(getUnlockedThemes(p).sort()).toEqual(['black', 'blue', 'gold', 'green', 'violet', 'white']);
  });
});

describe('checkThemeUnlocks', () => {
  test('returns nothing when progression unchanged', () => {
    const prev = defaultProgress();
    const next = { ...prev, totalXP: 100 };
    expect(checkThemeUnlocks(prev, next)).toEqual([]);
  });

  test('detects gold unlock from third boss defeat', () => {
    const prev = defaultProgress();
    const next = { ...prev };
    next.bossChallenges = [
      { id: 'a', weekOf: 'w1', completedAt: '2026-01-01', failed: false },
      { id: 'b', weekOf: 'w2', completedAt: '2026-01-08', failed: false },
      { id: 'c', weekOf: 'w3', completedAt: '2026-01-15', failed: false },
    ];
    expect(checkThemeUnlocks(prev, next)).toEqual(['gold']);
  });

  test('does not re-emit themes already in unlockedThemes', () => {
    const prev = defaultProgress();
    prev.unlockedThemes = ['black', 'white', 'gold'];
    const next = { ...prev };
    next.bossChallenges = [
      { id: 'a', weekOf: 'w1', completedAt: '2026-01-01', failed: false },
      { id: 'b', weekOf: 'w2', completedAt: '2026-01-08', failed: false },
      { id: 'c', weekOf: 'w3', completedAt: '2026-01-15', failed: false },
    ];
    expect(checkThemeUnlocks(prev, next)).toEqual([]);
  });

  test('detects multiple unlocks at once (500 XP + third boss → blue + gold)', () => {
    const prev = defaultProgress();
    prev.unlockedThemes = ['black', 'white'];
    prev.totalXP = 400;
    prev.bossChallenges = [
      { id: 'a', weekOf: 'w1', completedAt: '2026-01-01', failed: false },
      { id: 'b', weekOf: 'w2', completedAt: '2026-01-08', failed: false },
    ];
    const next = {
      ...prev,
      totalXP: 500,
      bossChallenges: [...prev.bossChallenges, { id: 'c', weekOf: 'w3', completedAt: '2026-01-15', failed: false }],
    };
    expect(checkThemeUnlocks(prev, next)).toEqual(['blue', 'gold']);
  });
});

describe('isSkillTreeComplete / areAllSkillTreesComplete', () => {
  test('default progress has no skill trees complete', () => {
    const p = defaultProgress();
    expect(isSkillTreeComplete(p, 'wado')).toBe(false);
    expect(isSkillTreeComplete(p, 'sandai')).toBe(false);
    expect(isSkillTreeComplete(p, 'shusui')).toBe(false);
    expect(areAllSkillTreesComplete(p)).toBe(false);
  });

  test('one discipline complete is not all complete', () => {
    const p = defaultProgress();
    p.skillUnlocks = { ...p.skillUnlocks, wado: allSkillUnlocksFor('wado') };
    expect(isSkillTreeComplete(p, 'wado')).toBe(true);
    expect(isSkillTreeComplete(p, 'sandai')).toBe(false);
    expect(areAllSkillTreesComplete(p)).toBe(false);
  });

  test('all three disciplines complete', () => {
    const p = defaultProgress();
    p.skillUnlocks = {
      wado: allSkillUnlocksFor('wado'),
      sandai: allSkillUnlocksFor('sandai'),
      shusui: allSkillUnlocksFor('shusui'),
    };
    expect(areAllSkillTreesComplete(p)).toBe(true);
  });

  test('partial branch unlock is not complete', () => {
    const p = defaultProgress();
    const fullWado = allSkillUnlocksFor('wado');
    // Drop one unlock from focus
    fullWado.focus = fullWado.focus.slice(0, -1);
    p.skillUnlocks = { ...p.skillUnlocks, wado: fullWado };
    expect(isSkillTreeComplete(p, 'wado')).toBe(false);
  });
});