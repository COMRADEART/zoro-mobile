import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { TXT1, TXT2, TXT3 } from '../../theme/tokens';

const RING_META = [
  { key: 'shusui', radius: 68, color: '#8EAABE', label: '秋水', discipline: 'SPIRIT', kanji: '魂' },
  { key: 'sandai', radius: 54, color: '#E52030', label: '鬼徹', discipline: 'BODY', kanji: '身体' },
  { key: 'wado', radius: 40, color: '#D4A853', label: '和道', discipline: 'MIND', kanji: '心' },
];

const ThreeSwordRings = memo(function ThreeSwordRings({ rings, size = 160 }) {
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 9;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, position: 'relative' }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Defs>
            {RING_META.map(({ key, color }) => (
              <LinearGradient key={key} id={`grad-${key}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={color} stopOpacity="1" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
              </LinearGradient>
            ))}
          </Defs>
          {RING_META.map(({ key, radius }) => (
            <Circle
              key={`bg-${key}`}
              cx={cx} cy={cy} r={radius}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={strokeWidth - 2}
              fill="none"
            />
          ))}
          {RING_META.map(({ key, radius, color }) => {
            const circumference = 2 * Math.PI * radius;
            const pct = rings[key]?.pct ?? 0;
            const dashOffset = circumference * (1 - pct);
            return (
              <React.Fragment key={key}>
                <Circle
                  cx={cx} cy={cy} r={radius}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  opacity={0.9}
                />
              </React.Fragment>
            );
          })}
        </Svg>
        <View style={styles.center}>
          <Text style={styles.centerKanji}>三刀流</Text>
          <Text style={styles.centerSub}>SANTORYU</Text>
        </View>

        {RING_META.map(({ key, radius, color, kanji }) => {
          const pct = rings[key]?.pct ?? 0;
          const angle = -Math.PI / 2 + (pct * 2 * Math.PI);
          const indicatorX = cx + radius * Math.cos(angle) - 4;
          const indicatorY = cy + radius * Math.sin(angle) - 4;
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
                shadowOpacity: 0.8,
                shadowRadius: 4,
              }
            ]} />
          );
        })}
      </View>

      <View style={styles.statsRow}>
        {RING_META.slice().reverse().map(({ key, color, label, kanji }) => {
          const ring = rings[key];
          const pct = ring?.pct ?? 0;
          return (
            <View key={key} style={[styles.statItem, { borderColor: color + '30' }]}>
              <View style={[styles.statKanjiBox, { backgroundColor: color + '12' }]}>
                <Text style={[styles.statKanji, { color }]}>{kanji}</Text>
              </View>
              <Text style={[styles.statLabel, { color }]}>{label}</Text>
              <Text style={styles.statValue}>
                {ring?.current ?? 0}
                <Text style={styles.statUnit}>/{ring?.target ?? 0}</Text>
              </Text>
              <Text style={[styles.statPct, { color }]}>{Math.round(pct * 100)}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

export default ThreeSwordRings;

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerKanji: { fontSize: 24, fontWeight: '900', color: TXT1, letterSpacing: 1 },
  centerSub: { fontSize: 11, fontWeight: '800', color: TXT2, letterSpacing: 1.5, marginTop: 3 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  statItem: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  statKanjiBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statKanji: { fontSize: 14, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
  statValue: { fontSize: 17, fontWeight: '900', color: TXT1, marginTop: 3 },
  statUnit: { fontSize: 11, color: TXT3 },
  statPct: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },
  progressIndicator: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});