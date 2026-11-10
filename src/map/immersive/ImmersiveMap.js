import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { cumulative, pointAt, slice, offsetPolyline } from '../geometry';
import { WATER, PARKS } from '../geography';
import { makeCamera, groundPoly, groundStrip, n1 } from './projection';
import { ROAD_W, SIDEWALK, ROAD_GRID, MARKING_GRID, BUILDING_GRID, BUILDING_LOD_GRID, queryGrid, ROADS } from './scene';
import { DestinationPin, GarageMarker, ParkedCar, ZoneChip, HandoffMarker } from '../Markers';
import { CarPuck3D, WalkerPuck3D } from './Pucks';
import { im } from './palette';
import { perfSample, now, PERF_HUD, PERF_LOG } from '../../perf';

// Immersive (tilted, heading-up) map used once navigation starts.
//
// Camera specs:
//   { mode: 'follow', zoom, pitch, fy, key }             follows the vehicle
//   { mode: 'look', point, zoom, pitch, fy, key }        fixed target
// `initialCamera` is the 2D planning camera ({ cx, cy, z }); the first spec
// animates out of it so Start feels like the map tilting into navigation.

export const NAV_PITCH = 60;
const HEIGHT_SCALE = 0.5; // buildings are kept low so the route stays readable
const FAR = 9; // roads: cull beyond this many camera-distances (horizon haze)
const FAR_BUILDINGS = 4; // buildings beyond this are hidden in the haze anyway
const NEAR_DETAIL = 1.6; // full lot detail within this; one mass per block beyond
const FAR_MARKINGS = 1.5; // lane dashes are tiny further out
const FAR_SIDEWALKS = 2.6; // sidewalk strips are hairlines beyond this
const FAR_LOCAL = 5; // minor streets fade into the haze beyond this
const LIGHT = [0.55, 0.83]; // light from the south-east (y grows south)

const ease = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => ((b - a + 540) % 360) - 180;

function blendCam(a, b, t) {
  return {
    tx: lerp(a.tx, b.tx, t),
    ty: lerp(a.ty, b.ty, t),
    z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), t)),
    pitch: lerp(a.pitch, b.pitch, t),
    heading: a.heading + angDiff(a.heading, b.heading) * t,
    fy: lerp(a.fy, b.fy, t),
  };
}

