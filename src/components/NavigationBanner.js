import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, elevation, radius } from '../theme';
import { Icon } from './ui';

export const MANEUVER_VERB = {
  straight: 'Continue',
  left: 'Turn left',
  right: 'Turn right',
  'slight-left': 'Slight left',
  'slight-right': 'Slight right',
};

export const MANEUVER_ICON = {
  straight: 'straight',
  left: 'turn-left',
  right: 'turn-right',
  'slight-left': 'turn-slight-left',
  'slight-right': 'turn-slight-right',
  arrive: 'place',
};

// Top maneuver banner: instruction verb, street, distance. `parking` swaps
// the arrow for a P glyph in parking-guidance mode; `children` renders an
// attached secondary strip. Slides in on mount (after the Start tilt).
export default function NavigationBanner({ icon, parking, distance, verb, title, subtitle, then, children, onHeight, enterDelay = 0 }) {
  const insets = useSafeAreaInsets();
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 320, delay: enterDelay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Brief dip-and-return when the instruction changes. The content is always
  // mounted, so it can never get stuck invisible.
  const pulse = useRef(new Animated.Value(1)).current;
  const modeKey = `${parking ? 'p' : 'n'}:${title}`;
  useEffect(() => {
    pulse.setValue(0.35);
    Animated.timing(pulse, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [modeKey, pulse]);
  return (
    <Animated.View
      style={[
        styles.wrap,
        { top: insets.top + 6 },
        { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] },
      ]}
      onLayout={(e) => onHeight && onHeight(e.nativeEvent.layout.height + insets.top + 6)}
      accessibilityRole="header"
      accessibilityLiveRegion="polite"
    >
      <Animated.View style={[styles.main, { opacity: pulse }]}>
        <View style={styles.iconCol}>
          {parking ? (
            <View style={styles.pGlyph}>
              <Text style={styles.pGlyphText}>P</Text>
            </View>
          ) : (
            <Icon name={icon} size={44} color="#FFFFFF" />
          )}
          {!!distance && <Text style={styles.distance}>{distance}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          {!!verb && <Text style={styles.verb}>{verb}</Text>}
          <Text style={[styles.title, title.length > 26 && styles.titleLong]} numberOfLines={3}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </Animated.View>
      {then && (
        <View style={styles.then}>
          <Text style={styles.thenText}>Then</Text>
          <Icon name={then.icon} size={20} color="#FFFFFF" />
          {!!then.text && <Text style={[styles.thenText, { marginLeft: 6 }]}>{then.text}</Text>}
        </View>
      )}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderRadius: radius.xl,
    backgroundColor: color.navGreen,
    overflow: 'hidden',
    ...elevation[2],
  },
  main: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  iconCol: { alignItems: 'center', marginRight: 16, minWidth: 56 },
  distance: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginTop: 2 },
  verb: { color: 'rgba(255,255,255,0.86)', fontSize: 15, fontWeight: '500' },
  pGlyph: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pGlyphText: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 26, lineHeight: 31, fontWeight: '600', letterSpacing: -0.4 },
  titleLong: { fontSize: 21, lineHeight: 26 },
  subtitle: { color: 'rgba(255,255,255,0.88)', fontSize: 15, marginTop: 2 },
  then: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.navGreenDark,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  thenText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginRight: 6 },
});
