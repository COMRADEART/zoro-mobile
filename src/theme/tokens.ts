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
export const TXT1 = '#FBFAF8';                 // barely-warm near-white (no pure #fff)
export const TXT2 = 'rgba(255,255,255,0.66)';
export const TXT3 = 'rgba(255,255,255,0.50)';

export const SURF = 'rgba(255,255,255,0.055)';
export const SURF2 = 'rgba(255,255,255,0.10)';
export const BORD = 'rgba(255,255,255,0.10)';

export const TAB_BAR_H = 72;
export const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;

export const GOLD = '#D4A853';
export const CRIMSON = '#E52030';
export const STEEL = '#8EAABE';

// Semantic accents (replace scattered hardcoded hex across screens)
export const DANGER = '#E5503A';
export const REST = '#5B8FD4';
