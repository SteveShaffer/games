// --------------------------------------------------------------------------
// MINI-GAME 12: SUDOKU (4x4 Mini Latin Box Grid)
// --------------------------------------------------------------------------
function findSudokuConflictReason(board, cellIdx, num) {
  const r = Math.floor(cellIdx / 4);
  const c = cellIdx % 4;
  for (let k = 0; k < 4; k++) {
    if (k !== c && board[r * 4 + k] === num) return `${num} is already in Row ${r + 1}!`;
    if (k !== r && board[k * 4 + c] === num) return `${num} is already in Column ${c + 1}!`;
  }
  const br = Math.floor(r / 2) * 2;
  const bc = Math.floor(c / 2) * 2;
  for (let dr = 0; dr < 2; dr++) {
    for (let dc = 0; dc < 2; dc++) {
      const idx = (br + dr) * 4 + (bc + dc);
      if (idx !== cellIdx && board[idx] === num) return `${num} is already in that 2×2 box!`;
    }
  }
  return `${num} doesn't fit here — check the other rows/columns first!`;
}

function generateSudokuPuzzle(rng, hasBoost = false) {
  const base = [
    1, 2, 3, 4,
    3, 4, 1, 2,
    2, 1, 4, 3,
    4, 3, 2, 1
  ];
  const perm = seededShuffle([1, 2, 3, 4], rng);
  const bandA = rng() < 0.5 ? [0, 1] : [1, 0];
  const bandB = rng() < 0.5 ? [2, 3] : [3, 2];
  const rowOrder = rng() < 0.5 ? [...bandA, ...bandB] : [...bandB, ...bandA];
  const stackA = rng() < 0.5 ? [0, 1] : [1, 0];
  const stackB = rng() < 0.5 ? [2, 3] : [3, 2];
  const colOrder = rng() < 0.5 ? [...stackA, ...stackB] : [...stackB, ...stackA];
  const doTranspose = rng() < 0.5;

  const solution = Array(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const rr = doTranspose ? colOrder[c] : rowOrder[r];
      const cc = doTranspose ? rowOrder[r] : colOrder[c];
      const val = base[rr * 4 + cc];
      solution[r * 4 + c] = perm[val - 1];
    }
  }

  // Remove 6 cells
  const allPos = seededShuffle(
    Array.from({ length: 16 }, (_, i) => i),
    rng
  );
  const emptyList = allPos.slice(0, 6);
  const emptySet = new Set(emptyList);
  const bonusCellIdx = hasBoost ? emptyList[0] : -1;
  const initialBoard = solution.map((v, i) => (emptySet.has(i) ? 0 : v));

  return {
    solution,
    initialBoard,
    emptyList,
    bonusCellIdx,
    par: 3
  };
}

