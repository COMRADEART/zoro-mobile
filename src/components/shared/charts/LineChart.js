import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { TXT3 } from '../../../theme/tokens';

export default function LineChart({ data = [], labels = [], color = '#4A9EFF', width = 280, height = 100 }) {
  const vals = data.map(v => (v == null ? 0 : v));
  const n = vals.length;
  if (n < 2) return null;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const padV = 10;

  const pts = vals.map((v, i) => {
    const x = (i / (n - 1)) * width;
    const y = padV + ((max - v) / range) * (height - padV * 2);
    return `${x},${y}`;
  });

  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={0} y1={height - 2} x2={width} y2={height - 2} stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />
        {pts.map((pt, i) => {
          const [x, y] = pt.split(',').map(Number);
          if (i === 0 || i === n - 1) return null;
          return <Circle key={i} cx={x} cy={y} r={2.5} fill={color} opacity={0.6} />;
        })}
        <Polyline
          points={pts.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {labels.length > 0 && (
        <View style={s.labelsRow}>
          {labels.map((l, i) => (
            <Text key={i} style={[s.label, { flex: 1 }]} numberOfLines={1}>{l}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  labelsRow: { flexDirection: 'row', marginTop: 6 },
  label: { textAlign: 'center', fontSize: 7, color: TXT3, fontWeight: '700', letterSpacing: 0.5 },
});