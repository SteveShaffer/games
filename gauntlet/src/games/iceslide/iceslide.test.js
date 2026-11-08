'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Ice (iceslide) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-test-seed-${i + 1}`);

  it('solveIceRinkBFS verifies goal is reachable in 5–7 slides; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const p1 = api.generateIceSlidePuzzle(api.createPRNG(seed), true);
      const p2 = api.generateIceSlidePuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2);

      const rockCount = p1.rockWalls.filter(Boolean).length;
      assert.equal(rockCount, 6, 'Ice rink must have 6 rock walls');
      assert.equal(p1.crackedList.length, 2, 'Ice rink must have 2 cracked ice tiles');
      assert.notEqual(p1.startIdx, p1.goalIdx);
      assert.ok(!p1.rockWalls[p1.startIdx]);
      assert.ok(!p1.rockWalls[p1.goalIdx]);
      assert.ok(!p1.crackedList.includes(p1.goalIdx));

      const bfs = api.solveIceRinkBFS(p1.rockWalls, p1.crackedList, p1.startIdx, p1.goalIdx);
      assert.ok(bfs.solvable, `Ice rink for ${seed} must be solvable`);
      assert.ok(
        bfs.minSlides >= 5 && bfs.minSlides <= 7,
        `Expected Ice goal reachable in 5..7 slides for ${seed}, got ${bfs.minSlides}`
      );
      assert.equal(bfs.moves.length, bfs.minSlides);
      assert.equal(p1.par, Math.ceil(bfs.minSlides / 2));
      assert.ok(p1.par >= 3 && p1.par <= 4);
    }
  });

  it('plays and wins Ice end-to-end via DOM events', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('iceslide', true);
    playCurrentStageViaDOM(env);

    const stageAfter = api.getState().stages[0];
    assert.equal(stageAfter.status, 'cleared');
    assert.ok(stageAfter.turnsSpent >= 1);
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
  });

  it('persists mid-stage player & frozen cracked-ice state in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('iceslide');
  });
});
