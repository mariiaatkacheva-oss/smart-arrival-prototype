import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

// Dev-only render/frame instrumentation. Off by default.
// PERF_LOG: write 2-second averages to the Metro log.
// PERF_HUD: draw the latest averages on screen (works in release builds).
export const PERF_LOG = false;
export const PERF_HUD = false;

const buckets = {};
const latest = {};
export function perfSample(name, value) {
  if (!PERF_LOG && !PERF_HUD) return;
  const b = (buckets[name] = buckets[name] || { n: 0, sum: 0, max: 0, t0: Date.now() });
  b.n += 1;
  b.sum += value;
  b.max = Math.max(b.max, value);
  if (Date.now() - b.t0 > 2000) {
    latest[name] = `${(b.sum / b.n).toFixed(1)} (max ${b.max.toFixed(0)}, n ${b.n})`;
    // eslint-disable-next-line no-console
    if (PERF_LOG) console.log(`[perf] ${name}: n=${b.n}/2s avg=${(b.sum / b.n).toFixed(2)} max=${b.max.toFixed(2)}`);
    buckets[name] = { n: 0, sum: 0, max: 0, t0: Date.now() };
  }
}
export const now = () => (global.performance && performance.now ? performance.now() : Date.now());

export function PerfHud() {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!PERF_HUD) return undefined;
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!PERF_HUD) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 8, top: 300, backgroundColor: 'rgba(0,0,0,0.75)', padding: 6, borderRadius: 6 }}>
      {Object.entries(latest).map(([k, v]) => (
        <Text key={k} style={{ color: '#0f0', fontSize: 10, fontFamily: 'Menlo' }}>
          {k}: {v}
        </Text>
      ))}
    </View>
  );
}
