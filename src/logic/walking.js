// Mock pedestrian network for the Pier 3 scenario, and a deterministic
// shortest-path router over it. Walking routes follow sidewalks, cross
// streets only at intersections, use the Embarcadero promenade and end at
// the Pier 3 entrance, so they never cut through a block.

import { EMBARCADERO_X, EW_STREETS as Y, NS_STREETS as X } from '../map/geography';
import { pathLength } from '../map/geometry';

// Sidewalk offsets from street centrelines (map units). Grid streets use
// the east / north sidewalk; the Embarcadero uses the waterfront promenade.
const SIDE = 9;
const PROMENADE_X = EMBARCADERO_X + 17;
// Pier 3 entrance (same point as PIER3_ENTRANCE in mockData).
export const PIER3_ENTRANCE = [804, Y.Washington];

const COLS = [X.Battery, X.Front, X.Davis]; // grid streets near the pier
const ROWS = [Y.Jackson, Y.Washington, Y.Clay, Y.Sacramento];

const colX = (x) => (x === EMBARCADERO_X ? PROMENADE_X : x + SIDE);
const rowY = (y) => y - SIDE;

// ---------------------------------------------------------------------------
// Graph: sidewalk corners, promenade points and the pier entrance.

const nodes = new Map(); // id -> [x, y]
const edges = new Map(); // id -> Set(id)
const add = (id, p) => {
  nodes.set(id, p);
  if (!edges.has(id)) edges.set(id, new Set());
};
const link = (a, b) => {
  edges.get(a).add(b);
  edges.get(b).add(a);
};

const allCols = [...COLS, EMBARCADERO_X];
allCols.forEach((x) => ROWS.forEach((y) => add(`${x},${y}`, [colX(x), rowY(y)])));
// Along each street (crossing the next street at its intersection).
ROWS.forEach((y) => allCols.slice(1).forEach((x, i) => link(`${allCols[i]},${y}`, `${x},${y}`)));
allCols.forEach((x) => ROWS.slice(1).forEach((y, i) => link(`${x},${ROWS[i]}`, `${x},${y}`)));
// Battery St continues to California (for the Embarcadero Center Garage).
add('batt-cal', [colX(X.Battery), rowY(Y.California)]);
link(`${X.Battery},${Y.Sacramento}`, 'batt-cal');
// Pier 3: promenade point opposite the pier, then the entrance.
add('pier3-promenade', [PROMENADE_X, PIER3_ENTRANCE[1]]);
link(`${EMBARCADERO_X},${Y.Washington}`, 'pier3-promenade');
link(`${EMBARCADERO_X},${Y.Clay}`, 'pier3-promenade');
add('pier3', PIER3_ENTRANCE);
link('pier3-promenade', 'pier3');

// The sidewalk segments, for snapping a parked car onto the network.
const SEGMENTS = [];
edges.forEach((set, a) =>
  set.forEach((b) => {
    if (a < b) SEGMENTS.push([a, b]);
  })
);

const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

function closestOnSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return [a[0] + dx * t, a[1] + dy * t];
}

// Dijkstra from a temporary start node to the entrance.
function route(startPoint, startLinks) {
  const d = new Map([['start', 0]]);
  const prev = new Map();
  const done = new Set();
  const neighbours = (id) =>
    id === 'start' ? startLinks : [...edges.get(id)].map((n) => n);
  const pos = (id) => (id === 'start' ? startPoint : nodes.get(id));
  while (true) {
    let cur = null;
    d.forEach((v, k) => {
      if (!done.has(k) && (cur === null || v < d.get(cur))) cur = k;
    });
    if (cur === null) return null;
    if (cur === 'pier3') break;
    done.add(cur);
    neighbours(cur).forEach((n) => {
      const nd = d.get(cur) + dist(pos(cur), pos(n));
      if (!d.has(n) || nd < d.get(n)) {
        d.set(n, nd);
        prev.set(n, cur);
      }
    });
  }
  const path = [];
  for (let id = 'pier3'; id; id = prev.get(id)) path.unshift(pos(id));
  return path;
}

// Walking path from a parked car (on a street centreline) to Pier 3: step to
// the nearest sidewalk, then follow the network.
export function walkingRoute(parked) {
  let best = null;
  SEGMENTS.forEach(([a, b]) => {
    const q = closestOnSegment(parked, nodes.get(a), nodes.get(b));
    const dd = dist(parked, q);
    if (!best || dd < best.d) best = { d: dd, q, a, b };
  });
  const path = route(best.q, [best.a, best.b]);
  // Skip the curb step when the car is already at the sidewalk point.
  return best.d > 1 ? [parked, ...path] : path;
}

export const walkLength = (parked) => pathLength(walkingRoute(parked));
