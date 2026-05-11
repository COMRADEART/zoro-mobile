import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TXT3 } from '../../../theme/tokens';

const STAGE_COLORS = {
  deep: '#7C3AED',
  light: '#3B82F6',
  rem: '#22D3EE',
  awake: '#FB923C',
};

const STAGE_LABELS = {
  deep: 'DEEP · 深',
  light: 'LIGHT · 浅',
  rem: 'REM · レム',
  awake: 'AWAKE · 覚醒',
};

export default function SleepStagesChart({ data, height = 28, showLabels = true }) {
  if (!data) return null;

  const { deepHours = 0, lightHours = 0, remHours = 0, awakeHours = 0, hours = 0 } = data;
  const total = deepHours + lightHours + remHours + awakeHours || hours || 1;

  const segments = [
    { key: 'deep', hours: deepHours, color: STAGE_COLORS.deep },
    { key: 'light', hours: lightHours, color: STAGE_COLORS.light },
    { key: 'rem', hours: remHours, color: STAGE_COLORS.rem },
    { key: 'awake', hours: awakeHours, color: STAGE_COLORS.awake },
  ].filter(s => s.hours > 0);

  return (
    <View style={showLabels ? styles.wrapper : styles.wrapperMinimal}>
      <View style={[styles.bar, { height }]}>
        {segments.map(seg => (
          <View
            key={seg.key}
            style={[
              styles.segment,
              {
                backgroundColor: seg.color,
                flex: seg.hours / total,
              },
            ]}
          />
        ))}
        {segments.length === 0 && (
          <View style={[styles.segment, { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)' }]} />
        )}
      </View>

      {showLabels && (
        <View style={styles.labels}>
          {segments.map(seg => (
            <View key={seg.key} style={[styles.labelItem, { borderColor: seg.color + '25' }]}>
              <View style={[styles.dot, { backgroundColor: seg.color }]} />
              <Text style={styles.labelText}>{STAGE_LABELS[seg.key]}</Text>
              <Text style={[styles.labelHours, { color: seg.color }]}>
                {seg.hours > 0 ? `${seg.hours.toFixed(1)}h` : '—'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function SleepStagesWeek({ weekData }) {
  if (!weekData || weekData.length === 0) {
    return (
      <View style={styles.weekWrapper}>
        <Text style={styles.emptyText}>No sleep data for this week · 今週のデータなし</Text>
      </View>
    );
  }

  return (
    <View style={styles.weekWrapper}>
      <View style={styles.weekBars}>
        {weekData.map((day, i) => {
          const { deepHours = 0, lightHours = 0, remHours = 0, awakeHours = 0 } = day.sleepData || {};
          const total = deepHours + lightHours + remHours + awakeHours || 1;
          const segments = [
            { key: 'deep', hours: deepHours, color: STAGE_COLORS.deep },
            { key: 'light', hours: lightHours, color: STAGE_COLORS.light },
            { key: 'rem', hours: remHours, color: STAGE_COLORS.rem },
            { key: 'awake', hours: awakeHours, color: STAGE_COLORS.awake },
          ];

          const dayLabel = day.date
            ? new Date(day.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)
            : '?';

          return (
            <View key={i} style={styles.weekDay}>
              <View style={styles.weekBar}>
                {segments.map(seg => (
                  <View
                    key={seg.key}
                    style={{
                      backgroundColor: seg.hours > 0 ? seg.color : 'transparent',
                      flex: seg.hours > 0 ? seg.hours / total : 0,
                    }}
                  />
                ))}
              </View>
              <Text style={styles.weekLabel}>{dayLabel}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.weekLegend}>
        {Object.entries(STAGE_LABELS).map(([key, label]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: STAGE_COLORS[key] }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  wrapperMinimal: {},
  bar: { flexDirection: 'row', borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
  segment: { height: '100%' },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  labelItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  labelText: { fontSize: 7.5, fontWeight: '700', letterSpacing: 1, color: TXT3 },
  labelHours: { fontSize: 10, fontWeight: '800' },
  weekWrapper: { gap: 10 },
  weekBars: { flexDirection: 'row', gap: 5 },
  weekDay: { flex: 1, alignItems: 'center', gap: 5 },
  weekBar: { width: '100%', height: 36, borderRadius: 6, overflow: 'hidden', flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)' },
  weekLabel: { fontSize: 9, fontWeight: '700', color: TXT3 },
  weekLegend: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 7.5, fontWeight: '700', letterSpacing: 0.5, color: TXT3 },
  emptyText: { fontSize: 11, color: TXT3, fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
});