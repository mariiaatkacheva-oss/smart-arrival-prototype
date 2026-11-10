import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, elevation, radius } from '../theme';
import { Button, Icon, IconButton, LikelihoodMeter, FadeIn } from './ui';
import { TypeBadge } from './ParkingOptionCard';
import { DESTINATION } from '../data/mockData';

// Bottom panel while driving through a street-parking search zone, and the
// "garage entrance / destination reached" variant.
export default function ParkingSearchPanel({ plan, inZone, zoneEnded, canTryAnother, onTryAnother, onParked, onExit, onHeight }) {
  const insets = useSafeAreaInsets();
  const isStreet = plan.type === 'street';
  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}
      onLayout={(e) => onHeight && onHeight(e.nativeEvent.layout.height)}
    >
      <View style={styles.row}>
        <TypeBadge type={plan.type} size={40} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title} numberOfLines={1}>
            {isStreet ? (inZone ? `Searching ${plan.name}` : `Heading to ${plan.name}`) : plan.name}
          </Text>
          {isStreet && (
            <View style={styles.metaRow}>
              <LikelihoodMeter level={plan.likelihood} compact />
            </View>
          )}
          <Text style={styles.meta}>
            {plan.walkMinutes} min walk to {DESTINATION.name}
          </Text>
        </View>
        <IconButton icon="close" variant="tonal" size={44} accessibilityLabel="Exit navigation" onPress={onExit} />
      </View>

      {zoneEnded && isStreet && (
        <FadeIn>
          <View style={styles.hint} accessibilityLiveRegion="polite">
            <Icon name="info-outline" size={18} color={color.warning} />
            <Text style={styles.hintText}>No spot? Continue to the next suggested area.</Text>
          </View>
        </FadeIn>
      )}

      <View style={styles.actions}>
        {isStreet && canTryAnother && (
          <Button
            label="Try another area"
            variant={zoneEnded ? 'tonal' : 'outlined'}
            onPress={onTryAnother}
            style={{ flex: 1, marginRight: 10 }}
          />
        )}
        <Button label="I parked" icon="local-parking" onPress={onParked} style={{ flex: 1 }} />
      </View>
    </View>
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
    paddingTop: 16,
    paddingHorizontal: 20,
    ...elevation.sheet,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '500', color: color.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  meta: { fontSize: 13, color: color.textMuted, marginTop: 2 },
  exit: { backgroundColor: color.surfaceContainer },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.warningBg,
    borderRadius: radius.md,
    padding: 10,
    marginTop: 12,
  },
  hintText: { marginLeft: 8, fontSize: 14, color: color.text, flex: 1 },
  actions: { flexDirection: 'row', marginTop: 14 },
});
