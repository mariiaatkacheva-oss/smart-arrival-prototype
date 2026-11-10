// All prototype data lives here: destination, search catalog, trip timings,
// parking options (with their route geometry) and the scripted Gemini turns.
// Everything is mocked. Nothing here represents live parking availability.

import { walkingRoute } from '../logic/walking';
import { EMBARCADERO_X as E, EW_STREETS as Y, NS_STREETS as X, soma, somaAtEmbarcadero } from '../map/geography';

// ---------------------------------------------------------------------------
// Places

export const ORIGIN = soma(1500, 225); // "Your location", on Folsom St in SoMa
const FOLSOM_AT_EMBARCADERO = somaAtEmbarcadero(225);

export const DESTINATION = {
  id: 'pier-3',
  name: 'Pier 3',
  category: 'Pier',
  address: 'The Embarcadero, San Francisco, CA',
  fullAddress: 'Pier 3, The Embarcadero, San Francisco, CA 94111',
  curbPoint: [E, Y.Washington], // where a car stops in front of the pier
  entrance: [804, Y.Washington],
  parkingDifficulty: 'hard', // drives the proactive parking prompt
};

export const SEARCH_CATALOG = [
  { id: 'pier-3', title: 'Pier 3', subtitle: 'The Embarcadero, San Francisco, CA', distance: '1.2 mi', selectable: true },
  { id: 'pier-39', title: 'Pier 39', subtitle: 'The Embarcadero, San Francisco, CA', distance: '2.5 mi' },
  { id: 'pier-1', title: 'Pier 1', subtitle: 'The Embarcadero, San Francisco, CA', distance: '1.1 mi' },
  { id: 'pier-7', title: 'Pier 7', subtitle: 'The Embarcadero, San Francisco, CA', distance: '1.3 mi' },
  { id: 'pier-33', title: 'Pier 33 Alcatraz Landing', subtitle: 'The Embarcadero, San Francisco, CA', distance: '2.1 mi' },
  { id: 'ferry-building', title: 'Ferry Building', subtitle: 'Market St & The Embarcadero, San Francisco, CA', distance: '1.0 mi' },
  { id: 'oracle-park', title: 'Oracle Park', subtitle: 'King St, San Francisco, CA', distance: '0.9 mi' },
];

export const RECENT_SEARCHES = ['pier-3', 'ferry-building', 'oracle-park'];

export const HOME_CHIPS = [
  { label: 'Restaurants', icon: 'restaurant' },
  { label: 'Coffee', icon: 'local-cafe' },
  { label: 'Gas', icon: 'local-gas-station' },
  { label: 'Groceries', icon: 'local-grocery-store' },
];

// ---------------------------------------------------------------------------
// Trip

export const TRIP = {
  baseDriveMinutes: 12, // fastest route, no parking plan
  baseMiles: 1.2,
  altDriveMinutes: 15,
  modes: [
    { id: 'drive', icon: 'directions-car', minutes: 12 },
    { id: 'transit', icon: 'directions-transit', minutes: 21 },
    { id: 'walk', icon: 'directions-walk', minutes: 26 },
    { id: 'bike', icon: 'directions-bike', minutes: 9 },
  ],
};

const folsom = { street: 'Folsom St', points: [ORIGIN, FOLSOM_AT_EMBARCADERO] };
const embarcaderoTo = (y) => ({ street: 'The Embarcadero', points: [FOLSOM_AT_EMBARCADERO, [E, y]] });

export const BASE_ROUTE_LEGS = [folsom, embarcaderoTo(Y.Washington)];

export const ALT_ROUTE_LEGS = [
  { street: 'Folsom St', points: [ORIGIN, soma(680, 225)] },
  { street: '3rd St', points: [soma(680, 225), soma(680, 0)] },
  { street: 'Market St', points: [soma(680, 0), [E, 890]] },
  { street: 'The Embarcadero', points: [[E, 890], [E, Y.Washington]] },
];

// ---------------------------------------------------------------------------
// Parking options
//
// driveDetourMinutes: extra driving vs. the base route
// parkingSearchMinutes: expected time circling a street zone (0 for garages)
// walkMinutes: parked car -> Pier 3 entrance
// legs: route geometry; for street options the last leg is the search zone
// walkFrom(point): sidewalk walking path from where the car is parked (see logic/walking.js)


