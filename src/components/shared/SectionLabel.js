import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TXT2 } from '../../theme/tokens';
import { DS } from '../../theme/designSystem';

const SectionLabel = memo(function SectionLabel({ label, style, accent }) {
  return (
    <View style={styles.container}>
      {accent && <View style={[styles.tick, { backgroundColor: accent }]} />}
      <Text style={[styles.sectionLabel, style]}>{label}</Text>
    </View>
  );
});

export default SectionLabel;

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tick: { width: 2.5, height: 13, borderRadius: 1.5 },
  sectionLabel: { ...DS.type.label, color: TXT2 },
});
