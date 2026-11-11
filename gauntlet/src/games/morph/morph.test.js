'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Morph (morph) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-test-seed-${i + 1}`);

  it('start and target words are 4-letter words reachable in 3–4 BFS steps; deterministic per seed', () => {
    const { api } = createGauntletEnv();
    const morphWordSet = new Set(api.MORPH_WORDS);

    for (const seed of SEEDS) {
      const p1 = api.generateMorphPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateMorphPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2);

      assert.equal(p1.startWord.length, 4);
      assert.equal(p1.goalWord.length, 4);
      assert.notEqual(p1.startWord, p1.goalWord);
      assert.ok(morphWordSet.has(p1.startWord));
      assert.ok(morphWordSet.has(p1.goalWord));

      const steps = p1.shortestPath.length - 1;
      assert.ok(steps === 3 || steps === 4, `Expected Morph shortest path of 3-4 steps, got ${steps}`);
      assert.equal(p1.par, steps);
      assert.equal(p1.shortestPath[0], p1.startWord);
      assert.equal(p1.shortestPath[p1.shortestPath.length - 1], p1.goalWord);

      for (let i = 1; i < p1.shortestPath.length; i++) {
        const prev = p1.shortestPath[i - 1];
        const curr = p1.shortestPath[i];
        assert.ok(morphWordSet.has(curr));
        let diffs = 0;
        for (let c = 0; c < 4; c++) {
          if (prev[c] !== curr[c]) diffs++;
        }
        assert.equal(diffs, 1, `Expected 1-letter step between ${prev} and ${curr}`);
      }
    }
  });

  it('plays and wins Morph end-to-end via DOM events and collects +2⚡ Golden Boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('morph', true);
    playCurrentStageViaDOM(env);

    const stageAfter = api.getState().stages[0];
    assert.equal(stageAfter.status, 'cleared');
    assert.equal(stageAfter.bonusEarned, 2);
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
  });

  it('persists mid-stage word chain in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('morph');
  });
});
