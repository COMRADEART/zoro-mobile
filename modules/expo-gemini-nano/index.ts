import { requireOptionalNativeModule } from 'expo-modules-core';

export type GeminiStatus = 'available' | 'unavailable' | 'downloading' | 'downloadable';

export interface GeminiNativeModule {
  /** Maps ML Kit FeatureStatus to a JS string. */
  checkStatus(): Promise<GeminiStatus>;
  /** Triggers the AICore-managed model download. */
  download(): Promise<boolean>;
  /** Free-form on-device generation (keep output short). */
  generate(prompt: string): Promise<string>;
  /** Constrained summary of `text` (<= ~60 words). */
  summarize(text: string): Promise<string>;
}

/**
 * The native module, or `null` when it is not present — which is the
 * common case: iOS, web, Jest, and any Android build without AICore or
 * the config plugin. Callers MUST treat `null` (and every rejected
 * promise) as "AI unavailable" and fall back to deterministic behavior.
 * Nothing in the app should branch on platform; it should branch on
 * this being usable, via src/services/aiService.ts.
 */
const ExpoGeminiNano = requireOptionalNativeModule<GeminiNativeModule>('ExpoGeminiNano');

export default ExpoGeminiNano;
