import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, StyleSheet, Dimensions, AppState } from 'react-native';
import { THEMES, DEFAULT_THEME } from '../../theme/themes';
import useReducedMotion from '../../hooks/useReducedMotion';

const { width: W, height: H } = Dimensions.get('window');

export function AmbientBG({ theme }) {
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];
  const reducedMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  const radialPulse = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const loopRef = useRef(null);
  const radialRef = useRef(null);
  const driftRef = useRef(null);

  useEffect(() => {
    // Reduced motion: hold the layers at a gentle static mid-state instead of
    // running three perpetual loops.
    if (reducedMotion) {
      pulse.setValue(0.5);
      radialPulse.setValue(0.3);
      drift.setValue(0.5);
      return undefined;
    }
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 7000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    radialRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(radialPulse, { toValue: 1, duration: 4500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(radialPulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    driftRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loopRef.current.start();
    radialRef.current.start();
    driftRef.current.start();
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        loopRef.current?.start();
        radialRef.current?.start();
        driftRef.current?.start();
      } else {
        loopRef.current?.stop();
        radialRef.current?.stop();
        driftRef.current?.stop();
      }
    });
    return () => {
      loopRef.current?.stop();
      radialRef.current?.stop();
      driftRef.current?.stop();
      sub.remove();
    };
  }, [pulse, radialPulse, drift, reducedMotion]);

  const radialScale = radialPulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 2.8] });
  const radialOpacity = radialPulse.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.07, 0] });
  const driftX = drift.interpolate({ inputRange: [0, 1], outputRange: [-15, 15] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.75, 1.2, 0.75] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.018, 0.06, 0.018] });
  const driftOpacity = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.06, 0] });

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bg }]}>
      <Animated.View style={{
        position: 'absolute',
        top: -H * 0.4,
        alignSelf: 'center',
        width: W * 2.4,
        height: W * 2.4,
        borderRadius: W * 1.6,
        backgroundColor: t.accent,
        opacity: pulseOpacity,
        transform: [{ scale: pulseScale }],
      }} />
      <Animated.View style={{
        position: 'absolute',
        top: H * 0.55,
        alignSelf: 'center',
        width: W * 0.5,
        height: W * 0.5,
        borderRadius: W * 0.25,
        backgroundColor: t.particle,
        opacity: radialOpacity,
        transform: [
          { scale: radialScale },
          { translateX: radialPulse.interpolate({ inputRange: [0, 1], outputRange: [0, W * 0.25] }) },
        ],
      }} />
      <Animated.View style={{
        position: 'absolute',
        top: H * 0.2,
        width: W,
        height: 1,
        backgroundColor: t.particle,
        opacity: driftOpacity,
        transform: [{ translateX: driftX }],
      }} />
    </View>
  );
}

export function FloatingParticles({ theme, count = 16 }) {
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];
  const reducedMotion = useReducedMotion();
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => setIsActive(next === 'active'));
    return () => sub.remove();
  }, []);

  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * W,
      startY: H + 10 + Math.random() * 40,
      size: 1 + Math.random() * 2.8,
      speed: 60 + Math.random() * 90,
      delay: Math.random() * 7000,
      drift: (Math.random() - 0.5) * 55,
      opacity: 0.05 + Math.random() * 0.18,
    }))
  ).current;

  // Reduced motion: skip the entire perpetual particle field.
  if (reducedMotion) return null;

  return (
    <>
      {particles.map(p => (
        <AnimatedParticle key={p.id} p={p} color={t.accent} isActive={isActive} />
      ))}
    </>
  );
}

function AnimatedParticle({ p, color, isActive }) {
  const y = useRef(new Animated.Value(p.startY)).current;
  const x = useRef(new Animated.Value(p.x)).current;
  const opacity = useRef(new Animated.Value(p.opacity)).current;
  const timer = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    if (!isActive) {
      y.stopAnimation();
      x.stopAnimation();
      clearTimeout(timer.current);
      return;
    }
    const run = () => {
      if (!mounted) return;
      y.setValue(p.startY);
      x.setValue(p.x);
      opacity.setValue(p.opacity * 0.5);
      // translateX/translateY/opacity are all native-driver compatible and no
      // listener reads these values — run them off the JS thread.
      animRef.current = Animated.parallel([
        Animated.timing(y, { toValue: -30, duration: p.speed * 1000 / 12, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(x, { toValue: p.x + p.drift, duration: p.speed * 1000 / 12, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: p.opacity, duration: p.speed * 1000 / 24, useNativeDriver: true }),
      ]);
      animRef.current.start(({ finished }) => {
        if (!mounted || !finished) return;
        timer.current = setTimeout(run, 250 + Math.random() * 450);
      });
    };
    const init = setTimeout(run, p.delay);
    return () => {
      mounted = false;
      clearTimeout(init);
      clearTimeout(timer.current);
      if (animRef.current) animRef.current.stop();
      y.stopAnimation();
      x.stopAnimation();
      opacity.stopAnimation();
      y.removeAllListeners();
      x.removeAllListeners();
      opacity.removeAllListeners();
    };
  }, [isActive, p, x, y, opacity]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: p.size,
        height: p.size,
        borderRadius: p.size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX: x }, { translateY: y }],
      }}
    />
  );
}