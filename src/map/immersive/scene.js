// World data for the immersive view, derived from the same mock geography as
// the 2D map: road segments with real widths, lane markings, and extruded
// buildings with deterministic heights. Built once at module load.

import {
  STREETS,
  MAJOR_ROADS,
  HIGHWAYS,
  PIERS,
  PARKS,
  NS_STREETS,
  EW_STREETS,
  EMBARCADERO_X,
  SHORE_X,
  soma,
} from '../geography';

export const ROAD_W = { local: 13, arterial: 17, major: 30, highway: 22 };
export const SIDEWALK = 5;

function rand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// Roads, split into short segments so culling is cheap and precise.

const MAX_SEG = 140;

function splitLine(points, kind, name, out) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(len / MAX_SEG));
    for (let k = 0; k < n; k++) {
      const p = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      const q = [a[0] + ((b[0] - a[0]) * (k + 1)) / n, a[1] + ((b[1] - a[1]) * (k + 1)) / n];
      out.push({
        a: p,
        b: q,
        kind,
        name,
        w: ROAD_W[kind],
        cx: (p[0] + q[0]) / 2,
        cy: (p[1] + q[1]) / 2,
        r: len / n / 2 + ROAD_W[kind],
      });
    }
  }
}

export const ROADS = [];
STREETS.forEach((s) => splitLine(s.points, s.kind, s.name, ROADS));
MAJOR_ROADS.forEach((s) => splitLine(s.points, 'major', s.name, ROADS));
HIGHWAYS.forEach((s) => splitLine(s.points, 'highway', s.name, ROADS));

// Lane markings as thin ground quads: { pts: [4 points], color, cx, cy }
export const MARKINGS = [];
function quad(a, b, w) {
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
function offsetSeg(seg, off) {
  const dx = seg.b[0] - seg.a[0];
  const dy = seg.b[1] - seg.a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * off;
  const ny = (dx / len) * off;
  return [
    [seg.a[0] + nx, seg.a[1] + ny],
    [seg.b[0] + nx, seg.b[1] + ny],
  ];
}
function dashes(a, b, dash, gap, width, kind, out) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (let d = gap / 2; d + dash < len; d += dash + gap) {
    const p = [a[0] + ((b[0] - a[0]) * d) / len, a[1] + ((b[1] - a[1]) * d) / len];
    const q = [a[0] + ((b[0] - a[0]) * (d + dash)) / len, a[1] + ((b[1] - a[1]) * (d + dash)) / len];
    out.push({ pts: quad(p, q, width), kind, cx: (p[0] + q[0]) / 2, cy: (p[1] + q[1]) / 2 });
  }
}
ROADS.forEach((seg) => {
  if (seg.kind === 'major') {
    // Double yellow centre line plus dashed lane lines each side.
    [-0.9, 0.9].forEach((o) => {
      const [p, q] = offsetSeg(seg, o);
      MARKINGS.push({ pts: quad(p, q, 0.9), kind: 'yellow', cx: seg.cx, cy: seg.cy });
    });
    [-7.5, 7.5].forEach((o) => {
      const [p, q] = offsetSeg(seg, o);
      dashes(p, q, 7, 9, 0.9, 'white', MARKINGS);
    });
  } else if (seg.kind !== 'highway') {
    dashes(seg.a, seg.b, 6, 9, 0.8, 'white', MARKINGS);
  }
});

// ---------------------------------------------------------------------------
// Buildings: coarser lots than the 2D map, set back from wider roads.

const marketYAt = (x) => 890 + (EMBARCADERO_X - x) * (0.621 / 0.784);
const PARK_BOXES = PARKS.map((p) => {
  const xs = p.points.map((q) => q[0]);
  const ys = p.points.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
});
const overlapsPark = (x0, y0, x1, y1) =>
  PARK_BOXES.some(([a, b, c, d]) => x0 < c && x1 > a && y0 < d && y1 > b);

function heightFor(cx, cy, seed) {
  const r = rand(seed);
  if (cx > 690 && cx < SHORE_X) return 16 + r * 34; // low waterfront edge
  if (cy < 450) return 10 + r * 26; // North Beach / Telegraph Hill
  if (cx > 330 && cy < 1000) return 40 + r * 120; // Financial District
  const rh = soma(330, 300);
  if (Math.hypot(cx - rh[0], cy - rh[1]) < 260) return 70 + r * 110; // Rincon Hill
  return 18 + r * 55;
}

export const BUILDINGS = [];
const BLOCKS = []; // { pts, lots: [] } for the distant level of detail
function addBuilding(pts, h, extra = {}) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const r = Math.max(...pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy)));
  BUILDINGS.push({ pts, h, cx, cy, r, ...extra });
}

// Split a block into 1-3 lots along its longer side.
function blockLots(u0, v0, u1, v1, seed) {
  const n = 1 + Math.floor(rand(seed) * 3);
  const alongU = u1 - u0 >= v1 - v0;
  const lots = [];
  const gap = 3;
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    if (alongU) lots.push([u0 + (u1 - u0) * t0 + (i ? gap / 2 : 0), v0, u0 + (u1 - u0) * t1 - (i < n - 1 ? gap / 2 : 0), v1]);
    else lots.push([u0, v0 + (v1 - v0) * t0 + (i ? gap / 2 : 0), u1, v0 + (v1 - v0) * t1 - (i < n - 1 ? gap / 2 : 0)]);
  }
  return lots;
}

const GARAGE_BLOCKS = {
  'pier-garage': [690, 735, EMBARCADERO_X, 815],
  'ec-garage': [530, 815, 610, 895],
};

