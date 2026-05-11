import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import ShimmerXPBar from '../components/shared/ShimmerXPBar';
import SectionLabel from '../components/shared/SectionLabel';
import { TXT1, TXT3, BORD, SB_H, TAB_BAR_H } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import { rankIndexFor, weeklyVolume, getActiveBountyMissions, disciplineXPFor } from '../logic/progression';
import { resolveTier, getBossChallenge } from '../logic/bossTiers';
import { SWORDS, RANKS, RARITY, REWARDS, TITLE_PATHS, BOSS_CHALLENGES, BOUNTY_MISSIONS, SKILL_TREES } from '../data/gameData';
import { playClick } from '../services/audioService';

const SWORD_ORDER = ['wado', 'sandai', 'shusui'];

function HeroCard({ accent, children, style }) {
  return (
    <View style={[s.heroCard, { borderColor: accent + '30' }, style]}>
      <View style={[s.heroGlow, { backgroundColor: accent }]} />
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
          <Text style={[s.kanjiBadgeText, { color: rank.color }]}>{rank.kanji || '⚔'}</Text>
        </View>
      </View>

      <HeroCard accent={rank.color} style={s.rankCard}>
        <View style={s.rankHeader}>
          <View>
            <View style={[s.rankBadgeBox, { borderColor: rank.color + '40', backgroundColor: rank.color + '10' }]}>
              <Text style={[s.rankBadgeText, { color: rank.color }]}>{rank.kanji || '⚔'}</Text>
            </View>
            <Text style={[s.rankName, { color: rank.color }]}>{rank.name}</Text>
          </View>
          <Text style={[s.rankXP, { color: rank.color }]}>{progress.totalXP.toLocaleString()}</Text>
        </View>
        <Text style={s.rankXPLabel}>TOTAL XP · 経験値</Text>
        <View style={s.xpBarWrap}>
          <ShimmerXPBar pct={xpPct} color={rank.color} height={10} />
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
            <View style={[s.disciplineAccent, { backgroundColor: sw.accent }]} />
            <View style={[s.disciplineKanjiBox, { backgroundColor: sw.accent + '12' }]}>
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
                              {isUnlocked && <Text style={[s.treeNodeCheck, { color: sw.accent }]}>✓</Text>}
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
        {bossTier.timeLimit && <Text style={[s.tierBadgeSub, { color: '#DC143C80' }]}>⏱ {bossTier.timeLimit}s limit</Text>}
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
                  <Text style={s.bossPillTxt}>⏱ {scaled.timeLimit}s</Text>
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
  heroCard: { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderRadius: DS.radius.xl, padding: DS.space.lg, position: 'relative', overflow: 'hidden' },
  heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, opacity: 0.4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  screenTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 5, color: TXT3 },
  kanjiBadge: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kanjiBadgeText: { fontSize: 20, fontWeight: '900' },
  rankCard: { marginBottom: 10 },
  rankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  rankBadgeBox: { width: 48, height: 48, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  rankBadgeText: { fontSize: 24, fontWeight: '900' },
  rankName: { fontSize: 10, fontWeight: '800', letterSpacing: 3 },
  rankXP: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  rankXPLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 2.5, color: TXT3, marginBottom: 12 },
  xpBarWrap: { marginBottom: 10 },
  rankXpSub: { fontSize: 10, color: TXT3, letterSpacing: 0.5 },
  disciplineCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, paddingVertical: 16, paddingLeft: 0, paddingRight: 16 },
  disciplineAccent: { width: 4, height: 40, borderRadius: 2 },
  disciplineKanjiBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  disciplineKanji: { fontSize: 24, fontWeight: '900' },
  disciplineName: { fontSize: 14, fontWeight: '700' },
  disciplineVol: { fontSize: 11, color: TXT3, marginTop: 3 },
  volPip: { width: 6, height: 40, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' },
  volPipFill: { width: 6, borderRadius: 3 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1.5, borderRadius: 14, marginBottom: 8, position: 'relative', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.3)' },
  rewardGlow: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  rewardKanjiBox: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rewardKanji: { fontSize: 22, fontWeight: '900' },
  rewardName: { fontSize: 14, fontWeight: '700' },
  rewardReq: { fontSize: 10, letterSpacing: 1, marginTop: 3 },
  rewardCheck: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: TXT3, fontStyle: 'italic', marginBottom: 10 },
  titleCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8, paddingVertical: 14 },
  titleKanjiBox: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleKanji: { fontSize: 28, fontWeight: '900' },
  titleName: { fontSize: 14, fontWeight: '700', color: TXT1 },
  titleDesc: { fontSize: 11, color: TXT3, marginTop: 3 },
  bountyCard: { flexDirection: 'row', gap: 14, marginBottom: 8, alignItems: 'flex-start', paddingLeft: 14 },
  bountyKanjiBox: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bountyKanji: { fontSize: 28, fontWeight: '900' },
  bountyName: { fontSize: 14, fontWeight: '800' },
  bountyTier: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  bountyTierTxt: { fontSize: 7, fontWeight: '800', letterSpacing: 1.5 },
  bountyDesc: { fontSize: 11, color: TXT3, marginTop: 3, lineHeight: 18 },
  tierBadge: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 10 },
  tierBadgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  tierBadgeSub: { fontSize: 10, fontWeight: '700' },
  bossCard: { flexDirection: 'row', gap: 14, marginBottom: 8, alignItems: 'flex-start', paddingLeft: 14 },
  bossKanjiBox: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bossKanji: { fontSize: 36, fontWeight: '900', color: '#DC143C' },
  bossName: { fontSize: 15, fontWeight: '800', color: TXT1 },
  bossDesc: { fontSize: 11, color: TXT3, marginTop: 5, lineHeight: 18 },
  bossExList: { marginTop: 8, gap: 2 },
  bossExLine: { fontSize: 10, color: TXT3, letterSpacing: 0.3 },
  bossFailNote: { fontSize: 9, color: '#FF9966', marginTop: 6, letterSpacing: 0.3 },
  bossPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  bossPillTxt: { fontSize: 10, fontWeight: '700', color: '#DC143C' },
  treeContainer: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  treeColumn: { flex: 1, gap: 8 },
  treeDiscHeader: { alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 10, marginBottom: 4, backgroundColor: 'rgba(0,0,0,0.3)' },
  treeDiscKanji: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  treeDiscName: { fontSize: 7, fontWeight: '800', letterSpacing: 2 },
  treeDiscXP: { fontSize: 8, color: TXT3, marginTop: 4 },
  treeBranch: { gap: 4 },
  treeBranchHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.2)' },
  treeBranchIcon: { fontSize: 12, fontWeight: '700' },
  treeBranchName: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  treeNodes: { gap: 2, paddingLeft: 16 },
  treeNodeWrap: { gap: 2 },
  treeNodeLine: { width: 2, height: 8, borderRadius: 1, marginLeft: 12 },
  treeNode: { borderWidth: 1.5, borderRadius: 10, padding: 8, position: 'relative' },
  treeNodeXP: { fontSize: 8, fontWeight: '800', letterSpacing: 1, marginBottom: 3 },
  treeNodeName: { fontSize: 10, fontWeight: '700', lineHeight: 14 },
  treeNodeOverride: { fontSize: 8, color: TXT3, marginTop: 2 },
  treeNodeCheck: { position: 'absolute', top: 6, right: 6, fontSize: 10, fontWeight: '900' },
});