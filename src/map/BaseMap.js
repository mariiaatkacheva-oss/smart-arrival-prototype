import React, { memo } from 'react';
import { G, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { color } from '../theme';
import { toPath } from './geometry';
import { BUILDING_TILES, BUILDING_TILE } from './buildings';
import {
  STREETS,
  MAJOR_ROADS,
  HIGHWAYS,
  WATER,
  PIERS,
  PARKS,
  AREA_LABELS,
  WATER_LABELS,
  SHORE_X,
} from './geography';

// Stroke widths are given in screen pixels and converted to map units using
// the quantised zoom `z`, so roads keep a believable on-screen width at
// every zoom level (wider when zoomed in, never hairlines when zoomed out).

const LOCAL_PATH = STREETS.filter((s) => s.kind === 'local').map((s) => toPath(s.points)).join('');
const ARTERIAL_PATH = STREETS.filter((s) => s.kind === 'arterial').map((s) => toPath(s.points)).join('');
const MAJOR_PATH = MAJOR_ROADS.map((s) => toPath(s.points)).join('');
const HIGHWAY_PATH = HIGHWAYS.map((s) => toPath(s.points)).join('');
const WATER_POINTS = WATER.map((p) => p.join(',')).join(' ');

export const roadPx = (z) => ({
  local: Math.min(16, 1.2 + 5.4 * z),
  arterial: Math.min(20, 2 + 6.8 * z),
  major: Math.min(26, 2.8 + 8.6 * z),
  highway: Math.min(26, 3.2 + 8 * z),
});

export const BaseGeometry = memo(function BaseGeometry({ z }) {
  const px = roadPx(z);
  const w = (p) => p / z;
  const casing = z > 1 ? 2 : 1.4;
  return (
    <G>
      {PARKS.map((p, i) => (
        <Polygon key={i} points={p.points.map((q) => q.join(',')).join(' ')} fill={color.park} />
      ))}

      {/* Casings first so intersections merge cleanly */}
      <Path d={LOCAL_PATH} stroke={color.roadCasing} strokeWidth={w(px.local + casing)} strokeLinecap="square" fill="none" />
      <Path d={ARTERIAL_PATH} stroke={color.arterialCasing} strokeWidth={w(px.arterial + casing)} strokeLinecap="square" fill="none" />
      <Path d={MAJOR_PATH} stroke={color.arterialCasing} strokeWidth={w(px.major + casing)} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={LOCAL_PATH} stroke={color.road} strokeWidth={w(px.local)} strokeLinecap="square" fill="none" />
      <Path d={ARTERIAL_PATH} stroke={color.arterial} strokeWidth={w(px.arterial)} strokeLinecap="square" fill="none" />
      <Path d={MAJOR_PATH} stroke={color.arterial} strokeWidth={w(px.major)} strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <Polygon points={WATER_POINTS} fill={color.water} />
      {/* Waterfront promenade edge */}
      <Path d={`M${SHORE_X} 2600L${SHORE_X} 274`} stroke={color.shoreline} strokeWidth={w(1.5)} fill="none" />

      {PIERS.map((p) => (
        <Rect
          key={p.id}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          rx={2}
          fill={p.id === 'ferry' ? color.landmark : color.pier}
          stroke={color.pierEdge}
          strokeWidth={w(1)}
        />
      ))}
      {/* Ferry Building clock tower */}
      <Rect x={SHORE_X - 4} y={889} width={14} height={18} rx={1} fill={color.landmarkDark} />

      <Path d={HIGHWAY_PATH} stroke={color.highwayCasing} strokeWidth={w(px.highway + casing)} strokeLinecap="butt" strokeLinejoin="round" fill="none" />
      <Path d={HIGHWAY_PATH} stroke={color.highway} strokeWidth={w(px.highway)} strokeLinecap="butt" strokeLinejoin="round" fill="none" />
    </G>
  );
});

// Only the building tiles in (or near) the viewport.
export const Buildings = memo(function Buildings({ z, tileKey }) {
  if (z < 0.3) return null;
  const [tx0, ty0, tx1, ty1] = tileKey.split(',').map(Number);
  const scale = TILE / BUILDING_TILE;
  let d = '';
  for (let x = Math.floor((tx0 - 1) * scale); x <= Math.ceil((tx1 + 1) * scale); x++) {
    for (let y = Math.floor((ty0 - 1) * scale); y <= Math.ceil((ty1 + 1) * scale); y++) {
      d += BUILDING_TILES[`${x},${y}`] || '';
    }
  }
  if (!d) return null;
  return (
    <Path
      d={d}
      fill={z >= 1.1 ? color.building : color.buildingFar}
      stroke={z >= 1.4 ? color.buildingEdge : 'none'}
      strokeWidth={1 / z}
    />
  );
});

// ---------------------------------------------------------------------------
// Labels

function labelCandidates() {
  const out = [];
  const add = (street, kind, step) => {
    const pts = street.points;
    let carry = step * 0.45;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      if (angle > 90) angle -= 180;
      if (angle < -90) angle += 180;
      let d = carry;
      let n = 0;
      while (d < len) {
        const t = d / len;
        out.push({ text: street.name, kind, x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, angle, n: n++ });
        d += step;
      }
      carry = d - len;
    }
  };
  STREETS.forEach((s) => add(s, s.kind, 320));
  MAJOR_ROADS.forEach((s) => add(s, 'major', 400));
  HIGHWAYS.forEach((s) => add(s, 'highway', 520));
  return out;
}

