import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultProgress, normalizeProgress } from '../../logic/progression';
import type { Progress } from '../../types';
import type { IProgressRepository } from '../../domain/repositories/IProgressRepository';

const KEY_V4 = 'santoryu:progress:v4';
const KEY_V3 = 'santoryu:progress:v3';

function migrateV3ToV4(v3: Record<string, unknown>): Progress {
  return normalizeProgress({
    ...v3,
    schemaVersion: 4,
    hydrationLog: {},
    foodLog: {},
    bodyComposition: {
      bodyFatPct: null,
      muscleMassPct: null,
      chest: null,
      waist: null,
      hips: null,
      arms: null,
      thighs: null,
      unit: 'cm',
    },
    breathingLog: {},
    arcProgress: {},
    bountyMissions: [],
    swordSharpnessLog: {},
    dreamArchetypeLog: {},
    voyageChronicles: [],
  });
}

export class AsyncStorageProgressRepository implements IProgressRepository {
  async load(): Promise<Progress> {
    try {
      const raw4 = await AsyncStorage.getItem(KEY_V4);
      if (raw4) return normalizeProgress(JSON.parse(raw4));

      const raw3 = await AsyncStorage.getItem(KEY_V3);
      if (raw3) {
        const migrated = migrateV3ToV4(JSON.parse(raw3));
        await AsyncStorage.setItem(KEY_V4, JSON.stringify(migrated));
        await AsyncStorage.removeItem(KEY_V3);
        return normalizeProgress(migrated);
      }

      return defaultProgress();
    } catch {
      return defaultProgress();
    }
  }

  async save(progress: Progress): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY_V4, JSON.stringify(progress));
    } catch (e) {
      console.error('[AsyncStorageProgressRepository] Failed to save:', e);
    }
  }

  async reset(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([KEY_V4, KEY_V3]);
    } catch (e) {
      console.error('[AsyncStorageProgressRepository] Failed to reset:', e);
    }
  }
}