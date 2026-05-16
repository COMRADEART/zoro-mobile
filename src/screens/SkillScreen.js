import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import XPBar from '../components/shared/XPBar';
import SectionLabel from '../components/shared/SectionLabel';
import { Icon } from '../components/shared/TabIcons';
import { SURF, TXT1, TXT2, TXT3, BORD, SB_H, TAB_BAR_H } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import { rankIndexFor, weeklyVolume, getActiveBountyMissions, disciplineXPFor } from '../logic/progression';
import { resolveTier, getBossChallenge } from '../logic/bossTiers';
import { SWORDS, RANKS, RARITY, REWARDS, TITLE_PATHS, BOSS_CHALLENGES, BOUNTY_MISSIONS, SKILL_TREES } from '../data/gameData';
import { playClick } from '../services/audioService';

const SWORD_ORDER = ['wado', 'sandai', 'shusui'];

function HeroCard({ accent, children, style }) {
  return (
    <View style={[s.heroCard, { borderColor: accent + '38' }, style]}>
      {children}
    </View>
  );
}

export default function SkillScreen() {
  const { progress, today } = useProgress();

  const rankIdx = rankIndexFor(progress.totalXP);
  const rank = RANKS[rankIdx];
  const xpInto = progress.totalXP - rank.min;
  const xpFor = (RANKS[rankIdx + 1]?.min ?? rank.max) - rank.min;
  const xpPct = Math.min(1, xpInto / (Number.isFinite(xpFor) ? xpFor : 1));

  const activeBounties = getActiveBountyMissions(progress, today);
  const bountyDefs = activeBounties.map(ab => BOUNTY_MISSIONS.find(b => b.id === ab.id)).filter(Boolean);

  const bossTier = useMemo(() => resolveTier(progress.totalXP), [progress.totalXP]);
  const bossCards = useMemo(() => BOSS_CHALLENGES.map(boss => {
    const history = progress.bossAttemptHistory?.[boss.id] ?? [];
    const lastFailed = history.length > 0 && !history[history.length - 1].success;
    const scaled = getBossChallenge(boss, { totalXP: progress.totalXP, lastFailed });
    let failStreak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (!history[i].success) failStreak++; else break;
    }
    const techReward = REWARDS.find(r => r.id === boss.techniqueReward);
    return { boss, scaled, lastFailed, failStreak, techReward };
  }), [progress.totalXP, progress.bossAttemptHistory]);

  return (
    <ScrollView contentContainerStyle={[s.scroll, { paddingTop: SB_H + 16 }]} showsVerticalScrollIndicator={false}>
      <View style={s.headerRow}>
        <Text style={s.screenTitle}>SKILL</Text>
        <View style={[s.kanjiBadge, { backgroundColor: rank.color + '15', borderColor: rank.color + '30' }]}>
          <Text style={[s.kanjiBadgeText, { color: rank.color }]}>{rank.kanji || '刀'}</Text>
        </View>
      </View>

      <HeroCard accent={rank.color} style={s.rankCard}>
        <View style={s.rankHeader}>
          <View>
            <View style={[s.rankBadgeBox, { borderColor: rank.color + '40', backgroundColor: rank.color + '10' }]}>
              <Text style={[s.rankBadgeText, { color: rank.color }]}>{rank.kanji || '刀'}</Text>
            </View>
            <Text style={[s.rankName, { color: rank.color }]}>{rank.name}</Text>
          </View>
          <Text style={[s.rankXP, { color: rank.color }]}>{progress.totalXP.toLocaleString()}</Text>
        </View>
        <Text style={s.rankXPLabel}>TOTAL XP · 経験値</Text>
        <View style={s.xpBarWrap}>
          <XPBar pct={xpPct} color={rank.color} height={10} />
        </View>
        <Text style={s.rankXpSub}>
          {RANKS[rankIdx + 1] ? `${(RANKS[rankIdx + 1].min - progress.totalXP).toLocaleString()} XP to ${RANKS[rankIdx + 1].name}` : 'Maximum achieved · 最高'}
        </Text>
      </HeroCard>

      <SectionLabel label="DISCIPLINES · 流派" style={{ marginTop: 20, marginBottom: 10 }} />
      {SWORD_ORDER.map(key => {
        const sw = SWORDS[key];
        const vol = weeklyVolume(progress, key, today);
        return (
          <HeroCard key={key} accent={sw.accent} style={s.disciplineCard}>
            <View style={[s.disciplineKanjiBox, { backgroundColor: sw.accent + '18' }]}>
              <Text style={[s.disciplineKanji, { color: sw.accent }]}>{sw.kanji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.disciplineName, { color: sw.accent }]}>{sw.name}</Text>
              <Text style={s.disciplineVol}>{vol} sessions this week · 今週</Text>
            </View>
            <View style={s.volPip}>
              <View style={[s.volPipFill, { height: `${Math.min(100, vol * 10)}%`, backgroundColor: sw.accent }]} />
            </View>
          </HeroCard>
        );
      })}

      <SectionLabel label="SKILL TREE · 技能" style={{ marginTop: 20, marginBottom: 10 }} />
      <View style={s.treeContainer}>
        {SWORD_ORDER.map(discipline => {
          const discXP = disciplineXPFor(progress, discipline);
          const tree = SKILL_TREES[discipline];
          const sw = SWORDS[discipline];
          return (
            <View key={discipline} style={s.treeColumn}>
              <View style={[s.treeDiscHeader, { borderColor: sw.accent + '40' }]}>
                <Text style={[s.treeDiscKanji, { color: sw.accent }]}>{sw.kanji}</Text>
                <Text style={[s.treeDiscName, { color: sw.accent }]}>{sw.name.split(' ')[0].toUpperCase()}</Text>
                <Text style={s.treeDiscXP}>{discXP} XP invested</Text>
              </View>
              {Object.entries(tree.branches).map(([branchKey, branch]) => {
                const branchUnlocks = progress.skillUnlocks?.[discipline]?.[branchKey] || [];
                return (
                  <View key={branchKey} style={s.treeBranch}>
                    <View style={[s.treeBranchHeader, { borderColor: sw.accent + '25' }]}>
                      <Text style={[s.treeBranchIcon, { color: sw.accent }]}>{branch.icon}</Text>
                      <Text style={[s.treeBranchName, { color: sw.accent }]}>{branch.name}</Text>
                    </View>
                    <View style={s.treeNodes}>
                      {branch.unlocks.map((unlock, idx) => {
                        const isUnlocked = branchUnlocks.includes(unlock.id);
                        const canUnlock = discXP >= unlock.xp;
                        return (
                          <View key={unlock.id} style={s.treeNodeWrap}>
                            {idx > 0 && <View style={[s.treeNodeLine, { backgroundColor: isUnlocked ? sw.accent : BORD + '40' }]} />}
                            <Pressable
                              style={[s.treeNode, {
                                borderColor: isUnlocked ? sw.accent + '60' : canUnlock ? sw.accent + '30' : BORD,
                                backgroundColor: isUnlocked ? sw.accent + '15' : 'rgba(0,0,0,0.4)',
                              }]}
                              onPress={() => { playClick(); }}
                            >
                              <Text style={[s.treeNodeXP, { color: canUnlock || isUnlocked ? sw.accent : TXT3 }]}>
                                {unlock.xp.toLocaleString()} XP
                              </Text>
                              <Text style={[s.treeNodeName, { color: isUnlocked ? TXT1 : TXT3 }]} numberOfLines={2}>
                                {unlock.name}
                              </Text>
                              {unlock.exerciseOverride && (
                                <Text style={s.treeNodeOverride}>
                                  → {unlock.exerciseOverride.base} {unlock.exerciseOverride.id.split('-').pop()}
                                </Text>
                              )}
                              {isUnlocked && (
                                <View style={s.treeNodeCheck}>
                                  <Icon name="check" size={11} color={sw.accent} />
                                </View>
                              )}
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      <SectionLabel label="TITLES EARNED · 称号" style={{ marginTop: 20, marginBottom: 10 }} />
      {progress.earnedTitles.length === 0 && (
        <Text style={s.emptyText}>Complete weekly goals to earn titles.</Text>
      )}
      {progress.earnedTitles.map(ti => {
        const path = TITLE_PATHS[ti.path];
        const tier = path?.tiers.find(tier => tier.weeks === ti.weeks);
        if (!tier) return null;
        const rarity = RARITY[tier.rarity];
        return (
          <HeroCard key={`${ti.path}-${ti.weeks}`} accent={rarity.color} style={s.titleCard}>
            <View style={[s.titleKanjiBox, { backgroundColor: rarity.color + '12' }]}>
              <Text style={[s.titleKanji, { color: rarity.color }]}>{tier.kanji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.titleName, { color: TXT1 }]}>{tier.name}</Text>
              <Text style={s.titleDesc}>{tier.desc}</Text>
            </View>
          </HeroCard>
        );
      })}

      <SectionLabel label="BOUNTY BOARD · 賞金首" style={{ marginTop: 20, marginBottom: 10 }} />
      {bountyDefs.length === 0 && (
        <Text style={s.emptyText}>All bounties claimed. New missions incoming.</Text>
      )}
      {bountyDefs.map(b => {
        const TIER_COLORS = { common: '#6a9fff', rare: '#A855F7', epic: '#fbbf24' };
        const tierColor = TIER_COLORS[b.tier] || '#6a9fff';
        return (
          <HeroCard key={b.id} accent={b.color} style={s.bountyCard}>
            <View style={[s.bountyKanjiBox, { backgroundColor: b.color + '12' }]}>
              <Text style={[s.bountyKanji, { color: b.color }]}>{b.kanji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Text style={[s.bountyName, { color: TXT1 }]}>{b.name}</Text>
                <View style={[s.bountyTier, { borderColor: tierColor + '50' }]}>
                  <Text style={[s.bountyTierTxt, { color: tierColor }]}>{b.tier.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={s.bountyDesc}>{b.desc}</Text>
              <View style={s.bossPill}>
                <Text style={[s.bossPillTxt, { color: b.color }]}>+{b.xpReward.toLocaleString()} XP</Text>
              </View>
            </View>
          </HeroCard>
        );
      })}

      <SectionLabel label="WEEKLY CHALLENGES · 挑戦" style={{ marginTop: 20, marginBottom: 10 }} />
      <View style={[s.tierBadge, { borderColor: '#DC143C40', backgroundColor: '#DC143C10' }]}>
        <Text style={[s.tierBadgeTxt, { color: '#DC143C' }]}>TIER · {bossTier.name}</Text>
        {bossTier.timeLimit && <Text style={[s.tierBadgeSub, { color: '#DC143C' }]}>{bossTier.timeLimit}s LIMIT</Text>}
      </View>
      {bossCards.map(({ boss, scaled, lastFailed, failStreak, techReward }) => (
        <HeroCard key={boss.id} accent="#DC143C" style={s.bossCard}>
          <View style={[s.bossKanjiBox, { backgroundColor: '#DC143C12' }]}>
            <Text style={s.bossKanji}>{boss.kanji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bossName}>{boss.name}</Text>
            <Text style={s.bossDesc}>{boss.desc}</Text>
            <View style={s.bossExList}>
              {scaled.exercises.map((ex, i) => (
                <Text key={i} style={s.bossExLine}>
                  {ex.name}{ex.reps != null ? ` ×${ex.reps}` : ex.km != null ? ` ${ex.km}km` : ex.min != null ? ` ${ex.min}min` : ''}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <View style={[s.bossPill, { borderColor: '#DC143C50' }]}>
                <Text style={[s.bossPillTxt, { color: '#DC143C' }]}>+{scaled.xpReward.toLocaleString()} XP</Text>
              </View>
              {scaled.timeLimit && (
                <View style={[s.bossPill, { borderColor: '#DC143C30' }]}>
                  <Text style={s.bossPillTxt}>{scaled.timeLimit}s limit</Text>
                </View>
              )}
              {techReward && (
                <View style={[s.bossPill, { borderColor: '#DC143C30' }]}>
                  <Text style={s.bossPillTxt}>{techReward.kanji} Technique</Text>
                </View>
              )}
              {failStreak > 0 && (
                <View style={[s.bossPill, { borderColor: '#FF444450', backgroundColor: '#FF444408' }]}>
                  <Text style={[s.bossPillTxt, { color: '#FF6666' }]}>{failStreak} defeat{failStreak > 1 ? 's' : ''}</Text>
                </View>
              )}
            </View>
            {lastFailed && (
              <Text style={s.bossFailNote}>↘ Requirements reduced 10% for this attempt</Text>
            )}
          </View>
        </HeroCard>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: TAB_BAR_H + 20 },
  heroCard: { backgroundColor: SURF, borderWidth: StyleSheet.hairlineWidth, borderRadius: DS.radius.lg, padding: DS.space.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  screenTitle: { ...DS.type.screenTitle, color: TXT1 },
  kanjiBadge: { width: 38, height: 38, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  kanjiBadgeText: { fontSize: 20, fontWeight: '900' },
  rankCard: { marginBottom: 10 },
  rankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  rankBadgeBox: { width: 50, height: 50, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  rankBadgeText: { fontSize: 24, fontWeight: '900' },
  rankName: { ...DS.type.screenTitle, fontSize: 13, letterSpacing: 2 },
  rankXP: { ...DS.type.displayLg, fontSize: 36 },
  rankXPLabel: { ...DS.type.label, color: TXT2, marginBottom: 12 },
  xpBarWrap: { marginBottom: 10 },
  rankXpSub: { ...DS.type.caption, color: TXT3 },
  disciplineCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8, paddingVertical: 16 },
  disciplineKanjiBox: { width: 50, height: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  disciplineKanji: { fontSize: 25, fontWeight: '900' },
  disciplineName: { ...DS.type.cardTitle, fontSize: 16 },
  disciplineVol: { ...DS.type.caption, color: TXT2, marginTop: 4 },
  volPip: { width: 6, height: 42, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' },
  volPipFill: { width: 6, borderRadius: 3 },
  emptyText: { ...DS.type.body, color: TXT3, fontStyle: 'italic', marginBottom: 10 },
  titleCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8, paddingVertical: 16 },
  titleKanjiBox: { width: 54, height: 54, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  titleKanji: { fontSize: 28, fontWeight: '900' },
  titleName: { ...DS.type.cardTitle, fontSize: 16, color: TXT1 },
  titleDesc: { ...DS.type.caption, color: TXT2, marginTop: 4 },
  bountyCard: { flexDirection: 'row', gap: 14, marginBottom: 8, alignItems: 'flex-start' },
  bountyKanjiBox: { width: 52, height: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bountyKanji: { fontSize: 28, fontWeight: '900' },
  bountyName: { ...DS.type.cardTitle, fontSize: 16 },
  bountyTier: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  bountyTierTxt: { ...DS.type.micro, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  bountyDesc: { ...DS.type.caption, color: TXT2, marginTop: 4, lineHeight: 18 },
  tierBadge: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  tierBadgeTxt: { ...DS.type.label, fontWeight: '800', letterSpacing: 1.5 },
  tierBadgeSub: { ...DS.type.micro, fontWeight: '700' },
  bossCard: { flexDirection: 'row', gap: 14, marginBottom: 8, alignItems: 'flex-start' },
  bossKanjiBox: { width: 58, height: 58, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bossKanji: { fontSize: 36, fontWeight: '900', color: '#DC143C' },
  bossName: { ...DS.type.cardTitle, fontSize: 16, color: TXT1 },
  bossDesc: { ...DS.type.caption, color: TXT2, marginTop: 5, lineHeight: 18 },
  bossExList: { marginTop: 10, gap: 3 },
  bossExLine: { ...DS.type.caption, color: TXT2, letterSpacing: 0.2 },
  bossFailNote: { ...DS.type.micro, color: '#FF9966', marginTop: 8, letterSpacing: 0.2 },
  bossPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: StyleSheet.hairlineWidth },
  bossPillTxt: { ...DS.type.micro, fontWeight: '700', color: '#DC143C' },
  treeContainer: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  treeColumn: { flex: 1, gap: 8 },
  treeDiscHeader: { alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingVertical: 12, marginBottom: 4, backgroundColor: SURF },
  treeDiscKanji: { fontSize: 22, fontWeight: '900', marginBottom: 3 },
  treeDiscName: { ...DS.type.micro, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  treeDiscXP: { ...DS.type.micro, color: TXT3, marginTop: 5 },
  treeBranch: { gap: 4 },
  treeBranchHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 7, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
  treeBranchIcon: { fontSize: 13, fontWeight: '700' },
  treeBranchName: { ...DS.type.micro, fontWeight: '800', letterSpacing: 0.5 },
  treeNodes: { gap: 3, paddingLeft: 14 },
  treeNodeWrap: { gap: 3 },
  treeNodeLine: { width: 2, height: 8, borderRadius: 1, marginLeft: 12 },
  treeNode: { borderWidth: 1.5, borderRadius: 10, padding: 9, position: 'relative' },
  treeNodeXP: { ...DS.type.micro, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  treeNodeName: { fontSize: 11, fontWeight: '700', lineHeight: 15 },
  treeNodeOverride: { ...DS.type.micro, color: TXT3, marginTop: 3 },
  treeNodeCheck: { position: 'absolute', top: 7, right: 7 },
});