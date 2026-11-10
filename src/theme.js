// Design tokens. Values approximate the current Google Maps light theme
// without copying any proprietary asset.

export const color = {
  // Surfaces
  background: '#F8FAFD', // soft neutral behind surfaces
  surface: '#FFFFFF',
  surfaceDim: '#F1F4F8', // quiet fills: fields, chips, notes
  surfaceContainer: '#E8EDF4',
  containerLow: '#F3F6FB', // grouped containers on white sheets
  containerTint: '#EEF3FD', // lightly tinted (Gemini / contextual) containers
  scrim: 'rgba(0,0,0,0.32)',

  // Brand / actions
  primary: '#0B57D0',
  primaryPressed: '#0842A0',
  primaryTonal: '#D3E3FD',
  primaryTonalPressed: '#C2D7F8',
  onPrimaryTonal: '#041E49',
  selectedFill: '#F4F8FF', // selected card background

  // Text
  text: '#1F1F1F',
  textMuted: '#444746', // secondary
  textSubtle: '#5F6368', // tertiary / metadata

  // Lines
  outline: '#C4C7C5',
  outlineVariant: '#DADCE0',
  divider: '#E8EAED',

  // Status
  success: '#137333',
  successContainer: '#E6F4EA',
  eta: '#188038',
  warning: '#8C5000',
  warningBg: '#FFF4E5',
  likelyHigh: '#137333',
  likelyMedium: '#8A6100',
  likelyLow: '#B3261E',

  // Navigation
  navGreen: '#0E6B3B',
  navGreenDark: '#0A5530',
  navBlue: '#0B57D0',

  // Map
  land: '#F1F3F4',
  building: '#E2E4E8',
  buildingFar: '#E8EAED',
  buildingEdge: '#D5D8DD',
  shoreline: '#D9DCE0',
  landmark: '#ECE2D0',
  landmarkDark: '#C8B38E',
  highwayLabel: '#7A5E12',
  landAlt: '#ECEEF1',
  water: '#9CD3F5',
  waterLabel: '#3F7FAE',
  park: '#C7E9C9',
  parkLabel: '#2F7D45',
  pier: '#E4E6EA',
  pierEdge: '#D2D5DA',
  road: '#FFFFFF',
  roadCasing: '#DCDFE3',
  arterial: '#FFFFFF',
  arterialCasing: '#C9CDD3',
  highway: '#FCE7A6',
  highwayCasing: '#E3C26E',
  roadLabel: '#5F6368',
  areaLabel: '#7A7F87',

  route: '#1A73E8',
  routeCasing: '#1558B0',
  routeAlt: '#A8C7FA',
  routeAltCasing: '#7EA6E8',
  routeProposedSoft: '#AECBFA',
  walk: '#1A73E8',
  zone: '#1E8E3E',
  zoneSoft: 'rgba(30,142,62,0.28)',
  zoneMuted: '#7C8A80',
  zoneMutedSoft: 'rgba(110,125,115,0.22)',
  garage: '#1A73E8',
  pin: '#EA4335',
  pinDark: '#B31412',
  locationDot: '#1A73E8',
};

export const gemini = {
  // Generic AI-assistant gradient (not a logo reproduction)
  a: '#4285F4',
  b: '#9B72CB',
  c: '#D96570',
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24, // expressive containers
  sheet: 28,
  pill: 999,
};

// 4-pt spacing scale. `space(n)` kept for older call sites.
export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const space = (n) => n * 4;

// Material 3-style type scale, kept compact for a map product: medium
// weights for titles, strong weights only for data (ETA, minutes).
export const type = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '500', letterSpacing: -0.3 },
  titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: '500', letterSpacing: -0.2 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '500', letterSpacing: -0.2 },
  titleMedium: { fontSize: 18, lineHeight: 24, fontWeight: '500' },
  titleSm: { fontSize: 18, lineHeight: 24, fontWeight: '500' },
  titleSmall: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  body: { fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  labelSmall: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16 },
  // Data
  eta: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.2 },
  etaLarge: { fontSize: 26, lineHeight: 32, fontWeight: '600', letterSpacing: -0.3 },
  metric: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
};

// Control and icon sizes
export const size = {
  touch: 48,
  button: 48,
  buttonCompact: 40,
  chip: 32,
  field: 44,
  fab: 48,
  iconSm: 16,
  icon: 20,
  iconLg: 24,
  handleW: 32,
  handleH: 4,
};

// Light, soft elevation; surfaces separate mostly by colour, not shadow.
export const elevation = {
  1: {
    shadowColor: '#1F2937',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  2: {
    shadowColor: '#1F2937',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  sheet: {
    shadowColor: '#1F2937',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -1 },
    elevation: 8,
  },
};

export const motion = {
  fast: 200,
  standard: 280,
  slow: 400,
  // Subtle Material 3 Expressive-style spring for surfaces entering.
  spring: { damping: 22, stiffness: 240, mass: 1 },
};

export const sheet = {
  paddingX: 20,
  paddingTop: 8,
  handleGap: 14, // handle -> first content
  sectionGap: 16,
};

export const MIN_TOUCH = size.touch;
