import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, Easing, AccessibilityInfo } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, elevation, radius, size, spacing, type, motion, sheet as sheetTokens } from '../theme';

// One icon family (Material Icons) across the app.
export function Icon({ name, size: s = size.icon, color: c = color.text, style }) {
  return <MaterialIcons name={name} size={s} color={c} style={style} />;
}

// ---------------------------------------------------------------------------
// Buttons: filled (primary), tonal, outlined (secondary), text.

const VARIANTS = {
  filled: {
    container: { backgroundColor: color.primary },
    pressed: { backgroundColor: color.primaryPressed },
    text: color.surface,
  },
  tonal: {
    container: { backgroundColor: color.primaryTonal },
    pressed: { backgroundColor: color.primaryTonalPressed },
    text: color.onPrimaryTonal,
  },
  outlined: {
    container: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.outline },
    pressed: { backgroundColor: color.surfaceDim },
    text: color.primary,
  },
  text: {
    container: { backgroundColor: 'transparent' },
    pressed: { backgroundColor: color.surfaceDim },
    text: color.primary,
  },
};

export function Button({ label, onPress, variant = 'filled', icon, disabled, style, accessibilityLabel, compact }) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        variant === 'text' && styles.buttonText,
        v.container,
        pressed && !disabled && v.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && <Icon name={icon} size={compact ? 18 : 20} color={v.text} style={styles.buttonIcon} />}
      <Text style={[styles.buttonLabel, { color: v.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// Round icon button. `variant`: 'plain' (no fill), 'tonal' (quiet fill),
// 'floating' (white with soft shadow, for map controls).
export function IconButton({ icon, onPress, accessibilityLabel, size: s = size.touch, tint = color.text, style, filled, variant }) {
  const v = variant || (filled ? 'floating' : 'plain');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => [
        { width: s, height: s, borderRadius: s / 2, alignItems: 'center', justifyContent: 'center' },
        v === 'floating' && styles.floating,
        v === 'tonal' && { backgroundColor: color.surfaceContainer },
        pressed && { backgroundColor: v === 'plain' ? 'rgba(0,0,0,0.06)' : color.surfaceDim },
        style,
      ]}
    >
      <Icon name={icon} size={size.iconLg} color={tint} />
    </Pressable>
  );
}

// Filter chip (selected shows a check, like Material 3).
export function Chip({ label, selected, onPress, icon, accessibilityRole = 'button' }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ selected: !!selected, checked: !!selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && { backgroundColor: selected ? color.primaryTonalPressed : color.surfaceDim },
      ]}
    >
      {selected ? (
        <Icon name="check" size={size.iconSm} color={color.onPrimaryTonal} style={{ marginRight: 4 }} />
      ) : icon ? (
        <Icon name={icon} size={size.iconSm} color={color.textMuted} style={{ marginRight: 6 }} />
      ) : null}
      <Text style={[styles.chipLabel, selected && { color: color.onPrimaryTonal }]}>{label}</Text>
    </Pressable>
  );
}

