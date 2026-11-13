# AGENTS.md — Developer Guidelines for AI/Agentic Contributors

This document establishes behavioral rules, architectural constraints, design systems, and technical gotchas for AI agents (and human developers) maintaining or expanding the **Shaffer Family Games** repository ([games.shaffer.tech](https://games.shaffer.tech)).

---

## 📋 Project Backlog & Next Tasks ([`TODO.md`](TODO.md))

*   **Always Check [`TODO.md`](TODO.md)**: When deciding what to work on next—or when asked for next steps/improvements—read [`TODO.md`](TODO.md) at the root of the repository first.
*   Keep [`TODO.md`](TODO.md) up to date by checking off completed items (`- [x]`) and adding newly discovered follow-up tasks as requested.

---

## 🌿 Branching & Pull Request Workflow (Strict: Never Push Directly to `master`)

*   **No Direct Pushes to `master`**: Never push commits directly to `master`. All contributions—including bug fixes, documentation updates, refactors, and feature additions—must be performed on a dedicated branch (e.g., `feat/...`, `fix/...`, `docs/...`).
*   **Always Publish a Pull Request (PR)**:
    1.  Branch off clean `origin/master` (`git checkout -b <prefix>/<branch-name> origin/master`).
    2.  Make changes, run local tests (`node gauntlet/run-tests.js`), and compile/verify bundles (`node build.js --verify`).
    3.  Push the branch to `origin` (`git push -u origin <prefix>/<branch-name>`).
    4.  Create a pull request using `gh pr create` with a clear title and description.
*   **User Reviews & Merges**: Do not bypass review or push directly to `master`. The repository owner reviews and merges all PRs.

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
*   **Bundled `src/` Games & Root Build System**: [`aquasynth/`](aquasynth/), [`beatdash/`](beatdash/), [`sonarbeat/`](sonarbeat/), and [`gauntlet/`](gauntlet/) keep modular source files in `src/` and compile into a single `index.html` via their `build.js` scripts or the root [`build.js`](build.js) orchestrator:
    ```bash
    # Build all bundled games + verify Sentry SDK, JS syntax & asset links across all 10 pages:
    node build.js
    # Or run individual game builders:
    node aquasynth/build.js
    node beatdash/build.js
    node sonarbeat/build.js
    node gauntlet/build.js
    ```
    **IMPORTANT**: Whenever you edit anything in `aquasynth/src/`, `beatdash/src/`, `sonarbeat/src/`, or `gauntlet/src/`, you **must** run `node build.js` (or that game's `build.js` script) so the compiled `index.html` stays in sync. Do not edit the compiled `index.html` of those games without updating their `src/` files first.
*   **GitHub Pages CI/CD Pipeline (`.github/workflows/deploy-pages.yml`)**: On pushes to `master`/`main`, GitHub Actions runs `node build.js --out _site` and `node build.js --verify` to compile all bundles, validate every HTML entrypoint, stage a clean `_site/` artifact (excluding `*/src/` and `build.js`), and deploy via `actions/deploy-pages`. Keeping the compiled `<game>/index.html` files committed in-repo ensures the site also works seamlessly if served directly from the branch or a local static server.
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

This repository intentionally maintains **three distinct design systems** depending on the section:

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

### C. `/gauntlet` Daily Gauntlet: Clean Wordle-Inspired Light Minimalist
Used exclusively by [`gauntlet/`](gauntlet/) (`gauntlet/src/` → `gauntlet/index.html`).
*   **Colors**: Warm light-mode paper background (`--bg-outer: #f0efe9`, `--bg-surface: #ffffff`, `--bg-subtle: #f5f4f0`) with crisp Wordle-inspired semantic tokens (`--wordle-green: #6aaa64`, `--wordle-yellow: #c9b458`, `--wordle-gray: #787c7e`, `--bonus-gold: #f59e0b`, `--danger-red: #dc2626`).
*   **Typography & Shell**: Google Fonts `Outfit` inside a fixed-height (`100dvh` on mobile, `min(880px, calc(100dvh - 40px))` on desktop) portrait phone container (`.gauntlet-shell`).

---

## 🧩 `/gauntlet` Daily Gauntlet Internals & Gotchas

When working on [`gauntlet/src/`](gauntlet/src/) (`index.html`, `style.css`, `main.js`, `shared/*.js`, and `games/<game-id>/{game.js,style.css}`):

0.  **Modular Subfolder Structure (`gauntlet/src/`)**:
    *   `gauntlet/src/shared/`: Shared libraries loaded before the mini-games:
        *   [`rng.js`](gauntlet/src/shared/rng.js): Deterministic PRNG (`mulberry32`, `createPRNG`, `hashString`, `seededShuffle`) and date helpers (`formatDateYMD`, `parseYMD`, `getDayNumberForDate`, `formatShortDate`, `shiftDateStr`).
        *   [`audio.js`](gauntlet/src/shared/audio.js): Web Audio synth effects and global `shaffer-games-muted` sync.
        *   [`words.js`](gauntlet/src/shared/words.js): Shared word pools and dictionaries (`WAFFLE_WORD_POOL`, `WORDLE_TARGETS`, `WORDLE_VALID_SET`, `MORPH_WORDS`, `MORPH_EXTRA_VALID_WORDS`).
        *   [`registry.js`](gauntlet/src/shared/registry.js): Central mini-game registry (`registerMiniGame`, `getMiniGameSpec`, `MINI_GAME_SPECS`).
        *   [`state.js`](gauntlet/src/shared/state.js): Run state generation, `localStorage` persistence (`saveStateForActiveDate`), HUD/Turn Health Bar rendering, Par helper (`setStagePar`), turn spending (`spendTurn`), and boost awards (`grantBonusTurns`).
    *   `gauntlet/src/games/<game-id>/`: One subfolder per mini-game (`wordle`, `digits`, `reactor`, `memory`, `slider`, `waffle`, `traffic`, `morph`, `mastermind`, `iceslide`, `chess`, `sudoku`, `mines`, `knight`, `islands`, `gems`), each containing its own `game.js` (which defines `generate<Game>Puzzle`, solver helpers, and calls `registerMiniGame(...)`), `style.css`, and colocated `<game-id>.test.js` unit + E2E test suite.
    *   [`gauntlet/src/shared/shared.test.js`](gauntlet/src/shared/shared.test.js) & [`gauntlet/tests/helpers/dom-harness.js`](gauntlet/tests/helpers/dom-harness.js): Shared PRNG/seeding/full-run E2E tests and zero-dependency VM/DOM test harness.
    *   [`gauntlet/src/main.js`](gauntlet/src/main.js): Stage dispatcher (`mountCurrentStage`), end-of-run summary, clipboard score sharing, help & localhost sandbox modals, countdown clock, `window.__GAUNTLET_TEST_API__` export, and bootstrap.
    *   [`gauntlet/build.js`](gauntlet/build.js): Concatenates `src/style.css` + `src/games/*/style.css` and `src/shared/*.js` + `src/games/*/game.js` + `src/main.js` (excluding `*.test.js`) into the standalone [`gauntlet/index.html`](gauntlet/index.html).
    *   [`gauntlet/run-tests.js`](gauntlet/run-tests.js): Runs `src/shared/shared.test.js` and all 16 `src/games/<id>/<id>.test.js` suites via Node's built-in `node --test` runner (`npm test`).

1.  **Normalized One-Word Game Roster & Par (`MINI_GAME_SPECS`)**:
    *   All 16 games use normalized one-word names everywhere (`name` and `shortName` in `MINI_GAME_SPECS`) and call `setStagePar(stage, parTurns)` on mount:
        1.  🔤 **Word** (`wordle`): Target chosen from `WORDLE_TARGETS` (**2,300** everyday English 5-letter words); guesses validated against `WORDLE_VALID_SET` (**14,734** valid 5-letter words). **Par 4**.
        2.  🧮 **Digits** (`digits`): 5 starting numbers (`4` from `2..9`, `1` from `{10,12,15,20,25}`) combined via `+ − × ÷` to reach a 3-step target (**46,609** distinct `(baseNumbers, targetNumber)` puzzles). **Par 2–3** (`findMinDigitsOps`).
        3.  🟩 **Flip** (`reactor`): 3×3 Lights Out grid scrambled by 4 distinct cell toggles (**126** distinct starting boards, linearly independent over $\mathbb{F}_2$, so always solvable in 4 taps). **Par 4**.
        4.  🃏 **Pairs** (`memory`): 3×4 memory match (6 pairs, **7,484,400** distinct 12-card layouts) with a 1.5s initial card preview. **Par 7**.
        5.  🔢 **Slide** (`slider`): 3×3 8-puzzle scrambled by 7–10 non-backtracking moves and filtered via `findMinSliderMoves` to 5–8 BFS slides (**237** distinct boards at BFS distance 5–8; every 2 slides = 1 turn). **Par 3–4**.
        6.  🧇 **Waffle** (`waffle`): 5×5 intersecting 6-word grid (`WAFFLE_WORD_POOL`, 781 words) scrambled with three 2-cycles and one 3-cycle (**millions** of distinct boards; every 2 swaps = 1 turn). **Par 3**.
        7.  🚗 **Jam** (`traffic`): 6×6 *Rush Hour* sliding block puzzle procedurally generated via `generateProceduralTrafficBoard(rng)` and verified by `solveTrafficBFS` to require 6–10 vehicle moves (**thousands** of unique boards; every 2 vehicle moves = 1 turn), with 12 hardcoded templates in `TRAFFIC_PUZZLES` as a fallback. **Par 3–5**.
        8.  🔗 **Morph** (`morph`): 4-letter word ladder (`MORPH_WORDS` + `MORPH_EXTRA_VALID_WORDS`, no valid-letter keyboard hints) with BFS shortest path of 3–4 steps (**81,366** ordered `(startWord, goalWord)` pairs). **Par 3–4**.
        9.  🔐 **Code** (`mastermind`): 4-peg secret code from 6 colors/shapes with **no duplicate pegs** (`360` possible codes). **Par 4**.
        10. 🧊 **Ice** (`iceslide`): 6×6 sliding rink with 6 rocks, 2 cracked-ice tiles (`❄️` → `🪨` after sliding over), and an interior goal flag reachable in 5–7 BFS slides (**millions** of unique boards; every 2 slides = 1 turn). **Par 3–4**.
        11. ♟️ **Chess** (`chess`): 4×4 tactical royal capture puzzle with 2 White pieces (`♘` + `♖`/`♗`) vs Black King `♚` and 2 Black guards (`♜`/`♝` + `♞`), verified by `solveChessBFS` to require 2–3 safe moves (**229,744** unique boards; 1 move = 1 turn). **Par 2–3**.
        12. 🍱 **Sudoku** (`sudoku`): 4×4 Mini Latin square with 2×2 boxes, 10 given digits, and 6 empty cells across all 288 valid 4×4 Sudoku solutions (**2,306,304** starting boards; every 2 placements = 1 turn, and wrong placements flash red and cost a move). **Par 3**.
        13. 💣 **Mines** (`mines`): 4×4 deterministic Minesweeper board with 4 hidden mines and 9 pre-revealed safe clue cells verified to uniquely determine all 4 mines among the 7 unrevealed tiles (**13,512** unique boards; every 2 flags = 1 turn, and mis-flagging a safe tile reveals it as a mistake and costs a move). **Par 2**.
        14. ♞ **Knight** (`knight`): 4×4 Chess Knight path puzzle with 3 target stars (`⭐`) and 2 rocks (`🪨`), verified via state-space BFS to require 4–6 L-jumps (**313,912** unique boards; every 2 jumps = 1 turn). **Par 2–3**.
        15. 🌉 **Bridges** (`islands`): Procedurally generated *Hashi* island bridge network on a 4×4 island lattice (`7×7` display grid) with 6–8 islands, playable bridge slots (`0, 1, 2`) between all orthogonally adjacent island pairs (including `0`-bridge cycle decoys), and backtracking verification (`solutions === 1`) for a unique solution in 6–10 bridge taps (**251,660** unique puzzles; every 2 taps = 1 turn). **Par 3–5**.
        16. 💎 **Gems** (`gems`): 4×4 match-3 tactical board clear puzzle with zero refills from above, gravity cascades, colorblind-friendly geometric icons, and undo/reset support. Procedurally generated with BFS solver verifying a complete board clear in 3–5 swaps, backed by 8 verified templates with horizontal flip and color permutations (**thousands** of unique boards; every 2 swaps = 1 turn). **Par 2–3**.
2.  **Gauntlet Mini-Game Design Principles (Strict Criteria for New Games)**:
    When designing, evaluating, or tuning mini-games for `/gauntlet`, every game **must** satisfy all four principles below:
    *   **Principle 1 — True Turn-Based Economy (Never Speed/Time-Based)**: Games that rely on real-time visual scanning or speed (`Set`, `Pipes`) fail when converted to turn-based puzzles—without a clock, finding the answer is trivial and takes a fixed number of actions.
    *   **Principle 2 — Elastic Turn Spend & Risk of Wasted Turns**: Every Gauntlet game must allow players to waste turns through suboptimal routing, backtracking, hypothesis testing, or mistakes (`Word`, `Code`, `Pairs`, `Slide`, `Jam`, `Morph`, `Ice`, `Chess`, `Knight`, `Bridges`, `Sudoku`, `Mines`). Puzzles where every player is guaranteed to finish in the exact same fixed number of clicks with zero possibility of wasted turns (`Hanoi`, `Pipes`, `Laser`, `Sum`, `Fleet`) create a flat, unengaging turn economy.
    *   **Principle 3 — Self-Evident Rules & Familiar Affordances**: In a 5-stage daily anthology, rules must be graspable in one sentence without decoding cryptic multi-number headers (`Nonogram`) or bespoke stat tables (`Duel`).
    *   **Principle 4 — High Procedural Board Space (Thousands of Unique Boards)**: Every game must use procedural generation (or large combinatorial pools) yielding thousands of unique, solver-verified starting boards—never small pools of 2–10 memorizable templates (`Scale`, `Hanoi`, `Laser`).
3.  **Turn Health Bar & Rare Boosts**:
    *   Players start with `INITIAL_TURNS = 25` shared across 5 daily stages.
    *   `#turnHudBox` renders a segmented **Turn Health Bar** (`#turnHealthFill`) whose width is `(turnsRemaining / 25) * 100%` and shifts classes between default green (`> 12`), `.mid-turns` yellow (`6–12`), and `.low-turns` red (`<= 5`), with `.damage-hit` shake on turn spend and `.bonus-pulse` on `+2⚡` boost collection.
    *   Only `BOOSTS_PER_GAUNTLET = 2` stages per day spawn a `+2⚡` golden boost.
4.  **Mid-Stage `localStorage` State Persistence (`stage.savedState`)**:
    *   Every game must save its mid-stage progress into `stage.savedState` and call `saveStateForActiveDate()` whenever a turn or move is taken so refreshing the page restores all submitted rows/moves alongside `turnsRemaining`.
5.  **Strict Viewport Containment & Scrollable Row Containers**:
    *   `.board-container` has `flex: 1; min-height: 0; overflow: hidden;` so game boards never spill over `.stage-rule-line` or `.feedback-pill`.
    *   In **Word** (`wordle`), `.wordle-widget` and `.wordle-board` use `flex: 1; min-height: 0; overflow-y: auto; container-type: size;`, and `.wordle-row` sizes tiles using container query units (`clamp(38px, min(calc((100cqh - 38px) / 6), calc((100cqw - 32px) / 5)), 58px)`) so 6 rows fill the exact available vertical space without overflowing, while 7+ guesses scroll cleanly without cutting off row `#1`.
    *   In **Code** (`mastermind`), `.mastermind-widget` and `.mm-history` use `flex: 1; min-height: 0; overflow-y: auto;` so all rows (`#1` through the active row) stay in the DOM and scroll smoothly when guesses exceed 5 rows, with the `Submit` button (`.mm-submit-btn`) placed below the 6 color buttons (`.mm-controls-bottom`).
6.  **Localhost Dev Sandbox (`#devSandboxBtn`)**:
    *   Automatically unhidden when `IS_LOCALHOST` is true; allows launching any single game with a random seed (`isSingleGameSandbox: true`) or a random 5-stage run without overwriting today's daily save in `localStorage`.
7.  **UX Affordances & Guidance**:
    *   **Slide Direction Arrows (`gauntlet/src/games/slider/`)**: Movable tiles dynamically display directional arrows (`↑`, `↓`, `←`, `→`) pointing toward the empty space, with directional classes (`.slide-up`, `.slide-down`, `.slide-left`, `.slide-right`) and hover elevation. Non-movable tiles are explicitly disabled with `cursor: default`.
    *   **Code (Mastermind) Feedback Count Badges (`gauntlet/src/games/mastermind/`)**: The ambiguous 4-dot result cluster is replaced with explicit semantic count badges: 🟩 `.mm-count-badge.exact` ("**X** Exact") for right color + right position, 🟨 `.mm-count-badge.partial` ("**Y** Misplaced") for right color, wrong position, and neutral `—` fallback if 0. Active row displays live status guidance (`"Pick 4 pegs"` until full, then `"Ready to submit"`).
    *   **Versioned Onboarding Modal (`#helpDialog`)**: Auto-opens on first visit using `localStorage` version key `'shaffer-gauntlet-onboarding-version'` (`'v1'`). Can be reopened anytime via the header `?` button (`#helpModalBtn`). To guarantee the dialog is never stuck in a loop after any user interaction, `markOnboardingSeen()` is wired to the dialog's native `close` event, `✕` close button, backdrop click, and `#gotItHelpBtn`.
8.  **Wordle-Style Stacked Emoji Score Sharing**:
    *   Generates compact stacked rows of 5 emoji health bar tiles for each played stage: `🟩` (>12 turns left), `🟨` (6–12 turns left), `🟥` (<=5 turns left), `⬛` (empty tile); failed stages show `⬛⬛⬛⬛⬛ 💀`.
    *   Compact format with zero blank lines between the header, stage rows, and URL.

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
*   **Antigravity IDE Preview Environment & `localStorage` Gotcha**:
    *   The in-IDE preview environment renders in an isolated, sandboxed webview context that **does not retain `localStorage` upon refresh/reload** (each reload starts with ephemeral or clean storage).
    *   Do not assume features relying on client-side persistence (e.g. Daily Gauntlet mid-stage saves, daily archive retention, global audio mute state, or the versioned First-Time Onboarding modal) are broken if refreshing the in-IDE preview resets them.
    *   Always verify `localStorage` persistence either:
        1.  Via the automated test suite (`node gauntlet/run-tests.js`), where `dom-harness.js` emulates full `localStorage` persistence across `env.reloadPage()`.
        2.  In an external browser tab pointing to the dev server (`http://localhost:8001/`).
    *   Remember that web browsers isolate `localStorage` strictly by origin (protocol + hostname + port), so port `8001` and port `8002` never share `localStorage`.
*   **Syntax & Bundle Check**:
    *   If you modified `src/` in `aquasynth`, `beatdash`, `sonarbeat`, or `gauntlet`, run `node <game>/build.js`.
    *   Verify inline `<script>` blocks have zero syntax errors and no stray console spam.
