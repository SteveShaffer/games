const fs = require('fs');
const path = require('path');

const SHARED_JS_FILES = [
  'shared/rng.js',
  'shared/audio.js',
  'shared/words.js',
  'shared/registry.js',
  'shared/state.js'
];

const GAME_IDS = [
  'wordle',
  'digits',
  'reactor',
  'memory',
  'slider',
  'waffle',
  'traffic',
  'morph',
  'mastermind',
  'iceslide'
];

function build() {
  console.log('Starting Daily Gauntlet modular single-HTML bundle compilation...');

  try {
    const srcDir = path.join(__dirname, 'src');
    const distFile = path.join(__dirname, 'index.html');

    let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');

    // 1. Concatenate shared style.css + per-game style.css files
    const cssFiles = [
      'style.css',
      ...GAME_IDS.map((id) => path.posix.join('games', id, 'style.css'))
    ];

    const cssParts = [];
    for (const relCss of cssFiles) {
      const fullCssPath = path.join(srcDir, relCss);
      if (fs.existsSync(fullCssPath)) {
        cssParts.push(`/* --- ${relCss} --- */\n` + fs.readFileSync(fullCssPath, 'utf8').trim());
      }
    }
    const combinedCss = cssParts.join('\n\n');

    // Replace all local stylesheet <link> tags in src/index.html with a single inlined <style> block
    const cssLinkRegex = /(\s*<link\s+rel="stylesheet"\s+href="(?:style\.css|games\/[^"]+\/style\.css)"\s*>\s*)+/;
    if (cssLinkRegex.test(html)) {
      html = html.replace(cssLinkRegex, () => `\n  <style>\n${combinedCss}\n  </style>\n`);
      console.log(`✔ Inlined ${cssParts.length} CSS modules (${cssFiles.join(', ')}).`);
    } else {
      throw new Error('Could not find local CSS <link> tags in gauntlet/src/index.html');
    }

    // 2. Concatenate shared/*.js + games/*/game.js + main.js into a single IIFE
    const jsFiles = [
      ...SHARED_JS_FILES,
      ...GAME_IDS.map((id) => path.posix.join('games', id, 'game.js')),
      'main.js'
    ];

    const jsParts = [];
    for (const relJs of jsFiles) {
      const fullJsPath = path.join(srcDir, relJs);
      if (!fs.existsSync(fullJsPath)) {
        throw new Error(`Missing required Gauntlet JS module: ${fullJsPath}`);
      }
      jsParts.push(`  // --- Module: ${relJs} ---\n` + fs.readFileSync(fullJsPath, 'utf8').trim());
    }

    const combinedJs = [
      '(function () {',
      "  'use strict';",
      '',
      jsParts.join('\n\n'),
      '})();'
    ].join('\n');

    // Replace the local <script src="..."></script> block in src/index.html with the single inlined <script>
    const scriptsBlockRegex = /\s*(?:<!--[^>]*-->\s*)*<script\s+src="shared\/rng\.js"><\/script>[\s\S]*?<script\s+src="main\.js"><\/script>/;
    if (scriptsBlockRegex.test(html)) {
      html = html.replace(scriptsBlockRegex, () => `\n  <script>\n${combinedJs}\n  </script>`);
      console.log(`✔ Inlined ${jsFiles.length} JS modules (5 shared + ${GAME_IDS.length} games + main.js).`);
    } else {
      throw new Error('Could not find modular <script> block in gauntlet/src/index.html');
    }

    fs.writeFileSync(distFile, html, 'utf8');
    console.log(`\n🎉 Success! Single HTML file compiled to: ${distFile}`);
    console.log(`Bundle size: ${(Buffer.byteLength(html) / 1024).toFixed(2)} KB\n`);
  } catch (error) {
    console.error('❌ Build failed with error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  build();
}

module.exports = { build, SHARED_JS_FILES, GAME_IDS };
