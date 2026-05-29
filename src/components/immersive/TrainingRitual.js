import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  interpolate,
  interpolateColor,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const { width: W, height: H } = Dimensions.get('window');

const RITUAL_PHASES = {
  PREPARATION: 'preparation',
  BREATHING_SYNC: 'breathing_sync',
  FOCUS_COUNTDOWN: 'focus_countdown',
  ACTIVE_EXERCISE: 'active_exercise',
  RECOVERY_REST: 'recovery_rest',
  COMPLETION_REFLECTION: 'completion_reflection',
};

const PhaseIndicator = ({ phase, totalPhases, currentPhaseIndex }) => {
  return (
    <View style={styles.phaseIndicator}>
      {Array.from({ length: totalPhases }).map((_, i) => (
        <PhaseDot
          key={i}
          index={i}
          isActive={i === currentPhaseIndex}
          isCompleted={i < currentPhaseIndex}
        />
      ))}
    </View>
  );
};

const PhaseDot = ({ index, isActive, isCompleted }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
      opacity.value = withTiming(1, { duration: 300 });
    } else if (isCompleted) {
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(0.7, { duration: 200 });
    } else {
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(0.3, { duration: 200 });
    }
  }, [isActive, isCompleted]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.phaseDot,
        isActive && styles.phaseDotActive,
        isCompleted && styles.phaseDotCompleted,
        dotStyle,
      ]}
    />
  );
};

const PreparationState = ({ recommendedIntensity, focusQuote, energyPulse }) => {
  const pulseScale = useSharedValue(1);
  const breathScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
    opacity: interpolate(breathScale.value, [1, 1.2], [0.3, 0.6]),
  }));

  return (
    <View style={styles.preparationContainer}>
      <Animated.View style={[styles.energyPulseRing, breathStyle]} />
      <Animated.View style={[styles.energyPulseRing, styles.energyPulseRing2, breathStyle]} />

      <Animated.View style={[styles.readinessContainer, pulseStyle]}>
        <Text style={styles.readinessLabel}>READY</Text>
        <View style={styles.readinessPips}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.readinessPip,
                i <= recommendedIntensity && styles.readinessPipActive,
              ]}
            />
          ))}
        </View>
      </Animated.View>

      <Text style={styles.focusQuote}>{focusQuote}</Text>

      <View style={styles.energyMeterContainer}>
        <Text style={styles.energyLabel}>ENERGY</Text>
        <View style={styles.energyMeter}>
          <Animated.View
            style={[
              styles.energyFill,
              { width: `${energyPulse}%` },
              pulseStyle,
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const BreathingSync = ({ onComplete }) => {
  const phase = useSharedValue(0);
  const orbScale = useSharedValue(1);
  const orbOpacity = useSharedValue(0.5);
  const ringScale = useSharedValue(1);
  const progress = useSharedValue(0);
  const [currentPhase, setCurrentPhase] = useState('inhale');
  const [cycleCount, setCycleCount] = useState(0);

  const PHASE_DURATION = 4000;
  const TOTAL_CYCLES = 3;

  useEffect(() => {
    const runCycle = () => {
      const inhale = () => {
        setCurrentPhase('inhale');
        orbScale.value = withTiming(1.4, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
        orbOpacity.value = withTiming(1, { duration: PHASE_DURATION / 2 });
        ringScale.value = withTiming(1.3, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
      };

      const holdIn = () => {
        setCurrentPhase('hold_in');
      };

      const exhale = () => {
        setCurrentPhase('exhale');
        orbScale.value = withTiming(1, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
        orbOpacity.value = withTiming(0.5, { duration: PHASE_DURATION / 2 });
        ringScale.value = withTiming(1, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) });
      };

      const holdOut = () => {
        setCurrentPhase('hold_out');
      };

      inhale();
      setTimeout(holdIn, PHASE_DURATION);
      setTimeout(exhale, PHASE_DURATION * 2);
      setTimeout(holdOut, PHASE_DURATION * 3);
    };

    const interval = setInterval(() => {
      setCycleCount((c) => {
        if (c >= TOTAL_CYCLES - 1) {
          clearInterval(interval);
          setTimeout(() => onComplete?.(), 500);
          return c;
        }
        runCycle();
        return c + 1;
      });
    }, PHASE_DURATION * 4);

    runCycle();

    return () => clearInterval(interval);
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
    opacity: orbOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const phaseColor = {
    inhale: '#D7B56B',
    hold_in: '#B8965A',
    exhale: '#A7BECD',
    hold_out: '#6F91A8',
  }[currentPhase] || '#D7B56B';

  const phaseText = {
    inhale: '吸う',
    hold_in: '保つ',
    exhale: '吐く',
    hold_out: '保つ',
  }[currentPhase] || '';

  return (
    <View style={styles.breathingContainer}>
      <Animated.View style={[styles.breathingOrbOuter, ringStyle]}>
        <View style={[styles.breathingOrbRing, { borderColor: phaseColor }]} />
      </Animated.View>

      <Animated.View style={[styles.breathingOrb, { backgroundColor: phaseColor }, orbStyle]}>
        <View style={styles.breathingOrbCore} />
      </Animated.View>

      <Text style={[styles.breathingPhase, { color: phaseColor }]}>{phaseText}</Text>
      <Text style={styles.breathingCount}>{cycleCount + 1}/{TOTAL_CYCLES}</Text>
    </View>
  );
};

const FocusCountdown = ({ onComplete, exercise }) => {
  const [count, setCount] = useState(3);
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 300 }),
        withTiming(1, { duration: 300 })
      ),
      -1,
      false
    );

    const interval = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setTimeout(() => onComplete?.(), 300);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  const countStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.countdownContainer}>
      <Text style={styles.exerciseLabel}>FOCUS</Text>
      <Text style={styles.exerciseName}>{exercise}</Text>
      <Animated.Text style={[styles.countdownNumber, countStyle]}>{count}</Animated.Text>
    </View>
  );
};

