#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const testFiles = [
  path.join(__dirname, 'tests', 'unit', 'generation.test.js'),
  path.join(__dirname, 'tests', 'e2e', 'playability.test.js')
];

const res = spawnSync(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit'
});

process.exit(res.status ?? 1);
