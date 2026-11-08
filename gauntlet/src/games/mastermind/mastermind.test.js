'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Code (mastermind) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-test-seed-${i + 1}`);

  it('secret code has 4 distinct pegs (no duplicates) from 0..5; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const p1 = api.generateMastermindPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateMastermindPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2);

      assert.equal(p1.secret.length, 4);
      assert.equal(new Set(p1.secret).size, 4, 'Secret code must have 4 distinct pegs');
      for (const peg of p1.secret) {
        assert.ok(peg >= 0 && peg <= 5, `Peg ${peg} out of range 0..5`);
      }
      assert.ok(p1.secret.includes(p1.bonusColorId));
      assert.equal(p1.par, 4);
    }
  });

  it('plays and wins Code end-to-end via DOM events and collects +2⚡ Golden Boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('mastermind', true);
    const puzzle = api.getActivePuzzle();
    assert.ok(puzzle.bonusColorId !== -1);

    playCurrentStageViaDOM(env);

    assert.equal(api.getState().stages[0].status, 'cleared');
    assert.equal(api.getState().stages[0].bonusEarned, 2);
    assert.equal(document.getElementById('turnsRemainingValue').textContent, '26');
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
  });

  it('persists mid-stage guess history in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('mastermind');
  });
});
