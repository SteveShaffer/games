'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Digits (digits) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-test-seed-${i + 1}`);

  it('findMinDigitsOps verifies target is reachable in 2–3 steps; deterministic per seed', () => {
    const { api } = createGauntletEnv();
    const smallSet = new Set([2, 3, 4, 5, 6, 7, 8, 9]);
    const bigSet = new Set([10, 12, 15, 20, 25]);

    for (const seed of SEEDS) {
      const p1 = api.generateDigitsPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateDigitsPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2);

      assert.equal(p1.baseNumbers.length, 5);
      for (let i = 1; i < p1.baseNumbers.length; i++) {
        assert.ok(p1.baseNumbers[i] >= p1.baseNumbers[i - 1]);
      }
      const smallCount = p1.baseNumbers.filter((n) => smallSet.has(n)).length;
      const bigCount = p1.baseNumbers.filter((n) => bigSet.has(n)).length;
      assert.equal(smallCount, 4);
      assert.equal(bigCount, 1);

      const minOps = api.findMinDigitsOps(p1.baseNumbers, p1.targetNumber);
      assert.ok(
        minOps >= 2 && minOps <= 3,
        `Expected Digits target ${p1.targetNumber} from [${p1.baseNumbers}] to require 2-3 ops, got ${minOps}`
      );
      assert.equal(p1.par, minOps);
    }
  });

  it('plays and wins Digits end-to-end via DOM events', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('digits', true);
    playCurrentStageViaDOM(env);

    const stageAfter = api.getState().stages[0];
    assert.equal(stageAfter.status, 'cleared');
    assert.ok(stageAfter.turnsSpent >= 1);
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
  });

  it('persists mid-stage tiles in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('digits');
  });
});
