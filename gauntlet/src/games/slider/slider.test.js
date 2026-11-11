'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Slide (slider) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-test-seed-${i + 1}`);

  it('findMinSliderMoves verifies board is solvable in 5–8 BFS slides; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const p1 = api.generateSliderPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateSliderPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2);

      assert.equal(p1.tiles.length, 9);
      assert.deepEqual(
        p1.tiles.slice().sort((a, b) => a - b),
        [0, 1, 2, 3, 4, 5, 6, 7, 8]
      );
      assert.equal(p1.tiles[p1.emptyIdx], 0);

      const bfsMoves = api.findMinSliderMoves(p1.tiles);
      assert.ok(
        bfsMoves >= 5 && bfsMoves <= 8,
        `Expected Slide BFS moves in 5..8 for seed ${seed}, got ${bfsMoves}`
      );
      assert.equal(p1.par, Math.ceil(bfsMoves / 2));
      assert.ok(p1.par >= 3 && p1.par <= 4);
    }
  });

  it('plays and wins Slide end-to-end via DOM events', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('slider', true);
    playCurrentStageViaDOM(env);

    const stageAfter = api.getState().stages[0];
    assert.equal(stageAfter.status, 'cleared');
    assert.ok(stageAfter.turnsSpent >= 1);
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
  });

  it('persists mid-stage tile order in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('slider');
  });
});
