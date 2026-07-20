import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TXT2, TXT3 } from '../theme/tokens';
import { DS } from '../theme/designSystem';

/**
 * First-run walkthrough: four static cards explaining the systems a new
 * user meets with zero-state data. Deliberately unanimated — instant card
 * swaps satisfy reduced-motion by default and match the product's
 * "confidence through restraint" register.
 */
const CARDS = [
  {
    kanji: '三刀流',
    title: 'THREE SWORDS',
    body: 'Train three disciplines: Wado is the mind — meditation, reading, breath. Sandai is the body — reps and distance. Shusui is the spirit — endurance held under strain. Progress asks for all three.',
  },
  {
    kanji: '回復',
    title: 'RECOVERY',
    body: 'Training drains recovery; sleep restores it. Below 20, the dojo will tell you to rest — listen. Sword Sharpness on the Home screen is your daily readiness, blended from recovery, mood, and sleep.',
  },
  {
    kanji: '輪',
    title: 'THREE RINGS',
    body: 'Close three rings daily: 20 minutes of mind work, 200 reps of body work, 15 minutes of spirit work. Rings are earned from logged sessions — nothing counts until it is logged.',
  },
  {
    kanji: '始',
    title: 'THE PATH',
    body: 'Log sessions in Train to earn XP, ranks, and techniques. Weekly boss trials, story arcs, and bounties wait once you build a streak. A daily reminder can be set in Config.',
  },
];

export default function OnboardingIntro({ accent, onDone }) {
  const [index, setIndex] = useState(0);
  const card = CARDS[index];
  const last = index === CARDS.length - 1;

  return (
    <View style={st.backdrop} accessibilityViewIsModal>
      <View style={[st.card, { borderColor: accent + '40' }]}>
        <Pressable
          onPress={onDone}
          style={st.skip}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Skip introduction"
        >
          <Text style={st.skipTxt}>SKIP</Text>
        </Pressable>

        <Text style={[st.kanji, { color: accent }]}>{card.kanji}</Text>
        <Text style={[st.title, { color: accent }]}>{card.title}</Text>
        <Text style={st.body}>{card.body}</Text>

        <View style={st.dots}>
          {CARDS.map((_, i) => (
            <View key={i} style={[st.dot, { backgroundColor: i === index ? accent : 'rgba(255,255,255,0.18)' }]} />
          ))}
        </View>

        <Pressable
          onPress={() => (last ? onDone() : setIndex(i => i + 1))}
          style={[st.nextBtn, { backgroundColor: accent }]}
          accessibilityRole="button"
          accessibilityLabel={last ? 'Begin training' : `Next, ${CARDS[index + 1].title}`}
        >
          <Text style={st.nextTxt}>{last ? 'BEGIN · 始める' : 'NEXT ›'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000D8',
    justifyContent: 'center',
    padding: DS.space.lg,
    zIndex: 100,
  },
  card: {
    backgroundColor: '#111214',
    borderRadius: 18,
    borderWidth: 1,
    padding: DS.space.xl,
    alignItems: 'center',
  },
  skip: { position: 'absolute', top: DS.space.md, right: DS.space.md },
  skipTxt: { ...DS.type.micro, color: TXT3, letterSpacing: 2 },
  kanji: { fontFamily: DS.font.display, fontSize: 56, lineHeight: 64, marginTop: DS.space.md },
  title: { ...DS.type.micro, letterSpacing: 4, marginTop: DS.space.sm },
  body: { ...DS.type.body, color: TXT2, textAlign: 'center', lineHeight: 22, marginTop: DS.space.md, minHeight: 110 },
  dots: { flexDirection: 'row', gap: 8, marginTop: DS.space.md },
  dot: { width: 7, height: 7, borderRadius: 4 },
  nextBtn: {
    marginTop: DS.space.lg,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  nextTxt: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: '#0B0B0C' },
});

export { CARDS };
