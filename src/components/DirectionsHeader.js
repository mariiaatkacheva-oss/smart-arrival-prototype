import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, elevation, radius } from '../theme';
import { Icon, IconButton } from './ui';
import { DESTINATION, TRIP } from '../data/mockData';

function Dots() {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.dot} />
      ))}
    </View>
  );
}

// Top card on route screens: origin -> (parking stop) -> destination, with
// the icon column on the left like Maps, plus travel-mode tabs.
export default function DirectionsHeader({ onBack, parkingStop, driveMinutes, onHeight }) {
  const insets = useSafeAreaInsets();
  const stops = [
    { key: 'o', label: 'Your location', icon: <View style={styles.originDot} /> },
    parkingStop && {
      key: 'p',
      label: parkingStop.name,
      icon: (
        <View style={[styles.pBadge, { backgroundColor: parkingStop.type === 'garage' ? color.garage : color.zone }]}>
          <Text style={styles.pText}>P</Text>
        </View>
      ),
    },
    { key: 'd', label: DESTINATION.name, icon: <Icon name="place" size={20} color={color.pin} />, walk: !!parkingStop },
  ].filter(Boolean);

  return (
    <View
      style={[styles.wrap, { top: insets.top + 6 }]}
      onLayout={(e) => onHeight && onHeight(e.nativeEvent.layout.height + insets.top + 6)}
    >
      <View style={styles.row}>
        <IconButton icon="arrow-back" accessibilityLabel="Back" onPress={onBack} />
        <View style={styles.iconCol}>
          {stops.map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && <Dots />}
              <View style={styles.iconSlot}>{s.icon}</View>
            </React.Fragment>
          ))}
        </View>
        <View style={styles.fields}>
          {stops.map((s) => (
            <View key={s.key} style={styles.field}>
              <Text style={[styles.fieldText, s.key === 'o' && { color: color.primary }]} numberOfLines={1}>
                {s.label}
              </Text>
              {s.walk && (
                <View style={styles.walkTag} accessibilityLabel="Walk from parking">
                  <Icon name="directions-walk" size={14} color={color.textMuted} />
                </View>
              )}
            </View>
          ))}
        </View>
        <IconButton icon="swap-vert" tint={color.textMuted} accessibilityLabel="Swap start and destination (not available in prototype)" />
      </View>

      <View style={styles.modes} accessibilityRole="tablist">
        {TRIP.modes.map((m) => {
          const active = m.id === 'drive';
          return (
            <View
              key={m.id}
              style={[styles.mode, active && styles.modeActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${m.id}, ${active ? driveMinutes : m.minutes} minutes`}
            >
              <Icon name={m.icon} size={18} color={active ? color.onPrimaryTonal : color.textMuted} />
              <Text style={[styles.modeText, active && styles.modeTextActive]}>{active ? driveMinutes : m.minutes} min</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const FIELD_H = 40;
const GAP = 8;

const styles = StyleSheet.create({
  // Floating contained card rather than a full-bleed header.
  wrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    backgroundColor: color.surface,
    borderRadius: radius.sheet,
    paddingTop: 6,
    paddingBottom: 10,
    ...elevation[2],
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4, paddingTop: 4 },
  iconCol: { width: 24, alignItems: 'center', marginRight: 8, marginTop: 0 },
  iconSlot: { height: FIELD_H, alignItems: 'center', justifyContent: 'center' },
  // Spans the gap plus a little of each neighbouring slot; net height = GAP.
  dots: { height: GAP + 12, justifyContent: 'space-evenly', alignItems: 'center', marginVertical: -6 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#9AA0A6' },
  fields: { flex: 1, gap: GAP },
  field: {
    height: FIELD_H,
    borderRadius: FIELD_H / 2,
    backgroundColor: color.containerLow,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldText: { fontSize: 15, color: color.text, flex: 1 },
  originDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: color.locationDot,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...elevation[1],
  },
  pBadge: { width: 18, height: 18, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  pText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  walkTag: { marginLeft: 6 },
  modes: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginTop: 10 },
  mode: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 12, borderRadius: 18 },
  modeActive: { backgroundColor: color.primaryTonal },
  modeText: { marginLeft: 6, fontSize: 14, color: color.textMuted },
  modeTextActive: { color: color.onPrimaryTonal, fontWeight: '600' },
});
