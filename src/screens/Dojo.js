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
import HomeScreen from './HomeScreen';
import TrainScreen from './TrainScreen';
import SkillScreen from './SkillScreen';
import ProgressScreen from './ProgressScreen';
import WelcomeScreen from './WelcomeScreen';
import DojoTabBar, { TABS } from '../components/DojoTabBar';
import { useToast } from '../components/ToastWrapper';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import { toDateKey, sanitizeDisplayName, shouldShowWelcome } from '../logic/progression';
import { buildEventHandlers } from '../logic/eventHandlers';
import { setHapticsEnabled } from '../utils/haptics';
import { initAudio, setSoundEnabled } from '../services/audioService';
import { useAutoTheme } from '../hooks/useAutoTheme';

const { width: W } = Dimensions.get('window');
export const THEME_KEYS = Object.keys(THEMES);

function DojoInner({ toast, toastOpacity }) {
  const { progress, tab, setTab, handleUpdate, clearPendingEvents, showToast } = useProgress();
  // Session-only: Skip dismisses the gate for this launch only, so the welcome
  // screen reappears on the next cold start until the user actually signs in.
  const [authSkipped, setAuthSkipped] = useState(false);
  const [pendingRankUp, setPendingRankUp] = useState(null);
  const [bossHint, setBossHint] = useState(null);
  const [themeFlash, setThemeFlash] = useState(null);
  const [trainingFocus, setTrainingFocus] = useState(false);
  const flashAnim = useRef(new Animated.Value(0)).current;
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

  const handleTrainingFocus = useCallback((active) => {
    setTrainingFocus(active);
  }, []);

  useEffect(() => {
    if (!progress) return;
    const events = progress._pendingEvents || [];
    if (events.length === 0) return;
    const ctx = { showToast, setPendingRankUp, setBossHint, setThemeFlash, flashAnim };
    const handlers = buildEventHandlers(ctx);
    for (const ev of events) {
      handlers[ev.type]?.(ev);
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
  // The toast lives above the provider so context `showToast` (used by Train,
  // breathing, and arc-start) routes to the same animated toast as the
  // event-driven ones — previously the provider had no toastCallback and those
  // toasts were silently dropped.
  const { toast, toastOpacity, showToast } = useToast();
  return (
    <ProgressProvider toastCallback={showToast}>
      <DojoInner toast={toast} toastOpacity={toastOpacity} />
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
