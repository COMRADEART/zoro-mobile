import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, Alert } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import { Panel, MetricTile, ProgressRail, ScreenHeader, SoftDivider } from '../components/premium/PremiumUI';
import SparkLine from '../components/shared/charts/SparkLine';
import { THEMES, THEME_KEYS, DEFAULT_THEME } from '../theme/themes';
import type { ThemeTokens } from '../theme/themes';
import { TXT1, TXT2, TXT3, SB_H, TAB_BAR_H, GOLD } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import {
  currentStreak,
  currentWeekView,
  generateVoyageChronicle,
  rankIndexFor,
  recentSessions,
  toDateKey,
} from '../logic/progression';
import { RANKS, SWORDS, REWARDS, TITLE_PATHS } from '../data/gameData';
import { getUnlockedThemes, THEME_UNLOCK_HINTS } from '../storage/progressStore';
import { lightImpact, heavyImpact, setHapticsEnabled } from '../utils/haptics';
import { setSoundEnabled } from '../services/audioService';
import { scheduleTrainingReminder, cancelAllReminders } from '../services/notificationService';
import { getLastNDays, shortDay } from '../utils/trendCalculations';
import type { Session, VoyageChronicle } from '../types';

const { width: W } = Dimensions.get('window');
const CHART_W = W - 64;

const REMINDER_TIMES = [
  { value: '07:00', label: '7 AM' },
  { value: '12:00', label: '12 PM' },
  { value: '18:00', label: '6 PM' },
  { value: '21:00', label: '9 PM' },
];
const DEFAULT_REMINDER_TIME = '18:00';

interface SegmentProps {
  value: string;
  onChange: (key: string) => void;
  accent: string;
}

