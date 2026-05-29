import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions, AppState } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

const ATMOSPHERES = {
  calm: {
    name: 'calm',
    primaryLayer: 'rgba(215, 181, 107, 0.08)',
    secondaryLayer: 'rgba(167, 190, 205, 0.05)',
    accentPulse: 'rgba(215, 181, 107, 0.15)',
    fogColor: 'rgba(100, 120, 140, 0.1)',
    energyColor: '#D7B56B',
    gridOpacity: 0.03,
    particleSpeed: 0.6,
    pulseIntensity: 0.4,
  },
  storm: {
    name: 'storm',
    primaryLayer: 'rgba(240, 68, 79, 0.12)',
    secondaryLayer: 'rgba(255, 75, 88, 0.08)',
    accentPulse: 'rgba(240, 68, 79, 0.25)',
    fogColor: 'rgba(60, 20, 25, 0.2)',
    energyColor: '#F0444F',
    gridOpacity: 0.025,
    particleSpeed: 1.4,
    pulseIntensity: 0.9,
  },
  exhausted: {
    name: 'exhausted',
    primaryLayer: 'rgba(80, 60, 100, 0.15)',
    secondaryLayer: 'rgba(60, 50, 80, 0.1)',
    accentPulse: 'rgba(185, 107, 255, 0.1)',
    fogColor: 'rgba(40, 30, 60, 0.25)',
    energyColor: '#B96BFF',
    gridOpacity: 0.02,
    particleSpeed: 0.3,
    pulseIntensity: 0.2,
  },
  golden: {
    name: 'golden',
    primaryLayer: 'rgba(247, 183, 51, 0.15)',
    secondaryLayer: 'rgba(234, 138, 11, 0.1)',
    accentPulse: 'rgba(247, 183, 51, 0.3)',
    fogColor: 'rgba(120, 80, 20, 0.15)',
    energyColor: '#F7B533',
    gridOpacity: 0.04,
    particleSpeed: 0.8,
    pulseIntensity: 1.0,
  },
  mist: {
    name: 'mist',
    primaryLayer: 'rgba(167, 190, 205, 0.1)',
    secondaryLayer: 'rgba(111, 145, 168, 0.08)',
    accentPulse: 'rgba(167, 190, 205, 0.12)',
    fogColor: 'rgba(150, 170, 185, 0.2)',
    energyColor: '#A7BECD',
    gridOpacity: 0.035,
    particleSpeed: 0.4,
    pulseIntensity: 0.3,
  },
  void: {
    name: 'void',
    primaryLayer: 'rgba(20, 30, 50, 0.2)',
    secondaryLayer: 'rgba(30, 50, 80, 0.12)',
    accentPulse: 'rgba(91, 157, 255, 0.15)',
    fogColor: 'rgba(10, 15, 30, 0.3)',
    energyColor: '#5B9DFF',
    gridOpacity: 0.02,
    particleSpeed: 0.25,
    pulseIntensity: 0.5,
  },
};

export const getAtmosphere = (state) => {
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour > 18;
  const isDawn = hour >= 5 && hour < 7;
  const isDusk = hour >= 17 && hour < 19;

  if (state.burnoutLevel > 0.8) return ATMOSPHERES.exhausted;
  if (state.recovery < 30) return ATMOSPHERES.exhausted;
  if (state.streak >= 30 && state.streak % 7 === 0) return ATMOSPHERES.golden;
  if (state.streak >= 7) return ATMOSPHERES.golden;
  if (isDawn) return ATMOSPHERES.calm;
  if (isDusk) return ATMOSPHERES.mist;
  if (isNight) return ATMOSPHERES.void;
  if (state.intenseSandai) return ATMOSPHERES.storm;
  if (state.focusMode) return ATMOSPHERES.mist;
  return ATMOSPHERES.calm;
};

export const useAtmosphere = (state) => {
  return useMemo(() => getAtmosphere(state), [
    state.recovery,
    state.streak,
    state.burnoutLevel,
    state.intenseSandai,
    state.focusMode,
  ]);
};

const TonalWash = ({ atmosphere }) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000 + Math.random() * 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4000 + Math.random() * 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(pulse.value, [0, 1], [0.6, 1]);
    return {
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.tonalWash,
        { backgroundColor: atmosphere.primaryLayer },
        animatedStyle,
      ]}
    />
  );
};

