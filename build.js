#!/usr/bin/env node
/**
 * Shaffer Family Games — Static Site Build & Verification Orchestrator
 *
 * Usage:
 *   node build.js                # Compile all bundled games & validate all HTML entrypoints
 *   node build.js --verify       # Verify bundles are in sync with src/ and validate all pages
 *   node build.js --out _site    # Build, validate, and stage clean production artifact to _site/
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT_DIR = __dirname;

const BUNDLED_GAMES = ['aquasynth', 'beatdash', 'sonarbeat', 'gauntlet'];

const HTML_ENTRYPOINTS = [
  'index.html',
  'roms/index.html',
  'typershark/index.html',
  'skyfire/index.html',
  'abyssrun/index.html',
  'aquasynth/index.html',
  'beatdash/index.html',
  'sonarbeat/index.html',
  'gauntlet/index.html',
  'usbtest/index.html'
];

const SENTRY_LOADER_URL =
  'https://js.sentry-cdn.com/661e3b63e998f3517b36a182cea2df15.min.js';

function parseArgs(argv) {
  const args = {
    verifyOnly: false,
    outDir: null
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--verify' || arg === '--check') {
      args.verifyOnly = true;
    } else if (arg === '--out' && argv[i + 1]) {
      args.outDir = path.resolve(ROOT_DIR, argv[++i]);
    } else if (arg.startsWith('--out=')) {
      args.outDir = path.resolve(ROOT_DIR, arg.slice('--out='.length));
    }
  }
  return args;
}

function buildBundledGames(verifySync = false) {
  console.log('=== 1. Compiling Bundled Games ===');
  for (const game of BUNDLED_GAMES) {
    const buildScript = path.join(ROOT_DIR, game, 'build.js');
    const distHtmlPath = path.join(ROOT_DIR, game, 'index.html');

    if (!fs.existsSync(buildScript)) {
      throw new Error(`Missing build script: ${buildScript}`);
    }

    const beforeContent = fs.existsSync(distHtmlPath)
      ? fs.readFileSync(distHtmlPath, 'utf8')
      : null;

    execFileSync(process.execPath, [buildScript], {
      cwd: path.join(ROOT_DIR, game),
      stdio: 'pipe'
    });

    const afterContent = fs.readFileSync(distHtmlPath, 'utf8');
    const sizeKb = (Buffer.byteLength(afterContent) / 1024).toFixed(2);

    if (verifySync && beforeContent !== null && beforeContent !== afterContent) {
      throw new Error(
        `Out-of-sync bundle detected for ${game}/index.html! Run "node ${game}/build.js" (or "npm run build") and commit the updated index.html.`
      );
    }

    console.log(`  ✔ ${game.padEnd(10)} -> ${game}/index.html (${sizeKb} KB)`);
  }
  console.log('');
}

function validateHtmlEntrypoints() {
  console.log('=== 2. Validating HTML Entrypoints, Sentry SDK & Inline Scripts ===');

  for (const relEntry of HTML_ENTRYPOINTS) {
    const fullPath = path.join(ROOT_DIR, relEntry);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing HTML entrypoint: ${relEntry}`);
    }

    const html = fs.readFileSync(fullPath, 'utf8');
    const entryDir = path.dirname(fullPath);

    // 1. Verify Sentry Browser Loader script + eager forceLoad()
    if (!html.includes(SENTRY_LOADER_URL)) {
      throw new Error(`Missing mandatory Sentry loader script in ${relEntry}`);
    }
    if (!html.includes('Sentry.forceLoad()')) {
      throw new Error(`Missing mandatory Sentry.forceLoad() initialization in ${relEntry}`);
    }

    // 2. Verify inline <script> blocks have valid JS syntax
    const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;
    let inlineScriptCount = 0;
    while ((match = scriptRegex.exec(html)) !== null) {
      const attrs = match[1] || '';
      const body = match[2] || '';
      if (/\bsrc\s*=/i.test(attrs)) {
        // Validate external local script existence
        const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
        if (srcMatch) {
          const srcUrl = srcMatch[1];
          if (!/^(https?:|data:|blob:|\/\/)/i.test(srcUrl)) {
            const cleanRel = srcUrl.split('?')[0].split('#')[0];
            const targetPath = path.resolve(entryDir, cleanRel);
            if (!fs.existsSync(targetPath)) {
              throw new Error(`Broken local <script src="${srcUrl}"> in ${relEntry}`);
            }
          }
        }
        continue;
      }
      if (body.trim().length > 0) {
        try {
          new vm.Script(body, { filename: relEntry });
          inlineScriptCount++;
        } catch (err) {
          throw new Error(`JavaScript syntax error in ${relEntry}: ${err.message}`);
        }
      }
    }

    // 3. Verify local relative href/src links in HTML markup exist on disk
    const htmlWithoutInlineCode = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (fullTag) => {
        const openTagMatch = fullTag.match(/^<script\b[^>]*>/i);
        return openTagMatch ? openTagMatch[0] : '';
      })
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

    const assetAttrRegex = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
    while ((match = assetAttrRegex.exec(htmlWithoutInlineCode)) !== null) {
      const rawUrl = match[1].trim();
      if (
        !rawUrl ||
        rawUrl.startsWith('#') ||
        rawUrl.includes('${') ||
        /^(https?:|mailto:|tel:|data:|blob:|javascript:|\/\/)/i.test(rawUrl)
      ) {
        continue;
      }
      const cleanRel = rawUrl.split('?')[0].split('#')[0];
      if (!cleanRel) continue;
      const resolved = path.resolve(entryDir, cleanRel);
      if (!fs.existsSync(resolved)) {
        throw new Error(`Broken relative asset reference "${rawUrl}" in ${relEntry}`);
      }
    }

    console.log(
      `  ✔ ${relEntry.padEnd(22)} (Sentry OK, ${inlineScriptCount} inline script${
        inlineScriptCount === 1 ? '' : 's'
      } verified)`
    );
  }

  // 4. Verify all ROM files referenced in roms/index.html ROM_CATALOG exist on disk
  const romsHtml = fs.readFileSync(path.join(ROOT_DIR, 'roms/index.html'), 'utf8');
  const fileNameMatches = [...romsHtml.matchAll(/fileName:\s*["']([^"']+)["']/g)];
  for (const m of fileNameMatches) {
    const romFile = m[1];
    const romPath = path.join(ROOT_DIR, 'roms/downloads', romFile);
    if (!fs.existsSync(romPath)) {
      throw new Error(`Missing ROM binary in roms/downloads/: "${romFile}"`);
    }
  }
  console.log(`  ✔ roms/downloads/        (${fileNameMatches.length} cataloged ROM binaries verified)\n`);
}

function copyRecursive(src, dest, filterFn) {
  if (filterFn && !filterFn(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry), filterFn);
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function stageProductionSite(outDir) {
  console.log(`=== 3. Staging Clean Static Site Artifact to ${path.relative(ROOT_DIR, outDir) || outDir} ===`);
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // Root-level static files
  for (const rootFile of ['index.html', 'CNAME']) {
    const srcPath = path.join(ROOT_DIR, rootFile);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(outDir, rootFile));
    }
  }
  // Add .nojekyll so GitHub Pages serves all files verbatim without Jekyll processing
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '', 'utf8');

  // Game & section directories (excluding dev-only src/ and build.js files)
  const siteDirs = [
    'roms',
    'typershark',
    'skyfire',
    'abyssrun',
    'aquasynth',
    'beatdash',
    'sonarbeat',
    'gauntlet',
    'usbtest'
  ];

  for (const dirName of siteDirs) {
    const srcDir = path.join(ROOT_DIR, dirName);
    const destDir = path.join(outDir, dirName);
    copyRecursive(srcDir, destDir, (itemPath) => {
      const base = path.basename(itemPath);
      const relFromGame = path.relative(srcDir, itemPath);
      if (base === '.DS_Store') return false;
      if (relFromGame === 'src' || relFromGame.startsWith(`src${path.sep}`)) return false;
      if (relFromGame === 'tests' || relFromGame.startsWith(`tests${path.sep}`)) return false;
      if (relFromGame === 'build.js' || relFromGame === 'run-tests.js') return false;
      if (base.endsWith('.test.js')) return false;
      return true;
    });
  }

  console.log(`  ✔ Staged production static site to ${outDir}\n`);
}

function main() {
  const args = parseArgs(process.argv);
  try {
    buildBundledGames(args.verifyOnly);
    validateHtmlEntrypoints();
    if (args.outDir) {
      stageProductionSite(args.outDir);
    }
    console.log('✅ Static site build and verification completed successfully!');
  } catch (err) {
    console.error(`\n❌ Build verification failed: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  BUNDLED_GAMES,
  HTML_ENTRYPOINTS,
  buildBundledGames,
  validateHtmlEntrypoints,
  stageProductionSite
};
