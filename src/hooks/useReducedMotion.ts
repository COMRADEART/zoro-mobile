import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/*
 * Tracks the OS "Reduce Motion" accessibility setting (PRODUCT.md: "Respect
 * reduced-motion"). Returns a boolean that updates live when the user toggles
 * the setting while the app is open.
 *
 * Convention for consumers: when this is true, do NOT start looping or purely
 * decorative auto-animations — render the resting/end state instead. Motion
 * that is *essential* to the task (e.g. the breath-pacing orb in
 * BreathingGuide) is exempt per WCAG 2.3.3 and should keep animating.
 */
export default function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => {
      if (mounted) setReduced(!!v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v =>
      setReduced(!!v)
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
