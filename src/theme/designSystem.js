import { Platform } from 'react-native';

export const DS = {
  space: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  radius: {
    sm: 4,
    md: 8,
    lg: 10,
    xl: 12,
    full: 9999,
  },

  font: {
    display: Platform.select({ ios: 'Georgia', android: 'serif' }),
    body: Platform.select({ ios: 'System', android: 'sans-serif' }),
    mono: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    weight: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
  },

  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
    display: 48,
  },

  letterSpacing: {
    tight: 0,
    normal: 0,
    wide: 1,
    wider: 2,
    widest: 4,
  },

  motion: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 400,
    slower: 600,
    spring: {
      gentle: { damping: 20, stiffness: 100, mass: 0.8 },
      snappy: { damping: 25, stiffness: 200, mass: 0.6 },
      bouncy: { damping: 12, stiffness: 180, mass: 0.9 },
      stiff: { damping: 30, stiffness: 350, mass: 0.5 },
    },
  },

  glow: {
    sm: { blur: 8, opacity: 0.3, offset: { x: 0, y: 2 } },
    md: { blur: 16, opacity: 0.4, offset: { x: 0, y: 4 } },
    lg: { blur: 24, opacity: 0.5, offset: { x: 0, y: 8 } },
    xl: { blur: 40, opacity: 0.6, offset: { x: 0, y: 12 } },
  },

  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.35,
      shadowRadius: 32,
      elevation: 20,
    },
    glow: (color) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 12,
      elevation: 8,
    }),
  },

  divider: {
    subtle: 'rgba(255,255,255,0.04)',
    medium: 'rgba(255,255,255,0.08)',
    strong: 'rgba(255,255,255,0.14)',
  },

  glass: {
    surface: 'rgba(255,255,255,0.06)',
    surfaceHover: 'rgba(255,255,255,0.08)',
    surfaceActive: 'rgba(255,255,255,0.10)',
    border: 'rgba(255,255,255,0.10)',
    borderStrong: 'rgba(255,255,255,0.18)',
  },

  ink: {
    light: 'rgba(0,0,0,0.04)',
    medium: 'rgba(0,0,0,0.08)',
    dark: 'rgba(0,0,0,0.16)',
  },

  hitSlop: { top: 12, bottom: 12, left: 12, right: 12 },

  fontSizeKanji: {
    badge: 12,
    label: 14,
    section: 16,
  },
};

/*
 * Typography presets — the single source of legible text styles.
 *
 * LEGIBILITY FLOOR: no informational or interactive text below 11pt. Old
 * code used 6-9pt uppercase labels at letterSpacing 3-6; that is the primary
 * thing this system replaces. Hierarchy is scale + weight, not shrink + fade.
 *
 * Pair these with the TXT* colors in tokens.ts (TXT2 for labels/secondary,
 * TXT3 only for genuinely tertiary support text; both clear WCAG AA at >=11pt
 * on every theme background).
 *
 * `display` presets use the serif (Georgia / serif) for hero numerics and
 * titles — the editorial, "honed and resolute" voice the product calls for.
 * Everything else stays in the system sans.
 */
const F = DS.font;
DS.type = {
  // Eyebrow / section labels. Replaces every 7-9pt uppercase micro-label.
  label: { fontSize: 12, fontWeight: F.weight.bold, letterSpacing: 1.2 },
  // Tab bar + the very smallest supporting captions. Hard floor.
  micro: { fontSize: 11, fontWeight: F.weight.semibold, letterSpacing: 0.6 },
  // Screen titles (was 9pt/ls5). Still characterful, now readable.
  screenTitle: { fontSize: 13, fontWeight: F.weight.extrabold, letterSpacing: 2.5 },
  cardTitle: { fontSize: 16, fontWeight: F.weight.bold, letterSpacing: 0.2 },
  body: { fontSize: 15, fontWeight: F.weight.regular, lineHeight: 22 },
  bodySm: { fontSize: 13, fontWeight: F.weight.regular, lineHeight: 19 },
  caption: { fontSize: 12, fontWeight: F.weight.medium, letterSpacing: 0.2 },
  // Editorial serif voice.
  displayHero: { fontFamily: F.display, fontSize: 56, fontWeight: F.weight.bold, letterSpacing: -1 },
  displayLg: { fontFamily: F.display, fontSize: 34, fontWeight: F.weight.bold, letterSpacing: -0.5 },
  displayMd: { fontFamily: F.display, fontSize: 24, fontWeight: F.weight.bold, letterSpacing: -0.3 },
  // Tabular numerics for timers / counters.
  numeric: { fontVariant: ['tabular-nums'], fontWeight: F.weight.black, letterSpacing: -1 },
};
