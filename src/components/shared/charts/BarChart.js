import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { TXT3 } from '../../../theme/tokens';

export default function BarChart({ bars = [], width = 280, height = 100, labelFontSize = 8 }) {
  if (!bars.length) return null;

  const maxTotal = Math.max(...bars.map(b => b.segments.reduce((a, s) => a + s.value, 0)), 1);
  const barW = (width / bars.length) * 0.55;
  const gap = (width / bars.length) * 0.45;

  return (
    <View>
      <Svg width={width} height={height}>
        {bars.map((bar, i) => {
          let yOffset = height;
          return bar.segments.map((seg, si) => {
            if (!seg.value) return null;
            const barH = (seg.value / maxTotal) * height;
            yOffset -= barH;
            const x = i * (barW + gap) + gap / 2;
            return (
              <Rect
                key={si}
                x={x}
                y={yOffset}
                width={barW}
                height={barH}
                fill={seg.color}
                rx={si === bar.segments.length - 1 ? 4 : 0}
                ry={si === bar.segments.length - 1 ? 4 : 0}
              />
            );
          });
        })}
      </Svg>
      <View style={s.labelsRow}>
        {bars.map((bar, i) => (
          <Text key={i} style={[s.label, { width: barW + gap, fontSize: labelFontSize }]}>{bar.label}</Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  labelsRow: { flexDirection: 'row', marginTop: 6 },
  label: { textAlign: 'center', color: TXT3, fontWeight: '700', letterSpacing: 0.5 },
});