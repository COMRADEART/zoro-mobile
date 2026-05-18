import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import useReducedMotion from '../../hooks/useReducedMotion';

export default function BreathingOrb({ color, size = 52 }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;
  const innerPulse = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Decorative pulse/rotate only — the orb's resting state (scale 1,
    // opacity 0.7) is a complete, calm visual on its own.
    if (reducedMotion) return;

    const mainLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.18, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.25, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    );

    const innerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(innerPulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(innerPulse, { toValue: 0.5, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    );

    mainLoop.start();
    innerLoop.start();
    rotateLoop.start();

    return () => {
      mainLoop.stop();
      innerLoop.stop();
      rotateLoop.stop();
    };
  }, [scale, opacity, innerPulse, rotateAnim, reducedMotion]);

  const outerRing = size * 1.4;
  const middleRing = size * 1.2;
  const coreSize = size * 0.5;

  return (
    <View style={{ width: outerRing, height: outerRing, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute',
        width: outerRing,
        height: outerRing,
        borderRadius: outerRing / 2,
        borderWidth: 1.5,
        borderColor: color,
        opacity: opacity.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.4] }),
        transform: [{ scale }],
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: middleRing,
        height: middleRing,
        borderRadius: middleRing / 2,
        borderWidth: 1,
        borderColor: color,
        opacity: opacity.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }),
        transform: [{ scale: scale.interpolate({ inputRange: [0.8, 1.18], outputRange: [0.9, 1.1] }) }],
      }} />
      <Animated.View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: opacity,
        transform: [{ scale }],
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: coreSize,
        height: coreSize,
        borderRadius: coreSize / 2,
        backgroundColor: '#ffffff',
        opacity: innerPulse.interpolate({ inputRange: [0.5, 1], outputRange: [0.3, 0.7] }),
        transform: [{ scale: innerPulse }],
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: coreSize * 0.4,
        height: coreSize * 0.4,
        borderRadius: coreSize * 0.2,
        backgroundColor: '#ffffff',
        opacity: innerPulse.interpolate({ inputRange: [0.5, 1], outputRange: [0.5, 0.9] }),
      }} />
    </View>
  );
}