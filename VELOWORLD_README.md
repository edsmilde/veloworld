# VeloWorld prototype

Open `index.html` from a local web server (for example, `python3 -m http.server 8080`) and browse to `http://localhost:8080`.

## Included

- A continuous 8.4 km 3D terrain route with flats, climbs, and descents
- A simple cyclist and bike, camera controls, scenery, and live ride HUD
- Power-to-speed simulation that accounts for grade, aerodynamic drag, and rolling resistance
- Web Bluetooth Cycling Power support (standard service `0x1818`), plus a usable simulated-power fallback
- Per-second ride logging and TCX download suitable for manual Strava upload

## Code layout

- `app.js` — application startup, render loop, camera, and simulation coordination
- `src/route.js` — route geometry, terrain heights, and grade calculation
- `src/world.js` — terrain, road, and scenery construction
- `src/rider.js` — bike/rider model and pedaling animation
- `src/physics.js` — power-to-speed model
- `src/ui.js` — HUD updates, controls, Bluetooth input, and TCX export

## Hardware note

Bluetooth power meters can connect in Chrome/Edge over HTTPS or localhost. ANT+ is not available to ordinary browser JavaScript; a production ANT+ implementation needs a native companion (for example Electron plus an ANT USB-dongle library) that forwards power events to this UI.

## Sensible next slices

1. Move the route, ride physics, sensor adapters, and recording into separate modules; add tests for the physics model.
2. Add a backend with OAuth and the Strava upload endpoint, then produce FIT files for fuller device interoperability.
3. Add WebSocket position updates, interpolation, drafting calculations, and NPC route-following.
