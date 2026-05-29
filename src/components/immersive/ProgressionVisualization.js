import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop, G } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

const SWORD_STATES = {
  DULL: { name: 'dull', minSharpness: 0, color: '#4B5563', glowColor: 'rgba(75, 85, 99, 0.3)' },
  RAZOR: { name: 'razor', minSharpness: 25, color: '#9CA3AF', glowColor: 'rgba(156, 163, 175, 0.4)' },
  SHARP: { name: 'sharp', minSharpness: 50, color: '#D7B56B', glowColor: 'rgba(215, 181, 107, 0.5)' },
  KEEN: { name: 'keen', minSharpness: 75, color: '#F7B733', glowColor: 'rgba(247, 183, 51, 0.6)' },
  PERFECTED: { name: 'perfected', minSharpness: 90, color: '#FFFFFF', glowColor: 'rgba(255, 255, 255, 0.7)' },
};

const RANK_AURAS = {
  ozaringu: {
    primary: '#4B5563',
    secondary: '#6B7280',
    pattern: 'subtle',
    particles: 8,
    style: 'misty',
  },
  wado: {
    primary: '#D7B56B',
    secondary: '#B8965A',
    pattern: 'warm',
    particles: 16,
    style: 'radiant',
  },
  sandai: {
    primary: '#F0444F',
    secondary: '#DC2626',
    pattern: 'fierce',
    particles: 24,
    style: 'fiery',
  },
  shusui: {
    primary: '#A7BECD',
    secondary: '#6F91A8',
    pattern: 'flowing',
    particles: 20,
    style: 'serene',
  },
  meifu: {
    primary: '#B96BFF',
    secondary: '#9333EA',
    pattern: 'ethereal',
    particles: 32,
    style: 'mystical',
  },
  kyokotsu: {
    primary: '#3B82F6',
    secondary: '#2563EB',
    pattern: 'electric',
    particles: 40,
    style: 'thunder',
  },
  jotun: {
    primary: '#10B981',
    secondary: '#059669',
    pattern: 'primal',
    particles: 48,
    style: 'ancient',
  },
  tengoku: {
    primary: '#F7B733',
    secondary: '#EA8A0B',
    pattern: 'divine',
    particles: 64,
    style: 'celestial',
  },
};

