import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, elevation, radius, size, spacing, type, motion } from '../theme';
import { Icon, IconButton } from './ui';
import { Sparkle } from './GeminiSheet';
import { HOME_CHIPS, RECENT_SEARCHES, SEARCH_CATALOG } from '../data/mockData';

const BAR_H = 60;

// Spring-in used by the floating search surfaces.
function useSpringIn(from = 0.96) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, ...motion.spring, useNativeDriver: true }).start();
  }, [v]);
  return {
    opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }],
  };
}

// Home: large floating search surface plus small category chips.
export function HomeSearchBar({ onPress }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.homeWrap, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="search"
        accessibilityLabel="Where to? Search"
        style={({ pressed }) => [styles.bar, pressed && { transform: [{ scale: 0.99 }] }]}
      >
        <Icon name="search" size={size.iconLg} color={color.text} style={{ marginLeft: 18, marginRight: 12 }} />
        <Text style={styles.placeholder}>Where to?</Text>
        <View style={styles.barAction} accessibilityElementsHidden>
          <Sparkle size={20} />
        </View>
        <View style={styles.avatar}>
          <Icon name="person" size={size.icon} color={color.surface} />
        </View>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
        {HOME_CHIPS.map((c) => (
          <View key={c.label} style={styles.chip} accessibilityElementsHidden importantForAccessibility="no">
            <Icon name={c.icon} size={size.iconSm + 2} color={color.textMuted} />
            <Text style={styles.chipText}>{c.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Highlight({ text, query }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return <Text style={styles.resultTitle}>{text}</Text>;
  return (
    <Text style={[styles.resultTitle, { fontWeight: '400' }]}>
      {text.slice(0, i)}
      <Text style={{ fontWeight: '600' }}>{text.slice(i, i + query.length)}</Text>
      {text.slice(i + query.length)}
    </Text>
  );
}

function ResultRow({ item, query, recent, onPress, first }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.subtitle}, ${item.distance}`}
      style={({ pressed }) => [styles.resultRow, !first && styles.resultRowGap, pressed && styles.resultPressed]}
    >
      <View style={[styles.resultIcon, item.selectable && { backgroundColor: color.primaryTonal }]}>
        <Icon
          name={recent ? 'schedule' : 'place'}
          size={size.icon}
          color={item.selectable ? color.primary : color.textMuted}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Highlight text={item.title} query={query} />
        <Text style={styles.resultSub} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      <Text style={styles.resultDistance}>{item.distance}</Text>
    </Pressable>
  );
}

// A rounded group of rows (no hard dividers).
function Group({ title, children }) {
  return (
    <View style={styles.groupWrap}>
      {!!title && <Text style={styles.groupTitle}>{title}</Text>}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

// Active search: the floating bar expands into a full search surface.
export function SearchPanel({ query, onChangeQuery, onClose, onSelect }) {
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState(null);
  const q = query.trim();
  const enter = useSpringIn(0.97);

  const results = useMemo(() => {
    if (!q) return [];
    const lq = q.toLowerCase();
    return SEARCH_CATALOG.filter((p) => p.title.toLowerCase().includes(lq) || p.subtitle.toLowerCase().includes(lq)).sort(
      (a, b) => Number(!!b.selectable) - Number(!!a.selectable)
    );
  }, [q]);

  const pick = (item) => {
    if (item.selectable) {
      Keyboard.dismiss();
      onSelect(item);
    } else {
      setNotice('This prototype follows the Pier 3 scenario.');
    }
  };

  const submit = () => {
    const match = results.find((r) => r.selectable);
    if (match) pick(match);
  };

  const recents = RECENT_SEARCHES.map((id) => SEARCH_CATALOG.find((p) => p.id === id));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.panel, { paddingTop: insets.top + spacing.sm }, enter]}>
      <View style={styles.inputBar}>
        <IconButton icon="arrow-back" accessibilityLabel="Back" onPress={onClose} />
        <TextInput
          autoFocus
          value={query}
          onChangeText={(t) => {
            setNotice(null);
            onChangeQuery(t);
          }}
          onSubmitEditing={submit}
          placeholder="Where to?"
          placeholderTextColor={color.textSubtle}
          returnKeyType="search"
          autoCorrect={false}
          selectionColor={color.primary}
          style={styles.input}
          accessibilityLabel="Where to?"
        />
        {query ? (
          <IconButton icon="close" accessibilityLabel="Clear search" onPress={() => onChangeQuery('')} />
        ) : (
          <IconButton icon="mic" tint={color.primary} accessibilityLabel="Voice search (not available in prototype)" />
        )}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {!q && (
          <Group title="Recent">
            {recents.map((item, i) => (
              <ResultRow key={item.id} first={i === 0} item={item} recent onPress={() => pick(item)} />
            ))}
          </Group>
        )}
        {!!q && results.length > 0 && (
          <Group>
            {results.map((item, i) => (
              <ResultRow key={item.id} first={i === 0} item={item} query={q} onPress={() => pick(item)} />
            ))}
          </Group>
        )}
        {!!q && results.length === 0 && <Text style={styles.empty}>No results in this demo. Try “Pier 3”.</Text>}
        {notice && (
          <View style={styles.notice} accessibilityLiveRegion="polite">
            <Icon name="info-outline" size={18} color={color.textMuted} />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

// Destination / route context: floating pill showing the selected place.
export function PlaceSearchBar({ title, onBack, onClose }) {
  const insets = useSafeAreaInsets();
  const enter = useSpringIn(0.97);
  return (
    <Animated.View style={[styles.homeWrap, { top: insets.top + spacing.sm }, enter]} pointerEvents="box-none">
      <View style={styles.bar}>
        <IconButton icon="arrow-back" accessibilityLabel="Back to search" onPress={onBack} style={{ marginLeft: 6 }} />
        <Text style={[styles.placeholder, { color: color.text }]} numberOfLines={1}>
          {title}
        </Text>
        <IconButton icon="close" accessibilityLabel="Clear destination" onPress={onClose} style={{ marginRight: 6 }} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  homeWrap: { position: 'absolute', left: spacing.md, right: spacing.md },
  bar: {
    height: BAR_H,
    borderRadius: BAR_H / 2,
    backgroundColor: color.surface,
    flexDirection: 'row',
    alignItems: 'center',
    ...elevation[2],
  },
  placeholder: { flex: 1, fontSize: 18, color: color.textMuted },
  barAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5B7FBF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chipScroll: { marginHorizontal: -spacing.md, marginTop: spacing.sm + 2 },
  chips: { paddingHorizontal: spacing.md, gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: color.surface,
    ...elevation[1],
  },
  chipText: { ...type.label, marginLeft: 6, color: color.text },
  panel: { backgroundColor: color.background },
  inputBar: {
    marginHorizontal: spacing.md,
    height: BAR_H,
    borderRadius: BAR_H / 2,
    backgroundColor: color.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    ...elevation[1],
  },
  input: { flex: 1, fontSize: 18, color: color.text, height: BAR_H, paddingHorizontal: 4 },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 40 },
  groupWrap: { marginBottom: spacing.lg },
  groupTitle: { ...type.label, color: color.textMuted, marginLeft: spacing.sm, marginBottom: spacing.sm },
  group: { backgroundColor: color.surface, borderRadius: radius.xxl, padding: 6 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 10,
    borderRadius: radius.lg,
  },
  resultRowGap: { marginTop: 2 },
  resultPressed: { backgroundColor: color.containerLow },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.containerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  resultTitle: { ...type.titleSmall, color: color.text },
  resultSub: { ...type.bodyMedium, color: color.textSubtle, marginTop: 1 },
  resultDistance: { ...type.caption, color: color.textSubtle, marginLeft: spacing.sm },
  empty: { ...type.body, color: color.textMuted, padding: spacing.lg },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  noticeText: { ...type.bodyMedium, marginLeft: spacing.sm, color: color.textMuted, flex: 1 },
});
