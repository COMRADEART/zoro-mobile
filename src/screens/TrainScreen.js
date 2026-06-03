import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import { Panel, PrimaryButton, SwordSelector, ProgressRail, SWORD_GLYPH } from '../components/premium/PremiumUI';
import { TXT1, TXT2, TXT3, SB_H, TAB_BAR_H, STEEL } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import { applySessionStart, applySessionEnd, logBreathingSession, rankIndexFor } from '../logic/progression';
import { SWORDS, RANKS, getSwordExercises, BREATHING_PROGRAMS } from '../data/gameData';
import BreathingGuide from '../components/shared/BreathingGuide';
import TrainingArcsScreen from './TrainingArcsScreen';
import { heavyImpact, mediumImpact, lightImpact } from '../utils/haptics';
import { playClick, playSuccess } from '../services/audioService';
import useReducedMotion from '../hooks/useReducedMotion';

const REST_SECONDS = 20;

// Text-forward stat band (shared visual language with Home) — replaces the
// old identical MetricTile grids.
function StatBand({ items }) {
  return (
    <View style={s.statBand}>
      {items.map((it, i) => (
        <View key={it.label} style={[s.statCol, i > 0 && s.statColDivider]}>
          <Text style={[s.statMark, { color: it.accent }]}>{it.mark}</Text>
          <Text style={s.statValue} numberOfLines={1}>{it.value}</Text>
          <Text style={s.statUnit} numberOfLines={1}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const MOOD = {
  wado: 'Calm breath. Clean movement. No wasted force.',
  sandai: 'Power day. Move heavy, stay honest.',
  shusui: 'Endurance turns effort into identity.',
};

function TrainScreen({ onFocusModeChange }) {
  const { progress, today, handleSessionEnd, showToast, handleUpdate, handleUpdateImmediate, setTab } = useProgress();
  const reducedMotion = useReducedMotion();
  // If a session was in progress when the app last died, resume it. Reading
  // currentSession at first render avoids a flash of the idle hero card before
  // we restore focus mode.
  const resumeSession = progress.currentSession ?? null;
  const activeSword = resumeSession?.discipline || progress.activeSword || 'sandai';
  const [phase, setPhase] = useState(resumeSession ? 'active' : 'idle');
  const [sessionId, setSessionId] = useState(resumeSession?.id ?? null);
  const [breathProgram, setBreathProgram] = useState(null);
  const [showArcs, setShowArcs] = useState(false);
  const [elapsed, setElapsed] = useState(
    resumeSession ? Math.max(0, Math.floor((Date.now() - resumeSession.startedAt) / 1000)) : 0,
  );
  const [restSeconds, setRestSeconds] = useState(REST_SECONDS);
  const intensity = progress.settings?.defaultIntensity || 5;
  const [exerciseIndex, setExerciseIndex] = useState(resumeSession?.exerciseIndex ?? 0);
  const [completedExercises, setCompletedExercises] = useState(resumeSession?.exercises ?? []);
  const [currentAmount, setCurrentAmount] = useState('');
  const [earnedXP, setEarnedXP] = useState(0);
  const timerRef = useRef(null);
  const restRef = useRef(null);
  const sessionRef = useRef(resumeSession);
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeSlide = useRef(new Animated.Value(0)).current;

  const sword = SWORDS[activeSword];
  const swordMark = SWORD_GLYPH[activeSword] || sword.kanji?.slice(0, 1) || sword.name?.slice(0, 1) || '?';
  const exercises = getSwordExercises(activeSword, progress.skillUnlocks);
  const currentEx = exercises[exerciseIndex];
  const nextEx = exercises[exerciseIndex + 1];
  const rank = RANKS[rankIndexFor(progress.totalXP)];

  useEffect(() => {
    if (reducedMotion) { fadeSlide.setValue(1); return; }
    fadeSlide.setValue(0);
    Animated.spring(fadeSlide, {
      toValue: 1,
      damping: 20,
      stiffness: 120,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [phase, exerciseIndex, fadeSlide, reducedMotion]);

  useEffect(() => {
    onFocusModeChange?.(phase !== 'idle');
    return () => onFocusModeChange?.(false);
  }, [onFocusModeChange, phase]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(restRef.current);
  }, []);

  // Drive the active-phase timer from the *persisted* startedAt, not from a
  // local "tick from now" counter. After a resume, this keeps elapsed honest
  // (the previous implementation always restarted at 0).
  useEffect(() => {
    if (phase !== 'active') return undefined;
    const startedAt = sessionRef.current?.startedAt ?? Date.now();
    setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, sessionId]);

  useEffect(() => {
    if (reducedMotion || phase !== 'idle') return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse, reducedMotion]);

  const switchSword = (sw) => {
    handleUpdate(prev => ({ ...prev, activeSword: sw }));
    lightImpact();
    playClick();
  };

  const startSession = () => {
    const { progress: p } = applySessionStart(progress, { discipline: activeSword });
    const seeded = { ...p.currentSession, exerciseIndex: 0 };
    sessionRef.current = seeded;
    setSessionId(seeded.id);
    setElapsed(0);
    setPhase('active');
    setExerciseIndex(0);
    setCompletedExercises([]);
    setCurrentAmount('');
    setEarnedXP(0);
    heavyImpact();
    playClick();
    // Persist immediately — losing the session-start write to the debounce
    // window would mean a hard kill in the first 500 ms makes the session
    // unresumable. The active-phase timer effect picks up from here.
    handleUpdateImmediate(prev => ({ ...prev, currentSession: seeded }));
  };

  const finishSession = (done = completedExercises) => {
    clearInterval(timerRef.current);
    clearInterval(restRef.current);
    const payload = done.map(ex => ({ id: ex.id, name: ex.name, unit: ex.unit, amount: ex.amount || ex.base }));
    const { progress: next, events } = applySessionEnd(
      { ...progress, currentSession: sessionRef.current },
      { sessionId, exercises: payload, intensity, endedAt: Date.now() }
    );
    const gained = Math.max(0, next.totalXP - progress.totalXP);
    setEarnedXP(gained);
    setPhase('done');
    playSuccess();
    handleSessionEnd(next, events);
    const stored = next.sessions[next.sessions.length - 1];
    showToast({
      title: 'Session complete',
      body: `${Math.round(elapsed / 60)} min · ${stored?.calories ?? 0} kcal · +${gained} XP`,
    });
  };

  const beginRest = () => {
    clearInterval(restRef.current);
    setRestSeconds(REST_SECONDS);
    setPhase('rest');
    restRef.current = setInterval(() => {
      setRestSeconds(sec => {
        if (sec <= 1) {
          clearInterval(restRef.current);
          setExerciseIndex(i => Math.min(i + 1, exercises.length - 1));
          setCurrentAmount('');
          setPhase('active');
          return REST_SECONDS;
        }
        return sec - 1;
      });
    }, 1000);
  };

  const logExercise = () => {
    if (!currentEx) return;
    // Clamp: a pasted negative or non-numeric value must not flow into calorie/XP
    // math. Falls back to the exercise's base target like an empty input does.
    const parsed = parseFloat(currentAmount);
    const amount = Number.isFinite(parsed) && parsed > 0 ? parsed : currentEx.base;
    const logged = { id: currentEx.id, name: currentEx.name, unit: currentEx.unit, amount };
    const nextCompleted = [...completedExercises, logged];
    const nextIndex = exerciseIndex + 1;
    setCompletedExercises(nextCompleted);
    setCurrentAmount('');
    mediumImpact();
    playClick();
    if (!reducedMotion) {
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 90, useNativeDriver: true }),
        Animated.spring(pulse, { toValue: 1, tension: 110, friction: 10, useNativeDriver: true }),
      ]).start();
    }
    // Persist the in-progress session so a crash before the final log doesn't
    // throw away the moves the user already completed. finishSession reads
    // sessionRef so it sees the same nextCompleted, but only the persisted copy
    // survives an app kill.
    if (sessionRef.current) {
      sessionRef.current = { ...sessionRef.current, exercises: nextCompleted, exerciseIndex: nextIndex };
      const snapshot = sessionRef.current;
      handleUpdate(prev => ({ ...prev, currentSession: snapshot }));
    }
    if (exerciseIndex >= exercises.length - 1) {
      finishSession(nextCompleted);
      return;
    }
    beginRest();
  };

  const skipExercise = () => {
    lightImpact();
    if (exerciseIndex >= exercises.length - 1) {
      finishSession(completedExercises);
    } else {
      setExerciseIndex(i => i + 1);
      setCurrentAmount('');
    }
  };

  const skipRest = () => {
    clearInterval(restRef.current);
    setExerciseIndex(i => Math.min(i + 1, exercises.length - 1));
    setPhase('active');
    lightImpact();
  };

  const fmt = sec => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  const contentMotion = {
    opacity: fadeSlide,
    transform: [{ translateY: fadeSlide.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  if (showArcs) {
    return <TrainingArcsScreen onBack={() => setShowArcs(false)} />;
  }

  return (
    <View style={s.root}>
      {phase === 'idle' && (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: SB_H + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <SwordSelector value={activeSword} onChange={switchSword} />

          <Animated.View style={contentMotion}>
            <Panel accent={sword.accent} style={s.hero}>
              <Text style={[s.heroSeal, { color: sword.accent }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {swordMark}
              </Text>
              <Animated.View style={[s.sealWrap, { transform: [{ scale: pulse }] }]}>
                <View style={[s.sealRing, { borderColor: sword.accent + '2E' }]} />
                <Text style={[s.sealKanji, { color: sword.accent }]}>{swordMark}</Text>
              </Animated.View>
              <Text style={s.heroEyebrow}>TODAY&apos;S DISCIPLINE</Text>
              <Text style={[s.disciplineName, { color: sword.accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{sword.name}</Text>
              <Text style={s.disciplineMeta}>{sword.discipline}</Text>
              <Text style={s.moodPhrase}>{MOOD[activeSword]}</Text>

              <StatBand
                items={[
                  { mark: '型', value: `${exercises.length}`, label: 'moves today', accent: sword.accent },
                  { mark: '力', value: `${intensity}/10`, label: 'intensity', accent: sword.accent },
                ]}
              />

              <PrimaryButton
                label="BEGIN SESSION"
                sublabel="Enter focus mode"
                accent={sword.accent}
                onPress={startSession}
                darkText={sword.accent !== STEEL}
                style={s.beginButton}
              />
            </Panel>

            <Panel accent={sword.accent} dim style={s.previewPanel}>
              <View style={s.previewHeader}>
                <Text style={s.previewTitle}>Today&apos;s flow</Text>
                <Pressable
                  onPress={() => setShowArcs(true)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="View Training Arcs"
                >
                  <Text style={[s.previewAction, { color: sword.accent }]}>Training arcs</Text>
                </Pressable>
              </View>
              {exercises.slice(0, 3).map((ex, index) => (
                <View key={ex.id} style={s.previewRow}>
                  <Text style={[s.previewIndex, { color: sword.accent }]}>{String(index + 1).padStart(2, '0')}</Text>
                  <Text style={s.previewName} numberOfLines={1}>{ex.name}</Text>
                  <Text style={s.previewTarget}>{ex.base} {ex.unit}</Text>
                </View>
              ))}
              {exercises.length > 3 && (
                <Text style={s.previewMore}>+{exercises.length - 3} more in focus mode</Text>
              )}
            </Panel>

            <View style={s.breathRow}>
              {BREATHING_PROGRAMS.slice(0, 2).map(program => (
                <Pressable
                  key={program.id}
                  onPress={() => setBreathProgram(program)}
                  style={[s.breathPill, { borderColor: sword.accent + '20' }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Start ${program.name} breathing, ${program.durationMin} minutes, ${program.xpReward} XP`}
                >
                  <Text style={[s.breathKanji, { color: sword.accent }]}>{program.kanji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.breathName} numberOfLines={1}>{program.name}</Text>
                    <Text style={s.breathMeta}>{program.durationMin} min · +{program.xpReward} XP</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      )}

      {phase === 'active' && (
        <Animated.View style={[s.focusScreen, { paddingTop: SB_H + 22 }, contentMotion]}>
          <View style={s.focusTop}>
            <Text style={s.focusTimer}>{fmt(elapsed)}</Text>
            <Text style={s.focusCount}>{exerciseIndex + 1} of {exercises.length}</Text>
          </View>
          <ProgressRail pct={exerciseIndex / exercises.length} accent={sword.accent} />

          <Animated.View style={[s.exerciseStage, { transform: [{ scale: pulse }] }]}>
            <Text style={[s.exerciseMark, { color: sword.accent }]}>{swordMark}</Text>
            <Text style={s.exerciseLabel}>Current move</Text>
            <Text style={[s.exerciseName, { color: sword.accent }]}>{currentEx?.name}</Text>
            <Text style={s.exerciseTarget}>Target {currentEx?.base} {currentEx?.unit}</Text>

            <TextInput
              style={[s.amountInput, { borderColor: sword.accent + '35' }]}
              placeholder={`${currentEx?.base ?? ''}`}
              placeholderTextColor={TXT3}
              keyboardType="numeric"
              value={currentAmount}
              onChangeText={setCurrentAmount}
              selectTextOnFocus
              accessibilityLabel="Completed amount"
              accessibilityHint={`Enter ${currentEx?.unit ?? 'amount'}; default is ${currentEx?.base ?? 0}`}
            />
          </Animated.View>

          <View style={s.focusActions}>
            <PrimaryButton
              label="LOG MOVE"
              sublabel={currentEx ? `${currentEx.base} ${currentEx.unit}` : ''}
              accent={sword.accent}
              onPress={logExercise}
              darkText={sword.accent !== STEEL}
            />
            <View style={s.secondaryActions}>
              <Pressable
                onPress={skipExercise}
                style={s.textButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Skip this exercise"
              >
                <Text style={s.textButtonLabel}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={() => finishSession(completedExercises)}
                style={s.textButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="End session early"
              >
                <Text style={s.textButtonLabel}>End session</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}

      {phase === 'rest' && (
        <Animated.View style={[s.focusScreen, { paddingTop: SB_H + 22 }, contentMotion]}>
          <Text style={s.restLabel}>Rest</Text>
          <Text style={[s.restTimer, { color: sword.accent }]}>{restSeconds}</Text>
          <Text style={s.restCopy}>Let your breathing settle. The next cut should be cleaner.</Text>
          <Panel accent={sword.accent} dim style={s.nextPanel}>
            <Text style={s.nextLabel}>Next</Text>
            <Text style={s.nextName}>{nextEx?.name}</Text>
            <Text style={s.nextTarget}>{nextEx?.base} {nextEx?.unit}</Text>
          </Panel>
          <PrimaryButton
            label="START NEXT MOVE"
            accent={sword.accent}
            onPress={skipRest}
            darkText={sword.accent !== STEEL}
            style={s.beginButton}
          />
        </Animated.View>
      )}

      {phase === 'done' && (
        <Animated.View style={[s.doneScreen, { paddingTop: SB_H + 28 }, contentMotion]}>
          <View style={[s.finishAura, { borderColor: sword.accent + '40' }]} />
          <Text style={[s.doneKanji, { color: sword.accent }]}>完</Text>
          <Text style={s.doneTitle}>Session complete</Text>
          <Text style={s.doneSubtitle}>The blade remembers today.</Text>

          <View style={s.doneMetrics}>
            <StatBand
              items={[
                { mark: '力', value: `+${earnedXP}`, label: 'XP gained', accent: sword.accent },
                { mark: '型', value: `${completedExercises.length}`, label: 'moves logged', accent: rank.color },
              ]}
            />
          </View>

          <Panel accent={rank.color} dim style={s.rankMoment}>
            <Text style={[s.rankMomentTitle, { color: rank.color }]}>{rank.name}</Text>
            <Text style={s.rankMomentCopy}>Rank progress updated. New unlocks will appear in Skills.</Text>
          </Panel>

          <PrimaryButton
            label="RETURN TO HOME"
            accent={sword.accent}
            onPress={() => { setPhase('idle'); setTab('home'); }}
            darkText={sword.accent !== STEEL}
          />
        </Animated.View>
      )}

      {breathProgram && (
        <BreathingGuide
          program={breathProgram}
          onComplete={() => {
            const { progress: next, events } = logBreathingSession(progress, {
              date: today,
              programId: breathProgram.id,
              durationMin: breathProgram.durationMin,
              xpReward: breathProgram.xpReward,
            });
            playSuccess();
            handleSessionEnd(next, events);
            showToast({ title: 'Breathing complete', body: `${breathProgram.name} · +${breathProgram.xpReward} XP` });
            setBreathProgram(null);
          }}
          onDismiss={() => setBreathProgram(null)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: DS.space.md,
    paddingBottom: TAB_BAR_H + DS.space.xl,
    gap: DS.space.lg,
  },
  hero: {
    marginTop: DS.space.lg,
    alignItems: 'center',
    paddingTop: DS.space.xl,
    paddingBottom: DS.space.lg,
  },
  heroSeal: {
    position: 'absolute',
    right: -18,
    top: -30,
    fontSize: 180,
    fontWeight: '900',
    opacity: 0.05,
  },
  sealWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.space.md,
  },
  sealRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sealKanji: {
    fontSize: 52,
    fontWeight: '900',
  },
  heroEyebrow: {
    color: TXT3,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  disciplineName: {
    fontFamily: DS.font.display,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  disciplineMeta: {
    color: TXT3,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 6,
  },
  moodPhrase: {
    fontFamily: DS.font.display,
    color: TXT2,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 23,
    fontStyle: 'italic',
    marginTop: DS.space.md,
    maxWidth: 286,
  },
  statBand: {
    flexDirection: 'row',
    width: '100%',
    marginTop: DS.space.lg,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 16,
  },
  statCol: { flex: 1, alignItems: 'center', gap: 5 },
  statColDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.08)',
  },
  statMark: { fontSize: 14, fontWeight: '900' },
  statValue: {
    fontFamily: DS.font.display,
    color: TXT1,
    fontSize: 23,
    lineHeight: 26,
    fontWeight: '700',
  },
  statUnit: {
    color: TXT3,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  beginButton: { marginTop: DS.space.lg, width: '100%' },
  previewPanel: { marginTop: DS.space.md, gap: DS.space.sm },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitle: { color: TXT1, fontSize: 16, fontWeight: '800' },
  previewAction: { fontSize: 12, fontWeight: '800' },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    minHeight: 34,
  },
  previewIndex: { width: 26, fontWeight: '900', fontSize: 13 },
  previewName: { flex: 1, color: TXT1, fontSize: 14, fontWeight: '700' },
  previewTarget: { color: TXT3, fontSize: 13, fontWeight: '700' },
  previewMore: { color: TXT3, fontSize: 12, marginTop: 2 },
  breathRow: { gap: DS.space.sm, marginTop: DS.space.md },
  breathPill: {
    minHeight: 68,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.045)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    paddingHorizontal: DS.space.md,
  },
  breathKanji: { fontSize: 22, fontWeight: '900' },
  breathName: { color: TXT1, fontSize: 14, fontWeight: '800' },
  breathMeta: { color: TXT3, fontSize: 12, marginTop: 3 },
  focusScreen: {
    flex: 1,
    paddingHorizontal: DS.space.md,
    paddingBottom: TAB_BAR_H + DS.space.sm,
  },
  focusTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: DS.space.sm,
  },
  focusTimer: { fontFamily: DS.font.display, color: TXT1, fontSize: 40, fontWeight: '700', letterSpacing: 0.5 },
  focusCount: { color: TXT3, fontSize: 13, fontWeight: '800', marginBottom: 7 },
  exerciseStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DS.space.md,
  },
  exerciseMark: { fontSize: 78, fontWeight: '900', marginBottom: DS.space.sm },
  exerciseLabel: { color: TXT3, fontSize: 13, fontWeight: '700', marginBottom: DS.space.xs },
  exerciseName: {
    fontFamily: DS.font.display,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  exerciseTarget: { color: TXT2, fontSize: 17, marginTop: DS.space.sm, fontWeight: '700' },
  amountInput: {
    minWidth: 152,
    borderWidth: 1,
    borderRadius: 28,
    color: TXT1,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: DS.space.lg,
    paddingHorizontal: DS.space.lg,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  focusActions: { gap: DS.space.md },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: DS.space.xl,
  },
  textButton: { padding: DS.space.sm },
  textButtonLabel: { color: TXT3, fontSize: 14, fontWeight: '800' },
  restLabel: {
    color: TXT3,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    marginTop: DS.space.xxl,
  },
  restTimer: {
    fontFamily: DS.font.display,
    textAlign: 'center',
    fontSize: 116,
    lineHeight: 126,
    fontWeight: '700',
    letterSpacing: 0,
  },
  restCopy: {
    color: TXT2,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    marginHorizontal: DS.space.lg,
    marginBottom: DS.space.xl,
  },
  nextPanel: { marginBottom: DS.space.lg },
  nextLabel: { color: TXT3, fontSize: 12, fontWeight: '800' },
  nextName: { fontFamily: DS.font.display, color: TXT1, fontSize: 24, fontWeight: '700', marginTop: 4 },
  nextTarget: { color: TXT3, fontSize: 14, marginTop: 4 },
  doneScreen: {
    flex: 1,
    paddingHorizontal: DS.space.md,
    paddingBottom: TAB_BAR_H + DS.space.sm,
    alignItems: 'center',
  },
  finishAura: {
    position: 'absolute',
    top: SB_H + 78,
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 24,
    opacity: 0.5,
  },
  doneKanji: {
    fontSize: 104,
    fontWeight: '900',
    marginTop: DS.space.xxl,
  },
  doneTitle: { fontFamily: DS.font.display, color: TXT1, fontSize: 32, fontWeight: '700', letterSpacing: 0.2 },
  doneSubtitle: { fontFamily: DS.font.display, color: TXT3, fontSize: 15, fontStyle: 'italic', marginTop: DS.space.xs, marginBottom: DS.space.xl },
  doneMetrics: { width: '100%', marginBottom: DS.space.md },
  rankMoment: { width: '100%', marginBottom: DS.space.lg },
  rankMomentTitle: { fontSize: 18, fontWeight: '900' },
  rankMomentCopy: { color: TXT3, fontSize: 13, lineHeight: 20, marginTop: 5 },
});

export default React.memo(TrainScreen);
