// Screen state machine for the golden path. Every transition is an explicit
// action so the demo stays deterministic and easy to jump around in.

import { getPlan, makeDrive, recommendedFor, rerouteDrive, fallbackDrive } from './logic/arrival';
import { GEMINI_SCRIPTS } from './data/mockData';

export const S = {
  HOME: 'HOME',
  SEARCH: 'SEARCH',
  SEARCH_RESULTS: 'SEARCH_RESULTS',
  DESTINATION: 'DESTINATION',
  ROUTE_PREVIEW: 'ROUTE_PREVIEW',
  PARKING_PROMPT: 'PARKING_PROMPT',
  PARKING_PREFERENCE: 'PARKING_PREFERENCE',
  PARKING_OPTIONS: 'PARKING_OPTIONS',
  ARRIVAL_ROUTE: 'ARRIVAL_ROUTE',
  NAVIGATION: 'NAVIGATION',
  GEMINI_LISTENING: 'GEMINI_LISTENING',
  GEMINI_RECOMMENDATION: 'GEMINI_RECOMMENDATION',
  REROUTED: 'REROUTED',
  APPROACHING: 'APPROACHING',
  PARKING_SEARCH: 'PARKING_SEARCH',
  PARKED: 'PARKED',
  WALKING: 'WALKING',
  ARRIVED: 'ARRIVED',
};

export const DRIVING_SCREENS = new Set([
  S.NAVIGATION,
  S.GEMINI_LISTENING,
  S.GEMINI_RECOMMENDATION,
  S.REROUTED,
  S.APPROACHING,
  S.PARKING_SEARCH,
]);

export const initialState = {
  screen: S.HOME,
  query: '',
  preference: null, // 'street' | 'garage' | 'either' | 'none'
  selectedOptionId: null, // highlighted in the options list
  planId: null, // committed arrival plan; null = drive to destination
  parkingDismissed: false,
  drive: null,
  geminiResume: null,
  geminiCarPoint: null,
  rerouteMessage: null,
  arrivedAtEnd: false,
  parkedAt: null,
  parkedPlanId: null,
  parkingSaved: false,
  jump: 0, // bumps when the demo control skips ahead
};

