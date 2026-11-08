'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Flip (reactor) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-test-seed-${i + 1}`);

  it('generated 3x3 board is non-zero and solvable in <= 4 taps over F_2; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const p1 = api.generateReactorPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateReactorPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2);

      assert.equal(p1.cells.length, 9);
      assert.ok(
        p1.cells.some((c) => c === false),
        'Scrambled Flip board must not already be all-lit'
      );
      assert.equal(p1.scrambleMoves.length, 4);
      assert.equal(new Set(p1.scrambleMoves).size, 4, '4 scramble toggles must be distinct');
      assert.equal(p1.par, 4);

      const testBoard = p1.cells.slice();
      for (const moveIdx of p1.scrambleMoves) {
        api.applyReactorToggle(testBoard, moveIdx);
      }
      assert.ok(testBoard.every(Boolean), 'Applying the 4 scramble moves must light all 9 cells');
    }
  });

  it('plays and wins Flip end-to-end via DOM events and collects +2⚡ Golden Boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('reactor', true);
    const puzzle = api.getActivePuzzle();
    const cells = document.querySelectorAll('.reactor-grid .reactor-cell');
    cells[puzzle.bonusCellIdx].click();

    assert.equal(api.getState().stages[0].bonusEarned, 2);
    assert.equal(document.getElementById('turnsRemainingValue').textContent, '26');

    playCurrentStageViaDOM(env);
    assert.equal(api.getState().stages[0].status, 'cleared');
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
  });

  it('persists mid-stage cell state in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('reactor');
  });
});
