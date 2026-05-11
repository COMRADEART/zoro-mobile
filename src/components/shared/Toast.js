import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { TXT1, SB_H } from '../../theme/tokens';

export default function Toast({ toast, toastAnim, accent = '#E52030', duration = 3500 }) {
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
          scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
        }],
      },
    ]}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.toastInner}>
        <View style={styles.toastContent}>
          <View style={styles.titleRow}>
            <View style={[styles.kanjiAccent, { backgroundColor: accent + '30' }]}>
              <Text style={[styles.kanjiText, { color: accent }]}>刃</Text>
            </View>
            <Text style={styles.toastTitle}>{toast.title}</Text>
          </View>
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
    backgroundColor: 'rgba(8,8,8,0.98)',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    opacity: 0.9,
  },
  toastInner: {
    padding: 16,
    paddingLeft: 18,
  },
  toastContent: {
    paddingRight: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  kanjiAccent: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kanjiText: {
    fontSize: 14,
    fontWeight: '900',
  },
  toastTitle: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.5)',
  },
  toastBody: {
    fontSize: 16,
    fontWeight: '700',
    color: TXT1,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  toastProgress: {
    height: 2.5,
    opacity: 0.7,
  },
});