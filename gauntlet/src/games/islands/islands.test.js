'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Bridges (islands) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-islands-seed-${i + 1}`);

  it('generateIslandsPuzzle generates verified Hashi network with 6–8 islands; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const p1 = api.generateIslandsPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateIslandsPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2, `Seed ${seed} must produce identical Bridges puzzle`);

      assert.ok(
        p1.islands.length >= 6 && p1.islands.length <= 8,
        `Expected 6–8 islands, got ${p1.islands.length}`
      );
      assert.ok(p1.edges.length >= p1.islands.length - 1, 'Edge count must support connected network');
      assert.ok(
        p1.totalBridgeTaps >= 6 && p1.totalBridgeTaps <= 10,
        `Expected 6–10 total bridge taps, got ${p1.totalBridgeTaps}`
      );
      assert.equal(p1.par, Math.ceil(p1.totalBridgeTaps / 2));
      assert.ok(p1.bonusIslandId !== -1, 'hasBoost must designate a bonus island');
    }
  });

  it('plays and wins Bridges end-to-end via DOM events and collects +2⚡ Golden Boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('islands', true);
    const puzzle = api.getActivePuzzle();
    assert.ok(puzzle.bonusIslandId !== -1, 'Bridges sandbox with boost must designate a bonus island');

    playCurrentStageViaDOM(env);
    assert.equal(api.getState().stages[0].status, 'cleared');
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
    assert.equal(api.getState().stages[0].bonusEarned, 2);
  });

  it('persists mid-stage bridge taps in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('islands');
  });
});
