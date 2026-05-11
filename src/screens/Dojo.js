import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, Animated, StatusBar, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { ProgressProvider, useProgress } from '../context/ProgressContext';
import { AmbientBG, FloatingParticles } from '../components/shared/AmbientBG';
import Toast from '../components/shared/Toast';
import RankUpModal from '../components/shared/RankUpModal';
import BossHintModal from '../components/shared/BossHintModal';
import { THEMES, DEFAULT_THEME } from '../theme/themes';
import { TXT3, TAB_BAR_H } from '../theme/tokens';
import { SWORDS } from '../data/gameData';
import HomeScreen from './HomeScreen';
import TrainScreen from './TrainScreen';
import SkillScreen from './SkillScreen';
import ProfileScreen from './ProfileScreen';
import ConfigScreen from './ConfigScreen';
import VoyageLogScreen from './VoyageLogScreen';
import DojoTabBar, { TABS } from '../components/DojoTabBar';
import { setHapticsEnabled, rankUp, bossDefeat, bossFail, themeUnlock } from '../utils/haptics';
import { scheduleRestReminder } from '../services/notificationService';
import { initAudio, playRankUp, setSoundEnabled } from '../services/audioService';
import { useAutoTheme } from '../hooks/useAutoTheme';

const { width: W } = Dimensions.get('window');
export const THEME_KEYS = Object.keys(THEMES);

const EVENT_HANDLERS = {
  rank_up: (ev, { showToast, setPendingRankUp }) => {
    rankUp();
    playRankUp();
    setPendingRankUp(ev.rank);
    showToast({ title: 'RANK UP', body: ev.rank.name });
  },
  boss_completed: (ev, { showToast }) => {
    bossDefeat();
    showToast({ title: 'BOSS DEFEATED', body: `${ev.boss?.name ?? 'Challenge'} · +${ev.boss?.xpReward?.toLocaleString() ?? '?'} XP` });
  },
  boss_failed: (_ev, { showToast }) => {
    bossFail();
    showToast({ title: 'NOTHING HAPPENED.', body: 'Train harder.' });
  },
  boss_hint: (ev, { setBossHint }) => {
    bossFail();
    setBossHint(ev.boss?.name ?? 'this challenge');
  },
  theme_unlocked: (ev, { showToast, setThemeFlash, flashAnim }) => {
    themeUnlock();
    const tc = THEMES[ev.themeKey];
    if (tc) {
      flashAnim.stopAnimation();
      setThemeFlash({ color: tc.accent, key: ev.themeKey });
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.delay(600),
        Animated.timing(flashAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setThemeFlash(null); });
    }
    showToast({ title: 'THEME UNLOCKED', body: tc?.name ?? ev.themeKey });
  },
  data_reset: (_ev, { showToast }) => {
    showToast({ title: 'DATA RESET', body: 'Progress was reset. A backup was saved.' });
  },
  technique_unlocked: (ev, { showToast }) => {
    showToast({ title: 'TECHNIQUE UNLOCKED', body: `${ev.reward?.kanji} · ${ev.reward?.name}` });
  },
  title_earned: (ev, { showToast }) => {
    showToast({ title: 'TITLE EARNED', body: `${ev.tier?.kanji} · ${ev.tier?.name}` });
  },
  week_completed: (ev, { showToast }) => {
    showToast({ title: 'WEEK COMPLETE', body: `Week ${ev.weekNum} · ${SWORDS[ev.path]?.name}` });
  },
  bounty_completed: (ev, { showToast }) => {
    showToast({ title: 'BOUNTY CLAIMED', body: `${ev.bounty?.kanji} · +${ev.bounty?.xpReward} XP` });
  },
  arc_week_complete: (ev, { showToast }) => {
    showToast({ title: 'ARC WEEK DONE', body: `Week ${ev.weekNum} complete` });
  },
  arc_completed: (ev, { showToast }) => {
    showToast({ title: 'ARC COMPLETE', body: `${ev.arc?.name} · +${ev.arc?.xpReward?.toLocaleString()} XP` });
  },
};

