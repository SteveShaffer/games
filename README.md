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
| [`usbtest/`](usbtest/) | **Sonar Subsea: USB Signal Inspector** | Standalone HTML | Browser hardware diagnostic console for testing USB gamepads, joysticks, and HID controllers via the Web Gamepad & WebHID APIs. |
| *(External)* | **Wordle** | External Link | Linked from the main launcher to [wordle.shaffer.tech](https://wordle.shaffer.tech). |

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

### 2. Compiling Bundled Games (`aquasynth`, `beatdash`, `sonarbeat`)
If you edit source files inside `aquasynth/src/`, `beatdash/src/`, or `sonarbeat/src/`, run their respective build scripts to inline CSS and JS into their production `index.html` bundles:

```bash
node aquasynth/build.js
node beatdash/build.js
node sonarbeat/build.js
```

### 3. Verifying Sentry Error Reporting
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
