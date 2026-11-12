#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const GAME_ORDER = [
  'wordle',
  'digits',
  'reactor',
  'memory',
  'slider',
  'waffle',
  'traffic',
  'morph',
  'mastermind',
  'iceslide',
  'chess',
  'sudoku',
  'mines',
  'knight',
  'islands'
];

const testFiles = [
  path.join(__dirname, 'src', 'shared', 'shared.test.js'),
  ...GAME_ORDER.map((id) => path.join(__dirname, 'src', 'games', id, `${id}.test.js`))
].filter((filePath) => fs.existsSync(filePath));

// Ensure gauntlet/index.html is compiled for bundle verification tests
const distHtmlPath = path.join(__dirname, 'index.html');
if (!fs.existsSync(distHtmlPath)) {
  const buildScript = path.join(__dirname, 'build.js');
  spawnSync(process.execPath, [buildScript], { cwd: __dirname, stdio: 'inherit' });
}

const res = spawnSync(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit'
});

process.exit(res.status ?? 1);
