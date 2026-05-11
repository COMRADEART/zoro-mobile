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
  test('wado/sandai/shusui always unlocked', () => {
    const p = defaultProgress();
    expect(THEME_UNLOCK_CONDITIONS.wado(p)).toBe(true);
    expect(THEME_UNLOCK_CONDITIONS.sandai(p)).toBe(true);
    expect(THEME_UNLOCK_CONDITIONS.shusui(p)).toBe(true);
  });

  test('hollow gated on >=1 boss defeat', () => {
    const p = defaultProgress();
    expect(THEME_UNLOCK_CONDITIONS.hollow(p)).toBe(false);
    p.bossChallenges = [{ id: 'mihawks-trial', weekOf: 'x', completedAt: '2026-01-01', failed: false }];
    expect(THEME_UNLOCK_CONDITIONS.hollow(p)).toBe(true);
  });

  test('solar gated on all 3 skill trees complete', () => {
    const p = defaultProgress();
    expect(THEME_UNLOCK_CONDITIONS.solar(p)).toBe(false);
    p.skillUnlocks = {
      wado: allSkillUnlocksFor('wado'),
      sandai: allSkillUnlocksFor('sandai'),
      shusui: allSkillUnlocksFor('shusui'),
    };
    expect(THEME_UNLOCK_CONDITIONS.solar(p)).toBe(true);
  });

  test('abyss gated on >=3 boss defeats', () => {
    const p = defaultProgress();
    expect(THEME_UNLOCK_CONDITIONS.abyss(p)).toBe(false);
    p.bossChallenges = [
      { id: 'a', weekOf: 'w1', completedAt: '2026-01-01', failed: false },
      { id: 'b', weekOf: 'w2', completedAt: '2026-01-08', failed: false },
    ];
    expect(THEME_UNLOCK_CONDITIONS.abyss(p)).toBe(false);
    p.bossChallenges.push({ id: 'c', weekOf: 'w3', completedAt: '2026-01-15', failed: false });
    expect(THEME_UNLOCK_CONDITIONS.abyss(p)).toBe(true);
  });

  test('failed bosses do not count as defeats', () => {
    const p = defaultProgress();
    p.bossChallenges = [
      { id: 'a', weekOf: 'w1', completedAt: null, failed: true },
      { id: 'b', weekOf: 'w2', completedAt: null, failed: true },
      { id: 'c', weekOf: 'w3', completedAt: null, failed: true },
    ];
    expect(countBossDefeats(p)).toBe(0);
    expect(THEME_UNLOCK_CONDITIONS.abyss(p)).toBe(false);
  });
});

describe('THEME_UNLOCK_HINTS', () => {
  test('hints provided for all locked themes', () => {
    expect(THEME_UNLOCK_HINTS.hollow).toMatch(/boss/i);
    expect(THEME_UNLOCK_HINTS.solar).toMatch(/skill/i);
    expect(THEME_UNLOCK_HINTS.abyss).toMatch(/boss/i);
  });
});

describe('getUnlockedThemes', () => {
  test('default progress has only base 3 themes', () => {
    expect(getUnlockedThemes(defaultProgress())).toEqual(['wado', 'sandai', 'shusui']);
  });

  test('one boss defeat adds hollow', () => {
    const p = defaultProgress();
    p.bossChallenges = [{ id: 'a', weekOf: 'w', completedAt: '2026-01-01', failed: false }];
    expect(getUnlockedThemes(p)).toEqual(['wado', 'sandai', 'shusui', 'hollow']);
  });

  test('three boss defeats add hollow + abyss', () => {
    const p = defaultProgress();
    p.bossChallenges = [
      { id: 'a', weekOf: 'w1', completedAt: '2026-01-01', failed: false },
      { id: 'b', weekOf: 'w2', completedAt: '2026-01-08', failed: false },
      { id: 'c', weekOf: 'w3', completedAt: '2026-01-15', failed: false },
    ];
    expect(getUnlockedThemes(p)).toEqual(['wado', 'sandai', 'shusui', 'hollow', 'abyss']);
  });

  test('full progression unlocks all 6 themes', () => {
    const p = defaultProgress();
    p.bossChallenges = [
      { id: 'a', weekOf: 'w1', completedAt: '2026-01-01', failed: false },
      { id: 'b', weekOf: 'w2', completedAt: '2026-01-08', failed: false },
      { id: 'c', weekOf: 'w3', completedAt: '2026-01-15', failed: false },
    ];
    p.skillUnlocks = {
      wado: allSkillUnlocksFor('wado'),
      sandai: allSkillUnlocksFor('sandai'),
      shusui: allSkillUnlocksFor('shusui'),
    };
    expect(getUnlockedThemes(p).sort()).toEqual(['abyss', 'hollow', 'sandai', 'shusui', 'solar', 'wado']);
  });
});

describe('checkThemeUnlocks', () => {
  test('returns nothing when progression unchanged', () => {
    const prev = defaultProgress();
    const next = { ...prev, totalXP: 100 };
    expect(checkThemeUnlocks(prev, next)).toEqual([]);
  });

  test('detects hollow unlock from first boss defeat', () => {
    const prev = defaultProgress();
    const next = { ...prev };
    next.bossChallenges = [{ id: 'a', weekOf: 'w1', completedAt: '2026-01-01', failed: false }];
    expect(checkThemeUnlocks(prev, next)).toEqual(['hollow']);
  });

  test('does not re-emit themes already in unlockedThemes', () => {
    const prev = defaultProgress();
    prev.unlockedThemes = ['wado', 'sandai', 'shusui', 'hollow'];
    const next = { ...prev };
    next.bossChallenges = [{ id: 'a', weekOf: 'w1', completedAt: '2026-01-01', failed: false }];
    expect(checkThemeUnlocks(prev, next)).toEqual([]);
  });

  test('detects multiple unlocks at once (third boss → abyss)', () => {
    const prev = defaultProgress();
    prev.unlockedThemes = ['wado', 'sandai', 'shusui', 'hollow'];
    prev.bossChallenges = [
      { id: 'a', weekOf: 'w1', completedAt: '2026-01-01', failed: false },
      { id: 'b', weekOf: 'w2', completedAt: '2026-01-08', failed: false },
    ];
    const next = {
      ...prev,
      bossChallenges: [...prev.bossChallenges, { id: 'c', weekOf: 'w3', completedAt: '2026-01-15', failed: false }],
    };
    expect(checkThemeUnlocks(prev, next)).toEqual(['abyss']);
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
