import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import { TXT2, TXT3 } from '../../theme/tokens';
import { DS } from '../../theme/designSystem';

export default function RankUpModal({ rank, visible, onDismiss }) {
  const scale = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0); glow.setValue(0); rotate.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, tension: 40, friction: 5, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: false }),
        Animated.timing(rotate, { toValue: 1, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    }
  }, [visible, scale, glow, rotate]);

  if (!visible || !rank) return null;

  const rotateAnim = rotate.interpolate({ inputRange: [0, 1], outputRange: ['-15deg', '0deg'] });

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Animated.View style={[styles.rankUpCard, {
          transform: [
            { scale },
            { rotate: rotateAnim },
          ],
          borderColor: rank.color + '50',
          shadowColor: rank.color,
          shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.8] }),
          shadowRadius: glow.interpolate({ inputRange: [0, 1], outputRange: [15, 60] }),
          shadowOffset: { width: 0, height: 0 },
        }]}>
          <View style={[styles.topAccent, { backgroundColor: rank.color }]} />

          <View style={styles.rankBadge}>
            <Text style={[styles.rankBadgeKanji, { color: rank.color }]}>{rank.kanji || '刀'}</Text>
          </View>

          <Text style={styles.rankUpEye}>— RANK ACHIEVED —</Text>

          <View style={[styles.rankUpDivider, { backgroundColor: rank.color + '40' }]} />

          <Text style={[styles.rankUpName, { color: rank.color }]}>{rank.name}</Text>

          {rank.min && (
            <Text style={styles.rankUpXP}>{rank.min.toLocaleString()} XP Required</Text>
          )}

          <View style={[styles.rankUpDivider, { backgroundColor: rank.color + '40' }]} />

          <View style={styles.japaneseText}>
            <Text style={[styles.japaneseTitle, { color: rank.color }]}>位を極めた</Text>
            <Text style={styles.japaneseSub}>You have mastered a rank</Text>
          </View>

          <Text style={styles.rankUpHint}>TAP TO CONTINUE</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  rankUpCard: {
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
  rankBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  rankBadgeKanji: { fontSize: 36, fontWeight: '900' },
  rankUpEye: { ...DS.type.label, letterSpacing: 3, color: TXT2 },
  rankUpDivider: { height: StyleSheet.hairlineWidth, width: 100, marginVertical: 20 },
  rankUpName: { ...DS.type.displayLg, fontSize: 36, textAlign: 'center' },
  rankUpXP: { fontSize: 12, color: TXT2, marginTop: 8, letterSpacing: 0.5 },
  japaneseText: { alignItems: 'center', marginVertical: 8 },
  japaneseTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  japaneseSub: { fontSize: 12, color: TXT3, marginTop: 5, letterSpacing: 0.5 },
  rankUpHint: { ...DS.type.micro, color: TXT2, letterSpacing: 2, marginTop: 16 },
});