import { THEMES, DEFAULT_THEME } from './themes';

type BarStyle = 'light-content' | 'dark-content';

/**
 * Picks a StatusBar barStyle from a background hex via relative luminance, so a
 * future light theme automatically gets readable status-bar icons instead of a
 * hardcoded 'light-content'. Invalid input falls back to 'light-content'
 * (every shipped theme is near-black, so that is the safe default).
 */
export function statusBarStyleForBg(hex: unknown): BarStyle {
  if (typeof hex !== 'string') return 'light-content';
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 'light-content';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.5 ? 'light-content' : 'dark-content';
}

/** Resolves a theme key to its background, then delegates to the luminance core. */
export function statusBarStyleForTheme(themeKey: unknown): BarStyle {
  const key =
    typeof themeKey === 'string' && themeKey in THEMES ? themeKey : DEFAULT_THEME;
  return statusBarStyleForBg((THEMES as Record<string, { bg: string }>)[key].bg);
}
