import { statusBarStyleForBg, statusBarStyleForTheme } from '../src/theme/statusBar';
import { THEME_KEYS } from '../src/theme/themes';

describe('statusBarStyleForBg', () => {
  test('dark background -> light-content', () => {
    expect(statusBarStyleForBg('#000000')).toBe('light-content');
    expect(statusBarStyleForBg('#0a0806')).toBe('light-content'); // a real theme bg
  });
  test('light background -> dark-content', () => {
    expect(statusBarStyleForBg('#ffffff')).toBe('dark-content');
    expect(statusBarStyleForBg('#FAFAFA')).toBe('dark-content');
  });
  test('invalid hex falls back to the dark-app default (light-content)', () => {
    expect(statusBarStyleForBg('not-a-color')).toBe('light-content');
    expect(statusBarStyleForBg('')).toBe('light-content');
    expect(statusBarStyleForBg(undefined)).toBe('light-content');
  });
});

describe('statusBarStyleForTheme', () => {
  test('every shipped theme is dark enough for light-content', () => {
    for (const k of THEME_KEYS) {
      expect(statusBarStyleForTheme(k)).toBe('light-content');
    }
  });
  test('unknown theme falls back to light-content', () => {
    expect(statusBarStyleForTheme('does-not-exist')).toBe('light-content');
    expect(statusBarStyleForTheme(undefined)).toBe('light-content');
  });
});
