import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TXT2 } from '../../theme/tokens';
import { DS } from '../../theme/designSystem';

/*
 * The single canonical section head: an eyebrow label with an optional accent
 * tick and an optional trailing slot (e.g. per-section totals). Every screen
 * uses this — do not reimplement section heads locally.
 */
const SectionLabel = memo(function SectionLabel({ label, style, accent, right }) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        {accent && <View style={[styles.tick, { backgroundColor: accent }]} />}
        <Text style={styles.sectionLabel}>{label}</Text>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
});

export default SectionLabel;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  right: { flexDirection: 'row', alignItems: 'center' },
  sectionLabel: { ...DS.type.label, color: TXT2 },
});
