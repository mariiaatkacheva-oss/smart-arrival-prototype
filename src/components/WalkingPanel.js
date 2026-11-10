import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, elevation, radius, type } from '../theme';
import { Button, Icon, IconButton, Sheet } from './ui';
import { DESTINATION } from '../data/mockData';

export function WalkingPanel({ minutes, distance, eta, carLabel, onExit, onHeight }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}
      onLayout={(e) => onHeight && onHeight(e.nativeEvent.layout.height)}
    >
      <View style={styles.row}>
        <IconButton icon="close" variant="tonal" size={44} accessibilityLabel="Exit walking navigation" onPress={onExit} />
        <View style={styles.center} accessible accessibilityLabel={`${minutes} minutes walking, ${distance}, arrive ${eta}`}>
          <View style={styles.row}>
            <Icon name="directions-walk" size={24} color={color.eta} />
            <Text style={styles.minutes}>{minutes} min</Text>
          </View>
          <Text style={styles.meta}>
            {distance} · {eta}
          </Text>
        </View>
        <View style={{ width: 48 }} />
      </View>
      {!!carLabel && (
        <View style={styles.car}>
          <Icon name="directions-car" size={16} color={color.primary} />
          <Text style={styles.carText}>{carLabel}</Text>
        </View>
      )}
    </View>
  );
}

export function ArrivedSheet({ summary, onDone, onHeight }) {
  return (
    <Sheet onHeight={onHeight}>
      <View style={styles.arrivedRow}>
        <Icon name="check-circle" size={40} color={color.success} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={type.title} accessibilityRole="header">
            You’ve arrived at {DESTINATION.name}
          </Text>
          <Text style={styles.sub}>{DESTINATION.address}</Text>
        </View>
      </View>
      <View style={styles.summary}>
        {summary.map((s) => (
          <View key={s.icon} style={styles.summaryItem}>
            <Icon name={s.icon} size={20} color={color.textMuted} />
            <Text style={styles.summaryText}>{s.text}</Text>
          </View>
        ))}
      </View>
      <Button label="Done" onPress={onDone} style={{ marginTop: 16 }} />
      <Text style={styles.concept}>Smart Arrival · independent concept prototype</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: 14,
    paddingHorizontal: 16,
    ...elevation.sheet,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  exit: { backgroundColor: color.surfaceContainer },
  center: { flex: 1, alignItems: 'center' },
  minutes: { fontSize: 26, lineHeight: 32, fontWeight: '600', color: color.eta, marginLeft: 4 },
  meta: { fontSize: 15, color: color.textMuted, marginTop: 2 },
  car: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: color.surfaceDim,
  },
  carText: { marginLeft: 6, fontSize: 13, color: color.text, fontWeight: '500' },
  arrivedRow: { flexDirection: 'row', alignItems: 'center' },
  sub: { fontSize: 14, color: color.textSubtle, marginTop: 2 },
  summary: { marginTop: 16, gap: 10 },
  summaryItem: { flexDirection: 'row', alignItems: 'center' },
  summaryText: { marginLeft: 10, fontSize: 15, color: color.text },
  concept: { fontSize: 12, color: color.textSubtle, textAlign: 'center', marginTop: 12 },
});