const LABELS = labelCandidates();
const LABEL_STYLE = {
  local: { px: 10.5, minZ: 0.95, weight: '400' },
  arterial: { px: 11, minZ: 0.55, weight: '500' },
  major: { px: 11.5, minZ: 0.28, weight: '500' },
  highway: { px: 11, minZ: 0.45, weight: '500' },
};

export const TILE = 300;
export const LABEL_TILE = 100;

// Neighbourhood names in title case (fewer all-caps labels).
const titleCase = (s) =>
  s.toLowerCase().replace(/\b\w+/g, (w, i) => (i > 0 && ['of', 'the', 'and'].includes(w) ? w : w[0].toUpperCase() + w.slice(1)));

function HaloText({ x, y, fs, z, children, fill, weight = '400', spacing, italic, transform }) {
  const common = {
    x,
    y,
    fontSize: fs,
    fontWeight: weight,
    letterSpacing: spacing,
    fontStyle: italic ? 'italic' : undefined,
    textAnchor: 'middle',
    transform,
  };
  return (
    <>
      <SvgText {...common} stroke="#FFFFFF" strokeWidth={3 / z} strokeLinejoin="round" fill="#FFFFFF">
        {children}
      </SvgText>
      <SvgText {...common} fill={fill}>
        {children}
      </SvgText>
    </>
  );
}

export const Labels = memo(function Labels({ z, tileKey }) {
  const [tx0, ty0, tx1, ty1] = tileKey.split(',').map(Number);
  // tileKey covers just the visible screen (see MapCanvas), so no extra
  // tiles of margin: each label costs two native text nodes.
  const x0 = tx0 * LABEL_TILE;
  const y0 = ty0 * LABEL_TILE;
  const x1 = (tx1 + 1) * LABEL_TILE;
  const y1 = (ty1 + 1) * LABEL_TILE;
  // Thin out repeated labels when zoomed out.
  const every = Math.max(1, Math.ceil(260 / (320 * z)));

  const streetLabels = LABELS.filter((l) => {
    const st = LABEL_STYLE[l.kind];
    const onLand = l.kind === 'highway' || l.x < SHORE_X - 4;
    return z >= st.minZ && l.n % every === 0 && onLand && l.x > x0 && l.x < x1 && l.y > y0 && l.y < y1;
  });

  const showAreas = z < 1.25;
  return (
    <G>
      {streetLabels.map((l, i) => {
        const st = LABEL_STYLE[l.kind];
        const fs = st.px / z;
        const tr = `rotate(${l.angle.toFixed(1)} ${l.x.toFixed(1)} ${l.y.toFixed(1)})`;
        return (
          <HaloText
            key={`${l.text}:${Math.round(l.x)}:${Math.round(l.y)}`}
            x={l.x}
            y={l.y + fs * 0.35}
            fs={fs}
            z={z}
            weight={st.weight}
            transform={tr}
            fill={l.kind === 'highway' ? color.highwayLabel : color.roadLabel}
          >
            {l.text}
          </HaloText>
        );
      })}
      {showAreas &&
        AREA_LABELS.map((a) => (
          <HaloText key={a.text} x={a.point[0]} y={a.point[1]} fs={11 / z} z={z} weight="500" fill={color.areaLabel}>
            {titleCase(a.text)}
          </HaloText>
        ))}
      {WATER_LABELS.filter((a) => z >= (a.minZ || 0)).map((a) => (
        <SvgText
          key={a.text}
          x={a.point[0]}
          y={a.point[1]}
          fontSize={(a.size || 13) / z}
          fontStyle="italic"
          textAnchor="middle"
          fill={color.waterLabel}
        >
          {a.text}
        </SvgText>
      ))}
      {z >= 0.75 &&
        PIERS.filter((p) => p.label && p.id !== 'pier-3' && p.h * z >= 14).map((p) => (
          <SvgText key={p.id} x={p.x + p.w / 2} y={p.y + p.h / 2 + (10 / z) * 0.35} fontSize={10 / z} textAnchor="middle" fill="#80868B">
            {p.label}
          </SvgText>
        ))}
    </G>
  );
});
