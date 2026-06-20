export interface ThemeTokens {
  bg: string;
  bg2: string;
  panel: string;
  accent: string;
  accent2: string;
  particle: string;
  wash: string;
  name: string;
  desc: string;
}

export const THEMES: Record<string, ThemeTokens> = {
  // Paper-first palette: each theme has a perceptibly distinct `bg` so the
  // user actually sees the change on switch. Pure grayscale for black/white;
  // desaturated tints for blue/green/violet/gold (low chroma so the tints
  // read as paper warmth/coolness, not as saturated color).
  black: {
    bg: '#000000',
    bg2: '#0A0A0A',
    panel: '#141414',
    accent: '#E8E8E8',
    accent2: '#FFFFFF',
    particle: '#D4D4D4',
    wash: '#1A1A1A',
    name: 'Black · 黒',
    desc: 'Free — ink and bone',
  },
  white: {
    bg: '#1A1A1A',
    bg2: '#222222',
    panel: '#2C2C2C',
    accent: '#FFFFFF',
    accent2: '#F0F0F0',
    particle: '#F5F5F5',
    wash: '#2A2A2A',
    name: 'White · 白',
    desc: 'Free — pure chalk',
  },
  blue: {
    bg: '#0B1426',
    bg2: '#0F1A30',
    panel: '#16243E',
    accent: '#A8C5E8',
    accent2: '#C8D8EC',
    particle: '#7E9CC4',
    wash: '#1B2A44',
    name: 'Blue · 青',
    desc: 'Unlock at 500 XP',
  },
  green: {
    bg: '#0E1A14',
    bg2: '#13221A',
    panel: '#1B2D24',
    accent: '#B8D4C2',
    accent2: '#CFE2D4',
    particle: '#8FB09A',
    wash: '#1F2E26',
    name: 'Green · 緑',
    desc: 'Unlock after any arc',
  },
  violet: {
    bg: '#1A1024',
    bg2: '#22142E',
    panel: '#2C1E3A',
    accent: '#D2B8DE',
    accent2: '#E0CCEA',
    particle: '#A88FBE',
    wash: '#2A1E36',
    name: 'Violet · 紫',
    desc: 'Unlock at 1500 XP',
  },
  gold: {
    bg: '#1F1A10',
    bg2: '#2A2418',
    panel: '#36301F',
    accent: '#E0D2A2',
    accent2: '#EFE0B8',
    particle: '#C8B47A',
    wash: '#2E2818',
    name: 'Gold · 金',
    desc: 'Unlock after 3 boss defeats',
  },
};

export const THEME_KEYS: string[] = Object.keys(THEMES);
export const DEFAULT_THEME = 'black';