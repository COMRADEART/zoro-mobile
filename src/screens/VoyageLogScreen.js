import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, FlatList } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import SectionLabel from '../components/shared/SectionLabel';
import BarChart from '../components/shared/charts/BarChart';
import LineChart from '../components/shared/charts/LineChart';
import SparkLine from '../components/shared/charts/SparkLine';
import { SleepStagesWeek } from '../components/shared/charts/SleepStagesChart';
import { SURF, TXT1, TXT2, TXT3, SB_H } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import {
  computeRingProgress,
  generateVoyageChronicle,
  computeActivityRings,
} from '../logic/progression';
import { THEMES, DEFAULT_THEME } from '../theme/themes';
import * as ai from '../services/aiService';

const { width: W } = Dimensions.get('window');
const CHART_W = W - 48;

const DISC_COLORS = { wado: '#D4A853', sandai: '#E52030', shusui: '#8EAABE' };
const RING_COLORS = { move: '#FB7185', exercise: '#4ADE80', stand: '#60A5FA' };

function toDateKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function getCurrentWeekDays(today) {
  const d = new Date(today + 'T00:00:00Z');
  const dayOfWeek = d.getUTCDay();
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() - dayOfWeek);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(sunday);
    dayDate.setUTCDate(sunday.getUTCDate() + i);
    days.push(toDateKey(dayDate));
  }
  return days;
}

function getLastNDays(today, n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i);
    days.push(toDateKey(d));
  }
  return days;
}

function shortDay(dateKey) {
  const d = new Date(dateKey + 'T00:00:00Z');
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getUTCDay()];
}

