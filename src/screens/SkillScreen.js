import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import { Panel, ProgressRail, ScreenHeader, SwordSelector } from '../components/premium/PremiumUI';
import { TXT1, TXT2, TXT3, SB_H, TAB_BAR_H } from '../theme/tokens';
import { DS } from '../theme/designSystem';
import { rankIndexFor, disciplineXPFor, getActiveBountyMissions } from '../logic/progression';
import { SWORDS, RANKS, SKILL_TREES, BOUNTY_MISSIONS, REWARDS } from '../data/gameData';
import { playClick } from '../services/audioService';

function flattenNodes(tree) {
  return Object.entries(tree.branches).flatMap(([branchKey, branch], branchIndex) =>
    branch.unlocks.map((unlock, unlockIndex) => ({
      ...unlock,
      branchKey,
      branchName: branch.name,
      branchIcon: branch.icon,
      branchIndex,
      unlockIndex,
    }))
  );
}

function SkillScreen() {
  const { progress, today } = useProgress();
  const [selected, setSelected] = useState(progress.activeSword || 'sandai');
  const sword = SWORDS[selected];
  const tree = SKILL_TREES[selected] ?? SKILL_TREES.sandai;
  const nodes = useMemo(() => flattenNodes(tree), [tree]);
  const discXP = disciplineXPFor(progress, selected);
  const rank = RANKS[rankIndexFor(progress.totalXP)];
  const nextNode = nodes.find(node => {
    const branchUnlocks = progress.skillUnlocks?.[selected]?.[node.branchKey] || [];
    return !branchUnlocks.includes(node.id);
  });
  const unlockedCount = nodes.filter(node =>
    (progress.skillUnlocks?.[selected]?.[node.branchKey] || []).includes(node.id)
  ).length;
  const completionPct = nodes.length ? unlockedCount / nodes.length : 0;
  const bounties = getActiveBountyMissions(progress, today)
    .map(item => BOUNTY_MISSIONS.find(b => b.id === item.id))
    .filter(Boolean)
    .slice(0, 2);
  const unlockedRewards = REWARDS.filter(r => progress.unlocked?.includes(r.id)).slice(-3);

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingTop: SB_H + 18 }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="Skill map"
        title="Blade growth"
        subtitle="One discipline at a time. Unlocks emerge as your training story deepens."
        accent={sword.accent}
        mark={sword.kanji?.slice(0, 1)}
      />

      <SwordSelector value={selected} onChange={(key) => { playClick(); setSelected(key); }} compact />

      <Panel accent={sword.accent} style={s.mapPanel}>
        <View style={s.mapHeader}>
          <View>
            <Text style={[s.mapTitle, { color: sword.accent }]}>{sword.name}</Text>
            <Text style={s.mapSub}>{discXP.toLocaleString()} XP invested · {sword.discipline.toLowerCase()}</Text>
          </View>
          <View style={s.completionBubble}>
            <Text style={[s.completionValue, { color: sword.accent }]}>{Math.round(completionPct * 100)}%</Text>
            <Text style={s.completionLabel}>mapped</Text>
          </View>
        </View>
        <ProgressRail pct={completionPct} accent={sword.accent} style={s.mapRail} />

        <View style={s.nodeMap}>
          <View style={[s.energySpine, { backgroundColor: sword.accent + '14' }]} />
          {nodes.map((node, index) => {
            const branchUnlocks = progress.skillUnlocks?.[selected]?.[node.branchKey] || [];
            const unlocked = branchUnlocks.includes(node.id);
            const available = discXP >= node.xp;
            const sideLeft = index % 2 === 0;
            return (
              <View key={node.id} style={[s.nodeRow, sideLeft ? s.nodeRowLeft : s.nodeRowRight]}>
                <View style={[s.connector, { backgroundColor: unlocked ? sword.accent : sword.accent + '20' }]} />
                <Pressable
                  onPress={() => playClick()}
                  accessibilityRole="button"
                  accessibilityLabel={`${node.name}, ${node.branchName}, ${node.xp.toLocaleString()} XP, ${unlocked ? 'unlocked' : available ? 'available' : 'locked'}`}
                  accessibilityState={{ disabled: !available && !unlocked }}
                  style={[
                    s.node,
                    {
                      borderColor: unlocked ? sword.accent + '80' : available ? sword.accent + '40' : 'rgba(255,255,255,0.08)',
                      backgroundColor: unlocked ? sword.accent + '17' : available ? sword.accent + '0D' : 'rgba(255,255,255,0.035)',
                      opacity: available || unlocked ? 1 : 0.52,
                    },
                  ]}
                >
                  <View style={s.nodeTop}>
                    <Text style={[s.nodeIcon, { color: sword.accent }]}>{node.branchIcon}</Text>
                    <Text style={[s.nodeXP, { color: available || unlocked ? sword.accent : TXT3 }]}>
                      {node.xp.toLocaleString()} XP
                    </Text>
                  </View>
                  <Text style={[s.nodeName, unlocked && { color: TXT1 }]} numberOfLines={2}>{node.name}</Text>
                  <Text style={s.nodeBranch}>{node.branchName}</Text>
                  {!available && !unlocked && <Text style={s.lockFog}>Locked fog</Text>}
                </Pressable>
              </View>
            );
          })}
        </View>
      </Panel>

      <Panel accent={sword.accent} dim>
        <Text style={s.sectionTitle}>Next unlock</Text>
        {nextNode ? (
          <View
            style={s.nextUnlockRow}
            accessible={true}
            accessibilityLabel={`Next unlock: ${nextNode.name}, ${Math.max(0, nextNode.xp - discXP).toLocaleString()} XP until available`}
          >
            <View style={[s.nextGlyph, { backgroundColor: sword.accent + '12' }]}>
              <Text style={[s.nextGlyphText, { color: sword.accent }]}>{nextNode.branchIcon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.nextName}>{nextNode.name}</Text>
              <Text style={s.nextDesc}>{Math.max(0, nextNode.xp - discXP).toLocaleString()} XP until available</Text>
            </View>
          </View>
        ) : (
          <Text style={s.emptyCopy}>This blade map is complete. Shift to another sword path.</Text>
        )}
      </Panel>

      <View style={s.supportGrid}>
        <Panel accent={rank.color} dim style={s.supportPanel}>
          <Text style={s.sectionTitle}>Rank aura</Text>
          <Text style={[s.supportValue, { color: rank.color }]}>{rank.name}</Text>
          <Text style={s.supportCopy}>{(progress.totalXP ?? 0).toLocaleString()} total XP</Text>
        </Panel>
        <Panel accent="#B967FF" dim style={s.supportPanel}>
          <Text style={s.sectionTitle}>Techniques</Text>
          <Text style={[s.supportValue, { color: '#B967FF' }]}>{progress.unlocked?.length || 0}</Text>
          <Text style={s.supportCopy}>earned unlocks</Text>
        </Panel>
      </View>

      {unlockedRewards.length > 0 && (
        <Panel accent="#B967FF" dim>
          <Text style={s.sectionTitle}>Recent techniques</Text>
          <View style={s.techRow}>
            {unlockedRewards.map(reward => (
              <View key={reward.id} style={s.techChip}>
                <Text style={s.techKanji}>{reward.kanji}</Text>
                <Text style={s.techName} numberOfLines={1}>{reward.name}</Text>
              </View>
            ))}
          </View>
        </Panel>
      )}

      {bounties.length > 0 && (
        <Panel accent="#F59E0B" dim>
          <Text style={s.sectionTitle}>Active trials</Text>
          {bounties.map(bounty => (
            <View
              key={bounty.id}
              style={s.bountyRow}
              accessible={true}
              accessibilityLabel={`${bounty.name}: ${bounty.desc}, reward ${bounty.xpReward} XP`}
            >
              <Text style={[s.bountyKanji, { color: bounty.color }]}>{bounty.kanji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.bountyName}>{bounty.name}</Text>
                <Text style={s.bountyDesc} numberOfLines={1}>{bounty.desc}</Text>
              </View>
              <Text style={[s.bountyXP, { color: bounty.color }]}>+{bounty.xpReward}</Text>
            </View>
          ))}
        </Panel>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: DS.space.md,
    paddingBottom: TAB_BAR_H + DS.space.xl,
    gap: DS.space.lg,
  },
  mapPanel: { paddingBottom: DS.space.xl },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: DS.space.md,
  },
  mapTitle: { fontSize: 26, fontWeight: '900', letterSpacing: 0 },
  mapSub: { color: TXT3, fontSize: 13, marginTop: 5 },
  completionBubble: {
    alignItems: 'flex-end',
  },
  completionValue: { fontSize: 26, fontWeight: '900' },
  completionLabel: { color: TXT3, fontSize: 11, fontWeight: '700' },
  mapRail: { marginTop: DS.space.md, marginBottom: DS.space.lg },
  nodeMap: {
    position: 'relative',
    gap: DS.space.sm,
    paddingVertical: DS.space.sm,
  },
  energySpine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    borderRadius: 2,
    marginLeft: -1,
  },
  nodeRow: {
    minHeight: 112,
    justifyContent: 'center',
    position: 'relative',
  },
  nodeRowLeft: { alignItems: 'flex-start' },
  nodeRowRight: { alignItems: 'flex-end' },
  connector: {
    position: 'absolute',
    top: '50%',
    width: '28%',
    height: 1.5,
    borderRadius: 1,
    left: '36%',
  },
  node: {
    width: '48%',
    minHeight: 104,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  nodeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeIcon: { fontSize: 17, fontWeight: '900' },
  nodeXP: { fontSize: 11, fontWeight: '900' },
  nodeName: { color: TXT2, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  nodeBranch: { color: TXT3, fontSize: 11, marginTop: 6 },
  lockFog: { color: TXT3, fontSize: 10, marginTop: 8, fontWeight: '700' },
  sectionTitle: { color: TXT3, fontSize: 12, fontWeight: '800', marginBottom: DS.space.sm },
  nextUnlockRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md },
  nextGlyph: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  nextGlyphText: { fontSize: 23, fontWeight: '900' },
  nextName: { color: TXT1, fontSize: 17, fontWeight: '900' },
  nextDesc: { color: TXT3, fontSize: 13, marginTop: 4 },
  emptyCopy: { color: TXT3, fontSize: 13, lineHeight: 20 },
  supportGrid: { flexDirection: 'row', gap: DS.space.sm },
  supportPanel: { flex: 1, minHeight: 132 },
  supportValue: { fontSize: 20, fontWeight: '900' },
  supportCopy: { color: TXT3, fontSize: 12, marginTop: 8 },
  techRow: { flexDirection: 'row', gap: DS.space.sm },
  techChip: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.045)',
    padding: DS.space.sm,
    minHeight: 78,
  },
  techKanji: { color: TXT1, fontSize: 18, fontWeight: '900' },
  techName: { color: TXT3, fontSize: 11, marginTop: 6, fontWeight: '700' },
  bountyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    paddingVertical: DS.space.sm,
  },
  bountyKanji: { width: 34, fontSize: 22, fontWeight: '900' },
  bountyName: { color: TXT1, fontSize: 14, fontWeight: '800' },
  bountyDesc: { color: TXT3, fontSize: 12, marginTop: 3 },
  bountyXP: { fontSize: 13, fontWeight: '900' },
});

export default React.memo(SkillScreen);
