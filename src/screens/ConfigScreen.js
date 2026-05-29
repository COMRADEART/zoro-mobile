import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import SectionLabel from '../components/shared/SectionLabel';
import { THEMES, THEME_KEYS, DEFAULT_THEME } from '../theme/themes';
import { TXT1, TXT3, BORD, SB_H } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import { lightImpact, setHapticsEnabled } from '../utils/haptics';
import { getUnlockedThemes, THEME_UNLOCK_HINTS } from '../storage/progressStore';
import { setSoundEnabled } from '../services/audioService';
import { scheduleTrainingReminder, cancelAllReminders } from '../services/notificationService';

const { width: W } = Dimensions.get('window');

function HeroCard({ accent, children, style }) {
  return (
    <View style={[s.heroCard, { borderColor: accent + '30' }, style]}>
      <View style={[s.heroGlow, { backgroundColor: accent }]} />
      {children}
    </View>
  );
}

export default function ConfigScreen() {
  const { progress, theme, handleUpdate, onReset } = useProgress();
  const settings = progress.settings || {};
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];

  const set = (key, value) => handleUpdate({ ...progress, settings: { ...settings, [key]: value } });
  // Recompute only when inputs to THEME_UNLOCK_CONDITIONS change. If a new
  // predicate reads another Progress field, add it to this destructure + deps.
  const { bossChallenges, skillUnlocks, unlockedThemes: savedThemes } = progress;
  const unlockedThemes = useMemo(
    () => getUnlockedThemes({ bossChallenges, skillUnlocks, unlockedThemes: savedThemes }),
    [bossChallenges, skillUnlocks, savedThemes],
  );

  return (
    <ScrollView contentContainerStyle={[s.scroll, { paddingTop: SB_H + 16 }]} showsVerticalScrollIndicator={false}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.screenTitle}>SETTINGS</Text>
          <Text style={s.screenSub}>設定 · Configure your dojo</Text>
        </View>
        <View style={[s.kanjiBadge, { backgroundColor: t.accent + '15', borderColor: t.accent + '30' }]}>
          <Text style={[s.kanjiBadgeText, { color: t.accent }]}>設</Text>
        </View>
      </View>

      <SectionLabel label="APPEARANCE · 外観" style={{ marginBottom: 10 }} />
      <HeroCard accent={t.accent} style={{ marginBottom: 10 }}>
        <View style={s.settingHeader}>
          <Text style={s.settingTitle}>THEME</Text>
          <View style={[s.currentBadge, { backgroundColor: t.accent + '15', borderColor: t.accent + '30' }]}>
            <Text style={[s.currentBadgeText, { color: t.accent }]}>{THEMES[theme]?.name}</Text>
          </View>
        </View>
        <View style={s.themeGrid}>
          {THEME_KEYS.map(key => {
            const tc = THEMES[key];
            const active = key === theme;
            const isLocked = !unlockedThemes.includes(key);
            return (
              <Pressable
                key={key}
                style={[s.themeTile, {
                  borderColor: active ? tc.accent : BORD,
                  backgroundColor: active ? tc.accent + '12' : 'rgba(0,0,0,0.3)',
                  opacity: isLocked ? 0.38 : 1,
                }]}
                onPress={() => { if (!isLocked) set('theme', key); }}
              >
                {active && !isLocked && <View style={[s.themeActivePip, { backgroundColor: tc.accent }]} />}
                <View style={[s.themeCircle, { backgroundColor: tc.accent + '20', borderColor: tc.accent }]}>
                  {isLocked
                    ? <Text style={s.lockIcon}>🔒</Text>
                    : <View style={[s.themeDot, { backgroundColor: tc.accent }]} />}
                </View>
                <Text style={[s.themeTileName, { color: active && !isLocked ? tc.accent : TXT3 }]}>{tc.name.split('·')[0].trim()}</Text>
                <Text style={[s.themeTileDesc, { color: active && !isLocked ? tc.accent + '80' : TXT3 }]}>
                  {isLocked ? (THEME_UNLOCK_HINTS[key] ?? tc.desc) : tc.desc}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </HeroCard>

      <HeroCard accent="#3B82F6" style={{ marginBottom: 10 }}>
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <View style={s.toggleLabelRow}>
              <Text style={s.settingTitle}>AUTO THEME</Text>
              <Text style={s.settingJapanese}>自動</Text>
            </View>
            <Text style={s.settingDesc}>Solar 6am–6pm · Abyss 6pm–6am</Text>
          </View>
          <Pressable
            style={[s.toggle, settings.autoTheme && { backgroundColor: '#3B82F6' }]}
            onPress={() => { set('autoTheme', !settings.autoTheme); lightImpact(); }}
          >
            <View style={[s.toggleThumb, settings.autoTheme && { alignSelf: 'flex-end' }]} />
          </Pressable>
        </View>
      </HeroCard>

      <SectionLabel label="TRAINING · 訓練" style={{ marginTop: 20, marginBottom: 10 }} />
      <HeroCard accent={t.accent} style={{ marginBottom: 10 }}>
        <Text style={s.settingTitle}>DEFAULT INTENSITY · 強度</Text>
        <Text style={s.settingDesc}>Default training intensity level</Text>
        <View style={[s.intensityBtns, { marginTop: 14 }]}>
          {[3, 5, 7, 9].map(v => (
            <Pressable
              key={v}
              style={[s.intBtn, settings.defaultIntensity === v && {
                backgroundColor: t.accent + '15',
                borderColor: t.accent,
                shadowColor: t.accent,
                shadowOpacity: 0.5,
                shadowRadius: 8,
              }]}
              onPress={() => set('defaultIntensity', v)}
            >
              <Text style={[s.intBtnTxt, settings.defaultIntensity === v && { color: t.accent }]}>{v}</Text>
            </Pressable>
          ))}
        </View>
      </HeroCard>

      <HeroCard accent="#FB7185" style={{ marginBottom: 10 }}>
        <Text style={s.settingTitle}>DAILY STEP GOAL · 歩数目標</Text>
        <Text style={s.settingDesc}>Target steps per day</Text>
        <View style={[s.intensityBtns, { marginTop: 14 }]}>
          {[5000, 8000, 10000, 15000].map(v => (
            <Pressable
              key={v}
              style={[s.intBtn, settings.stepGoal === v && {
                backgroundColor: '#FB7185' + '15',
                borderColor: '#FB7185',
                shadowColor: '#FB7185',
                shadowOpacity: 0.5,
                shadowRadius: 8,
              }]}
              onPress={() => set('stepGoal', v)}
            >
              <Text style={[s.intBtnTxt, settings.stepGoal === v && { color: '#FB7185' }]}>{v >= 10000 ? `${v / 1000}K` : v}</Text>
            </Pressable>
          ))}
        </View>
      </HeroCard>

      {[
        { key: 'soundEnabled', label: 'SOUND EFFECTS', desc: 'Completion chimes · 完了音', color: '#9B59B6' },
        { key: 'hapticsEnabled', label: 'HAPTIC FEEDBACK', desc: 'Vibration on log · 振動', color: '#F39C12' },
      ].map(item => (
        <HeroCard key={item.key} accent={item.color} style={{ marginBottom: 10 }}>
          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.settingTitle}>{item.label}</Text>
              <Text style={s.settingDesc}>{item.desc}</Text>
            </View>
            <Pressable
              style={[s.toggle, (settings[item.key] !== false) && { backgroundColor: item.color }]}
              onPress={() => {
                const next = settings[item.key] === false;
                set(item.key, next);
                if (item.key === 'hapticsEnabled') setHapticsEnabled(next);
                if (item.key === 'soundEnabled') setSoundEnabled(next);
                lightImpact();
              }}
            >
              <View style={[s.toggleThumb, (settings[item.key] !== false) && { alignSelf: 'flex-end' }]} />
            </Pressable>
          </View>
        </HeroCard>
      ))}

      <SectionLabel label="REMINDERS · リマインダー" style={{ marginTop: 20, marginBottom: 10 }} />
      <HeroCard accent="#27AE60" style={{ marginBottom: 10 }}>
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <View style={s.toggleLabelRow}>
              <Text style={s.settingTitle}>MORNING REMINDER</Text>
              <Text style={s.settingJapanese}>朝</Text>
            </View>
            <Text style={s.settingDesc}>Daily training nudge · 毎日の訓練通知</Text>
          </View>
          <Pressable
            style={[s.toggle, settings.morningReminder && { backgroundColor: '#27AE60' }]}
            onPress={async () => {
              const next = !settings.morningReminder;
              set('morningReminder', next);
              if (next) {
                await scheduleTrainingReminder(settings.reminderTime || '7:00');
              } else {
                await cancelAllReminders();
              }
              lightImpact();
            }}
          >
            <View style={[s.toggleThumb, settings.morningReminder && { alignSelf: 'flex-end' }]} />
          </Pressable>
        </View>
        {settings.morningReminder && (
          <View style={[s.toggleRow, { marginTop: 16 }]}>
            <Text style={[s.settingTitle, { fontSize: 10 }]}>TIME · 時間</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {['6:00', '7:00', '8:00'].map(time => (
                <Pressable key={time} style={[s.timeBtn, settings.reminderTime === time && { backgroundColor: '#27AE60', borderColor: '#27AE60' }]} onPress={async () => {
                  set('reminderTime', time);
                  await scheduleTrainingReminder(time);
                  lightImpact();
                }}>
                  <Text style={[s.timeBtnTxt, settings.reminderTime === time && { color: '#000' }]}>{time}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </HeroCard>

      <SectionLabel label="DATA · データ" style={{ marginTop: 20, marginBottom: 10 }} />
      <HeroCard accent="#E74C3C" style={{ marginBottom: 10 }}>
        <View style={s.dangerHeader}>
          <View>
            <Text style={s.settingTitle}>RESET PROGRESS</Text>
            <Text style={s.settingDesc}>Start over from East Blue Rookie</Text>
          </View>
          <View style={[s.dangerBadge, { backgroundColor: '#E74C3C15', borderColor: '#E74C3C30' }]}>
            <Text style={s.dangerBadgeText}>⚠</Text>
          </View>
        </View>
        <Pressable style={s.dangerBtn} onPress={() => { lightImpact(); onReset(); }}>
          <Text style={s.dangerBtnTxt}>RESET ALL PROGRESS · 全てリセット</Text>
        </Pressable>
      </HeroCard>

      <SectionLabel label="ABOUT · 概要" style={{ marginTop: 20, marginBottom: 10 }} />
      <HeroCard accent={t.accent} style={{ marginBottom: 40 }}>
        <View style={s.aboutRow}>
          <View style={[s.logoBadge, { backgroundColor: t.accent + '15', borderColor: t.accent + '30' }]}>
            <Text style={s.logoKanji}>三刀流</Text>
          </View>
          <View style={s.aboutInfo}>
            <Text style={s.aboutTitle}>Santoryu Fitness</Text>
            <Text style={s.aboutVersion}>Version 2.0 · Mythos Edition</Text>
            <Text style={s.aboutJapanese}>世界一の大剣豪への道</Text>
          </View>
        </View>
        <View style={s.aboutDivider} />
        <Text style={s.aboutTagline}>{'"'}I will never lose again.{'"'} — Roronoa Zoro</Text>
      </HeroCard>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  heroCard: {
    backgroundColor: 'rgba(8,10,12,0.74)',
    borderWidth: 1,
    borderBottomWidth: 1.5,
    borderRadius: DS.radius.xl,
    padding: DS.space.lg,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  screenTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 5, color: TXT3 },
  screenSub: { fontSize: 11, color: TXT3, marginTop: 4, letterSpacing: 0.5 },
  kanjiBadge: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kanjiBadgeText: { fontSize: 20, fontWeight: '900' },
  settingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  settingTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: TXT1 },
  settingJapanese: { fontSize: 10, fontWeight: '800', color: TXT3, letterSpacing: 1 },
  settingDesc: { fontSize: 11, color: TXT3, marginTop: 3 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggle: { width: 46, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', padding: 3 },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: TXT1 },
  currentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  currentBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  themeTile: { width: (W - 32 - 24 - 8) / 3, padding: 12, paddingTop: 10, borderWidth: 1.5, borderRadius: 14, alignItems: 'center', gap: 6, position: 'relative', overflow: 'hidden' },
  themeCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  themeDot: { width: 12, height: 12, borderRadius: 6 },
  lockIcon: { fontSize: 14 },
  themeTileName: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginTop: 2 },
  themeTileDesc: { fontSize: 7, letterSpacing: 0.5, textAlign: 'center' },
  themeActivePip: { position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, borderRadius: 1 },
  intensityBtns: { flexDirection: 'row', gap: 12 },
  intBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: BORD, alignItems: 'center', justifyContent: 'center' },
  intBtnTxt: { fontSize: 16, fontWeight: '800', color: TXT3 },
  timeBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1.5, borderColor: BORD },
  timeBtnTxt: { fontSize: 11, fontWeight: '700', color: TXT3 },
  dangerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dangerBadge: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dangerBadgeText: { fontSize: 18 },
  dangerBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 100, borderWidth: 1.5, borderColor: '#E74C3C', alignItems: 'center', backgroundColor: 'rgba(231,76,60,0.08)' },
  dangerBtnTxt: { fontSize: 11, fontWeight: '900', letterSpacing: 2, color: '#E74C3C' },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  logoBadge: { width: 64, height: 64, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  logoKanji: { fontSize: 24, fontWeight: '900', color: TXT1 },
  aboutInfo: { flex: 1 },
  aboutTitle: { color: TXT1, fontWeight: '800', fontSize: 17 },
  aboutVersion: { color: TXT3, fontSize: 11, marginTop: 4 },
  aboutJapanese: { color: TXT3, fontSize: 10, marginTop: 3 },
  aboutDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 16 },
  aboutTagline: { color: TXT3, fontSize: 11, fontStyle: 'italic', textAlign: 'center' },
});
