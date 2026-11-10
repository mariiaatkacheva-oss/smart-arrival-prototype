import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { color } from './theme';
import { perfSample, PerfHud } from './perf';
import { navProgress, useNavProgress } from './navProgress';

import { S, DRIVING_SCREENS, reducer, geminiScriptFor } from './flow';
import { demoInitialState, DEMO_TIMELINE } from './demoStates';
import { ALT_ROUTE_LEGS, BASE_ROUTE_LEGS, DESTINATION, ORIGIN, SPEED, TIMING, TRIP } from './data/mockData';
import {
  formatClock,
  formatDistance,
  getPlan,
  rankOptions,
  remainingMinutes,
  shouldPromptForParking,
  driveMinutes,
} from './logic/arrival';
import { buildRoute, nextManeuver, streetAt } from './map/route';
import { bounds, pathLength, pointAt, project, slice } from './map/geometry';
import MapCanvas from './map/MapCanvas';
import ImmersiveMap from './map/immersive/ImmersiveMap';

import { HomeSearchBar, PlaceSearchBar, SearchPanel } from './components/SearchBar';
import DestinationSheet from './components/DestinationSheet';
import DirectionsHeader from './components/DirectionsHeader';
import RouteSummary from './components/RouteSummary';
import ParkingPreferenceSheet from './components/ParkingPreferenceSheet';
import ParkingOptionsSheet from './components/ParkingOptionsSheet';
import ArrivalRouteSheet from './components/ArrivalRouteSheet';
import NavigationBanner, { MANEUVER_ICON, MANEUVER_VERB } from './components/NavigationBanner';
import BottomNavPanel from './components/BottomNavPanel';
import GeminiSheet, { GeminiButton } from './components/GeminiSheet';
import ArrivalModeBanner from './components/ArrivalModeBanner';
import ParkingSearchPanel from './components/ParkingSearchPanel';
import ParkedSheet from './components/ParkedSheet';
import { ArrivedSheet, WalkingPanel } from './components/WalkingPanel';
import { DemoSkip, MapFab, Snackbar, Toast } from './components/MapControls';
import HomeSheet from './components/HomeSheet';

const BASE_ROUTE = buildRoute(BASE_ROUTE_LEGS);
const ALT_ROUTE = buildRoute(ALT_ROUTE_LEGS);
const DEST_AREA = bounds([[[690, 590], [830, 720]]]);

// Footprint/zone overlays + map markers for a set of parking options.
function optionOverlays(options, selectedId, onSelect) {
  const zones = [];
  const footprints = [];
  const markers = [];
  options.forEach((o) => {
    const active = o.id === selectedId;
    if (o.type === 'street') {
      zones.push({ id: o.id, points: o.zone, active, roadKind: o.roadKind });
      const mid = pointAt(o.zone, pathLength(o.zone) / 2);
      const vertical = Math.abs(o.zone[1][0] - o.zone[0][0]) < Math.abs(o.zone[1][1] - o.zone[0][1]);
      markers.push({
        id: `z-${o.id}`,
        kind: 'zone',
        point: [mid.x, mid.y + (vertical ? 40 : 0)],
        side: vertical ? 'left' : 'center',
        label: active ? `${o.name} · ${o.likelihood}` : o.name,
        active,
        onPress: onSelect && (() => onSelect(o.id)),
        accessibilityLabel: `${o.name} street parking zone, ${o.likelihood} likelihood`,
      });
    } else if (o.type === 'garage') {
      const f = o.footprint;
      footprints.push({ id: o.id, rect: f, active });
      markers.push({
        id: `g-${o.id}`,
        kind: 'garage',
        point: [f.x + f.w / 2, f.y + f.h / 2],
        label: o.price,
        selected: active,
        onPress: onSelect && (() => onSelect(o.id)),
        accessibilityLabel: `${o.name}, ${o.price}`,
      });
    }
  });
  return { zones, footprints, markers };
}

