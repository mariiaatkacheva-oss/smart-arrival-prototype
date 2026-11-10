// Stylised northeast San Francisco: Financial District grid, SoMa grid
// parallel to Market St, The Embarcadero and the piers. Prototype fidelity,
// not geographic accuracy. Units are arbitrary "map units"; north is up.

// The Embarcadero runs north–south at this x. The bay starts just east of it.
export const EMBARCADERO_X = 770;
export const SHORE_X = 792;

// Market St starts at the Ferry Building and runs southwest.
const FERRY = [EMBARCADERO_X, 890];
const MARKET_DIR = [-0.784, 0.621]; // southwest
const SOMA_NORMAL = [0.621, 0.784]; // southeast, perpendicular to Market

// Point in the SoMa grid: `s` units southwest along Market, `o` units southeast of it.
export function soma(s, o) {
  return [
    FERRY[0] + MARKET_DIR[0] * s + SOMA_NORMAL[0] * o,
    FERRY[1] + MARKET_DIR[1] * s + SOMA_NORMAL[1] * o,
  ];
}

const marketYAt = (x) => FERRY[1] + ((FERRY[0] - x) * MARKET_DIR[1]) / -MARKET_DIR[0];
const marketXAt = (y) => FERRY[0] - ((y - FERRY[1]) * -MARKET_DIR[0]) / MARKET_DIR[1];

// ---- Financial District / North Beach grid (north of Market) ----
export const NS_STREETS = {
  Davis: 690,
  Front: 610,
  Battery: 530,
  Sansome: 450,
  Montgomery: 370,
  Kearny: 290,
  Grant: 210,
  Stockton: 130,
  Powell: 50,
  Mason: -30,
  Taylor: -110,
  Jones: -190,
  Leavenworth: -270,
  Hyde: -350,
  Larkin: -430,
  Polk: -510,
};

export const EW_STREETS = {
  Greenwich: 15,
  Filbert: 95,
  Union: 175,
  Green: 255,
  Vallejo: 335,
  Broadway: 415,
  Pacific: 495,
  Jackson: 575,
  Washington: 655,
  Clay: 735,
  Sacramento: 815,
  California: 895,
  Pine: 975,
  Bush: 1055,
  Sutter: 1135,
  Post: 1215,
  Geary: 1295,
  "O'Farrell": 1375,
  Ellis: 1455,
  Eddy: 1535,
};

// ---- SoMa grid ----
const SOMA_PARALLEL = {
  Mission: 75,
  Howard: 150,
  Folsom: 225,
  Harrison: 300,
  Bryant: 375,
  Brannan: 450,
  Townsend: 525,
  King: 600,
};

const SOMA_CROSS = {
  Spear: 100,
  Main: 180,
  Beale: 260,
  Fremont: 340,
  '1st': 420,
  '2nd': 520,
  'New Montgomery': 600,
  '3rd': 680,
  '4th': 800,
  '5th': 920,
  '6th': 1040,
  '7th': 1160,
  '8th': 1280,
  '9th': 1400,
  '10th': 1520,
};

// Where a SoMa street parallel to Market meets The Embarcadero.
export function somaAtEmbarcadero(o) {
  const s = (FERRY[0] + SOMA_NORMAL[0] * o - EMBARCADERO_X) / -MARKET_DIR[0];
  return soma(s, o);
}

const ARTERIALS = new Set([
  'Broadway',
  'Columbus Ave',
  'Mission St',
  'Folsom St',
  '3rd St',
  '4th St',
  'King St',
  'Bush St',
  'Pine St',
]);

function streetName(name) {
  if (/^\d/.test(name) || name === 'New Montgomery') return `${name} St`;
  if (name === 'Broadway') return name;
  return `${name} St`;
}

function buildStreets() {
  const streets = [];
  const add = (name, points) =>
    streets.push({ name, points, kind: ARTERIALS.has(name) ? 'arterial' : 'local' });

  Object.entries(NS_STREETS).forEach(([n, x]) => add(streetName(n), [[x, -40], [x, marketYAt(x)]]));

  Object.entries(EW_STREETS).forEach(([n, y]) => {
    const east = y < FERRY[1] ? EMBARCADERO_X : marketXAt(y);
    add(streetName(n), [[-900, y], [east, y]]);
  });

  Object.entries(SOMA_PARALLEL).forEach(([n, o]) => {
    add(streetName(n), [somaAtEmbarcadero(o), soma(2300, o)]);
  });

  Object.entries(SOMA_CROSS).forEach(([n, s]) => {
    // Cross streets end at The Embarcadero or after ~8 blocks.
    const maxO = Math.min((s * -MARKET_DIR[0]) / SOMA_NORMAL[0], 760);
    add(streetName(n), [soma(s, 0), soma(s, maxO)]);
  });

  add('Columbus Ave', [[330, 655], [-40, 175], [-200, -40]]);
  return streets;
}

