/*
 * `accent` doubles as text color, so each must clear WCAG AA (>=4.5:1 for
 * normal text) against its own `bg` — verified worst-case per theme. Sandai's
 * original #E52030 was 4.35:1 (fail); #EE3A33 is the same crimson at 5.02:1.
 * If you retune an accent, re-check it against bg before committing.
 */
export const THEMES = {
  wado:   { bg: '#0a0806', accent: '#D4A853', particle: '#D4A853', name: 'Wado · 和道',   desc: 'Zen & harmony' },
  sandai: { bg: '#0c0808', accent: '#EE3A33', particle: '#FF4444', name: 'Sandai · 鬼徹',   desc: 'Crimson power' },
  shusui: { bg: '#080a0c', accent: '#8EAABE', particle: '#5A7A94', name: 'Shusui · 秋水',   desc: 'Steel resolve' },
  hollow: { bg: '#0a0812', accent: '#A855F7', particle: '#9333EA', name: 'Hollow · 虚',    desc: 'Shadow mystery' },
  solar:  { bg: '#100c04', accent: '#F59E0B', particle: '#EA6E0B', name: 'Solar · 陽',     desc: 'Fire intensity' },
  abyss:  { bg: '#040810', accent: '#3B82F6', particle: '#2563EB', name: 'Abyss · 深淵',    desc: 'Deep focus' },
};

export const THEME_KEYS = Object.keys(THEMES);
export const DEFAULT_THEME = 'sandai';
