import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { color, radius, spacing, type, motion } from '../theme';
import { Button } from './ui';
import { Sparkle } from './GeminiSheet';
import { DESTINATION } from '../data/mockData';

// Smart Arrival entry point: a tinted contextual suggestion inside the route
// preview, attributed to Gemini, with one primary and one quiet action.
export default function ParkingPrompt({ onPlan, onDismiss }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, ...motion.spring, useNativeDriver: true }).start();
  }, [v]);
  return (
    <Animated.View
      style={{
        opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
        ],
      }}
    >
      <View style={styles.card} accessibilityLiveRegion="polite">
        <View style={styles.brandRow}>
          <Sparkle size={16} />
          <Text style={styles.brand}>Gemini</Text>
        </View>
        <Text style={styles.title}>Parking may be difficult near {DESTINATION.name}</Text>
        <Text style={styles.body}>Plan parking before you start?</Text>
        <View style={styles.actions}>
          <Button label="Plan parking" icon="local-parking" compact onPress={onPlan} />
          <Button label="Not now" variant="text" compact onPress={onDismiss} style={{ marginLeft: spacing.xs }} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.containerTint,
    borderRadius: radius.xxl,
    paddingTop: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    marginTop: spacing.lg,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  brand: { ...type.labelSmall, color: color.textMuted, marginLeft: 6 },
  title: { ...type.titleSmall, fontSize: 17, lineHeight: 23, color: color.text },
  body: { ...type.bodyMedium, color: color.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
});