const ActiveExercise = ({
  exercise,
  duration,
  onComplete,
  isResting = false,
  restDuration = 30,
}) => {
  const progress = useSharedValue(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isResting) {
      setTimeLeft(restDuration);
      const interval = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(interval);
            onComplete?.();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      const totalMs = duration * 60 * 1000;
      progress.value = withTiming(1, { duration: totalMs, easing: Easing.linear });

      const interval = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(interval);
            onComplete?.();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isResting, duration, restDuration]);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <View style={[styles.activeContainer, isResting && styles.restingContainer]}>
      <Animated.View style={[styles.exerciseFocus, pulseStyle]}>
        <Text style={[styles.exerciseTitle, isResting && styles.restingText]}>
          {isResting ? 'REST' : exercise}
        </Text>
      </Animated.View>

      <Text style={[styles.timerDisplay, isResting && styles.restingTimer]}>{timeDisplay}</Text>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: isResting ? '#6B7280' : '#D7B56B' },
            progressStyle,
          ]}
        />
      </View>

      <Text style={styles.completeHint}>Complete when ready</Text>
    </View>
  );
};

const CompletionReflection = ({
  xpEarned,
  disciplineGrowth,
  sharpnessIncrease,
  sessionSummary,
  onDismiss,
}) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const xpOpacity = useSharedValue(0);
  const growthOpacity = useSharedValue(0);
  const sharpOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { tension: 50, friction: 8 });
    opacity.value = withTiming(1, { duration: 600 });

    xpOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    growthOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    sharpOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const xpStyle = useAnimatedStyle(() => ({ opacity: xpOpacity.value }));
  const growthStyle = useAnimatedStyle(() => ({ opacity: growthOpacity.value }));
  const sharpStyle = useAnimatedStyle(() => ({ opacity: sharpOpacity.value }));

  return (
    <View style={styles.completionContainer}>
      <Animated.View style={[styles.completionCard, containerStyle]}>
        <Text style={styles.victoryText}>VICTORY</Text>

        <View style={styles.metricsRow}>
          <Animated.View style={[styles.metricCard, xpStyle]}>
            <Text style={styles.metricValue}>+{xpEarned}</Text>
            <Text style={styles.metricLabel}>XP</Text>
          </Animated.View>

          <Animated.View style={[styles.metricCard, growthStyle]}>
            <Text style={styles.metricValue}>+{disciplineGrowth}%</Text>
            <Text style={styles.metricLabel}>GROWTH</Text>
          </Animated.View>

          <Animated.View style={[styles.metricCard, sharpStyle]}>
            <Text style={styles.metricValue}>+{sharpnessIncrease}</Text>
            <Text style={styles.metricLabel}>SHARPNESS</Text>
          </Animated.View>
        </View>

        <Text style={styles.summaryText}>{sessionSummary}</Text>

        <Animated.Text style={styles.continueHint}>Tap to continue</Animated.Text>
      </Animated.View>
    </View>
  );
};