function mountSudokuStage(stage, rng) {
  const puzzle = generateSudokuPuzzle(rng, stage.hasBoost);
  lastMountedPuzzle = puzzle;
  setStagePar(stage, puzzle.par); // 6 empty cells, every 2 placements = 1 turn -> Par 3

  const { solution, emptyList, bonusCellIdx } = puzzle;
  const emptySet = new Set(emptyList);

  let board =
    stage.savedState && Array.isArray(stage.savedState.board)
      ? stage.savedState.board.slice()
      : puzzle.initialBoard.slice();
  let halfMoves =
    stage.savedState && typeof stage.savedState.halfMoves === 'number'
      ? stage.savedState.halfMoves
      : 0;
  let bonusClaimed = Boolean(stage.savedState && stage.savedState.bonusClaimed);
  let selectedCell = emptyList.find((idx) => board[idx] === 0) ?? emptyList[0];
  let wrongFlashCell = null;

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Fill every row, column, and 2×2 box with <strong>1–4</strong> (2 numbers = 1 turn; wrong numbers cost a move!). <span class="bonus-inline">⚡ Solve the +2⚡ cell for +2 turns</span>`
    : 'Fill every row, column, and 2×2 box with digits <strong>1–4</strong> (every 2 placements = 1 turn; wrong placements cost a move!).';
  setFeedback('Tap an empty cell, then tap 1–4 below.');

  const widget = document.createElement('div');
  widget.className = 'mini-game-widget';
  puzzleBoardMount.appendChild(widget);

  function placeNumber(num) {
    if (gauntletState.status !== 'in_progress') return;
    if (selectedCell === null || board[selectedCell] !== 0) return;

    halfMoves++;
    if (halfMoves >= 2) {
      halfMoves = 0;
      spendTurn(1);
    } else {
      playUiClick();
    }

    if (num === solution[selectedCell]) {
      wrongFlashCell = null;
      board[selectedCell] = num;
      if (selectedCell === bonusCellIdx && !bonusClaimed) {
        bonusClaimed = true;
        grantBonusTurns(2, '⚡ Golden Sudoku cell solved!');
      }
      const nextOpen = emptyList.find((idx) => board[idx] === 0);
      selectedCell = nextOpen !== undefined ? nextOpen : null;

      stage.savedState = { board: board.slice(), halfMoves, bonusClaimed };
      saveStateForActiveDate();
      renderSudoku();

      if (board.every((v, i) => v === solution[i])) {
        setFeedback('4×4 Sudoku complete!', 'good');
        setTimeout(() => completeCurrentStage(), 380);
        return;
      }
      if (halfMoves === 0 && checkOutOfTurnsAfterFailedMove()) return;
      setFeedback(`Placed ${num}!`, 'good');
    } else {
      const reason = findSudokuConflictReason(board, selectedCell, num);
      wrongFlashCell = selectedCell;
      playErrorBuzz();
      stage.savedState = { board: board.slice(), halfMoves, bonusClaimed };
      saveStateForActiveDate();
      renderSudoku();
      if (halfMoves === 0 && checkOutOfTurnsAfterFailedMove()) return;
      setFeedback(reason, 'warn');
    }
  }

  function renderSudoku() {
    widget.innerHTML = `
      <div class="waffle-step-meter">Placements this turn: ${halfMoves} / 2</div>
      <div class="sudoku-board" id="sudokuGridBox"></div>
      <div class="numpad-row" id="sudokuNumpad"></div>
    `;

    const gridEl = widget.querySelector('#sudokuGridBox');
    for (let i = 0; i < 16; i++) {
      const r = Math.floor(i / 4);
      const c = i % 4;
      const isGiven = !emptySet.has(i);
      const isSolved = !isGiven && board[i] !== 0;
      const isSel = i === selectedCell;
      const isWrong = i === wrongFlashCell && board[i] === 0;
      const showBonus = i === bonusCellIdx && !bonusClaimed && board[i] === 0;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `sudoku-cell ${c === 1 ? 'box-right' : ''} ${r === 1 ? 'box-bottom' : ''} ${
        isGiven ? 'given' : isSolved ? 'solved' : ''
      } ${isSel ? 'selected' : ''} ${isWrong ? 'wrong-flash' : ''}`;
      btn.innerHTML = `
        ${showBonus ? '<span class="reactor-bonus-badge">+2⚡</span>' : ''}
        <span>${board[i] || ''}</span>
      `;
      btn.addEventListener('click', () => {
        if (board[i] === 0) {
          playUiClick();
          wrongFlashCell = null;
          selectedCell = i;
          renderSudoku();
        }
      });
      gridEl.appendChild(btn);
    }

    const numpad = widget.querySelector('#sudokuNumpad');
    [1, 2, 3, 4].forEach((n) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'numpad-btn';
      btn.textContent = n;
      btn.addEventListener('click', () => placeNumber(n));
      numpad.appendChild(btn);
    });
  }

  function onKeyDown(e) {
    if (/^[1-4]$/.test(e.key)) {
      e.preventDefault();
      placeNumber(Number(e.key));
    }
  }
  window.addEventListener('keydown', onKeyDown);
  activeCleanupFn = () => window.removeEventListener('keydown', onKeyDown);

  renderSudoku();
}

registerMiniGame({
  id: 'sudoku',
  name: 'Sudoku',
  shortName: 'Sudoku',
  emoji: '🍱',
  mount: mountSudokuStage
});

if (typeof module !== 'undefined' && module.exports) {
  Object.assign(module.exports, {
    findSudokuConflictReason,
    generateSudokuPuzzle,
    mountSudokuStage
  });
}
