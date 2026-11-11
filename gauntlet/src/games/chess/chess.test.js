'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Chess (chess) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-chess-seed-${i + 1}`);

  it('generateChessPuzzle verifies royal capture in 2–3 moves; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const p1 = api.generateChessPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateChessPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2, `Seed ${seed} must produce identical Chess puzzle`);

      assert.equal(p1.initialWhite.length, 2, 'Must have exactly 2 White pieces');
      assert.equal(p1.initialBlack.length, 3, 'Must have exactly 3 Black pieces (King + 2 guards)');
      assert.ok(p1.minMoves >= 2 && p1.minMoves <= 3, `Expected minMoves 2–3, got ${p1.minMoves}`);
      assert.equal(p1.par, p1.minMoves);

      const bfs = api.solveChessBFS(p1.initialWhite, p1.initialBlack);
      assert.ok(bfs.solvable, 'Puzzle must be solvable via BFS');
      assert.equal(bfs.minMoves, p1.minMoves);
      assert.ok(bfs.moves.length >= 2, 'Must have winning move list');
    }
  });

  it('plays and wins Chess end-to-end via DOM events and collects +2⚡ Golden Boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('chess', true);
    const puzzle = api.getActivePuzzle();
    assert.ok(puzzle.bonusSq !== -1, 'Chess sandbox with boost must designate a bonus square');

    playCurrentStageViaDOM(env);
    assert.equal(api.getState().stages[0].status, 'cleared');
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
  });

  it('persists mid-stage piece positions in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('chess');
  });
});
