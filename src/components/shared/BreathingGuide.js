import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Modal, Animated, StyleSheet, Easing } from 'react-native';
import { TXT1, TXT3 } from '../../theme/tokens';

const PHASE_LABELS = {
  inhale: { text: '吸う', sub: 'BREATHE IN', color: '#4A9EFF' },
  holdIn: { text: '保つ', sub: 'HOLD', color: '#D4A853' },
  exhale: { text: '吐く', sub: 'BREATHE OUT', color: '#38bdf8' },
  holdOut: { text: '保つ', sub: 'HOLD', color: '#8EAABE' },
};

export default function BreathingGuide({ program, onComplete, onDismiss }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;
  const ringPulse = useRef(new Animated.Value(0)).current;

  const [phaseKey, setPhaseKey] = useState('inhale');
  const [countdown, setCountdown] = useState(program.pattern.inhale);
  const [cycles, setCycles] = useState(0);
  const totalCycles = Math.round((program.durationMin * 60) / Object.values(program.pattern).reduce((a, b) => a + b, 0));

  const animRef = useRef(null);
  const timerRef = useRef(null);
  const stateRef = useRef({ phaseKey: 'inhale', remaining: program.pattern.inhale, cycles: 0 });

  const playPhaseAnim = useCallback((key) => {
    if (animRef.current) animRef.current.stop();
    const dur = program.pattern[key] * 1000;
    let toScale, toOpacity;
    if (key === 'inhale') { toScale = 1.6; toOpacity = 1; }
    else if (key === 'holdIn') { toScale = 1.6; toOpacity = 1; }
    else if (key === 'exhale') { toScale = 1.0; toOpacity = 0.4; }
    else { toScale = 1.0; toOpacity = 0.4; }

    animRef.current = Animated.parallel([
      Animated.timing(scale, { toValue: toScale, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: toOpacity, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]);
    animRef.current.start();
  }, [program, scale, opacity]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(ringPulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ).start();
  }, [ringPulse]);

  useEffect(() => {
    const phases = ['inhale', 'holdIn', 'exhale', 'holdOut'].filter(k => program.pattern[k] > 0);
    let phaseIdx = 0;
    stateRef.current = { phaseKey: phases[0], remaining: program.pattern[phases[0]], cycles: 0 };
    setPhaseKey(phases[0]);
    setCountdown(program.pattern[phases[0]]);
    setCycles(0);
    playPhaseAnim(phases[0]);

    timerRef.current = setInterval(() => {
      const st = stateRef.current;
      const next = st.remaining - 1;

      if (next <= 0) {
        phaseIdx = (phaseIdx + 1) % phases.length;
        const nextPhase = phases[phaseIdx];
        const newCycles = phaseIdx === 0 ? st.cycles + 1 : st.cycles;

        if (newCycles >= totalCycles) {
          clearInterval(timerRef.current);
          onComplete();
          return;
        }

        stateRef.current = { phaseKey: nextPhase, remaining: program.pattern[nextPhase], cycles: newCycles };
        setPhaseKey(nextPhase);
        setCountdown(program.pattern[nextPhase]);
        setCycles(newCycles);
        playPhaseAnim(nextPhase);
      } else {
        stateRef.current = { ...st, remaining: next };
        setCountdown(next);
      }
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      if (animRef.current) animRef.current.stop();
    };
  }, [program, onComplete, playPhaseAnim, totalCycles]);

  const phaseInfo = PHASE_LABELS[phaseKey] || PHASE_LABELS.inhale;

  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.headerSection}>
            <Text style={s.programKanji}>{program.kanji}</Text>
            <Text style={s.programName}>{program.name}</Text>
            <Text style={s.programDuration}>{program.durationMin} min · {program.xpReward} XP</Text>
          </View>

          <View style={s.orbWrap}>
            <Animated.View style={[s.orbGlowOuter, {
              backgroundColor: phaseInfo.color + '08',
              transform: [{ scale: ringPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
              opacity: ringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            }]} />
            <View style={[s.orbGlowMid, { backgroundColor: phaseInfo.color + '12' }]} />
            <Animated.View style={[s.orbGlowInner, {
              backgroundColor: phaseInfo.color + '18',
              transform: [{ scale }],
              opacity: opacity.interpolate({ inputRange: [0.3, 1], outputRange: [0.5, 1] }),
            }]}>
              <Animated.View style={[s.orbOuter, {
                borderColor: phaseInfo.color + '60',
                transform: [{ scale }],
                opacity,
              }]}>
                <View style={[s.orbInner, { backgroundColor: phaseInfo.color + '25' }]} />
                <View style={[s.orbCore, { backgroundColor: phaseInfo.color + '70', shadowColor: phaseInfo.color }]} />
              </Animated.View>
            </Animated.View>
            <View style={s.countdownWrap}>
              <Text style={[s.countdownNum, { color: phaseInfo.color }]}>{countdown}</Text>
            </View>
          </View>

          <View style={s.phaseSection}>
            <Text style={[s.phaseLabel, { color: phaseInfo.color }]}>{phaseInfo.text}</Text>
            <Text style={s.phaseSub}>{phaseInfo.sub}</Text>
          </View>

          <View style={s.cycleRow}>
            <Text style={s.cycleText}>CYCLE {Math.min(cycles + 1, totalCycles)} / {totalCycles}</Text>
          </View>

          <View style={s.cycleBar}>
            <View style={[s.cycleBarFill, {
              width: `${(cycles / totalCycles) * 100}%`,
              backgroundColor: phaseInfo.color,
              shadowColor: phaseInfo.color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 4,
            }]} />
          </View>

          <Pressable style={s.dismissBtn} onPress={() => { clearInterval(timerRef.current); onDismiss(); }}>
            <Text style={s.dismissTxt}>END PRACTICE · 終了</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  container: { width: '90%', alignItems: 'center', gap: 10 },
  headerSection: { alignItems: 'center', marginBottom: 8 },
  programKanji: { fontSize: 44, fontWeight: '900', color: TXT1 },
  programName: { fontSize: 10, fontWeight: '700', letterSpacing: 4, color: TXT3, marginTop: 6 },
  programDuration: { fontSize: 9, fontWeight: '600', color: TXT3, letterSpacing: 2, marginTop: 4 },
  orbWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginVertical: 24, position: 'relative' },
  orbGlowOuter: { position: 'absolute', width: 220, height: 220, borderRadius: 110 },
  orbGlowMid: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  orbGlowInner: { position: 'absolute', width: 190, height: 190, borderRadius: 95, alignItems: 'center', justifyContent: 'center' },
  orbOuter: { width: 160, height: 160, borderRadius: 80, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  orbInner: { width: 100, height: 100, borderRadius: 50, position: 'absolute' },
  orbCore: { width: 44, height: 44, borderRadius: 22, position: 'absolute', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 },
  countdownWrap: { position: 'absolute' },
  countdownNum: { fontSize: 56, fontWeight: '900', letterSpacing: 0 },
  phaseSection: { alignItems: 'center', marginBottom: 8 },
  phaseLabel: { fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  phaseSub: { fontSize: 9, fontWeight: '700', letterSpacing: 4, color: TXT3, marginTop: 4 },
  cycleRow: { marginBottom: 10 },
  cycleText: { fontSize: 9, fontWeight: '700', letterSpacing: 3.5, color: TXT3 },
  cycleBar: { width: '85%', height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 32 },
  cycleBarFill: { height: 4, borderRadius: 2 },
  dismissBtn: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 100, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  dismissTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 3, color: TXT3 },
});
