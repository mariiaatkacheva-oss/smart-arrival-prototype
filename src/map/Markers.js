import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { color, elevation } from '../theme';

// Map markers are native views positioned over the SVG map, so icons and
// text stay crisp and the same size at every zoom.

function Anchored({ x, y, w, h, ax = 0.5, ay = 0.5, children, style, pointerEvents = 'none' }) {
  return (
    <View
      pointerEvents={pointerEvents}
      style={[{ position: 'absolute', left: x - w * ax, top: y - h * ay, width: w, height: h }, style]}
    >
      {children}
    </View>
  );
}

export function LocationDot({ x, y }) {
  return (
    <Anchored x={x} y={y} w={56} h={56}>
      <View style={styles.locHalo} />
      <View style={styles.locDot} />
    </Anchored>
  );
}

export function DestinationPin({ x, y, label, compact }) {
  return (
    <>
      <Anchored x={x} y={y} w={30} h={42} ay={1}>
        <Svg width={30} height={42} viewBox="0 0 30 42">
          <Path
            d="M15 1C7.3 1 1.5 6.9 1.5 14.4c0 9.6 11.2 21.4 12.6 25.6.3.8 1.5.8 1.8 0C17.3 35.8 28.5 24 28.5 14.4 28.5 6.9 22.7 1 15 1z"
            fill={color.pin}
            stroke={color.pinDark}
            strokeWidth={1.2}
          />
          <Circle cx={15} cy={14.5} r={5} fill={color.pinDark} />
        </Svg>
      </Anchored>
      {!!label && !compact && (
        <Anchored x={x + 20} y={y - 26} w={120} h={22} ax={0} ay={0.5}>
          <Text style={styles.pinLabel} numberOfLines={1}>
            {label}
          </Text>
        </Anchored>
      )}
    </>
  );
}

export function CarPuck({ x, y, heading }) {
  return (
    <Anchored x={x} y={y} w={48} h={48} style={{ transform: [{ rotate: `${heading}deg` }] }}>
      <Svg width={48} height={48} viewBox="0 0 48 48">
        <Defs>
          <RadialGradient id="puckShadow" cx="24" cy="26" r="20" gradientUnits="userSpaceOnUse">
            <Stop offset="0.55" stopColor="#000" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={24} cy={26} r={18} fill="url(#puckShadow)" />
        <Path d="M24 6 L37 38 L24 31 L11 38 Z" fill={color.route} stroke="#FFFFFF" strokeWidth={3} strokeLinejoin="round" />
      </Svg>
    </Anchored>
  );
}

export function WalkerDot({ x, y, heading }) {
  return (
    <Anchored x={x} y={y} w={64} h={64} style={{ transform: [{ rotate: `${heading}deg` }] }}>
      <Svg width={64} height={64} viewBox="0 0 64 64">
        <Defs>
          <RadialGradient id="beam" cx="32" cy="32" r="30" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color.locationDot} stopOpacity="0.45" />
            <Stop offset="1" stopColor={color.locationDot} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path d="M32 32 L18 4 A30 30 0 0 1 46 4 Z" fill="url(#beam)" />
        <Circle cx={32} cy={32} r={9} fill={color.locationDot} stroke="#FFFFFF" strokeWidth={3} />
      </Svg>
    </Anchored>
  );
}

