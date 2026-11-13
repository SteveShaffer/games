'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Cube (cube) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-cube-seed-${i + 1}`);

  it('generateCubePuzzle scrambles in 4 moves and solves in <= 4 moves; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const p1 = api.generateCubePuzzle(api.createPRNG(seed), true);
      const p2 = api.generateCubePuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2, `Seed ${seed} must produce identical Cube puzzle`);

      assert.equal(p1.scrambleMoves.length, 4, 'Must scramble with exactly 4 moves');
      assert.equal(p1.state.length, 24, 'Cube state must have 24 stickers');
      assert.ok(p1.distance >= 1 && p1.distance <= 4, `Expected distance 1–4, got ${p1.distance}`);
      assert.equal(p1.par, Math.max(1, Math.ceil(p1.distance / 2)));
      assert.ok(p1.solution.length === p1.distance, `Solution length must match distance`);

      // Verify that applying the BFS solution solves the scrambled state
      let s = p1.state.slice();
      for (const m of p1.solution) {
        s = api.applyCubeMove(s, m);
      }
      assert.ok(api.isCubeSolved(s), `Applying solution must solve the cube for seed ${seed}`);
    }
  });

  it('plays and wins Cube end-to-end via DOM events and collects +2⚡ Golden Boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('cube', true);
    const puzzle = api.getActivePuzzle();
    assert.ok(puzzle, 'Cube sandbox puzzle must be active');

    playCurrentStageViaDOM(env);
    assert.equal(api.getState().stages[0].status, 'cleared');
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
    assert.equal(api.getState().stages[0].bonusEarned, 2);
  });

  it('persists mid-stage cube state & move count in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('cube');
  });

  it('renders on-cube tap arrows on every face and highlights arrows when a sticker is tapped', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('cube', false);

    // Verify 3D scene and on-cube tap arrows are rendered
    const scene = document.querySelector('.cube-scene');
    assert.ok(scene, '3D cube scene must exist');

    const tapArrows = document.querySelectorAll('.cube-tap-arrow');
    // Each of the 6 faces has 4 row arrows + 4 col arrows + 2 center rotate buttons = 10 buttons per face x 6 = 60
    assert.equal(tapArrows.length, 60, 'Expected 60 direct tap arrows across all 6 faces');

    // Tap a sticker on the Front face (face 2, top-left sticker idx 8)
    const sticker = document.querySelector('.cube-sticker[data-index="8"]');
    assert.ok(sticker, 'Sticker index 8 must exist');
    sticker.click();

    // Verify sticker gets selected-sticker class and pulse arrows are activated
    assert.ok(sticker.classList.contains('selected-sticker'));
    const pulsing = document.querySelectorAll('.cube-tap-arrow.pulse-arrow');
    assert.ok(pulsing.length >= 2, 'Expected pulsing arrow indicators for the selected sticker');

    // Clicking an arrow spins the cube
    const initialTurnText = document.getElementById('turnsRemainingValue').textContent;
    pulsing[0].click();
    assert.ok(document.querySelector('.cube-wrapper'), 'Cube must remain mounted after spin');
  });
});