// Connected segmented control (Street | Garage | Either).
export function SegmentedControl({ options, value, onChange }) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((o, i) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, checked: active }}
            accessibilityLabel={o.label}
            style={({ pressed }) => [
              styles.segment,
              i > 0 && styles.segmentDivider,
              active && styles.segmentActive,
              pressed && !active && { backgroundColor: color.surfaceDim },
            ]}
          >
            {active && <Icon name="check" size={size.iconSm} color={color.onPrimaryTonal} style={{ marginRight: 4 }} />}
            <Text style={[styles.segmentLabel, active && { color: color.onPrimaryTonal }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Small status badge, e.g. "Recommended".
export function Badge({ label, icon, tone = 'success' }) {
  const t = tone === 'success' ? { bg: color.successContainer, fg: color.success } : { bg: color.primaryTonal, fg: color.onPrimaryTonal };
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon && <Icon name={icon} size={12} color={t.fg} style={{ marginRight: 3 }} />}
      <Text style={[styles.badgeLabel, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

// One comparable metric: icon, strong value, quiet label.
export function MetricStat({ icon, value, label, emphasis = true, children, style }) {
  return (
    <View style={[styles.metric, style]}>
      <View style={styles.metricTop}>
        {icon && <Icon name={icon} size={size.iconSm} color={color.textSubtle} style={{ marginRight: 4 }} />}
        {children || (
          <Text style={[styles.metricValue, !emphasis && { color: color.textMuted, fontWeight: '500' }]} numberOfLines={1}>
            {value}
          </Text>
        )}
      </View>
      <Text style={styles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bottom sheet: consistent radius, handle, padding and safe-area spacing.
// Slides in on mount and reports its height so the map can keep the
// relevant area visible above it.
export function Sheet({ children, onHeight, style, padded = true, grabber = true }) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) anim.setValue(1);
        // Subtle spring: settles quickly with barely any overshoot.
        else Animated.spring(anim, { toValue: 1, ...motion.spring, useNativeDriver: true }).start();
      });
    return () => {
      cancelled = true;
    };
  }, [anim]);
  return (
    <Animated.View
      onLayout={(e) => onHeight && onHeight(e.nativeEvent.layout.height)}
      style={[
        styles.sheet,
        { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xs },
        padded && { paddingHorizontal: sheetTokens.paddingX },
        {
          // Opaque from the first frame so the map edge never shows while
          // sheets swap; the slide alone carries the motion.
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
        },
        style,
      ]}
    >
      {grabber && <View style={styles.grabber} />}
      {children}
    </Animated.View>
  );
}

export function FadeIn({ children, style, delay = 0, from = 12, duration = motion.standard - 40 }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, delay, duration]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Likelihood is shown with bars and words, never colour alone.
const LIKELY = { High: [3, color.likelyHigh], Medium: [2, color.likelyMedium], Low: [1, color.likelyLow] };
export function LikelihoodMeter({ level, label = 'likelihood', compact }) {
  const [n, tint] = LIKELY[level] || [0, color.textSubtle];
  return (
    <View style={styles.meterRow} accessible accessibilityLabel={`${level} ${label}`.trim()}>
      <View style={styles.meterBars}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.meterBar, { height: 4 + i * 3, backgroundColor: i <= n ? tint : color.outlineVariant }]} />
        ))}
      </View>
      <Text style={[styles.meterText, { color: tint }, compact && { fontSize: 13 }]}>
        {level}
        {label ? ` ${label}` : ''}
      </Text>
    </View>
  );
}

export function Divider({ style }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: color.divider }, style]} />;
}

const styles = StyleSheet.create({
  button: {
    height: size.button,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: { height: size.buttonCompact, paddingHorizontal: spacing.lg },
  buttonText: { paddingHorizontal: spacing.md },
  buttonIcon: { marginRight: spacing.sm },
  buttonLabel: { ...type.label, fontSize: 15, letterSpacing: 0.1 },
  disabled: { opacity: 0.38 },
  floating: { backgroundColor: color.surface, ...elevation[2] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: size.chip,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surface,
  },
  chipSelected: { backgroundColor: color.primaryTonal, borderColor: color.primaryTonal },
  chipLabel: { ...type.label, color: color.textMuted },
  segmented: {
    flexDirection: 'row',
    height: size.buttonCompact,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    overflow: 'hidden',
  },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  segmentDivider: { borderLeftWidth: 1, borderLeftColor: color.outline },
  segmentActive: { backgroundColor: color.primaryTonal },
  segmentLabel: { ...type.label, color: color.text },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radius.xs,
  },
  badgeLabel: { ...type.labelSmall, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
  metric: { flex: 1 },
  metricTop: { flexDirection: 'row', alignItems: 'center', height: 20 },
  metricValue: { ...type.metric, color: color.text },
  metricLabel: { ...type.caption, color: color.textSubtle, marginTop: 2 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: sheetTokens.paddingTop,
    ...elevation.sheet,
  },
  grabber: {
    width: size.handleW,
    height: size.handleH,
    borderRadius: size.handleH / 2,
    backgroundColor: color.outline,
    alignSelf: 'center',
    marginBottom: sheetTokens.handleGap,
  },
  meterRow: { flexDirection: 'row', alignItems: 'center' },
  meterBars: { flexDirection: 'row', alignItems: 'flex-end', marginRight: 6, height: 13 },
  meterBar: { width: 4, borderRadius: 1, marginRight: 2 },
  meterText: { fontSize: 14, fontWeight: '600' },
});
