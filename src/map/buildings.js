// Deterministic building footprints so city blocks read as a dense
// downtown rather than an empty grid. Generated once into a single SVG path.

import { EMBARCADERO_X, NS_STREETS, EW_STREETS, soma } from './geography';

// Stable pseudo-random in [0, 1).
function rand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const marketYAt = (x) => 890 + (EMBARCADERO_X - x) * (0.621 / 0.784);
const INSET = 9; // keeps buildings clear of the street casing
const GAP = 2.2;

// Split a block (in local u/v coordinates) into 2–6 lots.
function lots(u0, v0, u1, v1, seed) {
  const out = [];
  const cols = rand(seed) > 0.45 ? 2 : 3;
  const rows = rand(seed + 1) > 0.5 ? 2 : 1;
  const cw = (u1 - u0) / cols;
  const rh = (v1 - v0) / rows;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const s = seed + c * 7 + r * 13;
      if (rand(s + 3) < 0.12) continue; // occasional plaza / gap
      const shrinkU = rand(s + 5) * cw * 0.18;
      const shrinkV = rand(s + 9) * rh * 0.18;
      out.push([
        u0 + c * cw + GAP + shrinkU * 0.5,
        v0 + r * rh + GAP + shrinkV * 0.5,
        u0 + (c + 1) * cw - GAP - shrinkU * 0.5,
        v0 + (r + 1) * rh - GAP - shrinkV * 0.5,
      ]);
    }
  }
  return out;
}

const rectPath = (pts) => `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z`;

// Buildings are bucketed into square tiles so the map only draws what is on
// screen; redrawing every footprint each animation frame is too slow.
export const BUILDING_TILE = 300;
const tiles = {};
function addRect(pts) {
  const key = `${Math.floor(pts[0][0] / BUILDING_TILE)},${Math.floor(pts[0][1] / BUILDING_TILE)}`;
  tiles[key] = (tiles[key] || '') + rectPath(pts);
}

function fidi() {
  const xs = [...Object.values(NS_STREETS), EMBARCADERO_X].sort((a, b) => a - b);
  const ys = Object.values(EW_STREETS).sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const [x0, x1, y0, y1] = [xs[i], xs[i + 1], ys[j], ys[j + 1]];
      // Only whole blocks north of Market.
      if (y1 + INSET > marketYAt(x1) || y1 + INSET > marketYAt(x0)) continue;
      lots(x0 + INSET, y0 + INSET, x1 - INSET, y1 - INSET, i * 31 + j * 17).forEach(([a, b, c, e]) => {
        addRect([[a, b], [c, b], [c, e], [a, e]]);
      });
    }
  }
}

function somaBlocks() {
  const os = [0, 75, 150, 225, 300, 375, 450, 525, 600];
  const ss = [100, 180, 260, 340, 420, 520, 600, 680, 800, 920, 1040, 1160, 1280, 1400, 1520, 1640, 1760];
  for (let i = 0; i < ss.length - 1; i++) {
    for (let j = 0; j < os.length - 1; j++) {
      const s0 = ss[i] + INSET;
      const s1 = ss[i + 1] - INSET;
      const o0 = os[j] + INSET;
      const o1 = os[j + 1] - INSET;
      const corners = [soma(s0, o0), soma(s1, o0), soma(s1, o1), soma(s0, o1)];
      if (corners.some((p) => p[0] > EMBARCADERO_X - INSET)) continue;
      lots(s0, o0, s1, o1, 900 + i * 23 + j * 11).forEach(([a, b, c, e]) => {
        addRect([soma(a, b), soma(c, b), soma(c, e), soma(a, e)]);
      });
    }
  }
}

fidi();
somaBlocks();

export const BUILDING_TILES = tiles;
