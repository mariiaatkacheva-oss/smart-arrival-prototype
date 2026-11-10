import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color } from '../theme';
import { Icon, LikelihoodMeter } from './ui';

// Strip attached under the navigation banner once the car is close to the
// parking area. Facts and estimates are worded as such; no claim that a
// specific space is open.
export default function ArrivalModeBanner({ plan }) {
  const chips =
    plan.type === 'street'
      ? [
          { key: 'likelihood', meter: plan.likelihood },
          { key: 'meter', icon: 'payments', text: plan.price },
          { key: 'signs', icon: 'report-gmailerrorred', text: 'Check signs' },
        ]
      : plan.type === 'garage'
      ? [
          { key: 'price', icon: 'payments', text: `${plan.price} est.` },
          { key: 'entrance', icon: 'login', text: plan.restrictions },
        ]
      : [{ key: 'none', icon: 'info-outline', text: 'No parking plan' }];

  return (
    <View style={styles.strip}>
      {chips.map((c, i) => (
        <View key={c.key} style={styles.item}>
          {i > 0 && <Text style={styles.sep}>·</Text>}
          {c.meter ? (
            <LikelihoodMeter level={c.meter} compact />
          ) : (
            <>
              <Icon name={c.icon} size={15} color={color.textMuted} />
              <Text style={styles.text}>{c.text}</Text>
            </>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  item: { flexDirection: 'row', alignItems: 'center' },
  sep: { marginHorizontal: 8, fontSize: 13, color: color.textSubtle },
  text: { marginLeft: 4, fontSize: 13, color: color.text, fontWeight: '500' },
});
