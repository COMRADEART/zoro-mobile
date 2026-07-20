import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import XPBar from '../components/shared/XPBar';
import BreathingOrb from '../components/shared/BreathingOrb';
import ActivityRings from '../components/shared/ActivityRings';
import ThreeSwordRings from '../components/shared/ThreeSwordRings';
import GlassCard from '../components/shared/GlassCard';
import SectionLabel from '../components/shared/SectionLabel';
import { THEMES, DEFAULT_THEME } from '../theme/themes';
import { TXT1, TXT2, TXT3, REST, SB_H, TAB_BAR_H } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import {
  rankIndexFor, currentStreak, completionsForDate,
  getDailyRecommendation, getReadinessLevel, getReadinessColor,
  currentWeekView, recentSessions, totalWeeklyVolume,
  computeRingProgress, computeSwordSharpness, getSharpnessLabel, getSharpnessColor,
  computeActivityRings,
} from '../logic/progression';
import { SWORDS, RANKS, senseiPhrase } from '../data/gameData';
import useStepCounter from '../hooks/useStepCounter';
import * as ai from '../services/aiService';
import SenseiChatModal from '../components/shared/SenseiChatModal';

const SWORD_ORDER = ['wado', 'sandai', 'shusui'];

function StatChip({ accent, label, value, kanji }) {
  return (
    <View style={s.statChip}>
      <View style={[s.statKanjiBox, { borderColor: accent + '40' }]}>
        <Text style={[s.statKanji, { color: accent }]}>{kanji}</Text>
      </View>
      <Text style={[s.statVal, { color: TXT1 }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function HomeScreen() {
  const { progress, today, theme, setTab, handleUpdate } = useProgress();
  const { steps } = useStepCounter();
  const [aiLine, setAiLine] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  const t = THEMES[theme] || THEMES[DEFAULT_THEME];

  // All of these are pure functions of (progress, today); recompute only when
  // those change, not on every render (steps/theme/state churn would otherwise
  // re-run ~8 logic passes per frame). (perf: P1)
  const d = useMemo(() => {
    const rankIdx = rankIndexFor(progress.totalXP);
    const rank = RANKS[rankIdx];
    const rec = getDailyRecommendation(progress, new Date());
    const xpInto = progress.totalXP - rank.min;
    const xpFor = (RANKS[rankIdx + 1]?.min ?? rank.max) - rank.min;
    const weekView = currentWeekView(progress, today);
    return {
      streak: currentStreak(progress, today),
      todayCount: completionsForDate(progress, today),
      weekView,
      weekMax: Math.max(...weekView.map(x => x.total || 0), 1),
      rankIdx,
      rank,
      rec,
      readiness: getReadinessLevel(progress),
      readyColor: getReadinessColor(progress),
      xpPct: Math.min(1, xpInto / (Number.isFinite(xpFor) ? xpFor : 1)),
      sessions: recentSessions(progress, 3),
      totalVol: totalWeeklyVolume(progress, today),
      sensei: senseiPhrase(
        rec.type === 'rest' ? 'rest_day' : rec.discipline ? 'morning_' + rec.discipline : 'idle'
      ),
      rings: computeRingProgress(progress, today),
      sharpness: computeSwordSharpness(progress, today),
      actRings: computeActivityRings(progress, today),
    };
  }, [progress, today]);

  const {
    streak, todayCount, weekView, weekMax, rankIdx, rank, rec, readiness, readyColor,
    xpPct, sessions, totalVol, sensei, rings, sharpness, actRings,
  } = d;
  const sharpLabel = getSharpnessLabel(sharpness);
  const sharpColor = getSharpnessColor(sharpness);

  // Optional on-device AI enhancement of the sensei line. The static
  // `sensei` renders instantly and stays unless/until AI returns a
  // different line. No-op on every device without AICore.
  const aiCtx = `${rec.type}/${rec.discipline || 'none'} readiness:${readiness} streak:${streak} sharp:${sharpness}`;
  useEffect(() => {
    let on = true;
    ai.recommend({ context: aiCtx, fallback: sensei }).then(line => {
      if (on && line && line !== sensei) setAiLine(line);
    });
    return () => { on = false; };
  }, [aiCtx, sensei]);

  useEffect(() => {
    let on = true;
    ai.isAIReady().then(ready => { if (on) setAiEnabled(ready); });
    return () => { on = false; };
  }, []);

  const loggedSharpness = progress.swordSharpnessLog?.[today];
  useEffect(() => {
    if (loggedSharpness === undefined || Math.abs(loggedSharpness - sharpness) > 5) {
      handleUpdate(prev => ({
        ...prev,
        swordSharpnessLog: { ...prev.swordSharpnessLog, [today]: sharpness },
      }));
    }
  }, [today, sharpness, loggedSharpness, handleUpdate]);

  const { dayName, dateFmt } = useMemo(() => {
    const dt = new Date(today + 'T00:00:00');
    return {
      dayName: dt.toLocaleDateString('en', { weekday: 'long' }).toUpperCase(),
      dateFmt: dt.toLocaleDateString('en', { month: 'long', day: 'numeric' }).toUpperCase(),
    };
  }, [today]);

  const onStartSession = (sword) => {
    handleUpdate(prev => ({ ...prev, activeSword: sword }));
    setTab('train');
  };

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingTop: SB_H + 18 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.headerSection}>
        <View style={s.headerLeft}>
          <View style={s.headerTop}>
            <View style={[s.kanjiBadge, { backgroundColor: t.accent + '18', borderColor: t.accent + '38' }]}>
              <Text style={[s.kanjiBadgeText, { color: t.accent }]}>刀</Text>
            </View>
            <Text style={[s.headerDate, { color: t.accent }]}>{dayName}</Text>
          </View>
          <Text style={s.headerBrand}>三刀流</Text>
          <Text style={s.headerSub}>SANTORYU FITNESS · {dateFmt}</Text>
        </View>
        <Pressable
          onPress={() => onStartSession(progress.activeSword || 'sandai')}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Start a training session"
        >
          <BreathingOrb color={t.accent} size={56} />
        </Pressable>
      </View>

      <View style={s.hero}>
        <Text style={s.heroEyebrow}>SWORD SHARPNESS</Text>
        <Text style={[s.heroNumber, { color: sharpColor }]}>{sharpness}</Text>
        <View style={s.heroMeta}>
          <Text style={[s.heroState, { color: sharpColor }]}>{sharpLabel}</Text>
          <Text style={s.heroDot}>·</Text>
          <Text style={s.heroToday}>
            {todayCount} exercise{todayCount === 1 ? '' : 's'} logged today
          </Text>
        </View>
      </View>

      <GlassCard accent={t.accent} elevation="medium" style={s.ringsCard}>
        <View style={s.ringBlock}>
          <SectionLabel label="THREE SWORDS" style={s.cardSectionLabel} />
          <ThreeSwordRings rings={rings} size={150} />
        </View>
        <View style={[s.ringsHDivider, { backgroundColor: DS.divider.medium }]} />
        <View style={s.ringBlock}>
          <SectionLabel label="ACTIVITY" style={s.cardSectionLabel} />
          <ActivityRings rings={actRings} size={156} />
        </View>
      </GlassCard>

      <View style={s.statsRow}>
        <StatChip accent={t.accent} label="STREAK" value={`${streak}d`} kanji="連" />
        <StatChip accent={readyColor} label="STATUS" value={readiness} kanji="気" />
        <StatChip accent="#FB7185" label="STEPS" value={steps.toLocaleString()} kanji="歩" />
      </View>

      <GlassCard accent={rank.color} elevation="medium">
        <View style={s.rankHeader}>
          <View style={[s.rankEmblem, { borderColor: rank.color + '50', backgroundColor: rank.color + '14' }]}>
            <Text style={[s.rankEmblemText, { color: rank.color }]}>{rank.kanji || '刀'}</Text>
          </View>
          <View style={s.rankInfo}>
            <Text style={[s.rankName, { color: rank.color }]}>{rank.name}</Text>
            <Text style={s.rankXPValue}>{progress.totalXP.toLocaleString()} XP</Text>
          </View>
        </View>
        <XPBar pct={xpPct} color={rank.color} height={10} />
        <Text style={s.rankProgressSub}>
          {RANKS[rankIdx + 1]
            ? `${(RANKS[rankIdx + 1].min - progress.totalXP).toLocaleString()} XP to ${RANKS[rankIdx + 1].name}`
            : 'Maximum rank — King of Hell'}
        </Text>
      </GlassCard>

      <SenseiChatModal
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        context={aiCtx}
        fallbackPhrase={sensei}
        aiEnabled={aiEnabled}
      />


      {rec.type !== 'rest' ? (
        <GlassCard
          accent={SWORDS[rec.discipline]?.accent || t.accent}
          elevation="medium"
          onPress={() => onStartSession(rec.discipline)}
          accessibilityLabel={`Recommended today: ${SWORDS[rec.discipline]?.name}. Start session`}
        >
          <View style={s.recRow}>
            <View style={[s.recKanjiBox, { backgroundColor: (SWORDS[rec.discipline]?.accent || t.accent) + '18' }]}>
              <Text style={[s.recKanji, { color: SWORDS[rec.discipline]?.accent }]}>
                {SWORDS[rec.discipline]?.kanji}
              </Text>
            </View>
            <View style={s.recInfo}>
              <Text style={s.recLabel}>RECOMMENDED TODAY</Text>
              <Text style={[s.recName, { color: SWORDS[rec.discipline]?.accent }]}>
                {SWORDS[rec.discipline]?.name}
              </Text>
              <Text style={s.recIntensity}>Intensity {rec.intensity} / 10</Text>
            </View>
            <Text style={[s.recArrow, { color: SWORDS[rec.discipline]?.accent }]}>›</Text>
          </View>
        </GlassCard>
      ) : (
        <GlassCard accent={REST} elevation="medium">
          <View style={s.recRow}>
            <View style={[s.recKanjiBox, { backgroundColor: REST + '18' }]}>
              <Text style={[s.recKanji, { color: REST }]}>休</Text>
            </View>
            <View style={s.recInfo}>
              <Text style={s.recLabel}>RECOVERY</Text>
              <Text style={[s.recName, { color: REST }]}>Rest Day</Text>
              <Text style={s.recIntensity}>Recovery {progress.recoveryScore} / 100 — let your body heal</Text>
            </View>
          </View>
        </GlassCard>
      )}

      <Pressable
        style={s.senseiBlock}
        onPress={() => setChatOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Ask the sensei a question"
      >
        <Text style={[s.senseiMark, { color: t.accent }]}>“</Text>
        <Text style={s.senseiText}>{aiLine || sensei}</Text>
        <View style={s.senseiFooter}>
          <Text style={[s.senseiAttr, { color: t.accent }]}>— SENSEI</Text>
          <Text style={[s.senseiAsk, { color: t.accent }]}>ASK ›</Text>
        </View>
      </Pressable>

      <View style={s.groupedSection}>
        <SectionLabel
          label="THIS WEEK"
          accent={t.accent}
          style={s.groupSectionLabel}
          right={
            <View style={s.weekVols}>
              {SWORD_ORDER.map(k => (
                <View key={k} style={s.weekVolItem}>
                  <Text style={[s.weekVolKanji, { color: SWORDS[k].accent }]}>{SWORDS[k].kanji}</Text>
                  <Text style={s.weekVolCount}>{totalVol[k] || 0}</Text>
                </View>
              ))}
            </View>
          }
        />
        <View style={s.weekBars}>
          {weekView.map((day) => {
            const barH = day.total > 0 ? Math.max(10, (day.total / weekMax) * 56) : 6;
            const discColor = day.dominant ? SWORDS[day.dominant]?.accent : t.accent;
            return (
              <View key={day.date} style={s.weekDayCol}>
                <View style={s.weekBarTrack}>
                  <View
                    style={[
                      s.weekBarFill,
                      {
                        height: barH,
                        backgroundColor: day.total > 0 ? discColor + 'B0' : 'rgba(255,255,255,0.05)',
                        borderColor: day.isToday ? discColor : 'transparent',
                        borderWidth: day.isToday ? 1.5 : 0,
                      },
                    ]}
                  />
                </View>
                <Text style={[s.weekDayLabel, day.isToday && { color: t.accent, fontWeight: '800' }]}>
                  {new Date(day.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)}
                </Text>
                {day.total > 0 && (
                  <Text style={[s.weekDayCount, { color: discColor }]}>{day.total}</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {sessions.length > 0 && (
        <View style={s.groupedSection}>
          <SectionLabel label="RECENT SESSIONS" accent={t.accent} style={s.groupSectionLabel} />
          {sessions.map((sess, i) => (
            <View key={sess.id} style={[s.sessRow, i === sessions.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[s.sessKanjiBox, { backgroundColor: SWORDS[sess.discipline]?.accent + '18' }]}>
                <Text style={[s.sessKanji, { color: SWORDS[sess.discipline]?.accent }]}>
                  {SWORDS[sess.discipline]?.kanji}
                </Text>
              </View>
              <View style={s.sessInfo}>
                <Text style={s.sessName}>{SWORDS[sess.discipline]?.name}</Text>
                <Text style={s.sessMeta}>
                  {Math.round((sess.endedAt - sess.startedAt) / 60000)} min · {sess.calories} kcal · +{sess.xpEarned} XP
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={s.footer}>
        <View style={[s.footerLine, { backgroundColor: t.accent + '25' }]} />
        <Text style={s.footerText}>一刀流にならない　三刀流になる</Text>
        <Text style={s.footerSub}>Never become one blade — become three</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: DS.space.md, paddingBottom: TAB_BAR_H + DS.space.xl },

  /* Header */
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: DS.space.xl,
  },
  headerLeft: { flex: 1 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: DS.space.sm, marginBottom: DS.space.sm },
  kanjiBadge: { width: 30, height: 30, borderRadius: DS.radius.sm, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  kanjiBadgeText: { fontSize: 17, fontWeight: '900' },
  headerDate: { ...DS.type.label },
  headerBrand: { ...DS.type.displayLg, fontSize: 42, color: TXT1, lineHeight: 48 },
  headerSub: { ...DS.type.caption, color: TXT3, marginTop: 6, letterSpacing: 1.5 },

  /* Section-head spacing overrides (component lives in SectionLabel.js) */
  cardSectionLabel: { marginBottom: DS.space.md },
  groupSectionLabel: { marginBottom: DS.space.md },

  /* Hero — a single honed focal, not a repeated metric template */
  hero: {
    marginBottom: DS.space.xl,
    paddingBottom: DS.space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.divider.medium,
  },
  heroEyebrow: { ...DS.type.label, color: TXT2 },
  heroNumber: { ...DS.type.displayHero, fontSize: 72, lineHeight: 74, marginTop: 4 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: DS.space.xs, marginTop: 6 },
  heroState: { ...DS.type.caption, fontWeight: DS.font.weight.bold, letterSpacing: 1.5 },
  heroDot: { ...DS.type.caption, color: TXT3 },
  heroToday: { ...DS.type.caption, color: TXT2, letterSpacing: 0.3 },

  /* Rings card */
  ringsCard: { marginBottom: DS.space.lg },
  ringBlock: { width: '100%', alignItems: 'center', paddingVertical: DS.space.sm },
  ringsHDivider: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: DS.space.lg },

  /* Stats strip */
  statsRow: { flexDirection: 'row', gap: DS.space.sm, marginBottom: DS.space.lg },
  statChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: DS.space.md,
    borderRadius: DS.radius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  statKanjiBox: { width: 30, height: 30, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statKanji: { fontSize: 16, fontWeight: '900' },
  statVal: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { ...DS.type.micro, color: TXT3, marginTop: 4, letterSpacing: 1.5 },

  /* Rank card */
  rankHeader: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md, marginBottom: DS.space.md },
  rankEmblem: { width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  rankEmblemText: { fontSize: 24, fontWeight: '900' },
  rankInfo: { flex: 1 },
  rankName: { ...DS.type.screenTitle, fontSize: 14 },
  rankXPValue: { ...DS.type.displayMd, color: TXT1, marginTop: 4 },
  rankProgressSub: { ...DS.type.caption, color: TXT3, marginTop: DS.space.sm },

  /* Recommendation */
  recRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md },
  recKanjiBox: { width: 56, height: 56, borderRadius: DS.radius.md, alignItems: 'center', justifyContent: 'center' },
  recKanji: { fontSize: 30, fontWeight: '900' },
  recInfo: { flex: 1 },
  recLabel: { ...DS.type.label, color: TXT3, marginBottom: 5 },
  recName: { ...DS.type.cardTitle, fontSize: 18 },
  recIntensity: { ...DS.type.caption, color: TXT2, marginTop: 4 },
  recArrow: { fontSize: 28, fontWeight: '300' },

  /* Sensei pull-quote */
  senseiBlock: { marginTop: DS.space.xs, marginBottom: DS.space.xl, paddingHorizontal: DS.space.sm },
  senseiMark: { fontFamily: DS.font.display, fontSize: 44, lineHeight: 40, opacity: 0.5 },
  senseiText: { ...DS.type.body, fontFamily: DS.font.display, fontSize: 17, lineHeight: 27, color: TXT1, fontStyle: 'italic', marginTop: 2 },
  senseiAttr: { ...DS.type.micro, letterSpacing: 2 },
  senseiFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: DS.space.md },
  senseiAsk: { ...DS.type.micro, letterSpacing: 2, opacity: 0.8 },

  /* Grouped sections */
  groupedSection: {
    marginBottom: DS.space.lg,
    paddingTop: DS.space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.divider.subtle,
  },
  weekVols: { flexDirection: 'row', gap: DS.space.md },
  weekVolItem: { alignItems: 'center', gap: 3 },
  weekVolKanji: { fontSize: 15, fontWeight: '900' },
  weekVolCount: { ...DS.type.caption, color: TXT3 },
  weekBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  weekDayCol: { alignItems: 'center', gap: 6 },
  weekBarTrack: { width: 24, height: 60, justifyContent: 'flex-end', alignItems: 'center' },
  weekBarFill: { width: 18, borderRadius: 5 },
  weekDayLabel: { ...DS.type.caption, color: TXT3, fontWeight: '600' },
  weekDayCount: { fontSize: 11, fontWeight: '800' },

  /* Recent sessions */
  sessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    paddingVertical: DS.space.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.divider.subtle,
  },
  sessKanjiBox: { width: 42, height: 42, borderRadius: DS.radius.md, alignItems: 'center', justifyContent: 'center' },
  sessKanji: { fontSize: 21, fontWeight: '900' },
  sessInfo: { flex: 1 },
  sessName: { ...DS.type.cardTitle, fontSize: 15, color: TXT1 },
  sessMeta: { ...DS.type.caption, color: TXT3, marginTop: 3 },

  /* Footer */
  footer: { alignItems: 'center', marginTop: DS.space.lg, marginBottom: DS.space.md },
  footerLine: { width: 48, height: 1, marginBottom: DS.space.md },
  footerText: { fontFamily: DS.font.display, fontSize: 14, color: TXT2, fontStyle: 'italic', letterSpacing: 0.5 },
  footerSub: { ...DS.type.caption, color: TXT3, marginTop: 6 },
});

// Prop-less pager screen: memo stops parent re-renders (toasts, tab
// animation state in Dojo) from cascading into all six mounted screens.
export default React.memo(HomeScreen);