function Segment({ value, onChange, accent }: SegmentProps) {
  const items: [string, string][] = [
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
            accessibilityLabel={`${label} tab${active ? ', selected' : ''}`}
          >
            <Text style={[s.segmentText, active && { color: accent }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface ToggleProps {
  value: boolean;
  onPress: () => void;
  accent: string;
  label: string;
}

function Toggle({ value, onPress, accent, label }: ToggleProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      accessibilityValue={{ text: value ? 'on' : 'off' }}
      hitSlop={DS.hitSlop}
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
      "\u201cI'm not lost. Everyone else is lost.\u201d",
      "\u201cIs the dojo moving? I was walking straight!\u201d",
      "\u201cWho said North was up? That makes no sense.\u201d",
      "\u201cAre we there yet? Follow the smell of sake...\u201d",
      "\u201cWhich way is east? I'll just walk towards the sword.\u201d",
      "\u201cWhat? Did you get lost again? Follow me! Wait, where is the exit?\u201d"
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    heavyImpact();
    Alert.alert("Zoro's Directional Sense", randomQuote, [{ text: "Got it (\u4e86\u89e3)" }]);
  };
  const settings = (progress.settings || {}) as Record<string, unknown>;
  const t: ThemeTokens = THEMES[theme] || THEMES[DEFAULT_THEME];
  const rankIdx = rankIndexFor(progress.totalXP);
  const rank = RANKS[rankIdx];
  const nextRank = RANKS[rankIdx + 1];
  const xpInto = progress.totalXP - rank.min;
  const xpFor = (nextRank?.min ?? rank.max) - rank.min;
  const xpPct = Math.min(1, xpInto / (Number.isFinite(xpFor) ? xpFor : 1));
  const week = currentWeekView(progress, today);
  const sessions = recentSessions(progress, 5);
  const streak = currentStreak(progress, today);
  const totalCalories = useMemo(
    () => (progress.sessions || []).reduce((sum: number, session: Session) => sum + (session.calories || 0), 0),
    [progress.sessions],
  );
  const days14 = useMemo(() => getLastNDays(today, 14), [today]);
  const xpTrend = useMemo(() => days14.map(day =>
    (progress.sessions || [])
      .filter((session: Session) => session.endedAt && toDateKey(new Date(session.endedAt)) === day)
      .reduce((sum: number, session: Session) => sum + (session.xpEarned || 0), 0)
  ), [days14, progress.sessions]);
  const currentMonthKey = today.slice(0, 7);
  const currentChronicle = (progress.voyageChronicles || []).find((c: VoyageChronicle) => c.monthKey === currentMonthKey);
  const unlockedThemes = useMemo(() => getUnlockedThemes(progress), [progress]);
  const earnedRewards = useMemo(() => REWARDS.filter(reward => progress.unlocked?.includes(reward.id)).slice(-6), [progress.unlocked]);

  const setSetting = (key: string, value: unknown) => {
    handleUpdate(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
        // A manual theme choice overrides auto-switching so the selection sticks.
        ...(key === 'theme' ? { autoTheme: false } : {}),
      },
    }));
  };

  const generateStory = () => {
    const chronicle = generateVoyageChronicle(progress, currentMonthKey);
    const existing = (progress.voyageChronicles || []).filter((c: VoyageChronicle) => c.monthKey !== currentMonthKey);
    handleUpdate(prev => ({ ...prev, voyageChronicles: [...existing, chronicle as VoyageChronicle].slice(-36) }));
    lightImpact();
  };

  const reminderTime: string = (settings.reminderTime as string) || DEFAULT_REMINDER_TIME;
  const reminderLabel = REMINDER_TIMES.find(r => r.value === reminderTime)?.label || '6 PM';

  const toggleTrainingReminder = async () => {
    lightImpact();
    if (settings.trainingReminder) {
      await cancelAllReminders();
      setSetting('trainingReminder', false);
      return;
    }
    const scheduled = await scheduleTrainingReminder(reminderTime);
    if (scheduled) {
      setSetting('trainingReminder', true);
    } else {
      Alert.alert(
        'Reminders need notifications',
        'Allow notifications for Santoryu in your device settings to get a daily training reminder. (Reminders require a development or production build, not Expo Go.)',
      );
    }
  };

  const changeReminderTime = async (time: string) => {
    lightImpact();
    setSetting('reminderTime', time);
    if (settings.trainingReminder) {
      await scheduleTrainingReminder(time);
    }
  };

  const confirmReset = () => {
    heavyImpact();
    Alert.alert(
      'Reset all progress?',
      'This permanently clears your ranks, streaks, sessions, and unlocks on this device. A safety backup is kept, but this cannot be undone from the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset everything', style: 'destructive', onPress: onReset },
      ],
    );
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
              <Text style={[s.rankGlyph, { color: rank.color }]}>{'段'}</Text>
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
            <MetricTile label="Calories" value={Math.round(totalCalories).toLocaleString()} detail="burned" accent="#CFCFCF" mark="火" />
            <MetricTile label="Chronicles" value={(progress.voyageChronicles || []).length} detail="stories" accent="#D8D8D8" mark="記" />
          </View>

          <Panel accent={t.accent} dim>
            <View style={s.panelHeaderRow}>
              <Text style={s.sectionTitle}>Weekly evolution</Text>
              <Text style={s.sectionMeta}>This week</Text>
            </View>
            <View style={s.weekBars}>
              {week.map((day) => {
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

          <Panel accent="#D8D8D8" dim>
            <View style={s.panelHeaderRow}>
              <Text style={s.sectionTitle}>XP history</Text>
              <Text style={s.sectionMeta}>14 days</Text>
            </View>
            <SparkLine data={xpTrend} color="#D8D8D8" width={CHART_W} height={58} dotRadius={2.5} />
          </Panel>

          <Panel accent="#D8D8D8" dim>
            <View style={s.panelHeaderRow}>
              <Text style={s.sectionTitle}>Voyage chronicle</Text>
              {!currentChronicle && (
                <Pressable onPress={generateStory}>
                  <Text style={[s.actionText, { color: '#D8D8D8' }]}>Generate</Text>
                </Pressable>
              )}
            </View>
            <Text style={s.storyText}>
              {currentChronicle
                ? currentChronicle.narrative
                : 'Create this month\u2019s anime-style training recap when you are ready.'}
            </Text>
          </Panel>

          <Panel accent={t.accent} dim>
            <Text style={s.sectionTitle}>Recent timeline</Text>
            {sessions.length === 0 && <Text style={s.emptyText}>No sessions yet. Your first chapter starts with Begin Training.</Text>}
            {sessions.map((session: Session, index: number) => {
              const sword = SWORDS[session.discipline];
              if (!sword) return null;
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

          <Panel accent="#CFCFCF" dim>
            <Text style={s.sectionTitle}>Achievement gallery</Text>
            <View style={s.gallery}>
              {(progress.earnedTitles || []).slice(-4).map((title) => {
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
                  <Text style={[s.galleryKanji, { color: '#D8D8D8' }]}>{reward.kanji}</Text>
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
              <MetricTile label="Weight" value={progress.bodyStats?.weight || '\u2014'} detail={progress.bodyStats?.unit || 'kg'} accent="#CFCFCF" mark="体" />
            </View>
          </Panel>

          <Panel accent="#C8C8C8" dim>
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
                    accessibilityRole="button"
                    accessibilityLabel={`${isFilled ? 'Unfill' : 'Fill'} cup ${cup} of 8`}
                    accessibilityState={{ checked: isFilled }}
                    hitSlop={DS.hitSlop}
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

          <Panel accent="#D0D0D0" dim>
            <Text style={s.sectionTitle}>Sleep and mood</Text>
            <View style={s.bodyRows}>
              <View style={s.bodyRow}>
                <Text style={s.bodyLabel}>Sleep</Text>
                <Text style={s.bodyValue}>{progress.sleepLog?.[today]?.hours ?? '\u2014'}h</Text>
              </View>
              <SoftDivider />
              <View style={s.bodyRow}>
                <Text style={s.bodyLabel}>Energy</Text>
                <Text style={s.bodyValue}>{progress.moodLog?.[today]?.energy ?? '\u2014'}/10</Text>
              </View>
              <SoftDivider />
              <View style={s.bodyRow}>
                <Text style={s.bodyLabel}>Mood</Text>
                <Text style={s.bodyValue}>{progress.moodLog?.[today]?.mood ?? '\u2014'}/10</Text>
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
                      lightImpact();
                    }}
                    style={[
                      s.themeTile,
                      active && { backgroundColor: tc.accent + '16', borderColor: tc.accent + '35' },
                      locked && { opacity: 0.36 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${tc.name}${active ? ', selected' : ''}${locked ? `, locked. ${THEME_UNLOCK_HINTS[key] || 'Locked'}` : ''}`}
                    accessibilityState={{ disabled: locked, selected: active }}
                  >
                    <View style={[s.themeSwatch, { backgroundColor: tc.accent, borderColor: tc.accent2 || tc.accent, borderWidth: 2 }]} />
                    <Text style={[s.themeName, active && { color: tc.accent }]}>{tc.name.split('\u00b7')[0].trim()}</Text>
                    <Text style={s.themeHint} numberOfLines={3}>{locked ? THEME_UNLOCK_HINTS[key] || 'Locked' : tc.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Panel>

          {([
            ['soundEnabled', 'Sound effects', '#D8D8D8', (value: boolean) => setSoundEnabled(value)],
            ['hapticsEnabled', 'Haptics', '#CFCFCF', (value: boolean) => setHapticsEnabled(value)],
            ['autoTheme', 'Auto theme', '#C8C8C8'],
          ] as [string, string, string, ((value: boolean) => void)?][]).map(([key, label, color, sideEffect]) => {
            const val = settings[key];
            const enabled = key === 'soundEnabled' || key === 'hapticsEnabled'
              ? val !== false
              : !!val;
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

          <Panel accent="#D8D8D8" dim>
            <View style={s.settingRow}>
              <View style={{ flex: 1, paddingRight: DS.space.md }}>
                <Text style={s.settingTitle}>Daily training reminder</Text>
                <Text style={s.settingSub}>
                  {settings.trainingReminder ? `A nudge every day at ${reminderLabel}` : 'Off \u2014 no notifications'}
                </Text>
              </View>
              <Toggle
                value={!!settings.trainingReminder}
                accent="#D8D8D8"
                label="Daily training reminder"
                onPress={toggleTrainingReminder}
              />
            </View>
            {settings.trainingReminder && (
              <View style={[s.optionRow, { marginTop: DS.space.md }]}>
                {REMINDER_TIMES.map(({ value, label }) => (
                  <Pressable
                    key={value}
                    onPress={() => changeReminderTime(value)}
                    style={[s.optionPill, reminderTime === value && { backgroundColor: '#D8D8D8' + '18' }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Reminder time ${label}`}
                    accessibilityState={{ selected: reminderTime === value }}
                  >
                    <Text style={[s.optionText, reminderTime === value && { color: '#D8D8D8' }]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Panel>

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
                  style={[s.optionPill, settings.stepGoal === v && { backgroundColor: '#D0D0D0' + '18' }]}
                >
                  <Text style={[s.optionText, settings.stepGoal === v && { color: '#D0D0D0' }]}>{v >= 10000 ? `${v / 1000}K` : v}</Text>
                </Pressable>
              ))}
            </View>
          </Panel>

          <Panel accent="#C8C8C8" dim>
            <Text style={s.settingTitle}>Lost your way? · 迷子</Text>
            <Text style={s.settingSub}>Zoro&apos;s compass is always spinning. Tap here if you are lost.</Text>
            <Pressable onPress={handleLostQuote} style={s.lostButton}>
              <Text style={[s.lostText, { color: t.accent }]}>Help, I&apos;m lost! (迷子になった)</Text>
            </Pressable>
          </Panel>

          <Panel accent="#D6D6D6" dim>
            <Text style={s.settingTitle}>Reset progress</Text>
            <Text style={s.settingSub}>Clears your local training story. This cannot be undone.</Text>
            <Pressable onPress={confirmReset} style={s.resetButton} accessibilityRole="button" accessibilityLabel="Reset all progress">
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
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  masuCupFilled: {
    backgroundColor: '#C8C8C8',
    borderColor: '#C8C8C8',
  },
  masuText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
  },
  masuTextFilled: {
    color: '#0A0A0A',
  },
  bodyRows: { gap: DS.space.md },
  bodyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bodyLabel: { color: TXT3, fontSize: 13, fontWeight: '800' },
  bodyValue: { color: TXT1, fontSize: 18, fontWeight: '900' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: DS.space.sm },
  themeTile: { width: (W - 32 - 24) / 3, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)', padding: 12, minHeight: 132, backgroundColor: 'rgba(255,255,255,0.035)' },
  themeSwatch: { width: 28, height: 28, borderRadius: 14, marginBottom: 9 },
  themeName: { color: TXT1, fontSize: 11, fontWeight: '900' },
  themeHint: { color: TXT3, fontSize: 11, lineHeight: 14, marginTop: 5 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingTitle: { color: TXT1, fontSize: 15, fontWeight: '900' },
  settingSub: { color: TXT3, fontSize: 12, marginTop: 4 },
  toggle: { width: 50, height: 30, borderRadius: 15, padding: 4, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: TXT1 },
  optionRow: { flexDirection: 'row', gap: DS.space.sm },
  optionPill: { flex: 1, minHeight: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  optionText: { color: TXT3, fontSize: 14, fontWeight: '900' },
  resetButton: { marginTop: DS.space.md, minHeight: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)' },
  resetText: { color: TXT1, fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  lostButton: {
    marginTop: DS.space.md,
    minHeight: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  lostText: {
    fontSize: 13,
    fontWeight: '900',
  },
});

export default React.memo(ProgressScreen);