(function fidi() {
  const xs = [...Object.values(NS_STREETS), EMBARCADERO_X].sort((a, b) => a - b);
  const ys = Object.values(EW_STREETS).sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const [x0, x1, y0, y1] = [xs[i], xs[i + 1], ys[j], ys[j + 1]];
      const insetE = x1 === EMBARCADERO_X ? 22 : 14;
      const bx0 = x0 + 14;
      const bx1 = x1 - insetE;
      const by0 = y0 + 14;
      const by1 = y1 - 14;
      if (by1 + 6 > marketYAt(x1) || by1 + 6 > marketYAt(x0)) continue;
      if (overlapsPark(bx0, by0, bx1, by1)) continue;
      const garageId = Object.keys(GARAGE_BLOCKS).find((k) => {
        const g = GARAGE_BLOCKS[k];
        return g[0] === x0 && g[1] === y0;
      });
      if (garageId) {
        addBuilding([[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]], 24, { garageId });
        continue;
      }
      const block = { pts: [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]], heights: [] };
      blockLots(bx0, by0, bx1, by1, i * 31 + j * 17).forEach(([a, b, c, d], k) => {
        const cx = (a + c) / 2;
        const cy = (b + d) / 2;
        const h = heightFor(cx, cy, i * 7 + j * 13 + k);
        addBuilding([[a, b], [c, b], [c, d], [a, d]], h, { lod: true });
        block.heights.push(h);
      });
      BLOCKS.push(block);
    }
  }
})();

(function somaBlocks() {
  const os = [0, 75, 150, 225, 300, 375, 450, 525, 600];
  const ss = [100, 180, 260, 340, 420, 520, 600, 680, 800, 920, 1040, 1160, 1280, 1400, 1520, 1640, 1760];
  for (let i = 0; i < ss.length - 1; i++) {
    for (let j = 0; j < os.length - 1; j++) {
      const s0 = ss[i] + 14;
      const s1 = ss[i + 1] - 14;
      const o0 = os[j] + (j === 0 ? 20 : 14); // Market St is wider
      const o1 = os[j + 1] - 14;
      const corners = [soma(s0, o0), soma(s1, o0), soma(s1, o1), soma(s0, o1)];
      if (corners.some((p) => p[0] > EMBARCADERO_X - 22)) continue;
      const block = { pts: corners, heights: [] };
      blockLots(s0, o0, s1, o1, 900 + i * 23 + j * 11).forEach(([a, b, c, d], k) => {
        const pts = [soma(a, b), soma(c, b), soma(c, d), soma(a, d)];
        const cx = (pts[0][0] + pts[2][0]) / 2;
        const cy = (pts[0][1] + pts[2][1]) / 2;
        const h = heightFor(cx, cy, 500 + i * 7 + j * 13 + k);
        addBuilding(pts, h, { lod: true });
        block.heights.push(h);
      });
      BLOCKS.push(block);
    }
  }
})();

// Piers: low decks with sheds; the Ferry Building gets its clock tower.
PIERS.forEach((p) => {
  if (p.id === 'ferry') {
    addBuilding([[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]], 22, { kind: 'landmark' });
    addBuilding([[p.x + 8, 891], [p.x + 22, 891], [p.x + 22, 905], [p.x + 8, 905]], 72, { kind: 'landmark' });
    return;
  }
  addBuilding([[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]], 2.5, { kind: 'pier' });
  if (p.h > 20) {
    const i = 6;
    addBuilding(
      [[p.x + i + 4, p.y + i], [p.x + p.w - i, p.y + i], [p.x + p.w - i, p.y + p.h - i], [p.x + i + 4, p.y + p.h - i]],
      13,
      { kind: 'shed', label: p.label }
    );
  }
});

// ---------------------------------------------------------------------------
// Spatial grid so each frame only visits items near the camera instead of
// every road, lane dash and building in the city.

export const GRID = 200;

function makeGrid(items) {
  const cells = new Map();
  items.forEach((it) => {
    const key = `${Math.floor(it.cx / GRID)},${Math.floor(it.cy / GRID)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(it);
  });
  return cells;
}

export const ROAD_GRID = makeGrid(ROADS);
export const MARKING_GRID = makeGrid(MARKINGS);
export const BUILDING_GRID = makeGrid(BUILDINGS);

// Distant level of detail: one mass per city block (average lot height)
// plus the piers / landmarks / garages, which are already single shapes.
const lodBuildings = BLOCKS.map((bl) => {
  const pts = bl.pts;
  const cx = pts.reduce((s, p) => s + p[0], 0) / 4;
  const cy = pts.reduce((s, p) => s + p[1], 0) / 4;
  return {
    pts,
    h: bl.heights.reduce((s, h) => s + h, 0) / bl.heights.length,
    cx,
    cy,
    r: Math.max(...pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy))),
    block: true,
  };
}).concat(BUILDINGS.filter((b) => !b.lod));
export const BUILDING_LOD_GRID = makeGrid(lodBuildings);

// Items from `grid` whose cell overlaps the world-space box (with margin).
export function queryGrid(grid, box, margin = 0) {
  const out = [];
  const x0 = Math.floor((box.minX - margin) / GRID);
  const x1 = Math.floor((box.maxX + margin) / GRID);
  const y0 = Math.floor((box.minY - margin) / GRID);
  const y1 = Math.floor((box.maxY + margin) / GRID);
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const cell = grid.get(`${x},${y}`);
      if (cell) for (let i = 0; i < cell.length; i++) out.push(cell[i]);
    }
  }
  return out;
}
