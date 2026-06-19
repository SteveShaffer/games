# Shaffer Family Games 🎮

Welcome to the **Shaffer Family Games** hub! This repository contains a collection of simple, retro-styled games created for and enjoyed by the Shaffer family. The games are served from a unified portal hosted on GitHub Pages.

🌐 **Live URL**: [games.shaffer.tech](https://games.shaffer.tech)

---

## 🏗️ Technical Architecture & Constraints

*   **Static Hosting**: Hosted on **GitHub Pages**. The repository must contain only static client-side resources (HTML, CSS, JavaScript, Web Audio, images, shaders). There is **no backend server** or database.
*   **No Cache Headers**: Do not add caching configurations or HTTP headers (e.g., `Cache-Control`) that prevent instant updates. We want users to see new game updates and hotfixes immediately. GitHub Pages is snappy enough to handle load times without client-side caching locks.
*   **Single-File Bundling**: For simplicity and low latency, games are either authored as a single, self-contained HTML file (containing inline CSS and JS) or compiled/bundled into one before deployment.
*   **Premium Visual Aesthetics**: Every game and page in this portal must look modern, vibrant, and interactive (e.g., dark modes, custom color palettes, glassmorphism, smooth animations, and retro CRT screen effects) instead of looking like a generic MVP.

---

## 📂 Repository Structure

*   [index.html](file:///Users/steve/Documents/antigravity/cool-meitner/index.html) (Root) — The main game launcher. Features a premium subsea-themed interactive console with retro CRT scan lines, floating bubble physics, and toggleable ambient/UI sound feedback.
*   [typershark/](file:///Users/steve/Documents/antigravity/cool-meitner/typershark/) — **Typer Shark: Abyss Descent**. A keyboard speed-typing game where players pilot a submarine in the deep ocean, typing words attached to approaching sharks and jellyfish to zap them. (Single-file: `index.html`).
*   [skyfire/](file:///Users/steve/Documents/antigravity/cool-meitner/skyfire/) — **SKYFIRE: Carrier Strike**. A 3D flight simulator where you pilot an interceptor jet, engage enemy targets, and complete aircraft carrier landings. Built using Three.js via CDN. (Single-file: `index.html`).
*   [beatdash/](file:///Users/steve/Documents/antigravity/cool-meitner/beatdash/) — **Beat Dash**. A fast-paced, music-reactive neon rhythm game. Supports importing custom MP3 tracks to drive dynamic visualizer elements.
    *   `src/` — Contains separate source files (`index.html`, `style.css`, `game.js`, `asset_synth.js`).
    *   `build.js` — Node.js script that compiles and inlines the files in `src/` into a single standalone [beatdash/index.html](file:///Users/steve/Documents/antigravity/cool-meitner/beatdash/index.html).
*   **Wordle** — Mapped externally via card link to [wordle.shaffer.tech](https://wordle.shaffer.tech).

---

## 🛠️ Local Development & Build Commands

### 1. Running the Site Locally
Since this is a fully static project, you can run it using any simple local HTTP server from the root directory:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js (npm)
npx serve
```
Then navigate to `http://localhost:8000` (or the port specified by serve).

### 2. Building Beat Dash
If you modify any files inside the [beatdash/src/](file:///Users/steve/Documents/antigravity/cool-meitner/beatdash/src/) directory, you must run the build script to compile the new bundle:

```bash
# Navigate to the game directory
cd beatdash

# Compile into a single index.html
node build.js
```

---

## 🤖 Guide for Future Contributors

If you are an agentic (AI) or human developer planning to build new games, improve layouts, or add features, please read and follow the strict guidelines in:
*   [AGENTS.md](AGENTS.md)

These rules detail how to structure new folders, compile single-file builds, maintain the retro subsea aesthetics, hook into the audio feedback system, and integrate new games into the root launcher matrix.
