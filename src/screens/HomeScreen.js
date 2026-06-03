import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useProgress } from '../context/ProgressContext';
import { Panel, SWORD_ORDER, SWORD_GLYPH } from '../components/premium/PremiumUI';
import { THEMES, DEFAULT_THEME } from '../theme/themes';
import { TXT1, TXT2, TXT3, SB_H, TAB_BAR_H } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import {
  currentStreak,
  getDailyRecommendation,
  getReadinessLevel,
  getReadinessColor,
  rankIndexFor,
  computeSwordSharpness,
  getSharpnessLabel,
  getSharpnessColor,
} from '../logic/progression';
import { SWORDS, RANKS } from '../data/gameData';
import useStepCounter from '../hooks/useStepCounter';
import useReducedMotion from '../hooks/useReducedMotion';

function greetingFor(date) {
  const hour = date.getHours();
  if (hour < 5) return 'Quiet night';
  if (hour < 12) return 'Morning focus';
  if (hour < 17) return 'Ready to move';
  if (hour < 22) return 'Evening steel';
  return 'Recovery window';
}

function formatDate(date) {
  return date.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTime(date) {
  return date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
}

// Relative luminance → pick legible ink for a solid accent fill.
function inkOn(hex) {
  const h = (hex || '').replace('#', '');
  if (h.length < 6) return '#070707';
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? '#0A0A0A' : '#FFFFFF';
}

// A clean instrument gauge: track + tonal arc, serif numeral at the core.
function SharpnessGauge({ value, color, size = 138 }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / 100));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
        />
      </Svg>
      <View style={gaugeStyles.center}>
        <Text style={[gaugeStyles.value, { color }]}>{value}</Text>
        <Text style={gaugeStyles.scale}>/ 100</Text>
      </View>
    </View>
  );
}

function StatColumn({ mark, value, unit, accent, first }) {
  return (
    <View style={[s.statCol, !first && s.statColDivider]}>
      <Text style={[s.statMark, { color: accent }]}>{mark}</Text>
      <Text style={s.statValue} numberOfLines={1}>{value}</Text>
      <Text style={s.statUnit} numberOfLines={1}>{unit}</Text>
    </View>
  );
}

