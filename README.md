# Google Maps Smart Arrival

A concept prototype that makes parking part of route planning: before navigation starts, the driver decides where to leave the car, and an AI assistant helps adjust that plan on the way.

> **Independent design concept.** This is a personal portfolio project. It is not a Google product and is not affiliated with, endorsed by, or connected to Google. It uses no Google code, APIs, logos, map data or live data. "Gemini" refers to a simulated assistant; every map, route, price, parking likelihood and reply is mocked and deterministic.

## The problem

Navigation apps get drivers to an address, and parking starts when the route ends. In dense areas, the slowest and least predictable part of the trip happens after the driver has already committed to a route, with no comparison of drive time, search time, walking distance, price or the chance of actually finding a space.

## What the prototype does

- **Asks about parking only when it matters.** The parking prompt appears before Start, and only for destinations marked as hard to park near.
- **Ranks arrival strategies by total time.** Garage and street options each show the added drive, expected search time, walk, price and total, with one marked *Recommended*.
- **Treats street parking honestly.** Street parking is shown as a highlighted search zone with a likelihood level (bars and words, not color alone). Nothing claims that a space is open.
- **One recommendation while driving.** The simulated Gemini assistant answers in one or two sentences, offers a single alternative and reroutes only after the driver confirms.
- **Guides the final stretch.** Approaching the zone, searching along highlighted blocks, confirming "I parked", saving the spot and walking to the entrance.
- **Immersive navigation view.** Pressing Start tilts into a heading-up 3D view with extruded buildings, lane markings and a ribbon route, drawn by a small custom perspective renderer.

## Walkthrough (Pier 3, San Francisco)

1. **Home**: tap **Where to?**, or the **Pier 3** card under Recent.
2. **Search**: choose **Pier 3**.
3. **Destination**: tap **Directions**.
4. **Route preview**: *Parking can be difficult near Pier 3* appears. Tap **Plan parking**.
5. **Parking preference**: choose **Garage** (Street, Either and No preference also work).
6. **Parking options**: compare options by card or map marker, then tap **Route via Pier-area garage**.
7. **Arrival route**: review the drive, search and walk breakdown, then tap **Start**.
8. **Navigation**: tap the **sparkle (Gemini)** button.
9. **Gemini**: the simulated request *"Find me street parking instead"* returns one recommendation. Tap **Reroute**.
10. **Approaching and searching**: follow the highlighted blocks, optionally **Try another area**, then tap **I parked**.
11. **Parked and walking**: optionally **Save parking**, then **Walk to Pier 3**.
12. **Arrived**: **Done** restarts the demo.

A small **Demo next ›** control during driving and walking skips to the next milestone.

## Technology

- [Expo](https://expo.dev) SDK 54, React Native 0.81, React 19
- `react-native-svg` for the map, markers and the immersive 3D view
- Plain JavaScript with a small reducer-based state machine for the flow

There is no backend and nothing to configure: all data is in `src/data/mockData.js`.

## Run it locally

Requirements: Node.js 20 or newer, and macOS with Xcode and an iOS Simulator.

```bash
npm install
```

Then either:

- **Expo Go** (quickest): `npm start` and open the project in Expo Go. Expo Go must support SDK 54; newer Expo Go versions will ask to install the matching one.
- **Native build** (works with any Expo Go version): `npx expo run:ios`. This generates a local `ios/` folder (ignored by git) and installs the app on the simulator.

For a smoother preview with production JavaScript, use `npm run ios:fast`. To see frame timings, set `PERF_LOG = true` (Metro log) or `PERF_HUD = true` (on screen) in `src/perf.js`.

### Jump straight to a state

Set `DEMO_START` in `src/demoStates.js` to a key such as `'optionsEither'`, `'arrivalStreet'`, `'navigationStreet'`, `'geminiStreet'`, `'parkedStreet'` or `'walking'` and reload. Keep it `null` for the normal flow.

## Project structure

| Path | Contents |
| --- | --- |
| `src/data/mockData.js` | All mock data: destination, search catalog, trip timings, parking options, Gemini scripts, demo pacing |
| `src/logic/` | Deterministic logic: when to prompt for parking, ranking by total arrival time, route and reroute construction, walking |
| `src/flow.js` | Screen state machine (`HOME` … `ARRIVED`) and reducer |
| `src/SmartArrivalPrototype.js` | Composes the map and each screen's controls, camera and motion |
| `src/map/` | Stylised NE San Francisco map, routes, markers and camera |
| `src/map/immersive/` | The 3D driving view: projection, scene and renderer |
| `src/components/` | Sheets, banners and panels for each step, plus shared UI controls |
| `src/theme.js` | Design tokens: color, type, spacing, radius, elevation, motion |
| `src/demoStates.js` | Fixed entry points for screenshots and recordings |

## Status

A design prototype for exploring a product concept. The map is a stylised illustration and the 3D view is a lightweight renderer, not real map data or a 3D engine.

## Author

Maria Tkacheva, product designer.

© 2026 Maria Tkacheva. All rights reserved.
