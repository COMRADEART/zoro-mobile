import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import ShimmerXPBar from '../components/shared/ShimmerXPBar';
import BreathingOrb from '../components/shared/BreathingOrb';
import ActivityRings from '../components/shared/ActivityRings';
import SectionLabel from '../components/shared/SectionLabel';
import ThreeSwordRings from '../components/shared/ThreeSwordRings';
import { THEMES, DEFAULT_THEME } from '../theme/themes';
import { TXT1, TXT2, TXT3, SB_H, TAB_BAR_H } from '../theme/tokens';
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

function HeroCard({ accent, children, style }) {
  return (
    <View style={[s.heroCard, { borderColor: accent + '30' }, style]}>
      <View style={[s.heroGlow, { backgroundColor: accent }]} />
      {children}
    </View>
  );
}

function StatChip({ accent, label, value, unit, emoji }) {
  return (
    <View style={[s.statChip, { borderColor: accent + '25' }]}>
      {emoji ? (
        <Text style={s.statEmoji}>{emoji}</Text>
      ) : (
        <View style={[s.statDot, { backgroundColor: accent, shadowColor: accent }]} />
      )}
      <Text style={[s.statVal, { color: accent }]}>{value}</Text>
      {unit && <Text style={s.statUnit}>{unit}</Text>}
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { progress, today, theme, setTab, handleUpdate } = useProgress();
  const { steps } = useStepCounter();
  const [aiLine, setAiLine] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

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

  // Optional on-device AI enhancement of the sensei line. The static
  // `sensei` renders instantly and stays unless/until AI returns a
  // different line. No-op on every device without AICore.
  const aiCtx = `${rec.type}/${rec.discipline || 'none'} readiness:${readiness} streak:${streak} sharp:${sharpness}`;
  useEffect(() => {
    let on = true;
    setAiLine(null); // drop a stale AI line when the recommendation changes
    ai.recommend({ context: aiCtx, fallback: sensei }).then(line => {
      if (on && line && line !== sensei) setAiLine(line);
    });
    return () => { on = false; };
    // Refresh only when the recommendation itself changes. `sensei` is a
    // fresh random pick every render and the scalars in `aiCtx` fluctuate
    // constantly; depending on them re-fires a ~12s on-device generation
    // on every render. Both are still read via closure to enrich the prompt
    // and gate the fallback comparison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.type, rec.discipline]);

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
      contentContainerStyle={[s.scroll, { paddingTop: SB_H + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.watermarkContainer}>
        <Text style={[s.watermark, { color: t.accent }]}>三刀流</Text>
      </View>

      <View style={s.headerSection}>
        <View style={s.headerLeft}>
          <View style={s.headerTop}>
            <View style={[s.kanjiBadge, { backgroundColor: t.accent + '15', borderColor: t.accent + '30' }]}>
              <Text style={[s.kanjiBadgeText, { color: t.accent }]}>刀</Text>
            </View>
            <Text style={[s.headerDate, { color: t.accent }]}>{dayName}</Text>
          </View>
          <Text style={s.headerBrand}>三刀流</Text>
          <Text style={s.headerSub}>SANTORYU FITNESS</Text>
          <View style={[s.headerDivider, { backgroundColor: t.accent + '30' }]} />
          <Text style={s.headerDateFull}>{dateFmt}</Text>
        </View>
        <Pressable
          onPress={() => onStartSession(progress.activeSword || 'sandai')}
          hitSlop={16}
        >
          <BreathingOrb color={t.accent} size={56} />
        </Pressable>
      </View>

      <HeroCard accent={sharpColor} style={s.sharpCard}>
        <View style={s.sharpRow}>
          <View style={s.sharpLeft}>
            <Text style={s.sectionLabel}>SWORD SHARPNESS</Text>
            <Text style={[s.sharpScore, { color: sharpColor }]}>{sharpness}</Text>
            <Text style={[s.sharpLabel, { color: sharpColor }]}>{sharpLabel}</Text>
          </View>
          <View style={s.sharpRight}>
            <Text style={s.sectionLabel}>TODAY</Text>
            <Text style={[s.heroCount, { color: t.accent }]}>{todayCount}</Text>
            <Text style={s.heroUnit}>exercises</Text>
          </View>
        </View>
      </HeroCard>

      <View style={s.ringsSection}>
        <HeroCard accent={t.accent} style={s.ringsCard}>
          <View style={s.ringsHeader}>
            <Text style={s.sectionLabel}>THREE SWORD RINGS</Text>
            <View style={s.swordKanjiRow}>
              {SWORD_ORDER.map(k => (
                <Text key={k} style={[s.swordKanji, { color: SWORDS[k].accent }]}>{SWORDS[k].kanji}</Text>
              ))}
            </View>
          </View>
          <View style={s.ringsContainer}>
            <ThreeSwordRings rings={rings} size={148} />
          </View>
        </HeroCard>

        <HeroCard accent="#FB7185" style={s.activityCard}>
          <Text style={s.sectionLabel}>ACTIVITY RINGS</Text>
          <View style={s.activityContainer}>
            <ActivityRings rings={actRings} size={160} />
          </View>
        </HeroCard>
      </View>

      <View style={s.statsRow}>
        <StatChip accent={t.accent} label="STREAK" value={streak} emoji="🔥" />
        <StatChip accent={readyColor} label="STATUS" value={readiness} />
        <StatChip accent="#FB7185" label="STEPS" value={steps.toLocaleString()} emoji="👣" />
      </View>

      <HeroCard accent={rank.color} style={s.rankCard}>
        <View style={s.rankHeader}>
          <View>
            <View style={s.rankBadgeRow}>
              <View style={[s.rankBadge, { backgroundColor: rank.color + '20', borderColor: rank.color + '40' }]}>
                <Text style={[s.rankBadgeText, { color: rank.color }]}>{rank.kanji || '⚔'}</Text>
              </View>
              <Text style={[s.rankName, { color: rank.color }]}>{rank.name}</Text>
            </View>
            <Text style={s.rankXPValue}>{progress.totalXP.toLocaleString()} XP</Text>
          </View>
          <View style={[s.rankEmblem, { borderColor: rank.color + '50', backgroundColor: rank.color + '10' }]}>
            <Text style={{ fontSize: 24 }}>{rank.id === 0 ? '🌱' : rank.id === 1 ? '⚔' : rank.id === 2 ? '🔥' : rank.id === 3 ? '👑' : rank.id === 4 ? '💀' : '⚰'}</Text>
          </View>
        </View>
        <View style={s.xpProgressSection}>
          <Text style={s.xpProgressLabel}>PROGRESS TO NEXT RANK</Text>
          <ShimmerXPBar pct={xpPct} color={rank.color} height={10} />
          <Text style={s.xpProgressSub}>
            {RANKS[rankIdx + 1]
              ? `${(RANKS[rankIdx + 1].min - progress.totalXP).toLocaleString()} XP to ${RANKS[rankIdx + 1].name}`
              : 'Maximum rank — King of Hell'}
          </Text>
        </View>
      </HeroCard>

      <HeroCard accent="#D4A853" style={s.senseiCard}>
        <View style={s.senseiHeader}>
          <View style={[s.senseiPip, { backgroundColor: '#D4A853' }]} />
          <Text style={[s.senseiTitle, { color: '#D4A853' }]}>SENSEI</Text>
          <Pressable
            onPress={() => setChatOpen(true)}
            style={s.senseiAsk}
            accessibilityRole="button"
            accessibilityLabel="Ask the sensei a question"
          >
            <Text style={s.senseiAskTxt}>ASK ›</Text>
          </Pressable>
        </View>
        <Text style={s.senseiText}>{aiLine || sensei}</Text>
      </HeroCard>

      <SenseiChatModal
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        context={aiCtx}
        fallbackPhrase={sensei}
      />

      {rec.type !== 'rest' ? (
        <Pressable onPress={() => onStartSession(rec.discipline)}>
          <HeroCard accent={SWORDS[rec.discipline]?.accent || t.accent} style={s.recCard}>
            <View style={s.recRow}>
              <View style={[s.recKanjiBox, { backgroundColor: (SWORDS[rec.discipline]?.accent || t.accent) + '15' }]}>
                <Text style={[s.recKanji, { color: SWORDS[rec.discipline]?.accent }]}>
                  {SWORDS[rec.discipline]?.kanji}
                </Text>
              </View>
              <View style={s.recInfo}>
                <Text style={s.recLabel}>RECOMMENDED</Text>
                <Text style={[s.recName, { color: SWORDS[rec.discipline]?.accent }]}>
                  {SWORDS[rec.discipline]?.name}
                </Text>
                <Text style={s.recIntensity}>Intensity {rec.intensity}/10</Text>
              </View>
              <Text style={[s.recArrow, { color: SWORDS[rec.discipline]?.accent }]}>›</Text>
            </View>
          </HeroCard>
        </Pressable>
      ) : (
        <HeroCard accent="#4A9EFF" style={s.recCard}>
          <View style={s.restRow}>
            <Text style={s.restIcon}>🌙</Text>
            <View>
              <Text style={[s.recName, { color: '#4A9EFF' }]}>REST DAY</Text>
              <Text style={s.recIntensity}>Recovery {progress.recoveryScore}/100 — let your body heal</Text>
            </View>
          </View>
        </HeroCard>
      )}

      <HeroCard accent={t.accent} style={s.weekCard}>
        <View style={s.weekHead}>
          <Text style={s.weekTitle}>THIS WEEK</Text>
          <View style={s.weekVols}>
            {SWORD_ORDER.map(k => (
              <View key={k} style={s.weekVolItem}>
                <Text style={[s.weekVolKanji, { color: SWORDS[k].accent }]}>{SWORDS[k].kanji}</Text>
                <Text style={s.weekVolCount}>{totalVol[k] || 0}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={s.weekBars}>
          {weekView.map((day) => {
            const maxVol = Math.max(...weekView.map(d => d.total || 0), 1);
            const barH = day.total > 0 ? Math.max(10, (day.total / maxVol) * 56) : 6;
            const discColor = day.dominant ? SWORDS[day.dominant]?.accent : t.accent;
            return (
              <View key={day.date} style={s.weekDayCol}>
                <View style={[s.weekBarTrack, { height: 60 }]}>
                  <View
                    style={[
                      s.weekBarFill,
                      {
                        height: barH,
                        backgroundColor: day.total > 0 ? discColor + '95' : 'rgba(255,255,255,0.04)',
                        borderColor: day.isToday ? discColor : 'transparent',
                        borderWidth: day.isToday ? 2 : 0,
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
      </HeroCard>

      {sessions.length > 0 && (
        <HeroCard accent={t.accent} style={s.recentCard}>
          <SectionLabel label="RECENT SESSIONS" style={{ marginBottom: 12 }} />
          {sessions.map(sess => (
            <View key={sess.id} style={s.sessRow}>
              <View style={[s.sessKanjiBox, { backgroundColor: SWORDS[sess.discipline]?.accent + '15' }]}>
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
        </HeroCard>
      )}

      <View style={s.footer}>
        <View style={[s.footerLine, { backgroundColor: t.accent + '20' }]} />
        <Text style={s.footerText}>一刀流にならない　三刀流になる</Text>
        <Text style={s.footerSub}>Never become one blade — become three</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: DS.space.md, paddingBottom: TAB_BAR_H + DS.space.xl },
  watermarkContainer: { position: 'absolute', top: 80, left: 0, right: 0, alignItems: 'center', opacity: 0.03 },
  watermark: { fontSize: 200, fontWeight: '900', letterSpacing: -15 },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: DS.space.lg,
    paddingTop: DS.space.xs,
  },
  headerLeft: { flex: 1 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: DS.space.xs, marginBottom: DS.space.xs },
  kanjiBadge: { width: 28, height: 28, borderRadius: DS.radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kanjiBadgeText: { fontSize: 16, fontWeight: '900' },
  headerDate: { fontSize: DS.fontSize.xs, fontWeight: '700', letterSpacing: DS.letterSpacing.widest },
  headerBrand: { fontSize: 40, fontWeight: DS.font.weight.black, color: TXT1, letterSpacing: 4, lineHeight: 46 },
  headerSub: { fontSize: 7, fontWeight: '700', letterSpacing: 6, color: TXT3, marginTop: 4 },
  headerDivider: { height: 1, marginVertical: DS.space.sm, width: '55%' },
  headerDateFull: { fontSize: DS.fontSize.xs + 1, color: TXT3, letterSpacing: 1 },
  sectionLabel: { fontSize: 7.5, fontWeight: '700', letterSpacing: DS.letterSpacing.widest, color: TXT3, marginBottom: DS.space.xs },
  heroCard: { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderRadius: DS.radius.xl, padding: DS.space.lg, position: 'relative', overflow: 'hidden' },
  heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, opacity: 0.4 },
  sharpCard: { marginBottom: DS.space.sm },
  sharpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sharpScore: { fontSize: 58, fontWeight: '900', letterSpacing: -2, lineHeight: 60 },
  sharpLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  sharpRight: { alignItems: 'flex-end' },
  heroCount: { fontSize: 62, fontWeight: '900', lineHeight: 66, letterSpacing: -2.5 },
  heroUnit: { fontSize: DS.fontSize.sm + 1, color: TXT3, marginTop: 2, fontWeight: '500' },
  ringsSection: { marginBottom: DS.space.xs },
  ringsCard: { marginBottom: DS.space.xs },
  ringsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.space.sm },
  swordKanjiRow: { flexDirection: 'row', gap: DS.space.sm },
  swordKanji: { fontSize: 16, fontWeight: '900' },
  ringsContainer: { alignItems: 'center', paddingVertical: DS.space.xs },
  activityCard: { marginBottom: DS.space.sm },
  activityContainer: { alignItems: 'center', paddingVertical: DS.space.xs },
  statsRow: { flexDirection: 'row', gap: DS.space.xs, marginBottom: DS.space.sm },
  statChip: { flex: 1, alignItems: 'center', paddingVertical: DS.space.md + 4, borderWidth: 1, borderRadius: DS.radius.lg, backgroundColor: 'rgba(0,0,0,0.3)' },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6 },
  statVal: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statUnit: { fontSize: 10, color: TXT3, marginTop: 2 },
  statLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 2, color: TXT3, marginTop: 4 },
  rankCard: { marginBottom: DS.space.sm },
  rankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: DS.space.md },
  rankBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.sm },
  rankBadge: { width: 42, height: 42, borderRadius: DS.radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  rankBadgeText: { fontSize: 18, fontWeight: '900' },
  rankName: { fontSize: 9, fontWeight: '700', letterSpacing: 3 },
  rankXPValue: { fontSize: 28, fontWeight: '900', color: TXT1, letterSpacing: -1, marginTop: 6 },
  rankEmblem: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  xpProgressSection: {},
  xpProgressLabel: { fontSize: 7.5, letterSpacing: 2.5, color: TXT3, fontWeight: '700', marginBottom: DS.space.sm },
  xpProgressSub: { fontSize: 10, color: TXT3, letterSpacing: 0.5, marginTop: DS.space.sm },
  senseiCard: { marginBottom: DS.space.sm },
  senseiHeader: { flexDirection: 'row', alignItems: 'center', gap: DS.space.xs, marginBottom: DS.space.sm },
  senseiPip: { width: 3, height: 16, borderRadius: 2 },
  senseiTitle: { fontSize: 7.5, fontWeight: '700', letterSpacing: 5 },
  senseiQuote: { fontSize: 22, marginLeft: 'auto', opacity: 0.4 },
  senseiText: { fontSize: 15, color: TXT2, lineHeight: 26, fontStyle: 'italic' },
  senseiAsk: { marginLeft: 'auto', paddingVertical: 4, paddingHorizontal: 8 },
  senseiAskTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: '#D4A853' },
  recCard: { marginBottom: DS.space.sm },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md },
  recKanjiBox: { width: 58, height: 58, borderRadius: DS.radius.md, alignItems: 'center', justifyContent: 'center' },
  recKanji: { fontSize: 30, fontWeight: '900' },
  recInfo: { flex: 1 },
  recLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 3, color: TXT3, marginBottom: 4 },
  recName: { fontSize: 17, fontWeight: '800' },
  recIntensity: { fontSize: 11, color: TXT3, marginTop: 3 },
  recArrow: { fontSize: 26, fontWeight: '300' },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md },
  restIcon: { fontSize: 32 },
  weekCard: { marginBottom: DS.space.sm },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.space.md },
  weekTitle: { fontSize: 7.5, fontWeight: '700', letterSpacing: 3, color: TXT3 },
  weekVols: { flexDirection: 'row', gap: DS.space.md },
  weekVolItem: { alignItems: 'center', gap: 3 },
  weekVolKanji: { fontSize: 15, fontWeight: '900' },
  weekVolCount: { fontSize: 10, color: TXT3, fontWeight: '600' },
  weekBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  weekDayCol: { alignItems: 'center', gap: 5 },
  weekBarTrack: { width: 22, justifyContent: 'flex-end', alignItems: 'center' },
  weekBarFill: { width: 16, borderRadius: 4 },
  weekDayLabel: { fontSize: 9, color: TXT3, fontWeight: '600' },
  weekDayCount: { fontSize: 8, fontWeight: '800', marginTop: 1 },
  recentCard: { marginBottom: DS.space.sm },
  sessRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md, paddingVertical: DS.space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DS.divider.subtle },
  sessKanjiBox: { width: 44, height: 44, borderRadius: DS.radius.md, alignItems: 'center', justifyContent: 'center' },
  sessKanji: { fontSize: 22, fontWeight: '900' },
  sessInfo: { flex: 1 },
  sessName: { fontSize: 14, fontWeight: '700', color: TXT1 },
  sessMeta: { fontSize: 11, color: TXT3, marginTop: 3 },
  footer: { alignItems: 'center', marginTop: DS.space.lg, marginBottom: DS.space.md },
  footerLine: { width: 50, height: 1, marginBottom: DS.space.md },
  footerText: { fontSize: 13, color: TXT3, fontStyle: 'italic', letterSpacing: 0.8 },
  footerSub: { fontSize: 10, color: TXT3, marginTop: 5, letterSpacing: 0.4 },
});