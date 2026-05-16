import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { TXT2 } from '../../theme/tokens';

const CircularProgress = memo(function CircularProgress({ progress: prog, size = 140, strokeWidth = 8, color }) {
  const clamped = Math.min(1, Math.max(0, prog));
  const radius = (size - strokeWidth) / 2;
  const circum = 2 * Math.PI * radius;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circum} ${circum}`}
          strokeDashoffset={circum * (1 - clamped)}
          strokeLinecap="round"
          style={{
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 6,
          }}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.value, { color }]}>{Math.round(clamped * 100)}%</Text>
        <Text style={styles.label}>TODAY · 今日</Text>
      </View>
    </View>
  );
});

export default CircularProgress;

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: TXT2,
    marginTop: 5,
    fontWeight: '700',
  },
});