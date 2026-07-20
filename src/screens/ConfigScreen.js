import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, Alert } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import SectionLabel from '../components/shared/SectionLabel';
import GlassCard from '../components/shared/GlassCard';
import { THEMES, THEME_KEYS, DEFAULT_THEME } from '../theme/themes';
import { TXT1, TXT2, TXT3, BORD, SB_H } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import { lightImpact, setHapticsEnabled } from '../utils/haptics';
import { getUnlockedThemes, THEME_UNLOCK_HINTS } from '../storage/progressStore';
import { setSoundEnabled } from '../services/audioService';
import { scheduleTrainingReminder, cancelTrainingReminder } from '../services/notificationService';
import { getCapability, ensureModel } from '../services/aiService';

const AI_STATUS_COPY = {
  ready:        'Ready — sensei replies are generated on this device.',
  downloading:  'Model downloading — check back shortly.',
  downloadable: 'A one-time on-device model download is available.',
  unavailable:  'Not supported on this device — deterministic sensei lines are used.',
  error:        'Model check failed — deterministic sensei lines are used.',
};

const { width: W } = Dimensions.get('window');

// Expands the 26pt switch / ~28pt time chip to a >=44pt touch target (A11y).
const TOGGLE_HIT = { top: 10, bottom: 10, left: 10, right: 10 };

