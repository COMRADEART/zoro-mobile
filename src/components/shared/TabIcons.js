import React, { memo } from 'react';
import Svg, { Path, Circle, Line } from 'react-native-svg';

/*
 * Hand-rolled line-icon set for the tab bar. Replaces the unicode glyphs
 * (torii / crossed-sword / circles) that rendered at different weights and
 * baselines on every iOS/Android system font and read as "cheap". One
 * coherent 24px grid, one stroke weight, currentColor via `color`.
 */
const SW = 1.9;

function Frame({ size, color, children }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={SW}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

const GLYPHS = {
  // Torii gate — the dojo.
  home: (c) => (
    <>
      <Path d="M4 7 L20 7" />
      <Path d="M6 10 L18 10" />
      <Line x1="7.5" y1="7" x2="7.5" y2="20" />
      <Line x1="16.5" y1="7" x2="16.5" y2="20" />
    </>
  ),
  // Sword — training.
  train: (c) => (
    <>
      <Line x1="12" y1="3" x2="12" y2="14.5" />
      <Line x1="8" y1="14.5" x2="16" y2="14.5" />
      <Line x1="12" y1="14.5" x2="12" y2="20" />
      <Circle cx="12" cy="20.6" r="1.1" fill={c} stroke="none" />
    </>
  ),
  // Technique node — skill tree.
  skill: (c) => (
    <>
      <Line x1="12" y1="11" x2="12" y2="5" />
      <Line x1="12" y1="13" x2="6" y2="18" />
      <Line x1="12" y1="13" x2="18" y2="18" />
      <Circle cx="12" cy="12" r="2.4" />
      <Circle cx="12" cy="4" r="1.5" fill={c} stroke="none" />
      <Circle cx="5.4" cy="18.6" r="1.5" fill={c} stroke="none" />
      <Circle cx="18.6" cy="18.6" r="1.5" fill={c} stroke="none" />
    </>
  ),
  // Bust — profile.
  profile: (c) => (
    <>
      <Circle cx="12" cy="8" r="3.4" />
      <Path d="M5.5 20 a 6.5 6.5 0 0 1 13 0" />
    </>
  ),
  // Anchor — voyage.
  voyage: (c) => (
    <>
      <Circle cx="12" cy="4.6" r="2" />
      <Line x1="12" y1="6.6" x2="12" y2="19" />
      <Line x1="8.4" y1="10" x2="15.6" y2="10" />
      <Path d="M6 14.5 C6 18.5 8.7 20.5 12 20.5 C15.3 20.5 18 18.5 18 14.5" />
    </>
  ),
  // Sliders — config.
  config: (c) => (
    <>
      <Line x1="4" y1="8.5" x2="20" y2="8.5" />
      <Line x1="4" y1="15.5" x2="20" y2="15.5" />
      <Circle cx="9" cy="8.5" r="2.3" fill={c} stroke="none" />
      <Circle cx="15" cy="15.5" r="2.3" fill={c} stroke="none" />
    </>
  ),
};

const TabIcon = memo(function TabIcon({ name, size = 22, color = '#fff' }) {
  const draw = GLYPHS[name];
  if (!draw) return null;
  return <Frame size={size} color={color}>{draw(color)}</Frame>;
});

export default TabIcon;
