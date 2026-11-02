'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createGauntletEnv } = require('../helpers/dom-harness');

/**
 * Helper to find a 1-3 step solution for Digits given live tile objects [{ val, hasBonus }].
 */
function findDigitsSolutionSteps(tiles, target) {
  const ops = [
    { sym: '+', fn: (a, b) => a + b },
    { sym: '−', fn: (a, b) => (a - b > 0 ? a - b : null) },
    { sym: '×', fn: (a, b) => a * b },
    { sym: '÷', fn: (a, b) => (b > 0 && a % b === 0 ? a / b : null) }
  ];

  let bestSolution = null;

  function dfs(current, steps) {
    if (steps.length > 3) return;
    for (let i = 0; i < current.length; i++) {
      for (let j = 0; j < current.length; j++) {
        if (i === j) continue;
        const tA = current[i];
        const tB = current[j];
        for (const op of ops) {
          const resVal = op.fn(tA.val, tB.val);
          if (resVal === null) continue;
          const usedBonus = Boolean(tA.hasBonus || tB.hasBonus);
          const nextSteps = [...steps, { indexA: i, op: op.sym, indexB: j, resVal, usedBonus }];
          if (resVal === target) {
            if (
              !bestSolution ||
              (usedBonus && !bestSolution.usedBonus) ||
              (usedBonus === bestSolution.usedBonus && nextSteps.length < bestSolution.steps.length)
            ) {
              bestSolution = { steps: nextSteps, usedBonus };
            }
            continue;
          }
          if (nextSteps.length < 3) {
            const rest = current.filter((_, idx) => idx !== i && idx !== j);
            rest.push({ val: resVal, hasBonus: usedBonus });
            dfs(rest, nextSteps);
          }
        }
      }
    }
  }

  dfs(tiles, []);
  return bestSolution ? bestSolution.steps : [];
}

/**
 * Helper to find shortest BFS slide sequence (indices of clicked tiles) for Slide (3x3 8-puzzle).
 */
function solveSliderClickPath(startTiles, getNeighbors) {
  const goalKey = '1,2,3,4,5,6,7,8,0';
  const startKey = startTiles.join(',');
  if (startKey === goalKey) return [];
  const visited = new Set([startKey]);
  const queue = [{ tiles: startTiles.slice(), clicks: [] }];

  while (queue.length > 0) {
    const { tiles, clicks } = queue.shift();
    const z = tiles.indexOf(0);
    for (const nb of getNeighbors(z)) {
      const nxt = tiles.slice();
      nxt[z] = nxt[nb];
      nxt[nb] = 0;
      const key = nxt.join(',');
      const nextClicks = [...clicks, nb];
      if (key === goalKey) return nextClicks;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ tiles: nxt, clicks: nextClicks });
      }
    }
  }
  return [];
}

/**
 * Plays and wins whichever stage is currently mounted on `env` via DOM interactions.
 */