export function reducer(state, action) {
  switch (action.type) {
    case 'OPEN_SEARCH':
      return { ...state, screen: state.query ? S.SEARCH_RESULTS : S.SEARCH };
    case 'SET_QUERY':
      return { ...state, query: action.query, screen: action.query.trim() ? S.SEARCH_RESULTS : S.SEARCH };
    case 'CLOSE_SEARCH':
      return { ...state, screen: S.HOME, query: '' };
    case 'SELECT_DESTINATION':
      return { ...state, screen: S.DESTINATION, query: 'Pier 3' };
    case 'BACK_TO_HOME':
      return { ...initialState };
    case 'DIRECTIONS':
      return { ...state, screen: state.planId ? S.ARRIVAL_ROUTE : S.ROUTE_PREVIEW };
    case 'BACK_TO_DESTINATION':
      return { ...state, screen: S.DESTINATION, planId: null, preference: null, parkingDismissed: false };
    case 'SHOW_PARKING_PROMPT':
      return state.screen === S.ROUTE_PREVIEW && !state.parkingDismissed
        ? { ...state, screen: S.PARKING_PROMPT }
        : state;
    case 'PLAN_PARKING':
      return { ...state, screen: S.PARKING_PREFERENCE };
    case 'DISMISS_PARKING':
      return { ...state, screen: S.ROUTE_PREVIEW, parkingDismissed: true, planId: null, preference: 'none' };
    case 'CHOOSE_PREFERENCE': {
      if (action.preference === 'none') {
        return { ...state, screen: S.ROUTE_PREVIEW, parkingDismissed: true, planId: null, preference: 'none' };
      }
      return {
        ...state,
        screen: S.PARKING_OPTIONS,
        preference: action.preference,
        selectedOptionId: recommendedFor(action.preference).id,
      };
    }
    case 'SELECT_OPTION':
      return { ...state, selectedOptionId: action.id };
    case 'CONFIRM_OPTION':
      return { ...state, screen: S.ARRIVAL_ROUTE, planId: state.selectedOptionId };
    case 'CHANGE_PARKING':
      return {
        ...state,
        screen: state.preference && state.preference !== 'none' ? S.PARKING_OPTIONS : S.PARKING_PREFERENCE,
        selectedOptionId: state.planId || state.selectedOptionId,
      };
    case 'BACK_TO_PREFERENCE':
      return { ...state, screen: S.PARKING_PREFERENCE };
    case 'BACK_TO_ROUTE':
      return { ...state, screen: state.planId ? S.ARRIVAL_ROUTE : S.ROUTE_PREVIEW };

    case 'START':
      return {
        ...state,
        screen: S.NAVIGATION,
        drive: makeDrive(getPlan(state.planId)),
        arrivedAtEnd: false,
      };
    case 'EXIT_NAVIGATION':
      return { ...state, screen: state.planId ? S.ARRIVAL_ROUTE : S.ROUTE_PREVIEW, drive: null };
    case 'REACHED_APPROACH':
      return state.screen === S.NAVIGATION ? { ...state, screen: S.APPROACHING } : state;
    case 'REACHED_ZONE':
      return state.screen === S.APPROACHING ? { ...state, screen: S.PARKING_SEARCH } : state;
    case 'REACHED_END':
      return { ...state, arrivedAtEnd: true };

    case 'OPEN_GEMINI':
      return { ...state, screen: S.GEMINI_LISTENING, geminiResume: state.screen, geminiCarPoint: action.carPoint };
    case 'GEMINI_RESPOND':
      return state.screen === S.GEMINI_LISTENING ? { ...state, screen: S.GEMINI_RECOMMENDATION } : state;
    case 'GEMINI_DISMISS':
      return { ...state, screen: state.geminiResume || S.NAVIGATION };
    case 'GEMINI_ACCEPT': {
      const script = geminiScriptFor(state);
      const plan = getPlan(script.targetOptionId);
      return {
        ...state,
        screen: S.REROUTED,
        rerouteMessage: script.confirmation, // captured before the plan changes
        planId: plan.id,
        preference: plan.type,
        selectedOptionId: plan.id,
        // The car holds position while Gemini is open.
        drive: rerouteDrive(plan, action.carPoint || state.geminiCarPoint),
        arrivedAtEnd: false,
      };
    }
    case 'REROUTE_DONE':
      return state.screen === S.REROUTED ? { ...state, screen: S.NAVIGATION } : state;

    case 'TRY_ANOTHER_AREA': {
      const next = fallbackDrive(state.drive, action.carDistance);
      if (!next) return state;
      return { ...state, planId: next.plan.id, drive: next.drive, arrivedAtEnd: false };
    }
    case 'PARKED':
      return {
        ...state,
        screen: S.PARKED,
        parkedAt: action.carPoint,
        parkedPlanId: state.planId || 'destination',
      };
    case 'TOGGLE_SAVE_PARKING':
      return { ...state, parkingSaved: !state.parkingSaved };
    case 'START_WALKING':
      return { ...state, screen: S.WALKING };
    case 'ARRIVE':
      return { ...state, screen: S.ARRIVED };
    case 'DEMO_JUMP':
      return { ...state, jump: state.jump + 1 };
    case 'RESTART':
      return { ...initialState };
    default:
      return state;
  }
}

export function geminiScriptFor(state) {
  const type = getPlan(state.planId).type;
  const script = GEMINI_SCRIPTS[type] || GEMINI_SCRIPTS.destination;
  // Never suggest the area the driver is already heading to.
  return script.targetOptionId === state.planId ? GEMINI_SCRIPTS.streetToGarage : script;
}
