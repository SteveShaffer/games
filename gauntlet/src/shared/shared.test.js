'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createGauntletEnv,
  playCurrentStageViaDOM
} = require('../../tests/helpers/dom-harness');

describe('Daily Gauntlet — Shared PRNG, Daily Seeding & Full Run Shell Tests', () => {
  const { api } = createGauntletEnv();

  describe('1. Deterministic PRNG (mulberry32 / createPRNG & hashString)', () => {
    it('hashString produces deterministic 32-bit unsigned hashes and distinguishes inputs', () => {
      const h1 = api.hashString('daily-2026-11-02');
      const h2 = api.hashString('daily-2026-11-02');
      const h3 = api.hashString('daily-2026-11-03');

      assert.equal(typeof h1, 'number');
      assert.equal(h1, h2);
      assert.notEqual(h1, h3);
      assert.ok(h1 >= 0 && h1 <= 0xffffffff);
    });

    it('mulberry32 / createPRNG produces identical sequences for the same seed and different sequences for different seeds', () => {
      const rngA = api.mulberry32('seed-alpha-2026');
      const rngB = api.createPRNG('seed-alpha-2026');
      const rngC = api.mulberry32('seed-beta-2026');

      const seqA = Array.from({ length: 20 }, () => rngA());
      const seqB = Array.from({ length: 20 }, () => rngB());
      const seqC = Array.from({ length: 20 }, () => rngC());

      assert.deepEqual(seqA, seqB);
      assert.notDeepEqual(seqA, seqC);
      for (const val of seqA) {
        assert.ok(val >= 0 && val < 1, `Expected PRNG output ${val} to be in [0, 1)`);
      }
    });

    it('seededShuffle is pure, deterministic, and preserves all elements', () => {
      const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const copyBefore = input.slice();

      const out1 = api.seededShuffle(input, api.createPRNG('shuffle-seed-1'));
      const out2 = api.seededShuffle(input, api.createPRNG('shuffle-seed-1'));
      const out3 = api.seededShuffle(input, api.createPRNG('shuffle-seed-2'));

      assert.deepEqual(input, copyBefore, 'seededShuffle must not mutate input array');
      assert.deepEqual(out1, out2, 'Same seed must produce identical shuffle');
      assert.notDeepEqual(out1, out3, 'Different seeds should produce different shuffles');
      assert.deepEqual(out1.slice().sort((a, b) => a - b), input);
    });
  });

  describe('2. Daily Run Selection & Boost Assignment (createFreshRunState)', () => {
    it('normalizes all 10 games in MINI_GAME_SPECS to crisp one-word names', () => {
      const expected = [
        ['wordle', 'Word'],
        ['digits', 'Digits'],
        ['reactor', 'Flip'],
        ['memory', 'Pairs'],
        ['slider', 'Slide'],
        ['waffle', 'Waffle'],
        ['traffic', 'Jam'],
        ['morph', 'Morph'],
        ['mastermind', 'Code'],
        ['iceslide', 'Ice']
      ];
      assert.equal(api.MINI_GAME_SPECS.length, 10);
      assert.deepEqual(
        api.MINI_GAME_SPECS.map((s) => [s.id, s.name]),
        expected
      );
      for (const spec of api.MINI_GAME_SPECS) {
        assert.equal(spec.name, spec.shortName);
        assert.ok(!spec.name.includes(' '), `Expected one-word name, got "${spec.name}"`);
      }
    });

    it('same date key always produces identical 5-stage sequence, stage metadata, and 2 boost stages', () => {
      const runA = api.createFreshRunState('2026-11-02');
      const runB = api.createFreshRunState('2026-11-02');

      assert.deepEqual(runA, runB);
      assert.equal(runA.turnsRemaining, 25);
      assert.equal(runA.stages.length, 5);

      const boostCount = runA.stages.filter((s) => s.hasBoost).length;
      assert.equal(boostCount, api.BOOSTS_PER_GAUNTLET);
      assert.equal(boostCount, 2);
    });

    it('different dates produce varied sequences with zero duplicate game IDs and exactly 2 boosts per run', () => {
      const seenOrders = new Set();

      for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
        const d = new Date(2026, 0, 1 + dayOffset);
        const dateStr = api.formatDateYMD(d);
        const run = api.createFreshRunState(dateStr);

        assert.equal(run.stages.length, 5);
        const ids = run.stages.map((s) => s.id);
        const uniqueIds = new Set(ids);
        assert.equal(uniqueIds.size, 5, `Duplicate stage IDs on ${dateStr}: ${ids.join(',')}`);

        const boostStages = run.stages.filter((s) => s.hasBoost);
        assert.equal(
          boostStages.length,
          2,
          `Expected 2 boost stages on ${dateStr}, got ${boostStages.length}`
        );

        seenOrders.add(ids.join('->'));
      }

      assert.ok(
        seenOrders.size > 40,
        `Expected high daily variety across 60 days, got ${seenOrders.size}`
      );
    });
  });

  describe('3. Gauntlet UI Shell, Full 5-Stage Win & Out-of-Turns Loss E2E', () => {
    it('mounts initial Gauntlet UI with Stage 1/5, 25 turns, valid Par, Turn Health Bar, and 5 stepper nodes', () => {
      const env = createGauntletEnv();
      const { document } = env;

      assert.equal(document.getElementById('turnsRemainingValue').textContent, '25');
      assert.equal(document.getElementById('turnHealthFill').style.width, '100%');
      assert.equal(document.getElementById('currentStagePill').textContent, 'STAGE 1/5');

      const parVal = Number(document.getElementById('stageParValue').textContent);
      assert.ok(parVal >= 2 && parVal <= 7, `Expected valid Par on Stage 1, got ${parVal}`);

      const stepNodes = document.querySelectorAll('#stageStepper .step-node');
      assert.equal(stepNodes.length, 5);
      assert.ok(stepNodes[0].classList.contains('active'));

      const boostBadges = document.querySelectorAll('#stageStepper .step-checkpoint-badge');
      assert.equal(boostBadges.length, 2, 'Exactly 2 stages must display +2⚡ checkpoint badges');

      assert.ok(!document.getElementById('activePuzzleCard').classList.contains('hidden'));
      assert.ok(document.getElementById('stageClearedCard').classList.contains('hidden'));
      assert.ok(document.getElementById('runSummaryCard').classList.contains('hidden'));
    });

    it('completes a full 5-stage Daily Gauntlet run through #stageClearedCard -> #nextStageBtn -> #runSummaryCard (compiled bundle)', async () => {
      const env = createGauntletEnv({ useCompiledBundle: true });
      const { document, api: bundleApi } = env;

      for (let stageIdx = 0; stageIdx < 5; stageIdx++) {
        assert.equal(bundleApi.getState().currentStageIndex, stageIdx);
        assert.equal(
          document.getElementById('currentStagePill').textContent,
          `STAGE ${stageIdx + 1}/5`
        );

        playCurrentStageViaDOM(env);

        if (stageIdx < 4) {
          assert.ok(
            !document.getElementById('stageClearedCard').classList.contains('hidden'),
            `Stage ${stageIdx + 1} should show #stageClearedCard`
          );
          document.getElementById('nextStageBtn').click();
          assert.ok(
            !document.getElementById('activePuzzleCard').classList.contains('hidden'),
            `Clicking #nextStageBtn should mount Stage ${stageIdx + 2}`
          );
        }
      }

      assert.equal(bundleApi.getState().status, 'won');
      assert.ok(!document.getElementById('runSummaryCard').classList.contains('hidden'));
      assert.equal(
        document.getElementById('summaryStatusBanner').textContent,
        '🏆 GAUNTLET COMPLETE'
      );
      assert.equal(document.getElementById('summaryStagesCleared').textContent, '5/5');

      const sharePreview = document.getElementById('shareTextPreview').textContent;
      assert.ok(sharePreview.includes('Daily Gauntlet #'));
      assert.ok(sharePreview.includes('https://games.shaffer.tech/gauntlet'));

      document.getElementById('copyShareBtn').click();
      await Promise.resolve();
      assert.equal(env.getClipboardText(), sharePreview);
    });

    it('transitions to OUT OF TURNS summary screen when turnsRemaining hits 0 on a failed move', () => {
      const env = createGauntletEnv();
      const { document, api: envApi } = env;

      envApi.startSingleGameSandbox('reactor', false);
      const state = envApi.getState();
      state.turnsRemaining = 1;

      const cells = document.querySelectorAll('.reactor-grid .reactor-cell');
      cells[0].click();

      assert.equal(state.turnsRemaining, 0);
      assert.equal(state.status, 'lost');
      assert.ok(document.getElementById('turnHudBox').classList.contains('low-turns'));

      env.flushTimers(600);
      assert.ok(!document.getElementById('runSummaryCard').classList.contains('hidden'));
      assert.equal(document.getElementById('summaryStatusBanner').textContent, 'OUT OF TURNS');
    });
  });
});
