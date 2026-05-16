import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { SURF, BORD } from '../../theme/tokens';
import { DS } from '../../theme/designSystem';

/*
 * A single, calm surface primitive.
 *
 * `variant`:
 *  - 'card'    (default) real surface: tint + hairline border + soft shadow.
 *  - 'flat'    grouping only: faint tint, no border, no shadow. Use this so a
 *              screen can group content WITHOUT making every block a card.
 *  - 'plain'   no chrome at all (transparent). For sections that just need
 *              padding/rhythm, not a surface.
 */
const SHADOWS = {
  sm: { shadowOpacity: 0.14, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  medium: { shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  high: { shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  none: { shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
};
const NO_SHADOW = { shadowOpacity: 0, shadowRadius: 0, elevation: 0 };

const GlassCard = memo(function GlassCard({
  accent,
  children,
  style,
  onPress,
  elevation = 'medium',
  variant = 'card',
}) {
  const isCard = variant === 'card';
  const isFlat = variant === 'flat';

  const cardShadow = isCard ? (SHADOWS[elevation] || SHADOWS.medium) : NO_SHADOW;

  const surface = isCard
    ? { backgroundColor: SURF, borderWidth: StyleSheet.hairlineWidth, borderColor: accent ? accent + '38' : BORD }
    : isFlat
      ? { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 0 }
      : { backgroundColor: 'transparent', borderWidth: 0 };

  const content = (
    <View style={[styles.card, surface, { shadowColor: accent || '#000', ...cardShadow }, style]}>
      <View style={styles.content}>{children}</View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1 })}>
      {content}
    </Pressable>
  );
});

export default GlassCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: DS.radius.lg,
    marginBottom: DS.space.sm,
    overflow: 'hidden',
  },
  content: {
    padding: DS.space.md + 2,
  },
});
