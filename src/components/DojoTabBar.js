import React, { useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TXT3, TAB_BAR_H } from '../theme/tokens';

export const TABS = [
  { key: 'home', label: 'HOME · ホーム', icon: '⛩', kanji: 'home' },
  { key: 'train', label: 'TRAIN · 修行', icon: '⚔', kanji: 'train' },
  { key: 'skill', label: 'SKILL · 技', icon: '◎', kanji: 'skill' },
  { key: 'profile', label: 'PROFILE · 士', icon: '◯', kanji: 'profile' },
  { key: 'voyage', label: 'VOYAGE · 航海', icon: '⚓', kanji: 'voyage' },
  { key: 'config', label: 'CONFIG · 設定', icon: '⊙', kanji: 'config' },
];

export default function DojoTabBar({ tab, setTab, indicatorLeft, t }) {
  const TAB_W_PERCENT = 100 / TABS.length;
  const accent = t?.accent || '#E52030';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleTabPress = (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 60, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, damping: 15, stiffness: 300, useNativeDriver: false }),
    ]).start();
    setTab(key);
  };

  return (
    <View style={[s.tabBar, { borderTopColor: accent + '18' }]} accessibilityRole="tablist">
      <Animated.View
        style={[
          s.tabPill,
          {
            transform: [
              { translateX: indicatorLeft },
              { scale: scaleAnim },
            ],
            width: `${TAB_W_PERCENT * 0.84}%`,
            backgroundColor: accent + '12',
            borderColor: accent + '35',
            borderBottomColor: accent + '55',
          },
        ]}
      />
      {TABS.map(tb => {
        const active = tab === tb.key;
        return (
          <Pressable
            key={tb.key}
            style={s.tabItem}
            onPress={() => handleTabPress(tb.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tb.label}
          >
            <View style={[s.iconContainer, active && { backgroundColor: accent + '16' }]}>
              <Text style={[s.tabIcon, active && { color: accent }]}>{tb.icon}</Text>
            </View>
            <Text style={[s.tabLabel, active && { color: accent }]}>{tb.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_H,
    backgroundColor: 'rgba(4,4,4,0.98)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  tabPill: {
    position: 'absolute',
    top: 5,
    height: TAB_BAR_H - 16,
    borderRadius: 14,
    borderWidth: 1,
    borderBottomWidth: 2.5,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 5,
  },
  iconContainer: {
    width: 34,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  tabIcon: {
    fontSize: 18,
    color: TXT3,
  },
  tabLabel: {
    fontSize: 5.8,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: TXT3,
  },
});