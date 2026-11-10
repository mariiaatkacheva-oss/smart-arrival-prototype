import React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { color, spacing, type, sheet } from '../theme';
import { Button, IconButton, Sheet, SegmentedControl, Divider } from './ui';
import ParkingOptionCard from './ParkingOptionCard';
import { DESTINATION, PREFERENCES } from '../data/mockData';
import { getPlan, rankOptions } from '../logic/arrival';

export default function ParkingOptionsSheet({ preference, selectedId, onSelect, onPreference, onConfirm, onBack, onHeight }) {
  const { height } = useWindowDimensions();
  const ranked = rankOptions(preference);
  const selected = getPlan(selectedId);

  return (
    <Sheet onHeight={onHeight} padded={false} style={{ height: Math.round(height * 0.62) }}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" accessibilityLabel="Back to parking preference" onPress={onBack} />
        <View style={{ flex: 1, marginLeft: spacing.xs }}>
          <Text style={type.titleMedium} accessibilityRole="header">
            Parking near {DESTINATION.name}
          </Text>
          <Text style={styles.sub}>Sorted by total arrival time</Text>
        </View>
      </View>

      <View style={styles.segment}>
        <SegmentedControl options={PREFERENCES} value={preference} onChange={onPreference} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {ranked.map((o, i) => (
          <ParkingOptionCard
            key={o.id}
            option={o}
            recommended={i === 0}
            selected={o.id === selectedId}
            onPress={() => onSelect(o.id)}
          />
        ))}
        <Text style={styles.footnote}>Street availability and prices are estimates.</Text>
      </ScrollView>

      <Divider />
      <View style={styles.footer}>
        <Button label={`Route via ${selected.name}`} icon="directions" onPress={onConfirm} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm },
  sub: { ...type.bodyMedium, color: color.textSubtle },
  segment: { paddingHorizontal: sheet.paddingX, paddingTop: spacing.md, paddingBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md - 2 },
  footnote: { ...type.caption, color: color.textSubtle, textAlign: 'center', marginTop: spacing.xs },
  footer: { paddingHorizontal: sheet.paddingX, paddingTop: spacing.md },
});