export function GarageMarker({ x, y, label, selected, onPress, accessibilityLabel, flat }) {
  const size = selected ? 34 : 28;
  return (
    <Anchored x={x} y={y} w={140} h={44} ax={size / 2 / 140} ay={0.5} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={8}
        style={styles.row}
      >
        <View style={[styles.garage, { width: size, height: size }, selected && styles.garageSelected, flat && styles.flat]}>
          <Text style={[styles.garageP, selected && { fontSize: 18 }]}>P</Text>
        </View>
        {!!label && (
          <View style={[styles.markerChip, selected && styles.markerChipSelected, flat && styles.flatChip]}>
            <Text style={[styles.markerChipText, selected && styles.markerChipTextSelected]}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Anchored>
  );
}

export function ZoneChip({ x, y, label, active, onPress, accessibilityLabel, side, flat }) {
  // Vertical zones put the chip beside the curb so it doesn't cover the pin.
  const left = side === 'left';
  return (
    <Anchored
      x={left ? x - 16 : x}
      y={y}
      w={190}
      h={40}
      ax={left ? 1 : 0.5}
      ay={0.5}
      pointerEvents="box-none"
      style={left ? styles.endAligned : styles.center}
    >
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={accessibilityLabel}
        hitSlop={6}
        style={[styles.zoneChip, active ? styles.zoneChipActive : styles.zoneChipMuted, flat && styles.flat]}
      >
        <View style={[styles.zoneP, !active && { backgroundColor: color.zoneMuted }]}>
          <Text style={styles.zonePText}>P</Text>
        </View>
        <Text style={[styles.zoneChipText, active && { color: '#0D5223' }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Anchored>
  );
}

export function RouteBubble({ x, y, label, muted, sub }) {
  return (
    <Anchored x={x} y={y} w={110} h={40} ax={0.5} ay={1} style={styles.center}>
      <View style={[styles.bubble, muted && styles.bubbleMuted]}>
        <Text style={[styles.bubbleText, muted && styles.bubbleTextMuted]}>{label}</Text>
        {!!sub && <Text style={[styles.bubbleSub, muted && styles.bubbleTextMuted]}>{sub}</Text>}
      </View>
    </Anchored>
  );
}

export function ParkedCar({ x, y, label, flat }) {
  return (
    <Anchored x={x} y={y} w={150} h={40} ax={18 / 150} ay={0.5}>
      <View style={styles.row}>
        <View style={[styles.parked, flat && styles.flat]}>
          <MaterialIcons name="directions-car" size={20} color="#fff" />
        </View>
        {!!label && (
          <View style={[styles.markerChip, flat && styles.flatChip]}>
            <Text style={styles.markerChipText}>{label}</Text>
          </View>
        )}
      </View>
    </Anchored>
  );
}

// Drive -> walk handoff point at the end of a street-parking zone.
export function HandoffMarker({ x, y, flat }) {
  return (
    <Anchored x={x} y={y} w={26} h={26}>
      <View style={[styles.handoff, flat && styles.flat]}>
        <MaterialIcons name="directions-walk" size={15} color={color.zone} />
      </View>
    </Anchored>
  );
}

export function PoiMarker({ x, y, name, icon, tint }) {
  return (
    <Anchored x={x} y={y} w={170} h={26} ax={11 / 170} ay={0.5}>
      <View style={styles.row}>
        <View style={[styles.poi, { backgroundColor: tint }]}>
          <MaterialIcons name={icon} size={13} color="#fff" />
        </View>
        <Text style={[styles.poiText, { color: tint }]} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </Anchored>
  );
}

const halo = { textShadowColor: '#FFFFFF', textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 } };

const styles = StyleSheet.create({
  // Markers that move every frame (3D view) skip iOS shadows, which force an
  // offscreen pass whenever the layer moves; a hairline keeps them defined.
  flat: { shadowOpacity: 0, elevation: 0 },
  flatChip: { shadowOpacity: 0, elevation: 0, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(60,64,67,0.25)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  endAligned: { alignItems: 'flex-end', justifyContent: 'center' },
  locHalo: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(26,115,232,0.16)',
  },
  locDot: {
    position: 'absolute',
    left: 18,
    top: 18,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.locationDot,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...elevation[1],
  },
  pinLabel: { fontSize: 14, fontWeight: '700', color: color.pinDark, ...halo },
  garage: {
    borderRadius: 7,
    backgroundColor: color.garage,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation[1],
  },
  garageSelected: { borderWidth: 3 },
  garageP: { color: '#fff', fontWeight: '800', fontSize: 15 },
  markerChip: {
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    ...elevation[1],
  },
  markerChipSelected: { backgroundColor: color.primary },
  markerChipText: { fontSize: 12, fontWeight: '600', color: color.text },
  markerChipTextSelected: { color: '#FFFFFF' },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 3,
    paddingRight: 10,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    ...elevation[1],
  },
  zoneChipActive: { backgroundColor: '#E6F4EA', borderColor: color.zone },
  zoneChipMuted: { backgroundColor: '#FFFFFF', borderColor: '#C9CFCB' },
  zoneP: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.zone,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  zonePText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  zoneChipText: { fontSize: 12, fontWeight: '600', color: color.textMuted },
  bubble: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: color.route,
    alignItems: 'center',
    ...elevation[1],
  },
  bubbleMuted: { backgroundColor: '#FFFFFF' },
  bubbleText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  bubbleSub: { color: '#FFFFFF', fontSize: 11 },
  bubbleTextMuted: { color: color.textMuted },
  parked: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.primary,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation[2],
  },
  handoff: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: color.zone,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation[1],
  },
  poi: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  poiText: { marginLeft: 4, fontSize: 12, fontWeight: '600', ...halo },
});
