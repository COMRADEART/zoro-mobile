import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TXT3 } from '../../theme/tokens';

const SectionLabel = memo(function SectionLabel({ label, style, accent }) {
  return (
    <View style={styles.container}>
      {accent && <View style={[styles.accent, { backgroundColor: accent }]} />}
      <Text style={[styles.sectionLabel, style]}>{label}</Text>
    </View>
  );
});

export default SectionLabel;

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  accent: { width: 3, height: 14, borderRadius: 2 },
  sectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 3.5, color: TXT3 },
});