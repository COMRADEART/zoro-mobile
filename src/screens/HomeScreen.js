import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import { Panel, PrimaryButton, MetricTile, ProgressRail, ScreenHeader } from '../components/premium/PremiumUI';
import { THEMES, DEFAULT_THEME } from '../theme/themes';
import { TXT1, TXT2, TXT3, SB_H, TAB_BAR_H, GOLD, STEEL } from '../theme/tokens';
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
  return date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(date) {
  return date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
}

function HomeScreen() {
  const { progress, today, theme, setTab, handleUpdate } = useProgress();
  const { steps } = useStepCounter();
  const reducedMotion = useReducedMotion();
  const [now, setNow] = useState(() => new Date());
  const pulse = useRef(new Animated.Value(0)).current;
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(0.42);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reducedMotion]);

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

  useEffect(() => {
    const existing = progress.swordSharpnessLog?.[today];
    if (existing === undefined || Math.abs(existing - sharpness) > 5) {
      handleUpdate(prev => ({
        ...prev,
        swordSharpnessLog: { ...prev.swordSharpnessLog, [today]: sharpness },
      }));
    }
  }, [today, sharpness, progress.swordSharpnessLog, handleUpdate]);

  const auraScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.05] });
  const auraOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.20, 0.46] });

  const subtitle = useMemo(() => {
    const date = formatDate(now);
    const time = formatTime(now);
    return `${date}  ·  ${time}`;
  }, [now]);

  const startTraining = () => {
    handleUpdate(prev => ({ ...prev, activeSword: recKey }));
    setTab('train');
  };

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingTop: SB_H + 18 }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow={greetingFor(now)}
        title={`Welcome, ${name}`}
        subtitle={subtitle}
        accent={recSword.accent}
        mark={recSword.kanji?.slice(0, 1)}
        right={(
          <View
            style={[s.rankPill, { borderColor: rank.color + '30', backgroundColor: rank.color + '10' }]}
            accessible={true}
            accessibilityLabel={`Rank: ${rank.name}`}
          >
            <Text style={[s.rankPillTop, { color: rank.color }]}>Rank</Text>
            <Text style={s.rankPillName} numberOfLines={1}>{rank.name}</Text>
          </View>
        )}
      />

      <Panel accent={sharpColor} style={s.heroPanel}>
        <View
          style={s.heroAmbient}
          pointerEvents="none"
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
        >
          <Animated.View
            pointerEvents="none"
            style={[
              s.aura,
              {
                borderColor: sharpColor,
                opacity: auraOpacity,
                transform: [{ scale: auraScale }],
              },
            ]}
          />
          <View style={[s.auraCore, { backgroundColor: sharpColor + '26' }]} />
          <Text style={[s.heroMark, { color: t.accent + '16' }]}>
            {t.name.split('·')[1]?.trim()?.charAt(0) || '三'}
          </Text>
        </View>

        <View style={s.heroTopRow}>
          <Text style={s.heroLabel}>Sword Sharpness</Text>
          <View style={[s.readinessPill, { backgroundColor: readyColor + '14' }]}>
            <Text style={[s.readinessText, { color: readyColor }]}>{readiness}</Text>
          </View>
        </View>

        <View style={s.scoreBlock}>
          <Text style={[s.score, { color: sharpColor }]}>{sharpness}</Text>
          <Text style={[s.scoreLabel, { color: sharpColor }]}>{sharpLabel}</Text>
          <Text style={s.scoreSub}>
            Recovery {progress.recoveryScore}/100. Train when the blade feels clean.
          </Text>
        </View>

        <View style={s.recoveryRailWrap}>
          <ProgressRail pct={progress.recoveryScore / 100} accent={readyColor} />
        </View>
      </Panel>

      <View style={s.primaryAction}>
        <PrimaryButton
          label="BEGIN TRAINING"
          sublabel={`${recSword.name} · ${recSword.discipline.toLowerCase()}`}
          accent={recSword.accent}
          onPress={startTraining}
          darkText={recSword.accent !== STEEL}
        />
        <Text style={s.recommendation}>{rec.phrase}</Text>
      </View>

      <View style={s.metricsGrid}>
        <View style={s.metricRow}>
          <MetricTile
            label="Recovery"
            value={`${progress.recoveryScore}`}
            detail={readiness.toLowerCase()}
            accent={readyColor}
            mark="気"
          />
          <MetricTile
            label="Streak"
            value={`${streak}`}
            detail={streak === 1 ? 'day' : 'days'}
            accent={GOLD}
            mark="連"
          />
        </View>
        <View style={s.metricRow}>
          <MetricTile
            label="XP progress"
            value={`${Math.round(xpPct * 100)}%`}
            detail={nextRank ? `${(nextRank.min - progress.totalXP).toLocaleString()} XP left` : 'max rank'}
            accent={rank.color}
            mark="段"
          />
          <MetricTile
            label="Steps"
            value={steps.toLocaleString()}
            detail={`${Math.round(stepsPct * 100)}% goal`}
            accent="#FB7185"
            mark="歩"
          />
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: DS.space.md,
    paddingBottom: TAB_BAR_H + DS.space.xl,
    gap: DS.space.lg,
  },
  rankPill: {
    minWidth: 104,
    maxWidth: 126,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rankPillTop: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  rankPillName: {
    color: TXT1,
    fontSize: 11,
    fontWeight: '800',
  },
  heroPanel: {
    minHeight: 352,
    justifyContent: 'space-between',
  },
  heroAmbient: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 22,
  },
  auraCore: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 63,
  },
  heroMark: {
    position: 'absolute',
    fontSize: 310,
    fontWeight: '900',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    color: TXT2,
    fontSize: 14,
    fontWeight: '800',
  },
  readinessPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  readinessText: {
    fontSize: 11,
    fontWeight: '900',
  },
  scoreBlock: {
    alignItems: 'center',
    paddingTop: 22,
    paddingBottom: 10,
  },
  score: {
    fontSize: 108,
    lineHeight: 112,
    fontWeight: '900',
    letterSpacing: 0,
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: -2,
  },
  scoreSub: {
    color: TXT3,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    maxWidth: 250,
  },
  recoveryRailWrap: {
    paddingHorizontal: 12,
  },
  primaryAction: {
    gap: DS.space.sm,
  },
  recommendation: {
    color: TXT3,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: DS.space.sm,
  },
  metricsGrid: {
    gap: DS.space.sm,
  },
  metricRow: {
    flexDirection: 'row',
    gap: DS.space.sm,
  },
});

// Off-screen pages still subscribe to progress via useProgress, so memo only
// skips re-renders when Dojo's local state (toast, modal, flash) churns while
// progress is unchanged. Modest win, but it's the cheap one.
export default React.memo(HomeScreen);