function shortDate(dateKey) {
  const d = new Date(dateKey + 'T00:00:00Z');
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

function HeroCard({ accent, children, style }) {
  return (
    <View style={[s.heroCard, { borderColor: accent + '38' }, style]}>
      {children}
    </View>
  );
}

function VoyageLogScreen() {
  const { progress, today, theme, handleUpdate } = useProgress();
  const [tab, setTab] = useState('log');
const [view, setView] = useState('weekly');
  const [monthOffset, setMonthOffset] = useState(0);
  const [trendRange, setTrendRange] = useState('7d');
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];

  const days7 = useMemo(() => getLastNDays(today, 7), [today]);
  const days30 = useMemo(() => getLastNDays(today, 30), [today]);
  const days90 = useMemo(() => getLastNDays(today, 90), [today]);
  const trendDays = trendRange === '7d' ? days7 : trendRange === '30d' ? days30 : days90;
  const weekDays = useMemo(() => getCurrentWeekDays(today), [today]);

  const weeklyBars = useMemo(() => {
    return weekDays.map(date => {
      const daySessions = (progress.sessions || []).filter(s => toDateKey(new Date(s.endedAt)) === date);
      const segments = ['wado', 'sandai', 'shusui']
        .map(disc => ({
          value: daySessions.filter(s => s.discipline === disc).length,
          color: DISC_COLORS[disc],
        }))
        .filter(s => s.value > 0);
      return { label: shortDay(date), segments: segments.length ? segments : [{ value: 0, color: 'transparent' }] };
    });
  }, [progress, weekDays]);

  const sharpness7 = useMemo(() =>
    weekDays.map(d => progress.swordSharpnessLog?.[d] ?? null),
    [progress, weekDays]);

  const rings7 = useMemo(() =>
    weekDays.map(d => computeRingProgress(progress, d)),
    [progress, weekDays]);

  const sleep7 = useMemo(() => {
    return weekDays.map(d => {
      const entry = progress.sleepLog?.[d];
      return entry ? { hours: entry.hours, quality: entry.quality } : null;
    });
  }, [progress, weekDays]);

  const weekSessions = useMemo(() =>
    (progress.sessions || []).filter(s => weekDays.includes(toDateKey(new Date(s.endedAt)))).length,
    [progress, weekDays]);

  const trendXP = useMemo(() =>
    trendDays.map(d => {
      const dayXP = (progress.sessions || [])
        .filter(s => toDateKey(new Date(s.endedAt)) === d)
        .reduce((a, s) => a + (s.xpEarned || 0), 0);
      return dayXP;
    }), [progress, trendDays]);

  const trendCal = useMemo(() =>
    trendDays.map(d => {
      return (progress.sessions || [])
        .filter(s => toDateKey(new Date(s.endedAt)) === d)
        .reduce((a, s) => a + (s.calories || 0), 0);
    }), [progress, trendDays]);

  const trendSteps = useMemo(() =>
    trendDays.map(d => progress.stepLog?.[d]?.steps ?? 0),
    [progress, trendDays]);

  const trendSharp = useMemo(() =>
    trendDays.map(d => progress.swordSharpnessLog?.[d] ?? null),
    [progress, trendDays]);

  const trendSleepHours = useMemo(() =>
    trendDays.map(d => progress.sleepLog?.[d]?.hours ?? null),
    [progress, trendDays]);

  const trendWeight = useMemo(() => {
    const weights = {};
    for (const s of progress.sessions || []) {
      const d = toDateKey(new Date(s.endedAt));
      if (!weights[d] && progress.bodyStats?.weight) {
        weights[d] = progress.bodyStats.weight;
      }
    }
    return trendDays.map(d => weights[d] ?? null);
  }, [progress, trendDays]);

  // One rings pass per trend day, shared by the closure trend and the ring
  // summary below — the summary previously recomputed this inline in JSX,
  // trendDays × 3 rings per render (270 calls at the 90d range).
  const trendRings = useMemo(() =>
    trendDays.map(d => computeActivityRings(progress, d)), [progress, trendDays]);

  const trendRingClosure = useMemo(() =>
    trendRings.map(r =>
      (r.move.pct >= 1 && r.exercise.pct >= 1 && r.stand.pct >= 1) ? 100 :
        Math.round(((r.move.pct + r.exercise.pct + r.stand.pct) / 3) * 100)
    ), [trendRings]);

  const now = new Date(today + 'T00:00:00Z');
  now.setUTCMonth(now.getUTCMonth() + monthOffset);
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const [year, month] = currentMonthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthDates = useMemo(() => {
    const ds = [];
    for (let d = 1; d <= daysInMonth; d++) {
      ds.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return ds;
  }, [daysInMonth, month, year]);

  const monthSessions = useMemo(() =>
    (progress.sessions || []).filter(s => monthDates.includes(toDateKey(new Date(s.endedAt)))),
    [progress, monthDates]);

  const monthStats = useMemo(() => {
    const totalXP = monthSessions.reduce((a, s) => a + (s.xpEarned || 0), 0);
    const totalCal = monthSessions.reduce((a, s) => a + (s.calories || 0), 0);
    const activeDays = new Set(monthSessions.map(s => toDateKey(new Date(s.endedAt)))).size;
    const discCounts = { wado: 0, sandai: 0, shusui: 0 };
    for (const s of monthSessions) discCounts[s.discipline] = (discCounts[s.discipline] || 0) + 1;
    const dominant = Object.entries(discCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'sandai';
    const monthSharp = monthDates.map(d => progress.swordSharpnessLog?.[d]).filter(v => v !== undefined);
    const avgSharpness = monthSharp.length ? Math.round(monthSharp.reduce((a, v) => a + v, 0) / monthSharp.length) : null;
    return { totalXP, totalCal, activeDays, discCounts, dominant, avgSharpness };
  }, [monthSessions, monthDates, progress]);

  const monthSharpnessLine = useMemo(() =>
    monthDates.map(d => progress.swordSharpnessLog?.[d] ?? null),
    [progress, monthDates]);

  const existingChronicle = (progress.voyageChronicles || []).find(c => c.monthKey === currentMonthKey);

  const generateChronicle = async () => {
    const chronicle = generateVoyageChronicle(progress, currentMonthKey);
    const st = chronicle.stats;
    const statsText =
      `Training month ${chronicle.monthKey}: ${st.activeDays} active days, ` +
      `${st.totalXP} XP, ${st.totalCal} calories, dominant discipline ${st.dominant}, ` +
      `average sword sharpness ${st.avgSharpness ?? 'unknown'}.`;
    // AI narration when AICore is present; otherwise the existing
    // templated narrative is returned unchanged.
    const narrative = await ai.narrate({ statsText, fallback: chronicle.narrative });
    // Functional: the await above is a multi-second window — spreading the
    // render snapshot here would revert any update that landed meanwhile.
    handleUpdate(prev => {
      const existing = (prev.voyageChronicles || []).filter(c => c.monthKey !== currentMonthKey);
      return { ...prev, voyageChronicles: [...existing, { ...chronicle, narrative }].slice(-36) };
    });
  };

  const qualityColor = q => {
    if (!q) return TXT3;
    if (q >= 4) return '#4ade80';
    if (q >= 3) return '#D4A853';
    return '#f87171';
  };

  return (
    <ScrollView contentContainerStyle={[s.scroll, { paddingTop: SB_H + 16 }]} showsVerticalScrollIndicator={false} removeClippedSubviews={true}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.screenTitle}>VOYAGE LOG</Text>
          <Text style={s.screenSub}>航海日誌 · Track your journey</Text>
        </View>
        <View style={[s.kanjiBadge, { backgroundColor: t.accent + '15' }]}>
          <Text style={[s.kanjiBadgeText, { color: t.accent }]}>録</Text>
        </View>
      </View>

      <View style={s.toggleRow}>
        {[{ key: 'log', label: 'LOG', kanji: '記録' }, { key: 'trends', label: 'TRENDS', kanji: '傾向' }].map(v => (
          <Pressable
            key={v.key}
            style={[s.toggleBtn, tab === v.key && { backgroundColor: t.accent + '15', borderColor: t.accent + '40' }]}
            onPress={() => setTab(v.key)}
            accessibilityRole="button"
            accessibilityLabel={v.label}
            accessibilityState={{ selected: tab === v.key }}
            hitSlop={{ top: 6, bottom: 6 }}
          >
            <Text style={[s.toggleTxt, tab === v.key && { color: t.accent }]}>{v.label}</Text>
            <Text style={[s.toggleKanji, tab === v.key && { color: t.accent }]}>{v.kanji}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'log' && (
        <>
          <View style={s.subToggleRow}>
            {[{ key: 'weekly', label: 'WEEKLY', kanji: '週' }, { key: 'monthly', label: 'MONTHLY', kanji: '月' }].map(v => (
              <Pressable
                key={v.key}
                style={[s.subToggleBtn, view === v.key && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                onPress={() => setView(v.key)}
                accessibilityRole="button"
                accessibilityLabel={v.label}
                accessibilityState={{ selected: view === v.key }}
                hitSlop={{ top: 8, bottom: 8 }}
              >
                <Text style={[s.subToggleTxt, view === v.key && s.subToggleActiveTxt]}>{v.label}</Text>
              </Pressable>
            ))}
          </View>

          <View>
            {view === 'weekly' && (
            <>
              <View style={s.statRow}>
                {[
                  { label: 'SESSIONS', value: weekSessions, color: '#E52030', kanji: '戦' },
                  { label: 'XP', value: (progress.sessions || []).filter(s => weekDays.includes(toDateKey(new Date(s.endedAt)))).reduce((a, s) => a + (s.xpEarned || 0), 0), color: '#B967FF', kanji: '力' },
                  { label: 'KCAL', value: Math.round((progress.sessions || []).filter(s => weekDays.includes(toDateKey(new Date(s.endedAt)))).reduce((a, s) => a + (s.calories || 0), 0)), color: '#F59E0B', kanji: '火' },
                ].map(item => (
                  <HeroCard key={item.label} accent={item.color} style={s.statCard}>
                    <View style={[s.statKanjiBox, { borderColor: item.color + '40' }]}>
                      <Text style={[s.statKanji, { color: item.color }]}>{item.kanji}</Text>
                    </View>
                    <Text style={[s.statNum, { color: item.color }]}>{item.value.toLocaleString()}</Text>
                    <Text style={s.statLbl}>{item.label}</Text>
                  </HeroCard>
                ))}
              </View>

              <SectionLabel label="DAILY DISCIPLINE · 日次流派" style={{ marginTop: 20, marginBottom: 10 }} />
              <HeroCard accent="#E52030">
                <BarChart bars={weeklyBars} width={CHART_W} height={80} />
              </HeroCard>

              <SectionLabel label="SWORD SHARPNESS · 刀の鋭さ" style={{ marginTop: 20, marginBottom: 10 }} />
              <HeroCard accent="#4A9EFF">
                <View style={{ alignItems: 'center' }}>
                  <SparkLine data={sharpness7.map(v => v ?? 0)} color="#4A9EFF" width={CHART_W} height={48} dotRadius={3} />
                  <View style={s.sparkLabels}>
                    {weekDays.map((d, i) => <Text key={i} style={s.sparkLabel}>{shortDay(d)}</Text>)}
                  </View>
                </View>
              </HeroCard>

              <SectionLabel label="RING CLOSURES · 三環" style={{ marginTop: 20, marginBottom: 10 }} />
              <HeroCard accent="#D4A853">
                {(['wado', 'sandai', 'shusui']).map(key => (
                  <View key={key} style={s.ringRow}>
                    <View style={[s.ringLabelBox, { backgroundColor: DISC_COLORS[key] + '15' }]}>
                      <Text style={[s.ringLabel, { color: DISC_COLORS[key] }]}>{key.toUpperCase()}</Text>
                    </View>
                    <View style={s.ringDots}>
                      {weekDays.map((d, i) => {
                        const pct = rings7[i]?.[key]?.pct ?? 0;
                        return (
                          <View key={i} style={[s.ringDot, { backgroundColor: pct >= 1 ? DISC_COLORS[key] : pct > 0 ? DISC_COLORS[key] + '55' : 'rgba(255,255,255,0.08)' }]} />
                        );
                      })}
                    </View>
                  </View>
                ))}
              </HeroCard>

              <SectionLabel label="SLEEP VOYAGE · 睡眠の航海" style={{ marginTop: 20, marginBottom: 10 }} />
              <HeroCard accent="#D4A853">
                <View style={s.sleepBars}>
                  {sleep7.map((entry, i) => (
                    <View key={i} style={s.sleepBarWrap}>
                      <View style={s.sleepBarTrack}>
                        <View style={[s.sleepBarFill, {
                          height: `${Math.min(((entry?.hours ?? 0) / 9) * 100, 100)}%`,
                          backgroundColor: qualityColor(entry?.quality),
                        }]} />
                      </View>
                      <Text style={s.sleepBarLabel}>{shortDay(weekDays[i])}</Text>
                      {entry?.hours && <Text style={s.sleepHours}>{entry.hours}h</Text>}
                    </View>
                  ))}
                </View>
              </HeroCard>

              <HeroCard accent="#B967FF" style={{ marginTop: 10 }}>
                <Text style={s.narrativeTxt}>
                  {weekSessions === 0
                    ? 'The seas were calm this week. Too calm. A swordsman does not rest when there are still blades to sharpen. 今週は海が穏やかだった。'
                    : weekSessions >= 5
                      ? `${weekSessions} sessions this week. The training log does not lie — you are becoming something. 訓練は嘘をつかない。`
                      : `${weekSessions} sessions this week. Steady progress. The voyage continues. 航海は続く。`}
                </Text>
              </HeroCard>
            </>
          )}

          {view === 'monthly' && (
            <>
              <View style={s.monthSelector}>
                <Pressable
                  onPress={() => setMonthOffset(o => o - 1)}
                  style={s.monthArrow}
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                >
                  <Text style={s.monthArrowTxt}>←</Text>
                </Pressable>
                <View style={s.monthLabelWrap}>
                  <Text style={s.monthLabel}>{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
                </View>
                <Pressable
                  onPress={() => setMonthOffset(o => Math.min(o + 1, 0))}
                  style={[s.monthArrow, monthOffset >= 0 && { opacity: 0.3 }]}
                  disabled={monthOffset >= 0}
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  accessibilityState={{ disabled: monthOffset >= 0 }}
                >
                  <Text style={s.monthArrowTxt}>→</Text>
                </Pressable>
              </View>

              <View style={s.statRow}>
                {[
                  { label: 'ACTIVE DAYS', value: monthStats.activeDays, color: '#E52030', kanji: '活' },
                  { label: 'TOTAL XP', value: monthStats.totalXP.toLocaleString(), color: '#B967FF', kanji: '力' },
                  { label: 'AVG SHARP', value: monthStats.avgSharpness ?? '—', color: '#4A9EFF', kanji: '鋭' },
                ].map(item => (
                  <HeroCard key={item.label} accent={item.color} style={s.statCard}>
                    <View style={[s.statTopAccent, { backgroundColor: item.color }]} />
                    <Text style={[s.statNum, { color: item.color }]}>{item.value}</Text>
                    <Text style={s.statLbl}>{item.label}</Text>
                  </HeroCard>
                ))}
              </View>

              <HeroCard accent={DISC_COLORS[monthStats.dominant]} style={{ marginBottom: 10 }}>
                <Text style={[s.dominantLabel, { color: DISC_COLORS[monthStats.dominant] }]}>DOMINANT BLADE · 主導流派</Text>
                <Text style={[s.dominantVal, { color: DISC_COLORS[monthStats.dominant] }]}>{monthStats.dominant.toUpperCase()}</Text>
              </HeroCard>

              <SectionLabel label="DAILY SHARPNESS · 毎日の鋭さ" style={{ marginTop: 20, marginBottom: 10 }} />
              <HeroCard accent="#4A9EFF">
                <LineChart data={monthSharpnessLine.map(v => v ?? 0)} color="#4A9EFF" width={CHART_W} height={80} />
              </HeroCard>

              <SectionLabel label="ACTIVITY HEATMAP · 活動熱図" style={{ marginTop: 20, marginBottom: 10 }} />
              <HeroCard accent="#E52030">
                <FlatList
                  data={monthDates}
                  numColumns={7}
                  keyExtractor={(item, i) => String(i)}
                  renderItem={({ item: date }) => {
                    const daySessions = (progress.sessions || []).filter(s => toDateKey(new Date(s.endedAt)) === date);
                    const count = daySessions.length;
                    const intensity = count === 0 ? 0 : count === 1 ? 0.35 : count === 2 ? 0.65 : 1;
                    return (
                      <View style={[s.heatDot, { backgroundColor: count > 0 ? `rgba(220,20,60,${intensity})` : 'rgba(255,255,255,0.05)' }]} />
                    );
                  }}
                  scrollEnabled={false}
                />
              </HeroCard>

              <SectionLabel label="VOYAGE CHRONICLE · 航海記" style={{ marginTop: 20, marginBottom: 10 }} />
              {existingChronicle ? (
                <HeroCard accent="#B967FF" style={{ marginBottom: 10 }}>
                  <View style={s.chronicleHeader}>
                    <Text style={s.chronicleMonth}>{existingChronicle.monthKey}</Text>
                    <Text style={[s.chronicleKanji, { color: '#B967FF' }]}>航</Text>
                  </View>
                  <Text style={s.chronicleNarrative}>{existingChronicle.narrative}</Text>
                  <Text style={s.chronicleStatTxt}>
                    {existingChronicle.stats.activeDays} active days · {existingChronicle.stats.totalXP.toLocaleString()} XP
                  </Text>
                </HeroCard>
              ) : (
                <Pressable
                  onPress={generateChronicle}
                  style={s.generateBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Generate chronicle"
                >
                  <Text style={s.generateBtnTxt}>GENERATE CHRONICLE · 記録を生成</Text>
                </Pressable>
              )}
            </>
          )}
          </View>
        </>
      )}

      {tab === 'trends' && (
        <>
          <View style={s.subToggleRow}>
            {[['7d', '7 DAYS'], ['30d', '30 DAYS'], ['90d', '90 DAYS']].map(([key, label]) => (
              <Pressable
                key={key}
                style={[s.subToggleBtn, trendRange === key && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                onPress={() => setTrendRange(key)}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: trendRange === key }}
                hitSlop={{ top: 8, bottom: 8 }}
              >
                <Text style={[s.subToggleTxt, trendRange === key && s.subToggleActiveTxt]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={s.statRow}>
            {[
              { label: 'AVG XP/DAY', value: trendDays.length > 0 ? Math.round(trendXP.reduce((a, v) => a + v, 0) / trendDays.filter((_, i) => trendXP[i] > 0).length || 0) : 0, color: '#B967FF', kanji: '平' },
              { label: 'TOTAL KCAL', value: Math.round(trendCal.reduce((a, v) => a + v, 0)).toLocaleString(), color: '#F59E0B', kanji: '熱' },
              { label: 'AVG SHARP', value: Math.round(trendSharp.filter(v => v != null).reduce((a, v, _, arr) => a + v / arr.length, 0)) || '—', color: '#4A9EFF', kanji: '鋭' },
            ].map(item => (
              <HeroCard key={item.label} accent={item.color} style={s.statCard}>
                <View style={[s.statKanjiBox, { borderColor: item.color + '40' }]}>
                  <Text style={[s.statKanji, { color: item.color }]}>{item.kanji}</Text>
                </View>
                <Text style={[s.statNum, { color: item.color }]}>{item.value}</Text>
                <Text style={s.statLbl}>{item.label}</Text>
              </HeroCard>
            ))}
          </View>

          <SectionLabel label="XP PROGRESSION · 経験値の進捗" style={{ marginTop: 20, marginBottom: 10 }} />
          <HeroCard accent="#B967FF">
            <LineChart
              data={trendXP}
              color="#B967FF"
              width={CHART_W}
              height={80}
              labels={trendDays.length <= 7 ? trendDays.map(d => shortDay(d)) : trendDays.filter((_, i) => i % Math.ceil(trendDays.length / 7) === 0).map(d => shortDay(d))}
            />
            <Text style={s.chartSubText}>{trendXP.reduce((a, v) => a + v, 0).toLocaleString()} XP total · {trendDays.length}d window</Text>
          </HeroCard>

          <SectionLabel label="CALORIES BURNED · 消費カロリー" style={{ marginTop: 20, marginBottom: 10 }} />
          <HeroCard accent="#F59E0B">
            <LineChart data={trendCal} color="#F59E0B" width={CHART_W} height={80} labels={trendDays.length <= 7 ? trendDays.map(d => shortDay(d)) : []} />
            <Text style={s.chartSubText}>{Math.round(trendCal.reduce((a, v) => a + v, 0)).toLocaleString()} kcal total</Text>
          </HeroCard>

          <SectionLabel label="STEP COUNT · 歩数" style={{ marginTop: 20, marginBottom: 10 }} />
          <HeroCard accent="#FB7185">
            {trendDays.length <= 30 ? (
              <LineChart data={trendSteps} color="#FB7185" width={CHART_W} height={80} labels={trendDays.map(d => shortDate(d))} />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <SparkLine data={trendSteps.map(v => v)} color="#FB7185" width={CHART_W} height={48} dotRadius={2} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 }}>
                  {['7d', '30d', '90d'].map(r => (
                    <Text key={r} style={s.miniStat}>
                      {r === '7d' ? `${trendSteps.slice(-7).reduce((a, v) => a + v, 0).toLocaleString()} steps` :
                        r === '30d' ? `${trendSteps.slice(-30).reduce((a, v) => a + v, 0).toLocaleString()} steps` :
                          `${trendSteps.reduce((a, v) => a + v, 0).toLocaleString()} steps`}
                    </Text>
                  ))}
                </View>
              </View>
            )}
            <Text style={s.chartSubText}>{trendSteps.reduce((a, v) => a + v, 0).toLocaleString()} total steps</Text>
          </HeroCard>

          <SectionLabel label="SWORD SHARPNESS · 刀の鋭さ" style={{ marginTop: 20, marginBottom: 10 }} />
          <HeroCard accent="#4A9EFF">
            <LineChart data={trendSharp.map(v => v ?? 0)} color="#4A9EFF" width={CHART_W} height={80} labels={trendDays.length <= 7 ? trendDays.map(d => shortDay(d)) : []} />
            <Text style={s.chartSubText}>Peak: {Math.max(...trendSharp.filter(v => v != null), 0)} · Low: {Math.min(...trendSharp.filter(v => v != null), 100)}</Text>
          </HeroCard>

          <SectionLabel label="SLEEP HOURS · 睡眠時間" style={{ marginTop: 20, marginBottom: 10 }} />
          <HeroCard accent="#7C3AED">
            <LineChart data={trendSleepHours.map(v => v ?? 0)} color="#7C3AED" width={CHART_W} height={80} labels={trendDays.length <= 7 ? trendDays.map(d => shortDay(d)) : []} />
            <Text style={s.chartSubText}>Avg: {trendSleepHours.filter(v => v != null).length > 0 ? (trendSleepHours.filter(v => v != null).reduce((a, v) => a + v, 0) / trendSleepHours.filter(v => v != null).length).toFixed(1) : '—'}h · logged {trendSleepHours.filter(v => v != null).length}/{trendDays.length} days</Text>
          </HeroCard>

          <SectionLabel label="SLEEP STAGES · 睡眠段階" style={{ marginTop: 20, marginBottom: 10 }} />
          <HeroCard accent="#7C3AED">
            {(() => {
              const weekSleep = [];
              const end = new Date(today + 'T00:00:00');
              for (let i = 6; i >= 0; i--) {
                const d = new Date(end); d.setUTCDate(end.getUTCDate() - i);
                const dk = toDateKey(d);
                weekSleep.push({ date: dk, sleepData: progress.sleepLog?.[dk] || null });
              }
              return weekSleep.some(d => d.sleepData) ? (
                <SleepStagesWeek weekData={weekSleep} />
              ) : (
                <Text style={s.emptyText}>No sleep stage data yet · まだデータがありません</Text>
              );
            })()}
          </HeroCard>

          <SectionLabel label="RING CLOSURE RATE · リング完了率" style={{ marginTop: 20, marginBottom: 10 }} />
          <HeroCard accent="#D4A853">
            <LineChart data={trendRingClosure} color="#D4A853" width={CHART_W} height={80} labels={trendDays.length <= 7 ? trendDays.map(d => shortDay(d)) : []} />
            <Text style={s.chartSubText}>{trendRingClosure.filter(v => v >= 100).length}/{trendDays.length} days all rings closed · 全環完了</Text>
          </HeroCard>

          {progress.bodyStats?.weight && (
            <>
              <SectionLabel label="BODY WEIGHT · 体重" style={{ marginTop: 20, marginBottom: 10 }} />
              <HeroCard accent="#E52030">
                <LineChart data={trendWeight.map(v => v ?? 0)} color="#E52030" width={CHART_W} height={80} labels={trendDays.length <= 7 ? trendDays.map(d => shortDay(d)) : []} />
                <Text style={s.chartSubText}>Current: {progress.bodyStats.weight} kg</Text>
              </HeroCard>
            </>
          )}

          <SectionLabel label="ACTIVITY RINGS SUMMARY · アクティビティ環" style={{ marginTop: 20, marginBottom: 10 }} />
          <HeroCard accent="#FB7185">
            {['move', 'exercise', 'stand'].map(key => {
              const total = trendRings.reduce((a, r) => a + (r[key]?.current ?? 0), 0);
              const goalTotal = trendDays.length * (key === 'move' ? 500 : key === 'exercise' ? 60 : 8);
              const pct = Math.min(1, total / goalTotal);
              return (
                <View key={key} style={s.ringTrendRow}>
                  <View style={[s.ringTrendLabelBox, { backgroundColor: RING_COLORS[key] + '15' }]}>
                    <Text style={[s.ringTrendLabel, { color: RING_COLORS[key] }]}>{key.toUpperCase()}</Text>
                  </View>
                  <View style={s.ringTrendBar}>
                    <View style={[s.ringTrendFill, { width: `${pct * 100}%`, backgroundColor: RING_COLORS[key] }]} />
                  </View>
                  <Text style={s.ringTrendVal}>{Math.round(pct * 100)}%</Text>
                </View>
              );
            })}
          </HeroCard>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  screenTitle: { ...DS.type.screenTitle, color: TXT1 },
  screenSub: { ...DS.type.caption, color: TXT3, marginTop: 5, letterSpacing: 0.5 },
  kanjiBadge: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  kanjiBadgeText: { fontSize: 20, fontWeight: '900' },

  heroCard: { backgroundColor: SURF, borderWidth: StyleSheet.hairlineWidth, borderRadius: DS.radius.lg, padding: DS.space.lg },

  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.10)' },
  toggleBtn: { flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  toggleActive: {},
  toggleTxt: { ...DS.type.label, color: TXT3, letterSpacing: 1.5 },
  toggleKanji: { fontSize: 12, fontWeight: '900', color: TXT3, marginTop: 2 },
  toggleActiveTxt: { color: TXT1 },

  subToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3 },
  subToggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  subToggleActive: {},
  subToggleTxt: { ...DS.type.micro, fontWeight: '800', letterSpacing: 1.5, color: TXT3 },
  subToggleActiveTxt: { color: TXT1 },

  statRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16, marginBottom: 0 },
  statKanjiBox: { width: 28, height: 28, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statKanji: { fontSize: 14, fontWeight: '900' },
  statNum: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  statLbl: { ...DS.type.micro, color: TXT3, marginTop: 5, letterSpacing: 1 },

  sparkLabels: { flexDirection: 'row', width: '100%', marginTop: 8 },
  sparkLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: TXT3, fontWeight: '700' },

  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  ringLabelBox: { width: 56, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { ...DS.type.micro, fontWeight: '800', letterSpacing: 0.5 },
  ringDots: { flexDirection: 'row', gap: 6, flex: 1 },
  ringDot: { width: 20, height: 20, borderRadius: 10 },

  sleepBars: { flexDirection: 'row', gap: 6, justifyContent: 'space-around', height: 88, alignItems: 'flex-end' },
  sleepBarWrap: { alignItems: 'center', gap: 5, flex: 1 },
  sleepBarTrack: { width: 16, height: 60, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end' },
  sleepBarFill: { width: '100%', borderRadius: 8 },
  sleepBarLabel: { ...DS.type.micro, color: TXT3, fontWeight: '700' },
  sleepHours: { fontSize: 11, color: TXT3 },

  narrativeTxt: { fontSize: 14, color: TXT2, fontFamily: DS.font.display, lineHeight: 23, fontStyle: 'italic' },

  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  monthArrow: { padding: 12 },
  monthArrowTxt: { fontSize: 20, color: TXT1, fontWeight: '700' },
  monthLabelWrap: { alignItems: 'center' },
  monthLabel: { fontSize: 16, fontWeight: '800', color: TXT1 },

  dominantLabel: { ...DS.type.label, marginBottom: 6 },
  dominantVal: { ...DS.type.displayLg, fontSize: 30 },

  heatDot: { width: 20, height: 20, borderRadius: 4, margin: 2 },

  chronicleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chronicleMonth: { ...DS.type.label, color: TXT2, letterSpacing: 2 },
  chronicleKanji: { fontSize: 24, fontWeight: '900' },
  chronicleNarrative: { fontSize: 14, color: TXT2, fontFamily: DS.font.display, lineHeight: 23, fontStyle: 'italic', marginBottom: 10 },
  chronicleStatTxt: { ...DS.type.caption, color: TXT3, fontWeight: '600' },

  generateBtn: { paddingVertical: 16, borderRadius: 100, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  generateBtnTxt: { fontSize: 13, fontWeight: '800', letterSpacing: 2, color: TXT2 },

  chartSubText: { ...DS.type.caption, color: TXT3, marginTop: 10, fontWeight: '600' },
  miniStat: { fontSize: 12, color: TXT3, fontWeight: '700' },
  emptyText: { ...DS.type.bodySm, color: TXT3, fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },

  ringTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  ringTrendLabelBox: { width: 64, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  ringTrendLabel: { ...DS.type.micro, fontWeight: '800', letterSpacing: 0.5 },
  ringTrendBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  ringTrendFill: { height: 6, borderRadius: 3 },
  ringTrendVal: { fontSize: 12, fontWeight: '800', color: TXT1, width: 38, textAlign: 'right' },
});
// Prop-less pager screen: memo stops parent re-renders (toasts, tab
// animation state in Dojo) from cascading into all six mounted screens.
export default React.memo(VoyageLogScreen);
