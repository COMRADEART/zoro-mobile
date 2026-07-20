import { useEffect, useRef } from 'react';

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
      // Functional update built from the latest state — the old object-form
      // write from this parent-level effect could erase a child's same-batch
      // update (e.g. HomeScreen's sharpness log). handleUpdate persists, so
      // no direct saveProgress call is needed.
      updateProgressRef.current(prev => ({
        ...prev,
        settings: { ...prev.settings, theme: nextTheme },
      }));
    }
  }, [progress?.settings?.autoTheme, progress?.settings?.theme, progress]);
}