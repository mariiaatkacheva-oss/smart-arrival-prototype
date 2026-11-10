import { useSyncExternalStore } from 'react';

// Distance travelled along the active path (driving or walking), published
// by the map at display-relevant steps only. Kept outside React state so the
// whole screen does not re-render as the vehicle moves; only the navigation
// chrome that shows distance / time subscribes.

let value = 0;
const listeners = new Set();

export const navProgress = {
  get: () => value,
  set(v) {
    if (v === value) return;
    value = v;
    listeners.forEach((l) => l());
  },
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useNavProgress() {
  return useSyncExternalStore(navProgress.subscribe, navProgress.get);
}
