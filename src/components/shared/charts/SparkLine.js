import React from 'react';
import Svg, { Polyline, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function SparkLine({ data = [], color = '#4A9EFF', width = 120, height = 32, dotRadius = 2.5 }) {
  const vals = data.map(v => (v == null ? 0 : v));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const n = vals.length;
  if (n < 2) return null;

  const pts = vals.map((v, i) => {
    const x = (i / (n - 1)) * width;
    const y = height - ((v - min) / range) * (height - dotRadius * 2) - dotRadius;
    return `${x},${y}`;
  });

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.8" />
          <Stop offset="100%" stopColor={color} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Polyline
        points={pts.join(' ')}
        fill="none"
        stroke="url(#sparkGrad)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {vals.map((v, i) => {
        const x = (i / (n - 1)) * width;
        const y = height - ((v - min) / range) * (height - dotRadius * 2) - dotRadius;
        return <Circle key={i} cx={x} cy={y} r={i === n - 1 ? dotRadius + 1 : dotRadius} fill={color} opacity={i === n - 1 ? 1 : 0.5} />;
      })}
    </Svg>
  );
}