// Rounded corners for a natural-looking route ribbon.
function smoothPoints(points, radius = 18, steps = 5) {
  if (points.length < 3) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [a, b, c] = [points[i - 1], points[i], points[i + 1]];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    if (r < 1) {
      out.push(b);
      continue;
    }
    const p1 = [b[0] + ((a[0] - b[0]) * r) / l1, b[1] + ((a[1] - b[1]) * r) / l1];
    const p2 = [b[0] + ((c[0] - b[0]) * r) / l2, b[1] + ((c[1] - b[1]) * r) / l2];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const u = 1 - t;
      out.push([u * u * p1[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * b[1] + t * t * p2[1]]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

// Crosswalks + stop lines where the route crosses other streets.
function routeCrossings(points) {
  const marks = [];
  const lights = [];
  const seen = [];
  const cum = cumulative(points);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const len = Math.hypot(ux, uy) || 1;
    const u = [ux / len, uy / len];
    const right = [-u[1], u[0]];
    // Width of the street the route is on.
    let routeW = ROAD_W.local;
    let best = Infinity;
    ROADS.forEach((r) => {
      const d = Math.hypot(r.cx - (a[0] + b[0]) / 2, r.cy - (a[1] + b[1]) / 2);
      const rx = r.b[0] - r.a[0];
      const ry = r.b[1] - r.a[1];
      const par = Math.abs(ux * ry - uy * rx) / (len * Math.hypot(rx, ry) || 1) < 0.2;
      if (par && d < best && d < r.r + 10) {
        best = d;
        routeW = r.w;
      }
    });
    ROADS.forEach((r) => {
      const rx = r.b[0] - r.a[0];
      const ry = r.b[1] - r.a[1];
      const den = ux * ry - uy * rx;
      if (Math.abs(den) < 1e-6) return;
      const t = ((r.a[0] - a[0]) * ry - (r.a[1] - a[1]) * rx) / den;
      const s = ((r.a[0] - a[0]) * uy - (r.a[1] - a[1]) * ux) / den;
      if (t < 0 || t > 1 || s < -0.01 || s > 1.01) return;
      const p = [a[0] + ux * t, a[1] + uy * t];
      if (seen.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 12)) return;
      seen.push(p);
      const back = r.w / 2 + 3;
      // Zebra stripes across the route's street, before and after the junction.
      [-1, 1].forEach((side) => {
        const c0 = [p[0] - u[0] * side * back, p[1] - u[1] * side * back];
        const c1 = [c0[0] - u[0] * side * 6, c0[1] - u[1] * side * 6];
        for (let k = -routeW / 2 + 1.6; k <= routeW / 2 - 1.6; k += 3.2) {
          const o = [right[0] * k, right[1] * k];
          marks.push(stripe([c0[0] + o[0], c0[1] + o[1]], [c1[0] + o[0], c1[1] + o[1]], 1.5));
        }
      });
      // Stop line on the approach lanes (right half).
      const sl = [p[0] - u[0] * (back + 8), p[1] - u[1] * (back + 8)];
      marks.push(stripe(sl, [sl[0] + right[0] * (routeW / 2 - 1), sl[1] + right[1] * (routeW / 2 - 1)], 1.6));
      lights.push({
        at: cum[i - 1] + len * t,
        pos: [p[0] - u[0] * (back + 2) + right[0] * (routeW / 2 + 2.5), p[1] - u[1] * (back + 2) + right[1] * (routeW / 2 + 2.5)],
      });
    });
  }
  return { marks, lights };
}

function stripe(a, b, w) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (w / 2);
  const ny = (dx / len) * (w / 2);
  return [
    [a[0] - nx, a[1] - ny],
    [b[0] - nx, b[1] - ny],
    [b[0] + nx, b[1] + ny],
    [a[0] + nx, a[1] + ny],
  ];
}

function dotPath(cam, pts, spacing = 9, radiusUnits = 2.6) {
  let d = '';
  const cum = cumulative(pts);
  const total = cum[cum.length - 1];
  for (let s = 0; s <= total; s += spacing) {
    const p = pointAt(pts, s);
    const [X, Y] = cam.local(p.x, p.y);
    if (Y < cam.yMin) continue;
    const [sx, sy] = cam.proj(X, Y);
    const r = Math.max(1.5, radiusUnits * cam.scaleAt(Y));
    const ry = r * Math.max(0.45, cam.cosp + 0.35);
    d += `M${n1(sx - r)} ${n1(sy)}a${n1(r)} ${n1(ry)} 0 1 0 ${n1(2 * r)} 0a${n1(r)} ${n1(ry)} 0 1 0 ${n1(-2 * r)} 0`;
  }
  return d;
}

