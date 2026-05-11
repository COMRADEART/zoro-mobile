import { useEffect, useRef } from 'react';
import { saveProgress } from '../storage/progressStore';

export function useAutoTheme(progress, updateProgress) {
  const lastThemeRef = useRef(progress?.settings?.theme);
  const updateProgressRef = useRef(updateProgress);

  useEffect(() => {
    updateProgressRef.current = updateProgress;
  }, [updateProgress]);

  useEffect(() => {
    if (!progress?.settings?.autoTheme) return;

    const hour = new Date().getHours();
    const nextTheme = (hour >= 6 && hour < 18) ? 'solar' : 'abyss';
    if (progress.settings.theme !== nextTheme && progress.settings.theme !== lastThemeRef.current) {
      lastThemeRef.current = nextTheme;
      const next = { ...progress, settings: { ...progress.settings, theme: nextTheme } };
      updateProgressRef.current(next);
      saveProgress(next);
    }
  }, [progress?.settings?.autoTheme, progress?.settings?.theme, progress]);
}