export default function SmartArrivalPrototype() {
  perfSample('prototype.render', 1);
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [state, dispatch] = useReducer(reducer, undefined, demoInitialState);
  const { screen, drive } = state;

  const [sheetH, setSheetH] = useState(300);
  const [headerH, setHeaderH] = useState(insets.top + 150);

  // The map camera frames the area above the bottom sheet / below the
  // header. Sheets only report their height after mounting, so using the
  // live height would move the camera twice per transition (once for the
  // screen, again after measuring). Instead the camera uses a per-screen
  // height (estimated, then cached once measured) and only re-frames if the
  // real height differs noticeably.
  const camScreen = screen === S.ROUTE_PREVIEW && !state.parkingDismissed ? S.PARKING_PROMPT : screen;
  const sheetCache = useRef({});
  const headerCache = useRef({});
  const camScreenRef = useRef(camScreen);
  camScreenRef.current = camScreen;
  const reportSheetH = useCallback((h) => {
    sheetCache.current[camScreenRef.current] = h;
    setSheetH(h);
  }, []);
  const reportHeaderH = useCallback((h) => {
    headerCache.current[camScreenRef.current] = h;
    setHeaderH(h);
  }, []);
  const SHEET_EST = {
    [S.HOME]: 0.2,
    [S.DESTINATION]: 0.33,
    [S.ROUTE_PREVIEW]: 0.25,
    [S.PARKING_PROMPT]: 0.39,
    [S.PARKING_PREFERENCE]: 0.42,
    [S.PARKING_OPTIONS]: 0.62,
    [S.ARRIVAL_ROUTE]: 0.48,
    [S.PARKED]: 0.28,
    [S.ARRIVED]: 0.4,
  };
  const camSheetH = sheetCache.current[camScreen] ?? (SHEET_EST[camScreen] || 0.35) * H;
  // Directions card: two stops ~160 pt, three stops ~210 pt below the safe area.
  const camHeaderH = headerCache.current[camScreen] ?? insets.top + (camScreen === S.ARRIVAL_ROUTE ? 210 : 160);
  const [bannerH, setBannerH] = useState(insets.top + 120);
  const carRef = useRef({ distance: 0, point: ORIGIN });
  const planCamRef = useRef(null); // last 2D camera, so Start tilts out of it
  const [snack, setSnack] = useState(null);
  const snackTimer = useRef(null);
  const showSnack = (text) => {
    clearTimeout(snackTimer.current);
    setSnack(text);
    snackTimer.current = setTimeout(() => setSnack(null), 2600);
  };
  const jumpRef = useRef(null);

  const plan = getPlan(state.planId);
  const driving = DRIVING_SCREENS.has(screen);
  const walking = screen === S.WALKING || screen === S.ARRIVED;

  // Dev-only scripted actions for capturing transitions (off by default).
  useEffect(() => {
    if (!DEMO_TIMELINE) return undefined;
    const timers = DEMO_TIMELINE.map((t) => setTimeout(() => dispatch(t.action), t.at));
    return () => timers.forEach(clearTimeout);
  }, []);

  // ------------------------------------------------------------------ timers
  useEffect(() => {
    if (screen === S.ROUTE_PREVIEW && !state.parkingDismissed && shouldPromptForParking('drive')) {
      const t = setTimeout(() => dispatch({ type: 'SHOW_PARKING_PROMPT' }), TIMING.parkingPromptDelay);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [screen, state.parkingDismissed]);

  useEffect(() => {
    if (screen === S.REROUTED) {
      const t = setTimeout(() => dispatch({ type: 'REROUTE_DONE' }), TIMING.rerouteToast);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [screen]);

  // Garages: once at the entrance, treat the car as parked after a beat.
  useEffect(() => {
    if (screen === S.APPROACHING && state.arrivedAtEnd && plan.type === 'garage') {
      const t = setTimeout(
        () => dispatch({ type: 'PARKED', carPoint: carRef.current.point }),
        TIMING.garageArrivalPause
      );
      return () => clearTimeout(t);
    }
    return undefined;
  }, [screen, state.arrivedAtEnd, plan.type]);

  useEffect(() => {
    if (drive) {
      carRef.current = { distance: drive.startDistance, point: carRef.current.point };
      navProgress.set(drive.startDistance);
    }
  }, [drive]);

  useEffect(() => {
    if (screen === S.WALKING) navProgress.set(0);
  }, [screen]);

  // -------------------------------------------------------------- walk path
  const parkedPlan = getPlan(state.parkedPlanId);
  const walkPath = useMemo(() => {
    if (state.parkedAt) return parkedPlan.walkFrom(state.parkedAt);
    return null;
  }, [state.parkedAt, parkedPlan]);
  const walkLength = walkPath ? pathLength(walkPath) : 0;

  // ------------------------------------------------------------------ motion
  const motionTarget = (() => {
    if (driving && drive) {
      switch (screen) {
        case S.NAVIGATION:
        case S.REROUTED:
          return drive.approachAt;
        case S.APPROACHING:
          return drive.zoneStart ?? drive.route.length;
        case S.PARKING_SEARCH:
          return drive.route.length;
        default:
          return undefined; // Gemini: hold position while the driver decides
      }
    }
    if (walking) return walkLength;
    return undefined;
  })();

  const motion = useMemo(() => {
    let baseKey;
    let points;
    let start;
    let length;
    let speed;
    let vehicle;
    if ((driving || screen === S.PARKED) && drive) {
      baseKey = drive.key;
      points = drive.route.points;
      length = drive.route.length;
      start = drive.startDistance;
      vehicle = 'car';
      speed =
        screen === S.PARKING_SEARCH ? SPEED.parkingSearch : screen === S.APPROACHING ? SPEED.approaching : SPEED.navigation;
    } else if (walking && walkPath) {
      baseKey = `walk-${state.parkedAt.join(',')}`;
      points = walkPath;
      length = walkLength;
      start = 0;
      vehicle = 'walker';
      speed = walkLength / SPEED.walkSeconds; // pace the walk by duration, not distance
    } else {
      return null;
    }
    const j = jumpRef.current;
    if (j && j.baseKey === baseKey && j.jump === state.jump) start = j.distance;
    return {
      key: `${baseKey}:${state.jump}`,
      phase: screen,
      points,
      length,
      startDistance: start,
      targetDistance: screen === S.PARKED ? undefined : motionTarget,
      speed,
      vehicle,
    };
  }, [driving, walking, screen, drive, walkPath, walkLength, state.jump, state.parkedAt, motionTarget]);

  const stateRef = useRef(state);
  stateRef.current = state;

  // The map reports progress every frame; the rest of the screen only needs
  // to re-render when something it displays would change (turn distance,
  // minutes, distance remaining, zone entry), not ~30 times a second.
  const displayKeyRef = useRef('');
  const onProgress = useCallback((d, pos) => {
    carRef.current = { distance: d, point: [pos.x, pos.y] };
    const s = stateRef.current;
    let key;
    if (s.drive && DRIVING_SCREENS.has(s.screen)) {
      const dr = s.drive;
      const m = nextManeuver(dr.route, d);
      key = [
        m ? m.distance : '',
        m ? formatDistance(m.distance - d) : '',
        remainingMinutes(dr, d),
        formatDistance(Math.max(0, dr.route.length - d)),
        dr.zoneStart != null && d >= dr.zoneStart - 1,
        dr.zoneStart != null ? formatDistance(Math.max(0, dr.zoneStart - d)) : '',
      ].join('|');
    } else {
      key = `${Math.round(d / 15)}`; // walking: banner distance in ~50 ft steps
    }
    if (key !== displayKeyRef.current) {
      displayKeyRef.current = key;
      navProgress.set(d);
    }
  }, []);

  const onArrive = useCallback((target) => {
    const s = stateRef.current;
    navProgress.set(target);
    if (s.screen === S.NAVIGATION && s.drive && target >= s.drive.approachAt - 0.5) {
      dispatch({ type: 'REACHED_APPROACH' });
    } else if (s.screen === S.APPROACHING && s.drive) {
      if (s.drive.zoneStart != null && target >= s.drive.zoneStart - 0.5) dispatch({ type: 'REACHED_ZONE' });
      else if (target >= s.drive.route.length - 0.5) dispatch({ type: 'REACHED_END' });
    } else if (s.screen === S.PARKING_SEARCH && s.drive && target >= s.drive.route.length - 0.5) {
      dispatch({ type: 'REACHED_END' });
    } else if (s.screen === S.WALKING) {
      dispatch({ type: 'ARRIVE' });
    }
  }, []);

  const demoJump = () => {
    if (!motion || motionTarget == null) return;
    jumpRef.current = { baseKey: motion.key.split(':')[0], jump: state.jump + 1, distance: motionTarget };
    dispatch({ type: 'DEMO_JUMP' });
  };

  // ------------------------------------------------------------------ camera
  const camera = useMemo(() => {
    const fit = (b, extra = {}) => ({
      mode: 'fit',
      bounds: b,
      insets: { top: extra.top ?? insets.top + 20, bottom: extra.bottom ?? camSheetH + 12, left: 28, right: 28 },
      maxZoom: extra.maxZoom ?? 2.2,
      // Heights are bucketed so small measurement differences never re-frame.
      key: `${camScreen}:${Math.round((extra.top ?? 0) / 48)}:${Math.round(camSheetH / 48)}:${extra.k || ''}`,
    });
    const follow = (zoom, focalY) => ({ mode: 'follow', zoom, focalY, key: `follow:${zoom}:${focalY}` });
    const pad = (b, p) => ({ minX: b.minX - p, minY: b.minY - p, maxX: b.maxX + p, maxY: b.maxY + p });

    switch (screen) {
      case S.HOME:
      case S.SEARCH:
      case S.SEARCH_RESULTS:
        return fit(bounds([[[ORIGIN[0] - 160, ORIGIN[1] + 60], [820, 640]]]), { top: insets.top + 130, bottom: camSheetH + 10, maxZoom: 1, k: 'home' });
      case S.DESTINATION:
        return fit(pad(DEST_AREA, 140), { top: insets.top + 110, maxZoom: 1.3 });
      case S.ROUTE_PREVIEW:
      case S.PARKING_PROMPT:
        return fit(bounds([BASE_ROUTE.points, ALT_ROUTE.points]), { top: camHeaderH + 56, k: 'route' });
      case S.PARKING_PREFERENCE:
        return fit(bounds([[[500, 540], [840, 900]]]), { top: insets.top + 24, k: 'pref' });
      case S.PARKING_OPTIONS: {
        const opts = rankOptions(state.preference);
        const pts = opts.map((o) => (o.zone ? o.zone : [[o.footprint.x, o.footprint.y], [o.footprint.x + o.footprint.w, o.footprint.y + o.footprint.h]]));
        return fit(pad(bounds([...pts, [DESTINATION.entrance]]), 40), { top: insets.top + 16, k: state.preference, maxZoom: 2 });
      }
      case S.ARRIVAL_ROUTE: {
        // Frame the end of the trip so drive -> park -> walk is legible.
        const r = buildRoute(plan.legs);
        const end = slice(r.points, r.length - 300, r.length);
        const walkPts = plan.walkFrom(r.points[r.points.length - 1]);
        return fit(pad(bounds([end, walkPts, [DESTINATION.entrance]]), 30), { top: camHeaderH + 44, k: plan.id, maxZoom: 2 });
      }
      case S.GEMINI_RECOMMENDATION:
        return fit(pad(bounds([[state.geminiCarPoint || ORIGIN], DEST_AREA_POINTS, proposedRoutePoints(state)]), 40), {
          top: bannerH + 12,
          k: 'gemini',
          maxZoom: 1.8,
        });
      case S.NAVIGATION:
      case S.REROUTED:
      case S.GEMINI_LISTENING:
        return follow(1.35, 0.6);
      case S.APPROACHING:
        return follow(1.8, 0.6);
      case S.PARKING_SEARCH:
        return follow(2.2, 0.56);
      case S.PARKED:
        return fit(pad(bounds([[state.parkedAt || DESTINATION.curbPoint, DESTINATION.entrance]]), 60), {
          k: 'parked',
          maxZoom: 2.6,
        });
      case S.WALKING:
        return follow(2.4, 0.45);
      case S.ARRIVED:
        return fit(pad(bounds([walkPath || [DESTINATION.entrance]]), 90), { k: 'arrived', maxZoom: 2 });
      default:
        return fit(DEST_AREA);
    }
  }, [screen, camScreen, camSheetH, camHeaderH, bannerH, insets.top, state, plan, walkPath]);

  // ---------------------------------------------------------------- overlays
  const overlays = useMemo(() => {
    const destMarker = (compact) => ({
      id: 'dest',
      kind: 'destination',
      point: DESTINATION.entrance,
      label: DESTINATION.name,
      compact,
    });
    const originMarker = { id: 'origin', kind: 'origin', point: ORIGIN };
    // Where driving ends and walking begins (street zones only; garages
    // already have their own marker).
    const handoff = (p) => {
      if (p.type !== 'street') return { id: 'handoff', kind: 'none', point: [0, 0] };
      const end = buildRoute(p.legs).points.slice(-1)[0];
      return { id: 'handoff', kind: 'handoff', point: end };
    };
    const empty = { routes: [], zones: [], footprints: [], markers: [], walk: null, showPois: false };

    switch (screen) {
      case S.HOME:
      case S.SEARCH:
      case S.SEARCH_RESULTS:
        return { ...empty, markers: [originMarker], showPois: true };
      case S.DESTINATION:
        return { ...empty, markers: [originMarker, destMarker()], showPois: true };
      case S.ROUTE_PREVIEW:
      case S.PARKING_PROMPT: {
        const mid = pointAt(BASE_ROUTE.points, BASE_ROUTE.length * 0.42);
        const altMid = pointAt(ALT_ROUTE.points, ALT_ROUTE.length * 0.5);
        return {
          ...empty,
          routes: [
            { id: 'alt', points: ALT_ROUTE.points, variant: 'alt' },
            { id: 'base', points: BASE_ROUTE.points, variant: 'primary' },
          ],
          markers: [
            originMarker,
            destMarker(),
            { id: 'b1', kind: 'bubble', point: [mid.x, mid.y], label: `${TRIP.baseDriveMinutes} min` },
            { id: 'b2', kind: 'bubble', point: [altMid.x, altMid.y], label: `${TRIP.altDriveMinutes} min`, muted: true },
          ],
        };
      }
      case S.PARKING_PREFERENCE:
        return { ...empty, routes: [{ id: 'base', points: BASE_ROUTE.points, variant: 'primary' }], markers: [destMarker()] };
      case S.PARKING_OPTIONS: {
        const opts = rankOptions(state.preference);
        const sel = getPlan(state.selectedOptionId);
        const o = optionOverlays(opts, state.selectedOptionId, (id) => dispatch({ type: 'SELECT_OPTION', id }));
        return {
          ...empty,
          routes: [{ id: sel.id, points: buildRoute(sel.legs).points, variant: 'primary' }],
          zones: o.zones,
          footprints: o.footprints,
          walk: sel.walkFrom(buildRoute(sel.legs).points.slice(-1)[0]),
          markers: [...o.markers, handoff(sel), destMarker(true)],
        };
      }
      case S.ARRIVAL_ROUTE: {
        const r = buildRoute(plan.legs);
        const o = optionOverlays([plan], plan.id);
        return {
          ...empty,
          routes: [{ id: plan.id, points: r.points, variant: 'primary' }],
          zones: o.zones,
          footprints: o.footprints,
          walk: plan.walkFrom(r.points[r.points.length - 1]),
          markers: [
            originMarker,
            ...o.markers,
            handoff(plan),
            destMarker(),
            // No route-time bubble here: the journey card carries the times.
          ],
        };
      }
      case S.PARKED:
        return {
          ...empty,
          walk: walkPath,
          markers: [{ id: 'parked', kind: 'parked', point: state.parkedAt, label: 'You parked here' }, destMarker()],
        };
      case S.WALKING:
      case S.ARRIVED:
        return {
          ...empty,
          walk: walkPath,
          markers: [
            { id: 'parked', kind: 'parked', point: state.parkedAt, label: state.parkingSaved ? 'Saved parking' : null },
            destMarker(),
          ],
        };
      default: {
        if (!drive) return empty;
        // Driving screens
        const planNow = getPlan(drive.planId);
        const o = optionOverlays([planNow], planNow.id);
        const zones = drive.zone ? [{ id: 'zone', points: drive.zone, active: true, roadKind: planNow.roadKind }] : o.zones;
        const routes = [{ id: 'drive', points: drive.route.points, variant: 'primary', trim: true }];
        let markers = [destMarker(true)];
        if (planNow.type === 'garage') markers = [...o.markers, ...markers];
        if (screen === S.GEMINI_RECOMMENDATION) {
          const target = getPlan(geminiScriptFor(state).targetOptionId);
          const t = optionOverlays([target], null);
          routes.unshift({ id: 'proposed', points: proposedRoutePoints(state), variant: 'proposed' });
          zones.push(...t.zones.map((z) => ({ ...z, id: 'proposed-zone', active: true })));
          markers = [...markers, ...t.markers.map((m) => ({ ...m, active: true, label: `${target.name} · +${target.driveDetourMinutes} min` }))];
        }
        return {
          ...empty,
          routes,
          zones,
          footprints: o.footprints,
          walk: planNow.walkFrom(drive.route.points[drive.route.points.length - 1]),
          markers,
        };
      }
    }
  }, [screen, state, plan, drive, walkPath]);

  // ------------------------------------------------------- immersive view
  // Planning stays 2D; from Start onward the map tilts into a heading-up,
  // forward-looking camera, and eases back toward overhead once parked.
  const immersive = driving || screen === S.PARKED || walking;
  const [twoDGone, setTwoDGone] = useState(false);
  useEffect(() => {
    if (!immersive) {
      setTwoDGone(false);
      return undefined;
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setTwoDGone(true)));
    return () => cancelAnimationFrame(id);
  }, [immersive]);
  const keep2D = !immersive || !twoDGone;
  // During that overlap frame the 2D map keeps its last planning camera and
  // overlays (driving screens have no 2D camera spec).
  const lastPlanning = useRef(null);

  const immersiveCamera = useMemo(() => {
    const follow = (zoom, pitch, fy, extra = {}) => ({ mode: 'follow', zoom, pitch, fy, key: `f:${zoom}:${pitch}:${fy}`, ...extra });
    const look = (point, zoom, pitch, fy, key) => ({ mode: 'look', point, zoom, pitch, fy, key, duration: 1000 });
    switch (screen) {
      case S.GEMINI_RECOMMENDATION:
        // Rise up a little so the proposed route is visible above the card.
        return follow(0.95, 54, 0.4, { duration: 700 });
      case S.APPROACHING:
        return follow(2.6, 58, 0.7, { duration: 900 });
      case S.PARKING_SEARCH:
        return follow(2.9, 55, 0.64, { duration: 900 });
      case S.PARKED: {
        const p = state.parkedAt || DESTINATION.curbPoint;
        const mid = [(p[0] + DESTINATION.entrance[0]) / 2, (p[1] + DESTINATION.entrance[1]) / 2];
        return look(mid, 1.9, 36, 0.36, `parked:${mid.join(',')}`);
      }
      case S.WALKING:
        return follow(2.4, 42, 0.55, { duration: 900 });
      case S.ARRIVED:
        return look(DESTINATION.entrance, 1.7, 30, 0.34, 'arrived');
      default:
        return follow(2.3, 60, 0.72, { duration: 850 });
    }
  }, [screen, state.parkedAt]);

  const immersiveScene = useMemo(() => {
    if (!immersive) return {};
    const dest = { id: 'dest', kind: 'destination', point: DESTINATION.entrance, label: DESTINATION.name };
    if (!driving) {
      return {
        route: null,
        zones: [],
        walk: walkPath,
        markers: [
          { id: 'parked', kind: 'parked', point: state.parkedAt, label: screen === S.PARKED ? 'You parked here' : state.parkingSaved ? 'Saved parking' : null },
          dest,
        ],
      };
    }
    const planNow = getPlan(drive.planId);
    const end = drive.route.points[drive.route.points.length - 1];
    const zones = drive.zone ? [{ points: drive.zone, roadKind: planNow.roadKind }] : [];
    const markers = [{ ...dest, compact: true }];
    // Street names at upcoming turns, for orientation in the 3D view.
    drive.route.maneuvers.forEach((m, i) => {
      const p = pointAt(drive.route.points, m.distance);
      markers.push({ id: `st-${i}`, kind: 'street', point: [p.x, p.y], label: m.street });
    });
    if (planNow.type === 'garage') {
      const f = planNow.footprint;
      markers.push({ id: 'g', kind: 'garage', point: [f.x + f.w / 2, f.y + f.h / 2], label: planNow.price, selected: true });
    }
    if (planNow.type === 'street') markers.push({ id: 'handoff', kind: 'handoff', point: end });
    let proposed = null;
    if (screen === S.GEMINI_RECOMMENDATION) {
      const target = getPlan(geminiScriptFor(state).targetOptionId);
      proposed = proposedRoutePoints(state);
      if (target.zone) zones.push({ points: target.zone, roadKind: target.roadKind });
      const tEnd = proposed[proposed.length - 1];
      markers.push({ id: 'pz', kind: 'zone', point: tEnd, label: `${target.name} · +${target.driveDetourMinutes} min`, active: true });
    }
    return {
      route: { key: drive.key, points: drive.route.points },
      proposed,
      zones,
      walk: planNow.walkFrom(end),
      markers,
      activeGarageId: planNow.type === 'garage' ? planNow.id : null,
    };
  }, [immersive, driving, drive, screen, state, walkPath]);


  // ------------------------------------------------------------------ render
  const script = driving ? geminiScriptFor(state) : null;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {/* On Start the 3D map mounts first; the 2D map is removed one frame
          later, so the two expensive commits don't land in the same frame. */}
      {keep2D && (
        <MapCanvas
          width={W}
          height={H}
          {...(immersive ? lastPlanning.current : (lastPlanning.current = { camera, ...overlays }))}
          cameraOut={planCamRef}
        />
      )}
      {immersive && (
        <ImmersiveMap
          width={W}
          height={H}
          camera={immersiveCamera}
          initialCamera={planCamRef.current}
          motion={motion}
          route={immersiveScene.route}
          proposed={immersiveScene.proposed}
          zones={immersiveScene.zones}
          walk={immersiveScene.walk}
          markers={immersiveScene.markers}
          activeGarageId={immersiveScene.activeGarageId}
          highlightPier={DESTINATION.name}
          showVehicle={driving || walking}
          onProgress={onProgress}
          onArrive={onArrive}
        />
      )}

      {/* ---------------- Planning ---------------- */}
      {screen === S.HOME && (
        <>
          <HomeSearchBar onPress={() => dispatch({ type: 'OPEN_SEARCH' })} />
          <MapFab icon="layers" accessibilityLabel="Map layers (not available in prototype)" style={{ right: 14, top: insets.top + 130 }} />
          <MapFab icon="my-location" tint={color.primary} accessibilityLabel="Your location" style={{ right: 14, bottom: sheetH + 14 }} />
          <HomeSheet
            onHeight={reportSheetH}
            onSelect={() => dispatch({ type: 'SELECT_DESTINATION' })}
            onUnavailable={() => showSnack('This prototype follows the Pier 3 scenario.')}
          />
        </>
      )}

      {(screen === S.SEARCH || screen === S.SEARCH_RESULTS) && (
        <SearchPanel
          query={state.query}
          onChangeQuery={(query) => dispatch({ type: 'SET_QUERY', query })}
          onClose={() => dispatch({ type: 'CLOSE_SEARCH' })}
          onSelect={() => dispatch({ type: 'SELECT_DESTINATION' })}
        />
      )}

      {screen === S.DESTINATION && (
        <>
          <PlaceSearchBar
            title={DESTINATION.name}
            onBack={() => dispatch({ type: 'OPEN_SEARCH' })}
            onClose={() => dispatch({ type: 'BACK_TO_HOME' })}
          />
          <DestinationSheet
            onHeight={reportSheetH}
            onDirections={() => dispatch({ type: 'DIRECTIONS' })}
            onAskGemini={() => showSnack('Gemini can help with parking once you plan a route.')}
          />
        </>
      )}

      {(screen === S.ROUTE_PREVIEW || screen === S.PARKING_PROMPT) && (
        <>
          <DirectionsHeader
            onHeight={reportHeaderH}
            driveMinutes={TRIP.baseDriveMinutes}
            onBack={() => dispatch({ type: 'BACK_TO_DESTINATION' })}
          />
          <RouteSummary
            onHeight={reportSheetH}
            showPrompt={screen === S.PARKING_PROMPT}
            parkingDismissed={state.parkingDismissed}
            onPlan={() => dispatch({ type: 'PLAN_PARKING' })}
            onDismiss={() => dispatch({ type: 'DISMISS_PARKING' })}
            onStart={() => dispatch({ type: 'START' })}
          />
        </>
      )}

      {screen === S.PARKING_PREFERENCE && (
        <ParkingPreferenceSheet
          onHeight={reportSheetH}
          onChoose={(preference) => dispatch({ type: 'CHOOSE_PREFERENCE', preference })}
          onBack={() => dispatch({ type: 'BACK_TO_ROUTE' })}
        />
      )}

      {screen === S.PARKING_OPTIONS && (
        <ParkingOptionsSheet
          onHeight={reportSheetH}
          preference={state.preference}
          selectedId={state.selectedOptionId}
          onSelect={(id) => dispatch({ type: 'SELECT_OPTION', id })}
          onPreference={(preference) => dispatch({ type: 'CHOOSE_PREFERENCE', preference })}
          onConfirm={() => dispatch({ type: 'CONFIRM_OPTION' })}
          onBack={() => dispatch({ type: 'BACK_TO_PREFERENCE' })}
        />
      )}

      {screen === S.ARRIVAL_ROUTE && (
        <>
          <DirectionsHeader
            onHeight={reportHeaderH}
            driveMinutes={driveMinutes(plan)}
            parkingStop={{ name: plan.name, type: plan.type }}
            onBack={() => dispatch({ type: 'CHANGE_PARKING' })}
          />
          <ArrivalRouteSheet
            onHeight={reportSheetH}
            plan={plan}
            onStart={() => dispatch({ type: 'START' })}
            onChange={() => dispatch({ type: 'CHANGE_PARKING' })}
          />
        </>
      )}

      {/* ---------------- Driving ---------------- */}
      {driving && drive && (
        <DrivingChrome
          state={state}
          plan={plan}
          script={script}
          sheetH={sheetH}
          setSheetH={setSheetH}
          setBannerH={setBannerH}
          bannerH={bannerH}
          dispatch={dispatch}
          carRef={carRef}
          onSkip={motionTarget != null && screen !== S.REROUTED ? demoJump : null}
        />
      )}

      {/* ---------------- Parked / walking ---------------- */}
      {screen === S.PARKED && (
        <ParkedSheet
          onHeight={reportSheetH}
          plan={parkedPlan}
          saved={state.parkingSaved}
          onSave={() => dispatch({ type: 'TOGGLE_SAVE_PARKING' })}
          onWalk={() => dispatch({ type: 'START_WALKING' })}
        />
      )}

      {screen === S.WALKING && walkPath && (
        <WalkingChrome
          walkLength={walkLength}
          plan={parkedPlan}
          saved={state.parkingSaved}
          sheetH={sheetH}
          setSheetH={setSheetH}
          setBannerH={setBannerH}
          onExit={() => dispatch({ type: 'ARRIVE' })}
          onSkip={demoJump}
        />
      )}

      {screen === S.ARRIVED && (
        <ArrivedSheet
          onHeight={reportSheetH}
          summary={[
            { icon: 'directions-car', text: `Drove about ${driveMinutes(parkedPlan)} min` },
            {
              icon: 'local-parking',
              text: parkedPlan.type === 'destination' ? `Parked near ${DESTINATION.name}` : `Parked at ${parkedPlan.name}`,
            },
            { icon: 'directions-walk', text: `Walked ${parkedPlan.walkMinutes} min to ${DESTINATION.name}` },
            ...(state.parkingSaved ? [{ icon: 'bookmark', text: 'Parking location saved' }] : []),
          ]}
          onDone={() => dispatch({ type: 'RESTART' })}
        />
      )}
      {(screen === S.HOME || screen === S.DESTINATION) && <Snackbar text={snack} bottom={sheetH + 12} />}
      <PerfHud />
    </View>
  );
}

const DEST_AREA_POINTS = [DESTINATION.entrance, DESTINATION.curbPoint];

// Route Gemini proposes, starting from where the car was when Gemini opened.
function proposedRoutePoints(state) {
  const target = getPlan(geminiScriptFor(state).targetOptionId);
  const r = buildRoute(target.legs);
  const from = state.geminiCarPoint || ORIGIN;
  return slice(r.points, project(r.points, from), r.length);
}

// ---------------------------------------------------------------------------
// Driving overlay: banner, bottom panel, Gemini, parking guidance.

// Navigation readouts derived from progress; only this subtree re-renders
// as the vehicle moves.
function useNavInfo(drive, arrivedAtEnd) {
  const d = useNavProgress();
  return useMemo(() => {
    const remaining = Math.max(0, drive.route.length - d);
    const minutes = remainingMinutes(drive, d);
    const m = nextManeuver(drive.route, d);
    const after = m ? nextManeuver(drive.route, m.distance + 1) : null;
    return {
      minutes,
      distance: formatDistance(remaining),
      eta: formatClock(minutes),
      maneuver: m,
      then: after && after.distance - m.distance < 260 ? { icon: MANEUVER_ICON[after.type], text: after.street } : null,
      maneuverDistance: m ? formatDistance(m.distance - d) : formatDistance(remaining),
      street: streetAt(drive.route, d),
      inZone: drive.zoneStart != null && d >= drive.zoneStart - 1,
      zoneEnded: arrivedAtEnd,
      toZone: drive.zoneStart != null ? formatDistance(Math.max(0, drive.zoneStart - d)) : null,
    };
  }, [drive, d, arrivedAtEnd]);
}

function WalkingChrome({ walkLength, plan, saved, sheetH, setSheetH, setBannerH, onExit, onSkip }) {
  const d = useNavProgress();
  const early = d < walkLength * 0.55;
  const left = formatDistance(Math.max(0, walkLength - d));
  return (
    <>
      <NavigationBanner
        icon={early ? 'directions-walk' : 'place'}
        distance={left}
        verb={early ? 'Walk toward' : 'Arriving at'}
        title={early ? 'The Embarcadero' : `${DESTINATION.name} entrance`}
        subtitle={early ? `Then to ${DESTINATION.name}` : null}
        onHeight={setBannerH}
      />
      <WalkingPanel
        onHeight={setSheetH}
        minutes={Math.max(1, Math.round(plan.walkMinutes * (1 - d / walkLength)))}
        distance={left}
        eta={formatClock(plan.walkMinutes)}
        carLabel={saved ? `Parking saved · ${plan.type === 'destination' ? 'near ' + DESTINATION.name : plan.name}` : null}
        onExit={onExit}
      />
      <DemoSkip onPress={onSkip} style={{ left: 16, bottom: sheetH + 12 }} />
    </>
  );
}

function DrivingChrome({ state, plan, script, sheetH, setSheetH, setBannerH, bannerH, dispatch, carRef, onSkip }) {
  const { screen } = state;
  const navInfo = useNavInfo(state.drive, state.arrivedAtEnd);
  const insets = useSafeAreaInsets();
  const isStreet = plan.type === 'street';

  let banner;
  if (screen === S.APPROACHING) {
    if (isStreet) {
      banner = {
        parking: true,
        distance: navInfo.toZone,
        title: 'Parking zone begins after the next intersection',
        subtitle: plan.name,
        arrival: true,
      };
    } else if (plan.type === 'garage') {
      banner = {
        icon: state.arrivedAtEnd ? 'local-parking' : MANEUVER_ICON[navInfo.maneuver?.type || 'straight'],
        distance: state.arrivedAtEnd ? null : navInfo.distance,
        title: state.arrivedAtEnd ? `Arrived at ${plan.name}` : `${plan.name} entrance on the left`,
        subtitle: plan.restrictions,
        arrival: true,
      };
    } else {
      banner = {
        icon: 'place',
        distance: state.arrivedAtEnd ? null : navInfo.distance,
        title: state.arrivedAtEnd ? `You’ve reached ${DESTINATION.name}` : `${DESTINATION.name} on the right`,
        subtitle: 'The Embarcadero',
        arrival: true,
      };
    }
  } else if (screen === S.PARKING_SEARCH && navInfo.inZone) {
    banner = {
      parking: true,
      title: 'Look for parking along the highlighted blocks',
      subtitle: `${plan.name} · ${plan.price}`,
    };
  } else if (navInfo.maneuver) {
    banner = {
      icon: MANEUVER_ICON[navInfo.maneuver.type],
      distance: navInfo.maneuverDistance,
      verb: MANEUVER_VERB[navInfo.maneuver.type],
      title: navInfo.maneuver.street,
      subtitle: screen === S.PARKING_SEARCH ? `To ${plan.name} parking area` : null,
      then: navInfo.then,
    };
  } else {
    banner = {
      icon: isStreet ? null : 'straight',
      parking: isStreet,
      distance: isStreet ? navInfo.toZone : navInfo.distance,
      title: isStreet ? `${plan.name} parking area ahead` : `Continue on ${navInfo.street}`,
      subtitle: isStreet ? 'Recommended search area' : null,
    };
  }

  const showGeminiButton = screen === S.NAVIGATION || screen === S.APPROACHING || screen === S.REROUTED;
  const geminiOpen = screen === S.GEMINI_LISTENING || screen === S.GEMINI_RECOMMENDATION;
  const parkingPanel = screen === S.PARKING_SEARCH || (screen === S.APPROACHING && state.arrivedAtEnd && plan.type === 'destination');

  return (
    <>
      <NavigationBanner
        icon={banner.icon}
        parking={banner.parking}
        distance={banner.distance}
        verb={banner.verb}
        title={banner.title}
        subtitle={banner.subtitle}
        then={banner.then}
        onHeight={setBannerH}
        enterDelay={450}
      >
        {banner.arrival && <ArrivalModeBanner plan={plan} />}
      </NavigationBanner>

      {screen === S.REROUTED && (
        <Toast gemini text={state.rerouteMessage} style={{ top: bannerH + 14 }} />
      )}

      {geminiOpen && (
        <GeminiSheet
          key="gemini"
          screen={screen}
          script={script}
          option={getPlan(script.targetOptionId)}
          onHeight={setSheetH}
          onRespond={() => dispatch({ type: 'GEMINI_RESPOND' })}
          onAccept={() => dispatch({ type: 'GEMINI_ACCEPT', carPoint: carRef.current.point })}
          onDismiss={() => dispatch({ type: 'GEMINI_DISMISS' })}
        />
      )}

      {!geminiOpen && !parkingPanel && (
        <BottomNavPanel
          onHeight={setSheetH}
          minutes={navInfo.minutes}
          distance={navInfo.distance}
          eta={navInfo.eta}
          parking={plan.type !== 'destination' ? plan : null}
          onExit={() => dispatch({ type: 'EXIT_NAVIGATION' })}
        />
      )}

      {parkingPanel && (
        <ParkingSearchPanel
          onHeight={setSheetH}
          plan={plan}
          inZone={navInfo.inZone}
          zoneEnded={navInfo.zoneEnded}
          canTryAnother={!!plan.fallback}
          onTryAnother={() => dispatch({ type: 'TRY_ANOTHER_AREA', carDistance: carRef.current.distance })}
          onParked={() => dispatch({ type: 'PARKED', carPoint: carRef.current.point })}
          onExit={() => dispatch({ type: 'EXIT_NAVIGATION' })}
        />
      )}

      {showGeminiButton && (
        <GeminiButton
          onPress={() => dispatch({ type: 'OPEN_GEMINI', carPoint: carRef.current.point })}
          style={{ position: 'absolute', right: 16, bottom: sheetH + 14 }}
        />
      )}

      {onSkip && !geminiOpen && <DemoSkip onPress={onSkip} style={{ left: 16, bottom: sheetH + 24 }} />}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F3F5' },
});
