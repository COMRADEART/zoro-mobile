import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import SectionLabel from '../components/shared/SectionLabel';
import { SleepStagesWeek } from '../components/shared/charts/SleepStagesChart';
import { THEMES, DEFAULT_THEME } from '../theme/themes';
import { SURF, TXT1, TXT2, TXT3, BORD, SB_H, TAB_BAR_H } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import {
  updateRecoveryFromSleep, updateMood, updateBodyStats,
  getReadinessLevel, getReadinessColor,
  computeDreamArchetype, DREAM_ARCHETYPES,
  generateVoyageChronicle,
} from '../logic/progression';
import { POWER_MEALS } from '../data/gameData';
import { playClick } from '../services/audioService';

function HeroCard({ accent, children, style }) {
  return (
    <View style={[s.heroCard, { borderColor: accent + '38' }, style]}>
      {children}
    </View>
  );
}

export default function ProfileScreen() {
  const { progress, today, theme, handleUpdate } = useProgress();

  const [weight, setWeight] = useState(String(progress.bodyStats?.weight || 70));
  const [height, setHeight] = useState(String(progress.bodyStats?.height || 175));
  const [sleepQ, setSleepQ] = useState(3);
  const [sleepH, setSleepH] = useState('7');
  const [deepH, setDeepH] = useState('1.5');
  const [lightH, setLightH] = useState('3.5');
  const [remH, setRemH] = useState('1.5');
  const [awakeH, setAwakeH] = useState('0.5');
  const [energy, setEnergy] = useState(5);
  const [mood, setMood] = useState(5);
  const [savedBody, setSavedBody] = useState(false);
  const [savedSleep, setSavedSleep] = useState(false);
  const [savedMood, setSavedMood] = useState(false);
  const [showSleepStages, setShowSleepStages] = useState(false);

  const [showDream, setShowDream] = useState(false);
  const [showChronicles, setShowChronicles] = useState(false);
  const [showHydration, setShowHydration] = useState(false);
  const [showMeals, setShowMeals] = useState(false);
  const [showPhysique, setShowPhysique] = useState(false);
  const [bodyFat, setBodyFat] = useState(String(progress.bodyComposition?.bodyFatPct || ''));
  const [muscleMass, setMuscleMass] = useState(String(progress.bodyComposition?.muscleMassPct || ''));
  const [chest, setChest] = useState(String(progress.bodyComposition?.chest || ''));
  const [waist, setWaist] = useState(String(progress.bodyComposition?.waist || ''));
  const [hips, setHips] = useState(String(progress.bodyComposition?.hips || ''));
  const [arms, setArms] = useState(String(progress.bodyComposition?.arms || ''));
  const [thighs, setThighs] = useState(String(progress.bodyComposition?.thighs || ''));
  const [savedPhysique, setSavedPhysique] = useState(false);
  const [showVitals, setShowVitals] = useState(false);
  const [restingHR, setRestingHR] = useState(String(progress.vitalsLog?.[today]?.restingHR || ''));
  const [hrv, setHrv] = useState(String(progress.vitalsLog?.[today]?.hrv || ''));
  const [vo2Max, setVo2Max] = useState(String(progress.vitalsLog?.[today]?.vo2Max || ''));
  const [savedVitals, setSavedVitals] = useState(false);

  const todayCups = progress.hydrationLog?.[today]?.cups ?? 0;
  const todayMeals = progress.foodLog?.[today] || [];
  const archetype = computeDreamArchetype(progress, today);
  const archetypeData = DREAM_ARCHETYPES[archetype];
  const todayMacros = todayMeals.reduce(
    (acc, m) => ({ kcal: acc.kcal + m.kcal, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const readyColor = getReadinessColor(progress);
  const readiness = getReadinessLevel(progress);
  const totalCal = (progress.sessions || []).reduce((a, s) => a + (s.calories || 0), 0);
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];

  const flash = setter => { setter(true); setTimeout(() => setter(false), 1500); };

  return (
    <ScrollView contentContainerStyle={[s.scroll, { paddingTop: SB_H + 16 }]} showsVerticalScrollIndicator={false}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.screenTitle}>PROFILE</Text>
          <Text style={s.screenSub}>身体を磨け · Forge your body</Text>
        </View>
        <View style={[s.kanjiBadge, { backgroundColor: t.accent + '15', borderColor: t.accent + '30' }]}>
          <Text style={[s.kanjiBadgeText, { color: t.accent }]}>士</Text>
        </View>
      </View>

      <View style={s.allTimeRow}>
        {[
          { label: 'SESSIONS', value: (progress.sessions || []).length, color: t.accent, kanji: '戦' },
          { label: 'CALORIES', value: Math.round(totalCal).toLocaleString(), color: '#FBBF24', kanji: '火' },
          { label: 'TOTAL XP', value: progress.totalXP.toLocaleString(), color: '#B967FF', kanji: '力' },
        ].map(item => (
          <HeroCard key={item.label} accent={item.color} style={s.allTimeCard}>
            <View style={[s.allTimeKanjiBox, { borderColor: item.color + '40' }]}>
              <Text style={[s.allTimeKanji, { color: item.color }]}>{item.kanji}</Text>
            </View>
            <Text style={[s.allTimeNum, { color: item.color }]}>{item.value}</Text>
            <Text style={s.allTimeLabel}>{item.label}</Text>
          </HeroCard>
        ))}
      </View>

      <HeroCard accent={readyColor} style={s.recoveryCard}>
        <View style={s.recoveryTop}>
          <View>
            <View style={s.recoveryHeaderRow}>
              <Text style={[s.recoveryScore, { color: readyColor }]}>{progress.recoveryScore}</Text>
              <View style={[s.recoveryBadge, { borderColor: readyColor + '50', backgroundColor: readyColor + '12' }]}>
                <Text style={[s.recoveryBadgeText, { color: readyColor }]}>気</Text>
              </View>
            </View>
            <Text style={s.recoveryLabel}>RECOVERY SCORE</Text>
          </View>
          <View style={[s.statusPill, { borderColor: readyColor }]}>
            <Text style={[s.statusPillTxt, { color: readyColor }]}>{readiness}</Text>
          </View>
        </View>
        <View style={s.recoveryBar}>
          <View style={[s.recoveryBarFill, { width: `${progress.recoveryScore}%`, backgroundColor: readyColor }]} />
        </View>
      </HeroCard>

      <SectionLabel label="BODY STATS" style={{ marginTop: 20, marginBottom: 10 }} />
      <HeroCard accent="#DC143C" style={s.inputCard}>
        <View style={s.inputRow}>
          <View style={s.inputLabelGroup}>
            <Text style={s.inputLbl}>WEIGHT</Text>
            <Text style={[s.inputUnit, { color: '#DC143C' }]}>kg</Text>
          </View>
          <TextInput style={[s.numInput, { borderColor: '#DC143C55', color: TXT1 }]} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholderTextColor={TXT3} />
        </View>
        <View style={s.divider} />
        <View style={s.inputRow}>
          <View style={s.inputLabelGroup}>
            <Text style={s.inputLbl}>HEIGHT</Text>
            <Text style={[s.inputUnit, { color: '#DC143C' }]}>cm</Text>
          </View>
          <TextInput style={[s.numInput, { borderColor: '#DC143C55', color: TXT1 }]} value={height} onChangeText={setHeight} keyboardType="numeric" placeholderTextColor={TXT3} />
        </View>
        <Pressable style={[s.saveBtn, { backgroundColor: '#DC143C' }]} onPress={() => {
          const { progress: next } = updateBodyStats(progress, { weight: parseFloat(weight) || 70, height: parseFloat(height) || 175 });
          handleUpdate(next); flash(setSavedBody);
        }}>
          <Text style={s.saveBtnTxt}>{savedBody ? '✓ 保存完了' : 'SAVE 保存'}</Text>
        </Pressable>
      </HeroCard>

      <SectionLabel label="SLEEP LOG" style={{ marginTop: 20, marginBottom: 10 }} />
      <HeroCard accent="#D4A853" style={s.inputCard}>
        <View style={s.sleepHeader}>
          <Text style={s.inputLbl}>QUALITY</Text>
          <View style={s.sleepKanjiBox}>
            <Text style={s.sleepKanjiText}>眠</Text>
          </View>
        </View>
        <View style={s.starRow}>
          {[1, 2, 3, 4, 5].map(v => (
            <Pressable key={v} onPress={() => setSleepQ(v)} hitSlop={8}>
              <Text style={[s.star, { color: v <= sleepQ ? '#D4A853' : TXT3 }]}>★</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.divider} />
        <View style={s.inputRow}>
          <View style={s.inputLabelGroup}>
            <Text style={s.inputLbl}>TOTAL HOURS</Text>
            <Text style={[s.inputUnit, { color: '#D4A853' }]}>hrs</Text>
          </View>
          <TextInput style={[s.numInput, { borderColor: '#D4A85355', color: TXT1 }]} value={sleepH} onChangeText={setSleepH} keyboardType="numeric" placeholderTextColor={TXT3} />
        </View>
        <View style={s.divider} />
        <Pressable style={s.toggleRow} onPress={() => setShowSleepStages(v => !v)}>
          <Text style={s.inputLbl}>SLEEP STAGES</Text>
          <Text style={{ color: '#D4A853', fontSize: 14, fontWeight: '800' }}>{showSleepStages ? '−' : '+'}</Text>
        </Pressable>
        {showSleepStages && (
          <>
            <View style={s.divider} />
            {[
              { label: 'DEEP', val: deepH, set: setDeepH, color: '#7C3AED' },
              { label: 'LIGHT', val: lightH, set: setLightH, color: '#3B82F6' },
              { label: 'REM', val: remH, set: setRemH, color: '#22D3EE' },
              { label: 'AWAKE', val: awakeH, set: setAwakeH, color: '#FB923C' },
            ].map(f => (
              <View key={f.label}>
                <View style={s.inputRow}>
                  <Text style={[s.inputLbl, { color: f.color }]}>{f.label} (h)</Text>
                  <TextInput
                    style={[s.numInput, { borderColor: f.color + '55', width: 70, color: TXT1 }]}
                    value={f.val}
                    onChangeText={f.set}
                    keyboardType="numeric"
                    placeholderTextColor={TXT3}
                  />
                </View>
                <View style={s.divider} />
              </View>
            ))}
          </>
        )}
        <Pressable style={[s.saveBtn, { backgroundColor: '#D4A853' }]} onPress={() => {
          const dh = parseFloat(deepH) || 0;
          const lh = parseFloat(lightH) || 0;
          const rh = parseFloat(remH) || 0;
          const ah = parseFloat(awakeH) || 0;
          const totalH = dh + lh + rh + ah;
          const { progress: next } = updateRecoveryFromSleep(progress, {
            date: today,
            quality: sleepQ,
            hours: totalH > 0 ? totalH : parseFloat(sleepH) || 7,
            deepHours: dh, lightHours: lh, remHours: rh, awakeHours: ah,
          });
          handleUpdate(next); flash(setSavedSleep);
        }}>
          <Text style={[s.saveBtnTxt, { color: '#0A0A0A' }]}>{savedSleep ? '✓ 眠った' : 'LOG SLEEP 睡眠'}</Text>
        </Pressable>

        {(() => {
          const weekSleep = [];
          const end = new Date(today + 'T00:00:00');
          for (let i = 6; i >= 0; i--) {
            const d = new Date(end); d.setUTCDate(end.getUTCDate() - i);
            const dk = d.toISOString().slice(0, 10);
            weekSleep.push({ date: dk, sleepData: progress.sleepLog?.[dk] || null });
          }
          return weekSleep.some(d => d.sleepData) ? (
            <>
              <Text style={[s.inputLbl, { marginTop: 16, marginBottom: 8 }]}>THIS WEEK 今週</Text>
              <SleepStagesWeek weekData={weekSleep} />
            </>
          ) : null;
        })()}
      </HeroCard>

      <SectionLabel label="MOOD & ENERGY" style={{ marginTop: 20, marginBottom: 10 }} />
      <HeroCard accent="#B967FF" style={s.inputCard}>
        {[
          { label: 'ENERGY', val: energy, set: setEnergy, color: '#4A9EFF' },
          { label: 'MOOD', val: mood, set: setMood, color: '#B967FF' },
        ].map(item => (
          <View key={item.label}>
            <View style={s.moodRow}>
              <Text style={[s.inputLbl, { width: 70 }]}>{item.label}</Text>
              <View style={{ flexDirection: 'row', gap: 5, flex: 1 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                  <Pressable key={v} onPress={() => item.set(v)} hitSlop={4} style={s.moodPipTouch}>
                    <View style={[s.moodPip, { backgroundColor: v <= item.val ? item.color : 'rgba(255,255,255,0.1)' }]} />
                  </Pressable>
                ))}
              </View>
              <Text style={{ color: item.color, fontWeight: '900', fontSize: 18, width: 28, textAlign: 'right' }}>{item.val}</Text>
            </View>
            <View style={s.divider} />
          </View>
        ))}
        <Pressable style={[s.saveBtn, { backgroundColor: '#B967FF' }]} onPress={() => {
          const { progress: next } = updateMood(progress, { date: today, energy, mood });
          handleUpdate(next); flash(setSavedMood);
        }}>
          <Text style={[s.saveBtnTxt, { color: '#0A0A0A' }]}>{savedMood ? '✓ 保存完了' : 'LOG MOOD 気分'}</Text>
        </Pressable>
      </HeroCard>

      <Pressable style={s.accordionHeader} onPress={() => setShowDream(v => !v)}>
        <View style={s.accordionLeft}>
          <View style={[s.accordionAccent, { backgroundColor: archetypeData.color }]} />
          <Text style={s.accordionTitle}>DREAM SWORDSMAN</Text>
        </View>
        <Text style={[s.accordionSub, { color: archetypeData.color }]}>{archetype}</Text>
      </Pressable>
      {showDream && (
        <HeroCard accent={archetypeData.color} style={{ marginBottom: 10 }}>
          <View style={s.archetypeRow}>
            <Text style={[s.archetypeIcon, { color: archetypeData.color }]}>{archetypeData.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.archetypeName, { color: archetypeData.color }]}>{archetype}</Text>
              <Text style={s.archetypeDesc}>{archetypeData.desc}</Text>
            </View>
          </View>
          <Text style={[s.inputLbl, { marginTop: 12 }]}>DERIVED FROM LAST 7 NIGHTS · 過去7日間</Text>
        </HeroCard>
      )}

      <Pressable style={s.accordionHeader} onPress={() => setShowHydration(v => !v)}>
        <View style={s.accordionLeft}>
          <View style={[s.accordionAccent, { backgroundColor: '#38bdf8' }]} />
          <Text style={s.accordionTitle}>HYDRATION</Text>
        </View>
        <Text style={[s.accordionSub, { color: '#38bdf8' }]}>{todayCups}/8 cups</Text>
      </Pressable>
      {showHydration && (
        <HeroCard accent="#38bdf8" style={{ marginBottom: 10 }}>
          <Text style={s.inputLbl}>TAP TO LOG · {todayCups}/8 TODAY</Text>
          <View style={s.cupsRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(v => (
              <Pressable
                key={v}
                onPress={() => handleUpdate({ ...progress, hydrationLog: { ...progress.hydrationLog, [today]: { cups: todayCups === v ? v - 1 : v } } })}
                hitSlop={8}
              >
                <Text style={[s.cupIcon, { color: '#38bdf8', opacity: v <= todayCups ? 1 : 0.22 }]}>水</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.cupsBar}>
            <View style={[s.cupsBarFill, { width: `${(todayCups / 8) * 100}%`, backgroundColor: '#38bdf8' }]} />
          </View>
        </HeroCard>
      )}

      <Pressable style={s.accordionHeader} onPress={() => setShowMeals(v => !v)}>
        <View style={s.accordionLeft}>
          <View style={[s.accordionAccent, { backgroundColor: '#F59E0B' }]} />
          <Text style={s.accordionTitle}>POWER MEALS</Text>
        </View>
        <Text style={[s.accordionSub, { color: '#F59E0B' }]}>{todayMacros.kcal} kcal</Text>
      </Pressable>
      {showMeals && (
        <HeroCard accent="#F59E0B" style={{ marginBottom: 10 }}>
          <View style={s.macroRow}>
            {[
              { label: 'KCAL', val: todayMacros.kcal, color: '#F59E0B' },
              { label: 'PRO', val: Math.round(todayMacros.protein), color: '#E52030' },
              { label: 'CARBS', val: Math.round(todayMacros.carbs), color: '#D4A853' },
              { label: 'FAT', val: Math.round(todayMacros.fat), color: '#8EAABE' },
            ].map(m => (
              <View key={m.label} style={s.macroItem}>
                <Text style={[s.macroVal, { color: m.color }]}>{m.val}</Text>
                <Text style={s.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
          <View style={s.divider} />
          <View style={s.mealsGrid}>
            {POWER_MEALS.map(meal => (
              <Pressable
                key={meal.id}
                style={s.mealPill}
                onPress={() => {
                  if (meal.kcal === 0) return;
                  const dayMeals = progress.foodLog?.[today] || [];
                  handleUpdate({ ...progress, foodLog: { ...progress.foodLog, [today]: [...dayMeals, { name: meal.name, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, mealId: meal.id }] } });
                }}
              >
                <Text style={s.mealKanji}>{meal.kanji}</Text>
                <Text style={s.mealName} numberOfLines={1}>{meal.name.split("'s ")[1] || meal.name}</Text>
              </Pressable>
            ))}
          </View>
          {todayMeals.length > 0 && (
            <View style={{ marginTop: 14, gap: 8 }}>
              <Text style={[s.inputLbl, { marginBottom: 4 }]}>TODAY&apos;S MEALS</Text>
              {todayMeals.map((meal, idx) => (
                <View key={idx} style={s.loggedMealRow}>
                  <Text style={s.loggedMealName}>{meal.name}</Text>
                  <Text style={[s.loggedMealKcal, { color: '#F59E0B' }]}>{meal.kcal} kcal</Text>
                  <Pressable onPress={() => {
                    const filtered = todayMeals.filter((_, i) => i !== idx);
                    handleUpdate({ ...progress, foodLog: { ...progress.foodLog, [today]: filtered } });
                  }} hitSlop={8}>
                    <Text style={{ color: '#f87171', fontSize: 14, fontWeight: '900' }}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </HeroCard>
      )}

      <Pressable style={s.accordionHeader} onPress={() => setShowChronicles(v => !v)}>
        <View style={s.accordionLeft}>
          <View style={[s.accordionAccent, { backgroundColor: '#B967FF' }]} />
          <Text style={s.accordionTitle}>VOYAGE CHRONICLE</Text>
        </View>
        <Text style={[s.accordionSub, { color: '#B967FF' }]}>{(progress.voyageChronicles || []).length} entries</Text>
      </Pressable>
      {showChronicles && (() => {
        const chronicles = (progress.voyageChronicles || []).slice(-3).reverse();
        const currentMonthKey = today.slice(0, 7);
        const hasCurrentMonth = chronicles.some(c => c.monthKey === currentMonthKey);
        return (
          <HeroCard accent="#B967FF" style={{ marginBottom: 10, gap: 12 }}>
            {!hasCurrentMonth && (
              <Pressable
                style={[s.saveBtn, { backgroundColor: '#B967FF' }]}
                onPress={() => {
                  const chronicle = generateVoyageChronicle(progress, currentMonthKey);
                  const existing = (progress.voyageChronicles || []).filter(c => c.monthKey !== currentMonthKey);
                  handleUpdate({ ...progress, voyageChronicles: [...existing, chronicle].slice(-36) });
                }}
              >
                <Text style={[s.saveBtnTxt, { color: '#0A0A0A' }]}>GENERATE 月次生成</Text>
              </Pressable>
            )}
            {chronicles.length === 0 && <Text style={s.inputLbl}>No chronicles yet.</Text>}
            {chronicles.map(c => (
              <View key={c.monthKey} style={s.chronicleEntry}>
                <View style={s.chronicleHeader}>
                  <Text style={s.chronicleMonth}>{c.monthKey}</Text>
                  <Text style={[s.chronicleKanji, { color: '#B967FF' }]}>航</Text>
                </View>
                <Text style={s.chronicleNarrative}>{c.narrative}</Text>
                <Text style={s.chronicleStats}>
                  {c.stats.activeDays} active days · {(c.stats.totalXP || 0).toLocaleString()} XP · {c.stats.dominant?.toUpperCase()} dominant
                </Text>
              </View>
            ))}
          </HeroCard>
        );
      })()}

      <Pressable style={s.accordionHeader} onPress={() => setShowPhysique(v => !v)}>
        <View style={s.accordionLeft}>
          <View style={[s.accordionAccent, { backgroundColor: '#E52030' }]} />
          <Text style={s.accordionTitle}>WARRIOR PHYSIQUE</Text>
        </View>
        <Text style={[s.accordionSub, { color: '#E52030' }]}>body comp</Text>
      </Pressable>
      {showPhysique && (
        <HeroCard accent="#E52030" style={{ marginBottom: TAB_BAR_H }}>
          {[
            { label: 'BODY FAT %', val: bodyFat, set: setBodyFat },
            { label: 'MUSCLE MASS %', val: muscleMass, set: setMuscleMass },
            { label: 'CHEST (cm)', val: chest, set: setChest },
            { label: 'WAIST (cm)', val: waist, set: setWaist },
            { label: 'HIPS (cm)', val: hips, set: setHips },
            { label: 'ARMS (cm)', val: arms, set: setArms },
            { label: 'THIGHS (cm)', val: thighs, set: setThighs },
          ].map((field, i) => (
            <View key={field.label}>
              <View style={s.inputRow}>
                <Text style={s.inputLbl}>{field.label}</Text>
                <TextInput
                  style={[s.numInput, { borderColor: '#E5203055', width: 80, color: TXT1 }]}
                  value={field.val}
                  onChangeText={field.set}
                  keyboardType="numeric"
                  placeholderTextColor={TXT3}
                  placeholder="—"
                />
              </View>
              {i < 6 && <View style={s.divider} />}
            </View>
          ))}
          <Pressable style={[s.saveBtn, { backgroundColor: '#E52030', marginTop: 14 }]} onPress={() => {
            handleUpdate({
              ...progress,
              bodyComposition: {
                bodyFatPct: parseFloat(bodyFat) || null,
                muscleMassPct: parseFloat(muscleMass) || null,
                chest: parseFloat(chest) || null,
                waist: parseFloat(waist) || null,
                hips: parseFloat(hips) || null,
                arms: parseFloat(arms) || null,
                thighs: parseFloat(thighs) || null,
                unit: 'cm',
              },
            });
            flash(setSavedPhysique);
          }}>
            <Text style={s.saveBtnTxt}>{savedPhysique ? '✓ 保存完了' : 'SAVE PHYSIQUE'}</Text>
          </Pressable>
        </HeroCard>
      )}
      <Pressable style={s.accordionHeader} onPress={() => { setShowVitals(v => !v); playClick(); }}>
        <View style={s.accordionLeft}>
          <View style={[s.accordionAccent, { backgroundColor: '#22d3ee' }]} />
          <Text style={s.accordionTitle}>VITALS</Text>
        </View>
        <Text style={[s.accordionSub, { color: '#22d3ee' }]}>HR / HRV / VO2</Text>
      </Pressable>
      {showVitals && (
        <HeroCard accent="#22d3ee" style={{ marginBottom: TAB_BAR_H }}>
          <View style={s.vitalsRow}>
            {[
              { label: 'RESTING HR (bpm)', val: restingHR, set: setRestingHR, unit: 'bpm' },
              { label: 'HRV (ms)', val: hrv, set: setHrv, unit: 'ms' },
              { label: 'VO2 MAX', val: vo2Max, set: setVo2Max, unit: 'ml/kg/min' },
            ].map(field => (
              <View key={field.label} style={s.vitalsField}>
                <Text style={s.vitalsLabel}>{field.label}</Text>
                <View style={[s.numInputWrap, { borderColor: '#22d3ee44' }]}>
                  <TextInput
                    style={[s.numInput, { color: TXT1, width: 100 }]}
                    value={field.val}
                    onChangeText={field.set}
                    keyboardType="numeric"
                    placeholderTextColor={TXT3}
                    placeholder="—"
                  />
                  <Text style={s.vitalsUnit}>{field.unit}</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable style={[s.saveBtn, { backgroundColor: '#22d3ee', marginTop: 14 }]} onPress={() => {
            handleUpdate({
              ...progress,
              vitalsLog: {
                ...progress.vitalsLog,
                [today]: {
                  restingHR: parseFloat(restingHR) || null,
                  hrv: parseFloat(hrv) || null,
                  vo2Max: parseFloat(vo2Max) || null,
                },
              },
            });
            flash(setSavedVitals);
          }}>
            <Text style={s.saveBtnTxt}>{savedVitals ? '✓ 保存完了' : 'SAVE VITALS'}</Text>
          </Pressable>
        </HeroCard>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  heroCard: { backgroundColor: SURF, borderWidth: StyleSheet.hairlineWidth, borderRadius: DS.radius.lg, padding: DS.space.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  screenTitle: { ...DS.type.screenTitle, color: TXT1 },
  screenSub: { ...DS.type.caption, color: TXT3, marginTop: 5, letterSpacing: 0.5 },
  kanjiBadge: { width: 38, height: 38, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  kanjiBadgeText: { fontSize: 20, fontWeight: '900' },
  allTimeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  allTimeCard: { flex: 1, alignItems: 'center', paddingVertical: 18, marginBottom: 0 },
  allTimeKanjiBox: { width: 30, height: 30, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  allTimeKanji: { fontSize: 15, fontWeight: '900' },
  allTimeNum: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  allTimeLabel: { ...DS.type.micro, color: TXT3, marginTop: 6, letterSpacing: 1.2 },
  recoveryCard: { marginBottom: 10 },
  recoveryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  recoveryHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recoveryScore: { fontSize: 52, fontWeight: '900', letterSpacing: -2 },
  recoveryBadge: { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  recoveryBadgeText: { fontSize: 16, fontWeight: '900' },
  recoveryLabel: { ...DS.type.label, color: TXT2, marginTop: 5 },
  statusPill: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  statusPillTxt: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  recoveryBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  recoveryBarFill: { height: 6, borderRadius: 3 },
  inputCard: { marginBottom: 10 },
  inputLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  inputLbl: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: TXT2 },
  inputUnit: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  numInput: { borderWidth: 1.5, width: 90, textAlign: 'center', paddingVertical: 10, borderRadius: 12, fontSize: 18, fontWeight: '800', backgroundColor: 'rgba(0,0,0,0.2)' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORD },
  saveBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 100, alignItems: 'center' },
  saveBtnTxt: { fontSize: 13, fontWeight: '900', letterSpacing: 2, color: TXT1 },
  starRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  star: { fontSize: 30 },
  sleepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sleepKanjiBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#D4A85315', alignItems: 'center', justifyContent: 'center' },
  sleepKanjiText: { fontSize: 18, fontWeight: '900', color: '#D4A853' },
  moodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  moodPipTouch: { flex: 1 },
  moodPip: { width: '100%', height: 14, borderRadius: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  accordionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accordionAccent: { width: 2.5, height: 15, borderRadius: 1.5 },
  accordionTitle: { ...DS.type.label, color: TXT1, letterSpacing: 1.5 },
  accordionSub: { ...DS.type.caption, fontWeight: '700', letterSpacing: 0.5 },
  vitalsRow: { gap: 14 },
  vitalsField: { marginBottom: 14 },
  vitalsLabel: { ...DS.type.micro, color: TXT2, marginBottom: 7 },
  vitalsUnit: { fontSize: 12, color: TXT3, fontWeight: '600' },
  numInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.3)' },
  archetypeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  archetypeIcon: { fontSize: 44 },
  archetypeName: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  archetypeDesc: { fontSize: 13, color: TXT2, lineHeight: 21, marginTop: 5 },
  cupsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 14, marginBottom: 10 },
  cupIcon: { fontSize: 26, fontWeight: '900' },
  cupsBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginTop: 10 },
  cupsBarFill: { height: 5, borderRadius: 3 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  macroItem: { alignItems: 'center', gap: 4 },
  macroVal: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  macroLabel: { ...DS.type.micro, color: TXT3, letterSpacing: 1.2, marginTop: 3 },
  mealsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  mealPill: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', gap: 5 },
  mealKanji: { fontSize: 20, fontWeight: '900', color: TXT1 },
  mealName: { ...DS.type.micro, color: TXT2, letterSpacing: 0.5, maxWidth: 64 },
  loggedMealRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loggedMealName: { flex: 1, fontSize: 14, color: TXT1, fontWeight: '600' },
  loggedMealKcal: { fontSize: 14, fontWeight: '700' },
  chronicleEntry: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.10)', paddingTop: 14 },
  chronicleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chronicleMonth: { ...DS.type.label, color: TXT2, letterSpacing: 2 },
  chronicleKanji: { fontSize: 24, fontWeight: '900' },
  chronicleNarrative: { fontSize: 14, color: TXT2, fontFamily: DS.font.display, lineHeight: 23, fontStyle: 'italic', marginBottom: 10 },
  chronicleStats: { ...DS.type.caption, color: TXT3, fontWeight: '600' },
});