import { useMemo, useCallback } from 'react';
import { useProgress } from '../context/ProgressContext';
import { getAtmosphere } from '../components/immersive/AdaptiveEnvironment';
import { currentStreak, computeSwordSharpness, rankIndexFor, getReadinessLevel } from '../logic/progression';
import { RANKS } from '../data/gameData';
import { toDateKey } from '../logic/progression';

const useAdaptiveEnvironment = () => {
  const { progress, today } = useProgress();

  const environmentState = useMemo(() => {
    if (!progress) {
      return {
        recovery: 70,
        streak: 0,
        burnoutLevel: 0,
        intenseSandai: false,
        focusMode: false,
        sharpness: 50,
        rank: 'ozaringu',
        timeOfDay: 'day',
        isNight: false,
        isDawn: false,
        isDusk: false,
      };
    }

    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 18;
    const isDawn = hour >= 5 && hour < 7;
    const isDusk = hour >= 17 && hour < 19;

    const streak = currentStreak(progress, today);
    const sharpness = computeSwordSharpness(progress, today);
    const rankIdx = rankIndexFor(progress.totalXP);
    const rank = RANKS[rankIdx]?.name || 'ozaringu';
    const readiness = getReadinessLevel(progress);
    const recovery = progress.recoveryScore ?? 70;

    const burnoutLevel = Math.max(0, 1 - (recovery / 100));

    const intenseSandai = progress.activeSword === 'sandai' &&
      (progress.dayLog?.[today]?.sandai?.calories ?? 0) > 300;

    const focusMode = progress.dayLog?.[today]?.sessions > 0 &&
      (progress.dayLog?.[today]?.sessions < 3);

    return {
      recovery,
      streak,
      burnoutLevel,
      intenseSandai,
      focusMode,
      sharpness,
      rank,
      timeOfDay: isNight ? 'night' : isDawn ? 'dawn' : isDusk ? 'dusk' : 'day',
      isNight,
      isDawn,
      isDusk,
    };
  }, [progress, today]);

  const atmosphere = useMemo(() => {
    return getAtmosphere(environmentState);
  }, [environmentState]);

  const isGoldenHour = useMemo(() => {
    return environmentState.streak >= 7;
  }, [environmentState.streak]);

  const isStormMode = useMemo(() => {
    return environmentState.intenseSandai || environmentState.burnoutLevel > 0.6;
  }, [environmentState]);

  const isMisty = useMemo(() => {
    return environmentState.focusMode || environmentState.isDusk;
  }, [environmentState]);

  const isVoid = useMemo(() => {
    return environmentState.isNight && environmentState.streak < 7;
  }, [environmentState]);

  const particleIntensity = useMemo(() => {
    if (environmentState.burnoutLevel > 0.5) return 0.5;
    if (environmentState.streak >= 30) return 1.5;
    if (environmentState.streak >= 7) return 1.2;
    return 1.0;
  }, [environmentState.streak, environmentState.burnoutLevel]);

  return {
    state: environmentState,
    atmosphere,
    isGoldenHour,
    isStormMode,
    isMisty,
    isVoid,
    particleIntensity,
  };
};

export { useAdaptiveEnvironment };
export default useAdaptiveEnvironment;