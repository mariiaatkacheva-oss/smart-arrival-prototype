import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { color, elevation, gemini, motion, spacing, type } from '../theme';
import { Button, IconButton, LikelihoodMeter, FadeIn, MetricStat } from './ui';
import { TIMING } from '../data/mockData';

// Generic AI sparkle (not a reproduction of any product logo).
export function Sparkle({ size = 26 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="spark" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={gemini.a} />
          <Stop offset="0.6" stopColor={gemini.b} />
          <Stop offset="1" stopColor={gemini.c} />
        </LinearGradient>
      </Defs>
      <Path d="M10 2 L12.2 8.3 L18.5 10.5 L12.2 12.7 L10 19 L7.8 12.7 L1.5 10.5 L7.8 8.3 Z" fill="url(#spark)" />
      <Path d="M18.5 14.5 L19.5 17 L22 18 L19.5 19 L18.5 21.5 L17.5 19 L15 18 L17.5 17 Z" fill="url(#spark)" />
    </Svg>
  );
}

// "Ask Gemini" entry point while driving: present but not dominant.
// A thin multicolour ring is the only accent, so it reads as Gemini without
// looking like a chatbot launcher.
export function GeminiButton({ onPress, style }) {
  const [w, setW] = useState(0);
  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessibilityRole="button"
      accessibilityLabel="Ask Gemini"
      accessibilityHint="Change your parking plan by voice"
      style={({ pressed }) => [styles.pill, pressed && { backgroundColor: color.surfaceDim }, style]}
    >
      {w > 0 && (
        <Svg width={w} height={48} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={gemini.a} />
              <Stop offset="0.55" stopColor={gemini.b} />
              <Stop offset="1" stopColor={gemini.c} />
            </LinearGradient>
          </Defs>
          <Rect x={0.75} y={0.75} width={w - 1.5} height={46.5} rx={23.25} fill="none" stroke="url(#ring)" strokeWidth={1.5} />
        </Svg>
      )}
      <Sparkle size={20} />
      <Text style={styles.pillText}>Ask Gemini</Text>
    </Pressable>
  );
}

function GlowEdge() {
  return (
    <Svg width="100%" height={3} style={styles.glow} preserveAspectRatio="none" viewBox="0 0 100 3">
      <Defs>
        <LinearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={gemini.a} />
          <Stop offset="0.5" stopColor={gemini.b} />
          <Stop offset="1" stopColor={gemini.c} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={100} height={3} fill="url(#glow)" />
    </Svg>
  );
}

// Listening indicator: four bars that pulse only while listening.
function ListeningBars({ active }) {
  const anims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    let loop;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (reduce || !active) return;
        loop = Animated.loop(
          Animated.stagger(
            110,
            anims.map((a) =>
              Animated.sequence([
                Animated.timing(a, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(a, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
              ])
            )
          )
        );
        loop.start();
      })
      .catch(() => {});
    return () => loop && loop.stop();
  }, [active, anims]);
  const tints = [gemini.a, '#6E8EF0', gemini.b, gemini.c];
  return (
    <View style={styles.bars} accessibilityElementsHidden>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            { backgroundColor: tints[i], transform: [{ scaleY: a.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }] },
          ]}
        />
      ))}
    </View>
  );
}

