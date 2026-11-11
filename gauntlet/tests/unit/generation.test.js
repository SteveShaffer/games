'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createGauntletEnv } = require('../helpers/dom-harness');

describe('Daily Gauntlet — Deterministic Generation & Solvability Unit Tests', () => {
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

      assert.ok(seenOrders.size > 40, `Expected high daily variety across 60 days, got ${seenOrders.size}`);
    });
  });

  describe('3. Per-Game Deterministic Generation & Guaranteed Solvability (All 10 Games)', () => {
    const SEEDS = Array.from({ length: 25 }, (_, i) => `unit-test-seed-${i + 1}`);

    it('Word (wordle): target is always a 5-letter word in WORDLE_TARGETS & WORDLE_VALID_SET; deterministic per seed', () => {
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

    it('Digits (digits): findMinDigitsOps verifies target is reachable in 2–3 steps; deterministic per seed', () => {
      const smallSet = new Set([2, 3, 4, 5, 6, 7, 8, 9]);
      const bigSet = new Set([10, 12, 15, 20, 25]);

      for (const seed of SEEDS) {
        const p1 = api.generateDigitsPuzzle(api.createPRNG(seed), true);
        const p2 = api.generateDigitsPuzzle(api.createPRNG(seed), true);
        assert.deepEqual(p1, p2);

        assert.equal(p1.baseNumbers.length, 5);
        // Sorted ascending
        for (let i = 1; i < p1.baseNumbers.length; i++) {
          assert.ok(p1.baseNumbers[i] >= p1.baseNumbers[i - 1]);
        }
        const smallCount = p1.baseNumbers.filter((n) => smallSet.has(n)).length;
        const bigCount = p1.baseNumbers.filter((n) => bigSet.has(n)).length;
        assert.equal(smallCount, 4);
        assert.equal(bigCount, 1);

        const minOps = api.findMinDigitsOps(p1.baseNumbers, p1.targetNumber);
        assert.ok(
          minOps >= 2 && minOps <= 3,
          `Expected Digits target ${p1.targetNumber} from [${p1.baseNumbers}] to require 2-3 ops, got ${minOps}`
        );
        assert.equal(p1.par, minOps);
      }
    });

    it('Flip (reactor): generated 3x3 board is non-zero and solvable in <= 4 taps over F_2; deterministic per seed', () => {
      for (const seed of SEEDS) {
        const p1 = api.generateReactorPuzzle(api.createPRNG(seed), true);
        const p2 = api.generateReactorPuzzle(api.createPRNG(seed), true);
        assert.deepEqual(p1, p2);

        assert.equal(p1.cells.length, 9);
        assert.ok(
          p1.cells.some((c) => c === false),
          'Scrambled Flip board must not already be all-lit'
        );
        assert.equal(p1.scrambleMoves.length, 4);
        assert.equal(new Set(p1.scrambleMoves).size, 4, '4 scramble toggles must be distinct');
        assert.equal(p1.par, 4);

        // Verify toggling the 4 scramble moves solves the board over F_2
        const testBoard = p1.cells.slice();
        for (const moveIdx of p1.scrambleMoves) {
          api.applyReactorToggle(testBoard, moveIdx);
        }
        assert.ok(testBoard.every(Boolean), 'Applying the 4 scramble moves must light all 9 cells');
      }
    });

    it('Pairs (memory): 12 cards consist of exactly 6 matching pairs; deterministic per seed', () => {
      for (const seed of SEEDS) {
        const pBoost = api.generateMemoryPuzzle(api.createPRNG(seed), true);
        const pBoostDup = api.generateMemoryPuzzle(api.createPRNG(seed), true);
        const pNoBoost = api.generateMemoryPuzzle(api.createPRNG(seed), false);

        assert.deepEqual(pBoost, pBoostDup);
        assert.equal(pBoost.shuffledSymbols.length, 12);
        assert.equal(pBoost.par, 7);

        const counts = {};
        for (const sym of pBoost.shuffledSymbols) {
          counts[sym] = (counts[sym] || 0) + 1;
        }
        assert.equal(Object.keys(counts).length, 6);
        for (const sym of Object.keys(counts)) {
          assert.equal(counts[sym], 2, `Symbol ${sym} should appear exactly twice`);
        }
        assert.equal(counts['⚡'], 2, 'Boosted memory board must include ⚡ pair');
        assert.ok(!pNoBoost.shuffledSymbols.includes('⚡'), 'Non-boosted memory board uses 🌙 instead of ⚡');
      }
    });

    it('Slide (slider): findMinSliderMoves verifies board is solvable in 5–8 BFS slides; deterministic per seed', () => {
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

    it('Waffle (waffle): grid intersections are valid 5-letter words and scrambled tiles are an exact permutation', () => {
      const poolSet = new Set(api.WAFFLE_WORD_POOL);
      for (const seed of SEEDS) {
        const p1 = api.generateWafflePuzzle(api.createPRNG(seed), true);
        const p2 = api.generateWafflePuzzle(api.createPRNG(seed), true);
        assert.deepEqual(p1, p2);

        const { h0, h2, h4, v0, v2, v4 } = p1.chosenGrid;
        const sixWords = [h0, h2, h4, v0, v2, v4];
        assert.equal(new Set(sixWords).size, 6, 'All 6 Waffle words must be distinct');
        for (const w of sixWords) {
          assert.equal(w.length, 5);
          assert.ok(poolSet.has(w), `Waffle word ${w} must be in WAFFLE_WORD_POOL`);
          assert.ok(api.WORDLE_VALID_SET.has(w), `Waffle word ${w} must be in WORDLE_VALID_SET`);
        }

        // Verify all 9 intersections match
        assert.equal(h0[0], v0[0]);
        assert.equal(h0[2], v2[0]);
        assert.equal(h0[4], v4[0]);
        assert.equal(h2[0], v0[2]);
        assert.equal(h2[2], v2[2]);
        assert.equal(h2[4], v4[2]);
        assert.equal(h4[0], v0[4]);
        assert.equal(h4[2], v2[4]);
        assert.equal(h4[4], v4[4]);

        // Verify holes are null and non-hole tiles are an exact permutation of solution
        for (const holeIdx of p1.holes) {
          assert.equal(p1.solution[holeIdx], null);
          assert.equal(p1.board[holeIdx], null);
        }
        const solLetters = p1.solution.filter(Boolean).slice().sort();
        const brdLetters = p1.board.filter(Boolean).slice().sort();
        assert.equal(solLetters.length, 21);
        assert.deepEqual(brdLetters, solLetters);
        assert.notDeepEqual(p1.board, p1.solution, 'Scrambled Waffle board must not already be solved');
        assert.equal(p1.par, 3);
      }
    });

    it('Jam (traffic): solveTrafficBFS verifies generated & fallback boards are solvable in 6–10 moves', () => {
      // First verify all 12 fallback templates
      for (let i = 0; i < api.TRAFFIC_PUZZLES.length; i++) {
        const res = api.solveTrafficBFS(api.TRAFFIC_PUZZLES[i]);
        assert.ok(res.solvable, `Fallback TRAFFIC_PUZZLES[${i}] must be solvable`);
        assert.ok(
          res.minMoves >= 6 && res.minMoves <= 10,
          `Fallback TRAFFIC_PUZZLES[${i}] minMoves=${res.minMoves} out of range 6..10`
        );
      }

      // Verify procedural generation across seeds
      for (const seed of SEEDS) {
        const p1 = api.generateTrafficPuzzle(api.createPRNG(seed), true);
        const p2 = api.generateTrafficPuzzle(api.createPRNG(seed), true);
        assert.deepEqual(p1, p2);

        const hero = p1.template.find((c) => c.id === 'X');
        assert.ok(hero);
        assert.equal(hero.r, 2);
        assert.equal(hero.dir, 'H');
        assert.equal(hero.len, 2);

        // Verify no overlapping vehicles
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

    it('Morph (morph): start and target words are 4-letter words reachable in 3–4 BFS steps; deterministic per seed', () => {
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

        // Verify each adjacent word in shortestPath differs by exactly 1 letter
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

    it('Code (mastermind): secret code has 4 distinct pegs (no duplicates) from 0..5; deterministic per seed', () => {
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

    it('Ice (iceslide): solveIceRinkBFS verifies goal is reachable in 5–7 slides; deterministic per seed', () => {
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
  });
});
