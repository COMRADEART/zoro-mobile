import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';

/*
 * XP progress bar. Fill width is the only state; intentionally static —
 * no decorative motion (reduced-motion commitment).
 */
const XPBar = memo(function XPBar({ pct, color, height = 10 }) {
  const fillWidth = Math.min(100, Math.max(0, pct * 100));

  return (
    <View style={[styles.xpBarOuter, { height }]}>
      <View style={[styles.xpBarTrack, { height }]}>
        <View
          style={[
            styles.xpBarFill,
            {
              width: `${fillWidth}%`,
              backgroundColor: color,
              height,
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 5,
            },
          ]}
        >
          <View style={[styles.fillSheen, { backgroundColor: color }]} />
        </View>
      </View>
      <View style={[styles.capLeft, { backgroundColor: color, height: height + 4 }]} />
      {fillWidth >= 98 && (
        <View style={[styles.capRight, { backgroundColor: color, height: height + 4 }]} />
      )}
    </View>
  );
});

export default XPBar;

const styles = StyleSheet.create({
  xpBarOuter: {
    height: 10,
    position: 'relative',
    justifyContent: 'center',
  },
  xpBarTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  xpBarFill: {
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  fillSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '55%',
    opacity: 0.35,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  capLeft: {
    position: 'absolute',
    left: -1,
    top: -2,
    width: 4,
    borderRadius: 2,
    opacity: 0.8,
  },
  capRight: {
    position: 'absolute',
    right: -1,
    top: -2,
    width: 4,
    borderRadius: 2,
    opacity: 0.8,
  },
});