export const STREETS = buildStreets();

export const MAJOR_ROADS = [
  {
    name: 'The Embarcadero',
    points: [
      [EMBARCADERO_X, 2400],
      [EMBARCADERO_X, 272],
      [752, 202],
      [672, 140],
      [548, 94],
      [352, 64],
      [-900, 50],
    ],
  },
  { name: 'Market St', points: [FERRY, soma(2400, 0)] },
];

export const HIGHWAYS = [
  {
    name: 'I-80',
    points: [[2000, 1196], [SHORE_X, 1232], [700, 1262], soma(1000, 420), soma(2400, 420)],
  },
];

export const WATER = [
  [SHORE_X, 2600],
  [SHORE_X, 274],
  [776, 196],
  [692, 124],
  [562, 76],
  [360, 44],
  [-1000, 30],
  [-1000, -1000],
  [2400, -1000],
  [2400, 2600],
];

// Piers: x is always from the shoreline outwards.
export const PIERS = [
  { id: 'pier-15', x: SHORE_X - 6, y: 296, w: 160, h: 48, label: null },
  { id: 'pier-9', x: SHORE_X, y: 392, w: 200, h: 46, label: 'Pier 9' },
  { id: 'pier-7', x: SHORE_X, y: 484, w: 270, h: 14, label: 'Pier 7' },
  { id: 'pier-5', x: SHORE_X, y: 560, w: 170, h: 38, label: 'Pier 5' },
  { id: 'pier-3', x: SHORE_X, y: 632, w: 196, h: 46, label: 'Pier 3' },
  { id: 'pier-1', x: SHORE_X, y: 728, w: 168, h: 62, label: 'Pier 1' },
  { id: 'ferry', x: SHORE_X - 2, y: 850, w: 56, h: 96, label: null },
  { id: 'pier-14', x: SHORE_X, y: 1010, w: 220, h: 9, label: null },
  { id: 'pier-22', x: SHORE_X, y: 1100, w: 52, h: 34, label: null },
  { id: 'pier-26', x: SHORE_X, y: 1300, w: 196, h: 48, label: null },
  { id: 'pier-28', x: SHORE_X, y: 1400, w: 196, h: 40, label: null },
  { id: 'pier-30', x: SHORE_X, y: 1490, w: 214, h: 104, label: null },
];

export const PARKS = [
  { name: 'Sue Bierman Park', points: [[698, 664], [762, 664], [762, 727], [698, 727]] },
  { name: null, points: [[698, 823], [762, 823], [762, 884], [698, 940]] },
  { name: 'Washington Square', points: [[220, 102], [284, 102], [284, 168], [220, 168]] },
  { name: 'Pioneer Park', points: [[420, 120], [500, 112], [530, 160], [500, 206], [430, 210], [404, 168]] },
  { name: 'Yerba Buena Gardens', points: [soma(690, 84), soma(790, 84), soma(790, 142), soma(690, 142)] },
  { name: 'South Park', points: [soma(590, 395), soma(640, 395), soma(640, 430), soma(590, 430)] },
  { name: 'Union Square', points: [[-26, 1142], [44, 1142], [44, 1208], [-26, 1208]] },
];

export const POIS = [
  { name: 'Ferry Building', point: [818, 898], icon: 'storefront', tint: '#C26401', labelSide: 'right' },
  { name: 'Exploratorium', point: [868, 320], icon: 'museum', tint: '#1E8E3E', labelSide: 'right' },
  { name: 'Coit Tower', point: [468, 160], icon: 'account-balance', tint: '#5E5E5E', labelSide: 'right' },
  { name: 'Salesforce Tower', point: soma(390, 40), icon: 'business', tint: '#5E5E5E', labelSide: 'right' },
  { name: 'Oracle Park', point: [700, 1760], icon: 'sports-baseball', tint: '#1E8E3E', labelSide: 'right' },
  { name: 'Transamerica Pyramid', point: [410, 618], icon: 'business', tint: '#5E5E5E', labelSide: 'right' },
];

export const AREA_LABELS = [
  { text: 'NORTH BEACH', point: [120, 300] },
  { text: 'TELEGRAPH HILL', point: [560, 240] },
  { text: 'CHINATOWN', point: [170, 700] },
  { text: 'FINANCIAL DISTRICT', point: [430, 860] },
  { text: 'SOUTH OF MARKET', point: soma(1150, 300) },
  { text: 'RINCON HILL', point: soma(330, 300) },
  { text: 'SOUTH BEACH', point: soma(620, 600) },
  { text: 'UNION SQUARE', point: [10, 1100] },
];

export const WATER_LABELS = [
  { text: 'San Francisco Bay', point: [1180, 820] },
  { text: 'Bay Bridge', point: [1150, 1176], size: 11, minZ: 0.45 },
];
