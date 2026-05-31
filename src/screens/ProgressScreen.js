import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, Alert } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import { Panel, MetricTile, ProgressRail, ScreenHeader, SoftDivider } from '../components/premium/PremiumUI';
import SparkLine from '../components/shared/charts/SparkLine';
import { THEMES, THEME_KEYS, DEFAULT_THEME } from '../theme/themes';
import { TXT1, TXT2, TXT3, SB_H, TAB_BAR_H, GOLD } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import {
  currentStreak,
  currentWeekView,
  generateVoyageChronicle,
  rankIndexFor,
  recentSessions,
  toDateKey,
  parseDateKey,
} from '../logic/progression';
import { RANKS, SWORDS, REWARDS, TITLE_PATHS } from '../data/gameData';
import { getUnlockedThemes, THEME_UNLOCK_HINTS } from '../storage/progressStore';
import { lightImpact, mediumImpact, heavyImpact, setHapticsEnabled } from '../utils/haptics';
import { setSoundEnabled } from '../services/audioService';
import { getLastNDays, shortDay } from '../utils/trendCalculations';

const { width: W } = Dimensions.get('window');
const CHART_W = W - 64;

function Segment({ value, onChange, accent }) {
  const items = [
    ['story', 'Story'],
    ['body', 'Body'],
    ['settings', 'Settings'],
  ];
  return (
    <View style={s.segment}>
      {items.map(([key, label]) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[s.segmentItem, active && { backgroundColor: accent + '18' }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[s.segmentText, active && { color: accent }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Toggle({ value, onPress, accent, label }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      style={[s.toggle, value && { backgroundColor: accent }]}
    >
      <View style={[s.toggleThumb, value && { alignSelf: 'flex-end' }]} />
    </Pressable>
  );
}

function ProgressScreen() {
  const { progress, today, theme, handleUpdate, onReset } = useProgress();
  const [view, setView] = useState('story');
  const handleLostQuote = () => {
    const quotes = [
      "“I'm not lost. Everyone else is lost.”",
      "“Is the dojo moving? I was walking straight!”",
      "“Who said North was up? That makes no sense.”",
      "“Are we there yet? Follow the smell of sake...”",
      "“Which way is east? I'll just walk towards the sword.”",
      "“What? Did you get lost again? Follow me! Wait, where is the exit?”"
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    heavyImpact();
    Alert.alert("Zoro's Directional Sense", randomQuote, [{ text: "Got it (了解)" }]);
  };
  const settings = progress.settings || {};
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];
  const rankIdx = rankIndexFor(progress.totalXP);
  const rank = RANKS[rankIdx];
  const nextRank = RANKS[rankIdx + 1];
  const xpInto = progress.totalXP - rank.min;
  const xpFor = (nextRank?.min ?? rank.max) - rank.min;
  const xpPct = Math.min(1, xpInto / (Number.isFinite(xpFor) ? xpFor : 1));
  const week = currentWeekView(progress, today);
  const sessions = recentSessions(progress, 5);
  const streak = currentStreak(progress, today);
  const totalCalories = (progress.sessions || []).reduce((sum, session) => sum + (session.calories || 0), 0);
  const days14 = useMemo(() => getLastNDays(today, 14), [today]);
  const xpTrend = useMemo(() => days14.map(day =>
    (progress.sessions || [])
      .filter(session => session.endedAt && toDateKey(new Date(session.endedAt)) === day)
      .reduce((sum, session) => sum + (session.xpEarned || 0), 0)
  ), [days14, progress.sessions]);
  const currentMonthKey = today.slice(0, 7);
  const currentChronicle = (progress.voyageChronicles || []).find(c => c.monthKey === currentMonthKey);
  const unlockedThemes = useMemo(() => getUnlockedThemes(progress), [progress]);
  const earnedRewards = REWARDS.filter(reward => progress.unlocked?.includes(reward.id)).slice(-6);

  const setSetting = (key, value) => {
    handleUpdate(prev => ({ ...prev, settings: { ...prev.settings, [key]: value } }));
  };

  const triggerThemedHaptic = (themeKey) => {
    switch (themeKey) {
      case 'wado':
        lightImpact();
        break;
      case 'sandai':
        heavyImpact();
        setTimeout(() => heavyImpact(), 100);
        setTimeout(() => heavyImpact(), 200);
        break;
      case 'shusui':
        heavyImpact();
        setTimeout(() => lightImpact(), 120);
        break;
      case 'hollow':
        lightImpact();
        setTimeout(() => lightImpact(), 250);
        break;
      case 'solar':
        lightImpact();
        setTimeout(() => lightImpact(), 80);
        setTimeout(() => lightImpact(), 160);
        break;
      case 'abyss':
        heavyImpact();
        setTimeout(() => lightImpact(), 300);
        break;
      default:
        lightImpact();
        break;
    }
  };

  const generateStory = () => {
    const chronicle = generateVoyageChronicle(progress, currentMonthKey);
    const existing = (progress.voyageChronicles || []).filter(c => c.monthKey !== currentMonthKey);
    handleUpdate(prev => ({ ...prev, voyageChronicles: [...existing, chronicle].slice(-36) }));
    lightImpact();
  };

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingTop: SB_H + 18 }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="Progress"
        title="Your training story"
        subtitle="Rank, recovery, voyage history, and settings in one quiet place."
        accent={t.accent}
        mark="録"
      />

      <Segment value={view} onChange={setView} accent={t.accent} />

      {view === 'story' && (
        <>
          <Panel accent={rank.color} style={s.rankPanel}>
            <View style={s.rankHeader}>
              <View>
                <Text style={[s.rankTitle, { color: rank.color }]}>{rank.name}</Text>
                <Text style={s.rankSub}>{progress.totalXP.toLocaleString()} lifetime XP</Text>
              </View>
              <Text style={[s.rankGlyph, { color: rank.color }]}>{rank.kanji || '段'}</Text>
            </View>
            <ProgressRail pct={xpPct} accent={rank.color} style={s.rankRail} />
            <Text style={s.rankNext}>
              {nextRank ? `${(nextRank.min - progress.totalXP).toLocaleString()} XP to ${nextRank.name}` : 'Maximum rank reached'}
            </Text>
          </Panel>

          <View style={s.metricRow}>
            <MetricTile label="Streak" value={streak} detail="days" accent={GOLD} mark="連" />
            <MetricTile label="Sessions" value={(progress.sessions || []).length} detail="all time" accent={t.accent} mark="戦" />
          </View>
          <View style={s.metricRow}>
            <MetricTile label="Calories" value={Math.round(totalCalories).toLocaleString()} detail="burned" accent="#F59E0B" mark="火" />
            <MetricTile label="Chronicles" value={(progress.voyageChronicles || []).length} detail="stories" accent="#B967FF" mark="記" />
          </View>

          <Panel accent={t.accent} dim>
            <View style={s.panelHeaderRow}>
              <Text style={s.sectionTitle}>Weekly evolution</Text>
              <Text style={s.sectionMeta}>This week</Text>
            </View>
            <View style={s.weekBars}>
              {week.map(day => {
                const color = day.dominant ? SWORDS[day.dominant].accent : 'rgba(255,255,255,0.14)';
                const height = day.total > 0 ? Math.max(12, day.total * 18) : 8;
                return (
                  <View key={day.date} style={s.weekCol}>
                    <View style={s.weekTrack}>
                      <View style={[s.weekFill, { height: Math.min(74, height), backgroundColor: color }]} />
                    </View>
                    <Text style={[s.weekLabel, day.isToday && { color: t.accent }]}>{shortDay(day.date)}</Text>
                  </View>
                );
              })}
            </View>
          </Panel>

          <Panel accent="#B967FF" dim>
            <View style={s.panelHeaderRow}>
              <Text style={s.sectionTitle}>XP history</Text>
              <Text style={s.sectionMeta}>14 days</Text>
            </View>
            <SparkLine data={xpTrend} color="#B967FF" width={CHART_W} height={58} dotRadius={2.5} />
          </Panel>

          <Panel accent="#B967FF" dim>
            <View style={s.panelHeaderRow}>
              <Text style={s.sectionTitle}>Voyage chronicle</Text>
              {!currentChronicle && (
                <Pressable onPress={generateStory}>
                  <Text style={[s.actionText, { color: '#B967FF' }]}>Generate</Text>
                </Pressable>
              )}
            </View>
            <Text style={s.storyText}>
              {currentChronicle
                ? currentChronicle.narrative
                : 'Create this month’s anime-style training recap when you are ready.'}
            </Text>
          </Panel>

          <Panel accent={t.accent} dim>
            <Text style={s.sectionTitle}>Recent timeline</Text>
            {sessions.length === 0 && <Text style={s.emptyText}>No sessions yet. Your first chapter starts with Begin Training.</Text>}
            {sessions.map((session, index) => {
              const sword = SWORDS[session.discipline];
              return (
                <View key={session.id} style={s.timelineRow}>
                  <View style={[s.timelineDot, { backgroundColor: sword.accent }]} />
                  {index < sessions.length - 1 && <View style={s.timelineLine} />}
                  <View style={{ flex: 1 }}>
                    <Text style={s.timelineTitle}>{sword.name}</Text>
                    <Text style={s.timelineMeta}>
                      +{session.xpEarned || 0} XP · {Math.round((session.calories || 0))} kcal
                    </Text>
                  </View>
                </View>
              );
            })}
          </Panel>

          <Panel accent="#F59E0B" dim>
            <Text style={s.sectionTitle}>Achievement gallery</Text>
            <View style={s.gallery}>
              {(progress.earnedTitles || []).slice(-4).map(title => {
                const path = TITLE_PATHS[title.path];
                const tier = path?.tiers.find(t => t.weeks === title.weeks);
                if (!tier) return null;
                return (
                  <View key={`${title.path}-${title.weeks}`} style={s.galleryItem}>
                    <Text style={[s.galleryKanji, { color: path.color }]}>{tier.kanji}</Text>
                    <Text style={s.galleryName} numberOfLines={2}>{tier.name}</Text>
                  </View>
                );
              })}
              {earnedRewards.map(reward => (
                <View key={reward.id} style={s.galleryItem}>
                  <Text style={[s.galleryKanji, { color: '#B967FF' }]}>{reward.kanji}</Text>
                  <Text style={s.galleryName} numberOfLines={2}>{reward.name}</Text>
                </View>
              ))}
              {(progress.earnedTitles || []).length === 0 && earnedRewards.length === 0 && (
                <Text style={s.emptyText}>Titles and techniques will appear here as your story grows.</Text>
              )}
            </View>
          </Panel>
        </>
      )}

      {view === 'body' && (
        <>
          <Panel accent={t.accent}>
            <Text style={s.sectionTitle}>Body signal</Text>
            <View style={s.metricRowNoMargin}>
              <MetricTile label="Recovery" value={progress.recoveryScore} detail="readiness" accent={t.accent} mark="気" />
              <MetricTile label="Weight" value={progress.bodyStats?.weight || '—'} detail={progress.bodyStats?.unit || 'kg'} accent="#F59E0B" mark="体" />
            </View>
          </Panel>

          <Panel accent="#C5A059" dim>
            <Text style={s.sectionTitle}>Sake & Hydration Barrel · 酒樽</Text>
            <View style={s.hydrationRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(cup => {
                const current = progress.hydrationLog?.[today]?.cups || 0;
                const isFilled = cup <= current;
                return (
                  <Pressable
                    key={cup}
                    onPress={() => {
                      handleUpdate(prev => ({
                        ...prev,
                        hydrationLog: { ...prev.hydrationLog, [today]: { cups: current === cup ? cup - 1 : cup } },
                      }));
                      lightImpact();
                    }}
                    style={[
                      s.masuCup,
                      isFilled && s.masuCupFilled
                    ]}
                  >
                    <Text style={[s.masuText, isFilled && s.masuTextFilled]}>酒</Text>
                  </Pressable>
                );
              })}
            </View>
          </Panel>

          <Panel accent="#D4A853" dim>
            <Text style={s.sectionTitle}>Sleep and mood</Text>
            <View style={s.bodyRows}>
              <View style={s.bodyRow}>
                <Text style={s.bodyLabel}>Sleep</Text>
                <Text style={s.bodyValue}>{progress.sleepLog?.[today]?.hours ?? '—'}h</Text>
              </View>
              <SoftDivider />
              <View style={s.bodyRow}>
                <Text style={s.bodyLabel}>Energy</Text>
                <Text style={s.bodyValue}>{progress.moodLog?.[today]?.energy ?? '—'}/10</Text>
              </View>
              <SoftDivider />
              <View style={s.bodyRow}>
                <Text style={s.bodyLabel}>Mood</Text>
                <Text style={s.bodyValue}>{progress.moodLog?.[today]?.mood ?? '—'}/10</Text>
              </View>
            </View>
          </Panel>
        </>
      )}

      {view === 'settings' && (
        <>
          <Panel accent={t.accent}>
            <Text style={s.sectionTitle}>Theme</Text>
            <View style={s.themeGrid}>
              {THEME_KEYS.map(key => {
                const tc = THEMES[key];
                const active = key === theme;
                const locked = !unlockedThemes.includes(key);
                return (
                  <Pressable
                    key={key}
                    disabled={locked}
                    onPress={() => {
                      setSetting('theme', key);
                      triggerThemedHaptic(key);
                    }}
                    style={[
                      s.themeTile,
                      active && { backgroundColor: tc.accent + '16', borderColor: tc.accent + '35' },
                      locked && { opacity: 0.36 },
                    ]}
                  >
                    <View style={[s.themeSwatch, { backgroundColor: tc.accent }]} />
                    <Text style={[s.themeName, active && { color: tc.accent }]}>{tc.name.split('·')[0].trim()}</Text>
                    <Text style={s.themeHint} numberOfLines={2}>{locked ? THEME_UNLOCK_HINTS[key] || 'Locked' : tc.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Panel>

          {[
            ['soundEnabled', 'Sound effects', '#B967FF', value => setSoundEnabled(value)],
            ['hapticsEnabled', 'Haptics', '#F59E0B', value => setHapticsEnabled(value)],
            ['autoTheme', 'Auto theme', '#38BDF8'],
          ].map(([key, label, color, sideEffect]) => {
            const enabled = key === 'soundEnabled' || key === 'hapticsEnabled'
              ? settings[key] !== false
              : !!settings[key];
            return (
              <Panel key={key} accent={color} dim>
                <View style={s.settingRow}>
                  <View>
                    <Text style={s.settingTitle}>{label}</Text>
                    <Text style={s.settingSub}>Daily-driver preference</Text>
                  </View>
                  <Toggle
                    value={enabled}
                    accent={color}
                    label={label}
                    onPress={() => {
                      const next = !enabled;
                      setSetting(key, next);
                      sideEffect?.(next);
                      lightImpact();
                    }}
                  />
                </View>
              </Panel>
            );
          })}

          <Panel accent={t.accent} dim>
            <Text style={s.sectionTitle}>Training defaults</Text>
            <View style={s.optionRow}>
              {[3, 5, 7, 9].map(v => (
                <Pressable
                  key={v}
                  onPress={() => setSetting('defaultIntensity', v)}
                  style={[s.optionPill, settings.defaultIntensity === v && { backgroundColor: t.accent + '18' }]}
                >
                  <Text style={[s.optionText, settings.defaultIntensity === v && { color: t.accent }]}>{v}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[s.sectionTitle, { marginTop: DS.space.lg }]}>Step goal</Text>
            <View style={s.optionRow}>
              {[5000, 8000, 10000, 15000].map(v => (
                <Pressable
                  key={v}
                  onPress={() => setSetting('stepGoal', v)}
                  style={[s.optionPill, settings.stepGoal === v && { backgroundColor: '#FB7185' + '18' }]}
                >
                  <Text style={[s.optionText, settings.stepGoal === v && { color: '#FB7185' }]}>{v >= 10000 ? `${v / 1000}K` : v}</Text>
                </Pressable>
              ))}
            </View>
          </Panel>

          <Panel accent="#C5A059" dim>
            <Text style={s.settingTitle}>Lost your way? · 迷子</Text>
            <Text style={s.settingSub}>Zoro&apos;s compass is always spinning. Tap here if you are lost.</Text>
            <Pressable onPress={handleLostQuote} style={s.lostButton}>
              <Text style={[s.lostText, { color: t.accent }]}>Help, I&apos;m lost! (迷子になった)</Text>
            </Pressable>
          </Panel>

          <Panel accent="#F87171" dim>
            <Text style={s.settingTitle}>Reset progress</Text>
            <Text style={s.settingSub}>Clears your local training story.</Text>
            <Pressable onPress={onReset} style={s.resetButton}>
              <Text style={s.resetText}>Reset all progress</Text>
            </Pressable>
          </Panel>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: DS.space.md,
    paddingBottom: TAB_BAR_H + DS.space.xl,
    gap: DS.space.lg,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.055)',
    padding: 5,
    gap: 5,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 18,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { color: TXT3, fontSize: 13, fontWeight: '800' },
  rankPanel: { gap: DS.space.md },
  rankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rankTitle: { fontFamily: DS.font.display, fontSize: 26, fontWeight: '700', letterSpacing: 0.2 },
  rankSub: { color: TXT3, marginTop: 5, fontSize: 13 },
  rankGlyph: { fontSize: 48, fontWeight: '900' },
  rankRail: { marginTop: 2 },
  rankNext: { color: TXT3, fontSize: 12 },
  metricRow: { flexDirection: 'row', gap: DS.space.sm },
  metricRowNoMargin: { flexDirection: 'row', gap: DS.space.sm },
  panelHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.space.sm },
  sectionTitle: { color: TXT2, fontSize: 14, fontWeight: '900', marginBottom: DS.space.sm },
  sectionMeta: { color: TXT3, fontSize: 12, fontWeight: '700' },
  actionText: { fontSize: 13, fontWeight: '900' },
  weekBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: 112 },
  weekCol: { alignItems: 'center', gap: 8, flex: 1 },
  weekTrack: { height: 80, width: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'flex-end', overflow: 'hidden' },
  weekFill: { width: '100%', borderRadius: 9 },
  weekLabel: { color: TXT3, fontSize: 11, fontWeight: '800' },
  storyText: { color: TXT2, fontSize: 14, lineHeight: 22 },
  timelineRow: { flexDirection: 'row', gap: DS.space.md, minHeight: 58, position: 'relative' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  timelineLine: { position: 'absolute', left: 5.5, top: 19, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.10)' },
  timelineTitle: { color: TXT1, fontSize: 14, fontWeight: '800' },
  timelineMeta: { color: TXT3, fontSize: 12, marginTop: 3 },
  emptyText: { color: TXT3, fontSize: 13, lineHeight: 20 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: DS.space.sm },
  galleryItem: { width: '31%', minHeight: 92, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.045)', padding: DS.space.sm },
  galleryKanji: { fontSize: 22, fontWeight: '900' },
  galleryName: { color: TXT3, fontSize: 11, fontWeight: '700', marginTop: 8 },
  hydrationRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: DS.space.sm },
  masuCup: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#C5A059',
    backgroundColor: 'rgba(197, 160, 89, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  masuCupFilled: {
    backgroundColor: '#C5A059',
  },
  masuText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(197, 160, 89, 0.5)',
  },
  masuTextFilled: {
    color: '#0A0B0A',
  },
  bodyRows: { gap: DS.space.md },
  bodyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bodyLabel: { color: TXT3, fontSize: 13, fontWeight: '800' },
  bodyValue: { color: TXT1, fontSize: 18, fontWeight: '900' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: DS.space.sm },
  themeTile: { width: (W - 32 - 24) / 3, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)', padding: 12, minHeight: 116, backgroundColor: 'rgba(255,255,255,0.035)' },
  themeSwatch: { width: 28, height: 28, borderRadius: 14, marginBottom: 9 },
  themeName: { color: TXT1, fontSize: 11, fontWeight: '900' },
  themeHint: { color: TXT3, fontSize: 9, lineHeight: 13, marginTop: 5 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingTitle: { color: TXT1, fontSize: 15, fontWeight: '900' },
  settingSub: { color: TXT3, fontSize: 12, marginTop: 4 },
  toggle: { width: 50, height: 30, borderRadius: 15, padding: 4, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: TXT1 },
  optionRow: { flexDirection: 'row', gap: DS.space.sm },
  optionPill: { flex: 1, minHeight: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  optionText: { color: TXT3, fontSize: 14, fontWeight: '900' },
  resetButton: { marginTop: DS.space.md, minHeight: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,113,113,0.14)' },
  resetText: { color: '#F87171', fontSize: 13, fontWeight: '900' },
  lostButton: {
    marginTop: DS.space.md,
    minHeight: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(197, 160, 89, 0.14)',
  },
  lostText: {
    fontSize: 13,
    fontWeight: '900',
  },
});

export default React.memo(ProgressScreen);
