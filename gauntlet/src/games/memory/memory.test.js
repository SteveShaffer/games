'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Pairs (memory) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-test-seed-${i + 1}`);

  it('12 cards consist of exactly 6 matching pairs; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const pBoost = api.generateMemoryPuzzle(api.createPRNG(seed), true);
      const pBoostDup = api.generateMemoryPuzzle(api.createPRNG(seed), true);
      const pNoBoost = api.generateMemoryPuzzle(api.createPRNG(seed), false);

      assert.deepEqual(pBoost, pBoostDup);
      assert.equal(pBoost.shuffledSymbols.length, 12);
      assert.equal(pBoost.par, 7);

      const counts = {};
      for (const sym of pBoost.shuffledSymbols) {
        counts[sym] = (counts[sym] || 0) + 1;
      }
      assert.equal(Object.keys(counts).length, 6);
      for (const sym of Object.keys(counts)) {
        assert.equal(counts[sym], 2, `Symbol ${sym} should appear exactly twice`);
      }
      assert.equal(counts['⚡'], 2, 'Boosted memory board must include ⚡ pair');
      assert.ok(
        !pNoBoost.shuffledSymbols.includes('⚡'),
        'Non-boosted memory board uses 🌙 instead of ⚡'
      );
    }
  });

  it('plays and wins Pairs end-to-end via DOM events and awards +2⚡ Golden Pair boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('memory', true);
    playCurrentStageViaDOM(env);

    const stageAfter = api.getState().stages[0];
    assert.equal(stageAfter.status, 'cleared');
    assert.equal(stageAfter.bonusEarned, 2);
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
  });

  it('persists matched pairs in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('memory');
  });
});
