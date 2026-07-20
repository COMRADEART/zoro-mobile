import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, TextInput, ScrollView, StyleSheet, BackHandler } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import { THEMES, DEFAULT_THEME } from '../theme/themes';
import { SURF, BORD, TXT1, TXT2, TXT3, DANGER, SB_H, TAB_BAR_H } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import { applySessionStart, applySessionEnd, logBreathingSession } from '../logic/progression';
import { SWORDS, getSwordExercises, BREATHING_PROGRAMS } from '../data/gameData';
import BreathingGuide from '../components/shared/BreathingGuide';
import TrainingArcsScreen from './TrainingArcsScreen';
import { heavyImpact, mediumImpact } from '../utils/haptics';
import { playClick, playSuccess } from '../services/audioService';
import * as ai from '../services/aiService';

const SWORD_ORDER = ['wado', 'sandai', 'shusui'];

function TrainScreen() {
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
  const [nlText, setNlText] = useState('');
  const [nlBusy, setNlBusy] = useState(false);
  const timerRef = useRef(null);
  const sessionRef = useRef(null);
  // Mirrors completedExercises for closure-safe reads in endSession.
  const completedRef = useRef([]);
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeSlide = useRef(new Animated.Value(0)).current;
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];
  const sword = SWORDS[activeSword];
  const exercises = getSwordExercises(activeSword, progress.skillUnlocks);
  const currentEx = exercises[exerciseIndex];

  useEffect(() => {
    Animated.timing(fadeSlide, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [phase, fadeSlide]);

  // Best-effort NL → discipline. Strictly advisory: it only pre-selects
  // a sword. The manual tabs and form remain the source of truth, and
  // any failure (no AICore, unparseable) just shows a hint.
  const parseNL = async () => {
    const text = nlText.trim();
    if (!text || nlBusy) return;
    setNlBusy(true);
    const hint = await ai.parseSessionHint(text);
    setNlBusy(false);
    if (hint) {
      switchSword(hint.discipline);
      setNlText('');
      showToast && showToast({ title: 'SENSEI', body: `${SWORDS[hint.discipline].name} — ${hint.note}` });
    } else {
      showToast && showToast({ title: 'SENSEI', body: 'Could not read that — choose a discipline below.' });
    }
  };

  const switchSword = (sw) => {
    setActiveSword(sw);
    handleUpdate({ ...progress, activeSword: sw });
    heavyImpact();
    playClick();
  };

  const startSession = () => {
    const { progress: p } = applySessionStart(progress, { discipline: activeSword });
    sessionRef.current = p.currentSession;
    // Persist the active session — kept only in the ref, an app death
    // mid-workout silently lost it.
    handleUpdate(p);
    setSessionId(p.currentSession.id);
    setElapsed(0); setPhase('active');
    setExerciseIndex(0); setCompletedExercises([]);
    completedRef.current = [];
    setCurrentAmount('');
    fadeSlide.setValue(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    heavyImpact();
    playClick();
  };

  const endSession = () => {
    clearInterval(timerRef.current);
    // Read exercises from the ref, not state: the LOG-on-last-exercise path
    // reaches here via a setTimeout whose closure captured the previous
    // render's completedExercises — the final exercise (its calories, ring
    // credit, and stored record) was silently dropped.
    const payload = completedRef.current.map(ex => ({ id: ex.id, name: ex.name, unit: ex.unit, amount: ex.amount || ex.base }));
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
    completedRef.current = [...completedRef.current, { ...currentEx, amount }];
    setCompletedExercises(completedRef.current);
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

  // Hardware back should leave the arcs sub-screen, not exit the app.
  useEffect(() => {
    if (!showArcs) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowArcs(false);
      return true;
    });
    return () => sub.remove();
  }, [showArcs]);

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
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <View style={[s.nlCard, { borderColor: t.accent + '30' }]}>
            <Text style={s.nlLabel}>DESCRIBE YOUR SESSION · 任意</Text>
            <View style={s.nlRow}>
              <TextInput
                style={[s.nlInput, { borderColor: t.accent + '30' }]}
                value={nlText}
                onChangeText={setNlText}
                placeholder='e.g. "20 min meditation and some breathing"'
                placeholderTextColor={TXT3}
                maxLength={160}
                onSubmitEditing={parseNL}
                returnKeyType="done"
                accessibilityLabel="Describe your session in words"
              />
              <Pressable
                onPress={parseNL}
                disabled={nlBusy || !nlText.trim()}
                style={[s.nlBtn, { backgroundColor: t.accent, opacity: nlBusy || !nlText.trim() ? 0.4 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel="Interpret session description"
              >
                <Text style={s.nlBtnTxt}>{nlBusy ? '…' : 'SET'}</Text>
              </Pressable>
            </View>
          </View>

          <Animated.View style={[s.idleHero, { opacity: fadeSlide }]}>
            <View style={[s.heroCard, { borderColor: t.accent + '30' }]}>
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
              <Pressable
                style={s.arcsBtn}
                onPress={() => setShowArcs(true)}
                accessibilityRole="button"
                accessibilityLabel="Open training arcs"
              >
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
              <View style={[s.endBtn, { borderColor: DANGER + '50' }]}>
                <Text style={s.endBtnText}>END SESSION · 終了</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <Animated.View style={[s.trainDone, { opacity: fadeSlide }]}>
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: DS.radius.lg,
    padding: 4,
    backgroundColor: 'rgba(8,8,9,0.85)',
  },
  swordTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: DS.space.sm + 2,
    borderRadius: DS.radius.md,
    gap: 5,
  },
  swordTabActive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  swordTabKanji: { fontSize: 22, fontWeight: '900', color: TXT3 },
  swordTabName: { ...DS.type.micro, color: TXT3 },
  trainIdle: { flex: 1, paddingBottom: TAB_BAR_H + DS.space.xl },
  idleHero: { marginBottom: DS.space.xl },
  heroCard: {
    backgroundColor: SURF,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: DS.radius.lg,
    padding: DS.space.lg,
  },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md, marginBottom: DS.space.md },
  swordIconBadge: {
    width: 58,
    height: 58,
    borderRadius: DS.radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swordIconText: { fontSize: 30, fontWeight: '900' },
  heroInfo: { flex: 1 },
  trainSwordName: { ...DS.type.displayMd, fontSize: 26 },
  trainDiscipline: { ...DS.type.label, color: TXT3, marginTop: 6 },
  trainDesc: { ...DS.type.body, color: TXT2, textAlign: 'center', marginBottom: DS.space.md },
  exerciseMeta: { alignItems: 'center', marginBottom: DS.space.lg },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 },
  metaChipText: { fontSize: 18, fontWeight: '900' },
  metaChipLabel: { ...DS.type.micro, color: TXT2, letterSpacing: 1.5 },
  beginBtn: {
    paddingHorizontal: DS.space.xl,
    paddingVertical: DS.space.md + 2,
    borderRadius: 100,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  beginBtnInner: { alignItems: 'center' },
  beginBtnText: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  arcsBtn: { marginTop: DS.space.md, alignItems: 'center', paddingVertical: DS.space.sm },
  arcsBtnTxt: { ...DS.type.label, color: TXT2 },
  trainActive: { flex: 1, paddingHorizontal: DS.space.md, paddingBottom: TAB_BAR_H },
  timerSection: { alignItems: 'center', marginBottom: DS.space.lg },
  timerBadge: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 6, marginBottom: DS.space.sm },
  timerLabel: { ...DS.type.label, color: TXT2 },
  timerVal: { ...DS.type.numeric, fontFamily: DS.font.display, fontSize: 60, color: TXT1, marginVertical: DS.space.xs },
  sessionProgressOuter: { width: '100%', height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, marginTop: DS.space.sm, overflow: 'hidden' },
  sessionProgressFill: { height: 5, borderRadius: 3 },
  progressLabel: { ...DS.type.caption, color: TXT2, marginTop: DS.space.sm, letterSpacing: 1 },
  exCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: DS.radius.lg,
    marginBottom: DS.space.md,
    overflow: 'hidden',
    backgroundColor: SURF,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  exCardInner: { alignItems: 'center', padding: DS.space.lg },
  exCardHeader: { alignItems: 'center', gap: DS.space.sm, marginBottom: DS.space.sm },
  exNumBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  exNum: { ...DS.type.micro, fontWeight: '800', letterSpacing: 1.5 },
  exTarget: { ...DS.type.caption, fontWeight: '700', letterSpacing: 1 },
  exName: { ...DS.type.displayMd, fontSize: 30, textAlign: 'center', marginVertical: DS.space.md },
  exInputWrap: { borderWidth: 1.5, borderRadius: 100, marginBottom: DS.space.md, overflow: 'hidden', width: '80%' },
  exInput: { width: '100%', textAlign: 'center', fontSize: 26, fontWeight: '800', paddingVertical: 14, color: TXT1 },
  exBtns: { flexDirection: 'row', gap: DS.space.sm, alignItems: 'center' },
  logBtn: {
    paddingHorizontal: DS.space.xl,
    paddingVertical: DS.space.sm + 6,
    borderRadius: 100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  logBtnTxt: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  skipBtn: { paddingHorizontal: DS.space.lg, paddingVertical: DS.space.sm + 6, borderRadius: 100, borderWidth: 1.5 },
  skipBtnTxt: { ...DS.type.micro, fontWeight: '700', letterSpacing: 1 },
  intensitySection: { alignItems: 'center', marginBottom: DS.space.md },
  intensityRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.sm, marginBottom: DS.space.sm },
  intensityLabel: { ...DS.type.label, color: TXT2 },
  intensityValue: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  intensityBtns: { flexDirection: 'row', gap: DS.space.sm },
  intBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intBtnTxt: { fontSize: 16, fontWeight: '800', color: TXT2 },
  endSection: { alignItems: 'center', marginTop: DS.space.sm },
  endBtn: { paddingHorizontal: DS.space.lg, paddingVertical: DS.space.sm + 2, borderRadius: 100, borderWidth: StyleSheet.hairlineWidth },
  endBtnText: { color: DANGER, ...DS.type.label, letterSpacing: 2 },
  trainDone: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: DS.space.lg },
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
  doneTitle: { ...DS.type.displayLg, fontSize: 28 },
  doneTitleJp: { ...DS.type.caption, color: TXT2, marginTop: DS.space.xs, letterSpacing: 0.5 },
  doneStats: { flexDirection: 'row', gap: DS.space.md, marginTop: DS.space.lg },
  doneStatChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: DS.radius.md, paddingHorizontal: DS.space.lg, paddingVertical: DS.space.md, alignItems: 'center', minWidth: 96 },
  doneStatVal: { ...DS.type.displayMd, fontSize: 26 },
  doneStatLabel: { ...DS.type.micro, color: TXT3, marginTop: 5, letterSpacing: 1.5 },
  breathSection: { width: '100%', gap: DS.space.sm },
  breathSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: DS.space.sm, marginBottom: DS.space.sm },
  breathDivider: { flex: 1, height: StyleSheet.hairlineWidth },
  breathSectionTitleBox: { width: 30, height: 30, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  breathSectionKanji: { fontSize: 15, fontWeight: '900' },
  breathSectionTitle: { ...DS.type.label, color: TXT2 },
  breathCard: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: DS.radius.lg, padding: DS.space.md, backgroundColor: SURF },
  breathKanjiBox: { width: 50, height: 50, borderRadius: DS.radius.md, alignItems: 'center', justifyContent: 'center' },
  breathKanji: { fontSize: 25, fontWeight: '900' },
  breathInfo: { flex: 1, marginLeft: DS.space.md },
  breathName: { ...DS.type.cardTitle, fontSize: 16, color: TXT1 },
  breathPattern: { ...DS.type.caption, color: TXT3, marginTop: 4 },
  breathMeta: { alignItems: 'flex-end', gap: 4 },
  breathDur: { fontSize: 20, fontWeight: '900' },
  breathXP: { ...DS.type.micro, color: TXT2, letterSpacing: 1 },
});
// Prop-less pager screen: memo stops parent re-renders (toasts, tab
// animation state in Dojo) from cascading into all six mounted screens.
export default React.memo(TrainScreen);
