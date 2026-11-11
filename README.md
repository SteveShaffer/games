# Shaffer Family Games 🎮

Welcome to the **Shaffer Family Games** hub! This repository contains a collection of browser-based retro arcade games, WebAssembly hardware emulators, and hardware utilities created for and enjoyed by the Shaffer family. Everything is served from a unified static portal hosted on GitHub Pages.

🌐 **Live URL**: [games.shaffer.tech](https://games.shaffer.tech)

---

## 🏗️ Technical Architecture & Core Principles

*   **100% Static Hosting**: Hosted on **GitHub Pages** (`CNAME` → `games.shaffer.tech`). The repository contains strictly static client-side resources (HTML, CSS, JavaScript, WebAssembly, Web Audio, WebGL/Three.js, and cartridge dumps). There is **no backend server** or database.
*   **Client-Side Persistence**: High scores, settings, global audio mute state (`shaffer-games-muted`), and emulator battery saves use `localStorage` and `IndexedDB`.
*   **No Cache Headers**: Do not add caching configurations or HTTP headers that lock assets in browser caches. Updates pushed to `master` must be immediately live.
*   **Single-File Delivery**: Games are either authored directly as a single standalone `index.html` file (with inlined `<style>` and `<script>`) or developed modularly in a `src/` folder and compiled into a standalone `index.html` via a zero-dependency Node.js `build.js` script.
*   **Error Tracking (Sentry)**: Every page in the repository includes the Sentry Browser Loader SDK in `<head>` with eager initialization (`Sentry.forceLoad()`) for real-time exception monitoring.

---

## 📂 Repository & Game Directory

| Directory / File | Title | Architecture | Description |
| :--- | :--- | :--- | :--- |
| [`index.html`](index.html) | **Shaffer Family Games Portal** | Standalone HTML | Main subsea arcade launcher with animated SVG card visualizers, CRT scanlines, bubble physics, and Web Audio synth UI feedback. |
| [`roms/`](roms/) | **ROM Vault & Cartridge Archive** | Standalone HTML + Vendored Engines | **Early Vercel / ZEIT** minimalist monochrome (`#000`/`#fff`) archive and full-bleed in-browser retro player supporting **Game Boy Advance** (`GBA.js`), **Game Boy Color**, and **Game Boy** (`WasmBoy`). |
| [`typershark/`](typershark/) | **Typer Shark: Abyss Descent** | Standalone HTML | Deep-ocean keyboard speed-typing arcade game where players pilot a submarine and zap approaching sharks and jellyfish. |
| [`skyfire/`](skyfire/) | **SKYFIRE: Carrier Strike** | Standalone HTML (Three.js r128) | 3D tactical flight simulator featuring dogfighting, radar HUD, and aircraft carrier arrestor-wire landings. |
| [`abyssrun/`](abyssrun/) | **Abyssal Run: Escape from Atlantis** | Standalone HTML (Three.js r128) | 3D endless underwater temple runner with lane-switching, obstacles, and procedural synth audio. |
| [`aquasynth/`](aquasynth/) | **AquaSynth: Sonar Shield** | `src/` + [`build.js`](aquasynth/build.js) → `index.html` | Musical arcade defense game powered by a custom Web Audio API polyphonic synthesizer and pitch-bend screen warp effects. |
| [`beatdash/`](beatdash/) | **Beat Dash** | `src/` + [`build.js`](beatdash/build.js) → `index.html` | Audio-reactive neon rhythm platformer that analyzes music frequencies in real time (supports custom MP3 uploads). |
| [`sonarbeat/`](sonarbeat/) | **Sonar Strike: Abyss Beats** | `src/` + [`build.js`](sonarbeat/build.js) → `index.html` | Subsea rhythm & sonar timing game with phosphor CRT styling and procedural audio synthesis. |
| [`gauntlet/`](gauntlet/) | **Daily Gauntlet** | `src/` + [`build.js`](gauntlet/build.js) → `index.html` | Wordle-inspired daily 5-stage puzzle gauntlet where players share a 25-turn health bar across 5 daily puzzles drawn from a 15-game pool (`Word`, `Digits`, `Flip`, `Pairs`, `Slide`, `Waffle`, `Jam`, `Morph`, `Code`, `Ice`, `Chess`, `Sudoku`, `Mines`, `Knight`, `Bridges`). |
| [`usbtest/`](usbtest/) | **Sonar Subsea: USB Signal Inspector** | Standalone HTML | Browser hardware diagnostic console for testing USB gamepads, joysticks, and HID controllers via the Web Gamepad & WebHID APIs. |
| *(External)* | **Wordle** | External Link | Linked from the main launcher to [wordle.shaffer.tech](https://wordle.shaffer.tech). |

---

## 🧩 Daily Gauntlet (`/gauntlet`)

[`gauntlet/`](gauntlet/) is a mobile-first, Wordle-inspired daily puzzle mode where everyone plays the same deterministic 5-stage sequence each day:

*   **Shared 25-Turn Health Bar**: Every guess, math operation, tile flip, or slide drains from a single shared 25-turn health bar (`#turnHealthFill`) that shifts from green (`13–25`) → yellow (`6–12`) → danger red (`1–5`).
*   **15-Game Pool & Mathematical Par**: Each day selects 5 stages from 15 turn-based mini-games, each with its own calculated **Par** (in turns):
    1.  🔤 **Word** (`wordle`): 5-letter Wordle with 2,300 everyday target words and 14,734 valid dictionary guesses (**Par 4**).
    2.  🧮 **Digits** (`digits`): Combine 5 numbers with `+ − × ÷` to hit the target (**Par 2–3**, exact BFS/DFS minimum ops).
    3.  🟩 **Flip** (`reactor`): 3×3 Lights Out grid scrambled with 4 independent toggles (**Par 4**).
    4.  🃏 **Pairs** (`memory`): 3×4 card match following a 1.5s board preview (**Par 7**).
    5.  🔢 **Slide** (`slider`): 3×3 8-puzzle with dynamic directional slide arrows (`↑ ↓ ← →`) where every 2 slides = 1 turn (**Par 3–4**, exact BFS slides ÷ 2).
    6.  🧇 **Waffle** (`waffle`): 5×5 intersecting word swap grid where every 2 swaps = 1 turn (**Par 3**).
    7.  🚗 **Jam** (`traffic`): Procedurally generated & BFS-verified 6×6 *Rush Hour* gridlock puzzle where every 2 vehicle moves = 1 turn (**Par 3–5**).
    8.  🔗 **Morph** (`morph`): 4-letter word ladder at exact BFS distance 3–4 (**Par 3–4**).
    9.  🔐 **Code** (`mastermind`): 4-peg secret codebreaker with explicit semantic count badges (`X Exact`, `Y Misplaced`) and dynamic row hints (**Par 4**).
    10. 🧊 **Ice** (`iceslide`): 6×6 sliding ice maze with cracked ice (`❄️` → `🪨`) and interior goal flags (**Par 3–4**, exact state-space BFS slides ÷ 2).
    11. ♟️ **Chess** (`chess`): 4×4 tactical royal capture puzzle with White pieces vs Black King and guards (**Par 2–3**).
    12. 🍱 **Sudoku** (`sudoku`): 4×4 Mini Latin square with 2×2 boxes and 6 empty cells across 288 valid solutions (**Par 3**).
    13. 💣 **Mines** (`mines`): 4×4 deterministic, guess-free Minesweeper with 4 hidden mines uniquely identifiable from 9 clue cells (**Par 2**).
    14. ♞ **Knight** (`knight`): 4×4 Chess Knight star-collector path puzzle with 3 target stars (**Par 2–3**).
    15. 🌉 **Bridges** (`islands`): Procedurally generated *Hashiwokakero* island bridge network on a 4×4 island lattice (**Par 3–5**).
*   **Intuitive UX & Onboarding**:
    *   **First-Time Onboarding Modal (`#helpDialog`)**: Auto-opens on first visit (persisted via `localStorage` version key `'v1'`) and re-openable anytime via the header **`?`** button.
    *   **Wordle-Style Stacked Emoji Share**: Generates clean, compact stacked 5-tile health bar emoji rows (`🟩`, `🟨`, `🟥`, `⬛`) representing turns remaining after each completed stage.
*   **Rare `+2⚡` Golden Boosts**: Exactly 2 of the 5 stages each day spawn an optional golden boost objective worth `+2⚡` bonus turns.
*   **Full Mid-Stage Persistence & Localhost Sandbox**: All 15 games persist mid-stage progress (`stage.savedState`) to `localStorage` on every move. When running on `localhost`, a `🛠️` Dev Sandbox button in the header lets you launch fresh random boards for any individual game.

---

## 🕹️ ROM Vault & Emulator Architecture (`/roms`)

The [`roms/`](roms/) directory is a self-contained static cartridge archive and dual-engine retro emulator designed with an **early Vercel / ZEIT** aesthetic (stark `#000000` background, `#ffffff` foreground, `0px` sharp corners, hairline `1px` borders, `Inter` + `Space Mono` typography, and edge-to-edge layout):

*   **Maximized Screen Real Estate**: The Web Player modal (`#gba-player-modal`) spans `100vw × 100vh` edge-to-edge. Both `#gba-canvas` (240×160, 3:2 aspect ratio) and `#gb-canvas` (160×144, 10:9 aspect ratio) use `object-fit: contain; image-rendering: pixelated;` inside a flex-grow viewport to scale to the largest possible dimensions on any desktop or mobile screen.
*   **GBA Engine (`roms/gbajs2/`)**: Vendored and patched `GBA.js` core with embedded normatt HLE BIOS (`biosbin.js`), speed multipliers (`1x`, `2x`, `3x` with frame-skipping), keyboard & USB gamepad mapping, and `.sav` battery save export/import.
*   **GB / GBC Engine (`roms/wasmboy/`)**: Vendored `WasmBoy` WebAssembly core (`wasmboy.wasm.umd.min.js`) configured with GBC hardware mode and colorization enabled (`isGbcEnabled: true`, `isGbcColorizationEnabled: true`).
*   **Cartridge Catalog (`roms/downloads/`)**: Contains verified `.gba`, `.gbc`, and `.gb` cartridge dumps indexed in the `ROM_CATALOG` array inside [`roms/index.html`](roms/index.html).

---

## 🛠️ Local Development & Build Commands

### 1. Running a Local Dev Server
Because the games and emulators use `fetch()`, Web Workers, and WebAssembly, **do not** open HTML files directly via `file://`. Start a local static HTTP server from the repository root:

```bash
# Using Python 3 (recommended)
python3 -m http.server 8001

# Or using Node.js
npx serve
```
Then open `http://localhost:8001/` (or `http://localhost:8001/roms/`).

### 2. Static Site Build System & Bundled Games (`build.js` + GitHub Actions)
[`aquasynth/`](aquasynth/), [`beatdash/`](beatdash/), [`sonarbeat/`](sonarbeat/), and [`gauntlet/`](gauntlet/) are authored modularly inside `src/` (with [`gauntlet/src/`](gauntlet/src/) organized into `shared/` libraries and per-game `games/<id>/` subfolders) and compiled into standalone `index.html` bundles.

Run the root [`build.js`](build.js) orchestrator (or `npm run build`) to compile all bundled games and verify every HTML entrypoint in the repository (checking Sentry SDK initialization, inline JavaScript syntax, relative asset links, and cataloged ROM binaries):

```bash
# Build all bundled games and validate all 10 HTML entrypoints
node build.js
# (or: npm run build)

# Verify that compiled index.html bundles are in sync with src/ (used in CI)
node build.js --verify
# (or: npm run verify)

# Stage a clean production static site artifact into _site/
node build.js --out _site
# (or: npm run build:dist)
```

You can also run an individual game's bundler or the automated Daily Gauntlet test suite directly:
```bash
node aquasynth/build.js
node beatdash/build.js
node sonarbeat/build.js
node gauntlet/build.js

# Run all 62 Daily Gauntlet unit & E2E tests (shared + colocated per-game *.test.js)
node gauntlet/run-tests.js
# (or: npm test)
```

**GitHub Actions CI/CD (`.github/workflows/ci.yml` & `.github/workflows/deploy-pages.yml`)**:
*   `ci.yml` runs **`Build Game Bundles`** (`node build.js --verify`) and **`Gauntlet Unit & E2E Tests`** (`node gauntlet/run-tests.js`) as PR status checks against `master`/`main`.
*   `deploy-pages.yml` builds `_site/` (`node build.js --out _site`), verifies all entrypoints (`node build.js --verify`), runs `node gauntlet/run-tests.js`, and deploys directly to GitHub Pages via `actions/upload-pages-artifact` and `actions/deploy-pages` on pushes to `master`/`main` (requiring no separate `gh-pages` build branch commit noise, while also keeping in-repo `index.html` bundles up to date).

### 3. Running Daily Gauntlet Automated Tests (`gauntlet/run-tests.js`)
Daily Gauntlet includes a zero-dependency automated unit and end-to-end (E2E) regression test suite built on Node's native `node:test` and `node:assert/strict` runners (no external `npm` packages or running HTTP server required):

```bash
# Run the complete Gauntlet test suite (shared + all colocated per-game suites)
node gauntlet/run-tests.js
# (or: npm test)

# Run only the shared PRNG, daily seeding, and full 5-stage shell E2E tests
node --test gauntlet/src/shared/shared.test.js

# Run an individual game's colocated unit & E2E tests (e.g. Wordle or Jam)
node --test gauntlet/src/games/wordle/wordle.test.js
node --test gauntlet/src/games/traffic/traffic.test.js
```

#### Modular Test Suite Architecture
*   **[`gauntlet/src/shared/shared.test.js`](gauntlet/src/shared/shared.test.js) — Shared PRNG, Daily Run & Shell E2E Tests**:
    *   **PRNG & Hashing (`hashString`, `mulberry32` / `createPRNG`, `seededShuffle`)**: Verifies deterministic 32-bit FNV-1a hashing, reproducible floating-point sequences in `[0, 1)`, and pure non-mutating array shuffles.
    *   **Daily Run & Boost Allocation (`createFreshRunState`)**: Verifies across 60+ dates that the same date string (`YYYY-MM-DD`) always produces the exact same 5-stage sequence and stage seeds, zero duplicate mini-game IDs appear within a daily run, and `hasBoost` is assigned to `BOOSTS_PER_GAUNTLET = 2` stages per day.
    *   **Shell E2E (`useCompiledBundle: true`)**: Verifies initial Stage 1/5 HUD mounting, completing a full 5-stage Daily Gauntlet run through `#stageClearedCard` → `#nextStageBtn` → `#runSummaryCard` (`🏆 GAUNTLET COMPLETE`, `5/5`, Wordle-style emoji health bar share output, and clipboard copy), and `OUT OF TURNS` loss transitions.
    *   **Versioned Onboarding Modal (`#helpDialog`)**: Verifies initial-visit auto-open, persistence of version key `v1` on any dialog dismissal, and manual toggle via `#helpModalBtn`.
*   **[`gauntlet/src/games/<id>/<id>.test.js`](gauntlet/src/games/) — Colocated Per-Game Unit & E2E Tests**:
    *   Each of the 15 game folders (`wordle`, `digits`, `reactor`, `memory`, `slider`, `waffle`, `traffic`, `morph`, `mastermind`, `iceslide`, `chess`, `sudoku`, `mines`, `knight`, `islands`) houses its own `<id>.test.js` testing deterministic board generation & mathematical/BFS solvability across 25 seeds, real DOM playability & `+2⚡` Golden Boost collection, and mid-stage `localStorage` persistence (`stage.savedState`) across `env.reloadPage()`.
*   **[`gauntlet/tests/helpers/dom-harness.js`](gauntlet/tests/helpers/dom-harness.js) & `window.__GAUNTLET_TEST_API__`**:
    *   Provides a lightweight, zero-dependency DOM, Web Audio (`AudioContext`), `localStorage`, clipboard, and controllable timer environment capable of mounting either the modular `gauntlet/src/` scripts (`useCompiledBundle: false`) or the compiled single-file [`gauntlet/index.html`](gauntlet/index.html) bundle (`useCompiledBundle: true`), paired with deterministic generator/solver hooks exposed on `window.__GAUNTLET_TEST_API__`.

### 4. Verifying Sentry Error Reporting
All pages load Sentry via `https://js.sentry-cdn.com/661e3b63e998f3517b36a182cea2df15.min.js` and call `Sentry.forceLoad()` on boot. To test error reporting from your browser's DevTools Console (with ad-blockers disabled for `localhost`), run:

```javascript
// Trigger an uncaught exception on the main event loop (outside DevTools' console wrapper)
setTimeout(() => { myUndefinedFunction(); }, 0);

// Or send an explicit exception directly
Sentry.captureException(new Error("Test error from localhost"));
```

---

## 🤖 Guide for AI Agents & Contributors

Before modifying code or adding new games, read and follow **[`AGENTS.md`](AGENTS.md)**. It documents all architectural constraints, design systems (both the Subsea Arcade theme and the `/roms` Early ZEIT theme), audio mute synchronization, Sentry requirements, and emulator gotchas.
