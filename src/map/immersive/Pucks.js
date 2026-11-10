import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop, Circle } from 'react-native-svg';

// Markers laid onto the tilted ground plane. The tilt is done inside the SVG
// (rotate, then squash vertically) rather than with a native 3D transform:
// on iOS a rotateX layer can disturb the compositing order of sibling views
// and hide overlays such as the maneuver banner.
const squash = (pitch) => Math.max(0.42, Math.cos((pitch * 0.85 * Math.PI) / 180));

export function CarPuck3D({ x, y, heading, pitch }) {
  const size = 72;
  const k = squash(pitch);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 72 72">
        <Defs>
          <RadialGradient id="cs" cx="36" cy="40" r="28" gradientUnits="userSpaceOnUse">
            <Stop offset="0.4" stopColor="#0B2A5B" stopOpacity="0.32" />
            <Stop offset="1" stopColor="#0B2A5B" stopOpacity="0" />
          </RadialGradient>
          {/* Two-tone fill reads as a raised, faceted chevron */}
          <LinearGradient id="cl" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#5A97F7" />
            <Stop offset="0.5" stopColor="#5A97F7" />
            <Stop offset="0.5" stopColor="#1558C6" />
            <Stop offset="1" stopColor="#1558C6" />
          </LinearGradient>
        </Defs>
        <G transform={`translate(36 36) scale(1 ${k.toFixed(3)}) rotate(${heading.toFixed(1)}) translate(-36 -36)`}>
          <Ellipse cx={36} cy={40} rx={25} ry={23} fill="url(#cs)" />
          <Path d="M36 9 L55 54 L36 44.5 L17 54 Z" fill="#FFFFFF" />
          <Path d="M36 14.5 L50 49.5 L36 42 L22 49.5 Z" fill="url(#cl)" />
        </G>
      </Svg>
    </View>
  );
}

export function WalkerPuck3D({ x, y, heading, pitch }) {
  const size = 72;
  const k = squash(pitch);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 72 72">
        <Defs>
          <RadialGradient id="wb" cx="36" cy="36" r="34" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#1A73E8" stopOpacity="0.45" />
            <Stop offset="1" stopColor="#1A73E8" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <G transform={`translate(36 36) scale(1 ${k.toFixed(3)}) rotate(${heading.toFixed(1)}) translate(-36 -36)`}>
          <Path d="M36 36 L20 4 A34 34 0 0 1 52 4 Z" fill="url(#wb)" />
        </G>
        <Circle cx={36} cy={36} r={10} fill="#1A73E8" stroke="#FFFFFF" strokeWidth={3.5} />
      </Svg>
    </View>
  );
}
