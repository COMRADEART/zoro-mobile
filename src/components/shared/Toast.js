import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { TXT1, SB_H } from '../../theme/tokens';
import { DS } from '../../theme/designSystem';

export default function Toast({ toast, toastAnim, accent = '#F0F0F0', duration = 3500 }) {
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    progress.setValue(1);
    Animated.timing(progress, {
      toValue: 0,
      duration,
      useNativeDriver: false,
    }).start();
  }, [toast, progress, duration]);

  if (!toast) return null;

  return (
    <Animated.View style={[
      styles.toast, {
        opacity: toastAnim,
        transform: [{
          translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }),
        }, {
          scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }),
        }],
      },
    ]}>
      <View style={[styles.topRule, { backgroundColor: accent }]} />
      <View style={styles.toastInner}>
        <View style={[styles.kanjiBadge, { backgroundColor: accent + '22', borderColor: accent + '40' }]}>
          <Text style={[styles.kanjiText, { color: accent }]}>刃</Text>
        </View>
        <View style={styles.toastContent}>
          <Text style={[styles.toastTitle, { color: accent }]}>{toast.title}</Text>
          <Text style={styles.toastBody}>{toast.body}</Text>
        </View>
      </View>
      <Animated.View
        style={[
          styles.toastProgress,
          {
            width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: accent,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: SB_H + 12,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10,10,10,0.98)',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 25,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  topRule: {
    height: 2.5,
    width: '100%',
    opacity: 0.9,
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  kanjiBadge: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kanjiText: {
    fontSize: 18,
    fontWeight: '900',
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    ...DS.type.label,
    marginBottom: 3,
  },
  toastBody: {
    fontSize: 16,
    fontWeight: '700',
    color: TXT1,
    letterSpacing: 0.2,
  },
  toastProgress: {
    height: 2.5,
    opacity: 0.6,
  },
});
