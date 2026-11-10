import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, spacing, type, sheet, size } from '../theme';
import { Button, Icon, IconButton, Sheet } from './ui';
import { DESTINATION, PREFERENCES } from '../data/mockData';

// Lightweight list of selectable rows rather than dashboard tiles.
export default function ParkingPreferenceSheet({ onChoose, onBack, onHeight }) {
  return (
    <Sheet onHeight={onHeight} padded={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={type.titleMedium} accessibilityRole="header">
            How do you want to park?
          </Text>
          <Text style={styles.sub}>Near {DESTINATION.name}</Text>
        </View>
        <IconButton icon="close" variant="tonal" size={40} accessibilityLabel="Cancel parking planning" onPress={onBack} />
      </View>

      <View style={styles.list}>
        {PREFERENCES.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onChoose(p.id)}
            accessibilityRole="button"
            accessibilityLabel={`${p.label}. ${p.hint}`}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.icon}>
              <Icon name={p.icon} size={size.icon} color={color.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{p.label}</Text>
              <Text style={styles.hint}>{p.hint}</Text>
            </View>
            <Icon name="chevron-right" size={size.iconLg} color={color.textSubtle} />
          </Pressable>
        ))}
      </View>

      <View style={styles.none}>
        <Button
          label="No preference"
          variant="text"
          compact
          onPress={() => onChoose('none')}
          accessibilityLabel={`No preference. Drive to ${DESTINATION.name} as usual`}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: sheet.paddingX, paddingRight: spacing.md },
  sub: { ...type.bodyMedium, color: color.textSubtle, marginTop: 2 },
  list: { paddingHorizontal: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outlineVariant,
  },
  rowPressed: { backgroundColor: color.selectedFill, borderColor: color.primary },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.primaryTonal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  label: { ...type.titleSmall, color: color.text },
  hint: { ...type.bodyMedium, color: color.textSubtle },
  none: { alignItems: 'center', marginTop: spacing.sm },
});
