import { Platform, StatusBar } from 'react-native';

/*
 * Text color tiers. Contrast verified against the LIGHTEST theme background
 * (solar = #100c04); every other theme is darker, so these are worst-case.
 *
 *   TXT1  near-white   ~18:1   primary text, headings, numerics
 *   TXT2  white 0.66    ~7:1   secondary text + ALL labels 11-17pt   (AA)
 *   TXT3  white 0.50   ~5.3:1  tertiary / supporting, still AA >=11pt (AA)
 *
 * Rule: never set informational or interactive text below 11pt, and never
 * pair it with anything dimmer than TXT3. Hierarchy comes from size and
 * weight (see DS.type), not from fading or shrinking labels.
 */
export const TXT1 = '#F5F5F5';                 // pure-gray near-white (monochrome; no hue)
export const TXT2 = 'rgba(255,255,255,0.66)';
export const TXT3 = 'rgba(255,255,255,0.50)';

export const SURF = 'rgba(255,255,255,0.055)';
export const SURF2 = 'rgba(255,255,255,0.10)';
export const BORD = 'rgba(255,255,255,0.10)';

export const NAV_SAFE_BOTTOM = Platform.OS === 'ios' ? 22 : 14;
export const TAB_BAR_H = 96;
export const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;

// Monochrome: legacy named accents collapse to neutral grays. Kept as named
// exports so existing imports keep working; differentiation now comes from
// value, glyphs, and fill — never hue.
export const GOLD = '#E6E6E6';
export const CRIMSON = '#F2F2F2';
export const STEEL = '#9A9A9A';
