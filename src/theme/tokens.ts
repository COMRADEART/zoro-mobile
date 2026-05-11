import { Platform, StatusBar } from 'react-native';

export const SURF = 'rgba(255,255,255,0.06)';
export const SURF2 = 'rgba(255,255,255,0.10)';
export const BORD = 'rgba(255,255,255,0.10)';
export const TXT1 = '#FFFFFF';
export const TXT2 = 'rgba(255,255,255,0.55)';
export const TXT3 = 'rgba(255,255,255,0.28)';

export const TAB_BAR_H = 72;
export const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;

export const GOLD = '#D4A853';
export const CRIMSON = '#E52030';
export const STEEL = '#8EAABE';