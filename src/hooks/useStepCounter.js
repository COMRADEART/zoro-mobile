import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

export default function useStepCounter() {
  const [steps, setSteps]       = useState(0);
  const [goal, setGoal]         = useState(10000);
  const [isAvailable, setAvailable] = useState(false);
  const [error, setError]      = useState(null);
  const [isPaceActive, setPaceActive] = useState(false);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!mounted) return;
        setAvailable(available);

        if (!available) {
          setError('Pedometer not available on this device');
          return;
        }

        // Android 10+ (API 29+) gates step data behind the
        // ACTIVITY_RECOGNITION runtime permission. Without this request
        // getStepCountAsync / watchStepCount silently return nothing.
        if (Platform.OS === 'android') {
          const { status } = await Pedometer.requestPermissionsAsync();
          if (!mounted) return;
          if (status !== 'granted') {
            setError('Motion & fitness permission denied');
            return;
          }
        }

        // Baseline: steps already taken today before the live subscription
        // began. getStepCountAsync is iOS-only — expo-sensors' Android module
        // throws NotSupportedException — so on Android the baseline stays 0
        // and the chip counts steps since the app opened.
        let baseline = 0;
        if (Platform.OS === 'ios') {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const result = await Pedometer.getStepCountAsync(start, new Date());
          if (!mounted) return;
          baseline = result?.steps ?? 0;
          setSteps(baseline);
        }

        // watchStepCount reports a CUMULATIVE count since subscription start
        // (CMPedometer semantics), so render baseline + latest — accumulating
        // each event would double-count every prior step.
        subscriptionRef.current = Pedometer.watchStepCount(result => {
          if (!mounted) return;
          setSteps(baseline + result.steps);
          setPaceActive(result.steps > 0);
        });
      } catch (e) {
        if (!mounted) return;
        setError(e.message || 'Step counter error');
      }
    };

    check();
    return () => {
      mounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      const { status } = await Pedometer.requestPermissionsAsync();
      return status === 'granted';
    }
    // iOS permissions are requested implicitly on first getStepCountAsync call
    const available = await Pedometer.isAvailableAsync();
    return available;
  };

  return { steps, goal, setGoal, isAvailable, error, isPaceActive, requestPermission };
}
