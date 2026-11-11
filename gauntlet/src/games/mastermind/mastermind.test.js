'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
} = require('../../../tests/helpers/dom-harness');

describe('Code (mastermind) — Unit & E2E Playability Tests', () => {
  const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-test-seed-${i + 1}`);

  it('secret code has 4 distinct pegs (no duplicates) from 0..5; deterministic per seed', () => {
    const { api } = createGauntletEnv();

    for (const seed of SEEDS) {
      const p1 = api.generateMastermindPuzzle(api.createPRNG(seed), true);
      const p2 = api.generateMastermindPuzzle(api.createPRNG(seed), true);
      assert.deepEqual(p1, p2);

      assert.equal(p1.secret.length, 4);
      assert.equal(new Set(p1.secret).size, 4, 'Secret code must have 4 distinct pegs');
      for (const peg of p1.secret) {
        assert.ok(peg >= 0 && peg <= 5, `Peg ${peg} out of range 0..5`);
      }
      assert.ok(p1.secret.includes(p1.bonusColorId));
      assert.equal(p1.par, 4);
    }
  });

  it('plays and wins Code end-to-end via DOM events and collects +2⚡ Golden Boost', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('mastermind', true);
    const puzzle = api.getActivePuzzle();
    assert.ok(puzzle.bonusColorId !== -1);

    playCurrentStageViaDOM(env);

    assert.equal(api.getState().stages[0].status, 'cleared');
    assert.equal(api.getState().stages[0].bonusEarned, 2);
    assert.equal(document.getElementById('turnsRemainingValue').textContent, '26');
    assert.ok(!document.getElementById('stageClearedCard').classList.contains('hidden'));
  });

  it('persists mid-stage guess history in stage.savedState across page reload and solves cleanly', () => {
    verifyMidStagePersistenceAndReload('mastermind');
  });

  it('renders explicit semantic count badges (.mm-count-badge.exact / .partial) and row hints', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('mastermind', false);
    const puzzle = api.getActivePuzzle();
    const secret = puzzle.secret; // 4 distinct numbers in [0..5]

    // Verify initial row hint on active row #1
    const activeRowHint = document.querySelector('.mm-row.active-row .mm-row-hint');
    assert.ok(activeRowHint, 'Active row must display a row hint');
    assert.equal(activeRowHint.textContent.trim(), 'Pick 4 pegs');
    assert.ok(!activeRowHint.classList.contains('ready'));

    // Future rows should show "—"
    const allRows = document.querySelectorAll('#mmHistoryList .mm-row');
    const futureRows = allRows.filter((r) => !r.classList.contains('active-row'));
    assert.ok(futureRows.length >= 4);
    for (const r of futureRows) {
      const hint = r.querySelector('.mm-row-hint');
      assert.ok(hint);
      assert.equal(hint.textContent.trim(), '—');
    }

    const swatches = document.querySelectorAll('#mmPaletteRow .mm-swatch');
    const unusedColors = [0, 1, 2, 3, 4, 5].filter((c) => !secret.includes(c));
    assert.equal(unusedColors.length, 2);

    // Guess 1: [unusedColors[0], unusedColors[1], secret[0], secret[1]] -> 0 exact, 2 misplaced
    swatches[unusedColors[0]].click();
    assert.equal(document.querySelector('.mm-row.active-row .mm-row-hint').textContent.trim(), 'Pick 4 pegs');
    swatches[unusedColors[1]].click();
    swatches[secret[0]].click();
    assert.equal(document.querySelector('.mm-row.active-row .mm-row-hint').textContent.trim(), 'Pick 4 pegs');
    swatches[secret[1]].click();

    // Now all 4 slots are filled: hint should be 'Ready to submit' with .ready
    const readyHint = document.querySelector('.mm-row.active-row .mm-row-hint');
    assert.equal(readyHint.textContent.trim(), 'Ready to submit');
    assert.ok(readyHint.classList.contains('ready'));

    // Submit guess 1
    document.getElementById('mmSubmitBtn').click();

    // Row #1 is now a submitted history row
    const historyRows = document.querySelectorAll('#mmHistoryList .mm-row');
    const row1 = historyRows[0];
    const summary1 = row1.querySelector('.mm-feedback-summary');
    assert.ok(summary1, 'Submitted row #1 must have .mm-feedback-summary');
    assert.equal(summary1.getAttribute('aria-label'), '0 exact, 2 misplaced');

    const exactBadge1 = summary1.querySelector('.mm-count-badge.zero');
    assert.ok(exactBadge1, 'Exact badge must have .zero class when exact count is 0');
    assert.ok(!exactBadge1.classList.contains('exact'));
    assert.equal(exactBadge1.querySelector('strong').textContent.trim(), '0');
    assert.equal(exactBadge1.textContent.replace(/\s+/g, ' ').trim(), '0 Exact');
    assert.equal(exactBadge1.getAttribute('title'), '0 in the exact right position');

    const partialBadge1 = summary1.querySelector('.mm-count-badge.partial');
    assert.ok(partialBadge1, 'Misplaced badge must have .partial class when partial count is > 0');
    assert.equal(partialBadge1.querySelector('strong').textContent.trim(), '2');
    assert.equal(partialBadge1.textContent.replace(/\s+/g, ' ').trim(), '2 Misplaced');
    assert.equal(partialBadge1.getAttribute('title'), '2 in the code but wrong position');

    // Guess 2: 2 exact, 2 misplaced -> [secret[0], secret[1], secret[3], secret[2]]
    swatches[secret[0]].click();
    swatches[secret[1]].click();
    swatches[secret[3]].click();
    swatches[secret[2]].click();
    document.getElementById('mmSubmitBtn').click();

    const row2 = document.querySelectorAll('#mmHistoryList .mm-row')[1];
    const summary2 = row2.querySelector('.mm-feedback-summary');
    assert.equal(summary2.getAttribute('aria-label'), '2 exact, 2 misplaced');

    const exactBadge2 = summary2.querySelector('.mm-count-badge.exact');
    assert.ok(exactBadge2);
    assert.equal(exactBadge2.querySelector('strong').textContent.trim(), '2');
    assert.equal(exactBadge2.textContent.replace(/\s+/g, ' ').trim(), '2 Exact');

    const partialBadge2 = summary2.querySelector('.mm-count-badge.partial');
    assert.ok(partialBadge2);
    assert.equal(partialBadge2.querySelector('strong').textContent.trim(), '2');
    assert.equal(partialBadge2.textContent.replace(/\s+/g, ' ').trim(), '2 Misplaced');

    // Guess 3: Winning guess [secret[0], secret[1], secret[2], secret[3]] -> 4 exact, 0 misplaced
    swatches[secret[0]].click();
    swatches[secret[1]].click();
    swatches[secret[2]].click();
    swatches[secret[3]].click();
    document.getElementById('mmSubmitBtn').click();

    const row3 = document.querySelectorAll('#mmHistoryList .mm-row')[2];
    const summary3 = row3.querySelector('.mm-feedback-summary');
    assert.equal(summary3.getAttribute('aria-label'), '4 exact, 0 misplaced');

    const exactBadge3 = summary3.querySelector('.mm-count-badge.exact');
    assert.ok(exactBadge3);
    assert.equal(exactBadge3.querySelector('strong').textContent.trim(), '4');
    assert.equal(exactBadge3.textContent.replace(/\s+/g, ' ').trim(), '4 Exact');

    const partialBadge3 = summary3.querySelector('.mm-count-badge.zero');
    assert.ok(partialBadge3);
    assert.ok(!partialBadge3.classList.contains('partial'));
    assert.equal(partialBadge3.querySelector('strong').textContent.trim(), '0');
    assert.equal(partialBadge3.textContent.replace(/\s+/g, ' ').trim(), '0 Misplaced');

    // Ensure no old 4-dot pips exist anywhere in the widget
    assert.equal(document.querySelectorAll('.mm-pips').length, 0);
    assert.equal(document.querySelectorAll('.mm-pip').length, 0);
  });
});

