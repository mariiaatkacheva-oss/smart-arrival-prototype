// Small polyline helpers used by the mock map, the vehicle animation and
// reroute logic. Points are [x, y] in map units (north is up, y grows south).

export function segLength(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function cumulative(points) {
  const out = [0];
  for (let i = 1; i < points.length; i++) {
    out.push(out[i - 1] + segLength(points[i - 1], points[i]));
  }
  return out;
}

export function pathLength(points) {
  const c = cumulative(points);
  return c[c.length - 1];
}

// Heading in degrees, 0 = north, clockwise.
function headingOf(a, b) {
  return (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI;
}

function lerpAngle(a, b, t) {
  let d = ((b - a + 540) % 360) - 180;
  return a + d * t;
}

export function pointAt(points, distance) {
  const c = cumulative(points);
  const total = c[c.length - 1];
  const d = Math.max(0, Math.min(total, distance));
  let i = 1;
  while (i < points.length - 1 && c[i] < d) i++;
  const a = points[i - 1];
  const b = points[i];
  const len = c[i] - c[i - 1] || 1;
  const t = (d - c[i - 1]) / len;
  const x = a[0] + (b[0] - a[0]) * t;
  const y = a[1] + (b[1] - a[1]) * t;

  // Ease the heading through corners so the arrow turns rather than snaps.
  let heading = headingOf(a, b);
  const CORNER = 14;
  const toEnd = c[i] - d;
  const fromStart = d - c[i - 1];
  if (toEnd < CORNER && i < points.length - 1) {
    const next = headingOf(b, points[i + 1]);
    heading = lerpAngle(heading, next, 0.5 * (1 - toEnd / CORNER));
  } else if (fromStart < CORNER && i > 1) {
    const prev = headingOf(points[i - 2], a);
    heading = lerpAngle(prev, heading, 0.5 + 0.5 * (fromStart / CORNER));
  }
  return { x, y, heading };
}

// Distance along `points` of the closest point to `p`.
export function project(points, p) {
  const c = cumulative(points);
  let best = { dist: Infinity, along: 0 };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    const qx = a[0] + dx * t;
    const qy = a[1] + dy * t;
    const dist = Math.hypot(p[0] - qx, p[1] - qy);
    if (dist < best.dist) best = { dist, along: c[i - 1] + Math.sqrt(len2) * t };
  }
  return best.along;
}

// Portion of a polyline between two distances.
export function slice(points, from, to) {
  const c = cumulative(points);
  const total = c[c.length - 1];
  const a = Math.max(0, Math.min(total, from));
  const b = Math.max(a, Math.min(total, to));
  const start = pointAt(points, a);
  const out = [[start.x, start.y]];
  for (let i = 1; i < points.length - 1; i++) {
    if (c[i] > a && c[i] < b) out.push(points[i]);
  }
  const end = pointAt(points, b);
  out.push([end.x, end.y]);
  return out;
}

export function bounds(pointLists) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  pointLists.forEach((pts) =>
    pts.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    })
  );
  return { minX, minY, maxX, maxY };
}

export function toPath(points) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
}

// Polyline with rounded corners (quadratic curves), for natural-looking routes.
export function toSmoothPath(points, radius) {
  if (points.length < 3) return toPath(points);
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [a, b, c] = [points[i - 1], points[i], points[i + 1]];
    const l1 = segLength(a, b);
    const l2 = segLength(b, c);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    if (r < 0.5) {
      d += `L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
      continue;
    }
    const p1 = [b[0] + ((a[0] - b[0]) * r) / l1, b[1] + ((a[1] - b[1]) * r) / l1];
    const p2 = [b[0] + ((c[0] - b[0]) * r) / l2, b[1] + ((c[1] - b[1]) * r) / l2];
    d += `L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}Q${b[0].toFixed(1)} ${b[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const last = points[points.length - 1];
  return `${d}L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
}

// Parallel polyline offset `d` units to the right of travel direction
// (negative = left). Good enough for the grid-aligned curb segments.
export function offsetPolyline(points, d) {
  const normals = [];
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const len = segLength(a, b) || 1;
    normals.push([-(b[1] - a[1]) / len, (b[0] - a[0]) / len]);
  }
  return points.map((p, i) => {
    const n = normals[Math.min(i, normals.length - 1)];
    return [p[0] - n[0] * d, p[1] - n[1] * d];
  });
}
