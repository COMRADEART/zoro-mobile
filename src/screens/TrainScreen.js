import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import { THEMES, DEFAULT_THEME } from '../theme/themes';
import { BORD, TXT1, TXT2, TXT3, SB_H } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import { applySessionStart, applySessionEnd, logBreathingSession } from '../logic/progression';
import { SWORDS, getSwordExercises, BREATHING_PROGRAMS } from '../data/gameData';
import BreathingGuide from '../components/shared/BreathingGuide';
import TrainingArcsScreen from './TrainingArcsScreen';
import { heavyImpact, mediumImpact } from '../utils/haptics';
import { playClick, playSuccess } from '../services/audioService';

const SWORD_ORDER = ['wado', 'sandai', 'shusui'];

export default function TrainScreen() {
  const { progress, today, theme, handleSessionEnd, showToast, handleUpdate } = useProgress();

  const [activeSword, setActiveSword] = useState(progress.activeSword || 'sandai');
  const [phase, setPhase] = useState('idle');
  const [sessionId, setSessionId] = useState(null);
  const [breathProgram, setBreathProgram] = useState(null);
  const [showArcs, setShowArcs] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [intensity, setIntensity] = useState(progress.settings?.defaultIntensity || 5);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState([]);
  const [currentAmount, setCurrentAmount] = useState('');
  const timerRef = useRef(null);
  const sessionRef = useRef(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeSlide = useRef(new Animated.Value(0)).current;
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];
  const sword = SWORDS[activeSword];
  const exercises = getSwordExercises(activeSword, progress.skillUnlocks);
  const currentEx = exercises[exerciseIndex];

  useEffect(() => {
    Animated.timing(fadeSlide, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [phase, fadeSlide]);

  const switchSword = (sw) => {
    setActiveSword(sw);
    handleUpdate({ ...progress, activeSword: sw });
    heavyImpact();
    playClick();
  };

  const startSession = () => {
    const { progress: p } = applySessionStart(progress, { discipline: activeSword });
    sessionRef.current = p.currentSession;
    setSessionId(p.currentSession.id);
    setElapsed(0); setPhase('active');
    setExerciseIndex(0); setCompletedExercises([]);
    setCurrentAmount('');
    fadeSlide.setValue(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    heavyImpact();
    playClick();
  };

  const endSession = () => {
    clearInterval(timerRef.current);
    const payload = completedExercises.map(ex => ({ id: ex.id, name: ex.name, unit: ex.unit, amount: ex.amount || ex.base }));
    const { progress: next, events } = applySessionEnd(
      { ...progress, currentSession: sessionRef.current },
      { sessionId, exercises: payload, intensity, endedAt: Date.now() }
    );
    setPhase('done');
    playSuccess();
    fadeSlide.setValue(0);
    handleSessionEnd(next, events);
    const stored = next.sessions[next.sessions.length - 1];
    showToast({ title: 'SESSION COMPLETE · 修了', body: `${Math.round(elapsed / 60)}min · ${stored?.calories ?? 0}kcal · +${next.totalXP - progress.totalXP} XP` });
  };

  const logExercise = () => {
    if (!currentEx) return;
    const amount = currentAmount ? parseFloat(currentAmount) : currentEx.base;
    setCompletedExercises(prev => [...prev, { ...currentEx, amount }]);
    setCurrentAmount('');
    mediumImpact();
    playClick();
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 100, useNativeDriver: true }),
      Animated.spring(pulse, { toValue: 1, tension: 100, friction: 9, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      if (exerciseIndex < exercises.length - 1) {
        setExerciseIndex(i => i + 1);
      } else { endSession(); }
    }, 300);
  };

  useEffect(() => { return () => clearInterval(timerRef.current); }, []);

  const fmt = sec => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

  if (showArcs) {
    return <TrainingArcsScreen onBack={() => setShowArcs(false)} />;
  }

  const swordTabs = (
    <View style={[s.swordTabs, { top: SB_H + DS.space.sm }]}>
      <View style={[s.tabTrack, { borderColor: t.accent + '20' }]}>
        {SWORD_ORDER.map(k => {
          const sw = SWORDS[k];
          const active = k === activeSword;
          return (
            <Pressable
              key={k}
              onPress={() => switchSword(k)}
              style={[s.swordTab, active && s.swordTabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${sw.name} discipline`}
            >
              {active && <View style={[s.tabGlow, { backgroundColor: sw.accent }]} />}
              <Text style={[s.swordTabKanji, active && { color: sw.accent }]}>{sw.kanji}</Text>
              <Text style={[s.swordTabName, active && { color: sw.accent }]}>{sw.name.split(' ')[0].toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {swordTabs}

      {/* IDLE */}
      {phase === 'idle' && (
        <ScrollView
          contentContainerStyle={[s.trainIdle, { paddingTop: SB_H + 90, paddingHorizontal: DS.space.md }]}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <Animated.View style={[s.idleHero, { opacity: fadeSlide }]}>
            <View style={s.watermarkContainer}>
              <Text style={[s.trainWatermark, { color: t.accent }]}>{sword.kanji}</Text>
            </View>
            <View style={[s.heroCard, { borderColor: t.accent + '30' }]}>
              <View style={[s.heroGlow, { backgroundColor: t.accent }]} />
              <View style={s.heroContent}>
                <View style={[s.swordIconBadge, { backgroundColor: t.accent + '12', borderColor: t.accent + '35' }]}>
                  <Text style={[s.swordIconText, { color: t.accent }]}>{sword.kanji}</Text>
                </View>
                <View style={s.heroInfo}>
                  <Text style={[s.trainSwordName, { color: t.accent }]}>{sword.name}</Text>
                  <Text style={s.trainDiscipline}>{sword.discipline}</Text>
                </View>
              </View>
              <Text style={s.trainDesc}>{sword.desc}</Text>
              <View style={s.exerciseMeta}>
                <View style={[s.metaChip, { borderColor: t.accent + '30' }]}>
                  <Text style={[s.metaChipText, { color: t.accent }]}>{exercises.length}</Text>
                  <Text style={s.metaChipLabel}>EXERCISES · 演習</Text>
                </View>
              </View>
              <View style={s.exList}>
                {exercises.map((ex, i) => (
                  <View key={ex.id} style={[s.exListRow, { borderColor: t.accent + '1f' }]}>
                    <Text style={[s.exListIdx, { color: t.accent }]}>{String(i + 1).padStart(2, '0')}</Text>
                    <Text style={s.exListName} numberOfLines={1}>{ex.name}</Text>
                    <Text style={[s.exListTarget, { color: t.accent }]}>{ex.base} {ex.unit}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                style={[s.beginBtn, { backgroundColor: t.accent, shadowColor: t.accent }]}
                onPress={startSession}
                accessibilityLabel="Begin training session"
                accessibilityRole="button"
              >
                <View style={s.beginBtnInner}>
                  <Text style={[s.beginBtnText, { color: THEMES[theme]?.bg || '#000' }]}>
                    BEGIN · 始める
                  </Text>
                </View>
              </Pressable>
              <Pressable style={s.arcsBtn} onPress={() => setShowArcs(true)}>
                <Text style={s.arcsBtnTxt}>TRAINING ARCS · 修行 ›</Text>
              </Pressable>
            </View>
          </Animated.View>

          <View style={s.breathSection}>
            <View style={s.breathSectionHeader}>
              <View style={[s.breathDivider, { backgroundColor: t.accent + '25' }]} />
              <View style={[s.breathSectionTitleBox, { borderColor: t.accent + '30' }]}>
                <Text style={[s.breathSectionKanji, { color: t.accent }]}>息</Text>
              </View>
              <Text style={[s.breathSectionTitle, { color: t.accent }]}>NAP MODE · 呼吸の修行</Text>
              <View style={[s.breathDivider, { backgroundColor: t.accent + '25' }]} />
            </View>
            {BREATHING_PROGRAMS.map((prog, idx) => (
              <Pressable
                key={prog.id}
                style={[s.breathCard, { borderColor: t.accent + '20' }]}
                onPress={() => setBreathProgram(prog)}
                accessibilityLabel={`${prog.name}, ${prog.durationMin} minutes`}
                accessibilityRole="button"
              >
                <View style={[s.breathKanjiBox, { backgroundColor: t.accent + '10' }]}>
                  <Text style={[s.breathKanji, { color: t.accent }]}>{prog.kanji}</Text>
                </View>
                <View style={s.breathInfo}>
                  <Text style={s.breathName}>{prog.name}</Text>
                  <Text style={s.breathPattern}>
                    {[
                      prog.pattern.inhale ? `in ${prog.pattern.inhale}s` : null,
                      prog.pattern.holdIn ? `hold ${prog.pattern.holdIn}s` : null,
                      prog.pattern.exhale ? `out ${prog.pattern.exhale}s` : null,
                      prog.pattern.holdOut ? `hold ${prog.pattern.holdOut}s` : null,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View style={s.breathMeta}>
                  <Text style={[s.breathDur, { color: t.accent }]}>{prog.durationMin}m</Text>
                  <Text style={s.breathXP}>+{prog.xpReward} XP</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {breathProgram && (
        <BreathingGuide
          program={breathProgram}
          onComplete={() => {
            const { progress: next, events } = logBreathingSession(progress, { date: today, programId: breathProgram.id, durationMin: breathProgram.durationMin, xpReward: breathProgram.xpReward });
            playSuccess();
            handleSessionEnd(next, events);
            showToast({ title: 'NAP MODE COMPLETE · 修了', body: `${breathProgram.name} · +${breathProgram.xpReward} XP` });
            setBreathProgram(null);
          }}
          onDismiss={() => setBreathProgram(null)}
        />
      )}

      {/* ACTIVE */}
      {phase === 'active' && (
        <Animated.View style={[s.trainActive, { paddingTop: SB_H + 90, opacity: fadeSlide }]}>
          <View style={s.timerSection}>
            <View style={[s.timerBadge, { borderColor: t.accent + '30' }]}>
              <Text style={s.timerLabel}>修行中 · TRAINING</Text>
            </View>
            <Text style={[s.timerVal, { color: t.accent }]}>{fmt(elapsed)}</Text>
            <View style={s.sessionProgressOuter}>
              <Animated.View style={[s.sessionProgressFill, {
                width: `${((exerciseIndex) / exercises.length) * 100}%`,
                backgroundColor: t.accent,
                shadowColor: t.accent,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 8,
              }]} />
            </View>
            <Text style={s.progressLabel}>{exerciseIndex + 1} / {exercises.length} · {completedExercises.length} logged</Text>
          </View>

          <Animated.View
            style={[
              s.exCard,
              {
                borderColor: t.accent + '40',
                transform: [{ scale: pulse }],
                shadowColor: t.accent,
              },
            ]}
          >
            <View style={[s.exCardGlowLine, { backgroundColor: t.accent }]} />
            <View style={s.exCardInner}>
              <View style={s.exCardHeader}>
                <View style={[s.exNumBadge, { backgroundColor: t.accent + '15', borderColor: t.accent + '30' }]}>
                  <Text style={[s.exNum, { color: t.accent }]}>{exerciseIndex + 1}/{exercises.length}</Text>
                </View>
                <Text style={[s.exTarget, { color: t.accent }]}>目標 · TARGET {currentEx?.base} {currentEx?.unit}</Text>
              </View>
              <Text style={[s.exName, { color: t.accent }]}>{currentEx?.name}</Text>
              <View style={[s.exInputWrap, { borderColor: t.accent + '45', backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                <TextInput
                  style={[s.exInput, { color: TXT1 }]}
                  placeholder={`${currentEx?.base} ${currentEx?.unit}`}
                  placeholderTextColor={TXT3}
                  keyboardType="numeric"
                  value={currentAmount}
                  onChangeText={setCurrentAmount}
                  autoFocus={true}
                />
              </View>
              <View style={s.exBtns}>
                <Pressable
                  style={[s.logBtn, { backgroundColor: t.accent, shadowColor: t.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 12 }]}
                  onPress={logExercise}
                  accessibilityLabel={`Log ${currentEx?.name}`}
                  accessibilityRole="button"
                >
                  <Text style={[s.logBtnTxt, { color: THEMES[theme]?.bg || '#000' }]}>LOG · 記録</Text>
                </Pressable>
                <Pressable
                  style={[s.skipBtn, { borderColor: t.accent + '40' }]}
                  onPress={() => {
                    if (exerciseIndex >= exercises.length - 1) { endSession(); }
                    else { setExerciseIndex(i => i + 1); }
                  }}
                  accessibilityLabel="Skip this exercise"
                  accessibilityRole="button"
                >
                  <Text style={[s.skipBtnTxt, { color: t.accent }]}>SKIP · スキップ</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          <View style={s.intensitySection}>
            <View style={s.intensityRow}>
              <Text style={s.intensityLabel}>INTENSITY · 強度</Text>
              <Text style={[s.intensityValue, { color: t.accent }]}>{intensity}/10</Text>
            </View>
            <View style={s.intensityBtns}>
              {[3, 5, 7, 9].map(v => (
                <Pressable
                  key={v}
                  onPress={() => setIntensity(v)}
                  style={[
                    s.intBtn,
                    {
                      borderColor: intensity === v ? t.accent : BORD,
                      backgroundColor: intensity === v ? t.accent + '15' : 'transparent',
                      shadowColor: intensity === v ? t.accent : 'transparent',
                      shadowOpacity: intensity === v ? 0.5 : 0,
                      shadowRadius: intensity === v ? 8 : 0,
                    },
                  ]}
                  accessibilityLabel={`Intensity ${v}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: intensity === v }}
                >
                  <Text style={[s.intBtnTxt, intensity === v && { color: t.accent }]}>{v}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={s.endSection}>
            <Pressable onPress={endSession} accessibilityLabel="End training session early" accessibilityRole="button">
              <View style={[s.endBtn, { borderColor: '#E52030' + '40' }]}>
                <Text style={s.endBtnText}>END SESSION · 終了</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <Animated.View style={[s.trainDone, { opacity: fadeSlide }]}>
          <View style={[s.doneGlowRing, { borderColor: t.accent }]} />
          <View style={[s.doneBadge, { borderColor: t.accent + '50', shadowColor: t.accent, shadowOpacity: 0.6, shadowRadius: 20 }]}>
            <Text style={[s.doneKanji, { color: t.accent }]}>完了</Text>
          </View>
          <Text style={[s.doneTitle, { color: t.accent }]}>Session Complete</Text>
          <Text style={s.doneTitleJp}>修行終了 · Great work, swordsman</Text>
          <View style={s.doneStats}>
            <View style={[s.doneStatChip, { borderColor: t.accent + '30' }]}>
              <Text style={[s.doneStatVal, { color: t.accent }]}>{completedExercises.length}</Text>
              <Text style={s.doneStatLabel}>EXERCISES</Text>
            </View>
            <View style={[s.doneStatChip, { borderColor: t.accent + '30' }]}>
              <Text style={[s.doneStatVal, { color: t.accent }]}>{Math.round(elapsed / 60)}m</Text>
              <Text style={s.doneStatLabel}>DURATION</Text>
            </View>
          </View>
          <Pressable
            style={[s.beginBtn, { backgroundColor: t.accent, shadowColor: t.accent, marginTop: DS.space.lg, paddingHorizontal: DS.space.xxl }]}
            onPress={() => setPhase('idle')}
            accessibilityLabel="Return to dojo"
            accessibilityRole="button"
          >
            <Text style={[s.beginBtnText, { color: THEMES[theme]?.bg || '#000' }]}>BACK TO DOJO · 道場へ</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  swordTabs: { position: 'absolute', left: DS.space.md, right: DS.space.md, zIndex: 10 },
  tabTrack: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: DS.radius.lg,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  swordTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: DS.space.sm + 2,
    borderRadius: DS.radius.md,
    gap: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  swordTabActive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabGlow: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
  },
  swordTabKanji: { fontSize: 22, fontWeight: '900', color: TXT3 },
  swordTabName: { fontSize: 6.5, fontWeight: '700', letterSpacing: 1.5, color: TXT3 },
  trainIdle: { flex: 1, paddingBottom: TAB_BAR_H + DS.space.xl },
  idleHero: { position: 'relative', marginBottom: DS.space.lg },
  watermarkContainer: { position: 'absolute', alignSelf: 'center', top: -20, opacity: 0.05 },
  trainWatermark: { fontSize: 280, fontWeight: '900', letterSpacing: -15 },
  heroCard: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderRadius: DS.radius.xl,
    padding: DS.space.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.4,
  },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md, marginBottom: DS.space.md },
  swordIconBadge: {
    width: 56,
    height: 56,
    borderRadius: DS.radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swordIconText: { fontSize: 28, fontWeight: '900' },
  heroInfo: { flex: 1 },
  trainSwordName: { fontSize: 26, fontWeight: '900', letterSpacing: 0.3 },
  trainDiscipline: { fontSize: 8, fontWeight: '700', letterSpacing: 4, color: TXT3, marginTop: 4 },
  trainDesc: { fontSize: 13, color: TXT2, textAlign: 'center', lineHeight: 22, marginBottom: DS.space.md },
  exerciseMeta: { alignItems: 'center', marginBottom: DS.space.md },
  exList: { width: '100%', gap: 6, marginBottom: DS.space.md },
  exListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: DS.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    gap: 12,
  },
  exListIdx: { fontSize: 11, fontWeight: '800', letterSpacing: 1, width: 22, fontVariant: ['tabular-nums'] },
  exListName: { flex: 1, fontSize: 14, fontWeight: '700', color: TXT1 },
  exListTarget: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  metaChip: { flexDirection: 'row', alignItems: 'baseline', gap: 6, borderWidth: 1, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 6 },
  metaChipText: { fontSize: 20, fontWeight: '900' },
  metaChipLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 2, color: TXT3 },
  beginBtn: {
    paddingHorizontal: DS.space.xl,
    paddingVertical: DS.space.md,
    borderRadius: 100,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  beginBtnInner: { alignItems: 'center' },
  beginBtnText: { fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  arcsBtn: { marginTop: DS.space.md, alignItems: 'center', paddingVertical: DS.space.xs },
  arcsBtnTxt: { fontSize: 8, fontWeight: '700', letterSpacing: 3, color: TXT3 },
  trainActive: { flex: 1, paddingHorizontal: DS.space.md, paddingBottom: TAB_BAR_H },
  timerSection: { alignItems: 'center', marginBottom: DS.space.lg },
  timerBadge: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 4, marginBottom: DS.space.xs },
  timerLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 3, color: TXT3 },
  timerVal: { fontSize: 64, fontWeight: '900', letterSpacing: -3, fontVariant: ['tabular-nums'], marginVertical: DS.space.xs },
  sessionProgressOuter: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: DS.space.xs, overflow: 'hidden' },
  sessionProgressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 2, color: TXT3, marginTop: DS.space.xs },
  exCard: {
    borderWidth: 2,
    borderRadius: DS.radius.xl,
    marginBottom: DS.space.md,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.55)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  exCardGlowLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, opacity: 0.5 },
  exCardInner: { alignItems: 'center', padding: DS.space.lg },
  exCardHeader: { alignItems: 'center', gap: DS.space.xs, marginBottom: DS.space.xs },
  exNumBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  exNum: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  exTarget: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  exName: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center', marginVertical: DS.space.sm },
  exInputWrap: { borderWidth: 2, borderRadius: 100, marginBottom: DS.space.md, overflow: 'hidden', width: '80%' },
  exInput: { width: '100%', textAlign: 'center', fontSize: 26, fontWeight: '800', paddingVertical: 14, color: TXT1 },
  exBtns: { flexDirection: 'row', gap: DS.space.sm, alignItems: 'center' },
  logBtn: {
    paddingHorizontal: DS.space.xl,
    paddingVertical: DS.space.sm + 4,
    borderRadius: 100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  logBtnTxt: { fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
  skipBtn: { paddingHorizontal: DS.space.lg, paddingVertical: DS.space.sm + 4, borderRadius: 100, borderWidth: 1.5 },
  skipBtnTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 2, color: TXT3 },
  intensitySection: { alignItems: 'center', marginBottom: DS.space.md },
  intensityRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.sm, marginBottom: DS.space.sm },
  intensityLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 4, color: TXT3 },
  intensityValue: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  intensityBtns: { flexDirection: 'row', gap: DS.space.sm },
  intBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intBtnTxt: { fontSize: 16, fontWeight: '800', color: TXT3 },
  endSection: { alignItems: 'center', marginTop: DS.space.xs },
  endBtn: { paddingHorizontal: DS.space.lg, paddingVertical: DS.space.sm, borderRadius: 100, borderWidth: 1 },
  endBtnText: { color: '#E52030', fontSize: 8.5, letterSpacing: 4, fontWeight: '700' },
  trainDone: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: DS.space.lg },
  doneGlowRing: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 1, opacity: 0.1 },
  doneBadge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.space.lg,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  doneKanji: { fontSize: 44, fontWeight: '900', letterSpacing: -2 },
  doneTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  doneTitleJp: { fontSize: 12, color: TXT3, marginTop: DS.space.xs, letterSpacing: 1 },
  doneStats: { flexDirection: 'row', gap: DS.space.md, marginTop: DS.space.lg },
  doneStatChip: { borderWidth: 1, borderRadius: DS.radius.md, paddingHorizontal: DS.space.lg, paddingVertical: DS.space.sm, alignItems: 'center', minWidth: 90 },
  doneStatVal: { fontSize: 24, fontWeight: '900' },
  doneStatLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 2.5, color: TXT3, marginTop: 4 },
  breathSection: { width: '100%', gap: DS.space.xs },
  breathSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: DS.space.sm, marginBottom: DS.space.sm },
  breathDivider: { flex: 1, height: 1 },
  breathSectionTitleBox: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  breathSectionKanji: { fontSize: 14, fontWeight: '900' },
  breathSectionTitle: { fontSize: 7.5, fontWeight: '700', letterSpacing: 3, color: TXT3 },
  breathCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: DS.radius.lg, padding: DS.space.md, backgroundColor: 'rgba(0,0,0,0.3)' },
  breathKanjiBox: { width: 48, height: 48, borderRadius: DS.radius.md, alignItems: 'center', justifyContent: 'center' },
  breathKanji: { fontSize: 24, fontWeight: '900' },
  breathInfo: { flex: 1, marginLeft: DS.space.sm },
  breathName: { fontSize: 15, fontWeight: '800', color: TXT1 },
  breathPattern: { fontSize: 10, color: TXT3, marginTop: 3 },
  breathMeta: { alignItems: 'flex-end', gap: 3 },
  breathDur: { fontSize: 20, fontWeight: '900' },
  breathXP: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: TXT3 },
});

const TAB_BAR_H = 72;