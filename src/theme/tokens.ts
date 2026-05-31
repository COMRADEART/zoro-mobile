import { Platform, StatusBar } from 'react-native';

export const SURF = 'rgba(255,255,255,0.06)';
export const SURF2 = 'rgba(255,255,255,0.10)';
export const BORD = 'rgba(255,255,255,0.10)';
export const TXT1 = '#F5F5F5';
export const TXT2 = 'rgba(255,255,255,0.68)';
export const TXT3 = 'rgba(255,255,255,0.44)';

export const NAV_SAFE_BOTTOM = Platform.OS === 'ios' ? 22 : 14;
export const TAB_BAR_H = 96;
export const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;

// Monochrome: legacy named accents collapse to neutral grays. Kept as named
// exports so existing imports keep working; differentiation now comes from
// value, glyphs, and fill — never hue.
export const GOLD = '#E6E6E6';
export const CRIMSON = '#F2F2F2';
export const STEEL = '#9A9A9A';