function ImmersiveMap({
  width: W,
  height: H,
  camera,
  initialCamera,
  motion,
  route, // { key, points } active driving route (drawn from the vehicle onward)
  proposed, // points of a route Gemini is proposing, or null
  zones = [],
  walk = null,
  markers = [],
  activeGarageId,
  highlightPier,
  showVehicle,
  onProgress,
  onArrive,
}) {
  const [, setFrame] = useState(0);
  const props = useRef({});
  props.current = { camera, motion, onProgress, onArrive, W, H };
  const st = useRef({
    cam: null,
    from: null,
    t: 1,
    dur: 800,
    specKey: null,
    motionKey: null,
    dist: 0,
    arrivedFor: null,
    last: 0,
    hs: null, // smoothed heading
    routeKey: null,
    prevRoute: null,
    reveal: 1,
  }).current;
  const raf = useRef(null);

  if (motion && motion.key !== st.motionKey) {
    st.motionKey = motion.key;
    st.dist = motion.startDistance || 0;
    st.arrivedFor = null;
  }
  const vehicle = motion ? pointAt(motion.points, st.dist) : null;
  if (st.hs == null) st.hs = vehicle ? vehicle.heading : 0;

  // Reroute: new route draws itself in from the car; the old one fades.
  // No active route (parked / walking): stop drawing the old drive ribbon.
  if (!route && st.routeKey) {
    st.routeKey = null;
    st.routePoints = null;
    st.prevRoute = null;
  }
  if (route && route.key !== st.routeKey) {
    if (st.routeKey) {
      st.prevRoute = st.routePoints;
      st.reveal = 0;
    }
    st.routeKey = route.key;
    st.routePoints = route.points;
  }

  const resolve = (spec, veh, hs) => {
    if (spec.mode === 'follow' && veh) {
      return { tx: veh.x, ty: veh.y, z: spec.zoom, pitch: spec.pitch, heading: hs, fy: spec.fy };
    }
    const p = spec.point || [veh ? veh.x : 0, veh ? veh.y : 0];
    return {
      tx: p[0],
      ty: p[1],
      z: spec.zoom,
      pitch: spec.pitch,
      heading: spec.heading ?? (st.cam ? st.cam.heading : hs),
      fy: spec.fy,
    };
  };

  if (!st.cam) {
    if (initialCamera) {
      st.cam = { tx: initialCamera.cx, ty: initialCamera.cy, z: initialCamera.z, pitch: 0, heading: 0, fy: 0.5 };
    } else {
      st.cam = resolve(camera, vehicle, st.hs);
      st.specKey = camera.key;
    }
  }
  if (camera.key !== st.specKey) {
    st.specKey = camera.key;
    st.from = st.cam;
    st.t = 0;
    st.dur = camera.duration || 800;
  }

  const step = useCallback((ts) => {
    const p = props.current;
    if (st.last) perfSample('immersive.frameInterval(ms)', ts - st.last);
    const dt = st.last ? Math.min(0.05, (ts - st.last) / 1000) : 1 / 60;
    st.last = ts;
    let busy = false;

    const m = p.motion;
    if (m) {
      const total = m.length ?? cumulative(m.points).slice(-1)[0];
      const target = Math.min(m.targetDistance ?? st.dist, total);
      // Continuous constant-speed motion along the route (no stop-and-go).
      if (st.dist < target - 0.01) {
        st.dist = Math.min(target, st.dist + m.speed * dt);
        busy = true;
        p.onProgress && p.onProgress(st.dist, pointAt(m.points, st.dist));
      }
      const arriveKey = `${m.key}:${m.phase}:${target}`;
      if (st.dist >= target - 0.01 && st.arrivedFor !== arriveKey) {
        st.arrivedFor = arriveKey;
        p.onArrive && p.onArrive(target);
      }
    }

    const veh = m ? pointAt(m.points, st.dist) : null;
    if (veh) {
      const d = angDiff(st.hs, veh.heading);
      if (Math.abs(d) > 0.1) {
        st.hs += d * (1 - Math.exp(-dt * 3.2));
        busy = true;
      }
    }
    if (st.t < 1) {
      st.t = Math.min(1, st.t + (dt * 1000) / st.dur);
      busy = true;
    }
    if (st.reveal < 1) {
      st.reveal = Math.min(1, st.reveal + dt / 0.75);
      if (st.reveal >= 1) st.prevRoute = null;
      busy = true;
    }
    const target = resolve(p.camera, veh, st.hs);
    const prev = st.cam;
    st.cam = st.t < 1 && st.from ? blendCam(st.from, target, ease(st.t)) : target;
    const moved =
      Math.abs(prev.tx - st.cam.tx) > 0.01 ||
      Math.abs(prev.ty - st.cam.ty) > 0.01 ||
      Math.abs(prev.z - st.cam.z) > 1e-5 ||
      Math.abs(prev.pitch - st.cam.pitch) > 0.01 ||
      Math.abs(angDiff(prev.heading, st.cam.heading)) > 0.01;

    // Only re-render when something changed, otherwise the loop never idles.
    if (busy || moved) setFrame((f) => (f + 1) % 1e6);
    if (busy) raf.current = requestAnimationFrame(step);
    else {
      raf.current = null;
      st.last = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!raf.current) {
      st.last = 0;
      raf.current = requestAnimationFrame(step);
    }
  });
  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const crossings = useMemo(() => (route ? routeCrossings(route.points) : { marks: [], lights: [] }), [route && route.key]);

  // ------------------------------------------------------------ build frame
  const tBuild = now();
  const c = st.cam;
  const cam = makeCamera(c, W, H);
  const hf = HEIGHT_SCALE * Math.min(1, Math.max(0, c.pitch / NAV_PITCH)); // buildings rise with the tilt

  const visible = (x, y, r, far = FAR) => {
    const [X, Y] = cam.local(x, y);
    if (Y + r < cam.yMin) return false;
    const depth = cam.depth(Y);
    if (depth > cam.D * far + r * cam.sinp) return false;
    const s = cam.f / Math.max(depth, cam.near);
    if (Math.abs(X) * s > W / 2 + r * s + 30) return false;
    const sy = H * c.fy - Y * cam.cosp * s;
    return sy > -r * s - 200 && sy < H + r * s + 30;
  };

  // Ground
  const water = groundPoly(cam, WATER);
  let parks = '';
  PARKS.forEach((p) => (parks += groundPoly(cam, p.points)));

  let sidewalks = '';
  const surface = { local: '', arterial: '', major: '', highway: '' };
  queryGrid(ROAD_GRID, cam.groundBox(FAR), 100).forEach((r) => {
    if (!visible(r.cx, r.cy, r.r, r.kind === 'local' ? FAR_LOCAL : FAR)) return;
    if (cam.depth(cam.local(r.cx, r.cy)[1]) < cam.D * FAR_SIDEWALKS + r.r) {
      sidewalks += groundPoly(cam, stripe(r.a, r.b, r.w + SIDEWALK * 2));
    }
    surface[r.kind] += groundPoly(cam, stripe(r.a, r.b, r.w));
  });
  let white = '';
  let yellow = '';
  // Lane markings only once the camera is tilted in (not during the flat
  // start of the Start transition, where they would be invisible anyway).
  if (c.z > 1.2 && c.pitch > 35) {
    queryGrid(MARKING_GRID, cam.groundBox(FAR_MARKINGS), 20).forEach((m) => {
      if (!visible(m.cx, m.cy, 10, FAR_MARKINGS)) return;
      if (m.kind === 'yellow') yellow += groundPoly(cam, m.pts);
      else white += groundPoly(cam, m.pts);
    });
    crossings.marks.forEach((q) => {
      if (visible(q[0][0], q[0][1], 8)) white += groundPoly(cam, q);
    });
  }

  // Route ribbon from the vehicle onward (revealed progressively on reroute).
  let routeD = '';
  let routeEdge = '';
  let prevD = '';
  if (st.routePoints) {
    const total = cumulative(st.routePoints).slice(-1)[0];
    const from = motion && motion.vehicle === 'car' ? st.dist : 0;
    const to = from + (total - from) * ease(st.reveal);
    const pts = smoothPoints(slice(st.routePoints, from, to));
    routeEdge = groundStrip(cam, pts, 15);
    routeD = groundStrip(cam, pts, 11);
  }
  if (st.prevRoute) {
    prevD = groundStrip(cam, smoothPoints(slice(st.prevRoute, 0, Infinity)), 9);
  }
  const proposedD = proposed ? groundStrip(cam, smoothPoints(proposed), 9) : '';

  // Parking zones: glow under the route, curb lines on top.
  let zoneGlow = '';
  let zoneCurb = '';
  zones.forEach((z) => {
    const w = ROAD_W[z.roadKind || 'local'];
    zoneGlow += groundStrip(cam, z.points, w + 14);
    [w / 2, -w / 2].forEach((off) => (zoneCurb += groundStrip(cam, offsetPolyline(z.points, off), 2.6)));
  });
  const walkD = walk ? dotPath(cam, walk) : '';

  // Buildings: back-face culled, shaded by face direction, painter-sorted.
  const list = [];
  // mode: 'near' = city lots (close only), 'far' = block masses (distant
  // only), 'any' = single-shape structures (piers, landmarks, garages).
  const consider = (b, far, mode) => {
    if (!visible(b.cx, b.cy, b.r, far)) return;
    const centerDepth = cam.depth(cam.local(b.cx, b.cy)[1]);
    if (mode === 'near' && centerDepth > cam.D * NEAR_DETAIL) return;
    if (mode === 'far' && centerDepth <= cam.D * NEAR_DETAIL) return;
    const h = Math.max(0.5, b.h * hf);
    const base = b.pts.map((p) => cam.local(p[0], p[1]));
    if (base.some((q) => q[1] < cam.yMin + 1 || cam.depth(q[1], h) < cam.near)) return;
    list.push({ b, base, h, depth: centerDepth });
  };
  queryGrid(BUILDING_GRID, cam.groundBox(NEAR_DETAIL + 0.5), 150).forEach((b) => b.lod && consider(b, NEAR_DETAIL + 0.5, 'near'));
  queryGrid(BUILDING_LOD_GRID, cam.groundBox(FAR_BUILDINGS), 150).forEach((b) =>
    consider(b, FAR_BUILDINGS, b.block ? 'far' : 'any')
  );
  list.sort((a, b) => b.depth - a.depth);

  let shadows = '';
  const chunks = [];
  const CHUNK = 10; // buildings per depth-sorted batch (fewer native paths)
  // Buildings near the camera fade so they never hide the car. Batches are
  // split by fade level so a near building never fades distant ones.
  const fadeOf = (depth) => Math.max(0.3, Math.min(1, (depth - cam.D * 0.75) / (cam.D * 0.35)));
  const fadeLevel = (depth) => Math.round(fadeOf(depth) * 5) / 5;
  const batches = [];
  list.forEach((item) => {
    const lvl = fadeLevel(item.depth);
    const last = batches[batches.length - 1];
    if (last && last.lvl === lvl && last.items.length < CHUNK) last.items.push(item);
    else batches.push({ lvl, items: [item] });
  });
  for (let i = 0; i < batches.length; i++) {
    const ch = { lit: '', dark: '', roofs: {}, opacity: batches[i].lvl };
    batches[i].items.forEach(({ b, base, h }) => {
      const bs = base.map((q) => cam.proj(q[0], q[1], 0));
      const tp = base.map((q) => cam.proj(q[0], q[1], h));
      // Soft ground shadow toward the north-west.
      // (No per-building ground shadows: one extra polygon each, little visual gain.)
      for (let k = 0; k < 4; k++) {
        const a = b.pts[k];
        const e = b.pts[(k + 1) % 4];
        const mx = (a[0] + e[0]) / 2;
        const my = (a[1] + e[1]) / 2;
        let nx = e[1] - a[1];
        let ny = -(e[0] - a[0]);
        if (nx * (mx - b.cx) + ny * (my - b.cy) < 0) {
          nx = -nx;
          ny = -ny;
        }
        if (nx * (cam.camX - mx) + ny * (cam.camY - my) <= 0) continue; // faces away
        const len = Math.hypot(nx, ny) || 1;
        const lit = (nx * LIGHT[0] + ny * LIGHT[1]) / len > 0.2;
        const f = `M${n1(bs[k][0])} ${n1(bs[k][1])}L${n1(bs[(k + 1) % 4][0])} ${n1(bs[(k + 1) % 4][1])}L${n1(tp[(k + 1) % 4][0])} ${n1(tp[(k + 1) % 4][1])}L${n1(tp[k][0])} ${n1(tp[k][1])}Z`;
        if (lit) ch.lit += f;
        else ch.dark += f;
      }
      const roofColor =
        b.garageId && b.garageId === activeGarageId
          ? im.roofGarage
          : b.kind === 'pier'
          ? im.pier
          : b.kind === 'landmark'
          ? im.roofLandmark
          : b.kind === 'shed' && b.label === highlightPier
          ? im.roofHighlight
          : b.kind === 'shed'
          ? im.roofShed
          : im.roof;
      ch.roofs[roofColor] =
        (ch.roofs[roofColor] || '') + `M${tp.map((q) => `${n1(q[0])} ${n1(q[1])}`).join('L')}Z`;
    });
    chunks.push(ch);
  }

  // Traffic lights at the next junctions ahead.
  let poles = '';
  const heads = [];
  if (c.pitch > 30) {
    crossings.lights
      .filter((l) => l.at > st.dist + 30 && l.at < st.dist + 520)
      .slice(0, 3)
      .forEach((l) => {
        const [X, Y] = cam.local(l.pos[0], l.pos[1]);
        if (Y < cam.yMin + 2) return;
        const g = cam.proj(X, Y, 0);
        const t = cam.proj(X, Y, 15 * hf);
        poles += `M${n1(g[0])} ${n1(g[1])}L${n1(t[0])} ${n1(t[1])}`;
        heads.push({ x: t[0], y: t[1], s: Math.max(0.5, Math.min(1.4, cam.scaleAt(Y) / 1.6)) });
      });
  }

  // Screen-space markers
  const toScreen = (pt, h = 0) => {
    const [X, Y] = cam.local(pt[0], pt[1]);
    if (Y < cam.yMin + 2 || cam.depth(Y) > cam.D * 6) return null;
    const [x, y] = cam.proj(X, Y, h);
    if (x < -80 || x > W + 80 || y < cam.horizonY - 10 || y > H + 80) return null;
    return { x, y };
  };

  const horizon = cam.horizonY;
  const showSky = horizon > -40;
  const vehScreen = vehicle ? toScreen([vehicle.x, vehicle.y]) : null;

  perfSample('immersive.buildJS(ms)', now() - tBuild);
  if (PERF_HUD || PERF_LOG) {
    // Scene size: total path characters and vertices sent to native this frame.
    const all = [water, parks, sidewalks, surface.local, surface.arterial, surface.major, surface.highway, white, yellow,
      zoneGlow, routeEdge, routeD, zoneCurb, walkD, shadows, poles,
      ...chunks.flatMap((c) => [c.lit, c.dark, ...Object.values(c.roofs)])];
    let chars = 0;
    let verts = 0;
    all.forEach((d) => {
      if (!d) return;
      chars += d.length;
      for (let i = 0; i < d.length; i++) if (d[i] === 'L' || d[i] === 'M') verts++;
    });
    perfSample('scene.kchars', chars / 1000);
    perfSample('scene.vertices', verts);
    perfSample('scene.buildings', list.length);
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: im.land }]} pointerEvents="box-none">
      <Svg width={W} height={H} pointerEvents="none">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={im.skyTop} />
            <Stop offset="1" stopColor={im.skyHorizon} />
          </LinearGradient>
          <LinearGradient id="fog" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={im.skyHorizon} stopOpacity="1" />
            <Stop offset="1" stopColor={im.skyHorizon} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {showSky && <Rect x={0} y={0} width={W} height={Math.max(0, horizon + 2)} fill="url(#sky)" />}
        <Path d={water} fill={im.water} />
        {!!parks && <Path d={parks} fill={im.park} />}
        <Path d={sidewalks} fill={im.sidewalk} />
        <Path d={surface.highway} fill={im.highway} />
        <Path d={surface.local} fill={im.roadLocal} />
        <Path d={surface.arterial} fill={im.roadArterial} />
        <Path d={surface.major} fill={im.roadMajor} />
        {!!yellow && <Path d={yellow} fill={im.yellowLine} />}
        {!!white && <Path d={white} fill={im.whiteLine} />}

        {!!zoneGlow && <Path d={zoneGlow} fill={im.zoneGlow} />}
        {!!prevD && <Path d={prevD} fill={im.routeOld} fillOpacity={1 - st.reveal} />}
        {!!proposedD && <Path d={proposedD} fill={im.routeProposed} />}
        {!!routeEdge && (
          <G>
            <Path d={routeEdge} fill={im.routeShadow} transform="translate(0 3)" />
            <Path d={routeEdge} fill={im.routeEdge} />
            <Path d={routeD} fill={im.route} />
          </G>
        )}
        {!!zoneCurb && <Path d={zoneCurb} fill={im.zone} />}
        {!!walkD && <Path d={walkD} fill={im.walk} stroke="#FFFFFF" strokeWidth={1.2} />}

        {!!shadows && <Path d={shadows} fill={im.shadow} />}
        {chunks.map((ch, i) => (
          // Buildings between the camera and the car fade out of the way.
          // Per-path fill opacity instead of group opacity: a group opacity
          // forces an offscreen transparency layer on every frame.
          <G key={i}>
            {!!ch.dark && <Path d={ch.dark} fill={im.sideDark} fillOpacity={ch.opacity} />}
            {!!ch.lit && <Path d={ch.lit} fill={im.sideLit} fillOpacity={ch.opacity} />}
            {Object.entries(ch.roofs).map(([fill, d]) => (
              <Path key={fill} d={d} fill={fill} fillOpacity={ch.opacity} />
            ))}
          </G>
        ))}

        {/* X-ray: the route stays faintly visible where buildings cover it */}
        {!!routeD && <Path d={routeD} fill={im.route} fillOpacity={0.32} />}
        {!!zoneCurb && <Path d={zoneCurb} fill={im.zone} fillOpacity={0.45} />}

        {!!poles && <Path d={poles} stroke={im.pole} strokeWidth={1.6} />}
        {heads.map((h, i) => (
          <G key={i} transform={`translate(${n1(h.x)} ${n1(h.y)}) scale(${h.s.toFixed(2)})`}>
            <Rect x={-3.5} y={-13} width={7} height={15} rx={2} fill={im.pole} />
            <Rect x={-1.8} y={-3.4} width={3.6} height={3.6} rx={1.8} fill={im.lightGreen} />
          </G>
        ))}

        {/* Atmospheric haze toward the horizon */}
        {showSky && <Rect x={0} y={horizon} width={W} height={H * 0.14} fill="url(#fog)" />}
      </Svg>

      {markers.map((m) => {
        const s = toScreen(m.point, m.kind === 'garage' ? 26 * hf : 0);
        if (!s) return null;
        switch (m.kind) {
          case 'destination':
            return <DestinationPin key={m.id} {...s} label={m.label} compact={m.compact} />;
          case 'garage':
            return <GarageMarker key={m.id} {...s} {...m} flat />;
          case 'zone':
            return <ZoneChip key={m.id} {...s} {...m} flat />;
          case 'parked':
            return <ParkedCar key={m.id} {...s} label={m.label} flat />;
          case 'handoff':
            return <HandoffMarker key={m.id} {...s} flat />;
          case 'street':
            return (
              <View key={m.id} pointerEvents="none" style={[styles.street, { left: s.x - 70, top: s.y - 14 }]}>
                <Text style={styles.streetText} numberOfLines={1}>
                  {m.label}
                </Text>
              </View>
            );
          default:
            return null;
        }
      })}

      {showVehicle && vehicle && vehScreen && motion.vehicle === 'car' && (
        <CarPuck3D {...vehScreen} heading={angDiff(c.heading, vehicle.heading)} pitch={c.pitch} />
      )}
      {showVehicle && vehicle && vehScreen && motion.vehicle === 'walker' && (
        <WalkerPuck3D {...vehScreen} heading={angDiff(c.heading, vehicle.heading)} pitch={c.pitch} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  street: { position: 'absolute', width: 140, alignItems: 'center' },
  streetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3C4043',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
});

// Only re-render on prop changes; per-frame updates come from its own loop.
export default React.memo(ImmersiveMap);

// Convex hull (monotone chain) for building shadows.
function hull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  pts.forEach((p) => {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  });
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
