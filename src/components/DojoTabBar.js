import React, { useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TXT3, TAB_BAR_H } from '../theme/tokens';
import TabIcon from './shared/TabIcons';

export const TABS = [
  { key: 'home', label: 'HOME' },
  { key: 'train', label: 'TRAIN' },
  { key: 'skill', label: 'SKILL' },
  { key: 'profile', label: 'PROFILE' },
  { key: 'voyage', label: 'VOYAGE' },
  { key: 'config', label: 'CONFIG' },
];

export default function DojoTabBar({ tab, setTab, indicatorLeft, t }) {
  const TAB_W_PERCENT = 100 / TABS.length;
  const accent = t?.accent || '#E52030';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleTabPress = (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 60, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, damping: 15, stiffness: 300, useNativeDriver: false }),
    ]).start();
    setTab(key);
  };

  return (
    <View style={[s.tabBar, { borderTopColor: accent + '20' }]} accessibilityRole="tablist">
      <Animated.View
        style={[
          s.tabPill,
          {
            transform: [{ translateX: indicatorLeft }, { scale: scaleAnim }],
            width: `${TAB_W_PERCENT * 0.84}%`,
            backgroundColor: accent + '14',
            borderColor: accent + '38',
          },
        ]}
      />
      {TABS.map(tb => {
        const active = tab === tb.key;
        const color = active ? accent : TXT3;
        return (
          <Pressable
            key={tb.key}
            style={s.tabItem}
            onPress={() => handleTabPress(tb.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tb.label}
            hitSlop={8}
          >
            <TabIcon name={tb.key} size={21} color={color} />
            <Text style={[s.tabLabel, { color }]} numberOfLines={1}>{tb.label}</Text>
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
    backgroundColor: 'rgba(6,6,7,0.98)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabPill: {
    position: 'absolute',
    top: 8,
    height: TAB_BAR_H - 22,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
