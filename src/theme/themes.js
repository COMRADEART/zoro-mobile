export const THEMES = {
  wado: {
    bg: '#0A0B0A',        // Sumi-iro Charcoal Black
    bg2: '#121412',
    panel: '#1A1D1A',
    accent: '#C5A059',    // Kuchiba-iro Gold (Tsuba)
    accent2: '#F3F1EC',   // Gofun-iro Shell White (Saya/Ito)
    particle: '#F3F1EC',
    wash: '#8A6D3B',      // Aged Gold
    pattern: 'seigaiha',
    name: 'Wado · 和道',
    desc: 'Calm precision (Gofun White & Gold)',
  },
  sandai: {
    bg: '#0B0808',        // Pitch Black
    bg2: '#1A0F0F',       // Deep Cinnabar Shadow
    panel: '#251414',
    accent: '#C33B32',    // Shinshu Cinnabar Red
    accent2: '#EF452A',   // Kakicho Flame Scarlet
    particle: '#EF452A',
    wash: '#5E1914',      // Shinkuu Blood Red
    pattern: 'kaen',
    name: 'Sandai · 鬼徹',
    desc: 'Crimson force (Cinnabar & Flame)',
  },
  shusui: {
    bg: '#090C0E',        // Kurogane Steel Black
    bg2: '#12181C',
    panel: '#182025',
    accent: '#4A2E80',    // Koki-murasaki Deep Purple
    accent2: '#B9A1D8',   // Shion-iro Aster Purple
    particle: '#8F77B5',
    wash: '#251C3A',      // Deep Purple Shadow
    pattern: 'kumo',
    name: 'Shusui · 秋水',
    desc: 'Steel resolve (Kurogane & Murasaki)',
  },
  hollow: {
    bg: '#0A0915',        // Shinya-iro Midnight Blue-Black
    bg2: '#131124',
    panel: '#1A182F',
    accent: '#8E6CA6',    // Fuji-murasaki Wisteria
    accent2: '#A890D3',   // Light Lavender
    particle: '#A890D3',
    wash: '#35214D',      // Deep Twilight Purple
    pattern: 'kasumi',
    name: 'Hollow · 虚',
    desc: 'Night focus (Fuji-murasaki & Lavender)',
  },
  solar: {
    bg: '#0E0803',        // Dark Amber
    bg2: '#1F1106',
    panel: '#2B1A0A',
    accent: '#B7282E',    // Akane-iro Madder Crimson
    accent2: '#E28D2B',   // Kohaku-iro Amber Gold
    particle: '#E28D2B',
    wash: '#6B1B1E',      // Dark Crimson
    pattern: 'asahi',
    name: 'Solar · 陽',
    desc: 'High output (Akane Red & Amber)',
  },
  abyss: {
    bg: '#030A12',        // Deep Ruri Indigo Black
    bg2: '#081729',
    panel: '#0E233C',
    accent: '#1B4D7E',    // Gunjo-iro Ultramarine Blue
    accent2: '#B4E0E8',   // Mizu-iro Clear Water Blue
    particle: '#B4E0E8',
    wash: '#0E2C4D',      // Submerged Blue
    pattern: 'uzumaki',
    name: 'Abyss · 深淵',
    desc: 'Deep focus (Ultramarine & Mizu)',
  },
  marimo: {
    bg: '#080C08',        // Deep Forest Moss Black
    bg2: '#0E160E',
    panel: '#152415',
    accent: '#2E7D32',    // Marimo Moss Green
    accent2: '#81C784',   // Light Moss Green
    particle: '#81C784',
    wash: '#1B5E20',      // Shadow Moss Green
    pattern: 'uzumaki',
    name: 'Marimo · 藻頭',
    desc: 'Moss head training (Moss Green & Obsidian)',
  },
};

export const THEME_KEYS = Object.keys(THEMES);
export const DEFAULT_THEME = 'sandai';
