import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { color, elevation } from '../theme';
import { Icon, IconButton, FadeIn } from './ui';
import { Sparkle } from './GeminiSheet';

// Small round map control (layers, location, sound). Decorative in the
// prototype unless an onPress is provided.
export function MapFab({ icon, style, accessibilityLabel, onPress, size = 48, tint = color.textMuted }) {
  return (
    <IconButton
      icon={icon}
      filled
      size={size}
      tint={tint}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={[{ position: 'absolute' }, style]}
    />
  );
}

// Bottom snackbar for short informational messages in planning screens.
export function Snackbar({ text, bottom }) {
  if (!text) return null;
  return (
    <FadeIn from={10} style={[styles.snackWrap, { bottom }]}>
      <View style={styles.snack} accessibilityLiveRegion="polite">
        <Text style={styles.snackText}>{text}</Text>
      </View>
    </FadeIn>
  );
}

export function DemoSkip({ onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Demo control: skip ahead"
      hitSlop={10}
      style={({ pressed }) => [styles.skip, pressed && { opacity: 1 }, style]}
    >
      <Text style={styles.skipText}>Demo next ›</Text>
    </Pressable>
  );
}

// `gemini` attributes the message to Gemini with its spark glyph.
export function Toast({ icon = 'check-circle', text, style, gemini }) {
  return (
    <FadeIn from={-8} style={[styles.toast, style]}>
      <View style={styles.toastRow} accessibilityLiveRegion="polite">
        {gemini ? <Sparkle size={18} /> : <Icon name={icon} size={18} color="#FFFFFF" />}
        {gemini && <Text style={styles.toastBrand}>Gemini</Text>}
        <Text style={styles.toastText}>{text}</Text>
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  snackWrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  snack: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#303134',
    ...elevation[2],
  },
  snackText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  skip: {
    position: 'absolute',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    backgroundColor: 'rgba(32,33,36,0.55)',
    opacity: 0.7,
  },
  skipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#202124',
    ...elevation[2],
  },
  toastBrand: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  toastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 8 },
});
