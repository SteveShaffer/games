'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Waffle (waffle) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-test-seed-${i + 1}`);

  it('grid intersections are valid 5-letter words and scrambled tiles are an exact permutation', () => {
    const { api } = createGauntletEnv();
    const poolSet = new Set(api.WAFFLE_WORD_POOL);

    for (const seed of SEEDS) {
      const p1 = api.generateWafflePuzzle(api.createPRNG(seed), true);
      const p2 = api.generateWafflePuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2);

      const { h0, h2, h4, v0, v2, v4 } = p1.chosenGrid;
      const sixWords = [h0, h2, h4, v0, v2, v4];
      assert.equal(new Set(sixWords).size, 6, 'All 6 Waffle words must be distinct');
      for (const w of sixWords) {
        assert.equal(w.length, 5);
        assert.ok(poolSet.has(w), `Waffle word ${w} must be in WAFFLE_WORD_POOL`);
        assert.ok(api.WORDLE_VALID_SET.has(w), `Waffle word ${w} must be in WORDLE_VALID_SET`);
      }

      assert.equal(h0[0], v0[0]);
      assert.equal(h0[2], v2[0]);
      assert.equal(h0[4], v4[0]);
      assert.equal(h2[0], v0[2]);
      assert.equal(h2[2], v2[2]);
      assert.equal(h2[4], v4[2]);
      assert.equal(h4[0], v0[4]);
      assert.equal(h4[2], v2[4]);
      assert.equal(h4[4], v4[4]);

      for (const holeIdx of p1.holes) {
        assert.equal(p1.solution[holeIdx], null);
        assert.equal(p1.board[holeIdx], null);
      }
      const solLetters = p1.solution.filter(Boolean).slice().sort();
      const brdLetters = p1.board.filter(Boolean).slice().sort();
      assert.equal(solLetters.length, 21);
      assert.deepEqual(brdLetters, solLetters);
      assert.notDeepEqual(p1.board, p1.solution, 'Scrambled Waffle board must not already be solved');
      assert.equal(p1.par, 3);
    }
  });

  it('plays and wins Waffle end-to-end via DOM events and collects +2⚡ Golden Boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('waffle', true);
    playCurrentStageViaDOM(env);

    const stageAfter = api.getState().stages[0];
    assert.equal(stageAfter.status, 'cleared');
    assert.equal(stageAfter.bonusEarned, 2);
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
  });

  it('persists mid-stage board swaps in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('waffle');
  });
});
