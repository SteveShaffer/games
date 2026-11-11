// --------------------------------------------------------------------------
// MINI-GAME 6: WAFFLE (5x5 Intersecting Word Swaps)
// --------------------------------------------------------------------------
function generateWafflePuzzle(rng, hasBoost = false) {
  // Build index by (word[0] + word[2] + word[4]) for fast 6-word grid search
  const byPattern = {};
  WAFFLE_WORD_POOL.forEach((w) => {
    const key = w[0] + w[2] + w[4];
    if (!byPattern[key]) byPattern[key] = [];
    byPattern[key].push(w);
  });

  const wordsShuffled = seededShuffle(WAFFLE_WORD_POOL, rng);
  let chosenGrid = null; // { h0, h2, h4, v0, v2, v4 }

  outerSearch: for (let i = 0; i < wordsShuffled.length; i++) {
    const h0 = wordsShuffled[i];
    for (let j = 0; j < wordsShuffled.length; j++) {
      const h2 = wordsShuffled[(i + j + 1) % wordsShuffled.length];
      if (h2 === h0) continue;
      for (let k = 0; k < 60; k++) {
        const h4 = wordsShuffled[(i + j + k + 7) % wordsShuffled.length];
        if (h4 === h0 || h4 === h2) continue;

        const k0 = h0[0] + h2[0] + h4[0];
        const k2 = h0[2] + h2[2] + h4[2];
        const k4 = h0[4] + h2[4] + h4[4];
        if (!byPattern[k0] || !byPattern[k2] || !byPattern[k4]) continue;

        const used = new Set([h0, h2, h4]);
        const v0 = byPattern[k0].find((w) => !used.has(w));
        if (!v0) continue;
        used.add(v0);
        const v2 = byPattern[k2].find((w) => !used.has(w));
        if (!v2) continue;
        used.add(v2);
        const v4 = byPattern[k4].find((w) => !used.has(w));
        if (!v4) continue;

        chosenGrid = { h0, h2, h4, v0, v2, v4 };
        break outerSearch;
      }
    }
  }

  if (!chosenGrid) {
    chosenGrid = {
      h0: 'SMART',
      h2: 'OLIVE',
      h4: 'LASER',
      v0: 'SOLAR',
      v2: 'ALIKE',
      v4: 'TREND'
    };
  }

  // 5x5 grid with holes at (1,1)=6, (1,3)=8, (3,1)=16, (3,3)=18
  const HOLES = new Set([6, 8, 16, 18]);
  const solution = Array(25).fill(null);
  for (let c = 0; c < 5; c++) {
    solution[0 * 5 + c] = chosenGrid.h0[c];
    solution[2 * 5 + c] = chosenGrid.h2[c];
    solution[4 * 5 + c] = chosenGrid.h4[c];
  }
  for (let r = 0; r < 5; r++) {
    solution[r * 5 + 0] = chosenGrid.v0[r];
    solution[r * 5 + 2] = chosenGrid.v2[r];
    solution[r * 5 + 4] = chosenGrid.v4[r];
  }

  const board = solution.slice();

  // Pick 8 non-hole positions with distinct letters to scramble (keeps corners & center anchored so it's fair & solvable in ~6-8 swaps)
  const anchors = new Set([0, 4, 12, 20, 24]);
  const candidatePos = [];
  for (let idx = 0; idx < 25; idx++) {
    if (!HOLES.has(idx) && !anchors.has(idx)) {
      candidatePos.push(idx);
    }
  }

  const shuffledPos = seededShuffle(candidatePos, rng);
  const swapGroup = [];
  const seenChars = new Set();
  for (const pos of shuffledPos) {
    const ch = solution[pos];
    if (!seenChars.has(ch) && swapGroup.length < 7) {
      seenChars.add(ch);
      swapGroup.push(pos);
    }
  }

  // Perform 3 disjoint 2-cycles + 1 3-cycle (= 5 swaps minimum to solve)
  if (swapGroup.length >= 6) {
    const a0 = board[swapGroup[0]];
    board[swapGroup[0]] = board[swapGroup[1]];
    board[swapGroup[1]] = a0;

    const a2 = board[swapGroup[2]];
    board[swapGroup[2]] = board[swapGroup[3]];
    board[swapGroup[3]] = a2;

    if (swapGroup.length >= 7) {
      const t = board[swapGroup[4]];
      board[swapGroup[4]] = board[swapGroup[5]];
      board[swapGroup[5]] = board[swapGroup[6]];
      board[swapGroup[6]] = t;
    } else {
      const a4 = board[swapGroup[4]];
      board[swapGroup[4]] = board[swapGroup[5]];
      board[swapGroup[5]] = a4;
    }
  }

  const minWaffleSwaps = swapGroup.length >= 7 ? 5 : 4;
  const par = Math.ceil(minWaffleSwaps / 2);
  const bonusPos = hasBoost && swapGroup.length > 0 ? swapGroup[0] : -1;

  return {
    chosenGrid,
    solution,
    board,
    swapGroup,
    bonusPos,
    minWaffleSwaps,
    par,
    holes: [6, 8, 16, 18]
  };
}