// Compact floating Gemini surface over the live navigation map.
// Listening phases: 'listening' -> 'transcribing' -> 'thinking'; then the
// recommendation screen shows the result and the confirmation.
export default function GeminiSheet({ screen, script, option, onRespond, onAccept, onDismiss, onHeight }) {
  const insets = useSafeAreaInsets();
  const words = script.utterance.split(' ');
  const isRec = screen === 'GEMINI_RECOMMENDATION';
  const [shown, setShown] = useState(isRec ? words.length : 0);
  const [phase, setPhase] = useState(isRec ? 'done' : 'listening');

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: motion.standard, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter]);
  // Animate out before handing control back (close, keep, reroute).
  const leave = (then) => () =>
    Animated.timing(enter, { toValue: 0, duration: motion.fast, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => then());

  useEffect(() => {
    if (screen !== 'GEMINI_LISTENING') return undefined;
    const timers = [];
    timers.push(setTimeout(() => setPhase('transcribing'), TIMING.geminiListenStart));
    words.forEach((_, i) =>
      timers.push(setTimeout(() => setShown(i + 1), TIMING.geminiListenStart + (i + 1) * TIMING.geminiWordInterval))
    );
    const spoken = TIMING.geminiListenStart + words.length * TIMING.geminiWordInterval + 250;
    timers.push(setTimeout(() => setPhase('thinking'), spoken));
    timers.push(setTimeout(onRespond, spoken + TIMING.geminiThinking));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const status = phase === 'thinking' ? script.thinking : 'Listening…';
  const bottom = Math.max(insets.bottom, 10) + 6;

  return (
    <Animated.View
      style={[
        styles.card,
        { bottom },
        { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] },
      ]}
      onLayout={(e) => onHeight && onHeight(e.nativeEvent.layout.height + bottom)}
      accessibilityViewIsModal
    >
      <GlowEdge />
      <View style={styles.header}>
        <Sparkle size={20} />
        <Text style={styles.brand}>Gemini</Text>
        <View style={{ flex: 1 }} />
        <IconButton icon="close" size={44} accessibilityLabel="Close Gemini" onPress={leave(onDismiss)} />
      </View>

      {!isRec && (
        <View style={styles.body}>
          <View style={styles.statusRow} accessibilityLiveRegion="polite">
            <ListeningBars active />
            <Text style={styles.status}>{status}</Text>
          </View>
          {shown > 0 && (
            <Text style={styles.utterance} accessibilityLabel={`You said: ${script.utterance}`}>
              “{words.slice(0, shown).join(' ')}
              {shown === words.length ? '”' : ''}
            </Text>
          )}
        </View>
      )}

      {isRec && (
        <FadeIn from={6} style={styles.body}>
          <Text style={styles.title} accessibilityLiveRegion="polite" accessibilityLabel={script.response}>
            {script.title}
          </Text>
          {/* Same metric row as the parking option cards */}
          <View style={styles.facts}>
            <MetricStat icon="directions-car" value={`+${option.driveDetourMinutes} min`} label="drive" />
            <MetricStat icon="directions-walk" value={`${option.walkMinutes} min`} label="walk" />
            {option.type === 'street' ? (
              <MetricStat label="likelihood">
                <LikelihoodMeter level={option.likelihood} label="" />
              </MetricStat>
            ) : (
              <MetricStat icon="payments" value={option.price} label="est. cost" />
            )}
          </View>
          <Text style={styles.quote}>“{script.headline}”</Text>
          <View style={styles.actions}>
            <Button label="Keep current route" variant="outlined" onPress={leave(onDismiss)} style={{ flex: 1.3, paddingHorizontal: 10 }} />
            <Button label="Reroute" icon="alt-route" onPress={leave(onAccept)} style={{ flex: 1, marginLeft: 10, paddingHorizontal: 12 }} />
          </View>
        </FadeIn>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingLeft: 14,
    paddingRight: 18,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    ...elevation[2],
  },
  pillText: { ...type.label, fontSize: 15, marginLeft: spacing.sm, color: color.text },
  card: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...elevation[2],
  },
  glow: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 4, paddingTop: 4 },
  brand: { ...type.label, fontSize: 15, marginLeft: spacing.sm, color: color.text },
  body: { paddingHorizontal: 18, paddingBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', minHeight: 28 },
  status: { marginLeft: 12, fontSize: 15, color: color.textMuted },
  bars: { flexDirection: 'row', alignItems: 'center', height: 24 },
  bar: { width: 5, height: 8, borderRadius: 3, marginRight: 4 },
  utterance: { ...type.titleMedium, fontSize: 19, color: color.text, marginTop: spacing.sm + 2 },
  title: { ...type.titleLarge, fontWeight: '600', fontSize: 21, color: color.text },
  facts: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: color.surfaceDim,
  },
  quote: { ...type.bodyMedium, fontSize: 15, lineHeight: 21, color: color.textMuted, marginTop: spacing.sm + 2 },
  actions: { flexDirection: 'row', marginTop: 14 },
});
