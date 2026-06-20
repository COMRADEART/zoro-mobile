import { useEffect, useRef } from 'react';

export function useAutoTheme(progress, updateProgress) {
  const appliedThemeRef = useRef(null);
  const updateProgressRef = useRef(updateProgress);

  useEffect(() => {
    updateProgressRef.current = updateProgress;
  }, [updateProgress]);

  useEffect(() => {
    if (!progress?.settings?.autoTheme) {
      appliedThemeRef.current = null;
      return;
    }

    const hour = new Date().getHours();
    const nextTheme = (hour >= 6 && hour < 18) ? 'white' : 'black';

    // Only update if the theme actually differs and we haven't already applied
    // this exact transition (prevents re-applying on every re-render).
    if (progress.settings.theme === nextTheme || appliedThemeRef.current === nextTheme) {
      return;
    }

    appliedThemeRef.current = nextTheme;
    updateProgressRef.current({
      ...progress,
      settings: { ...progress.settings, theme: nextTheme },
    });
  }, [progress?.settings?.autoTheme, progress?.settings?.theme, progress]);
}