'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Gems (gems) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-gems-seed-${i + 1}`);

  it('generateGemsPuzzle generates solvable 4x4 board in 3–5 moves; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const p1 = api.generateGemsPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateGemsPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2, `Seed ${seed} must produce identical Gems puzzle`);

      assert.equal(p1.board.length, 16, 'Board must have 16 tiles');
      assert.equal(api.findGemsMatches(p1.board).size, 0, 'Initial board must have 0 matches');
      assert.ok(api.getLegalGemsSwaps(p1.board).length >= 2, 'Initial board must have at least 2 legal swaps');
      assert.ok(p1.minMoves >= 3 && p1.minMoves <= 5, `Expected minMoves 3–5, got ${p1.minMoves}`);

      // Verify the solution clears the board completely down to 0 gems
      let sim = p1.board.slice();
      for (const step of p1.solution) {
        const t = sim[step.from];
        sim[step.from] = sim[step.to];
        sim[step.to] = t;
        const res = api.resolveGemsMatchesAndCascades(sim);
        sim = res.board;
      }
      assert.ok(
        sim.every((x) => x === null || x === undefined),
        'Solution must clear all gems from the board'
      );
    }
  });

  it('plays and wins Gems end-to-end via DOM events and collects +2⚡ Golden Boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('gems', true);
    const puzzle = api.getActivePuzzle();
    assert.ok(puzzle.bonusIndex !== -1, 'Gems sandbox with boost must designate a bonus gem');

    playCurrentStageViaDOM(env);
    assert.equal(api.getState().stages[0].status, 'cleared');
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
    assert.equal(api.getState().stages[0].bonusEarned, 2);
  });

  it('supports undoing a swap without breaking state', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('gems', false);
    const puzzle = api.getActivePuzzle();
    const initialBoard = puzzle.board.slice();

    const undoBtn = document.getElementById('gemsUndoBtn');
    assert.ok(undoBtn.disabled, 'Undo button should be disabled before any move');

    // Make the first legal swap from solution
    const step = puzzle.solution[0];
    const cells = document.querySelectorAll('#gemsBoardGrid .gems-cell');
    cells[step.from].click();
    cells[step.to].click();

    assert.ok(!undoBtn.disabled, 'Undo button should be enabled after move');

    // Click Undo
    undoBtn.click();
    assert.ok(undoBtn.disabled, 'Undo button should be disabled after undoing the only move');

    // Board should be restored to initial layout
    const restoredCells = document.querySelectorAll('#gemsBoardGrid .gems-cell');
    const restoredVals = Array.from(restoredCells).map((c) => {
      if (c.classList.contains('empty')) return null;
      if (c.classList.contains('gem-ruby')) return 0;
      if (c.classList.contains('gem-sapphire')) return 1;
      if (c.classList.contains('gem-emerald')) return 2;
      if (c.classList.contains('gem-amber')) return 3;
      return null;
    });
    assert.deepEqual(restoredVals, initialBoard, 'Board must be restored to starting state after undo');
  });

  it('persists mid-stage board and half-swaps in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('gems');
  });
});