function ConfigScreen() {
  const { progress, theme, handleUpdate, onReset, setTab } = useProgress();
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

  const [aiCap, setAiCap] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  useEffect(() => {
    let on = true;
    getCapability(true).then(cap => { if (on) setAiCap(cap); });
    return () => { on = false; };
  }, []);
  const downloadModel = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    lightImpact();
    const cap = await ensureModel();
    setAiCap(cap);
    setAiBusy(false);
  };

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

      <SectionLabel label="ACCOUNT · 士" style={{ marginBottom: 10 }} />
      <GlassCard
        accent={t.accent}
        style={{ marginBottom: 10 }}
        onPress={() => { lightImpact(); setTab('profile'); }}
        accessibilityLabel="Profile. Stats, body, sleep, recovery and chronicles"
      >
        <View style={s.navRow}>
          <View style={[s.navKanjiBox, { backgroundColor: t.accent + '18', borderColor: t.accent + '38' }]}>
            <Text style={[s.navKanji, { color: t.accent }]}>士</Text>
          </View>
          <View style={s.navInfo}>
            <Text style={s.navTitle}>PROFILE</Text>
            <Text style={s.navSub}>Stats, body, sleep, recovery &amp; chronicles</Text>
          </View>
          <Text style={[s.navArrow, { color: t.accent }]}>›</Text>
        </View>
      </GlassCard>

      <SectionLabel label="APPEARANCE · 外観" style={{ marginTop: 20, marginBottom: 10 }} />
      <GlassCard accent={t.accent} style={{ marginBottom: 10 }}>
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
                accessibilityRole="button"
                accessibilityLabel={isLocked ? `${tc.name}, locked. ${THEME_UNLOCK_HINTS[key] ?? tc.desc}` : `${tc.name} theme`}
                accessibilityState={{ selected: active, disabled: isLocked }}
              >
                {active && !isLocked && <View style={[s.themeActivePip, { backgroundColor: tc.accent }]} />}
                <View style={[s.themeCircle, { backgroundColor: tc.accent + '20', borderColor: tc.accent }]}>
                  {isLocked
                    ? <Text style={[s.lockIcon, { color: TXT3 }]}>封</Text>
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
      </GlassCard>

      <GlassCard accent="#3B82F6" style={{ marginBottom: 10 }}>
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
            accessibilityRole="switch"
            accessibilityLabel="Auto theme"
            accessibilityState={{ checked: !!settings.autoTheme }}
            hitSlop={TOGGLE_HIT}
          >
            <View style={[s.toggleThumb, settings.autoTheme && { alignSelf: 'flex-end' }]} />
          </Pressable>
        </View>
      </GlassCard>

      <SectionLabel label="TRAINING · 訓練" style={{ marginTop: 20, marginBottom: 10 }} />
      <GlassCard accent={t.accent} style={{ marginBottom: 10 }}>
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
              accessibilityRole="button"
              accessibilityLabel={`Default intensity ${v}`}
              accessibilityState={{ selected: settings.defaultIntensity === v }}
            >
              <Text style={[s.intBtnTxt, settings.defaultIntensity === v && { color: t.accent }]}>{v}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      <GlassCard accent="#FB7185" style={{ marginBottom: 10 }}>
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
              accessibilityRole="button"
              accessibilityLabel={`Daily step goal ${v}`}
              accessibilityState={{ selected: settings.stepGoal === v }}
            >
              <Text style={[s.intBtnTxt, settings.stepGoal === v && { color: '#FB7185' }]}>{v >= 10000 ? `${v / 1000}K` : v}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      {[
        { key: 'soundEnabled', label: 'SOUND EFFECTS', desc: 'Completion chimes · 完了音', color: '#9B59B6' },
        { key: 'hapticsEnabled', label: 'HAPTIC FEEDBACK', desc: 'Vibration on log · 振動', color: '#F39C12' },
      ].map(item => (
        <GlassCard key={item.key} accent={item.color} style={{ marginBottom: 10 }}>
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
              accessibilityRole="switch"
              accessibilityLabel={item.label}
              accessibilityState={{ checked: settings[item.key] !== false }}
              hitSlop={TOGGLE_HIT}
            >
              <View style={[s.toggleThumb, (settings[item.key] !== false) && { alignSelf: 'flex-end' }]} />
            </Pressable>
          </View>
        </GlassCard>
      ))}

      <SectionLabel label="REMINDERS · リマインダー" style={{ marginTop: 20, marginBottom: 10 }} />
      <GlassCard accent="#27AE60" style={{ marginBottom: 10 }}>
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
              try {
                if (next) {
                  await scheduleTrainingReminder(settings.reminderTime || '7:00');
                } else {
                  await cancelTrainingReminder();
                }
              } catch {}
              lightImpact();
            }}
            accessibilityRole="switch"
            accessibilityLabel="Morning reminder"
            accessibilityState={{ checked: !!settings.morningReminder }}
            hitSlop={TOGGLE_HIT}
          >
            <View style={[s.toggleThumb, settings.morningReminder && { alignSelf: 'flex-end' }]} />
          </Pressable>
        </View>
        {settings.morningReminder && (
          <View style={[s.toggleRow, { marginTop: 16 }]}>
            <Text style={s.settingTitle}>TIME · 時間</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {['6:00', '7:00', '8:00'].map(time => (
                <Pressable
                  key={time}
                  style={[s.timeBtn, settings.reminderTime === time && { backgroundColor: '#27AE60', borderColor: '#27AE60' }]}
                  onPress={async () => {
                    set('reminderTime', time);
                    try {
                      await scheduleTrainingReminder(time);
                    } catch {}
                    lightImpact();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Reminder time ${time}`}
                  accessibilityState={{ selected: settings.reminderTime === time }}
                  hitSlop={TOGGLE_HIT}
                >
                  <Text style={[s.timeBtnTxt, settings.reminderTime === time && { color: '#000' }]}>{time}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </GlassCard>

      <SectionLabel label="ON-DEVICE SENSEI · 人工知能" style={{ marginTop: 20, marginBottom: 10 }} />
      <GlassCard accent="#D4A853" style={{ marginBottom: 10 }}>
        <View style={s.toggleRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.settingTitle}>GEMINI NANO</Text>
            <Text style={s.settingDesc}>
              {aiCap ? AI_STATUS_COPY[aiCap] : 'Checking device support…'}
            </Text>
          </View>
          {aiCap === 'downloadable' && (
            <Pressable
              style={[s.timeBtn, { borderColor: '#D4A853', opacity: aiBusy ? 0.5 : 1 }]}
              onPress={downloadModel}
              disabled={aiBusy}
              accessibilityRole="button"
              accessibilityLabel="Download the on-device model"
              hitSlop={TOGGLE_HIT}
            >
              <Text style={[s.timeBtnTxt, { color: '#D4A853' }]}>{aiBusy ? 'STARTING…' : 'DOWNLOAD'}</Text>
            </Pressable>
          )}
        </View>
      </GlassCard>

      <SectionLabel label="DATA · データ" style={{ marginTop: 20, marginBottom: 10 }} />
      <GlassCard accent="#E74C3C" style={{ marginBottom: 10 }}>
        <View style={s.dangerHeader}>
          <View>
            <Text style={s.settingTitle}>RESET PROGRESS</Text>
            <Text style={s.settingDesc}>Start over from East Blue Rookie</Text>
          </View>
          <View style={[s.dangerBadge, { backgroundColor: '#E74C3C18', borderColor: '#E74C3C45' }]}>
            <Text style={s.dangerBadgeText}>危</Text>
          </View>
        </View>
        <Pressable
          style={s.dangerBtn}
          onPress={() => {
            lightImpact();
            // Reset wipes all local data irreversibly — require an explicit
            // confirm so a single mis-tap can't destroy a user's training story.
            Alert.alert(
              'Reset all progress?',
              'This permanently clears your ranks, streaks, sessions, and unlocks on this device. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset everything', style: 'destructive', onPress: onReset },
              ],
            );
          }}
          accessibilityRole="button"
          accessibilityLabel="Reset all progress"
        >
          <Text style={s.dangerBtnTxt}>RESET ALL PROGRESS · 全てリセット</Text>
        </Pressable>
      </GlassCard>

      <SectionLabel label="ABOUT · 概要" style={{ marginTop: 20, marginBottom: 10 }} />
      <GlassCard accent={t.accent} style={{ marginBottom: 40 }}>
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
      </GlassCard>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  screenTitle: { ...DS.type.screenTitle, color: TXT1 },
  screenSub: { ...DS.type.caption, color: TXT3, marginTop: 5, letterSpacing: 0.5 },
  kanjiBadge: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kanjiBadgeText: { fontSize: 20, fontWeight: '900' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md },
  navKanjiBox: { width: 48, height: 48, borderRadius: DS.radius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  navKanji: { fontSize: 24, fontWeight: '900' },
  navInfo: { flex: 1 },
  navTitle: { ...DS.type.cardTitle, fontSize: 16, color: TXT1 },
  navSub: { ...DS.type.caption, color: TXT2, marginTop: 4 },
  navArrow: { fontSize: 28, fontWeight: '300' },
  settingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  settingTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1, color: TXT1 },
  settingJapanese: { fontSize: 12, fontWeight: '800', color: TXT3, letterSpacing: 1 },
  settingDesc: { ...DS.type.caption, color: TXT2, marginTop: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggle: { width: 46, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', padding: 3 },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: TXT1 },
  currentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  currentBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  themeTile: { width: (W - 32 - 24 - 8) / 3, padding: 12, paddingTop: 10, borderWidth: 1.5, borderRadius: 14, alignItems: 'center', gap: 6, position: 'relative', overflow: 'hidden' },
  themeCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  themeDot: { width: 12, height: 12, borderRadius: 6 },
  lockIcon: { fontSize: 15, fontWeight: '900' },
  themeTileName: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textAlign: 'center', marginTop: 4 },
  themeTileDesc: { fontSize: 11, lineHeight: 15, letterSpacing: 0.2, textAlign: 'center' },
  themeActivePip: { position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, borderRadius: 1 },
  intensityBtns: { flexDirection: 'row', gap: 12 },
  intBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: BORD, alignItems: 'center', justifyContent: 'center' },
  intBtnTxt: { fontSize: 16, fontWeight: '800', color: TXT3 },
  timeBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1.5, borderColor: BORD },
  timeBtnTxt: { fontSize: 11, fontWeight: '700', color: TXT3 },
  dangerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dangerBadge: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dangerBadgeText: { fontSize: 18, fontWeight: '900', color: '#E74C3C' },
  dangerBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 100, borderWidth: 1.5, borderColor: '#E74C3C', alignItems: 'center', backgroundColor: 'rgba(231,76,60,0.08)' },
  dangerBtnTxt: { fontSize: 11, fontWeight: '900', letterSpacing: 2, color: '#E74C3C' },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  logoBadge: { width: 64, height: 64, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  logoKanji: { fontSize: 24, fontWeight: '900', color: TXT1 },
  aboutInfo: { flex: 1 },
  aboutTitle: { color: TXT1, fontWeight: '800', fontSize: 18 },
  aboutVersion: { color: TXT2, fontSize: 12, marginTop: 5 },
  aboutJapanese: { color: TXT3, fontSize: 12, marginTop: 4 },
  aboutDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.10)', marginVertical: 16 },
  aboutTagline: { color: TXT2, fontSize: 13, fontFamily: DS.font.display, fontStyle: 'italic', textAlign: 'center', lineHeight: 19 },
});
// Prop-less pager screen: memo stops parent re-renders (toasts, tab
// animation state in Dojo) from cascading into all six mounted screens.
export default React.memo(ConfigScreen);
