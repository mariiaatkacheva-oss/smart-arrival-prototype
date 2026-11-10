import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, elevation, radius, spacing, type, motion } from '../theme';
import { Icon, IconButton } from './ui';

// Bottom navigation strip: exit, remaining time / distance / ETA, overview.
// `parking` shows the active arrival plan as a compact chip under it.
export default function BottomNavPanel({ minutes, distance, eta, parking, onExit, onHeight, children }) {
  const insets = useSafeAreaInsets();
  // Slides up after the Start tilt so the map transition reads first.
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: motion.standard, delay: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter]);
  return (
    <Animated.View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, spacing.md) },
        { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }] },
      ]}
      onLayout={(e) => onHeight && onHeight(e.nativeEvent.layout.height)}
    >
      {children}
      <View style={styles.row}>
        <IconButton icon="close" variant="tonal" size={44} accessibilityLabel="Exit navigation" onPress={onExit} />
        <View style={styles.center} accessible accessibilityLabel={`${minutes} minutes, ${distance}, arrive ${eta}`}>
          <Text style={styles.minutes}>{minutes} min</Text>
          <Text style={styles.meta}>
            {distance} · {eta}
          </Text>
        </View>
        <IconButton icon="alt-route" variant="tonal" size={44} accessibilityLabel="Route options (not available in prototype)" />
      </View>
      {parking && (
        <View style={styles.parking}>
          <Text style={[styles.pMark, { color: parking.type === 'garage' ? color.primary : color.zone }]}>P</Text>
          <Text style={styles.parkingText} numberOfLines={1}>
            {parking.name}
          </Text>
          <Text style={styles.dot}>·</Text>
          <Icon name="directions-walk" size={15} color={color.textSubtle} />
          <Text style={styles.parkingText}>{parking.walkMinutes} min walk</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    ...elevation.sheet,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center' },
  minutes: { ...type.etaLarge, color: color.eta },
  meta: { ...type.bodyMedium, fontSize: 15, color: color.textSubtle },
  parking: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.surfaceDim,
  },
  pMark: { fontSize: 13, fontWeight: '800', marginRight: 6 },
  parkingText: { ...type.labelSmall, fontSize: 13, color: color.textMuted, marginLeft: 2, flexShrink: 1 },
  dot: { marginHorizontal: 6, color: color.textSubtle },
});
