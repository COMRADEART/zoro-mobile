import { useCallback } from 'react';
import { evaluateBountyMissions, evaluateArcWeekCompletion, toDateKey } from '../logic/progression';
import { TRAINING_ARCS } from '../data/gameData';

export function useSessionEvaluator() {
  const evaluateSession = useCallback((next, events) => {
    const date = toDateKey(new Date());

    const { progress: afterBounty, events: bountyEvents } = evaluateBountyMissions(next, date);
    let finalProgress = afterBounty;
    const allEvents = [...events, ...bountyEvents];

    for (const arc of TRAINING_ARCS) {
      if (finalProgress.arcProgress?.[arc.id]?.status === 'active') {
        const maxWeek = arc.durationWeeks;
        for (let w = 1; w <= maxWeek; w++) {
          const { progress: arcP, events: arcEvs } = evaluateArcWeekCompletion(finalProgress, arc.id, w, date);
          finalProgress = arcP;
          allEvents.push(...arcEvs);
        }
      }
    }

    return { finalProgress, allEvents };
  }, []);

  return { evaluateSession };
}