# AGENTS.md — Developer Guidelines for AI/Agentic Contributors

This document establishes behavioral rules, architectural constraints, and standard patterns for AI agents (and human developers) adding or updating games in the **Shaffer Family Games** repository.

---

## 🏗️ Core Architectural Rules

### 1. Static-Only Architecture (Strict)
This repository is hosted on **GitHub Pages**. 
*   **No backend runtime**: No Node.js Express, Python Flask, PHP, or DB servers can run in production. Everything must run entirely in the user's browser.
*   **Data Persistence**: If a game needs save states, high scores, or settings, use client-side storage APIs:
    *   `localStorage` for simple key-value pairs (e.g., settings, sound configurations, high scores).
    *   `IndexedDB` or standard browser cache wrappers for larger structures.
*   **No Cache Headers**: Do not write server-side config files or templates that apply HTTP caching headers to files. We require games and modifications to be immediately visible upon repository update. GitHub Pages delivers rapid static serving without cache locks.

### 2. Standalone Single-File Game Delivery
To ensure fast load times, minimal directory clutter, and zero asset-loading path resolution bugs, games should ideally exist as a **single, standalone HTML file** (with inlined `<style>` and `<script>` tags).
*   **CDN Usage**: Pull heavy third-party engines (e.g., Three.js, FontAwesome) via reputable CDNs (e.g., `cdnjs`, `unpkg`) rather than installing NPM dependencies.
*   **Bundled Development Model**: If a game becomes too complex for a single file during coding, organize it in a folder like:
    ```
    /mygame/src/index.html
    /mygame/src/style.css
    /mygame/src/game.js
    /mygame/build.js
    ```
    Write a `build.js` Node script (similar to [beatdash/build.js](file:///Users/steve/Documents/antigravity/cool-meitner/beatdash/build.js)) that reads these source files, inlines the CSS/JS into the HTML file, and outputs a compiled [mygame/index.html](file:///Users/steve/Documents/antigravity/cool-meitner/mygame/index.html).

---

## 🎨 Theme & Aesthetic Standards

The portal and games target a **premium, responsive, retro-futuristic subsea arcade** feel. Generic MVP styles are not acceptable.

### Style Requirements:
*   **Colors**: Avoid plain browser primary colors. Utilize custom HSL palettes or modern glow gradients (e.g., cyan `#00f2fe`, purple `#b927fc`, green `#00ff87`, deep blue space/ocean backgrounds `#020713`).
*   **Typography**: Import modern retro/military fonts from Google Fonts:
    *   `Orbitron` (Futuristic headings)
    *   `Outfit` (Clean body text)
    *   `Share Tech Mono` (HUD / Status consoles)
*   **Interactivity**: Incorporate micro-animations (pulse lights, moving scan lines, floating background particles/bubbles, and smooth card transitions).
*   **Responsive Layouts**: Design for multiple viewports. Playability must be seamless on desktop (mouse/keyboard) and mobile (touch controls/responsive canvas).

---

## 🚀 Game Launcher Integration Protocol

When adding a new game, you must register it in the root [index.html](file:///Users/steve/Documents/antigravity/cool-meitner/index.html) launcher.

### Step 1: Add a Game Card
Under the `<main class="game-grid">` tag, add a new anchor element. Use this structural pattern:

```html
<!-- Game Card Pattern -->
<a href="your-game-directory/" class="game-card active-card" id="card-yourgame">
  <div class="card-art">
    <!-- Glow effect using custom colors -->
    <div class="glow-effect purple-glow"></div>
    
    <!-- Inline SVG graphics or custom CSS animations representing the game -->
    <div class="visualizer-container">
      <!-- Animated SVG or HTML nodes representing the gameplay -->
    </div>
  </div>
  <div class="card-body">
    <div class="card-badges">
      <span class="badge badge-active">PLAY NOW</span>
      <span class="badge badge-special">GENRE / CATEGORY</span>
      <span class="badge">KEY CONTROLS (e.g. KEYBOARD/TOUCH)</span>
    </div>
    <h2 class="card-title">Your Game Title</h2>
    <p class="card-desc">An engaging description of the game rules, theme, and challenges.</p>
    <div class="card-action play-btn">
      PLAY GAME
      <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  </div>
</a>
```

### Step 2: Wire Hover & Click Sound Effects
The launcher includes an ambient/UI synth engine. Locate the `<script>` block at the bottom of the root [index.html](file:///Users/steve/Documents/antigravity/cool-meitner/index.html) and register your card for sound feedback:

```javascript
const activeCardYourgame = document.getElementById('card-yourgame');
if (activeCardYourgame) {
  // Play subtle synth chirp on hover
  activeCardYourgame.addEventListener('mouseenter', () => {
    playHoverSound(); 
  });
  // Play transition sweep sound on click
  activeCardYourgame.addEventListener('click', () => {
    playClickSound();
  });
}
```

---

## 🛠️ Verification & Testing Guidelines

*   **No Broken References**: Always reference other project files using relative URLs (e.g., `typershark/` instead of `/typershark/`) to prevent link breakage when served on subpaths or alternative domains.
*   **Local Server Verification**: Do not test games by opening HTML files directly via the browser's `file://` protocol. This breaks module scripts and web workers. Always spin up a local static server:
    ```bash
    python3 -m http.server 8000
    ```
*   **Quality Check**: Ensure no TODO placeholders, console log spam, or incomplete features remain in production code. Ensure the global launcher's sound-mute setting behaves properly across subpages.
