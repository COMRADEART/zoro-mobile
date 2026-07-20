import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import type { Progress, ProgressionEvent } from '../types';
import { loadProgress, saveProgress, flushSave, resetProgress, checkThemeUnlocks, DEFAULT_UNLOCKED_THEMES } from '../storage/progressStore';
import { assignBountyMissions, evaluateBountyMissions, evaluateArcWeekCompletion, evaluateBossExpiry, evaluateAllActiveBossChallenges, toDateKey } from '../logic/progression';
import { TRAINING_ARCS } from '../data/gameData';

export interface ProgressContextValue {
  progress: Progress;
  today: string;
  theme: string;
  tab: string;
  t: (key: string) => string;
  handleUpdate: (updater: Progress | ((prev: Progress) => Progress)) => void;
  handleSessionEnd: (next: Progress, events: ProgressionEvent[]) => void;
  showToast: (msg: { title: string; body: string }) => void;
  setTab: (tab: string) => void;
  onReset: () => void;
  clearPendingEvents: () => void;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressContext.Provider');
  return ctx;
}

interface ProgressProviderProps {
  children: React.ReactNode;
  toastCallback?: (msg: { title: string; body: string }) => void;
}

// Returns events separately so the caller composes _pendingEvents in one place.
function applyThemeUnlocks(prev: Progress, next: Progress): { progress: Progress; events: ProgressionEvent[] } {
  const newThemes = checkThemeUnlocks(prev, next);
  if (newThemes.length === 0) return { progress: next, events: [] };
  return {
    progress: {
      ...next,
      unlockedThemes: [...(next.unlockedThemes ?? DEFAULT_UNLOCKED_THEMES), ...newThemes],
    },
    events: newThemes.map(themeKey => ({ type: 'theme_unlocked', themeKey })),
  };
}

// Theme unlocks only depend on bossChallenges + skillUnlocks. Settings toggles
// (theme switch, sound, intensity) preserve those references — skip the work.
function unlockSignatureChanged(prev: Progress | null, next: Progress): boolean {
  if (!prev) return true;
  return prev.bossChallenges !== next.bossChallenges || prev.skillUnlocks !== next.skillUnlocks;
}

export function ProgressProvider({ children, toastCallback }: ProgressProviderProps) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [today] = useState(toDateKey());
  const [theme, setTheme] = useState('sandai');
  const [tab, setTab] = useState('home');

  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    loadProgress().then(({ progress: initial }) => {
      setProgress(initial);
      setTheme(initial.settings.theme);
    });
  }, []);

  // RN timers don't fire while suspended, so a debounced save pending when
  // the user backgrounds the app dies with the process. Flush it eagerly.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') void flushSave();
    });
    return () => sub.remove();
  }, []);

  const handleUpdate = useCallback((updater: Progress | ((prev: Progress) => Progress)) => {
    setProgress(prev => {
      const raw = typeof updater === 'function' ? updater(prev!) : updater;
      let next = raw;
      if (unlockSignatureChanged(prev, raw)) {
        const { progress: withThemes, events } = applyThemeUnlocks(prev!, raw);
        next = events.length > 0
          ? { ...withThemes, _pendingEvents: [...(withThemes._pendingEvents ?? []), ...events] }
          : withThemes;
      }
      saveProgress(next);
      if (next.settings?.theme !== prev?.settings?.theme) {
        setTheme(next.settings?.theme || 'sandai');
      }
      return next;
    });
  }, []);

  const clearPendingEvents = useCallback(() => {
    setProgress(prev => prev ? { ...prev, _pendingEvents: [] } : prev);
  }, []);

  const handleSessionEnd = useCallback((next: Progress, events: ProgressionEvent[]) => {
    const date = toDateKey(new Date());

    let finalProgress = next;
    const allEvents = [...events];

    const { progress: afterBoss, events: bossEvents } = evaluateAllActiveBossChallenges(finalProgress, date);
    finalProgress = afterBoss;
    allEvents.push(...bossEvents);

    const { progress: afterExpiry, events: expiryEvents } = evaluateBossExpiry(finalProgress, date);
    finalProgress = afterExpiry;
    allEvents.push(...expiryEvents);

    // Bounty assignments must be persisted before evaluation — the board is
    // otherwise display-only and no mission could ever complete.
    finalProgress = assignBountyMissions(finalProgress, date);
    const { progress: afterBounty, events: bountyEvents } = evaluateBountyMissions(finalProgress, date);
    finalProgress = afterBounty;
    allEvents.push(...bountyEvents);

    // Walk consecutive uncompleted weeks; stop at the first that doesn't transition.
    // Avoids re-evaluating the 7-day session window for every week of long arcs.
    for (const arc of TRAINING_ARCS) {
      if (finalProgress.arcProgress?.[arc.id]?.status !== 'active') continue;
      for (let w = 1; w <= arc.durationWeeks; w++) {
        if (finalProgress.arcProgress?.[arc.id]?.completedWeeks?.includes(w)) continue;
        const { progress: arcP, events: arcEvs } = evaluateArcWeekCompletion(finalProgress, arc.id, w, date);
        if (arcEvs.length === 0) break;
        finalProgress = arcP;
        allEvents.push(...arcEvs);
      }
    }

    const { progress: afterThemes, events: themeEvents } = applyThemeUnlocks(progressRef.current!, finalProgress);
    finalProgress = afterThemes;
    allEvents.push(...themeEvents);

    finalProgress = { ...finalProgress, _pendingEvents: allEvents };

    // A session's results are the app's most valuable write — skip the
    // debounce so backgrounding right after a workout can't lose it.
    saveProgress(finalProgress, { immediate: true });
    setProgress(finalProgress);
    if (finalProgress.settings?.theme !== progressRef.current?.settings?.theme) {
      setTheme(finalProgress.settings?.theme || 'sandai');
    }
  }, []);

  const showToast = useCallback((msg: { title: string; body: string }) => {
    if (toastCallback) toastCallback(msg);
  }, [toastCallback]);

  const onReset = useCallback(async () => {
    await resetProgress();
    const { progress: fresh } = await loadProgress();
    setProgress(fresh);
    setTheme(fresh.settings.theme);
  }, []);

  const t = useCallback((key: string): string => key, []);

  if (!progress) return null;

  const value: ProgressContextValue = {
    progress,
    today,
    theme,
    tab,
    t,
    handleUpdate,
    handleSessionEnd,
    showToast,
    setTab,
    onReset,
    clearPendingEvents,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}
