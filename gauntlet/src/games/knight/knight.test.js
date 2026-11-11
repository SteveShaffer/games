'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Knight (knight) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-knight-seed-${i + 1}`);

  it('generateKnightPuzzle verifies 3-star tour in 4–6 jumps; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const p1 = api.generateKnightPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateKnightPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2, `Seed ${seed} must produce identical Knight puzzle`);

      assert.equal(p1.starIndices.length, 3, 'Must have exactly 3 stars');
      assert.ok(p1.minJumps >= 4 && p1.minJumps <= 6, `Expected minJumps 4–6, got ${p1.minJumps}`);
      assert.equal(p1.par, Math.ceil(p1.minJumps / 2));
      assert.ok(p1.winningPath.length >= 5, 'Winning path must contain start + jumps');
      assert.equal(p1.winningPath[0], p1.startPos);

      // Verify each step is a legal knight jump avoiding rocks
      for (let s = 1; s < p1.winningPath.length; s++) {
        const fromSq = p1.winningPath[s - 1];
        const toSq = p1.winningPath[s];
        const validNbs = api.getKnightNeighbors(fromSq, p1.rockMask);
        assert.ok(validNbs.includes(toSq), `Step ${fromSq} -> ${toSq} must be a valid Knight jump`);
      }
    }
  });

  it('plays and wins Knight end-to-end via DOM events and collects +2⚡ Golden Boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('knight', true);
    const puzzle = api.getActivePuzzle();
    assert.ok(puzzle.bonusSq !== -1, 'Knight sandbox with boost must designate a bonus square');

    playCurrentStageViaDOM(env);
    assert.equal(api.getState().stages[0].status, 'cleared');
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
    assert.equal(api.getState().stages[0].bonusEarned, 2);
  });

  it('persists mid-stage knight position & star collection in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('knight');
  });
});
