import React, { memo, useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { SURF, BORD } from '../../theme/tokens';
import { DS } from '../../theme/designSystem';

const GlassCard = memo(function GlassCard({ accent, children, style, onPress, elevation = 'medium', glowIntensity = 0.6 }) {
  const borderColor = accent ? accent + '40' : BORD;
  const shadowColor = accent || '#ffffff';
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!accent || elevation === 'none') return;

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 3200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    glowLoop.start();
    shimmerLoop.start();

    return () => {
      glowLoop.stop();
      shimmerLoop.stop();
    };
  }, [accent, glowAnim, shimmerAnim, elevation]);

  const cardShadow = {
    sm: {
      shadowOpacity: 0.15,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    medium: {
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 7,
    },
    high: {
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 14,
    },
    none: {
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
  }[elevation] || cardShadow?.medium;

  const cardStyle = [
    styles.card,
    {
      borderColor,
      shadowColor,
      ...cardShadow,
    },
    style,
  ];

  const outerGlowStyle = accent && elevation !== 'none' ? {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: accent + '18',
  } : null;

  const innerGlowStyle = accent && elevation !== 'none' ? {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.25] }),
    backgroundColor: accent,
  } : null;

  const shimmerStyle = accent && elevation !== 'none' ? {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    borderRadius: 20,
    opacity: shimmerAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.12, 0] }),
    backgroundColor: `linear-gradient(90deg, transparent, ${accent}50, transparent)`,
    transform: [
      {
        translateX: shimmerAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-200, 200],
        }),
      },
    ],
  } : null;

  const inkWashStyle = accent ? {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: accent + '30',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  } : null;

  const content = (
    <View style={cardStyle}>
      {outerGlowStyle && <View style={outerGlowStyle} />}
      {innerGlowStyle && <Animated.View style={innerGlowStyle} />}
      {shimmerStyle && <Animated.View style={shimmerStyle} />}
      <View style={styles.content}>{children}</View>
      {inkWashStyle && <View style={inkWashStyle} />}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { opacity: pressed ? 0.88 : 1 },
        DS.motion.fast && { transition: `opacity ${DS.motion.fast}ms` },
      ]}
    >
      {content}
    </Pressable>
  );
});

export default GlassCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURF,
    borderWidth: 1,
    borderColor: BORD,
    borderRadius: 20,
    marginBottom: DS.space.sm,
    overflow: 'hidden',
  },
  content: {
    padding: DS.space.md + 2,
  },
});