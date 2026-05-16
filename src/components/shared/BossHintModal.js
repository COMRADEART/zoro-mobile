import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import { TXT1, TXT2, TXT3 } from '../../theme/tokens';
import { DS } from '../../theme/designSystem';
import { BOSS_HINT_FAIL_THRESHOLD } from '../../logic/progression';

export default function BossHintModal({ visible, bossName, onDismiss }) {
  const scale = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0);
      glow.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, tension: 40, friction: 5, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: false }),
      ]).start();
    }
  }, [visible, scale, glow]);

  if (!visible) return null;

  const ACCENT = '#DC143C';

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={s.overlay} onPress={onDismiss}>
        <Animated.View style={[s.card, {
          transform: [{ scale }],
          borderColor: ACCENT + '50',
          shadowColor: ACCENT,
          shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }),
          shadowRadius: glow.interpolate({ inputRange: [0, 1], outputRange: [10, 40] }),
          shadowOffset: { width: 0, height: 0 },
        }]}>
          <View style={[s.topAccent, { backgroundColor: ACCENT }]} />

          <Text style={[s.icon, { color: ACCENT }]}>危</Text>
          <Text style={[s.eyebrow, { color: ACCENT }]}>— {BOSS_HINT_FAIL_THRESHOLD} CONSECUTIVE DEFEATS —</Text>

          <View style={[s.divider, { backgroundColor: ACCENT + '40' }]} />

          {bossName ? (
            <Text style={s.bossName}>{bossName}</Text>
          ) : null}

          <Text style={s.body}>
            Your body is not yet ready.{'\n'}Activate a Training Arc to build{'\n'}the strength this challenge demands.
          </Text>

          <View style={[s.divider, { backgroundColor: ACCENT + '40' }]} />

          <Text style={[s.kanji, { color: ACCENT }]}>修行</Text>
          <Text style={s.kanjisub}>Disciplined training awaits</Text>

          <Text style={s.hint}>tap to continue</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  card: {
    borderWidth: 2,
    padding: 48,
    paddingTop: 40,
    borderRadius: 28,
    alignItems: 'center',
    backgroundColor: '#050505',
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
    width: 300,
  },
  topAccent: { position: 'absolute', top: 0, left: '20%', right: '20%', height: 3, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  icon: { fontSize: 40, fontWeight: '900', marginBottom: 16 },
  eyebrow: { ...DS.type.label, letterSpacing: 2.5, textAlign: 'center' },
  divider: { height: StyleSheet.hairlineWidth, width: 100, marginVertical: 20 },
  bossName: { fontSize: 17, fontWeight: '900', color: TXT1, letterSpacing: 0.5, marginBottom: 16, textAlign: 'center' },
  body: { ...DS.type.bodySm, color: TXT2, textAlign: 'center', lineHeight: 21, letterSpacing: 0.2 },
  kanji: { fontSize: 28, fontWeight: '900', letterSpacing: 4, marginTop: 4 },
  kanjisub: { fontSize: 12, color: TXT3, marginTop: 7, letterSpacing: 1 },
  hint: { ...DS.type.micro, color: TXT2, letterSpacing: 2, marginTop: 20 },
});
