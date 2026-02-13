# AGENTS.md

This file is a full technical handoff for future agents working in this repository.

## Repository identity
- Name: `torus-pente`
- Local path: `/Users/davidbachman/Documents/TorusPente`
- Remote: `https://github.com/davbachman/TorusPente.git`
- Default branch: `main`
- Deployment target: GitHub Pages
- Live URL: `https://davbachman.github.io/TorusPente/`

## Tech stack
- Runtime: browser (ES modules)
- Rendering: `three`
- Bundler/dev server: `vite`
- Unit tests: `vitest`
- Language: JavaScript (no TypeScript)

## NPM scripts
- `npm run dev` -> starts Vite dev server
- `npm run build` -> production build to `dist/`
- `npm run preview` -> previews production build
- `npm run test` -> runs unit tests once

## Build and deployment
- `vite.config.js` sets `base: './'` for Pages-compatible relative assets.
- GitHub Actions workflow at `.github/workflows/deploy-pages.yml`:
1. triggers on `push` to `main` and manual dispatch
2. runs `npm ci` and `npm run build`
3. uploads `dist/` artifact
4. deploys with `actions/deploy-pages`

## Entrypoints and high-level flow
- `index.html`:
1. creates `#viewport` container for WebGL canvas
2. creates HUD elements `#turn-indicator`, `#winner-banner`, `#restart-btn`
3. loads `/src/main.js`
- `src/main.js`:
1. instantiates game state (`createGame`) and renderer/controller (`new TorusBoard`)
2. wires pointer controls (`attachPointerControls`)
3. handles move placement, sound, HUD updates, and restart
4. runs animation frame loop (`torusBoard.render()`)
5. exposes `window.render_game_to_text()` and `window.advanceTime(ms)`

## Game rules implemented
- Board topology: torus (wrap-around on both axes)
- Grid: `16 x 8 = 128` intersections
- Turn order: Player 1 (white) then Player 2 (black)
- Placement: double-click near an intersection; picking snaps to the nearest intersection
- Illegal moves: occupied cell and post-win moves are blocked
- Win condition: 5 contiguous stones in any of 4 directions:
1. meridional `(1,0)`
2. longitudinal `(0,1)`
3. diagonal `(1,1)`
4. diagonal `(1,-1)`
- On win:
1. `gameOver = true`
2. winner banner shown
3. exactly 5 winning cells highlighted
4. restart button shown

## Controls implemented
- Double-click (left button): place stone
- Left-button drag horizontal (`dx`): rotate torus object around central axis (`zRotation`)
- Left-button drag vertical (`dy`): update `vOffset` (intersection lattice rotation around tube cross-section)
- Vertical drag is currently inverted in `src/main.js` (`-dy` multiplier)
- Drag suppression for double-click placement uses:
1. threshold `DRAG_THRESHOLD_PX = 4`
2. debounce window `DRAG_SUPPRESS_MS = 220`

## Audio behavior
- Placement sound generated via Web Audio API in `src/main.js`
- Sound synthesis:
1. oscillator type: triangle
2. short gain envelope for click-like transient
3. pitch differs by player:
- Player 1 base frequency: `1280`
- Player 2 base frequency: `920`

## Geometry and coordinate system
- Constants in `src/game.js`:
1. `MAJOR_RADIUS = 20`
2. `MINOR_RADIUS = 10`
3. `U_CELLS = 16`
4. `V_CELLS = 8`
- Parametric torus in `src/torusBoard.js`:
1. `x = (R + r*cos(v)) * cos(u)`
2. `y = (R + r*cos(v)) * sin(u)`
3. `z = r*sin(v)`
- Intersection indexing:
1. `i` from `u`
2. `j` from `vBoard = normalize(v - vOffset)`

## Rendering details
- File: `src/torusBoard.js`
- Three.js scene objects:
1. `torusGroup`
2. `baseMesh` (board surface)
3. `gridGroup` (16 meridional + 8 longitudinal circles)
4. `piecesGroup` (Go-like stones)
5. `highlightGroup` (winning-cell markers)
- Camera:
1. perspective fov `44`
2. position `(57, -38, 34)`
3. up vector `(0,0,1)`
- Renderer:
1. antialias enabled
2. `outputColorSpace = SRGB`
3. `ACESFilmicToneMapping`
4. `toneMappingExposure = 1.06`
- Board material (current tuning):
1. color `0xe2c38f`
2. roughness `0.66`
3. clearcoat `0.4`
4. clearcoat roughness `0.32`
- Stone geometry and style:
1. sphere geometry flattened on z scale (`PIECE_HEIGHT_SCALE = 0.56`)
2. white and black physical materials with clearcoat
- Win highlights:
1. translucent yellow circles
2. radius `HIGHLIGHT_RADIUS = 2.95`
3. offset above surface for visibility

