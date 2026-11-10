import { DESTINATION, DESTINATION_PLAN, PARKING_OPTIONS, TRIP, BASE_ROUTE_LEGS } from '../data/mockData';
import { buildRoute, joinLegs } from '../map/route';
import { project, slice, pathLength } from '../map/geometry';

// Prototype trigger (FR-01): only ask about parking when it is likely to matter.
export const shouldPromptForParking = (travelMode, destination = DESTINATION) =>
  travelMode === 'drive' && destination.parkingDifficulty !== 'easy';

export const getPlan = (id) => PARKING_OPTIONS.find((o) => o.id === id) || DESTINATION_PLAN;

export const driveMinutes = (plan) => TRIP.baseDriveMinutes + plan.driveDetourMinutes;

// Mocked total arrival effort (PRD §9): drive + detour + search + walk.
export const totalArrivalMinutes = (plan) =>
  TRIP.baseDriveMinutes + plan.driveDetourMinutes + plan.parkingSearchMinutes + plan.walkMinutes;

// Rank by total arrival time for the chosen preference. The first option is
// the recommendation.
export function rankOptions(preference) {
  const pool = PARKING_OPTIONS.filter((o) => preference === 'either' || o.type === preference);
  return [...pool].sort((a, b) => totalArrivalMinutes(a) - totalArrivalMinutes(b));
}

export const recommendedFor = (preference) => rankOptions(preference)[0];

const baseRoute = buildRoute(BASE_ROUTE_LEGS);
export const MILES_PER_UNIT = TRIP.baseMiles / baseRoute.length;
export const FEET_PER_UNIT = MILES_PER_UNIT * 5280;

export function formatDistance(units) {
  const ft = units * FEET_PER_UNIT;
  if (ft < 900) return `${Math.max(50, Math.round(ft / 50) * 50)} ft`;
  return `${(units * MILES_PER_UNIT).toFixed(1)} mi`;
}

export function formatClock(minutesFromNow) {
  const d = new Date(Date.now() + minutesFromNow * 60000);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Drive state: the polyline the car follows plus the distances where the UI
// changes mode (approach banner, parking-search zone).

const APPROACH_LEAD = 190; // map units before the zone/entrance

export function makeDrive(plan, { legs = plan.legs, zone = plan.zone, startDistance = 0, minutes } = {}) {
  const route = buildRoute(legs);
  const end = route.length;
  let zoneStart = null;
  if (plan.type === 'street' && zone) {
    zoneStart = end - pathLength(zone);
  }
  const arrivalPoint = zoneStart ?? end;
  return {
    key: `${plan.id}-${Date.now()}`,
    planId: plan.id,
    route,
    zone,
    zoneStart,
    approachAt: Math.max(startDistance, arrivalPoint - APPROACH_LEAD),
    startDistance,
    minutes: minutes ?? driveMinutes(plan),
  };
}

// Reroute: keep the car where it is and continue on the new plan's route.
export function rerouteDrive(newPlan, carPoint) {
  const route = buildRoute(newPlan.legs);
  const startDistance = project(route.points, carPoint);
  return makeDrive(newPlan, { startDistance });
}

// "Try another area": finish the current block, drive the connector, then
// search the fallback zone.
export function fallbackDrive(currentDrive, carDistance) {
  const current = getPlan(currentDrive.planId);
  if (!current.fallback) return null;
  const next = getPlan(current.fallback.optionId);
  const rest = slice(currentDrive.route.points, carDistance, currentDrive.route.length);
  const legs = joinLegs(
    [{ street: currentStreetName(currentDrive), points: rest }],
    current.fallback.connector,
    [{ street: next.name, points: next.zone }]
  );
  const length = buildRoute(legs).length;
  const minutes = Math.max(1, Math.round((length / baseRoute.length) * TRIP.baseDriveMinutes));
  return { plan: next, drive: makeDrive(next, { legs, zone: next.zone, minutes }) };
}

function currentStreetName(drive) {
  const legs = drive.route.legRanges;
  return legs[legs.length - 1]?.street;
}

export function remainingMinutes(drive, distance) {
  const frac = Math.max(0, 1 - distance / drive.route.length);
  return Math.max(1, Math.round(drive.minutes * frac));
}
