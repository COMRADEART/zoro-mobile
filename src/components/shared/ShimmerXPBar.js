import React, { useEffect, useRef, memo } from 'react';
import { View, Animated, Easing, Dimensions, StyleSheet } from 'react-native';

const { width: W } = Dimensions.get('window');

const ShimmerXPBar = memo(function ShimmerXPBar({ pct, color, height = 10 }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const fillWidth = Math.min(100, Math.max(0, pct * 100));

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: false })
    ).start();
  }, [shimmer]);

  const shimmerTranslate = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-40, W] });

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
              shadowOpacity: 0.8,
              shadowRadius: 6,
            },
          ]}
        >
          <View style={[styles.fillGradient, { backgroundColor: color }]} />
          <View style={[styles.edgeHighlight, { borderColor: color }]} />
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 6,
              backgroundColor: 'rgba(255,255,255,0.6)',
              borderRadius: 3,
              transform: [{ translateX: shimmerTranslate }],
              shadowColor: '#ffffff',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 4,
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              top: 1,
              bottom: 1,
              width: 20,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 2,
              transform: [{ translateX: shimmerTranslate }],
            }}
          />
        </View>
      </View>
      <View style={[styles.capLeft, { backgroundColor: color, height: height + 4 }]} />
      {fillWidth >= 98 && (
        <View style={[styles.capRight, { backgroundColor: color, height: height + 4 }]} />
      )}
    </View>
  );
});

export default ShimmerXPBar;

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
  fillGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '30%',
    opacity: 0.4,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  edgeHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 2,
    borderRadius: 1,
    opacity: 0.7,
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