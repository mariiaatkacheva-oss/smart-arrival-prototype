// Deterministic entry points for screenshots / portfolio capture.
// Set DEMO_START to one of the keys below and reload the app to open the
// prototype directly in that state. Keep it null for the normal flow.

import { initialState, reducer } from './flow';
import { pointAt } from './map/geometry';

export const DEMO_START = null;
// Optional timed actions after launch, e.g. [{ at: 2500, action: { type: 'START' } }].
export const DEMO_TIMELINE = null;

const toRoute = [{ type: 'SELECT_DESTINATION' }, { type: 'DIRECTIONS' }];
const garagePlan = [
  ...toRoute,
  { type: 'PLAN_PARKING' },
  { type: 'CHOOSE_PREFERENCE', preference: 'garage' },
  { type: 'CONFIRM_OPTION' },
];
const streetPlan = [
  ...toRoute,
  { type: 'PLAN_PARKING' },
  { type: 'CHOOSE_PREFERENCE', preference: 'street' },
  { type: 'CONFIRM_OPTION' },
];

export const DEMO_SCRIPTS = {
  search: [{ type: 'OPEN_SEARCH' }],
  searchResults: [{ type: 'SET_QUERY', query: 'Pier' }],
  destination: [{ type: 'SELECT_DESTINATION' }],
  routePreview: [...toRoute, { type: 'SHOW_PARKING_PROMPT' }],
  preference: [...toRoute, { type: 'PLAN_PARKING' }],
  optionsStreet: [...toRoute, { type: 'PLAN_PARKING' }, { type: 'CHOOSE_PREFERENCE', preference: 'street' }],
  optionsGarage: [...toRoute, { type: 'PLAN_PARKING' }, { type: 'CHOOSE_PREFERENCE', preference: 'garage' }],
  optionsEither: [...toRoute, { type: 'PLAN_PARKING' }, { type: 'CHOOSE_PREFERENCE', preference: 'either' }],
  arrivalStreet: streetPlan,
  arrivalGarage: garagePlan,
  navigation: [...garagePlan, { type: 'START' }],
  navigationStreet: [...streetPlan, { type: 'START' }],
};

// Some states need the car part-way along the route; `at` places it there.
const at = (distance) => ({ type: '@demo/at', distance });
const atEnd = (fromEnd) => ({ type: '@demo/at', fromEnd });
const carAt = (state) => {
  const p = pointAt(state.drive.route.points, state.drive.startDistance);
  return [p.x, p.y];
};

Object.assign(DEMO_SCRIPTS, {
  geminiListening: [...garagePlan, { type: 'START' }, at(1000), { type: 'OPEN_GEMINI' }],
  gemini: [...garagePlan, { type: 'START' }, at(1000), { type: 'OPEN_GEMINI' }, { type: 'GEMINI_RESPOND' }],
  rerouted: [...garagePlan, { type: 'START' }, at(1000), { type: 'OPEN_GEMINI' }, { type: 'GEMINI_RESPOND' }, { type: 'GEMINI_ACCEPT' }],
  // Golden path: garage plan -> Gemini reroute to Washington St -> park mid-block.
  parkingSearch: [...garagePlan, { type: 'START' }, at(1000), { type: 'OPEN_GEMINI' }, { type: 'GEMINI_RESPOND' }, { type: 'GEMINI_ACCEPT' }, { type: 'REROUTE_DONE' }, { type: 'REACHED_APPROACH' }, atEnd(150), { type: 'REACHED_ZONE' }],
  // QA golden path: Street -> Embarcadero curb -> Gemini -> Washington St.
  geminiListeningStreet: [...streetPlan, { type: 'START' }, at(1000), { type: 'OPEN_GEMINI' }],
  geminiStreet: [...streetPlan, { type: 'START' }, at(1000), { type: 'OPEN_GEMINI' }, { type: 'GEMINI_RESPOND' }],
  approachingStreet: [...streetPlan, { type: 'START' }, at(1000), { type: 'OPEN_GEMINI' }, { type: 'GEMINI_RESPOND' }, { type: 'GEMINI_ACCEPT' }, { type: 'REROUTE_DONE' }, atEnd(720), { type: 'REACHED_APPROACH' }],
  parkedStreet: [...streetPlan, { type: 'START' }, at(1000), { type: 'OPEN_GEMINI' }, { type: 'GEMINI_RESPOND' }, { type: 'GEMINI_ACCEPT' }, atEnd(90), { type: 'PARKED' }],
  walking: [...garagePlan, { type: 'START' }, at(1000), { type: 'OPEN_GEMINI' }, { type: 'GEMINI_RESPOND' }, { type: 'GEMINI_ACCEPT' }, atEnd(90), { type: 'PARKED' }, { type: 'TOGGLE_SAVE_PARKING' }, { type: 'START_WALKING' }],
});

function demoReducer(state, action) {
  if (action.type === '@demo/at') {
    const d = action.fromEnd != null ? state.drive.route.length - action.fromEnd : action.distance;
    const drive = { ...state.drive, startDistance: d };
    drive.approachAt = Math.max(drive.approachAt, d);
    return { ...state, drive };
  }
  // Fill in the live car position the UI would normally supply.
  if (['OPEN_GEMINI', 'GEMINI_ACCEPT', 'PARKED'].includes(action.type) && !action.carPoint) {
    return reducer(state, { ...action, carPoint: carAt(state) });
  }
  return reducer(state, action);
}

export function demoInitialState() {
  const script = DEMO_START && DEMO_SCRIPTS[DEMO_START];
  if (!script) return initialState;
  return script.reduce(demoReducer, initialState);
}