## Lighting setup
- Shared light rig for board and stones (no board-only spotlight):
1. ambient light `0xfff5e3`, intensity `0.27`
2. hemisphere light sky/ground `0xfff1cf / 0xb2864e`, intensity `0.31`
3. key directional `0xffedc8`, intensity `1.18`, position `(74, -60, 90)`
4. fill directional `0xf7ddb2`, intensity `0.32`, position `(-70, 55, 28)`
5. rim directional `0xffffff`, intensity `0.29`, position `(-20, -95, 70)`

## Core modules
- `src/game.js`:
1. owns mutable game state
2. turn progression
3. win handling
4. `winningCells` persistence
5. angle normalization helpers
6. serializable state for automation (`renderToText`)
- `src/winCheck.js`:
1. wrapped-line detection using directional scans
2. cycle-length logic (`gcd/lcm`) to avoid infinite wrapped traversal
3. returns `{ winner, direction, count, winningCells }`
4. returns exactly 5 winning cells via `selectWinningFive`
- `src/input.js`:
1. pointer capture drag handling
2. drag vs. click separation
3. dblclick dispatch
- `src/torusBoard.js`:
1. scene/camera/lights creation
2. board mesh and grid line generation
3. raycast hit to nearest intersection conversion
4. piece mesh lifecycle (add/update/remove)
5. winning highlight mesh lifecycle

## Public browser hooks
- `window.render_game_to_text()`:
1. returns JSON string with current mode, torus constants, turn, winner, gameOver
2. includes `vOffset`, `zRotation`, `winningCells`, `occupiedCells`
3. includes coordinate note string
- `window.advanceTime(ms)`:
1. deterministic stepping hook used by automated clients
2. currently no gameplay time integration beyond forced render

## Styling and UI
- File: `src/styles.css`
- UI structure:
1. full-screen canvas viewport
2. HUD in top-left (on mobile moves to bottom)
3. restart button shown only after win
- Palette:
1. warm neutral page background gradients
2. dark translucent HUD panel
3. orange restart accent

## Tests
- Unit test file: `tests/winCheck.test.js`
- Coverage focus:
1. horizontal win
2. vertical win
3. both diagonal wins
4. seam-wrapped wins on i and j boundaries
5. near-miss non-win case
6. assertions for returned `winningCells` in representative cases

## Automation and artifacts in repo
- Playwright action payload sample: `tests/playwright-actions.json`
- Verification screenshots/state logs tracked in `output/web-game/`.
- `progress.md` contains chronological implementation/verification notes.

## File inventory (tracked source and config)
- App/runtime:
1. `index.html`
2. `src/main.js`
3. `src/game.js`
4. `src/winCheck.js`
5. `src/input.js`
6. `src/torusBoard.js`
7. `src/styles.css`
- Tooling:
1. `package.json`
2. `package-lock.json`
3. `vite.config.js`
4. `.gitignore`
- CI/CD:
1. `.github/workflows/deploy-pages.yml`
- Tests:
1. `tests/winCheck.test.js`
2. `tests/playwright-actions.json`
- Documentation/logs:
1. `README.md`
2. `AGENTS.md`
3. `progress.md`
- Misc:
1. `LICENSE`
2. `output/web-game/*` screenshots/state snapshots

## Known repository quirks
- `.DS_Store` files are currently tracked by history; local status may frequently show `.DS_Store` modifications.
- `dist/` is ignored by `.gitignore`; deployment is done via GitHub Actions artifact upload.

## Quick operational checklist for future agents
1. Pull latest `main`.
2. Run `npm ci`.
3. Run `npm run test`.
4. Run `npm run build`.
5. If visuals/controls changed, run `npm run dev` and verify manually.
6. Commit only intentional files (avoid accidental `.DS_Store` commits unless explicitly requested).
7. Push to `main` to trigger GitHub Pages workflow.