function playCurrentStageViaDOM(env) {
  const { document, api } = env;
  const state = api.getState();
  const stage = state.stages[state.currentStageIndex];
  const puzzle = api.getActivePuzzle();

  if (stage.id === 'wordle') {
    const keys = document.querySelectorAll('.wordle-keyboard .kb-key');
    const clickKey = (label) => {
      const btn = keys.find((k) => k.textContent === label);
      assert.ok(btn, `Wordle key "${label}" not found`);
      btn.click();
    };
    for (const ch of puzzle.targetWord) {
      clickKey(ch);
    }
    clickKey('ENTER');
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'digits') {
    const liveTiles = (
      stage.savedState && stage.savedState.currentTiles
        ? stage.savedState.currentTiles
        : puzzle.baseNumbers.map((val, idx) => ({
            val,
            hasBonus: Boolean(stage.hasBoost && idx === puzzle.bonusSourceIndex)
          }))
    ).map((t) => ({ ...t }));

    const steps = findDigitsSolutionSteps(liveTiles, puzzle.targetNumber);
    assert.ok(steps.length > 0, 'Digits solver must find winning steps');

    for (const step of steps) {
      const bubbles = document.querySelectorAll('#digitsBubblesGrid .digit-bubble');
      bubbles[step.indexA].click();
      const opBtns = document.querySelectorAll('#digitsOpsRow .op-btn');
      const opBtn = opBtns.find((b) => b.textContent === step.op);
      assert.ok(opBtn, `Operator button ${step.op} not found`);
      opBtn.click();
      const bubblesAfterOp = document.querySelectorAll('#digitsBubblesGrid .digit-bubble');
      bubblesAfterOp[step.indexB].click();
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'reactor') {
    const currentCells =
      stage.savedState && stage.savedState.cells
        ? stage.savedState.cells.slice()
        : puzzle.cells.slice();

    // Find minimal tap subset over F_2 from currentCells
    let bestTaps = null;
    for (let mask = 0; mask < 512; mask++) {
      const taps = [];
      for (let b = 0; b < 9; b++) {
        if (mask & (1 << b)) taps.push(b);
      }
      if (bestTaps && taps.length >= bestTaps.length) continue;
      const copy = currentCells.slice();
      for (const idx of taps) api.applyReactorToggle(copy, idx);
      if (copy.every(Boolean)) {
        bestTaps = taps;
      }
    }
    assert.ok(bestTaps, 'Reactor F_2 solver must find solution taps');
    for (const cellIdx of bestTaps) {
      const cells = document.querySelectorAll('.reactor-grid .reactor-cell');
      cells[cellIdx].click();
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'memory') {
    env.flushTimers(1600); // Finish 1.5s preview
    const bySymbol = new Map();
    puzzle.shuffledSymbols.forEach((sym, idx) => {
      if (!bySymbol.has(sym)) bySymbol.set(sym, []);
      bySymbol.get(sym).push(idx);
    });
    for (const [, [i1, i2]] of bySymbol.entries()) {
      let cards = document.querySelectorAll('.memory-grid .memory-card');
      if (cards[i1].classList.contains('matched')) continue;
      cards[i1].click();
      cards = document.querySelectorAll('.memory-grid .memory-card');
      cards[i2].click();
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'slider') {
    const currentTiles =
      stage.savedState && stage.savedState.tiles ? stage.savedState.tiles : puzzle.tiles;
    const clicks = solveSliderClickPath(currentTiles, api.getSliderNeighbors);
    assert.ok(clicks.length > 0, 'Slider BFS must find click path');
    for (const idx of clicks) {
      const tiles = document.querySelectorAll('#sliderGridBox .slider-tile');
      tiles[idx].click();
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'waffle') {
    const holes = new Set(puzzle.holes);
    const solution = puzzle.solution;
    const board =
      stage.savedState && stage.savedState.board
        ? stage.savedState.board.slice()
        : puzzle.board.slice();

    let guard = 0;
    while (guard++ < 20) {
      let firstMismatch = -1;
      if (puzzle.bonusPos !== -1 && board[puzzle.bonusPos] !== solution[puzzle.bonusPos]) {
        firstMismatch = puzzle.bonusPos;
      } else {
        for (let i = 0; i < 25; i++) {
          if (!holes.has(i) && board[i] !== solution[i]) {
            firstMismatch = i;
            break;
          }
        }
      }
      if (firstMismatch === -1) break;

      const neededChar = solution[firstMismatch];
      let partnerIdx = -1;
      for (let j = 0; j < 25; j++) {
        if (
          j !== firstMismatch &&
          !holes.has(j) &&
          board[j] !== solution[j] &&
          board[j] === neededChar
        ) {
          partnerIdx = j;
          if (board[firstMismatch] === solution[j]) break;
        }
      }
      assert.ok(partnerIdx !== -1, 'Waffle swap partner must exist');

      let gridChildren = document.getElementById('waffleBoardGrid').children;
      gridChildren[firstMismatch].click();
      gridChildren = document.getElementById('waffleBoardGrid').children;
      gridChildren[partnerIdx].click();

      const tmp = board[firstMismatch];
      board[firstMismatch] = board[partnerIdx];
      board[partnerIdx] = tmp;
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'traffic') {
    const currentCars =
      stage.savedState && stage.savedState.cars ? stage.savedState.cars : puzzle.template;
    const bfs = api.solveTrafficBFS(currentCars);
    assert.ok(bfs.solvable && bfs.moves.length > 0, 'Traffic BFS must provide winning moves');

    for (const move of bfs.moves) {
      const carIdx = currentCars.findIndex((c) => c.id === move.id);
      assert.ok(carIdx !== -1, `Car ${move.id} not found`);
      const carBtns = document.querySelectorAll('#trafficGrid .traffic-car');
      carBtns[carIdx].click();

      const stepSign = move.steps > 0 ? 1 : -1;
      for (let s = 0; s < Math.abs(move.steps); s++) {
        const dirBtn = document.getElementById(
          stepSign > 0 ? 'trafficPosBtn' : 'trafficNegBtn'
        );
        dirBtn.click();
      }
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'morph') {
    const chain =
      stage.savedState && stage.savedState.chain
        ? stage.savedState.chain.slice()
        : [puzzle.startWord];
    const startStepIdx = Math.max(1, chain.length);

    for (let s = startStepIdx; s < puzzle.shortestPath.length; s++) {
      const prevWord = puzzle.shortestPath[s - 1];
      const nextWord = puzzle.shortestPath[s];
      let diffPos = 0;
      for (let i = 0; i < 4; i++) {
        if (prevWord[i] !== nextWord[i]) {
          diffPos = i;
          break;
        }
      }
      const editableTiles = document.querySelectorAll('#morphActiveWord .morph-tile');
      editableTiles[diffPos].click();

      const kbKeys = document.querySelectorAll('#morphKeyboard .kb-key');
      const targetKey = kbKeys.find((k) => k.textContent === nextWord[diffPos]);
      assert.ok(targetKey, `Morph keyboard key ${nextWord[diffPos]} not found`);
      targetKey.click();
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'mastermind') {
    const swatches = document.querySelectorAll('#mmPaletteRow .mm-swatch');
    for (let i = 0; i < 4; i++) {
      const colorId = puzzle.secret[i];
      swatches[colorId].click();
    }
    document.getElementById('mmSubmitBtn').click();
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'iceslide') {
    const curIdx =
      stage.savedState && typeof stage.savedState.playerIdx === 'number'
        ? stage.savedState.playerIdx
        : puzzle.startIdx;
    const curMask =
      stage.savedState && typeof stage.savedState.frozenMask === 'number'
        ? stage.savedState.frozenMask
        : 0;
    const bfs =
      curIdx === puzzle.startIdx && curMask === 0
        ? { moves: puzzle.winningMoves }
        : api.solveIceRinkBFS(
            puzzle.rockWalls,
            puzzle.crackedList,
            curIdx,
            puzzle.goalIdx,
            curMask
          );

    for (const move of bfs.moves) {
      const dpadBtn = document.querySelector(`.ice-dpad .dpad-btn[data-dir="${move.dir}"]`);
      assert.ok(dpadBtn, `Ice d-pad button ${move.dir} not found`);
      dpadBtn.click();
    }
    env.flushTimers(500);
  }
}

describe('Daily Gauntlet — End-to-End Playability Regression Tests', () => {
  it('1. Mounts initial Gauntlet UI with Stage 1/5, 25 turns, valid Par, Turn Health Bar, and 5 stepper nodes', () => {
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

  it('2. Plays and wins all 10 mini-games end-to-end via DOM events and verifies +2⚡ Golden Boosts & Turn Health Bar', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    for (const spec of api.MINI_GAME_SPECS) {
      // Launch each game with hasBoost = true
      api.startSingleGameSandbox(spec.id, true);
      assert.equal(document.getElementById('turnsRemainingValue').textContent, '25');
      assert.ok(
        document.getElementById('currentPuzzleTitle').textContent.includes(spec.name),
        `Expected stage title to include ${spec.name}`
      );

      // Play and win the stage via DOM interactions
      playCurrentStageViaDOM(env);

      const stateAfter = api.getState();
      const stageAfter = stateAfter.stages[0];
      assert.equal(
        stageAfter.status,
        'cleared',
        `Expected ${spec.id} (${spec.name}) to be cleared via DOM play`
      );
      assert.ok(stageAfter.turnsSpent >= 1, `Expected ${spec.id} to spend at least 1 turn`);
      assert.ok(
        !document.getElementById('stageClearedCard').classList.contains('hidden'),
        `Expected #stageClearedCard to be shown after clearing ${spec.id}`
      );

      // Verify Turn Health Bar width matches turnsRemaining / 25
      const expectedPct = Math.max(0, Math.min(100, (stateAfter.turnsRemaining / 25) * 100));
      assert.equal(document.getElementById('turnHealthFill').style.width, `${expectedPct}%`);
    }
  });

  it('3. Verifies +2⚡ Golden Boost collection increments turnsRemaining by 2 across games', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    // Test Wordle +2⚡ boost
    api.startSingleGameSandbox('wordle', true);
    const wordlePuzzle = api.getActivePuzzle();
    assert.ok(wordlePuzzle.bonusLetter);
    // Find a valid 5-letter word containing bonusLetter that is not targetWord
    let boostGuess = null;
    for (const w of api.WORDLE_VALID_SET) {
      if (w !== wordlePuzzle.targetWord && w.includes(wordlePuzzle.bonusLetter)) {
        boostGuess = w;
        break;
      }
    }
    assert.ok(boostGuess, 'Must find a valid word containing bonusLetter');
    for (const ch of boostGuess) {
      env.dispatchKey(ch);
    }
    env.dispatchKey('Enter');
    // Spent 1 turn (25 -> 24) + gained +2⚡ boost (24 -> 26)
    assert.equal(api.getState().stages[0].bonusEarned, 2);
    assert.equal(document.getElementById('turnsRemainingValue').textContent, '26');

    // Test Flip (reactor) +2⚡ boost
    api.startSingleGameSandbox('reactor', true);
    const reactorPuzzle = api.getActivePuzzle();
    const reactorCells = document.querySelectorAll('.reactor-grid .reactor-cell');
    reactorCells[reactorPuzzle.bonusCellIdx].click();
    assert.equal(api.getState().stages[0].bonusEarned, 2);
    assert.equal(document.getElementById('turnsRemainingValue').textContent, '26');

    // Test Code (mastermind) +2⚡ boost
    api.startSingleGameSandbox('mastermind', true);
    const mmPuzzle = api.getActivePuzzle();
    playCurrentStageViaDOM(env);
    assert.ok(mmPuzzle.bonusColorId !== -1);
    assert.equal(api.getState().stages[0].bonusEarned, 2);
    assert.equal(document.getElementById('turnsRemainingValue').textContent, '26');
  });

  it('4. Verifies mid-stage localStorage persistence (stage.savedState) and page reload restoration across all 10 games', () => {
    let env = createGauntletEnv();

    for (const spec of env.api.MINI_GAME_SPECS) {
      // Configure Stage 1 of today's daily run to be `spec.id`
      const freshState = env.api.createFreshRunState(env.api.getState().dateStr);
      freshState.stages[0] = {
        index: 0,
        id: spec.id,
        name: spec.name,
        shortName: spec.shortName,
        emoji: spec.emoji,
        hasBoost: true,
        turnsSpent: 0,
        bonusEarned: 0,
        turnsRemainingAfter: null,
        status: 'active'
      };
      env.api.setState(freshState);
      env.api.saveStateForActiveDate();
      env.api.mountCurrentStage();

      const puzzle = env.api.getActivePuzzle();

      // Take 1 partial move/turn in the DOM before reloading
      if (spec.id === 'wordle') {
        const wrongWord = api.FirstDifferentWord(env.api.WORDLE_TARGETS, puzzle.targetWord);
        for (const ch of wrongWord) env.dispatchKey(ch);
        env.dispatchKey('Enter');
      } else if (spec.id === 'digits') {
        const liveTiles = puzzle.baseNumbers.map((val, idx) => ({
          val,
          hasBonus: Boolean(idx === puzzle.bonusSourceIndex)
        }));
        const steps = findDigitsSolutionSteps(liveTiles, puzzle.targetNumber);
        const firstStep = steps[0];
        const bubbles = env.document.querySelectorAll('#digitsBubblesGrid .digit-bubble');
        bubbles[firstStep.indexA].click();
        const opBtn = env.document
          .querySelectorAll('#digitsOpsRow .op-btn')
          .find((b) => b.textContent === firstStep.op);
        opBtn.click();
        env.document.querySelectorAll('#digitsBubblesGrid .digit-bubble')[firstStep.indexB].click();
      } else if (spec.id === 'reactor') {
        const cells = env.document.querySelectorAll('.reactor-grid .reactor-cell');
        cells[puzzle.scrambleMoves[0]].click();
      } else if (spec.id === 'memory') {
        env.flushTimers(1600);
        const firstSym = puzzle.shuffledSymbols[0];
        const secondIdx = puzzle.shuffledSymbols.indexOf(firstSym, 1);
        const cards = env.document.querySelectorAll('.memory-grid .memory-card');
        cards[0].click();
        env.document.querySelectorAll('.memory-grid .memory-card')[secondIdx].click();
      } else if (spec.id === 'slider') {
        const clicks = solveSliderClickPath(puzzle.tiles, env.api.getSliderNeighbors);
        env.document.querySelectorAll('#sliderGridBox .slider-tile')[clicks[0]].click();
        env.document.querySelectorAll('#sliderGridBox .slider-tile')[clicks[1]].click();
      } else if (spec.id === 'waffle') {
        const holes = new Set(puzzle.holes);
        const firstIdx = puzzle.swapGroup[0];
        const needed = puzzle.solution[firstIdx];
        let secondIdx = -1;
        for (let j = 0; j < 25; j++) {
          if (
            j !== firstIdx &&
            !holes.has(j) &&
            puzzle.board[j] !== puzzle.solution[j] &&
            puzzle.board[j] === needed
          ) {
            secondIdx = j;
            break;
          }
        }
        env.document.getElementById('waffleBoardGrid').children[firstIdx].click();
        env.document.getElementById('waffleBoardGrid').children[secondIdx].click();
      } else if (spec.id === 'traffic') {
        const bfs = env.api.solveTrafficBFS(puzzle.template);
        const move = bfs.moves[0];
        const carIdx = puzzle.template.findIndex((c) => c.id === move.id);
        env.document.querySelectorAll('#trafficGrid .traffic-car')[carIdx].click();
        const stepSign = move.steps > 0 ? 1 : -1;
        for (let s = 0; s < Math.abs(move.steps); s++) {
          env.document.getElementById(stepSign > 0 ? 'trafficPosBtn' : 'trafficNegBtn').click();
        }
      } else if (spec.id === 'morph') {
        const prevWord = puzzle.shortestPath[0];
        const nextWord = puzzle.shortestPath[1];
        const diffPos = [0, 1, 2, 3].find((i) => prevWord[i] !== nextWord[i]);
        env.document.querySelectorAll('#morphActiveWord .morph-tile')[diffPos].click();
        env.document
          .querySelectorAll('#morphKeyboard .kb-key')
          .find((k) => k.textContent === nextWord[diffPos])
          .click();
      } else if (spec.id === 'mastermind') {
        const swatches = env.document.querySelectorAll('#mmPaletteRow .mm-swatch');
        // Enter a non-winning permutation of secret
        const wrongGuess = [
          puzzle.secret[0],
          puzzle.secret[1],
          puzzle.secret[3],
          puzzle.secret[2]
        ];
        for (const cid of wrongGuess) swatches[cid].click();
        env.document.getElementById('mmSubmitBtn').click();
      } else if (spec.id === 'iceslide') {
        const firstDir = puzzle.winningMoves[0].dir;
        const secondDir = puzzle.winningMoves[1].dir;
        env.document.querySelector(`.ice-dpad .dpad-btn[data-dir="${firstDir}"]`).click();
        env.document.querySelector(`.ice-dpad .dpad-btn[data-dir="${secondDir}"]`).click();
      }

      const savedBeforeReload = JSON.parse(
        JSON.stringify(env.api.getState().stages[0].savedState)
      );
      const turnsTextBeforeReload = env.document.getElementById('turnsRemainingValue').textContent;
      assert.ok(savedBeforeReload, `Expected ${spec.id} to persist stage.savedState`);

      // Simulate browser page reload
      env = env.reloadPage();

      assert.equal(
        env.document.getElementById('turnsRemainingValue').textContent,
        turnsTextBeforeReload,
        `Expected turnsRemainingValue to be restored after reload on ${spec.id}`
      );
      assert.deepEqual(
        env.api.getState().stages[0].savedState,
        savedBeforeReload,
        `Expected stage.savedState to be restored after reload on ${spec.id}`
      );

      // Finish solving the stage from the reloaded state
      playCurrentStageViaDOM(env);
      assert.equal(
        env.api.getState().stages[0].status,
        'cleared',
        `Expected ${spec.id} to be solvable to completion after mid-stage reload`
      );
    }
  });

  it('5. Completes a full 5-stage Daily Gauntlet run through #stageClearedCard -> #nextStageBtn -> #runSummaryCard', async () => {
    const env = createGauntletEnv({ useCompiledBundle: true });
    const { document, api } = env;

    for (let stageIdx = 0; stageIdx < 5; stageIdx++) {
      assert.equal(api.getState().currentStageIndex, stageIdx);
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

    // After Stage 5/5 is cleared, #runSummaryCard should be visible
    assert.equal(api.getState().status, 'won');
    assert.ok(!document.getElementById('runSummaryCard').classList.contains('hidden'));
    assert.equal(document.getElementById('summaryStatusBanner').textContent, '🏆 GAUNTLET COMPLETE');
    assert.equal(document.getElementById('summaryStagesCleared').textContent, '5/5');

    const sharePreview = document.getElementById('shareTextPreview').textContent;
    assert.ok(sharePreview.includes('Daily Gauntlet #'));
    assert.ok(sharePreview.includes('https://games.shaffer.tech/gauntlet'));

    // Test Copy Score button
    document.getElementById('copyShareBtn').click();
    await Promise.resolve();
    assert.equal(env.getClipboardText(), sharePreview);
  });

  it('6. Transitions to OUT OF TURNS summary screen when turnsRemaining hits 0 on a failed move', () => {
    const env = createGauntletEnv();
    const { document, api } = env;

    api.startSingleGameSandbox('reactor', false);
    const state = api.getState();
    state.turnsRemaining = 1;

    // Tap a single cell (since Flip requires 4 taps, 1 tap cannot solve it)
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

const api = {
  FirstDifferentWord(list, target) {
    return list.find((w) => w !== target);
  }
};
