import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, radius, size, spacing, type } from '../theme';
import { Button, Icon, LikelihoodMeter, Sheet } from './ui';
import { DESTINATION } from '../data/mockData';
import { driveMinutes, formatClock, formatDistance, totalArrivalMinutes, MILES_PER_UNIT } from '../logic/arrival';
import { buildRoute } from '../map/route';
import { pathLength } from '../map/geometry';

const DOT = 32; // stage marker size

// Connector between two stages. Drive is a solid line like the route on the
// map; the walk is dotted like the walking leg.
function Connector({ kind }) {
  if (kind === 'dotted') {
    return (
      <View style={styles.connector}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.dot} />
        ))}
      </View>
    );
  }
  return (
    <View style={styles.connector}>
      <View style={[styles.line, kind === 'drive' && { backgroundColor: color.route }]} />
    </View>
  );
}

function Stage({ marker, tint, value, valueStyle, detail, extra, connector }) {
  return (
    <View style={styles.stage}>
      <View style={styles.rail}>
        <View style={[styles.marker, { backgroundColor: tint }]}>{marker}</View>
        {connector && <Connector kind={connector} />}
      </View>
      <View style={[styles.stageText, connector && { paddingBottom: spacing.sm + 2 }]}>
        <Text style={[styles.value, valueStyle]}>{value}</Text>
        {!!detail && (
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        )}
        {extra}
      </View>
    </View>
  );
}

// Selected arrival plan as one continuous journey: drive -> park -> walk ->
// destination, inside a single tonal card.
export default function ArrivalRouteSheet({ plan, onStart, onChange, onHeight }) {
  const isStreet = plan.type === 'street';
  const route = buildRoute(plan.legs);
  const drive = driveMinutes(plan);
  const total = totalArrivalMinutes(plan);
  const miles = (route.length * MILES_PER_UNIT).toFixed(1);
  // Main road of the drive (longest leg after leaving the origin street).
  const via = [...plan.legs.slice(1)].sort((a, b) => pathLength(b.points) - pathLength(a.points))[0]?.street;
  const walkUnits = pathLength(plan.walkFrom(route.points[route.points.length - 1]));

  return (
    <Sheet onHeight={onHeight}>
      <View style={styles.card}>
        {/* Total first: the number the plan is optimised for */}
        <View style={styles.summary}>
          <View style={{ flex: 1 }}>
            <Text style={styles.total}>
              {total} min <Text style={styles.totalUnit}>total</Text>
            </Text>
            <Text style={styles.summarySub}>Drive, park and walk</Text>
          </View>
          <View style={styles.arrive}>
            <Text style={styles.arriveTime}>{formatClock(total)}</Text>
            <Text style={styles.arriveLabel}>arrive</Text>
          </View>
        </View>

        <View style={styles.timeline}>
          <Stage
            marker={<Icon name="directions-car" size={size.iconSm + 2} color={color.primary} />}
            tint={color.primaryTonal}
            value={`${drive} min drive`}
            detail={`${miles} mi · via ${via}`}
            connector="drive"
          />
          {isStreet ? (
            <Stage
              marker={<Text style={[styles.p, { color: color.zone }]}>P</Text>}
              tint={color.successContainer}
              value={`~${plan.parkingSearchMinutes} min parking search`}
              detail={`${plan.name} · ${plan.price}`}
              extra={
                <View style={{ marginTop: 3 }}>
                  <LikelihoodMeter level={plan.likelihood} compact />
                </View>
              }
              connector="plain"
            />
          ) : (
            <Stage
              marker={<Text style={[styles.p, { color: color.primary }]}>P</Text>}
              tint={color.primaryTonal}
              value={`Park at ${plan.name}`}
              detail={`${plan.price} est. · ${plan.restrictions}`}
              connector="plain"
            />
          )}
          <Stage
            marker={<Icon name="directions-walk" size={size.iconSm + 2} color={color.textMuted} />}
            tint={color.surfaceContainer}
            value={`${plan.walkMinutes} min walk`}
            detail={formatDistance(walkUnits)}
            connector="dotted"
          />
          <Stage
            marker={<Icon name="place" size={size.iconSm + 2} color={color.pin} />}
            tint="#FCE8E6"
            value={DESTINATION.name}
            valueStyle={styles.destValue}
            detail="The Embarcadero"
          />
        </View>
      </View>

      <View style={styles.actions}>
        <Button label="Change parking" variant="outlined" onPress={onChange} style={{ flex: 1 }} />
        <Button label="Start" icon="navigation" onPress={onStart} style={{ flex: 1.25, marginLeft: spacing.sm + 2 }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.containerLow,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm + 2,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: spacing.sm + 2,
    marginBottom: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.outlineVariant,
  },
  total: { ...type.eta, fontSize: 24, lineHeight: 30, color: color.eta },
  totalUnit: { fontSize: 17, fontWeight: '500', color: color.eta },
  summarySub: { ...type.bodyMedium, color: color.textSubtle },
  arrive: { alignItems: 'flex-end' },
  arriveTime: { ...type.label, fontSize: 15, color: color.text },
  arriveLabel: { ...type.caption, color: color.textSubtle },
  timeline: {},
  stage: { flexDirection: 'row' },
  rail: { width: DOT, alignItems: 'center' },
  marker: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  p: { fontSize: 15, fontWeight: '800' },
  connector: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: 3, minHeight: 14 },
  line: { width: 2, flex: 1, borderRadius: 1, backgroundColor: color.outline },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: color.textSubtle },
  stageText: { flex: 1, marginLeft: spacing.md, paddingTop: 5 },
  value: { ...type.metric, color: color.text },
  destValue: { fontWeight: '500' },
  detail: { ...type.bodyMedium, fontSize: 13, lineHeight: 18, color: color.textSubtle, marginTop: 1 },
  actions: { flexDirection: 'row', marginTop: spacing.md + 2 },
});
