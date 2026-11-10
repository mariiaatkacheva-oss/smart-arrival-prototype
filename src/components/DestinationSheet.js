import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, radius, size, spacing, type } from '../theme';
import { Icon, Sheet } from './ui';
import { Sparkle } from './GeminiSheet';
import { DESTINATION, TRIP } from '../data/mockData';

function Glance({ icon, value, label, tint = color.textMuted }) {
  return (
    <View style={styles.glance}>
      <Icon name={icon} size={size.icon} color={tint} />
      <Text style={styles.glanceValue}>{value}</Text>
      <Text style={styles.glanceLabel}>{label}</Text>
    </View>
  );
}

function DockAction({ label, icon, leading, onPress, primary, accessibilityLabel }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        styles.action,
        primary ? styles.actionPrimary : styles.actionSecondary,
        pressed && (primary ? { backgroundColor: color.primaryPressed } : { backgroundColor: color.surfaceContainer }),
      ]}
    >
      {leading || <Icon name={icon} size={size.icon - 2} color={primary ? color.surface : color.text} />}
      <Text style={[styles.actionText, { color: primary ? color.surface : color.text }]}>{label}</Text>
    </Pressable>
  );
}

// Place details: title + context, grouped glance metadata, and a docked
// action row where Directions stays primary.
export default function DestinationSheet({ onDirections, onAskGemini, onHeight }) {
  const [saved, setSaved] = useState(false);
  const busyParking = DESTINATION.parkingDifficulty !== 'easy';
  return (
    <Sheet onHeight={onHeight} padded={false}>
      <View style={styles.pad}>
        <Text style={styles.title} accessibilityRole="header">
          {DESTINATION.name}
        </Text>
        <Text style={styles.context}>
          {DESTINATION.category} · The Embarcadero, San Francisco
        </Text>

        <View style={styles.glanceGroup}>
          <Glance icon="directions-car" value={`${TRIP.baseDriveMinutes} min`} label="drive" />
          <View style={styles.glanceSep} />
          <Glance icon="straighten" value={`${TRIP.baseMiles} mi`} label="away" />
          {busyParking && (
            <>
              <View style={styles.glanceSep} />
              <Glance icon="local-parking" value="Limited" label="parking nearby" tint={color.likelyMedium} />
            </>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dock}>
        <DockAction icon="directions" label="Directions" primary onPress={onDirections} />
        <DockAction label="Ask Gemini" leading={<Sparkle size={18} />} onPress={onAskGemini} />
        <DockAction
          icon={saved ? 'bookmark' : 'bookmark-border'}
          label={saved ? 'Saved' : 'Save'}
          onPress={() => setSaved((s) => !s)}
        />
        <DockAction icon="share" label="Share" />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: spacing.xl },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '500', letterSpacing: -0.4, color: color.text },
  context: { ...type.body, color: color.textSubtle, marginTop: 2 },
  glanceGroup: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: color.containerLow,
    borderRadius: radius.xxl,
    paddingVertical: spacing.md + 2,
    marginTop: spacing.lg,
  },
  glance: { flex: 1, alignItems: 'center' },
  glanceSep: { width: 1, backgroundColor: color.divider, marginVertical: 4 },
  glanceValue: { ...type.metric, color: color.text, marginTop: 6 },
  glanceLabel: { ...type.caption, color: color.textSubtle, marginTop: 1 },
  dock: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: 22,
    gap: spacing.sm,
  },
  actionPrimary: { backgroundColor: color.primary, paddingHorizontal: spacing.xl },
  actionSecondary: { backgroundColor: color.containerLow },
  actionText: { ...type.label },
});
