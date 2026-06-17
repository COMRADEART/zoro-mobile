import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Animated,
  StatusBar, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AmbientBG, FloatingParticles } from '../components/shared/AmbientBG';
import { THEMES, DEFAULT_THEME } from '../theme/themes';
import { TXT1, TXT2, TXT3, BORD, SB_H } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import { lightImpact } from '../utils/haptics';
import { isEnterableName, DISPLAY_NAME_MAX } from '../logic/progression';
import { statusBarStyleForTheme } from '../theme/statusBar';
import { createSubmitGate } from '../utils/submitGate';

const { height: H } = Dimensions.get('window');
const NAME_MAX = DISPLAY_NAME_MAX;

// Original three-sword (三刀流) mark — three blades over a shared guard line.
// Deliberately NOT any third-party brand: this gate is a local-only profile
// capture, not an OAuth sign-in.
function SantoryuMark({ size = 20, color = '#fff' }) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image" accessibilityLabel="Santoryu three-sword mark">
      <Path {...p} d="M6 4 L6 18" />
      <Path {...p} d="M12 3 L12 19" />
      <Path {...p} d="M18 4 L18 18" />
      <Path {...p} d="M3 15 L21 15" />
    </Svg>
  );
}

// Local-only welcome gate. There is NO backend and NO OAuth — this just
// captures a display name stored on-device. onSignIn persists; onSkip is
// session-only so this reappears next cold start.
export default function WelcomeScreen({ theme, onSignIn, onSkip }) {
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];
  const [step, setStep] = useState('choose'); // 'choose' | 'name'
  const [name, setName] = useState('');
  const fade = useRef(new Animated.Value(1)).current;
  // One-shot latch: a fast double-tap can't fire onSignIn twice.
  const submitGate = useRef(createSubmitGate()).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 360, useNativeDriver: true }).start();
  }, [fade]);

  // Single source of truth: the button is enabled iff the name survives the
  // same sanitization the persistence layer applies, so it can never be a
  // silent no-op (Finding F5).
  const valid = isEnterableName(name);
  const nameInvalid = name.length > 0 && !valid;

  const goName = () => { lightImpact(); setStep('name'); };
  const confirm = () => {
    if (!valid) return;
    submitGate.tryFire(() => { lightImpact(); onSignIn(name); });
  };

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={statusBarStyleForTheme(theme)} backgroundColor="transparent" translucent />
      <AmbientBG theme={theme} />
      <FloatingParticles theme={theme} count={14} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[s.content, { opacity: fade }]}>
          <View style={s.hero}>
            <View style={[s.bladeRail, { borderColor: t.accent + '20' }]}>
              <View style={[s.bladeRailLine, { backgroundColor: t.accent }]} />
              <View style={[s.bladeRailLine, { backgroundColor: t.accent2 || t.accent }]} />
              <View style={[s.bladeRailLine, { backgroundColor: t.accent }]} />
            </View>
            <View style={[s.kanjiBadge, { backgroundColor: t.accent + '15', borderColor: t.accent + '30' }]}>
              <Text style={[s.kanjiBadgeText, { color: t.accent }]}>三刀流</Text>
            </View>
            <Text style={s.title}>SANTORYU</Text>
            <Text style={[s.titleAccent, { color: t.accent }]}>FITNESS</Text>
            <Text style={s.subtitle}>世界一の大剣豪への道</Text>
            <Text style={s.tagline}>
              {step === 'choose'
                ? 'Carve your name into the dojo.'
                : 'What should the dojo call you?'}
            </Text>
            <View style={s.trustRow}>
              {['LOCAL', 'PRIVATE', 'OFFLINE'].map(item => (
                <View key={item} style={[s.trustPill, { borderColor: t.accent + '24' }]}>
                  <Text style={[s.trustPillText, { color: t.accent }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {step === 'choose' ? (
            <View style={s.actions}>
              <Pressable
                style={({ pressed }) => [
                  s.primaryBtn,
                  { borderColor: t.accent + '55', backgroundColor: t.accent + '12' },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={goName}
                accessibilityRole="button"
                accessibilityLabel="Create your dojo profile"
                android_ripple={{ color: t.accent + '20', borderless: false }}
              >
                <SantoryuMark size={20} color={t.accent} />
                <Text style={[s.primaryBtnTxt, { color: t.accent }]}>Create your dojo profile</Text>
              </Pressable>

              <Pressable
                style={s.skipBtn}
                onPress={() => { lightImpact(); onSkip(); }}
                accessibilityRole="button"
                accessibilityLabel="Skip for now, continue without a profile"
                android_ripple={{ color: t.accent + '12', borderless: true }}
                hitSlop={DS.hitSlop}
              >
                <Text style={s.skipTxt}>Skip for now</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.actions}>
              <TextInput
                style={[s.input, { borderColor: valid ? t.accent + '60' : BORD }]}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={TXT3}
                autoFocus
                maxLength={NAME_MAX}
                returnKeyType="done"
                onSubmitEditing={confirm}
                selectionColor={t.accent}
                accessibilityLabel="Enter your name"
              />
              <View style={s.hintBox}>
                <Text style={s.helperText}>1–24 letters, numbers, or spaces</Text>
                {nameInvalid && (
                  <Text style={s.errorText}>Name must contain at least one letter or number and only use letters, numbers, or spaces.</Text>
                )}
              </View>
              <Pressable
                style={({ pressed }) => [
                  s.confirmBtn,
                  { backgroundColor: t.accent, borderColor: t.accent },
                  !valid && s.confirmBtnDisabled,
                  pressed && valid && { opacity: 0.85 },
                ]}
                onPress={confirm}
                disabled={!valid}
                accessibilityRole="button"
                accessibilityLabel="Confirm name and enter the dojo"
                android_ripple={{ color: '#00000022', borderless: false }}
              >
                <Text style={[s.confirmTxt, !valid && { color: TXT3 }]}>ENTER THE DOJO</Text>
              </Pressable>
              <Pressable
                style={s.skipBtn}
                onPress={() => { lightImpact(); setStep('choose'); }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                android_ripple={{ color: t.accent + '12', borderless: true }}
                hitSlop={DS.hitSlop}
              >
                <Text style={s.skipTxt}>Back</Text>
              </Pressable>
            </View>
          )}

          <View style={[s.footnoteBox, { borderColor: t.accent + '18' }]}>
            <Text style={s.footnote}>Stored only on this device. No account, no sync.</Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, position: 'relative', zIndex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: SB_H + 24,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  hero: { alignItems: 'center', marginTop: H * 0.07 },
  bladeRail: {
    width: '78%',
    height: 36,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 20,
    justifyContent: 'space-around',
    paddingVertical: 7,
    opacity: 0.95,
  },
  bladeRailLine: { height: 2, width: '100%', opacity: 0.72 },
  kanjiBadge: {
    width: 104, height: 104, borderRadius: DS.radius.xl, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
  },
  kanjiBadgeText: { fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 34, fontWeight: '900', letterSpacing: 3, color: TXT1, textAlign: 'center', lineHeight: 38 },
  titleAccent: { fontSize: 11, fontWeight: '900', letterSpacing: 7, textAlign: 'center', marginTop: 4 },
  subtitle: { fontSize: 12, color: TXT3, marginTop: 10, letterSpacing: 1 },
  tagline: { fontFamily: DS.font.display, fontSize: 15, fontStyle: 'italic', color: TXT2, marginTop: 22, textAlign: 'center', lineHeight: 22 },
  trustRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  trustPill: {
    borderWidth: 1,
    borderRadius: DS.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  trustPillText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  actions: { gap: 14, marginBottom: 8 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: DS.radius.full,
    paddingVertical: 16, paddingHorizontal: 20,
    minHeight: 54,
    backgroundColor: 'rgba(10,10,10,0.68)',
  },
  primaryBtnTxt: { fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },

  input: {
    backgroundColor: 'rgba(10,10,10,0.72)', borderWidth: 1.5, borderRadius: DS.radius.lg,
    paddingVertical: 15, paddingHorizontal: 18, color: TXT1, fontSize: 16, fontWeight: '600',
  },
  confirmBtn: {
    borderWidth: 1.5, borderRadius: DS.radius.full,
    paddingVertical: 15, alignItems: 'center', minHeight: 52,
  },
  confirmBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: BORD },
  confirmTxt: { color: '#0a0a0a', fontSize: 13, fontWeight: '900', letterSpacing: 2 },

  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipTxt: { color: TXT3, fontSize: 13, fontWeight: '600', letterSpacing: 1 },

  hintBox: { marginHorizontal: 4 },
  helperText: { color: TXT2, fontSize: 12 },
  errorText: { color: '#C87070', fontSize: 12, marginTop: 4 },

  footnoteBox: {
    borderWidth: 1,
    borderRadius: DS.radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  footnote: { color: TXT3, fontSize: 11, textAlign: 'center', letterSpacing: 0.3 },
});
