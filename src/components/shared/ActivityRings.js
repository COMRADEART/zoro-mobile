import React, { memo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { TXT1, TXT3 } from '../../theme/tokens';

const RING_META = [
  { key: 'move', label: 'MOVE', color: '#FB7185', kanji: '動', radius: 74, unit: 'kcal' },
  { key: 'exercise', label: 'EXERCISE', color: '#4ADE80', kanji: '練', radius: 56, unit: 'min' },
  { key: 'stand', label: 'STAND', color: '#60A5FA', kanji: '立', radius: 38, unit: 'hrs' },
];

const ActivityRings = memo(function ActivityRings({ rings, size = 180, showLabels = true }) {
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 10;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, position: 'relative' }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Defs>
            {RING_META.map(({ key, color }) => (
              <LinearGradient key={key} id={`ring-grad-${key}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={color} stopOpacity="1" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
              </LinearGradient>
            ))}
          </Defs>
          {[...RING_META].reverse().map(({ key, radius, color }) => (
            <Circle
              key={`bg-${key}`}
              cx={cx} cy={cy} r={radius}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={strokeWidth - 2}
              fill="none"
            />
          ))}
          {[...RING_META].reverse().map(({ key, radius, color }) => {
            const circumference = 2 * Math.PI * radius;
            const pct = rings?.[key]?.pct ?? 0;
            const dashOffset = circumference * (1 - Math.min(1, pct));
            return (
              <React.Fragment key={key}>
                <Circle
                  cx={cx} cy={cy} r={radius}
                  stroke={`url(#ring-grad-${key})`}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={dashOffset}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        <Animated.View style={[styles.center, {
          opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
        }]}>
          <View style={styles.centerBadge}>
            <Text style={styles.centerIcon}>三</Text>
          </View>
          <Text style={styles.centerLabel}>RINGS</Text>
        </Animated.View>

        {RING_META.map(({ key, radius, color }) => {
          const pct = rings?.[key]?.pct ?? 0;
          const angle = -Math.PI / 2 + (Math.min(1, pct) * 2 * Math.PI);
          const indicatorX = cx + radius * Math.cos(angle) - 5;
          const indicatorY = cy + radius * Math.sin(angle) - 5;
          if (pct < 0.01) return null;
          return (
            <View key={`ind-${key}`} style={[
              styles.progressIndicator,
              {
                left: indicatorX,
                top: indicatorY,
                backgroundColor: color,
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 5,
              }
            ]} />
          );
        })}
      </View>

      {showLabels && (
        <View style={styles.labelsRow}>
          {RING_META.map(({ key, color, label, kanji, unit }) => {
            const ring = rings?.[key];
            return (
              <View key={key} style={[styles.labelItem, { borderColor: color + '25' }]}>
                <View style={[styles.labelDot, { backgroundColor: color }]} />
                <View style={styles.labelContent}>
                  <View style={[styles.labelKanji, { backgroundColor: color + '12' }]}>
                    <Text style={[styles.labelKanjiText, { color: color }]}>{kanji}</Text>
                  </View>
                  <Text style={[styles.labelText, { color }]}>{label}</Text>
                  <Text style={styles.labelValue}>
                    {ring?.current ?? 0}
                    <Text style={styles.labelUnit}> / {ring?.goal ?? 0} {unit}</Text>
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
});

export default ActivityRings;

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIcon: { fontSize: 22, fontWeight: '900', color: TXT1 },
  centerLabel: { fontSize: 7, fontWeight: '800', letterSpacing: 3.5, color: TXT3, marginTop: 2 },
  progressIndicator: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  labelsRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  labelItem: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  labelDot: { width: 6, height: 6, borderRadius: 3 },
  labelContent: { alignItems: 'center', gap: 2 },
  labelKanji: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  labelKanjiText: { fontSize: 12, fontWeight: '900' },
  labelText: { fontSize: 6.5, fontWeight: '800', letterSpacing: 2 },
  labelValue: { fontSize: 12, fontWeight: '900', color: TXT1, marginTop: 2 },
  labelUnit: { fontSize: 8, color: TXT3, fontWeight: '600' },
});