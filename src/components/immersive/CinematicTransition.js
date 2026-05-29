import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

const TRANSITION_DURATION = 450;
const SLASH_DURATION = 350;

const SwordSlash = ({ direction = 'horizontal', color = '#D7B56B', onComplete }) => {
  const slashProgress = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: SLASH_DURATION - 100 })
    );
    slashProgress.value = withTiming(1, {
      duration: SLASH_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const slashStyle = useAnimatedStyle(() => {
    const progress = slashProgress.value;
    const isHorizontal = direction === 'horizontal';

    const translateX = isHorizontal ? interpolate(progress, [0, 1], [-W, W * 1.5]) : 0;
    const translateY = !isHorizontal ? interpolate(progress, [0, 1], [-H, H * 1.5]) : 0;

    const scaleX = isHorizontal ? interpolate(progress, [0, 0.3, 1], [0.1, 1.8, 2]) : 1;
    const scaleY = !isHorizontal ? interpolate(progress, [0, 0.3, 1], [0.1, 1.8, 2]) : 1;

    const opacity = interpolate(progress, [0, 0.1, 0.8, 1], [0, 1, 1, 0]);

    return {
      transform: [
        { translateX },
        { translateY },
        { scaleX },
        { scaleY },
        { rotate: isHorizontal ? '-15deg' : '75deg' },
      ],
      opacity,
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.5,
  }));

  return (
    <View style={styles.slashContainer} pointerEvents="none">
      <Animated.View
        style={[
          styles.slashGlow,
          { backgroundColor: color },
          glowStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.slash,
          { backgroundColor: color },
          slashStyle,
        ]}
      />
    </View>
  );
};

const InkWipe = ({ direction = 'left', color = '#0a0a0f', progress, isActive }) => {
  const wipeProgress = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      wipeProgress.value = withTiming(1, {
        duration: TRANSITION_DURATION,
        easing: Easing.inOut(Easing.cubic),
      });
    } else {
      wipeProgress.value = withTiming(0, { duration: 0 });
    }
  }, [isActive]);

  const wipeStyle = useAnimatedStyle(() => {
    const p = wipeProgress.value;
    const isLeft = direction === 'left';

    return {
      transform: [
        {
          translateX: isLeft
            ? interpolate(p, [0, 1], [-W, 0])
            : interpolate(p, [0, 1], [W, 0]),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.inkWipe,
        { backgroundColor: color },
        wipeStyle,
      ]}
      pointerEvents="none"
    />
  );
};

const DepthLayer = ({ depth = 0, children }) => {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const parallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * (depth * 0.3) }],
  }));

  return <Animated.View style={[styles.depthLayer, parallaxStyle]}>{children}</Animated.View>;
};

const LayeredTransition = ({
  isEntering = true,
  direction = 'forward',
  children,
  onTransitionComplete,
}) => {
  const layer0Progress = useSharedValue(isEntering ? 0 : 1);
  const layer1Progress = useSharedValue(isEntering ? 0 : 1);
  const layer2Progress = useSharedValue(isEntering ? 0 : 1);

  useEffect(() => {
    if (isEntering) {
      layer0Progress.value = withDelay(0, withTiming(1, { duration: 400 }));
      layer1Progress.value = withDelay(80, withTiming(1, { duration: 400 }));
      layer2Progress.value = withDelay(160, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    } else {
      layer2Progress.value = withTiming(0, { duration: 300 });
      layer1Progress.value = withDelay(50, withTiming(0, { duration: 300 }));
      layer0Progress.value = withDelay(100, withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) }));
    }
  }, [isEntering]);

  const layer0Style = useAnimatedStyle(() => ({
    opacity: layer0Progress.value,
    transform: [
      { translateX: interpolate(layer0Progress.value, [0, 1], [50, 0]) },
      { scale: interpolate(layer0Progress.value, [0, 1], [0.95, 1]) },
    ],
  }));

  const layer1Style = useAnimatedStyle(() => ({
    opacity: layer1Progress.value,
    transform: [
      { translateX: interpolate(layer1Progress.value, [0, 1], [30, 0]) },
      { scale: interpolate(layer1Progress.value, [0, 1], [0.97, 1]) },
    ],
  }));

  const layer2Style = useAnimatedStyle(() => ({
    opacity: layer2Progress.value,
    transform: [
      { translateX: interpolate(layer2Progress.value, [0, 1], [15, 0]) },
      { scale: interpolate(layer2Progress.value, [0, 1], [0.99, 1]) },
    ],
  }));

  return (
    <View style={styles.layeredContainer}>
      <Animated.View style={[styles.layeredLayer, layer0Style]}>
        {children}
      </Animated.View>
    </View>
  );
};

