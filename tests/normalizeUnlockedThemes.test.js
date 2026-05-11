import { defaultProgress, normalizeProgress } from '../src/logic/progression';

describe('normalizeProgress: unlockedThemes', () => {
  test('default progress has 3 base themes', () => {
    expect(defaultProgress().unlockedThemes).toEqual(['wado', 'sandai', 'shusui']);
  });

  test('absent unlockedThemes defaults to base 3', () => {
    const raw = { ...defaultProgress() };
    delete raw.unlockedThemes;
    const n = normalizeProgress(raw);
    expect(n.unlockedThemes).toEqual(['wado', 'sandai', 'shusui']);
  });

  test('preserves saved unlocked themes', () => {
    const raw = { ...defaultProgress(), unlockedThemes: ['wado', 'sandai', 'shusui', 'hollow', 'abyss'] };
    expect(normalizeProgress(raw).unlockedThemes).toEqual(
      expect.arrayContaining(['wado', 'sandai', 'shusui', 'hollow', 'abyss'])
    );
  });

  test('strips invalid theme keys', () => {
    const raw = { ...defaultProgress(), unlockedThemes: ['wado', 'fake-theme', 'hollow'] };
    const n = normalizeProgress(raw);
    expect(n.unlockedThemes).not.toContain('fake-theme');
    expect(n.unlockedThemes).toContain('hollow');
  });

  test('always re-adds bases if removed', () => {
    const raw = { ...defaultProgress(), unlockedThemes: ['hollow'] };
    const n = normalizeProgress(raw);
    expect(n.unlockedThemes).toEqual(expect.arrayContaining(['wado', 'sandai', 'shusui', 'hollow']));
  });

  test('non-array unlockedThemes resets to bases', () => {
    const raw = { ...defaultProgress(), unlockedThemes: 'invalid' };
    const n = normalizeProgress(raw);
    expect(n.unlockedThemes).toEqual(['wado', 'sandai', 'shusui']);
  });
});

describe('normalizeProgress: bossAttemptHistory', () => {
  test('default is empty object', () => {
    expect(defaultProgress().bossAttemptHistory).toEqual({});
  });

  test('absent bossAttemptHistory defaults to {}', () => {
    const raw = { ...defaultProgress() };
    delete raw.bossAttemptHistory;
    expect(normalizeProgress(raw).bossAttemptHistory).toEqual({});
  });

  test('valid history is preserved', () => {
    const raw = {
      ...defaultProgress(),
      bossAttemptHistory: {
        'mihawks-trial': [{ weekOf: 'W1', success: false }, { weekOf: 'W2', success: true }],
      },
    };
    expect(normalizeProgress(raw).bossAttemptHistory).toEqual({
      'mihawks-trial': [{ weekOf: 'W1', success: false }, { weekOf: 'W2', success: true }],
    });
  });

  test('malformed entries are filtered', () => {
    const raw = {
      ...defaultProgress(),
      bossAttemptHistory: {
        'boss-a': [
          { weekOf: 'W1', success: true },        // valid
          { weekOf: 'W2' },                        // missing success
          null,                                    // null
          { success: false },                      // missing weekOf
          { weekOf: 'W3', success: 'truthy' },     // success not boolean
        ],
      },
    };
    expect(normalizeProgress(raw).bossAttemptHistory['boss-a']).toEqual([
      { weekOf: 'W1', success: true },
    ]);
  });

  test('non-array history values are dropped', () => {
    const raw = {
      ...defaultProgress(),
      bossAttemptHistory: { 'boss-a': 'not an array' },
    };
    expect(normalizeProgress(raw).bossAttemptHistory).toEqual({});
  });

  test('non-object bossAttemptHistory resets to {}', () => {
    const raw = { ...defaultProgress(), bossAttemptHistory: 'invalid' };
    expect(normalizeProgress(raw).bossAttemptHistory).toEqual({});
  });

  test('caps history per boss at 50 entries', () => {
    const big = Array.from({ length: 100 }, (_, i) => ({ weekOf: `W${i}`, success: false }));
    const raw = { ...defaultProgress(), bossAttemptHistory: { 'a': big } };
    expect(normalizeProgress(raw).bossAttemptHistory['a']).toHaveLength(50);
    // Should keep the *most recent* 50 (slice(-50))
    expect(normalizeProgress(raw).bossAttemptHistory['a'][0].weekOf).toBe('W50');
  });
});
