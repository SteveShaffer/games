# AGENTS.md — Developer Guidelines for AI/Agentic Contributors

This document establishes behavioral rules, architectural constraints, design systems, and technical gotchas for AI agents (and human developers) maintaining or expanding the **Shaffer Family Games** repository ([games.shaffer.tech](https://games.shaffer.tech)).

---

## 📋 Project Backlog & Next Tasks ([`TODO.md`](TODO.md))

*   **Always Check [`TODO.md`](TODO.md)**: When deciding what to work on next—or when asked for next steps/improvements—read [`TODO.md`](TODO.md) at the root of the repository first.
*   Keep [`TODO.md`](TODO.md) up to date by checking off completed items (`- [x]`) and adding newly discovered follow-up tasks as requested.

---

## 🏗️ Core Architectural Rules

### 1. Static-Only Architecture (Strict)
This repository is hosted on **GitHub Pages** (`CNAME` → `games.shaffer.tech`).
*   **No backend runtime**: No Node.js Express, Python Flask, PHP, or database servers run in production. Everything executes 100% in the user's browser.
*   **Data Persistence**: Use client-side browser storage APIs:
    *   `localStorage` for settings, high scores, GBA battery saves, and the global mute flag (`shaffer-games-muted`).
    *   `IndexedDB` for larger binary structures (such as WasmBoy Game Boy / Game Boy Color cartridge saves).
*   **No Cache Headers**: Do not introduce service workers or caching configurations that prevent instant updates upon `git push`.

### 2. Standalone Single-File Game Delivery
To guarantee fast load times and zero broken asset paths, each game is delivered as a **single, standalone `index.html` file** in its own subfolder:
*   **Direct Single-File Games**: [`index.html`](index.html), [`roms/index.html`](roms/index.html), [`typershark/index.html`](typershark/index.html), [`skyfire/index.html`](skyfire/index.html), [`abyssrun/index.html`](abyssrun/index.html), and [`usbtest/index.html`](usbtest/index.html) are edited directly.
*   **Bundled `src/` Games**: [`aquasynth/`](aquasynth/), [`beatdash/`](beatdash/), [`sonarbeat/`](sonarbeat/), and [`gauntlet/`](gauntlet/) keep modular source files in `src/` (`index.html`, `style.css`, `game.js`, etc.) and compile into a single `index.html` via their `build.js` script:
    ```bash
    node aquasynth/build.js
    node beatdash/build.js
    node sonarbeat/build.js
    node gauntlet/build.js
    ```
    **IMPORTANT**: Whenever you edit anything in `aquasynth/src/`, `beatdash/src/`, `sonarbeat/src/`, or `gauntlet/src/`, you **must** run its `build.js` script so the compiled `index.html` stays in sync. Do not edit the compiled `index.html` of those games without updating their `src/` files first.
*   **CDN Usage**: Pull third-party libraries (e.g., Three.js `r128`, Google Fonts, Sentry) via reputable CDNs or vendor them directly (like `roms/gbajs2/` and `roms/wasmboy/`) rather than requiring `npm install` at runtime.

### 3. Global Audio Mute State (`shaffer-games-muted`)
All pages in the repository share a global mute preference stored in `localStorage` under the key `'shaffer-games-muted'` (`'true'` or `'false'`).
*   When initializing audio in any game or page, read `localStorage.getItem('shaffer-games-muted') === 'true'`.
*   When the user toggles mute on any page, update `localStorage.setItem('shaffer-games-muted', isMuted ? 'true' : 'false')` so their preference persists across the launcher and all games.

### 4. Sentry Error Logging (Mandatory on All Pages)
Every HTML entrypoint in this repository must include the **Sentry Browser Loader Script** inside `<head>` along with eager initialization (`Sentry.forceLoad()`):

```html
<!-- Sentry Error Tracking -->
<script
  src="https://js.sentry-cdn.com/661e3b63e998f3517b36a182cea2df15.min.js"
  crossorigin="anonymous"
></script>
<script>
  window.sentryOnLoad = function () {
    if (window.Sentry && typeof window.Sentry.init === 'function') {
      window.Sentry.init();
    }
  };
  if (window.Sentry && typeof window.Sentry.forceLoad === 'function') {
    window.Sentry.forceLoad();
  }
</script>
```
*   **Why `Sentry.forceLoad()` is required**: By default, Sentry's loader script (`js.sentry-cdn.com`) runs in lazy mode and won't download the full SDK until an uncaught `window.onerror` fires. Calling `forceLoad()` ensures the full SDK (`window.Sentry.captureException`, breadcrumbs, etc.) is initialized immediately on page load.
*   **Testing Sentry in DevTools Console**: Typing `myUndefinedFunction()` directly into the browser DevTools console will **not** trigger `window.onerror` because the browser's console evaluator wraps synchronous inputs in an internal `try/catch`. Always test using `setTimeout(() => { myUndefinedFunction(); }, 0)` or `Sentry.captureException(new Error("test"))`.

---

## 🎨 Theme & Aesthetic Standards

This repository intentionally maintains **two distinct design systems** depending on the section:

### A. Main Portal & Arcade Games: Retro-Futuristic Subsea Arcade
Used by root [`index.html`](index.html), `typershark/`, `skyfire/`, `abyssrun/`, `aquasynth/`, `beatdash/`, `sonarbeat/`, and `usbtest/`.
*   **Colors**: Deep ocean/space dark backgrounds (`#020713`, `#061530`) with vibrant neon accents (cyan `#00f2fe`, purple `#b927fc`, emerald `#00ff87`, crimson `#ff0055`, gold `#ffd700`).
*   **Typography**: Google Fonts `Orbitron` (headings), `Outfit` (body), and `Share Tech Mono` (HUD/telemetry).
*   **Interactivity**: Glassmorphic cards, glowing borders, CRT scanline overlays, floating particle/bubble physics, and Web Audio UI synth chirps.

### B. `/roms` Vault & Emulator Player: Early Vercel / ZEIT Minimalist Monochrome
Used exclusively by [`roms/index.html`](roms/index.html).
*   **Colors**: Heavily black and white (`--bg: #000000`, `--bg-surface: #0a0a0a`, `--bg-subtle: #111111`, `--text-main: #ffffff`, `--text-muted: #888888`, `--text-dim: #555555`). Hairline borders (`1px solid #282828` and `#1c1c1c`). No neon glows or rounded cards.
*   **Sharp Geometry**: Strictly `0px` border radius everywhere (`* { border-radius: 0 !important; }`). Primary buttons use solid `#ffffff` background with `#000000` text, inverting on hover (`#000000` background, `#ffffff` text, `1px solid #ffffff` border).
*   **Typography & Branding**: Google Fonts `Inter` (clean geometric sans) + `Space Mono` (monospace metadata, checksums, tags, and CLI status strip), accented with the iconic `▲` triangle mark.
*   **Edge-to-Edge Containers & Maximized Game Boy Player**:
    *   All page containers (`.container`, `.top-nav`, `.hero-card`, `.controls-card`, `.catalog-section`, `.rom-item`) span `width: 100%; max-width: 100%;` flush to the viewport edges.
    *   The emulator modal (`#gba-player-modal`) is full-bleed (`position: fixed; inset: 0; width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh;`).
    *   The screen viewport (`.gba-screen-viewport`) uses `flex: 1; min-height: 0; min-width: 0;` between the 48px header and 48px bottom toolbar, and both `#gba-canvas` and `#gb-canvas` use `width: 100% !important; height: 100% !important; object-fit: contain; image-rendering: pixelated;` so the game display scales to maximum screen real estate while preserving exact native aspect ratios (3:2 for GBA, 10:9 for GB/GBC).

---

## 🕹️ `/roms` Emulator Internals & Gotchas

When working on [`roms/index.html`](roms/index.html), [`roms/gbajs2/`](roms/gbajs2/), or [`roms/wasmboy/`](roms/wasmboy/), keep these critical implementation details in mind:

1.  **Dual-Engine Architecture**:
    *   **Game Boy Advance (`.gba`, `.bin`)**: Powered by vendored `GBA.js` (`roms/gbajs2/js/*.js`) + HLE BIOS (`roms/gbajs2/biosbin.js`, exposed as `window.biosBin`). Renders to `#gba-canvas` (`240×160`).
    *   **Game Boy & Game Boy Color (`.gb`, `.gbc`)**: Powered by vendored `WasmBoy` (`roms/wasmboy/wasmboy.wasm.umd.min.js`). Renders to `#gb-canvas` (`160×144`).
2.  **WasmBoy UMD Export Flattening**:
    *   The UMD bundle exports the API nested under `window.WasmBoy.WasmBoy`. Right after loading the script, we flatten it (`window.WasmBoy = window.WasmBoy.WasmBoy`) and use the `getWasmBoy()` helper.
    *   WasmBoy is initialized with `isGbcEnabled: true` and `isGbcColorizationEnabled: true` so both `.gb` (including CGB+SGB enhanced cartridges like *Pokémon Yellow*, *Gold*, *Silver*) and `.gbc` (*Pokémon Crystal*) run in full color.
3.  **Canvas Visibility & `<dialog>` CSS Rules**:
    *   WasmBoy mutates inline styles on its canvas during `setCanvas()` / `config()`. Therefore, `#gba-canvas` and `#gb-canvas` visibility is enforced both in JS (`switchActiveSystem`) and with `!important` CSS selectors keyed off `.gba-screen-viewport[data-system="..."]`.
    *   Because `.gba-dialog` uses `display: flex`, always preserve `.gba-dialog:not([open]) { display: none !important; }` so closed `<dialog>` elements never remain visible.
4.  **Audio Lifecycle & Pause Cleanup**:
    *   Closing the player modal (`closePlayerModal()`), pressing `Escape` (`close` / `cancel` dialog events), switching systems, or backgrounding the browser tab (`visibilitychange`) **must** call `pauseAllEmulators()`.
    *   `pauseAllEmulators()` pauses the GBA CPU loop, calls `gba.audio.pause(true)`, suspends `gba.audio.context`, and awaits `WasmBoy.pause()` so background audio never leaks after closing the modal.
5.  **Fast-Forward / Speed Multiplier (`1x`, `2x`, `3x`)**:
    *   Toggled via the `⚡ 1x` toolbar button or the `Tab` / `` ` `` keyboard shortcut.
    *   In `roms/gbajs2/js/gba.js`, `gba.setSpeed(mult)` runs `mult` CPU frames per `runStable` tick while setting `video.renderPath.skipFrame = true` on intermediate frames and scaling the audio sample increment in `roms/gbajs2/js/audio.js`.
    *   In WasmBoy, `wb.setSpeed(mult)` adjusts the emulation speed multiplier directly.
6.  **Adding New ROMs**:
    *   Place the `.gba`, `.gbc`, or `.gb` file in `roms/downloads/`.
    *   Add an entry to the `ROM_CATALOG` array in [`roms/index.html`](roms/index.html) with `system: "gba" | "gbc" | "gb"`, `fileName`, `sizeDisplay`, `crc32`, `year`, `developer`, and `notes`.

---

## 🚀 Game Launcher Integration Protocol

When adding a new game to the repository, register it in the root [`index.html`](index.html) launcher:

### Step 1: Add a Game Card
Under `<main class="game-grid">`, add a new `<a href="your-game-directory/" class="game-card active-card" id="card-yourgame">` element following the existing card structure (with `.card-art`, `.visualizer-container`, `.card-badges`, `.card-title`, `.card-desc`, and `.card-action.play-btn`).

### Step 2: Wire Hover & Click Sound Effects
In the `<script>` block at the bottom of [`index.html`](index.html), attach `playHoverSound()` on `mouseenter` and `playClickSound()` on `click` for your new `#card-yourgame` element.

---

## 🛠️ Verification & Testing Guidelines

*   **Relative URLs Only**: Always reference files using relative paths (e.g., `roms/`, `downloads/...`, `../`) so links work both on `games.shaffer.tech` and local servers.
*   **Local Server Verification**: Always test via a local HTTP server (`python3 -m http.server 8001`), never via `file://`.
*   **Syntax & Bundle Check**:
    *   If you modified `src/` in `aquasynth`, `beatdash`, or `sonarbeat`, run `node <game>/build.js`.
    *   Verify inline `<script>` blocks have zero syntax errors and no stray console spam.