const WASHINGTON_ZONE = [[X.Battery, Y.Washington], [X.Davis, Y.Washington]];
const JACKSON_ZONE = [[X.Davis, Y.Jackson], [X.Battery, Y.Jackson]];
const CURB_ZONE = [[E, Y.Clay - 6], [E, Y.Jackson + 25]];

export const PARKING_OPTIONS = [
  {
    id: 'embarcadero-curb',
    type: 'street',
    name: 'Embarcadero curb',
    driveDetourMinutes: 2,
    parkingSearchMinutes: 3,
    walkMinutes: 2,
    price: 'Metered',
    likelihood: 'High',
    restrictions: '2 hr limit · check posted signs',
    reason: 'Best balance of drive and walk',
    roadKind: 'major', // The Embarcadero is wider than the grid streets
    legs: [folsom, { street: 'The Embarcadero', points: [FOLSOM_AT_EMBARCADERO, CURB_ZONE[0], CURB_ZONE[1]] }],
    zone: CURB_ZONE,
    walkFrom: walkingRoute,
    fallback: {
      optionId: 'washington-st',
      connector: [
        { street: 'The Embarcadero', points: [CURB_ZONE[1], [E, Y.Jackson]] },
        { street: 'Jackson St', points: [[E, Y.Jackson], [X.Battery, Y.Jackson]] },
        { street: 'Battery St', points: [[X.Battery, Y.Jackson], [X.Battery, Y.Washington]] },
      ],
    },
  },
  {
    id: 'washington-st',
    type: 'street',
    name: 'Washington St',
    driveDetourMinutes: 3,
    parkingSearchMinutes: 4,
    walkMinutes: 4,
    price: 'Metered',
    likelihood: 'Medium',
    restrictions: 'Some restrictions · check posted signs',
    reason: 'More curb space, slightly longer walk',
    legs: [
      folsom,
      embarcaderoTo(Y.Clay),
      { street: 'Clay St', points: [[E, Y.Clay], [X.Battery, Y.Clay]] },
      { street: 'Battery St', points: [[X.Battery, Y.Clay], WASHINGTON_ZONE[0]] },
      { street: 'Washington St', points: WASHINGTON_ZONE },
    ],
    zone: WASHINGTON_ZONE,
    walkFrom: walkingRoute,
    fallback: {
      optionId: 'jackson-st',
      connector: [{ street: 'Davis St', points: [WASHINGTON_ZONE[1], JACKSON_ZONE[0]] }],
    },
  },
  {
    id: 'jackson-st',
    type: 'street',
    name: 'Jackson St',
    driveDetourMinutes: 4,
    parkingSearchMinutes: 5,
    walkMinutes: 5,
    price: 'Metered',
    likelihood: 'Low',
    restrictions: '1 hr limit · check posted signs',
    reason: 'Backup area if closer blocks are full',
    legs: [
      folsom,
      embarcaderoTo(Y.Jackson),
      { street: 'Jackson St', points: [[E, Y.Jackson], JACKSON_ZONE[0], JACKSON_ZONE[1]] },
    ],
    zone: JACKSON_ZONE,
    walkFrom: walkingRoute,
    fallback: {
      optionId: 'washington-st',
      connector: [{ street: 'Battery St', points: [JACKSON_ZONE[1], WASHINGTON_ZONE[0]] }],
    },
  },
  {
    id: 'pier-garage',
    type: 'garage',
    name: 'Pier-area garage',
    driveDetourMinutes: 8,
    parkingSearchMinutes: 0,
    walkMinutes: 2,
    price: '~$18',
    predictability: 'High',
    restrictions: 'Entrance on Sacramento St',
    reason: 'Most predictable arrival',
    legs: [
      folsom,
      embarcaderoTo(Y.Clay),
      { street: 'Clay St', points: [[E, Y.Clay], [X.Front, Y.Clay]] },
      { street: 'Front St', points: [[X.Front, Y.Clay], [X.Front, Y.Sacramento]] },
      { street: 'Sacramento St', points: [[X.Front, Y.Sacramento], [725, Y.Sacramento]] },
    ],
    footprint: { x: 700, y: 746, w: 56, h: 58 },
    walkFrom: walkingRoute,
  },
  {
    id: 'ec-garage',
    type: 'garage',
    name: 'Embarcadero Center Garage',
    driveDetourMinutes: 12,
    parkingSearchMinutes: 0,
    walkMinutes: 5,
    price: '~$12',
    predictability: 'High',
    restrictions: 'Entrance on Battery St',
    reason: 'Lower cost, longer drive',
    legs: [
      folsom,
      embarcaderoTo(Y.Clay),
      { street: 'Clay St', points: [[E, Y.Clay], [X.Battery, Y.Clay]] },
      { street: 'Battery St', points: [[X.Battery, Y.Clay], [X.Battery, 860]] },
    ],
    footprint: { x: 540, y: 828, w: 60, h: 56 },
    walkFrom: walkingRoute,
  },
];

