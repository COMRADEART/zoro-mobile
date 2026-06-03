import React, { useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { NAV_SAFE_BOTTOM, TXT3, TAB_BAR_H } from '../theme/tokens';

export const TABS = [
  { key: 'home', label: 'Home', icon: '家', hint: 'Home dashboard' },
  { key: 'train', label: 'Train', icon: '剣', hint: 'Training session' },
  { key: 'skill', label: 'Skills', icon: '技', hint: 'Skill map' },
  { key: 'progress', label: 'Progress', icon: '録', hint: 'Progress and settings' },
];

export default function DojoTabBar({ tab, setTab, indicatorLeft, t }) {
  const TAB_W_PERCENT = 100 / TABS.length;
  const accent = t?.accent || '#F0F0F0';
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
    <View
      style={[
        s.tabBar,
        {
          borderColor: accent + '18',
          shadowColor: accent,
        },
      ]}
      accessibilityRole="tablist"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          s.tabPill,
          {
            transform: [
              { translateX: indicatorLeft },
              { scale: scaleAnim },
            ],
            width: `${TAB_W_PERCENT * 0.84}%`,
            backgroundColor: accent + '16',
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
            accessibilityLabel={tb.hint}
            android_ripple={{ color: accent + '22', borderless: false }}
            hitSlop={8}
          >
            <View style={[s.iconContainer, active && { backgroundColor: accent + '18' }]}>
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
    bottom: NAV_SAFE_BOTTOM,
    left: 10,
    right: 10,
    height: TAB_BAR_H - NAV_SAFE_BOTTOM - 12,
    backgroundColor: 'rgba(7,8,10,0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 30,
    elevation: 18,
    zIndex: 20,
  },
  tabPill: {
    position: 'absolute',
    top: 7,
    height: TAB_BAR_H - NAV_SAFE_BOTTOM - 26,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 58,
  },
  iconContainer: {
    width: 38,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  tabIcon: {
    fontSize: 19,
    fontWeight: '900',
    color: TXT3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
    color: TXT3,
  },
});
