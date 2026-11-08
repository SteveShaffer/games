'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Word (wordle) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-test-seed-${i + 1}`);

  it('target is always a 5-letter word in WORDLE_TARGETS & WORDLE_VALID_SET; deterministic per seed', () => {
    const { api } = createGauntletEnv();
    assert.equal(api.WORDLE_TARGETS.length, 2300);
    assert.ok(api.WORDLE_VALID_SET.size >= 14700);

    for (const seed of SEEDS) {
      const p1 = api.generateWordlePuzzle(api.createPRNG(seed), true);
      const p2 = api.generateWordlePuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2);
      assert.equal(p1.targetWord.length, 5);
      assert.ok(api.WORDLE_TARGETS.includes(p1.targetWord));
      assert.ok(api.WORDLE_VALID_SET.has(p1.targetWord));
      assert.equal(p1.par, 4);
      assert.ok(p1.bonusLetter && /^[A-Z]$/.test(p1.bonusLetter));
      assert.ok(!p1.targetWord.includes(p1.bonusLetter));
    }
  });

  it('plays and wins Word end-to-end via DOM events and collects +2⚡ Golden Boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('wordle', true);
    const puzzle = api.getActivePuzzle();
    assert.ok(puzzle.bonusLetter);

    let boostGuess = null;
    for (const w of api.WORDLE_VALID_SET) {
      if (w !== puzzle.targetWord && w.includes(puzzle.bonusLetter)) {
        boostGuess = w;
        break;
      }
    }
    assert.ok(boostGuess, 'Must find a valid word containing bonusLetter');
    for (const ch of boostGuess) env.dispatchKey(ch);
    env.dispatchKey('Enter');

    assert.equal(api.getState().stages[0].bonusEarned, 2);
    assert.equal(document.getElementById('turnsRemainingValue').textContent, '26');

    playCurrentStageViaDOM(env);
    assert.equal(api.getState().stages[0].status, 'cleared');
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
  });

  it('persists mid-stage guesses in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('wordle');
  });
});
