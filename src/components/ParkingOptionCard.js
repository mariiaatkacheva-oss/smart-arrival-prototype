import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, spacing, type, motion } from '../theme';
import { Badge, Icon, LikelihoodMeter, MetricStat } from './ui';
import { totalArrivalMinutes } from '../logic/arrival';

// Parking type mark: street zones are a dashed green "P", garages a solid blue one.
export function TypeBadge({ type: kind, size = 40 }) {
  const isGarage = kind === 'garage';
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size * 0.28 },
        isGarage ? styles.badgeGarage : styles.badgeStreet,
      ]}
    >
      <Text style={[styles.badgeP, { fontSize: size * 0.46 }, { color: isGarage ? color.primary : color.zone }]}>P</Text>
    </View>
  );
}

export default function ParkingOptionCard({ option, recommended, selected, onPress }) {
  const isStreet = option.type === 'street';
  const total = totalArrivalMinutes(option);

  // Quick settle on selection.
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (selected) {
      pop.setValue(0.985);
      Animated.timing(pop, { toValue: 1, duration: motion.fast, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start();
    }
  }, [selected, pop]);

  const a11y = [
    option.name,
    recommended ? 'Recommended' : null,
    `plus ${option.driveDetourMinutes} minutes drive`,
    isStreet ? `about ${option.parkingSearchMinutes} minutes parking search` : null,
    `${option.walkMinutes} minute walk`,
    option.price,
    isStreet ? `${option.likelihood} likelihood` : 'predictable',
    `${total} minutes total`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Animated.View style={{ transform: [{ scale: pop }] }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected, checked: selected }}
        accessibilityLabel={a11y}
        style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && !selected && styles.cardPressed]}
      >
        {/* Identity */}
        <View style={styles.head}>
          <TypeBadge type={option.type} />
          <View style={styles.headText}>
            <Text style={styles.name} numberOfLines={1}>
              {option.name}
            </Text>
            <View style={styles.subRow}>
              {recommended && (
                <View style={{ marginRight: spacing.sm }}>
                  <Badge label="Recommended" icon="thumb-up" />
                </View>
              )}
              <Text style={styles.sub} numberOfLines={1}>
                {isStreet ? `Street · ${option.price}` : `Garage · ${option.price} est.`}
              </Text>
            </View>
          </View>
          <Icon
            name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
            size={22}
            color={selected ? color.primary : color.outline}
          />
        </View>

        {/* The comparison: detour, search, walk */}
        <View style={styles.metrics}>
          <MetricStat icon="directions-car" value={`+${option.driveDetourMinutes} min`} label="drive" />
          {isStreet ? (
            <MetricStat icon="manage-search" value={`~${option.parkingSearchMinutes} min`} label="parking search" />
          ) : (
            <MetricStat icon="manage-search" value="None" label="parking search" emphasis={false} />
          )}
          <MetricStat icon="directions-walk" value={`${option.walkMinutes} min`} label="walk" />
        </View>

        {/* Confidence + total */}
        <View style={styles.foot}>
          {isStreet ? (
            <LikelihoodMeter level={option.likelihood} compact />
          ) : (
            <View style={styles.row}>
              <Icon name="verified" size={16} color={color.success} />
              <Text style={styles.predictable}>Predictable</Text>
            </View>
          )}
          <Text style={styles.total}>{total} min total</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surface,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: color.primary,
    backgroundColor: color.selectedFill,
    paddingVertical: spacing.md + 1,
    paddingHorizontal: spacing.lg - 1,
  },
  cardPressed: { backgroundColor: color.surfaceDim },
  row: { flexDirection: 'row', alignItems: 'center' },
  head: { flexDirection: 'row', alignItems: 'center' },
  headText: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  name: { ...type.titleSmall, color: color.text },
  subRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  sub: { ...type.bodyMedium, color: color.textSubtle, flexShrink: 1 },
  badge: { alignItems: 'center', justifyContent: 'center' },
  badgeStreet: { backgroundColor: color.successContainer, borderWidth: 1.5, borderColor: color.zone, borderStyle: 'dashed' },
  badgeGarage: { backgroundColor: color.primaryTonal },
  badgeP: { fontWeight: '800' },
  metrics: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.divider,
  },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  predictable: { ...type.label, color: color.success, marginLeft: 4 },
  total: { ...type.caption, color: color.textSubtle },
});
