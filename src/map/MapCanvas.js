import React, { memo, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { color } from '../theme';
import { BaseGeometry, Buildings, Labels, TILE, LABEL_TILE, roadPx } from './BaseMap';
import { toPath, toSmoothPath, offsetPolyline } from './geometry';
import { POIS } from './geography';
import {
  DestinationPin,
  GarageMarker,
  HandoffMarker,
  LocationDot,
  ParkedCar,
  PoiMarker,
  RouteBubble,
  ZoneChip,
} from './Markers';

// ---------------------------------------------------------------------------
// Camera
//
// A camera is { cx, cy, z }: the map point shown at the centre of the screen
// and the zoom in pixels per map unit. Specs describe where the camera should
// be; the canvas animates between them.
//
//   { mode: 'fit', bounds, insets, maxZoom }
//   { mode: 'follow', zoom, focalY }     (follows the moving vehicle)

const CAMERA_MS = 600;

function resolveCamera(spec, W, H, vehicle) {
  if (spec.mode === 'follow' && vehicle) {
    const fy = spec.focalY * H;
    return { cx: vehicle.x, cy: vehicle.y + (H / 2 - fy) / spec.zoom, z: spec.zoom };
  }
  const b = spec.bounds;
  const ins = { top: 0, bottom: 0, left: 24, right: 24, ...spec.insets };
  const availW = Math.max(40, W - ins.left - ins.right);
  const availH = Math.max(40, H - ins.top - ins.bottom);
  const bw = Math.max(1, b.maxX - b.minX);
  const bh = Math.max(1, b.maxY - b.minY);
  const z = Math.min(availW / bw, availH / bh, spec.maxZoom || 3);
  const fx = ins.left + availW / 2;
  const fy = ins.top + availH / 2;
  const mx = (b.minX + b.maxX) / 2;
  const my = (b.minY + b.maxY) / 2;
  return { cx: mx + (W / 2 - fx) / z, cy: my + (H / 2 - fy) / z, z };
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function blend(a, b, t) {
  const lz = Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t;
  return { cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, z: Math.exp(lz) };
}

// Quantise zoom so base-map styling only re-renders on meaningful changes.
const quantZ = (z) => Math.pow(2, Math.round(Math.log2(z) * 6) / 6);

// ---------------------------------------------------------------------------
// Overlays drawn in map units

// Route width grows a little with zoom, like Maps: slim in overview,
// thick and glanceable while driving.
const routePx = (z) => Math.max(5.5, Math.min(10, 4 + 2.4 * z));
const CORNER = 16; // map units of corner rounding

const RouteLines = memo(function RouteLines({ routes, z }) {
  const w = (px) => px / z;
  const fill = routePx(z);
  return (
    <G>
      {routes.map((r) => {
        const d = toSmoothPath(r.points, CORNER);
        if (r.variant === 'alt') {
          return (
            <G key={r.id}>
              <Path d={d} stroke={color.routeAltCasing} strokeWidth={w(fill + 2.5)} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              <Path d={d} stroke={color.routeAlt} strokeWidth={w(fill)} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </G>
          );
        }
        if (r.variant === 'proposed') {
          return (
            <G key={r.id}>
              <Path d={d} stroke="#FFFFFF" strokeWidth={w(fill + 3)} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              <Path d={d} stroke={color.routeProposedSoft} strokeWidth={w(fill)} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              <Path d={d} stroke={color.route} strokeWidth={w(fill * 0.45)} strokeDasharray={[w(9), w(7)]} fill="none" strokeLinejoin="round" />
            </G>
          );
        }
        return (
          <G key={r.id}>
            <Path d={d} stroke={color.routeCasing} strokeWidth={w(fill + 3)} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <Path d={d} stroke={color.route} strokeWidth={w(fill)} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          </G>
        );
      })}
    </G>
  );
});

// Under the route: garage footprints and the soft glow of parking zones.
const ZonesUnder = memo(function ZonesUnder({ zones, footprints, z }) {
  const w = (px) => px / z;
  return (
    <G>
      {footprints.map((f) => (
        <Rect
          key={f.id}
          x={f.rect.x}
          y={f.rect.y}
          width={f.rect.w}
          height={f.rect.h}
          rx={3}
          fill={f.active ? 'rgba(26,115,232,0.28)' : 'rgba(26,115,232,0.12)'}
          stroke={f.active ? color.route : 'rgba(26,115,232,0.45)'}
          strokeWidth={w(f.active ? 2 : 1)}
        />
      ))}
      {zones.map((zn) => {
        const roadW = roadPx(z)[zn.roadKind || 'local'];
        return (
          <Path
            key={zn.id}
            d={toPath(zn.points)}
            stroke={zn.active ? color.zoneSoft : color.zoneMutedSoft}
            strokeWidth={w(roadW + (zn.active ? 18 : 10))}
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
    </G>
  );
});

// Over the route: curb highlights on both sides of the street (a search
// area, never a single "open space"), and the dotted walking leg.
const ZonesOver = memo(function ZonesOver({ zones, walk, z }) {
  const w = (px) => px / z;
  return (
    <G>
      {zones.map((zn) => {
        const roadW = roadPx(z)[zn.roadKind || 'local'];
        const off = w(roadW / 2 + 1.5);
        const sides = [offsetPolyline(zn.points, off), offsetPolyline(zn.points, -off)];
        return (
          <G key={zn.id}>
            {sides.map((pts, i) => (
              <Path
                key={i}
                d={toPath(pts)}
                stroke={zn.active ? color.zone : color.zoneMuted}
                strokeWidth={w(zn.active ? 4 : 2.5)}
                strokeLinecap="round"
                strokeDasharray={zn.active ? undefined : [w(5), w(4)]}
                fill="none"
              />
            ))}
          </G>
        );
      })}
      {walk && (
        <G>
          <Path d={toPath(walk)} stroke="#FFFFFF" strokeWidth={w(9)} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[0.01, w(11)]} fill="none" />
          <Path d={toPath(walk)} stroke={color.walk} strokeWidth={w(6)} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[0.01, w(11)]} fill="none" />
        </G>
      )}
    </G>
  );
});

// ---------------------------------------------------------------------------

// Rendered area relative to the screen, so transitions have map to show.
const OVERSCAN = 1.5;

// One rasterised view of the planning map at a fixed camera.
const MapLayer = memo(function MapLayer({ cam, W, H, routes, zones, footprints, walk, markers, showPois }) {
  const { cx, cy, z } = cam;
  const sw = W * OVERSCAN;
  const sh = H * OVERSCAN;
  const vbW = sw / z;
  const vbH = sh / z;
  const vx = cx - vbW / 2;
  const vy = cy - vbH / 2;
  const zq = quantZ(z);
  const tileKey = [Math.floor(vx / TILE), Math.floor(vy / TILE), Math.floor((vx + vbW) / TILE), Math.floor((vy + vbH) / TILE)].join(',');
  // Labels only for the visible screen (not the overscan area).
  const sx0 = cx - W / 2 / z;
  const sy0 = cy - H / 2 / z;
  const labelKey = [
    Math.floor(sx0 / LABEL_TILE),
    Math.floor(sy0 / LABEL_TILE),
    Math.floor((sx0 + W / z) / LABEL_TILE),
    Math.floor((sy0 + H / z) / LABEL_TILE),
  ].join(',');
  const toScreen = (p) => ({ x: (p[0] - cx) * z + W / 2, y: (p[1] - cy) * z + H / 2 });
  const onScreen = (s, pad = 80) => s.x > -pad && s.x < W + pad && s.y > -pad && s.y < H + pad;
  return (
    <>
      <Svg
        width={sw}
        height={sh}
        viewBox={`${vx} ${vy} ${vbW} ${vbH}`}
        pointerEvents="none"
        style={{ position: 'absolute', left: (W - sw) / 2, top: (H - sh) / 2 }}
      >
        <Rect x={vx - 10} y={vy - 10} width={vbW + 20} height={vbH + 20} fill={color.land} />
        <Buildings z={zq} tileKey={tileKey} />
        <BaseGeometry z={zq} />
        <Labels z={zq} tileKey={labelKey} />
        <ZonesUnder zones={zones} footprints={footprints} z={zq} />
        <RouteLines routes={routes} z={zq} />
        <ZonesOver zones={zones} walk={walk} z={zq} />
      </Svg>
      {showPois &&
        z > 0.22 &&
        POIS.map((poi) => {
          const s = toScreen(poi.point);
          return onScreen(s) ? <PoiMarker key={poi.name} {...s} {...poi} /> : null;
        })}
      {markers.map((m) => {
        const s = toScreen(m.point);
        if (!onScreen(s, 160)) return null;
        switch (m.kind) {
          case 'origin':
            return <LocationDot key={m.id} {...s} />;
          case 'destination':
            return <DestinationPin key={m.id} {...s} label={m.label} compact={m.compact} />;
          case 'garage':
            return <GarageMarker key={m.id} {...s} {...m} />;
          case 'zone':
            return <ZoneChip key={m.id} {...s} {...m} />;
          case 'bubble':
            return <RouteBubble key={m.id} {...s} {...m} />;
          case 'handoff':
            return <HandoffMarker key={m.id} {...s} />;
          case 'parked':
            return <ParkedCar key={m.id} {...s} label={m.label} />;
          default:
            return null;
        }
      })}
    </>
  );
});

// Planning map with two persistent layers ("slots") that swap roles. A
// camera change re-renders the hidden slot at the new camera (an update of
// already-mounted SVG, not a fresh mount), then a native-driver animation
// moves/scales it from the old view's position and fades it in over the
// visible slot. No per-frame React state, and no layer is ever re-mounted.
function MapCanvas({
  width: W,
  height: H,
  camera,
  routes = [],
  zones = [],
  footprints = [],
  walk = null,
  markers = [],
  showPois = false,
  cameraOut, // optional ref; receives the camera (used for the Start transition)
}) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const st = useRef(null);
  const layerProps = { W, H, routes, zones, footprints, walk, markers, showPois };

  if (!st.current) {
    const cam = resolveCamera(camera, W, H, null);
    st.current = {
      key: camera.key,
      active: 0,
      slots: [
        { cam, layer: null, anim: null, k0: 1, t0: [0, 0], dur: CAMERA_MS },
        { cam: null, layer: null, anim: null, k0: 1, t0: [0, 0], dur: CAMERA_MS },
      ],
    };
  }
  const s = st.current;
  let active = s.slots[s.active];

  if (camera.key !== s.key) {
    const target = resolveCamera(camera, W, H, null);
    const shown = active.cam;
    const maxT = ((OVERSCAN - 1) / 2) * Math.min(W, H) * 1.2;
    const k = shown.z / target.z;
    const t = [(target.cx - shown.cx) * shown.z, (target.cy - shown.cy) * shown.z];
    const fits = k >= 1 / OVERSCAN && k <= OVERSCAN && Math.abs(t[0]) <= maxT && Math.abs(t[1]) <= maxT;
    s.key = camera.key;
    s.active = 1 - s.active;
    active = s.slots[s.active];
    // Transform that makes the new view line up with the old one; if the
    // jump is too big for the overscan to cover, use a plain crossfade.
    active.k0 = fits ? k : 1;
    active.t0 = fits ? t : [0, 0];
    active.dur = fits ? CAMERA_MS : 280;
    active.cam = target;
    active.anim = new Animated.Value(0);
    s.transitioning = true;
  }
  // Only the active slot follows new overlay props; the other keeps its
  // last rendering so it can fade out unchanged.
  active.layer = { cam: active.cam, ...layerProps };

  const anim = active.anim;
  useLayoutEffect(() => {
    if (!anim) return;
    Animated.timing(anim, { toValue: 1, duration: active.dur, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished && active.anim === anim) {
          s.transitioning = false;
          forceUpdate();
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim]);

  if (cameraOut) cameraOut.current = active.cam;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: color.land }]} pointerEvents="box-none">
      {/* Active slot last so it draws on top. No zIndex: on the new
          architecture it escapes to the nearest stacking context and would
          lift the map above the sheets. */}
      {[1 - s.active, s.active].map((i) => {
        const slot = s.slots[i];
        if (!slot.layer) return null;
        const isActive = i === s.active;
        // The inactive slot stays mounted (hidden) so it can be reused.
        const hidden = !isActive && !s.transitioning;
        return <SlotView key={i} slot={slot} isActive={isActive} hidden={hidden} />;
      })}
    </View>
  );
}

const SlotView = ({ slot, isActive, hidden }) => {
  const style = useMemo(
    () =>
      slot.anim
        ? {
            opacity: slot.anim.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 1, 1] }),
            transform: [
              { translateX: slot.anim.interpolate({ inputRange: [0, 1], outputRange: [slot.t0[0], 0] }) },
              { translateY: slot.anim.interpolate({ inputRange: [0, 1], outputRange: [slot.t0[1], 0] }) },
              { scale: slot.anim.interpolate({ inputRange: [0, 1], outputRange: [slot.k0, 1] }) },
            ],
          }
        : null,
    [slot.anim, slot.t0, slot.k0]
  );
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, isActive && style, hidden && styles.hidden]}
      pointerEvents={isActive ? 'box-none' : 'none'}
    >
      <MapLayer {...slot.layer} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({ hidden: { opacity: 0 } });

// Re-renders only when its props change (camera, overlays, markers).
export default memo(MapCanvas);