// "No preference": drive to the pier as usual, no parking plan.
export const DESTINATION_PLAN = {
  id: 'destination',
  type: 'destination',
  name: 'Pier 3',
  driveDetourMinutes: 0,
  parkingSearchMinutes: 0,
  walkMinutes: 1,
  legs: BASE_ROUTE_LEGS,
  walkFrom: walkingRoute,
};

// One deterministic walking route per parking option, from the usual
// parking point (end of the zone / garage entrance) to the Pier 3 entrance.
export const WALKING_ROUTES = Object.fromEntries(
  PARKING_OPTIONS.map((o) => {
    const last = o.legs[o.legs.length - 1].points;
    return [o.id, walkingRoute(last[last.length - 1])];
  })
);

export const PREFERENCES = [
  { id: 'street', label: 'Street', icon: 'add-road', hint: 'Metered curb near the pier' },
  { id: 'garage', label: 'Garage', icon: 'garage', hint: 'Paid, no searching' },
  { id: 'either', label: 'Either', icon: 'local-parking', hint: 'Compare street and garages' },
];

// ---------------------------------------------------------------------------
// Gemini (scripted). Keyed by the type of the plan that is active when the
// driver opens Gemini. Copy stays to 1–2 sentences while driving.

// `headline` is what the card shows; `response` is the full spoken reply.
export const GEMINI_SCRIPTS = {
  garage: {
    utterance: 'Find me street parking instead.',
    thinking: 'Looking for street parking near Pier 3…',
    targetOptionId: 'washington-st',
    title: 'Better street parking found',
    headline: 'There’s a better street-parking area two blocks north.',
    response:
      'There’s a better street-parking area two blocks north. It adds about 3 minutes and leaves you a 4-minute walk. Want me to reroute?',
    confirmation: 'Rerouting to street parking',
  },
  street: {
    utterance: 'Find street parking with more space.',
    thinking: 'Looking for street parking near Pier 3…',
    targetOptionId: 'washington-st',
    title: 'More curb space nearby',
    headline: 'Washington St has more curb space, a block west.',
    response:
      'Washington Street has more curb space, a block west. It adds about 3 minutes and leaves you a 4-minute walk. Want me to reroute?',
    confirmation: 'Rerouting to Washington St',
  },
  // Used when the driver is already headed to the street area above.
  streetToGarage: {
    utterance: 'Find me a garage instead.',
    thinking: 'Looking for garages near Pier 3…',
    targetOptionId: 'pier-garage',
    title: 'Predictable garage found',
    headline: 'The Pier-area garage is the most predictable option.',
    response:
      'The Pier-area garage is the most predictable option. It adds about 8 minutes and leaves you a 2-minute walk. Want me to reroute?',
    confirmation: 'Rerouting to Pier-area garage',
  },
  destination: {
    utterance: 'Find me street parking near Pier 3.',
    thinking: 'Looking for street parking near Pier 3…',
    targetOptionId: 'embarcadero-curb',
    title: 'Street parking found',
    headline: 'The best street-parking area is along the Embarcadero curb.',
    response:
      'The best street-parking area is along the Embarcadero curb, about a 2-minute walk from Pier 3. It adds roughly 2 minutes. Want me to route you there?',
    confirmation: 'Rerouting to street parking',
  },
};

// Demo pacing (ms / map units per second)
export const TIMING = {
  parkingPromptDelay: 700,
  geminiListenStart: 900,
  geminiWordInterval: 210,
  geminiThinking: 1300,
  rerouteToast: 1800,
  garageArrivalPause: 1200,
};

export const SPEED = {
  navigation: 120,
  approaching: 105,
  parkingSearch: 42,
  walkSeconds: 6, // the walk animation takes this long regardless of length
};