const SwordVisualization = ({
  sharpness = 50,
  discipline = 'wado',
  size = 'medium',
  showGlow = true,
  animated = true,
}) => {
  const state = useMemo(() => {
    if (sharpness >= 90) return SWORD_STATES.PERFECTED;
    if (sharpness >= 75) return SWORD_STATES.KEEN;
    if (sharpness >= 50) return SWORD_STATES.SHARP;
    if (sharpness >= 25) return SWORD_STATES.RAZOR;
    return SWORD_STATES.DULL;
  }, [sharpness]);

  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const edgeGlow = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    edgeGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [animated]);

  const swordWidth = size === 'small' ? 80 : size === 'large' ? 160 : 120;
  const swordHeight = size === 'small' ? 200 : size === 'large' ? 400 : 300;

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const edgeStyle = useAnimatedStyle(() => ({
    opacity: edgeGlow.value * 0.8,
  }));

  const sharpnessPercent = Math.min(100, Math.max(0, sharpness));
  const bladeHeight = swordHeight * (0.4 + (sharpnessPercent / 100) * 0.5);

  const disciplineColors = {
    wado: { primary: '#D7B56B', secondary: '#B8965A' },
    sandai: { primary: '#F0444F', secondary: '#DC2626' },
    shusui: { primary: '#A7BECD', secondary: '#6F91A8' },
  };

  const colors = disciplineColors[discipline] || disciplineColors.wado;

  return (
    <Animated.View style={[styles.swordContainer, containerStyle]}>
      {showGlow && (
        <Animated.View
          style={[
            styles.swordGlow,
            {
              width: swordWidth * 1.5,
              height: swordHeight * 1.2,
              backgroundColor: state.glowColor,
              shadowColor: state.color,
            },
            glowStyle,
          ]}
        />
      )}

      <Svg width={swordWidth} height={swordHeight} viewBox="0 0 100 150">
        <Defs>
          <LinearGradient id="bladeGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.secondary} stopOpacity="0.8" />
            <Stop offset="0.5" stopColor={state.color} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.6" />
          </LinearGradient>
          <LinearGradient id="edgeHighlight" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="rgba(255,255,255,0)" />
            <Stop offset="0.3" stopColor="rgba(255,255,255,0.4)" />
            <Stop offset="0.5" stopColor="rgba(255,255,255,0.8)" />
            <Stop offset="0.7" stopColor="rgba(255,255,255,0.4)" />
            <Stop offset="1" stopColor="rgba(255,255,255,0)" />
          </LinearGradient>
        </Defs>

        <G transform="translate(50, 75)">
          <Path
            d={`M 0,-65 Q 5,-60 8,-40 L 6,${bladeHeight * 0.3} L 4,${bladeHeight * 0.5} L 2,${bladeHeight * 0.7} L 0,${bladeHeight} L -2,${bladeHeight * 0.7} L -4,${bladeHeight * 0.5} L -6,${bladeHeight * 0.3} L -8,-40 Q -5,-60 0,-65 Z`}
            fill="url(#bladeGradient)"
          />

          {animated && (
            <Path
              d={`M 0,-65 Q 5,-60 8,-40 L 6,${bladeHeight * 0.3} L 4,${bladeHeight * 0.5} L 2,${bladeHeight * 0.7} L 0,${bladeHeight} L -2,${bladeHeight * 0.7} L -4,${bladeHeight * 0.5} L -6,${bladeHeight * 0.3} L -8,-40 Q -5,-60 0,-65 Z`}
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          )}

          <Path
            d={`M -8,-40 Q -5,-60 0,-65 Q 5,-60 8,-40 L 0,-30 Z`}
            fill="url(#edgeHighlight)"
            opacity="0.6"
          />
        </G>
      </Svg>

      <Animated.View
        style={[
          styles.bladeEdgeHighlight,
          {
            borderColor: state.color,
            height: bladeHeight,
            width: 2,
          },
          edgeStyle,
        ]}
      />
    </Animated.View>
  );
};

const RankAura = ({
  rank = 'wado',
  intensity = 1,
  size = 'medium',
  animated = true,
}) => {
  const auraData = RANK_AURAS[rank] || RANK_AURAS.wado;
  const pulseScale = useSharedValue(1);
  const rotationAngle = useSharedValue(0);
  const particleOpacity = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    rotationAngle.value = withRepeat(
      withTiming(360, { duration: 60000, easing: Easing.linear }),
      -1,
      false
    );

    particleOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 })
      ),
      -1,
      true
    );
  }, [animated]);

  const auraSize = size === 'small' ? 150 : size === 'large' ? 300 : 220;

  const auraStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulseScale.value * intensity },
      { rotate: `${rotationAngle.value}deg` },
    ],
    opacity: intensity,
  }));

  const particleStyle = useAnimatedStyle(() => ({
    opacity: particleOpacity.value * intensity,
  }));

  return (
    <View style={[styles.rankAuraContainer, { width: auraSize, height: auraSize }]}>
      <Animated.View
        style={[
          styles.auraRing,
          {
            width: auraSize,
            height: auraSize,
            borderRadius: auraSize / 2,
            borderColor: auraData.primary,
          },
          auraStyle,
        ]}
      />

      <Animated.View
        style={[
          styles.auraInnerRing,
          {
            width: auraSize * 0.7,
            height: auraSize * 0.7,
            borderRadius: auraSize * 0.35,
            borderColor: auraData.secondary,
          },
          auraStyle,
        ]}
      />

      {auraData.style === 'radiant' && (
        <Animated.View
          style={[
            styles.radiantSpikes,
            {
              width: auraSize * 1.2,
              height: auraSize * 1.2,
            },
            auraStyle,
          ]}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.spike,
                {
                  backgroundColor: auraData.primary,
                  transform: [
                    { rotate: `${i * 30}deg` },
                    { translateY: -auraSize * 0.5 },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>
      )}

      <Animated.View style={[styles.particleContainer, particleStyle]}>
        {Array.from({ length: auraData.particles }).map((_, i) => (
          <AuraParticle
            key={i}
            index={i}
            total={auraData.particles}
            primaryColor={auraData.primary}
            size={auraSize}
          />
        ))}
      </Animated.View>
    </View>
  );
};

const AuraParticle = ({ index, total, primaryColor, size }) => {
  const angle = (index / total) * Math.PI * 2;
  const radius = size * 0.4 + (index % 3) * 10;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const particleSize = 2 + (index % 3);
  const delay = (index / total) * 5000;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(x + 5, { duration: 2000 + delay, easing: Easing.inOut(Easing.ease) }),
        withTiming(x - 5, { duration: 2000 + delay, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    translateY.value = withRepeat(
      withSequence(
        withTiming(y + 5, { duration: 2500 + delay, easing: Easing.inOut(Easing.ease) }),
        withTiming(y - 5, { duration: 2500 + delay, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    opacity.value = withRepeat(
      withSequence(
        withDelay(delay, withTiming(0.8, { duration: 1000 })),
        withTiming(0.2, { duration: 1000 })
      ),
      -1,
      true
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1500 + delay }),
        withTiming(0.8, { duration: 1500 + delay })
      ),
      -1,
      true
    );
  }, []);

  const particleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.auraParticle,
        {
          width: particleSize,
          height: particleSize,
          borderRadius: particleSize / 2,
          backgroundColor: primaryColor,
          shadowColor: primaryColor,
        },
        particleStyle,
      ]}
    />
  );
};

