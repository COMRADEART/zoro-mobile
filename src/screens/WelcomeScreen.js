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

const { height: H } = Dimensions.get('window');
const NAME_MAX = 40;

// Official 4-color Google "G" mark (viewBox 0 0 24 24).
function GoogleG({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image" accessibilityLabel="Google logo">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  );
}

// Local-only welcome gate. "Continue with Google" is a Google-styled local
// profile capture (no OAuth round-trip — the app has no backend to sync to).
// onSignIn persists; onSkip is session-only so this reappears next cold start.
export default function WelcomeScreen({ theme, onSignIn, onSkip }) {
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];
  const [step, setStep] = useState('choose'); // 'choose' | 'name'
  const [name, setName] = useState('');
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 360, useNativeDriver: true }).start();
  }, [fade]);

  const trimmed = name.trim();
  const valid = trimmed.length > 0;

  const goName = () => { lightImpact(); setStep('name'); };
  const confirm = () => {
    if (!valid) return;
    lightImpact();
    onSignIn(trimmed.slice(0, NAME_MAX));
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
                ? 'Sign in to carve your name into the dojo.'
                : 'What should the dojo call you?'}
            </Text>
          </View>

          {step === 'choose' ? (
            <View style={s.actions}>
              <Pressable
                style={({ pressed }) => [s.googleBtn, pressed && { opacity: 0.85 }]}
                onPress={goName}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                <GoogleG size={20} />
                <Text style={s.googleBtnTxt}>Continue with Google</Text>
              </Pressable>

              <Pressable
                style={s.skipBtn}
                onPress={() => { lightImpact(); onSkip(); }}
                accessibilityRole="button"
                accessibilityLabel="Skip sign in for now"
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
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.full,
    paddingVertical: 15, paddingHorizontal: 20,
  },
  googleBtnTxt: { color: '#1F1F1F', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

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
