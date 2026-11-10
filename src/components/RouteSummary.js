import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, spacing, type } from '../theme';
import { Button, Sheet } from './ui';
import ParkingPrompt from './ParkingPrompt';
import { TRIP } from '../data/mockData';
import { formatClock } from '../logic/arrival';

// Standard driving route preview. Smart Arrival appears as one contextual
// suggestion above Start rather than as a separate flow.
export default function RouteSummary({ showPrompt, parkingDismissed, onPlan, onDismiss, onStart, onHeight }) {
  return (
    <Sheet onHeight={onHeight}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eta}>
            {TRIP.baseDriveMinutes} min <Text style={styles.dist}>({TRIP.baseMiles} mi)</Text>
          </Text>
          <Text style={styles.sub}>Fastest route, the usual traffic</Text>
        </View>
        <View style={styles.arrive}>
          <Text style={styles.arriveTime}>{formatClock(TRIP.baseDriveMinutes)}</Text>
          <Text style={styles.arriveLabel}>arrival</Text>
        </View>
      </View>

      {showPrompt && <ParkingPrompt onPlan={onPlan} onDismiss={onDismiss} />}

      <View style={styles.actions}>
        <Button
          label="Start"
          icon="navigation"
          variant={showPrompt ? 'outlined' : 'filled'}
          onPress={onStart}
          style={{ flex: 1 }}
        />
        {parkingDismissed && (
          <Button label="Plan parking" icon="local-parking" variant="tonal" onPress={onPlan} style={{ marginLeft: spacing.sm }} />
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start' },
  eta: { ...type.eta, fontSize: 24, lineHeight: 30, color: color.eta },
  dist: { fontSize: 17, fontWeight: '400', color: color.textSubtle },
  sub: { ...type.bodyMedium, color: color.textSubtle, marginTop: 2 },
  arrive: { alignItems: 'flex-end', marginTop: 4 },
  arriveTime: { ...type.label, color: color.text },
  arriveLabel: { ...type.caption, color: color.textSubtle },
  actions: { flexDirection: 'row', marginTop: spacing.lg },
});