const StreakMark = ({ streak = 0, position = 'topRight' }) => {
  if (streak < 3) return null;

  const marks = Math.min(Math.floor(streak / 3), 10);

  const positionStyles = {
    topRight: { top: 20, right: 20 },
    topLeft: { top: 20, left: 20 },
    bottomRight: { bottom: 20, right: 20 },
    bottomLeft: { bottom: 20, left: 20 },
  };

  return (
    <View style={[styles.streakMarkContainer, positionStyles[position]]}>
      {Array.from({ length: marks }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.streakMark,
            {
              backgroundColor: i < 3 ? '#D7B56B' : i < 7 ? '#F7B733' : '#FFFFFF',
              marginLeft: i > 0 ? -4 : 0,
            },
          ]}
        />
      ))}
    </View>
  );
};

const VisualProgression = ({
  sharpness = 50,
  rank = 'wado',
  streak = 0,
  discipline = 'wado',
  showAura = true,
  showSword = true,
  animated = true,
}) => {
  const auraIntensity = useMemo(() => {
    if (sharpness >= 90) return 1.2;
    if (sharpness >= 75) return 1.0;
    if (sharpness >= 50) return 0.8;
    return 0.6;
  }, [sharpness]);

  return (
    <View style={styles.visualProgressionContainer}>
      {showAura && (
        <RankAura
          rank={rank}
          intensity={auraIntensity}
          size="medium"
          animated={animated}
        />
      )}
      {showSword && (
        <View style={styles.swordWrapper}>
          <SwordVisualization
            sharpness={sharpness}
            discipline={discipline}
            size="medium"
            showGlow={true}
            animated={animated}
          />
        </View>
      )}
      <StreakMark streak={streak} position="topRight" />
    </View>
  );
};

const styles = StyleSheet.create({
  swordContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  swordGlow: {
    position: 'absolute',
    borderRadius: 100,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 10,
  },
  bladeEdgeHighlight: {
    position: 'absolute',
    left: '50%',
    marginLeft: -1,
    top: 0,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  rankAuraContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraRing: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.4,
  },
  auraInnerRing: {
    position: 'absolute',
    borderWidth: 1,
    opacity: 0.3,
  },
  radiantSpikes: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spike: {
    position: 'absolute',
    width: 2,
    height: 15,
    borderRadius: 1,
  },
  particleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraParticle: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  streakMarkContainer: {
    position: 'absolute',
    flexDirection: 'row',
  },
  streakMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(215, 181, 107, 0.5)',
  },
  visualProgressionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  swordWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export {
  SwordVisualization,
  RankAura,
  StreakMark,
  VisualProgression,
  SWORD_STATES,
  RANK_AURAS,
};
export default VisualProgression;