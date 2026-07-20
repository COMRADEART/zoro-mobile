import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import GlassCard from '../components/shared/GlassCard';
import { Icon } from '../components/shared/TabIcons';
import { TRAINING_ARCS } from '../data/gameData';
import { THEMES, DEFAULT_THEME } from '../theme/themes';
import { TXT1, TXT2, TXT3, BORD, SB_H } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import { rankIndexFor } from '../logic/progression';

export default function TrainingArcsScreen({ onBack }) {
  const { progress, today, theme, handleUpdate, showToast } = useProgress();
  const [selected, setSelected] = useState(null);
  const t = THEMES[theme] || THEMES[DEFAULT_THEME];

  const currentRank = rankIndexFor(progress.totalXP);

  const startArc = (arc) => {
    if ((progress.arcProgress?.[arc.id]?.status) === 'active') return;
    handleUpdate(prev => ({
      ...prev,
      arcProgress: {
        ...prev.arcProgress,
        [arc.id]: { startedAt: today, completedWeeks: [], status: 'active' },
      },
    }));
    showToast({ title: 'ARC STARTED', body: `${arc.name} — ${arc.durationWeeks} weeks` });
  };

  if (selected) {
    const arcData = progress.arcProgress?.[selected.id];
    const completedWeeks = arcData?.completedWeeks || [];

    return (
      <ScrollView contentContainerStyle={[s.detailScroll, { paddingTop: SB_H + 16 }]} showsVerticalScrollIndicator={false}>
        <View style={s.detailHeader}>
          <Pressable
            style={s.backBtn}
            onPress={() => setSelected(null)}
            accessibilityRole="button"
            accessibilityLabel="Back to arcs list"
            hitSlop={8}
          >
            <Text style={s.backTxt}>← ARCS · 修行</Text>
          </Pressable>
        </View>

        <View style={[s.arcHero, { borderColor: selected.color + '30' }]}>
          <View style={[s.arcKanjiBox, { backgroundColor: selected.color + '15' }]}>
            <Text style={[s.arcKanji, { color: selected.color }]}>{selected.kanji}</Text>
          </View>
          <Text style={s.arcName}>{selected.name}</Text>
          <Text style={s.arcSubtitle}>{selected.subtitle}</Text>
          <Text style={[s.arcKanjiSub, { color: selected.color }]}>{selected.kanji} · {selected.durationWeeks} weeks · {selected.xpReward.toLocaleString()} XP</Text>
        </View>

        <View style={s.metaRow}>
          <View style={[s.metaPill, { backgroundColor: selected.color + '12' }]}>
            <Text style={[s.metaVal, { color: selected.color }]}>{selected.durationWeeks}wk</Text>
            <Text style={s.metaLbl}>DURATION · 期間</Text>
          </View>
          <View style={[s.metaPill, { backgroundColor: '#B967FF12' }]}>
            <Text style={[s.metaVal, { color: '#B967FF' }]}>{selected.xpReward.toLocaleString()}</Text>
            <Text style={s.metaLbl}>XP REWARD</Text>
          </View>
          <View style={[s.metaPill, { backgroundColor: selected.color + '12' }]}>
            <Text style={[s.metaVal, { color: selected.color }]}>{selected.techniqueReward}</Text>
            <Text style={s.metaLbl}>TECHNIQUE</Text>
          </View>
        </View>

        <Text style={s.sectionLbl}>WEEKLY OBJECTIVES · 週間目標</Text>
        {selected.weeks.map(week => {
          const done = completedWeeks.includes(week.week);
          return (
            <GlassCard key={week.week} accent={done ? selected.color : BORD} style={s.weekCard}>
              <View style={s.weekHeader}>
                <View style={[s.weekNum, { backgroundColor: done ? selected.color : 'rgba(255,255,255,0.08)', borderColor: done ? selected.color + '40' : 'transparent' }]}>
                  <Text style={[s.weekNumTxt, { color: done ? '#000' : TXT3 }]}>{week.week}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.weekTitle, { color: done ? selected.color : TXT1 }]}>{week.title}</Text>
                  <Text style={s.weekObjective}>{week.objective}</Text>
                </View>
                {done && <View style={[s.weekDoneBadge, { backgroundColor: selected.color + '20', borderColor: selected.color + '40' }]}>
                  <Icon name="check" size={14} color={selected.color} />
                </View>}
              </View>
            </GlassCard>
          );
        })}

        {!arcData && currentRank >= selected.requiredRank && (
          <Pressable
            style={[s.startBtn, { backgroundColor: selected.color }]}
            onPress={() => startArc(selected)}
            accessibilityRole="button"
            accessibilityLabel={`Start arc ${selected.name}`}
          >
            <Text style={s.startBtnTxt}>START ARC · 開始</Text>
          </Pressable>
        )}
        {!arcData && currentRank < selected.requiredRank && (
          <View style={[s.startBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: BORD }]}>
            <Text style={[s.startBtnTxt, { color: TXT3 }]}>RANK {selected.requiredRank}+ REQUIRED</Text>
          </View>
        )}
        {arcData?.status === 'active' && (
          <View style={[s.startBtn, { backgroundColor: selected.color + '15', borderWidth: 1.5, borderColor: selected.color + '40' }]}>
            <Text style={[s.startBtnTxt, { color: selected.color }]}>IN PROGRESS · {completedWeeks.length}/{selected.durationWeeks} WEEKS · 進行中</Text>
          </View>
        )}
        {arcData?.status === 'completed' && (
          <View style={[s.startBtn, { backgroundColor: selected.color + '20', borderWidth: 1.5, borderColor: selected.color + '50' }]}>
            <Text style={[s.startBtnTxt, { color: selected.color }]}>ARC COMPLETE · 完了</Text>
          </View>
        )}

        <Pressable
          style={s.backBtnBottom}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to train"
          hitSlop={8}
        >
          <Text style={s.backTxt}>← BACK TO TRAIN · 訓練に戻る</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[s.listScroll, { paddingTop: SB_H + 16 }]} showsVerticalScrollIndicator={false}>
      <View style={s.listHeader}>
        <View>
          <Text style={s.screenTitle}>TRAINING ARCS</Text>
          <Text style={s.screenSub}>修行 · Multi-week story missions</Text>
        </View>
        <View style={[s.kanjiBadge, { backgroundColor: t.accent + '15' }]}>
          <Text style={[s.kanjiBadgeText, { color: t.accent }]}>修</Text>
        </View>
      </View>

      {TRAINING_ARCS.map(arc => {
        const arcData = progress.arcProgress?.[arc.id];
        const locked = currentRank < arc.requiredRank;
        const completed = arcData?.status === 'completed';
        const active = arcData?.status === 'active';
        const completedWeeks = arcData?.completedWeeks?.length || 0;

        return (
          <Pressable
            key={arc.id}
            onPress={() => !locked && setSelected(arc)}
            accessibilityRole="button"
            accessibilityLabel={`${arc.name}. ${
              locked ? `Locked, rank ${arc.requiredRank} required`
                : completed ? 'Completed'
                : active ? `In progress, ${completedWeeks} of ${arc.durationWeeks} weeks`
                : 'Available'
            }`}
            accessibilityState={{ disabled: locked }}
          >
            <GlassCard accent={locked ? BORD : arc.color} style={[s.arcCard, locked && s.arcCardLocked]}>
              <View style={s.arcCardHeader}>
                <View style={[s.arcCardKanjiBox, { backgroundColor: (locked ? BORD : arc.color) + '15' }]}>
                  <Text style={[s.arcCardKanji, { color: locked ? TXT3 : arc.color }]}>{arc.kanji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.arcCardName, { color: locked ? TXT3 : TXT1 }]}>{arc.name}</Text>
                  <Text style={s.arcCardSub}>{arc.subtitle}</Text>
                  <View style={s.arcCardMeta}>
                    <Text style={[s.arcCardMetaText, { color: locked ? TXT3 : arc.color }]}>{arc.durationWeeks} weeks</Text>
                    <Text style={s.arcCardMetaDot}>·</Text>
                    <Text style={s.arcCardMetaText}>{arc.discipline}</Text>
                  </View>
                </View>
                <View style={s.arcCardStatus}>
                  {locked && <View style={[s.statusBadge, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                    <Text style={s.lockText}>封 RANK {arc.requiredRank}</Text>
                  </View>}
                  {completed && <View style={[s.statusBadge, { backgroundColor: arc.color + '15', borderWidth: 1, borderColor: arc.color + '30' }]}>
                    <Text style={[s.statusBadgeText, { color: arc.color }]}>DONE · 完了</Text>
                  </View>}
                  {active && <View style={[s.statusBadge, { backgroundColor: arc.color + '15', borderWidth: 1, borderColor: arc.color + '30' }]}>
                    <Text style={[s.statusBadgeText, { color: arc.color }]}>{completedWeeks}/{arc.durationWeeks}wk</Text>
                  </View>}
                  {!locked && !completed && !active && <View style={[s.statusBadge, { backgroundColor: arc.color + '15', borderWidth: 1, borderColor: arc.color + '30' }]}>
                    <Text style={[s.statusBadgeText, { color: arc.color }]}>AVAILABLE · 可用</Text>
                  </View>}
                </View>
              </View>
              {active && (
                <View style={s.arcProgressBar}>
                  <View style={[s.arcProgressFill, {
                    width: `${(completedWeeks / arc.durationWeeks) * 100}%`,
                    backgroundColor: arc.color,
                    shadowColor: arc.color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 4,
                  }]} />
                </View>
              )}
            </GlassCard>
          </Pressable>
        );
      })}

      <View style={s.arcsFooter}>
        <View style={[s.footerLine, { backgroundColor: t.accent + '20' }]} />
        <Text style={s.footerText}>etsu naru made — until mastery</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  listScroll: { paddingHorizontal: 16, paddingBottom: 48 },
  detailScroll: { paddingHorizontal: 16, paddingBottom: 48 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  detailHeader: { marginBottom: 16 },
  backBtn: { paddingVertical: 8, marginBottom: 8 },
  backBtnBottom: { paddingVertical: 20, marginTop: 16 },
  backTxt: { ...DS.type.label, color: TXT2, letterSpacing: 2 },
  screenTitle: { ...DS.type.displayMd, fontSize: 24, color: TXT1 },
  screenSub: { ...DS.type.caption, color: TXT3, marginTop: 5, letterSpacing: 0.5 },
  kanjiBadge: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  kanjiBadgeText: { fontSize: 22, fontWeight: '900' },

  arcCard: { marginBottom: 12, paddingVertical: 16 },
  arcCardLocked: { opacity: 0.5 },
  arcCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  arcCardKanjiBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  arcCardKanji: { fontSize: 28, fontWeight: '900' },
  arcCardName: { ...DS.type.cardTitle, fontSize: 16 },
  arcCardSub: { ...DS.type.caption, color: TXT2, marginTop: 4 },
  arcCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  arcCardMetaText: { ...DS.type.micro, fontWeight: '700', color: TXT3 },
  arcCardMetaDot: { fontSize: 11, color: TXT3 },
  arcCardStatus: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusBadgeText: { ...DS.type.micro, fontWeight: '800', letterSpacing: 0.5 },
  lockText: { ...DS.type.micro, fontWeight: '700', color: TXT3 },
  arcProgressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginTop: 14 },
  arcProgressFill: { height: 4, borderRadius: 2 },

  arcHero: { alignItems: 'center', borderWidth: 1.5, borderRadius: 20, padding: 24, marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.2)' },
  arcKanjiBox: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  arcKanji: { fontSize: 56, fontWeight: '900' },
  arcName: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, color: TXT1 },
  arcSubtitle: { ...DS.type.bodySm, color: TXT2, textAlign: 'center', marginTop: 6 },
  arcKanjiSub: { ...DS.type.label, letterSpacing: 1.5, marginTop: 12 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, gap: 10 },
  metaPill: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 14, borderRadius: 12 },
  metaVal: { fontSize: 18, fontWeight: '900' },
  metaLbl: { ...DS.type.micro, fontWeight: '700', letterSpacing: 1, color: TXT3, marginTop: 4 },

  sectionLbl: { ...DS.type.label, color: TXT2, marginBottom: 12 },

  weekCard: { marginBottom: 10, paddingVertical: 14 },
  weekHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  weekNum: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  weekNumTxt: { fontSize: 15, fontWeight: '900' },
  weekTitle: { ...DS.type.cardTitle, fontSize: 15 },
  weekObjective: { ...DS.type.caption, color: TXT2, marginTop: 4 },
  weekDoneBadge: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  startBtn: { paddingVertical: 16, borderRadius: 100, alignItems: 'center', marginTop: 20, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  startBtnTxt: { fontSize: 13, fontWeight: '900', letterSpacing: 2, color: '#000' },

  arcsFooter: { alignItems: 'center', marginTop: 24, marginBottom: 16 },
  footerLine: { width: 48, height: 1, marginBottom: 12 },
  footerText: { fontSize: 13, color: TXT2, fontFamily: DS.font.display, fontStyle: 'italic', letterSpacing: 0.5 },
});