'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Slide (slider) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-test-seed-${i + 1}`);

  it('findMinSliderMoves verifies board is solvable in 5–8 BFS slides; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const p1 = api.generateSliderPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateSliderPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2);

      assert.equal(p1.tiles.length, 9);
      assert.deepEqual(
        p1.tiles.slice().sort((a, b) => a - b),
        [0, 1, 2, 3, 4, 5, 6, 7, 8]
      );
      assert.equal(p1.tiles[p1.emptyIdx], 0);

      const bfsMoves = api.findMinSliderMoves(p1.tiles);
      assert.ok(
        bfsMoves >= 5 && bfsMoves <= 8,
        `Expected Slide BFS moves in 5..8 for seed ${seed}, got ${bfsMoves}`
      );
      assert.equal(p1.par, Math.ceil(bfsMoves / 2));
      assert.ok(p1.par >= 3 && p1.par <= 4);
    }
  });

  it('plays and wins Slide end-to-end via DOM events', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('slider', true);
    playCurrentStageViaDOM(env);

    const stageAfter = api.getState().stages[0];
    assert.equal(stageAfter.status, 'cleared');
    assert.ok(stageAfter.turnsSpent >= 1);
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
  });

  it('renders directional slide arrows and classes on movable tiles based on empty space position', () => {
    const { getSlideDirectionInfo } = require('./game');

    // Unit checks for getSlideDirectionInfo
    // Center is 4 (row 1, col 1)
    assert.deepEqual(getSlideDirectionInfo(7, 4), { arrow: '↑', dirClass: 'slide-up', label: 'up' });
    assert.deepEqual(getSlideDirectionInfo(1, 4), { arrow: '↓', dirClass: 'slide-down', label: 'down' });
    assert.deepEqual(getSlideDirectionInfo(5, 4), { arrow: '←', dirClass: 'slide-left', label: 'left' });
    assert.deepEqual(getSlideDirectionInfo(3, 4), { arrow: '→', dirClass: 'slide-right', label: 'right' });
    assert.equal(getSlideDirectionInfo(0, 4), null);
    assert.equal(getSlideDirectionInfo(4, 4), null);

    // DOM rendering checks
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('slider', false);

    const feedback = document.getElementById('stageFeedbackBar');
    assert.equal(
      feedback.textContent,
      'Tap any arrow tile (↑ ↓ ← →) to slide it into the empty space.'
    );

    const stage = api.getState().stages[0];
    const puzzle = api.getActivePuzzle();
    const initialTiles = puzzle.tiles;
    const initialEmpty = puzzle.emptyIdx;
    assert.equal(initialTiles[initialEmpty], 0);

    const tileButtons = document.querySelectorAll('#sliderGridBox .slider-tile');
    assert.equal(tileButtons.length, 9);

    const neighbors = api.getSliderNeighbors(initialEmpty);

    tileButtons.forEach((btn, idx) => {
      const val = initialTiles[idx];
      if (idx === initialEmpty) {
        assert.ok(btn.classList.contains('empty'));
        assert.equal(btn.disabled, true);
        assert.equal(btn.querySelector('.slider-dir-arrow'), null);
      } else if (neighbors.includes(idx)) {
        const expectedDir = getSlideDirectionInfo(idx, initialEmpty);
        assert.ok(expectedDir, `Neighbor at ${idx} must have slide direction info`);
        assert.ok(btn.classList.contains('movable'), `Tile at ${idx} must be marked movable`);
        assert.ok(
          btn.classList.contains(expectedDir.dirClass),
          `Tile at ${idx} must have class ${expectedDir.dirClass}`
        );
        assert.equal(btn.disabled, false);
        assert.equal(btn.getAttribute('aria-label'), `Tile ${val}, slide ${expectedDir.label}`);

        const arrowEl = btn.querySelector('.slider-dir-arrow');
        assert.ok(arrowEl, `Tile at ${idx} must render .slider-dir-arrow`);
        assert.equal(arrowEl.textContent, expectedDir.arrow);
        assert.equal(arrowEl.getAttribute('aria-hidden'), 'true');
      } else {
        assert.ok(btn.classList.contains('non-movable'), `Tile at ${idx} must be marked non-movable`);
        assert.ok(!btn.classList.contains('movable'), `Tile at ${idx} must not have movable class`);
        assert.equal(btn.disabled, true);
        assert.equal(btn.getAttribute('aria-label'), `Tile ${val}`);
        assert.equal(btn.querySelector('.slider-dir-arrow'), null);
      }
    });

    // Tap the first movable neighbor and verify arrows update dynamically
    const moveIdx = neighbors[0];
    tileButtons[moveIdx].click();

    const newEmpty = moveIdx;
    const updatedTiles = stage.savedState.tiles;
    assert.equal(updatedTiles[newEmpty], 0);

    const newNeighbors = api.getSliderNeighbors(newEmpty);
    const updatedButtons = document.querySelectorAll('#sliderGridBox .slider-tile');

    newNeighbors.forEach((nbIdx) => {
      const nbVal = updatedTiles[nbIdx];
      const nbBtn = updatedButtons[nbIdx];
      const dir = getSlideDirectionInfo(nbIdx, newEmpty);
      assert.ok(nbBtn.classList.contains('movable'));
      assert.ok(nbBtn.classList.contains(dir.dirClass));
      assert.equal(nbBtn.disabled, false);
      assert.equal(nbBtn.getAttribute('aria-label'), `Tile ${nbVal}, slide ${dir.label}`);
      const arrow = nbBtn.querySelector('.slider-dir-arrow');
      assert.ok(arrow);
      assert.equal(arrow.textContent, dir.arrow);
    });
  });

  it('persists mid-stage tile order in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('slider');
  });
});
