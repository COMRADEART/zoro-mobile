import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Animated,
  StatusBar, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AmbientBG, FloatingParticles } from '../components/shared/AmbientBG';
import { THEMES, DEFAULT_THEME } from '../theme/themes';
import { TXT1, TXT3, BORD, SB_H } from '../theme/tokens';
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
  const fade = useRef(new Animated.Value(0)).current;
  // One-shot latch: a fast double-tap can't fire onSignIn twice.
  const submitGate = useRef(createSubmitGate()).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 360, useNativeDriver: true }).start();
  }, [fade]);

  // Single source of truth: the button is enabled iff the name survives the
  // same sanitization the persistence layer applies, so it can never be a
  // silent no-op (Finding F5).
  const valid = isEnterableName(name);

  const goName = () => { lightImpact(); setStep('name'); };
  const confirm = () => {
    if (!valid) return;
    submitGate.tryFire(() => { lightImpact(); onSignIn(name); });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle={statusBarStyleForTheme(theme)} backgroundColor="transparent" translucent />
      <AmbientBG theme={theme} />
      <FloatingParticles theme={theme} count={14} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[s.content, { opacity: fade }]}>
          <View style={s.hero}>
            <View style={[s.kanjiBadge, { backgroundColor: t.accent + '15', borderColor: t.accent + '30' }]}>
              <Text style={[s.kanjiBadgeText, { color: t.accent }]}>三刀流</Text>
            </View>
            <Text style={s.title}>SANTORYU FITNESS</Text>
            <Text style={s.subtitle}>世界一の大剣豪への道</Text>
            <Text style={s.tagline}>
              {step === 'choose'
                ? 'Carve your name into the dojo.'
                : 'What should the dojo call you?'}
            </Text>
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
              >
                <SantoryuMark size={20} color={t.accent} />
                <Text style={[s.primaryBtnTxt, { color: t.accent }]}>Create your dojo profile</Text>
              </Pressable>

              <Pressable
                style={s.skipBtn}
                onPress={() => { lightImpact(); onSkip(); }}
                accessibilityRole="button"
                accessibilityLabel="Skip for now, continue without a profile"
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
              >
                <Text style={[s.confirmTxt, !valid && { color: TXT3 }]}>ENTER THE DOJO</Text>
              </Pressable>
              <Pressable
                style={s.skipBtn}
                onPress={() => { lightImpact(); setStep('choose'); }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={DS.hitSlop}
              >
                <Text style={s.skipTxt}>Back</Text>
              </Pressable>
            </View>
          )}

          <Text style={s.footnote}>
            Stored only on this device. No account, no sync.
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: SB_H + 24,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  hero: { alignItems: 'center', marginTop: H * 0.10 },
  kanjiBadge: {
    width: 96, height: 96, borderRadius: DS.radius.xl, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  kanjiBadgeText: { fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 4, color: TXT1, textAlign: 'center' },
  subtitle: { fontSize: 12, color: TXT3, marginTop: 10, letterSpacing: 1 },
  tagline: { fontSize: 13, color: TXT3, marginTop: 22, textAlign: 'center', lineHeight: 19 },

  actions: { gap: 14 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: DS.radius.full,
    paddingVertical: 15, paddingHorizontal: 20,
  },
  primaryBtnTxt: { fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },

  input: {
    backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1.5, borderRadius: DS.radius.lg,
    paddingVertical: 15, paddingHorizontal: 18, color: TXT1, fontSize: 16, fontWeight: '600',
  },
  confirmBtn: {
    borderWidth: 1.5, borderRadius: DS.radius.full,
    paddingVertical: 15, alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: BORD },
  confirmTxt: { color: '#0a0a0a', fontSize: 13, fontWeight: '900', letterSpacing: 2 },

  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipTxt: { color: TXT3, fontSize: 13, fontWeight: '600', letterSpacing: 1 },

  footnote: { color: TXT3, fontSize: 11, textAlign: 'center', letterSpacing: 0.3 },
});
