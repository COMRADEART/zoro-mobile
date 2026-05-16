import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import XPBar from '../components/shared/XPBar';
import BreathingOrb from '../components/shared/BreathingOrb';
import ActivityRings from '../components/shared/ActivityRings';
import ThreeSwordRings from '../components/shared/ThreeSwordRings';
import GlassCard from '../components/shared/GlassCard';
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

const SWORD_ORDER = ['wado', 'sandai', 'shusui'];

function SectionHead({ label, accent, right }) {
  return (
    <View style={s.sectionHead}>
      <View style={s.sectionHeadLeft}>
        {accent ? <View style={[s.sectionTick, { backgroundColor: accent }]} /> : null}
        <Text style={s.sectionLabel}>{label}</Text>
      </View>
      {right}
    </View>
  );
}

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

export default function HomeScreen() {
  const { progress, today, theme, setTab, handleUpdate } = useProgress();
  const { steps } = useStepCounter();

  const streak = currentStreak(progress, today);
  const todayCount = completionsForDate(progress, today);
  const weekView = currentWeekView(progress, today);
  const rankIdx = rankIndexFor(progress.totalXP);
  const rank = RANKS[rankIdx];
  const rec = getDailyRecommendation(progress, new Date());
  const readiness = getReadinessLevel(progress);
  const readyColor = getReadinessColor(progress);
  const xpInto = progress.totalXP - rank.min;
  const xpFor = (RANKS[rankIdx + 1]?.min ?? rank.max) - rank.min;
  const xpPct = Math.min(1, xpInto / (Number.isFinite(xpFor) ? xpFor : 1));
  const sessions = recentSessions(progress, 3);
  const totalVol = totalWeeklyVolume(progress, today);
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];
  const sensei = senseiPhrase(
    rec.type === 'rest' ? 'rest_day' : rec.discipline ? 'morning_' + rec.discipline : 'idle'
  );
  const rings = computeRingProgress(progress, today);
  const sharpness = computeSwordSharpness(progress, today);
  const sharpLabel = getSharpnessLabel(sharpness);
  const sharpColor = getSharpnessColor(sharpness);
  const actRings = computeActivityRings(progress, today);

  useEffect(() => {
    const existing = progress.swordSharpnessLog?.[today];
    if (existing === undefined || Math.abs(existing - sharpness) > 5) {
      handleUpdate(prev => ({
        ...prev,
        swordSharpnessLog: { ...prev.swordSharpnessLog, [today]: sharpness },
      }));
    }
  }, [today, sharpness, progress, handleUpdate]);

  const dayName = new Date().toLocaleDateString('en', { weekday: 'long' }).toUpperCase();
  const dateFmt = new Date().toLocaleDateString('en', { month: 'long', day: 'numeric' }).toUpperCase();

  const onStartSession = (sword) => {
    handleUpdate({ ...progress, activeSword: sword });
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

      <View style={s.heroBand}>
        <View style={s.heroCol}>
          <Text style={s.sectionLabel}>SWORD SHARPNESS</Text>
          <Text style={[s.heroNumber, { color: sharpColor }]}>{sharpness}</Text>
          <Text style={[s.heroSub, { color: sharpColor }]}>{sharpLabel}</Text>
        </View>
        <View style={[s.heroDivider, { backgroundColor: t.accent + '22' }]} />
        <View style={[s.heroCol, s.heroColRight]}>
          <Text style={s.sectionLabel}>TODAY</Text>
          <Text style={[s.heroNumber, { color: TXT1 }]}>{todayCount}</Text>
          <Text style={s.heroSub}>exercises logged</Text>
        </View>
      </View>

      <GlassCard accent={t.accent} elevation="medium" style={s.ringsCard}>
        <View style={s.ringBlock}>
          <SectionHead label="THREE SWORDS" />
          <ThreeSwordRings rings={rings} size={150} />
        </View>
        <View style={[s.ringsHDivider, { backgroundColor: DS.divider.medium }]} />
        <View style={s.ringBlock}>
          <SectionHead label="ACTIVITY" />
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

      {rec.type !== 'rest' ? (
        <GlassCard
          accent={SWORDS[rec.discipline]?.accent || t.accent}
          elevation="medium"
          onPress={() => onStartSession(rec.discipline)}
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

      <View style={s.senseiBlock}>
        <Text style={[s.senseiMark, { color: t.accent }]}>“</Text>
        <Text style={s.senseiText}>{sensei}</Text>
        <Text style={[s.senseiAttr, { color: t.accent }]}>— SENSEI</Text>
      </View>

      <View style={s.groupedSection}>
        <SectionHead
          label="THIS WEEK"
          accent={t.accent}
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
            const maxVol = Math.max(...weekView.map(d => d.total || 0), 1);
            const barH = day.total > 0 ? Math.max(10, (day.total / maxVol) * 56) : 6;
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
          <SectionHead label="RECENT SESSIONS" accent={t.accent} />
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

  /* Section heads */
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.space.md },
  sectionHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTick: { width: 2.5, height: 13, borderRadius: 1.5 },
  sectionLabel: { ...DS.type.label, color: TXT2 },

  /* Hero band */
  heroBand: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: DS.space.xl,
    paddingBottom: DS.space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.divider.medium,
  },
  heroCol: { flex: 1 },
  heroColRight: { alignItems: 'flex-end' },
  heroDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: DS.space.lg },
  heroNumber: { ...DS.type.displayHero, fontSize: 64, lineHeight: 66, marginTop: 6 },
  heroSub: { ...DS.type.caption, color: TXT2, marginTop: 6, letterSpacing: 1.5 },

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
  senseiAttr: { ...DS.type.micro, marginTop: DS.space.md, letterSpacing: 2 },

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