const ImmersiveSession = ({
  initialPhase = RITUAL_PHASES.PREPARATION,
  exercise,
  recommendedIntensity = 2,
  focusQuote = 'Focus is the edge of the blade.',
  energyPulse = 75,
  duration = 30,
  onSessionComplete,
  onDismiss,
}) => {
  const [phase, setPhase] = useState(initialPhase);
  const [isResting, setIsResting] = useState(false);

  const handlePhaseComplete = useCallback((nextPhase) => {
    setPhase(nextPhase);
  }, []);

  const handleRestComplete = useCallback(() => {
    setIsResting(false);
    onSessionComplete?.();
  }, []);

  const handleExerciseComplete = useCallback(() => {
    setIsResting(true);
  }, []);

  const handleBreathingComplete = useCallback(() => {
    setPhase(RITUAL_PHASES.FOCUS_COUNTDOWN);
  }, []);

  const handleCountdownComplete = useCallback(() => {
    setPhase(RITUAL_PHASES.ACTIVE_EXERCISE);
  }, []);

  const phaseIndex = Object.values(RITUAL_PHASES).indexOf(phase);

  return (
    <View style={styles.immersiveContainer}>
      <StatusBar hidden />

      <PhaseIndicator
        phase={phase}
        totalPhases={6}
        currentPhaseIndex={phaseIndex}
      />

      {phase === RITUAL_PHASES.PREPARATION && (
        <PreparationState
          recommendedIntensity={recommendedIntensity}
          focusQuote={focusQuote}
          energyPulse={energyPulse}
        />
      )}

      {phase === RITUAL_PHASES.BREATHING_SYNC && (
        <BreathingSync onComplete={handleBreathingComplete} />
      )}

      {phase === RITUAL_PHASES.FOCUS_COUNTDOWN && (
        <FocusCountdown
          exercise={exercise}
          onComplete={handleCountdownComplete}
        />
      )}

      {phase === RITUAL_PHASES.ACTIVE_EXERCISE && (
        <ActiveExercise
          exercise={exercise}
          duration={duration}
          isResting={isResting}
          restDuration={30}
          onComplete={isResting ? handleRestComplete : handleExerciseComplete}
        />
      )}

      {phase === RITUAL_PHASES.COMPLETION_REFLECTION && (
        <CompletionReflection
          xpEarned={120}
          disciplineGrowth={5}
          sharpnessIncrease={3}
          sessionSummary="A solid session. Your blade grows sharper."
          onDismiss={onDismiss}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  immersiveContainer: {
    flex: 1,
    backgroundColor: '#030303',
  },
  phaseIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D7B56B',
  },
  phaseDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  phaseDotCompleted: {
    backgroundColor: '#6B7280',
  },
  preparationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyPulseRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(215, 181, 107, 0.3)',
  },
  energyPulseRing2: {
    width: 280,
    height: 280,
    borderColor: 'rgba(215, 181, 107, 0.15)',
  },
  readinessContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  readinessLabel: {
    fontSize: 14,
    letterSpacing: 8,
    color: '#6B7280',
    marginBottom: 16,
  },
  readinessPips: {
    flexDirection: 'row',
    gap: 8,
  },
  readinessPip: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1F2937',
  },
  readinessPipActive: {
    backgroundColor: '#D7B56B',
  },
  focusQuote: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 60,
    paddingHorizontal: 40,
  },
  energyMeterContainer: {
    alignItems: 'center',
    width: W * 0.6,
  },
  energyLabel: {
    fontSize: 12,
    letterSpacing: 4,
    color: '#6B7280',
    marginBottom: 12,
  },
  energyMeter: {
    width: '100%',
    height: 4,
    backgroundColor: '#1F2937',
    borderRadius: 2,
    overflow: 'hidden',
  },
  energyFill: {
    height: '100%',
    backgroundColor: '#D7B56B',
  },
  breathingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingOrbOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingOrbRing: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    borderWidth: 2,
  },
  breathingOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingOrbCore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  breathingPhase: {
    position: 'absolute',
    bottom: H * 0.25,
    fontSize: 24,
    letterSpacing: 8,
  },
  breathingCount: {
    position: 'absolute',
    bottom: H * 0.25 - 50,
    fontSize: 14,
    color: '#6B7280',
  },
  countdownContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseLabel: {
    fontSize: 14,
    letterSpacing: 8,
    color: '#6B7280',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 32,
    fontWeight: '200',
    color: '#D7B56B',
    marginBottom: 40,
  },
  countdownNumber: {
    fontSize: 140,
    fontWeight: '100',
    color: '#FFFFFF',
  },
  activeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restingContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  exerciseFocus: {
    marginBottom: 20,
  },
  exerciseTitle: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 4,
    color: '#FFFFFF',
  },
  restingText: {
    color: '#6B7280',
  },
  timerDisplay: {
    fontSize: 72,
    fontWeight: '100',
    color: '#FFFFFF',
    marginBottom: 40,
  },
  restingTimer: {
    color: '#6B7280',
  },
  progressTrack: {
    width: W * 0.7,
    height: 3,
    backgroundColor: '#1F2937',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  completeHint: {
    position: 'absolute',
    bottom: 100,
    fontSize: 12,
    color: '#4B5563',
    letterSpacing: 2,
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionCard: {
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(215, 181, 107, 0.3)',
  },
  victoryText: {
    fontSize: 48,
    fontWeight: '100',
    letterSpacing: 16,
    color: '#D7B56B',
    marginBottom: 40,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  metricCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '200',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#6B7280',
  },
  summaryText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 40,
    fontStyle: 'italic',
  },
  continueHint: {
    fontSize: 12,
    letterSpacing: 4,
    color: '#4B5563',
  },
});

export {
  ImmersiveSession,
  RITUAL_PHASES,
  PreparationState,
  BreathingSync,
  FocusCountdown,
  ActiveExercise,
  CompletionReflection,
};
export default ImmersiveSession;