import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, radius, size, spacing, type } from '../theme';
import { Icon, Sheet } from './ui';
import { RECENT_SEARCHES, SEARCH_CATALOG } from '../data/mockData';

// Lightweight peek sheet on the home map: recent places as contained cards
// instead of an old-style tab bar.
export default function HomeSheet({ onSelect, onUnavailable, onHeight }) {
  const recents = RECENT_SEARCHES.map((id) => SEARCH_CATALOG.find((p) => p.id === id));
  return (
    <Sheet onHeight={onHeight} padded={false}>
      <Text style={styles.title}>Recent</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {recents.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => (p.selectable ? onSelect(p) : onUnavailable())}
            accessibilityRole="button"
            accessibilityLabel={`${p.title}, ${p.distance}`}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={[styles.icon, p.selectable && { backgroundColor: color.primaryTonal }]}>
              <Icon name="schedule" size={size.iconSm + 2} color={p.selectable ? color.primary : color.textMuted} />
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {p.title}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {p.distance}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.concept}>Smart Arrival · independent concept prototype, not a Google product</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { ...type.titleSmall, color: color.text, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  row: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  card: {
    width: 132,
    padding: spacing.md,
    borderRadius: radius.xxl,
    backgroundColor: color.containerLow,
  },
  cardPressed: { backgroundColor: color.surfaceContainer, transform: [{ scale: 0.98 }] },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: { ...type.titleSmall, fontSize: 15, color: color.text },
  cardSub: { ...type.caption, color: color.textSubtle, marginTop: 1 },
  concept: { ...type.caption, fontSize: 11, color: color.textSubtle, textAlign: 'center', marginTop: spacing.md },
});
