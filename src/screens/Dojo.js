import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, Animated, StatusBar, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { ProgressProvider, useProgress } from '../context/ProgressContext';
import { AmbientBG, FloatingParticles } from '../components/shared/AmbientBG';
import Toast from '../components/shared/Toast';
import RankUpModal from '../components/shared/RankUpModal';
import BossHintModal from '../components/shared/BossHintModal';
import { THEMES, DEFAULT_THEME } from '../theme/themes';
import { TXT3, TAB_BAR_H } from '../theme/tokens';
import { statusBarStyleForTheme } from '../theme/statusBar';
import { SWORDS } from '../data/gameData';
import HomeScreen from './HomeScreen';
import TrainScreen from './TrainScreen';
import SkillScreen from './SkillScreen';
import ProgressScreen from './ProgressScreen';
import WelcomeScreen from './WelcomeScreen';
import DojoTabBar, { TABS } from '../components/DojoTabBar';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import { toDateKey, sanitizeDisplayName, shouldShowWelcome } from '../logic/progression';
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
  // Session-only: Skip dismisses the gate for this launch only, so the welcome
  // screen reappears on the next cold start until the user actually signs in.
  const [authSkipped, setAuthSkipped] = useState(false);
  const [pendingRankUp, setPendingRankUp] = useState(null);
  const [bossHint, setBossHint] = useState(null);
  const [themeFlash, setThemeFlash] = useState(null);
  const [trainingFocus, setTrainingFocus] = useState(false);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);
  // Driven by the pager's onScroll. Holds a fractional tab index (0..TABS.length-1)
  // so the indicator pill tracks the swipe gesture instead of jumping at the end.
  const tabAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const scrollingRef = useRef(false);

  useAutoTheme(progress, handleUpdate);

  useEffect(() => {
    if (progress?.settings) {
      initAudio();
      setHapticsEnabled(progress.settings.hapticsEnabled !== false);
      setSoundEnabled(progress.settings.soundEnabled !== false);
    }
  }, [progress?.settings]);

  // Tab-bar presses set `tab`, which programmatically scrolls the pager. The
  // pager's onScroll then drives `tabAnim` (see onScroll handler below), so the
  // indicator pill animates in lockstep with the page for both swipes and taps.
  useEffect(() => {
    const idx = Math.max(0, TABS.findIndex(tb => tb.key === tab));
    if (scrollRef.current) {
      scrollingRef.current = true;
      scrollRef.current.scrollTo({ x: idx * W, animated: true });
      const timer = setTimeout(() => {
        scrollingRef.current = false;
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [tab]);

  const onPagerScroll = useRef(
    Animated.event(
      [{ nativeEvent: { contentOffset: { x: tabAnim } } }],
      { useNativeDriver: false, listener: undefined },
    ),
  ).current;

  const showToast = useCallback(({ title, body }) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ title, body });
    toastOpacity.setValue(0);
    Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
  }, [toastOpacity]);

  const handleTrainingFocus = useCallback((active) => {
    setTrainingFocus(active);
  }, []);

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

  if (shouldShowWelcome(progress, authSkipped)) {
    return (
      <WelcomeScreen
        theme={currentTheme}
        onSignIn={(name) => {
          const clean = sanitizeDisplayName(name);
          if (!clean) return; // reject names that sanitize to empty
          handleUpdate(prev => ({
            ...prev,
            userProfile: { name: clean, provider: 'local', signedIn: true, createdAt: toDateKey(new Date()) },
          }));
        }}
        onSkip={() => setAuthSkipped(true)}
      />
    );
  }

  const themeData = THEMES[currentTheme] || THEMES[DEFAULT_THEME];
  const TAB_W = (W - 20) / TABS.length;
  // tabAnim is in scroll-x pixels (0..W*(TABS.length-1)); convert to indicator
  // px by interpolating across the same range. Anchor inputs to page boundaries
  // so partial swipes produce the right intermediate offset.
  const indicatorLeft = tabAnim.interpolate({
    inputRange: TABS.map((_, i) => i * W),
    outputRange: TABS.map((_, i) => i * TAB_W + TAB_W * 0.08),
    extrapolate: 'clamp',
  });

  return (
    <View style={[s.root, { backgroundColor: themeData.bg }]}>
      <StatusBar barStyle={statusBarStyleForTheme(currentTheme)} backgroundColor="transparent" translucent />
      <AmbientBG theme={currentTheme} />
      <FloatingParticles theme={currentTheme} count={currentTheme === 'hollow' ? 28 : currentTheme === 'solar' ? 32 : 16} />

      <ScrollView
          ref={scrollRef}
          style={s.pager}
          horizontal
          pagingEnabled
          scrollEnabled={!trainingFocus}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onPagerScroll}
          onMomentumScrollEnd={(e) => {
            if (scrollingRef.current) return;
            const idx = Math.round(e.nativeEvent.contentOffset.x / W);
            const targetTab = TABS[idx]?.key;
            if (targetTab && targetTab !== tab) {
              setTab(targetTab);
            }
          }}
          decelerationRate="fast"
          contentContainerStyle={{ width: W * TABS.length }}
        >
          <View style={{ width: W, paddingBottom: TAB_BAR_H }}><ErrorBoundary><HomeScreen /></ErrorBoundary></View>
          <View style={{ width: W, paddingBottom: trainingFocus ? 0 : TAB_BAR_H }}>
            <ErrorBoundary><TrainScreen onFocusModeChange={handleTrainingFocus} /></ErrorBoundary>
          </View>
          <View style={{ width: W, paddingBottom: TAB_BAR_H }}><ErrorBoundary><SkillScreen /></ErrorBoundary></View>
          <View style={{ width: W, paddingBottom: TAB_BAR_H }}><ErrorBoundary><ProgressScreen /></ErrorBoundary></View>
        </ScrollView>

      {!trainingFocus && (
        <DojoTabBar
          tab={tab}
          setTab={setTab}
          indicatorLeft={indicatorLeft}
          t={themeData}
        />
      )}

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
  pager: { flex: 1, position: 'relative', zIndex: 1 },
  loading: { flex: 1, backgroundColor: '#060606', alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingKanji: { color: '#F5F5F5', fontSize: 60, fontWeight: '900', letterSpacing: 2 },
  loadingLabel: { color: TXT3, fontSize: 9, letterSpacing: 6, fontWeight: '700' },
});
