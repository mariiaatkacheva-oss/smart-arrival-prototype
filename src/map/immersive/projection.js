// Minimal perspective camera for the immersive driving view.
//
// A camera is { tx, ty, z, pitch, heading, fy }:
//   tx, ty   map point the camera looks at (drawn at screen x = W/2, y = fy*H)
//   z        pixels per map unit at that point
//   pitch    0 = straight down, ~60 = looking forward toward the horizon
//   heading  degrees, 0 = north; the map is rotated so heading points up
//
// Points are first expressed in a local frame (X = right, Y = forward,
// h = height) and then projected. Geometry behind the near plane is clipped.

const RAD = Math.PI / 180;
export const FOCAL = 0.85; // focal length as a fraction of screen height

export function makeCamera(cam, W, H) {
  const p = cam.pitch * RAD;
  const hd = cam.heading * RAD;
  const f = FOCAL * H;
  const D = f / cam.z; // camera distance from target, in map units
  const sinp = Math.sin(p);
  const cosp = Math.cos(p);
  const fx = Math.sin(hd); // forward (world)
  const fw = -Math.cos(hd);
  const rx = Math.cos(hd); // right (world)
  const ry = Math.sin(hd);
  const cx = W / 2;
  const cy = cam.fy * H;
  const near = D * 0.18;
  // Smallest forward distance a ground point may have (depth >= near).
  const yMin = sinp > 1e-3 ? (near - D) / sinp : -Infinity;

  return {
    W,
    H,
    D,
    f,
    sinp,
    cosp,
    near,
    yMin,
    // Camera position on the ground plane (for back-face tests).
    camX: cam.tx - fx * D * sinp,
    camY: cam.ty - fw * D * sinp,
    horizonY: sinp > 1e-3 ? cy - (f * cosp) / sinp : -Infinity,
    local(x, y) {
      const dx = x - cam.tx;
      const dy = y - cam.ty;
      return [dx * rx + dy * ry, dx * fx + dy * fw];
    },
    depth(Y, h = 0) {
      return Y * sinp - h * cosp + D;
    },
    // Local point -> screen. Caller guarantees depth >= near.
    proj(X, Y, h = 0) {
      const d = Y * sinp - h * cosp + D;
      const s = f / d;
      return [cx + X * s, cy - (Y * cosp + h * sinp) * s];
    },
    scaleAt(Y) {
      return f / (Y * sinp + D);
    },
    // World-space bounding box of the visible ground, out to `maxDepth`
    // camera-distances (used to query the spatial grid).
    groundBox(maxDepth, margin = 60) {
      const bottom = -((H - cy) * D) / (f * cosp + (H - cy) * sinp);
      const yNear = Math.max(sinp > 1e-3 ? yMin : -Infinity, bottom);
      const denom = f * cosp - cy * sinp;
      let yFar = denom > 1e-3 ? (cy * D) / denom : Infinity; // top of screen
      if (sinp > 1e-3) yFar = Math.min(yFar, (maxDepth * D - D) / sinp);
      const half = (Y) => ((W / 2 + margin) * Math.max(Y * sinp + D, near)) / f;
      const corners = [
        [-half(yNear), yNear],
        [half(yNear), yNear],
        [-half(yFar), yFar],
        [half(yFar), yFar],
      ].map(([X, Y]) => [cam.tx + X * rx + Y * fx, cam.ty + X * ry + Y * fw]);
      const xs = corners.map((p) => p[0]);
      const ys = corners.map((p) => p[1]);
      return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    },
  };
}

// Clip a ground polygon (local coords) to Y >= yMin.
export function clipPoly(pts, yMin) {
  if (yMin === -Infinity) return pts;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ain = a[1] >= yMin;
    const bin = b[1] >= yMin;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (yMin - a[1]) / (b[1] - a[1]);
      out.push([a[0] + (b[0] - a[0]) * t, yMin]);
    }
  }
  return out;
}

// Clip a ground polyline (local coords) to Y >= yMin; returns pieces.
export function clipLine(pts, yMin) {
  const pieces = [];
  let cur = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const inside = p[1] >= yMin;
    if (i > 0) {
      const q = pts[i - 1];
      const qin = q[1] >= yMin;
      if (inside !== qin) {
        const t = (yMin - q[1]) / (p[1] - q[1]);
        const m = [q[0] + (p[0] - q[0]) * t, yMin];
        if (inside) cur = [m];
        else {
          cur.push(m);
          pieces.push(cur);
          cur = [];
        }
      }
    }
    if (inside) cur.push(p);
  }
  if (cur.length > 1) pieces.push(cur);
  return pieces;
}

// Whole screen pixels: halves the SVG path strings sent to native each frame
// with no visible difference once antialiased.
const n1 = (v) => String(Math.round(v));

// Projected ground polygon -> SVG subpath ('' if fully clipped).
export function groundPoly(cam, worldPts) {
  const local = worldPts.map((p) => cam.local(p[0], p[1]));
  const c = clipPoly(local, cam.yMin);
  if (c.length < 3) return '';
  let d = '';
  for (let i = 0; i < c.length; i++) {
    const s = cam.proj(c[i][0], c[i][1]);
    d += `${i ? 'L' : 'M'}${n1(s[0])} ${n1(s[1])}`;
  }
  return `${d}Z`;
}

// Ground strip of width `w` along a world polyline (already smooth).
export function groundStrip(cam, worldPts, w) {
  if (worldPts.length < 2) return '';
  const half = w / 2;
  const left = [];
  const right = [];
  for (let i = 0; i < worldPts.length; i++) {
    const a = worldPts[Math.max(0, i - 1)];
    const b = worldPts[Math.min(worldPts.length - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    // Normal pointing to the right of travel (y grows south).
    const nx = -dy;
    const ny = dx;
    left.push([worldPts[i][0] - nx * half, worldPts[i][1] - ny * half]);
    right.push([worldPts[i][0] + nx * half, worldPts[i][1] + ny * half]);
  }
  return groundPoly(cam, [...left, ...right.reverse()]);
}

export { n1 };
