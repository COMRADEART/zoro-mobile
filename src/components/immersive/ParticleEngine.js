import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, AppState } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

const PARTICLE_COUNT_BASE = 24;
const PARTICLE_COUNT_INTENSE = 48;

const createParticle = (index, atmosphere, isEvent = false) => {
  const baseSpeed = isEvent ? 180 : 80;
  const speedVariance = isEvent ? 120 : 60;

  return {
    id: index,
    initialX: Math.random() * W,
    initialY: H + (Math.random() * 100),
    size: isEvent ? 2 + Math.random() * 4 : 1 + Math.random() * 3,
    speed: baseSpeed + Math.random() * speedVariance * atmosphere.particleSpeed,
    drift: (Math.random() - 0.5) * 60,
    opacity: isEvent ? 0.6 + Math.random() * 0.4 : 0.08 + Math.random() * 0.18,
    delay: Math.random() * 5000,
    cycleDuration: isEvent ? 3000 + Math.random() * 2000 : 6000 + Math.random() * 10000,
    shape: isEvent
      ? (Math.random() > 0.5 ? 'circle' : 'diamond')
      : (Math.random() > 0.85 ? 'diamond' : 'circle'),
    trail: isEvent ? 3 + Math.random() * 4 : 0,
    glow: isEvent,
    pulse: isEvent || Math.random() > 0.7,
    rotationSpeed: (Math.random() - 0.5) * 2,
  };
};

