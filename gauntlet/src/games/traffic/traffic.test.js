'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Jam (traffic) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-test-seed-${i + 1}`);

  it('solveTrafficBFS verifies generated & fallback boards are solvable in 6–10 moves', () => {
    const { api } = createGauntletEnv();

    for (let i = 0; i < api.TRAFFIC_PUZZLES.length; i++) {
      const res = api.solveTrafficBFS(api.TRAFFIC_PUZZLES[i]);
      assert.ok(res.solvable, `Fallback TRAFFIC_PUZZLES[${i}] must be solvable`);
      assert.ok(
        res.minMoves >= 6 && res.minMoves <= 10,
        `Fallback TRAFFIC_PUZZLES[${i}] minMoves=${res.minMoves} out of range 6..10`
      );
    }

    for (const seed of SEEDS) {
      const p1 = api.generateTrafficPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateTrafficPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2);

      const hero = p1.template.find((c) => c.id === 'X');
      assert.ok(hero);
      assert.equal(hero.r, 2);
      assert.equal(hero.dir, 'H');
      assert.equal(hero.len, 2);

      const occupied = new Set();
      for (const car of p1.template) {
        for (let k = 0; k < car.len; k++) {
          const r = car.dir === 'V' ? car.r + k : car.r;
          const c = car.dir === 'H' ? car.c + k : car.c;
          assert.ok(r >= 0 && r < 6 && c >= 0 && c < 6);
          const cellIdx = r * 6 + c;
          assert.ok(!occupied.has(cellIdx), `Overlapping vehicle cell ${cellIdx} on seed ${seed}`);
          occupied.add(cellIdx);
        }
      }

      const bfs = api.solveTrafficBFS(p1.template);
      assert.ok(bfs.solvable, `Generated Traffic board for ${seed} must be solvable`);
      assert.ok(
        bfs.minMoves >= 6 && bfs.minMoves <= 10,
        `Expected Traffic minMoves in 6..10 for ${seed}, got ${bfs.minMoves}`
      );
      assert.equal(p1.par, Math.ceil(p1.minMoves / 2));
      assert.ok(p1.par >= 3 && p1.par <= 5);
    }
  });

  it('plays and wins Jam end-to-end via DOM events', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('traffic', true);
    playCurrentStageViaDOM(env);

    const stageAfter = api.getState().stages[0];
    assert.equal(stageAfter.status, 'cleared');
    assert.ok(stageAfter.turnsSpent >= 1);
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
  });

  it('persists mid-stage vehicle positions in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('traffic');
  });
});