function mountWaffleStage(stage, rng) {
  const puzzle = generateWafflePuzzle(rng, stage.hasBoost);
  lastMountedPuzzle = puzzle;
  const HOLES = new Set(puzzle.holes);
  const solution = puzzle.solution;
  const board = puzzle.board.slice();
  const bonusPos = puzzle.bonusPos;
  setStagePar(stage, puzzle.par);
  let bonusClaimed = Boolean(stage.savedState && stage.savedState.bonusClaimed);
  let selectedIdx = null;
  let halfSwapCount = stage.savedState && typeof stage.savedState.halfSwapCount === 'number'
    ? stage.savedState.halfSwapCount
    : 0;
  if (stage.savedState && Array.isArray(stage.savedState.board) && stage.savedState.board.length === 25) {
    for (let i = 0; i < 25; i++) board[i] = stage.savedState.board[i];
  }

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Swap misplaced letters to form 6 intersecting 5-letter words (2 swaps = 1 turn). <span class="bonus-inline">⚡ Lock the +2⚡ tile into green for +2 turns</span>`
    : 'Swap letters to solve all 3 horizontal & 3 vertical words (every 2 swaps = 1 turn).';
  setFeedback('Green tiles are locked. Yellow tiles belong in that row or column.');

  const widget = document.createElement('div');
  widget.className = 'waffle-widget';
  puzzleBoardMount.appendChild(widget);

  // Compute Waffle tile state ('correct' | 'present' | 'absent')
  function getTileStatus(idx) {
    if (HOLES.has(idx)) return 'hole';
    if (board[idx] === solution[idx]) return 'correct';

    const r = Math.floor(idx / 5);
    const c = idx % 5;
    const letter = board[idx];

    // Check if this letter is still needed in its horizontal word (if r is even)
    if (r % 2 === 0) {
      let neededInRow = 0;
      let presentBefore = 0;
      for (let col = 0; col < 5; col++) {
        const cellIdx = r * 5 + col;
        if (solution[cellIdx] === letter && board[cellIdx] !== letter) {
          neededInRow++;
        }
        if (col < c && board[cellIdx] === letter && solution[cellIdx] !== letter) {
          presentBefore++;
        }
      }
      if (presentBefore < neededInRow) return 'present';
    }

    // Check if this letter is still needed in its vertical word (if c is even)
    if (c % 2 === 0) {
      let neededInCol = 0;
      let presentBefore = 0;
      for (let row = 0; row < 5; row++) {
        const cellIdx = row * 5 + c;
        if (solution[cellIdx] === letter && board[cellIdx] !== letter) {
          neededInCol++;
        }
        if (row < r && board[cellIdx] === letter && solution[cellIdx] !== letter) {
          presentBefore++;
        }
      }
      if (presentBefore < neededInCol) return 'present';
    }

    return 'absent';
  }

  function isSolved() {
    for (let i = 0; i < 25; i++) {
      if (!HOLES.has(i) && board[i] !== solution[i]) return false;
    }
    return true;
  }

  function renderWaffle() {
    widget.innerHTML = `
      <div class="waffle-step-meter">Swaps this turn: ${halfSwapCount} / 2</div>
      <div class="waffle-board" id="waffleBoardGrid"></div>
    `;
    const gridEl = widget.querySelector('#waffleBoardGrid');

    for (let idx = 0; idx < 25; idx++) {
      if (HOLES.has(idx)) {
        const hole = document.createElement('div');
        hole.className = 'waffle-hole';
        gridEl.appendChild(hole);
        continue;
      }

      const status = getTileStatus(idx);
      const btn = document.createElement('button');
      btn.type = 'button';
      const isSel = selectedIdx === idx;
      const showBonus = idx === bonusPos && !bonusClaimed;
      btn.className = `waffle-tile ${status} ${isSel ? 'selected' : ''}`;
      btn.disabled = status === 'correct';
      btn.innerHTML = `
        ${showBonus ? '<span class="reactor-bonus-badge">+2⚡</span>' : ''}
        <span>${board[idx]}</span>
      `;

      btn.addEventListener('click', () => {
        if (gauntletState.status !== 'in_progress') return;
        if (status === 'correct') return;

        if (selectedIdx === null) {
          playUiClick();
          selectedIdx = idx;
          renderWaffle();
          return;
        }

        if (selectedIdx === idx) {
          playUiClick();
          selectedIdx = null;
          renderWaffle();
          return;
        }

        // Perform swap between selectedIdx and idx
        const firstIdx = selectedIdx;
        selectedIdx = null;
        const tmp = board[firstIdx];
        board[firstIdx] = board[idx];
        board[idx] = tmp;

        halfSwapCount++;
        if (halfSwapCount >= 2) {
          halfSwapCount = 0;
          spendTurn(1);
        } else {
          playUiClick();
        }

        if (bonusPos !== -1 && !bonusClaimed && board[bonusPos] === solution[bonusPos]) {
          bonusClaimed = true;
          grantBonusTurns(2, '⚡ Golden Waffle cell solved!');
        }

        stage.savedState = {
          board: board.slice(),
          halfSwapCount,
          bonusClaimed
        };
        saveStateForActiveDate();

        renderWaffle();

        if (isSolved()) {
          setFeedback('All 6 intersecting words solved!', 'good');
          setTimeout(() => completeCurrentStage(), 380);
          return;
        }

        if (halfSwapCount === 0) {
          checkOutOfTurnsAfterFailedMove();
        }
      });

      gridEl.appendChild(btn);
    }
  }

  renderWaffle();
}

registerMiniGame({
  id: 'waffle',
  name: 'Waffle',
  shortName: 'Waffle',
  emoji: '🧇',
  mount: mountWaffleStage
});