const SingleParticle = ({ particle, atmosphere, isActive, onComplete }) => {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (!isActive) {
      progress.value = 0;
      opacity.value = 0;
      return;
    }

    opacity.value = withDelay(
      particle.delay,
      withTiming(particle.opacity, { duration: 800, easing: Easing.out(Easing.ease) })
    );

    progress.value = withDelay(
      particle.delay,
      withTiming(1, {
        duration: particle.cycleDuration,
        easing: Easing.inOut(Easing.ease),
      })
    );

    if (particle.rotationSpeed !== 0) {
      rotation.value = withDelay(
        particle.delay,
        withRepeat(
          withTiming(360 * Math.sign(particle.rotationSpeed), {
            duration: Math.abs(4000 / particle.rotationSpeed),
            easing: Easing.linear,
          }),
          -1,
          false
        )
      );
    }

    if (particle.pulse) {
      const pulseDuration = 1500 + Math.random() * 1000;
      pulseScale.value = withDelay(
        particle.delay,
        withRepeat(
          withSequence(
            withTiming(1.3, { duration: pulseDuration / 2, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: pulseDuration / 2, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
    }
  }, [isActive, particle, atmosphere]);

  const animatedStyle = useAnimatedStyle(() => {
    const y = interpolate(progress.value, [0, 1], [particle.initialY, -100]);
    const x = particle.initialX + Math.sin(progress.value * Math.PI * 2) * particle.drift;

    const scale = pulseScale.value;
    const rot = particle.rotationSpeed !== 0 ? rotation.value : 0;

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rot}deg` },
        { scale },
      ],
      opacity: opacity.value,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    if (!particle.glow) return { opacity: 0 };
    const glowOpacity = interpolate(pulseScale.value, [1, 1.3], [0.3, 0.7]);
    return { opacity: glowOpacity * opacity.value };
  });

  const size = particle.size;
  const color = atmosphere.energyColor;

  return (
    <Animated.View style={[styles.particleContainer, animatedStyle]}>
      {particle.glow && (
        <Animated.View
          style={[
            styles.particleGlow,
            {
              width: size * 4,
              height: size * 4,
              borderRadius: size * 2,
              backgroundColor: color,
            },
            glowStyle,
          ]}
        />
      )}
      {particle.shape === 'diamond' ? (
        <View
          style={[
            styles.particleDiamond,
            {
              width: size,
              height: size,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.particleCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
          ]}
        />
      )}
      {particle.trail > 0 && (
        <ParticleTrail count={particle.trail} color={color} size={size} progress={progress} />
      )}
    </Animated.View>
  );
};

const ParticleTrail = ({ count, color, size, progress }) => {
  return (
    <View style={styles.trailContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <TrailSegment
          key={i}
          index={i}
          total={count}
          color={color}
          size={size}
          progress={progress}
        />
      ))}
    </View>
  );
};

const TrailSegment = ({ index, total, color, size, progress }) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = (index / total) * 300;
    opacity.value = withDelay(
      delay,
      withTiming(0.3 - (index / total) * 0.25, { duration: 200 })
    );
  }, [index, total]);

  const trailStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: 1 - (index / total) * 0.5 }],
  }));

  return (
    <Animated.View
      style={[
        styles.trailSegment,
        {
          width: size * (1 - index / total * 0.5),
          height: size * (1 - index / total * 0.5),
          borderRadius: size / 2,
          backgroundColor: color,
          marginLeft: -(size * 0.3 * (index + 1)),
        },
        trailStyle,
      ]}
    />
  );
};

const BurstEmitter = ({ x, y, color, particleCount = 30 }) => {
  const burstProgress = useSharedValue(0);

  useEffect(() => {
    burstProgress.value = 0;
    burstProgress.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, []);

  return (
    <View style={[styles.burstContainer, { left: x, top: y }]}>
      {Array.from({ length: particleCount }).map((_, i) => (
        <BurstParticle
          key={i}
          index={i}
          total={particleCount}
          color={color}
          progress={burstProgress}
        />
      ))}
    </View>
  );
};

const BurstParticle = ({ index, total, color, progress }) => {
  const angle = (index / total) * Math.PI * 2;
  const distance = 80 + Math.random() * 60;
  const targetX = Math.cos(angle) * distance;
  const targetY = Math.sin(angle) * distance;

  const animatedStyle = useAnimatedStyle(() => {
    const p = interpolate(progress.value, [0, 1], [0, 1]);
    const opacity = interpolate(progress.value, [0.7, 1], [1, 0]);
    const scale = interpolate(progress.value, [0, 0.5, 1], [0, 1.5, 0.3]);

    return {
      transform: [
        { translateX: targetX * p },
        { translateY: targetY * p },
        { scale },
      ],
      opacity,
    };
  });

  const size = 2 + Math.random() * 3;

  return (
    <Animated.View
      style={[
        styles.burstParticle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

const ParticleEngine = ({
  atmosphere = {},
  burstEvents = [],
  onBurstComplete,
  showTrails = true,
  countMultiplier = 1,
  isActive: isActiveProp = true,
}) => {
  const appState = useSharedValue(AppState.currentState);
  const isActive = useSharedValue(true);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      isActive.value = nextAppState === 'active';
    });
    return () => subscription?.remove();
  }, []);

  const count = Math.floor(
    (atmosphere.particleSpeed > 1 ? PARTICLE_COUNT_INTENSE : PARTICLE_COUNT_BASE) * countMultiplier
  );

  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) =>
      createParticle(i, atmosphere, false)
    );
  }, [count, atmosphere]);

  const eventParticles = useMemo(() => {
    return burstEvents.map((event, i) => ({
      ...event,
      particles: Array.from({ length: event.count || 20 }).map((_, j) =>
        createParticle(j, atmosphere, true)
      ),
    }));
  }, [burstEvents, atmosphere]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <SingleParticle
          key={particle.id}
          particle={particle}
          atmosphere={atmosphere}
          isActive={isActiveProp && isActive.value}
        />
      ))}

      {eventParticles.map((event, i) => (
        <BurstEmitter
          key={`burst-${i}`}
          x={event.x || W / 2}
          y={event.y || H / 2}
          color={event.color || atmosphere.energyColor}
          particleCount={event.count || 20}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleCircle: {},
  particleDiamond: {},
  particleGlow: {
    position: 'absolute',
    opacity: 0.3,
  },
  trailContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  trailSegment: {},
  burstContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstParticle: {},
});

export default ParticleEngine;
export { BurstEmitter, createParticle };