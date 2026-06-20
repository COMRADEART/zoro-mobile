import React from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { DS } from '../../theme/designSystem';
import { TXT1, TXT3 } from '../../theme/tokens';
import { SWORDS } from '../../data/gameData';
import type { Discipline } from '../../types';

function inkOn(hex: string): string {
  const h = (hex || '').replace('#', '');
  if (h.length < 6) return '#FFFFFF';
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? '#0A0A0A' : '#FFFFFF';
}

export const SWORD_ORDER: readonly Discipline[] = ['wado', 'sandai', 'shusui'];

// One iconic glyph per blade for compact marks. Sandai's literal first char
// (三) reads as menu bars, so the demon-blade 鬼 stands in.
export const SWORD_GLYPH: Record<Discipline, string> = { wado: '和', sandai: '鬼', shusui: '秋' };

interface PanelProps {
  accent?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  dim?: boolean;
}

export function Panel({ accent = '#F0F0F0', children, style, dim = false }: PanelProps) {
  return (
    <View style={[s.panel, dim && s.panelDim, { borderColor: accent + '18' }, style]}>
      <View pointerEvents="none" style={[s.panelLight, { backgroundColor: accent }]} />
      {children}
    </View>
  );
}

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  mark?: string;
  accent?: string;
  right?: React.ReactNode;
}

export function ScreenHeader({ eyebrow, title, subtitle, mark, accent = '#F0F0F0', right }: ScreenHeaderProps) {
  return (
    <View style={s.screenHeader}>
      <View style={s.headerCopy}>
        {!!eyebrow && <Text style={[s.eyebrow, { color: accent }]}>{eyebrow}</Text>}
        <Text style={s.headerTitle}>{title}</Text>
        {!!subtitle && <Text style={s.headerSubtitle}>{subtitle}</Text>}
      </View>
      {right || (
        <View style={[s.headerMark, { backgroundColor: accent + '13', borderColor: accent + '24' }]}>
          <Text style={[s.headerMarkText, { color: accent }]}>{mark}</Text>
        </View>
      )}
    </View>
  );
}

interface PrimaryButtonProps {
  label: string;
  sublabel?: string;
  accent?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({ label, sublabel, accent = '#F0F0F0', onPress, style }: PrimaryButtonProps) {
  const labelInk = inkOn(accent);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.primaryButton,
        {
          backgroundColor: accent,
          shadowColor: accent,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      <Text style={[s.primaryLabel, { color: labelInk }]}>{label}</Text>
      {!!sublabel && <Text style={[s.primarySub, { color: labelInk }]}>{sublabel}</Text>}
    </Pressable>
  );
}

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  accent?: string;
  style?: StyleProp<ViewStyle>;
}

export function SecondaryButton({ label, onPress, accent = '#F0F0F0', style }: SecondaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.secondaryButton,
        {
          borderColor: accent + '35',
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      <Text style={[s.secondaryLabel, { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

interface MetricTileProps {
  label: string;
  value: string | number;
  detail?: string;
  accent?: string;
  mark?: string;
  style?: StyleProp<ViewStyle>;
}

export function MetricTile({ label, value, detail, accent = '#F0F0F0', mark, style }: MetricTileProps) {
  return (
    <View style={[s.metricTile, { backgroundColor: accent + '0B' }, style]}>
      <View style={s.metricTop}>
        {!!mark && <Text style={[s.metricMark, { color: accent }]}>{mark}</Text>}
        <Text style={s.metricLabel}>{label}</Text>
      </View>
      <Text style={[s.metricValue, { color: accent }]} numberOfLines={1}>{value}</Text>
      {!!detail && <Text style={s.metricDetail} numberOfLines={1}>{detail}</Text>}
    </View>
  );
}

interface ProgressRailProps {
  pct?: number;
  accent?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressRail({ pct = 0, accent = '#F0F0F0', style }: ProgressRailProps) {
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <View style={[s.rail, style]}>
      <View style={[s.railFill, { width: `${clamped * 100}%`, backgroundColor: accent }]} />
    </View>
  );
}

interface SwordSelectorProps {
  value: Discipline;
  onChange: (key: Discipline) => void;
  compact?: boolean;
}

export function SwordSelector({ value, onChange, compact = false }: SwordSelectorProps) {
  return (
    <View style={[s.selector, compact && s.selectorCompact]}>
      {SWORD_ORDER.map(key => {
        const sword = SWORDS[key];
        const active = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${sword.name} ${sword.discipline}`}
            style={({ pressed }) => [
              s.selectorItem,
              active && { backgroundColor: sword.accent + '18' },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={[s.selectorKanji, active && { color: sword.accent }]} numberOfLines={1}>
              {sword.kanji}
            </Text>
            <Text style={[s.selectorName, active && { color: sword.accent }]}>{sword.name.split(' ')[0]}</Text>
            {active && <View style={[s.selectorPulse, { backgroundColor: sword.accent }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

interface SoftDividerProps {
  accent?: string;
  style?: StyleProp<ViewStyle>;
}

export function SoftDivider({ accent = 'rgba(255,255,255,0.1)', style }: SoftDividerProps) {
  return <View style={[s.divider, { backgroundColor: accent }, style]} />;
}

const s = StyleSheet.create({
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    backgroundColor: 'rgba(10,10,10,0.70)',
    padding: DS.space.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 12,
  },
  panelDim: {
    backgroundColor: 'rgba(10,10,10,0.50)',
  },
  panelLight: {
    position: 'absolute',
    left: -30,
    top: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    opacity: 0.07,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: DS.space.md,
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  headerTitle: {
    fontFamily: DS.font.display,
    color: TXT1,
    fontSize: 33,
    lineHeight: 37,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: TXT3,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  headerMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMarkText: {
    fontSize: 23,
    fontWeight: '900',
  },
  primaryButton: {
    minHeight: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DS.space.lg,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.26,
    shadowRadius: 24,
    elevation: 12,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  primarySub: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DS.space.lg,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  metricTile: {
    flex: 1,
    minHeight: 104,
    borderRadius: 20,
    padding: 14,
    justifyContent: 'space-between',
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricMark: {
    fontSize: 15,
    fontWeight: '900',
  },
  metricLabel: {
    color: TXT3,
    fontSize: 11,
    fontWeight: '700',
  },
  metricValue: {
    fontFamily: DS.font.display,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0,
  },
  metricDetail: {
    color: TXT3,
    fontSize: 11,
    fontWeight: '600',
  },
  rail: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  railFill: {
    height: '100%',
    borderRadius: 4,
  },
  selector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 24,
    padding: 5,
    gap: 4,
  },
  selectorCompact: {
    borderRadius: 18,
    padding: 4,
  },
  selectorItem: {
    flex: 1,
    minHeight: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selectorKanji: {
    color: TXT3,
    fontSize: 20,
    fontWeight: '900',
    maxWidth: '94%',
  },
  selectorName: {
    color: TXT3,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 5,
  },
  selectorPulse: {
    position: 'absolute',
    bottom: 5,
    width: 34,
    height: 3,
    borderRadius: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.8,
  },
});
