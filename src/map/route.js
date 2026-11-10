import { cumulative, pathLength } from './geometry';

// A route is a list of legs ({ street, points }) whose endpoints touch.
// buildRoute flattens them and derives turn-by-turn maneuvers.

function heading(a, b) {
  return (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI;
}

function turnType(delta) {
  const d = ((delta + 540) % 360) - 180;
  const abs = Math.abs(d);
  if (abs < 20) return 'straight';
  if (abs < 65) return d > 0 ? 'slight-right' : 'slight-left';
  return d > 0 ? 'right' : 'left';
}

export function buildRoute(legs) {
  const points = [];
  const legStarts = [];
  legs.forEach((leg) => {
    leg.points.forEach((p, i) => {
      if (points.length && i === 0) {
        const last = points[points.length - 1];
        if (last[0] === p[0] && last[1] === p[1]) {
          legStarts.push(points.length - 1);
          return;
        }
      }
      if (i === 0) legStarts.push(points.length);
      points.push(p);
    });
  });

  const c = cumulative(points);
  const maneuvers = [];
  for (let li = 1; li < legs.length; li++) {
    const vi = legStarts[li];
    if (vi <= 0 || vi >= points.length - 1) continue;
    const type = turnType(heading(points[vi], points[vi + 1]) - heading(points[vi - 1], points[vi]));
    maneuvers.push({ distance: c[vi], type, street: legs[li].street });
  }

  // Street the vehicle is on at a given distance.
  const legRanges = legs.map((leg, li) => ({
    street: leg.street,
    from: c[legStarts[li]],
  }));

  return { points, length: pathLength(points), maneuvers, legRanges };
}

export function streetAt(route, distance) {
  let street = route.legRanges[0]?.street;
  route.legRanges.forEach((r) => {
    if (distance >= r.from) street = r.street;
  });
  return street;
}

export function nextManeuver(route, distance) {
  return route.maneuvers.find((m) => m.distance > distance + 1) || null;
}

// Concatenate a route with extra legs (used for "Try another area").
export function joinLegs(...legLists) {
  return legLists.flat().filter((leg) => leg.points.length > 1);
}