function HomeScreen() {
  const { progress, today, theme, setTab, handleUpdate } = useProgress();
  const { steps } = useStepCounter();
  const reducedMotion = useReducedMotion();
  const [now, setNow] = useState(() => new Date());
  const enter = useRef(new Animated.Value(0)).current;
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      enter.setValue(1);
      return undefined;
    }
    enter.setValue(0);
    const anim = Animated.timing(enter, { toValue: 1, duration: 520, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [enter, reducedMotion]);

  const rankIdx = rankIndexFor(progress.totalXP);
  const rank = RANKS[rankIdx];
  const nextRank = RANKS[rankIdx + 1];
  const xpInto = progress.totalXP - rank.min;
  const xpFor = (nextRank?.min ?? rank.max) - rank.min;
  const xpPct = Math.min(1, xpInto / (Number.isFinite(xpFor) ? xpFor : 1));
  const rec = getDailyRecommendation(progress, now);
  const recKey = rec.type === 'rest' ? progress.activeSword || 'wado' : rec.discipline || progress.activeSword || 'sandai';
  const recSword = SWORDS[recKey];
  const readiness = getReadinessLevel(progress);
  const readyColor = getReadinessColor(progress);
  const streak = currentStreak(progress, today);
  const sharpness = computeSwordSharpness(progress, today);
  const sharpLabel = getSharpnessLabel(sharpness);
  const sharpColor = getSharpnessColor(sharpness);
  const name = progress.userProfile?.name?.split(' ')[0] || 'Swordsman';
  const stepGoal = progress.settings?.stepGoal || 10000;
  const stepsPct = Math.min(1, steps / stepGoal);
  // CTA carries the theme accent for a committed palette; the recommended
  // discipline is signalled by the kanji tile + sublabel, not a 4th hue.
  const ctaInk = inkOn(t.accent);

  useEffect(() => {
    const existing = progress.swordSharpnessLog?.[today];
    if (existing === undefined || Math.abs(existing - sharpness) > 5) {
      handleUpdate(prev => ({
        ...prev,
        swordSharpnessLog: { ...prev.swordSharpnessLog, [today]: sharpness },
      }));
    }
  }, [today, sharpness, progress.swordSharpnessLog, handleUpdate]);

  const subtitle = useMemo(() => `${formatDate(now)}  ·  ${formatTime(now)}`, [now]);

  const startTraining = () => {
    handleUpdate(prev => ({ ...prev, activeSword: recKey }));
    setTab('train');
  };

  const goSword = (key) => {
    handleUpdate(prev => ({ ...prev, activeSword: key }));
    setTab('train');
  };

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingTop: SB_H + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: enter, transform: [{ translateY }] }}>
        {/* Masthead */}
        <View style={s.masthead}>
          <View style={s.mastheadCopy}>
            <Text style={[s.eyebrow, { color: t.accent }]}>{greetingFor(now).toUpperCase()}</Text>
            <Text style={s.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{name}</Text>
            <Text style={s.date}>{subtitle}</Text>
          </View>
          <View style={[s.rankChip, { borderColor: rank.color + '33' }]}>
            <Text style={s.rankChipTop}>段 · RANK</Text>
            <Text style={[s.rankChipName, { color: rank.color }]} numberOfLines={2}>{rank.name}</Text>
          </View>
        </View>

        {/* Hero — sword sharpness as an instrument, not a billboard number */}
        <Panel accent={sharpColor} style={s.hero}>
          <Text style={[s.heroSeal, { color: t.accent }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {t.name.split('·')[1]?.trim()?.charAt(0) || '気'}
          </Text>

          <SharpnessGauge value={sharpness} color={sharpColor} />

          <View style={s.heroBody}>
            <View style={s.heroLabelRow}>
              <Text style={s.heroEyebrow}>SWORD SHARPNESS</Text>
              <View style={s.readyRow}>
                <View style={[s.readyDot, { backgroundColor: readyColor }]} />
                <Text style={[s.readyText, { color: readyColor }]}>{readiness}</Text>
              </View>
            </View>
            <Text style={[s.heroState, { color: sharpColor }]} numberOfLines={1}>{sharpLabel}</Text>
            <Text style={s.heroDesc}>
              Recovery {progress.recoveryScore} of 100. Train while the blade runs clean.
            </Text>
          </View>
        </Panel>

        {/* Primary action + sensei line */}
        <Pressable
          onPress={startTraining}
          accessibilityRole="button"
          accessibilityLabel={`Begin training, ${recSword.name}`}
          style={({ pressed }) => [
            s.cta,
            { backgroundColor: t.accent, shadowColor: t.accent, transform: [{ scale: pressed ? 0.99 : 1 }] },
          ]}
        >
          <View style={[s.ctaKanji, { backgroundColor: ctaInk === '#FFFFFF' ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.10)' }]}>
            <Text style={[s.ctaKanjiText, { color: ctaInk }]}>{recSword.kanji?.charAt(0)}</Text>
          </View>
          <View style={s.ctaCopy}>
            <Text style={[s.ctaLabel, { color: ctaInk }]}>BEGIN TRAINING</Text>
            <Text style={[s.ctaSub, { color: ctaInk, opacity: 0.66 }]} numberOfLines={1}>
              {recSword.name} · {recSword.discipline.toLowerCase()}
            </Text>
          </View>
          <Text style={[s.ctaArrow, { color: ctaInk }]}>→</Text>
        </Pressable>
        <Text style={s.sensei}>“{rec.phrase}”</Text>

        {/* Rank progress rail */}
        <View style={s.ledger}>
          <View style={s.railHead}>
            <Text style={s.railLabel}>PATH TO {nextRank ? nextRank.name : 'THE SUMMIT'}</Text>
            <Text style={[s.railPct, { color: rank.color }]}>{Math.round(xpPct * 100)}%</Text>
          </View>
          <View style={s.railTrack}>
            <View style={[s.railFill, { width: `${xpPct * 100}%`, backgroundColor: rank.color }]} />
          </View>
          <Text style={s.railCaption}>
            {nextRank ? `${(nextRank.min - progress.totalXP).toLocaleString()} XP remaining` : 'Highest rank reached'}
          </Text>
        </View>

        {/* Inline stat triplet — text-forward, divided, not a card grid */}
        <View style={s.statBand}>
          <StatColumn first mark="連" value={`${streak}`} unit="day streak" accent={t.accent} />
          <StatColumn mark="気" value={`${progress.recoveryScore}`} unit="recovery" accent={readyColor} />
          <StatColumn mark="歩" value={steps.toLocaleString()} unit={`${Math.round(stepsPct * 100)}% steps`} accent={t.accent} />
        </View>

        {/* The three swords — identity triptych, each path tappable */}
        <View style={s.swordsHead}>
          <Text style={s.swordsTitle}>三刀流 · THE THREE SWORDS</Text>
        </View>
        <View style={s.triptych}>
          {SWORD_ORDER.map((key) => {
            const sword = SWORDS[key];
            const isRec = key === recKey;
            return (
              <Pressable
                key={key}
                onPress={() => goSword(key)}
                accessibilityRole="button"
                accessibilityLabel={`${sword.name}, ${sword.discipline}`}
                style={({ pressed }) => [
                  s.sword,
                  { borderColor: isRec ? sword.accent + '55' : 'rgba(255,255,255,0.08)', backgroundColor: isRec ? sword.accent + '12' : 'rgba(255,255,255,0.02)' },
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <Text style={[s.swordKanji, { color: sword.accent }]}>{SWORD_GLYPH[key] || sword.kanji.charAt(0)}</Text>
                <Text style={s.swordName} numberOfLines={1}>{sword.name.split(' ')[0]}</Text>
                <Text style={[s.swordDisc, isRec && { color: sword.accent }]}>{sword.discipline}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const gaugeStyles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  value: {
    fontFamily: DS.font.display,
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '700',
  },
  scale: {
    color: TXT3,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: 1,
  },
});

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: DS.space.lg,
    paddingBottom: TAB_BAR_H + DS.space.xl,
    gap: DS.space.lg,
  },

  // Masthead
  masthead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: DS.space.md,
  },
  mastheadCopy: { flex: 1 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  name: {
    fontFamily: DS.font.display,
    color: TXT1,
    fontSize: 33,
    lineHeight: 37,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  date: {
    color: TXT3,
    fontSize: 12.5,
    letterSpacing: 0.4,
    marginTop: 8,
  },
  rankChip: {
    maxWidth: 122,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  rankChipTop: {
    color: TXT3,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  rankChipName: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 16,
  },

  // Hero
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.lg,
    paddingVertical: DS.space.xl,
  },
  heroSeal: {
    position: 'absolute',
    right: -8,
    top: -26,
    fontSize: 150,
    fontWeight: '900',
    opacity: 0.05,
  },
  heroBody: { flex: 1 },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  heroEyebrow: {
    color: TXT3,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  readyDot: { width: 6, height: 6, borderRadius: 3 },
  readyText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.6 },
  heroState: {
    fontFamily: DS.font.display,
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroDesc: {
    color: TXT2,
    fontSize: 13,
    lineHeight: 19,
  },

  // CTA
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    borderRadius: 22,
    paddingVertical: 15,
    paddingHorizontal: 16,
    minHeight: 76,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 12,
  },
  ctaKanji: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaKanjiText: { fontSize: 24, fontWeight: '900' },
  ctaCopy: { flex: 1 },
  ctaLabel: { fontSize: 16, fontWeight: '900', letterSpacing: 1.2 },
  ctaSub: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  ctaArrow: { fontSize: 22, fontWeight: '700' },
  sensei: {
    fontFamily: DS.font.display,
    color: TXT3,
    fontSize: 14.5,
    lineHeight: 21,
    fontStyle: 'italic',
    paddingHorizontal: 2,
  },

  // Rank rail ledger
  ledger: { gap: 10 },
  railHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  railLabel: {
    color: TXT2,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    flex: 1,
  },
  railPct: {
    fontFamily: DS.font.display,
    fontSize: 19,
    fontWeight: '700',
  },
  railTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  railFill: { height: '100%', borderRadius: 3 },
  railCaption: {
    color: TXT3,
    fontSize: 12,
    letterSpacing: 0.3,
  },

  // Stat band
  statBand: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 18,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  statColDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.08)',
  },
  statMark: { fontSize: 14, fontWeight: '900' },
  statValue: {
    fontFamily: DS.font.display,
    color: TXT1,
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '700',
  },
  statUnit: {
    color: TXT3,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // Three swords triptych
  swordsHead: { marginTop: 2 },
  swordsTitle: {
    color: TXT2,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  triptych: {
    flexDirection: 'row',
    gap: DS.space.sm,
    marginTop: -6,
  },
  sword: {
    flex: 1,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 7,
  },
  swordKanji: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
  },
  swordName: {
    fontFamily: DS.font.display,
    color: TXT1,
    fontSize: 14,
    fontWeight: '700',
  },
  swordDisc: {
    color: TXT3,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});

// Off-screen pages still subscribe to progress via useProgress, so memo only
// skips re-renders when Dojo's local state (toast, modal, flash) churns while
// progress is unchanged. Modest win, but it's the cheap one.
export default React.memo(HomeScreen);