const EnergyPulse = ({ atmosphere }) => {
  const pulse = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 3000 / atmosphere.pulseIntensity, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, [atmosphere.pulseIntensity]);

  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulse.value, [0, 1], [0.8, 1.2]);
    const opacity = interpolate(pulse.value, [0, 0.5, 1], [0, 0.3, 0]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.energyPulseContainer, rotationStyle]}>
      <Animated.View
        style={[
          styles.energyPulse,
          { backgroundColor: atmosphere.accentPulse },
          pulseStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.energyPulseRing,
          { borderColor: atmosphere.energyColor },
          pulseStyle,
        ]}
      />
    </Animated.View>
  );
};

const AtmosphericFog = ({ atmosphere }) => {
  const fogDrift = useSharedValue(0);
  const fogOpacity = useSharedValue(0);

  useEffect(() => {
    fogDrift.value = withRepeat(
      withTiming(1, { duration: 25000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    fogOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const fogStyle = useAnimatedStyle(() => {
    const translateX = interpolate(fogDrift.value, [0, 1], [-50, 50]);
    const opacity = fogOpacity.value * atmosphere.pulseIntensity * 0.5;
    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.fogLayer,
        { backgroundColor: atmosphere.fogColor },
        fogStyle,
      ]}
    />
  );
};

const DepthGrid = ({ atmosphere }) => {
  const gridDrift = useSharedValue(0);

  useEffect(() => {
    gridDrift.value = withRepeat(
      withTiming(1, { duration: 30000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const gridStyle = useAnimatedStyle(() => {
    const translateY = interpolate(gridDrift.value, [0, 1], [0, 10]);
    return {
      transform: [{ translateY }],
      opacity: atmosphere.gridOpacity,
    };
  });

  return (
    <Animated.View style={[styles.gridContainer, gridStyle]}>
      <View style={styles.gridRow}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[styles.gridCell, { borderColor: atmosphere.energyColor }]} />
        ))}
      </View>
      <View style={styles.gridRow}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[styles.gridCell, { borderColor: atmosphere.energyColor }]} />
        ))}
      </View>
      <View style={styles.gridRow}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[styles.gridCell, { borderColor: atmosphere.energyColor }]} />
        ))}
      </View>
    </Animated.View>
  );
};

const BladeSweep = ({ atmosphere }) => {
  const sweepPosition = useSharedValue(0);
  const sweepOpacity = useSharedValue(0);

  useEffect(() => {
    sweepPosition.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    sweepOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const sweepStyle = useAnimatedStyle(() => {
    const translateX = interpolate(sweepPosition.value, [0, 1], [-W, W]);
    const opacity = sweepOpacity.value;
    return {
      transform: [{ translateX }, { rotate: '-15deg' }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.bladeSweep,
        { backgroundColor: atmosphere.accentPulse },
        sweepStyle,
      ]}
    />
  );
};

const AdaptiveEnvironment = ({ state = {}, children }) => {
  const appState = useSharedValue(AppState.currentState);
  const isActive = useSharedValue(true);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      isActive.value = nextAppState === 'active';
    });
    return () => subscription?.remove();
  }, []);

  const atmosphere = useAtmosphere({
    recovery: state.recovery ?? 70,
    streak: state.streak ?? 0,
    burnoutLevel: state.burnoutLevel ?? 0,
    intenseSandai: state.intenseSandai ?? false,
    focusMode: state.focusMode ?? false,
  });

  return (
    <View style={styles.container}>
      <TonalWash atmosphere={atmosphere} />
      <DepthGrid atmosphere={atmosphere} />
      <BladeSweep atmosphere={atmosphere} />
      <EnergyPulse atmosphere={atmosphere} />
      <AtmosphericFog atmosphere={atmosphere} />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  tonalWash: {
    ...StyleSheet.absoluteFillObject,
  },
  gridContainer: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    opacity: 0.03,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  gridCell: {
    flex: 1,
    height: 80,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 2,
    transform: [{ perspective: 500 }, { rotateX: '60deg' }],
  },
  bladeSweep: {
    position: 'absolute',
    width: W * 0.4,
    height: H * 1.5,
    left: -W * 0.2,
    top: -H * 0.25,
    opacity: 0.15,
  },
  energyPulseContainer: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    marginLeft: -150,
    marginTop: -150,
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyPulse: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  energyPulseRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    opacity: 0.3,
  },
  fogLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
});

export default AdaptiveEnvironment;