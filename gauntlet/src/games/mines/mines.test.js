'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Mines (mines) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-mines-seed-${i + 1}`);

  it('generateMinesPuzzle generates 4-mine board with deterministic clues; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const p1 = api.generateMinesPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateMinesPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2, `Seed ${seed} must produce identical Mines puzzle`);

      assert.equal(p1.mineIndices.length, 4, 'Must have exactly 4 hidden mines');
      assert.equal(p1.clues.length, 16, 'Must provide 16 clue numbers');
      assert.equal(p1.par, 2, 'Par must be 2 turns (every 2 flags = 1 turn)');
      assert.ok(p1.bonusMineIdx !== -1, 'hasBoost must designate a bonus mine');
      assert.ok(p1.mineIndices.includes(p1.bonusMineIdx));

      // Check clues calculation matches mine positions
      for (const mIdx of p1.mineIndices) {
        assert.equal(p1.clues[mIdx], -1, 'Mine cells should have clue -1');
      }
    }
  });

  it('plays and wins Mines end-to-end via DOM events and collects +2⚡ Golden Boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('mines', true);
    const puzzle = api.getActivePuzzle();
    assert.ok(puzzle.bonusMineIdx !== -1, 'Mines sandbox with boost must designate a bonus mine');

    playCurrentStageViaDOM(env);
    assert.equal(api.getState().stages[0].status, 'cleared');
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
    assert.equal(api.getState().stages[0].bonusEarned, 2);
  });

  it('persists mid-stage mine flags in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('mines');
  });
});
