import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { color, radius, type } from '../theme';
import { Button, Icon, Sheet } from './ui';
import { DESTINATION } from '../data/mockData';

export default function ParkedSheet({ plan, saved, onSave, onWalk, onHeight }) {
  const where = plan.type === 'destination' ? `Near ${DESTINATION.name}` : plan.name;
  // One short "settled" pop when the car is marked as parked.
  const pop = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.timing(pop, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start();
  }, [pop]);

  return (
    <Sheet onHeight={onHeight}>
      <View style={styles.row}>
        <Animated.View style={[styles.icon, { transform: [{ scale: pop }] }]}>
          <Icon name="directions-car" size={22} color="#FFFFFF" />
        </Animated.View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={type.titleSm} accessibilityRole="header">
            Looks like you parked here
          </Text>
          <Text style={styles.sub}>{where}</Text>
        </View>
      </View>

      <View style={styles.next}>
        <Icon name="place" size={22} color={color.pin} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.nextTitle}>{DESTINATION.name}</Text>
          <Text style={styles.nextSub}>The Embarcadero</Text>
        </View>
        <Icon name="directions-walk" size={20} color={color.eta} />
        <Text style={styles.walk}>{plan.walkMinutes} min</Text>
      </View>

      <View style={styles.actions}>
        <Button
          label={saved ? 'Saved' : 'Save parking'}
          icon={saved ? 'bookmark-added' : 'bookmark-border'}
          variant={saved ? 'tonal' : 'outlined'}
          onPress={onSave}
          style={{ flex: 1 }}
        />
        <Button label={`Walk to ${DESTINATION.name}`} icon="directions-walk" onPress={onWalk} style={{ flex: 1.3, marginLeft: 10 }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: { fontSize: 14, color: color.textSubtle, marginTop: 2 },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
  },
  nextTitle: { fontSize: 15, fontWeight: '600', color: color.text },
  nextSub: { fontSize: 13, color: color.textSubtle },
  walk: { fontSize: 17, fontWeight: '700', color: color.eta, marginLeft: 4 },
  actions: { flexDirection: 'row', marginTop: 14 },
});