const ParticleDissolve = ({ isActive, color = '#D7B56B', particleCount = 50 }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: TRANSITION_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = 0;
    }
  }, [isActive]);

  return (
    <View style={styles.dissolveContainer} pointerEvents="none">
      {Array.from({ length: particleCount }).map((_, i) => (
        <DissolveParticle
          key={i}
          index={i}
          total={particleCount}
          color={color}
          progress={progress}
        />
      ))}
    </View>
  );
};

const DissolveParticle = ({ index, total, color, progress }) => {
  const startX = (index / total) * W;
  const startY = Math.floor(index / 8) * (H / 8);
  const offsetX = (Math.random() - 0.5) * 100;
  const offsetY = (Math.random() - 0.5) * 100;

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.3, 0.7, 1], [0, 1, 1, 0]),
      transform: [
        {
          translateX: interpolate(p, [0, 1], [startX, startX + offsetX]),
        },
        {
          translateY: interpolate(p, [0, 1], [startY, startY + offsetY]),
        },
        {
          scale: interpolate(p, [0, 0.5, 1], [0, 1.5, 0]),
        },
      ],
    };
  });

  const size = 2 + Math.random() * 3;

  return (
    <Animated.View
      style={[
        styles.dissolveParticle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: startX,
          top: startY,
        },
        animatedStyle,
      ]}
    />
  );
};

const ScreenTransition = ({
  type = 'swordSlash',
  direction = 'forward',
  isActive = false,
  onComplete,
  children,
  accentColor = '#D7B56B',
}) => {
  const transitionStyle = useAnimatedStyle(() => ({
    opacity: isActive ? 0 : 1,
  }));

  return (
    <View style={styles.transitionContainer}>
      {children}
      <Animated.View style={[styles.transitionOverlay, transitionStyle]} pointerEvents="none">
        {type === 'swordSlash' && (
          <SwordSlash direction="horizontal" color={accentColor} />
        )}
        {type === 'inkWipe' && (
          <InkWipe direction={direction === 'forward' ? 'left' : 'right'} isActive={isActive} />
        )}
        {type === 'particleDissolve' && (
          <ParticleDissolve isActive={isActive} color={accentColor} />
        )}
      </Animated.View>
    </View>
  );
};

const TransitionProvider = ({
  children,
  currentTab,
  previousTab,
  transitionType = 'swordSlash',
  theme = {},
}) => {
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [showSlash, setShowSlash] = React.useState(false);
  const prevTabRef = useRef(currentTab);

  useEffect(() => {
    if (prevTabRef.current !== currentTab) {
      setIsTransitioning(true);
      setShowSlash(true);

      const timer = setTimeout(() => {
        setShowSlash(false);
        setIsTransitioning(false);
      }, SLASH_DURATION + 100);

      prevTabRef.current = currentTab;
      return () => clearTimeout(timer);
    }
  }, [currentTab]);

  const transitionStyle = useAnimatedStyle(() => ({
    opacity: isTransitioning ? 0 : 1,
    transform: [
      { scale: interpolate(isTransitioning ? 1 : 0, [0, 1], [0.98, 1]) },
    ],
  }));

  return (
    <View style={styles.providerContainer}>
      <Animated.View style={[styles.transitionContent, transitionStyle]}>
        {children}
      </Animated.View>
      {showSlash && (
        <View style={styles.slashOverlay} pointerEvents="none">
          <SwordSlash
            direction="horizontal"
            color={theme.accent || '#D7B56B'}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  transitionContainer: {
    flex: 1,
  },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  slashContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slash: {
    width: W * 2,
    height: 3,
    shadowColor: '#D7B56B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  slashGlow: {
    position: 'absolute',
    width: W * 2,
    height: 20,
    opacity: 0.3,
    blurRadius: 15,
  },
  inkWipe: {
    ...StyleSheet.absoluteFillObject,
  },
  depthLayer: {
    flex: 1,
  },
  layeredContainer: {
    flex: 1,
  },
  layeredLayer: {
    flex: 1,
  },
  dissolveContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  dissolveParticle: {
    position: 'absolute',
  },
  transitionContent: {
    flex: 1,
  },
  slashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  providerContainer: {
    flex: 1,
  },
});

export {
  SwordSlash,
  InkWipe,
  DepthLayer,
  LayeredTransition,
  ParticleDissolve,
  ScreenTransition,
  TransitionProvider,
};
export default ScreenTransition;