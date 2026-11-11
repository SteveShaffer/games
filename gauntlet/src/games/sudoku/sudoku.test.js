'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Sudoku (sudoku) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-sudoku-seed-${i + 1}`);

  it('generateSudokuPuzzle generates valid 4x4 Latin square with 6 empty cells; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const p1 = api.generateSudokuPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateSudokuPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2, `Seed ${seed} must produce identical Sudoku puzzle`);

      assert.equal(p1.solution.length, 16);
      assert.equal(p1.emptyList.length, 6);
      assert.equal(p1.initialBoard.filter((v) => v === 0).length, 6);
      assert.equal(p1.par, 3);
      assert.ok(p1.bonusCellIdx !== -1, 'hasBoost should assign a bonus cell');

      // Verify valid 4x4 Sudoku solution: rows, columns, 2x2 boxes all have digits 1..4
      for (let r = 0; r < 4; r++) {
        const row = [0, 1, 2, 3].map((c) => p1.solution[r * 4 + c]);
        assert.deepEqual(row.slice().sort((a, b) => a - b), [1, 2, 3, 4]);
      }
      for (let c = 0; c < 4; c++) {
        const col = [0, 1, 2, 3].map((r) => p1.solution[r * 4 + c]);
        assert.deepEqual(col.slice().sort((a, b) => a - b), [1, 2, 3, 4]);
      }
      for (let br = 0; br < 2; br++) {
        for (let bc = 0; bc < 2; bc++) {
          const box = [];
          for (let dr = 0; dr < 2; dr++) {
            for (let dc = 0; dc < 2; dc++) {
              box.push(p1.solution[(br * 2 + dr) * 4 + (bc * 2 + dc)]);
            }
          }
          assert.deepEqual(box.slice().sort((a, b) => a - b), [1, 2, 3, 4]);
        }
      }
    }
  });

  it('plays and wins Sudoku end-to-end via DOM events and collects +2⚡ Golden Boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('sudoku', true);
    const puzzle = api.getActivePuzzle();
    assert.ok(puzzle.bonusCellIdx !== -1, 'Sudoku sandbox with boost must designate a bonus cell');

    playCurrentStageViaDOM(env);
    assert.equal(api.getState().stages[0].status, 'cleared');
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
    assert.equal(api.getState().stages[0].bonusEarned, 2);
  });

  it('persists mid-stage board placements in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('sudoku');
  });
});