function DojoInner() {
  const { progress, tab, setTab, handleUpdate, clearPendingEvents } = useProgress();
  const [toast, setToast] = useState(null);
  const [pendingRankUp, setPendingRankUp] = useState(null);
  const [bossHint, setBossHint] = useState(null);
  const [themeFlash, setThemeFlash] = useState(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);
  const tabAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);

  useAutoTheme(progress, handleUpdate);

  useEffect(() => {
    if (progress?.settings) {
      initAudio();
      setHapticsEnabled(progress.settings.hapticsEnabled !== false);
      setSoundEnabled(progress.settings.soundEnabled !== false);
    }
  }, [progress?.settings]);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const idx = TABS.findIndex(tb => tb.key === tab);
    Animated.spring(tabAnim, { toValue: idx, tension: 90, friction: 14, useNativeDriver: false }).start();
  }, [tab]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const idx = TABS.findIndex(tb => tb.key === tab);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: idx * W, animated: true, duration: 320 });
    }
  }, [tab]);

  const showToast = useCallback(({ title, body }) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ title, body });
    toastOpacity.setValue(0);
    Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
  }, [toastOpacity]);

  useEffect(() => {
    if (!progress) return;
    if ((progress.recoveryScore ?? 100) < 20 && progress.settings?.morningReminder) {
      scheduleRestReminder(progress.settings.reminderTime || '20:00');
    }
  }, [progress]);

  useEffect(() => {
    if (!progress) return;
    const events = progress._pendingEvents || [];
    if (events.length === 0) return;
    const ctx = { showToast, setPendingRankUp, setBossHint, setThemeFlash, flashAnim };
    for (const ev of events) {
      EVENT_HANDLERS[ev.type]?.(ev, ctx);
    }
    clearPendingEvents();
  }, [progress, showToast, clearPendingEvents, flashAnim]);

  if (!progress) {
    return (
      <View style={s.loading} accessibilityLabel="Loading application">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Text style={s.loadingKanji}>三刀流</Text>
        <Text style={s.loadingLabel}>LOADING</Text>
      </View>
    );
  }

  const currentTheme = progress.settings?.theme || DEFAULT_THEME;
  const themeData = THEMES[currentTheme] || THEMES[DEFAULT_THEME];
  const TAB_W = W / TABS.length;
  const indicatorLeft = tabAnim.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => i * TAB_W + TAB_W * 0.1),
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <AmbientBG theme={currentTheme} />
      <FloatingParticles theme={currentTheme} count={currentTheme === 'hollow' ? 28 : currentTheme === 'solar' ? 32 : 16} />

      <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / W);
            const targetTab = TABS[idx]?.key;
            if (targetTab && targetTab !== tab) {
              setTab(targetTab);
            }
          }}
          decelerationRate="fast"
          contentContainerStyle={{ width: W * TABS.length }}
        >
          <View style={{ width: W, paddingBottom: TAB_BAR_H }}><HomeScreen /></View>
          <View style={{ width: W, paddingBottom: TAB_BAR_H }}><TrainScreen /></View>
          <View style={{ width: W, paddingBottom: TAB_BAR_H }}><SkillScreen /></View>
          <View style={{ width: W, paddingBottom: TAB_BAR_H }}><ProfileScreen /></View>
          <View style={{ width: W, paddingBottom: TAB_BAR_H }}><VoyageLogScreen /></View>
          <View style={{ width: W, paddingBottom: TAB_BAR_H }}><ConfigScreen /></View>
        </ScrollView>

      <DojoTabBar
        tab={tab}
        setTab={setTab}
        indicatorLeft={indicatorLeft}
        t={themeData}
      />

      {themeFlash && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, {
            backgroundColor: themeFlash.color + '40',
            opacity: flashAnim,
            zIndex: 100,
          }]}
        />
      )}
      <Toast toast={toast} toastAnim={toastOpacity} />
      <RankUpModal rank={pendingRankUp} visible={!!pendingRankUp} onDismiss={() => setPendingRankUp(null)} />
      <BossHintModal visible={!!bossHint} bossName={bossHint} onDismiss={() => setBossHint(null)} />
    </View>
  );
}

export default function Dojo() {
  return (
    <ProgressProvider>
      <DojoInner />
    </ProgressProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, backgroundColor: '#060303', alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingKanji: { color: '#E52030', fontSize: 60, fontWeight: '900', letterSpacing: 2 },
  loadingLabel: { color: TXT3, fontSize: 9, letterSpacing: 6, fontWeight: '700' },
});