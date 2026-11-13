// --------------------------------------------------------------------------
// MINI-GAME 16: GEMS (4x4 Match-3 Tactical Board Clear)
// --------------------------------------------------------------------------

const GEMS_TYPES = [
  { id: 0, name: 'Ruby', emoji: '🔴', glyph: '◆', color: '#ef4444', class: 'gem-ruby' },
  { id: 1, name: 'Sapphire', emoji: '🔷', glyph: '◼', color: '#3b82f6', class: 'gem-sapphire' },
  { id: 2, name: 'Emerald', emoji: '🟢', glyph: '▲', color: '#10b981', class: 'gem-emerald' },
  { id: 3, name: 'Amber', emoji: '🟡', glyph: '★', color: '#f59e0b', class: 'gem-amber' }
];

// Fallback verified 4x4 boards solvable down to 0 gems in 3–4 moves
const GEMS_TEMPLATES = [
  {
    board: [2, 0, 1, 0, 1, 2, 0, 2, 1, 0, 0, 1, 0, 1, 2, 1],
    minMoves: 4
  },
  {
    board: [1, 1, 0, 2, 1, 1, 2, 0, 2, 0, 0, 1, 0, 2, 1, 0],
    minMoves: 4
  },
  {
    board: [0, 0, 1, 2, 0, 1, 0, 2, 1, 0, 0, 1, 2, 2, 1, 1],
    minMoves: 4
  },
  {
    board: [2, 0, 0, 1, 1, 1, 0, 1, 1, 0, 2, 0, 2, 0, 1, 2],
    minMoves: 4
  },
  {
    board: [0, 2, 0, 1, 0, 1, 1, 0, 1, 0, 2, 0, 2, 1, 1, 2],
    minMoves: 3
  },
  {
    board: [1, 1, 0, 2, 1, 3, 0, 0, 0, 2, 3, 3, 1, 0, 2, 0],
    minMoves: 4
  },
  {
    board: [2, 1, 0, 0, 2, 1, 1, 0, 1, 0, 2, 1, 1, 0, 0, 2],
    minMoves: 4
  },
  {
    board: [1, 1, 2, 0, 2, 0, 1, 0, 1, 2, 0, 2, 0, 1, 1, 0],
    minMoves: 4
  }
];

function findGemsMatches(board) {
  const matched = new Set();

  // Horizontal matches
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) {
      const idx = r * 4 + c;
      const v = board[idx];
      if (v === null || v === undefined) continue;
      let len = 1;
      while (c + len < 4 && board[r * 4 + (c + len)] === v) {
        len++;
      }
      if (len >= 3) {
        for (let k = 0; k < len; k++) matched.add(r * 4 + (c + k));
      }
    }
  }

  // Vertical matches
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 2; r++) {
      const idx = r * 4 + c;
      const v = board[idx];
      if (v === null || v === undefined) continue;
      let len = 1;
      while (r + len < 4 && board[(r + len) * 4 + c] === v) {
        len++;
      }
      if (len >= 3) {
        for (let k = 0; k < len; k++) matched.add((r + k) * 4 + c);
      }
    }
  }

  return matched;
}

function applyGemsGravity(board) {
  const next = board.slice();
  for (let c = 0; c < 4; c++) {
    const colGems = [];
    for (let r = 3; r >= 0; r--) {
      const v = next[r * 4 + c];
      if (v !== null && v !== undefined) colGems.push(v);
    }
    for (let r = 3; r >= 0; r--) {
      const gemIdx = 3 - r;
      next[r * 4 + c] = gemIdx < colGems.length ? colGems[gemIdx] : null;
    }
  }
  return next;
}

function resolveGemsMatchesAndCascades(board, bonusIdx = -1, bonusClaimed = false) {
  let curr = board.slice();
  let totalCleared = 0;
  let iterations = 0;
  let bonusCollected = false;

  while (iterations < 10) {
    const matches = findGemsMatches(curr);
    if (matches.size === 0) break;

    totalCleared += matches.size;
    for (const idx of matches) {
      if (idx === bonusIdx && !bonusClaimed) {
        bonusCollected = true;
      }
      curr[idx] = null;
    }
    curr = applyGemsGravity(curr);
    iterations++;
  }

  return {
    board: curr,
    cleared: totalCleared,
    cascades: Math.max(0, iterations - 1),
    bonusCollected
  };
}

function getLegalGemsSwaps(board) {
  const legal = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const i = r * 4 + c;
      if (board[i] === null || board[i] === undefined) continue;

      // Right swap
      if (c + 1 < 4 && board[i + 1] !== null && board[i] !== board[i + 1]) {
        const j = i + 1;
        const testBoard = board.slice();
        testBoard[i] = board[j];
        testBoard[j] = board[i];
        if (findGemsMatches(testBoard).size > 0) {
          legal.push([i, j]);
        }
      }

      // Down swap
      if (r + 1 < 4 && board[i + 4] !== null && board[i] !== board[i + 4]) {
        const j = i + 4;
        const testBoard = board.slice();
        testBoard[i] = board[j];
        testBoard[j] = board[i];
        if (findGemsMatches(testBoard).size > 0) {
          legal.push([i, j]);
        }
      }
    }
  }
  return legal;
}

function solveGemsBFS(initialBoard, maxDepth = 5) {
  const startKey = initialBoard.map((x) => (x === null || x === undefined ? '.' : x)).join('');
  const queue = [{ board: initialBoard.slice(), path: [] }];
  const visited = new Set([startKey]);

  while (queue.length > 0) {
    const { board, path } = queue.shift();
    if (board.every((x) => x === null || x === undefined)) {
      return path;
    }
    if (path.length >= maxDepth) continue;

    const legal = getLegalGemsSwaps(board);
    for (const [i, j] of legal) {
      const swapped = board.slice();
      swapped[i] = board[j];
      swapped[j] = board[i];
      const resolved = resolveGemsMatchesAndCascades(swapped);
      const key = resolved.board.map((x) => (x === null || x === undefined ? '.' : x)).join('');
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          board: resolved.board,
          path: [...path, { from: i, to: j, cleared: resolved.cleared }]
        });
      }
    }
  }
  return null;
}

function transformGemsBoard(board, colorMap, symmetry = 0) {
  // symmetry: 0: none, 1: horizontal flip (preserves vertical gravity!)
  const transformed = Array(16).fill(null);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const tc = symmetry === 1 ? 3 - c : c;
      const val = board[r * 4 + c];
      transformed[r * 4 + tc] = val !== null && val !== undefined ? colorMap[val] : null;
    }
  }
  return transformed;
}

function generateGemsPuzzle(rng, hasBoost = false) {
  const distributions = [
    [6, 6, 4, 0],
    [6, 4, 3, 3],
    [4, 4, 4, 4]
  ];

  // Try procedural generation first
  for (let attempt = 0; attempt < 300; attempt++) {
    const dist = distributions[Math.floor(rng() * distributions.length)];
    // Random permutation of color IDs 0..3
    const colors = seededShuffle([0, 1, 2, 3], rng);
    const pool = [];
    dist.forEach((count, idx) => {
      const colorId = colors[idx];
      for (let k = 0; k < count; k++) pool.push(colorId);
    });

    // Shuffle pool into 4x4
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
    }

    // Must have 0 initial matches and at least 2 legal swaps
    if (findGemsMatches(pool).size > 0) continue;
    const legal = getLegalGemsSwaps(pool);
    if (legal.length < 2) continue;

    const sol = solveGemsBFS(pool, 5);
    if (sol && sol.length >= 3 && sol.length <= 5) {
      const bonusIndex = hasBoost ? Math.floor(rng() * 16) : -1;
      return {
        board: pool.slice(),
        minMoves: sol.length,
        solution: sol,
        bonusIndex
      };
    }
  }

  // Fallback to transformed verified template (using horizontal flip + color permutation)
  const templateIdx = Math.floor(rng() * GEMS_TEMPLATES.length);
  const template = GEMS_TEMPLATES[templateIdx];
  const colorMap = seededShuffle([0, 1, 2, 3], rng);
  const symmetry = Math.floor(rng() * 2); // 0 or 1 (horizontal flip only)
  const transformed = transformGemsBoard(template.board, colorMap, symmetry);

  const sol = solveGemsBFS(transformed, 5);
  const bonusIndex = hasBoost ? Math.floor(rng() * 16) : -1;

  return {
    board: transformed,
    minMoves: sol ? sol.length : template.minMoves,
    solution: sol || [],
    bonusIndex
  };
}

function mountGemsStage(stage, rng) {
  const puzzle = generateGemsPuzzle(rng, stage.hasBoost);
  stage.puzzle = puzzle;
  lastMountedPuzzle = puzzle;

  const parTurns = Math.max(2, Math.ceil(puzzle.minMoves / 2));
  setStagePar(stage, parTurns);

  let board = stage.savedState?.board ? stage.savedState.board.slice() : puzzle.board.slice();
  let halfSwaps = stage.savedState?.halfSwaps ?? 0;
  let bonusClaimed = Boolean(stage.savedState?.bonusClaimed);
  let history = stage.savedState?.history ? stage.savedState.history.slice() : [];
  let selectedIdx = null;

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Swap adjacent gems to match 3+. Gravity drops remaining gems. Clear the board in par turns! <span class="bonus-inline">⚡ Match +2⚡ for +2 turns</span>`
    : 'Swap adjacent gems to match 3+. Gravity drops remaining gems. Clear the board in par turns!';
  setFeedback('Match 3 or 4 gems to clear them. Every 2 swaps = 1 turn.');

  const widget = document.createElement('div');
  widget.className = 'mini-game-widget';
  puzzleBoardMount.appendChild(widget);

  widget.innerHTML = `
    <div class="gems-widget">
      <div class="gems-top-bar">
        <div class="gems-step-meter" id="gemsStepMeter">Swaps this turn: ${halfSwaps} / 2</div>
        <div class="gems-actions">
          <button type="button" class="secondary-btn gems-action-btn" id="gemsUndoBtn" ${history.length === 0 ? 'disabled' : ''}>↩ Undo</button>
          <button type="button" class="secondary-btn gems-action-btn" id="gemsResetBtn">↺ Reset</button>
        </div>
      </div>
      <div class="gems-board-box">
        <div class="gems-board" id="gemsBoardGrid"></div>
      </div>
    </div>
  `;

  const boardEl = widget.querySelector('#gemsBoardGrid');
  const stepMeterEl = widget.querySelector('#gemsStepMeter');
  const undoBtn = widget.querySelector('#gemsUndoBtn');
  const resetBtn = widget.querySelector('#gemsResetBtn');

  function saveCurrentState() {
    stage.savedState = {
      board: board.slice(),
      halfSwaps,
      bonusClaimed,
      history: history.slice()
    };
    saveStateForActiveDate();
  }

  function renderGems() {
    stepMeterEl.textContent = `Swaps this turn: ${halfSwaps} / 2`;
    undoBtn.disabled = history.length === 0 || gauntletState.status !== 'in_progress';
    resetBtn.disabled = gauntletState.status !== 'in_progress';

    boardEl.innerHTML = '';
    for (let idx = 0; idx < 16; idx++) {
      const gemVal = board[idx];
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'gems-cell';
      cell.setAttribute('data-index', String(idx));

      if (gemVal === null || gemVal === undefined) {
        cell.classList.add('empty');
        cell.disabled = true;
      } else {
        const gemType = GEMS_TYPES[gemVal] || GEMS_TYPES[0];
        cell.classList.add(gemType.class);
        if (selectedIdx === idx) {
          cell.classList.add('selected');
        }

        const isBonusTile = idx === puzzle.bonusIndex && !bonusClaimed;
        cell.innerHTML = `
          ${isBonusTile ? '<span class="reactor-bonus-badge">+2⚡</span>' : ''}
          <span class="gem-glyph">${gemType.glyph}</span>
        `;
        cell.setAttribute('aria-label', `${gemType.name} at row ${Math.floor(idx / 4) + 1}, column ${(idx % 4) + 1}`);

        cell.addEventListener('click', () => {
          if (gauntletState.status !== 'in_progress') return;

          // Case 1: First gem selection
          if (selectedIdx === null) {
            selectedIdx = idx;
            playUiClick();
            renderGems();
            return;
          }

          // Case 2: Deselect same gem
          if (selectedIdx === idx) {
            selectedIdx = null;
            playUiClick();
            renderGems();
            return;
          }

          // Case 3: Check adjacency
          const r1 = Math.floor(selectedIdx / 4);
          const c1 = selectedIdx % 4;
          const r2 = Math.floor(idx / 4);
          const c2 = idx % 4;
          const isAdjacent = Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;

          if (!isAdjacent) {
            // Clicked another non-adjacent gem: switch selection
            selectedIdx = idx;
            playUiClick();
            renderGems();
            return;
          }

          // Try swapping
          const testBoard = board.slice();
          testBoard[selectedIdx] = board[idx];
          testBoard[idx] = board[selectedIdx];

          const testMatches = findGemsMatches(testBoard);
          if (testMatches.size === 0) {
            // Invalid swap: shake and play error buzz
            cell.classList.add('swap-invalid');
            const prevCell = boardEl.querySelector(`[data-index="${selectedIdx}"]`);
            if (prevCell) prevCell.classList.add('swap-invalid');
            playErrorBuzz();
            setFeedback('No match formed! Gems swapped back.', 'warn');
            setTimeout(() => {
              selectedIdx = null;
              renderGems();
            }, 300);
            return;
          }

          // Valid swap: save snapshot for Undo
          history.push({
            board: board.slice(),
            halfSwaps,
            bonusClaimed
          });

          // Resolve matches and cascades
          const res = resolveGemsMatchesAndCascades(testBoard, puzzle.bonusIndex, bonusClaimed);
          board = res.board;

          if (res.bonusCollected && !bonusClaimed) {
            bonusClaimed = true;
            grantBonusTurns(2, '⚡ Golden Gem match collected!');
          }

          halfSwaps++;
          if (halfSwaps >= 2) {
            halfSwaps = 0;
            spendTurn(1);
          } else {
            playUiClick();
          }

          selectedIdx = null;
          saveCurrentState();
          renderGems();

          // Check win condition
          const isCleared = board.every((x) => x === null || x === undefined);
          if (isCleared) {
            setFeedback('Board cleared! All gems matched!', 'good');
            setTimeout(() => completeCurrentStage(), 380);
            return;
          }

          // Check if no moves left
          const legal = getLegalGemsSwaps(board);
          if (legal.length === 0) {
            setFeedback('No legal matches remaining! Tap Undo or Reset to try another sequence.', 'warn');
          } else {
            setFeedback(`${res.cleared} gems cleared!`, 'info');
          }

          if (halfSwaps === 0) {
            checkOutOfTurnsAfterFailedMove();
          }
        });
      }

      boardEl.appendChild(cell);
    }
  }

  undoBtn.addEventListener('click', () => {
    if (gauntletState.status !== 'in_progress' || history.length === 0) return;
    const snap = history.pop();
    board = snap.board;
    halfSwaps = snap.halfSwaps;
    bonusClaimed = snap.bonusClaimed;
    selectedIdx = null;
    playUiClick();
    saveCurrentState();
    renderGems();
    setFeedback('Previous swap undone.', 'info');
  });

  resetBtn.addEventListener('click', () => {
    if (gauntletState.status !== 'in_progress') return;
    board = puzzle.board.slice();
    history = [];
    halfSwaps = 0;
    bonusClaimed = false;
    selectedIdx = null;
    playUiClick();
    saveCurrentState();
    renderGems();
    setFeedback('Board reset to starting layout.', 'info');
  });

  renderGems();
}

if (typeof registerMiniGame === 'function') {
  registerMiniGame({
    id: 'gems',
    name: 'Gems',
    shortName: 'Gems',
    emoji: '💎',
    mount: mountGemsStage
  });
}

if (typeof module !== 'undefined' && module.exports) {
  Object.assign(module.exports, {
    GEMS_TYPES,
    GEMS_TEMPLATES,
    findGemsMatches,
    applyGemsGravity,
    resolveGemsMatchesAndCascades,
    getLegalGemsSwaps,
    solveGemsBFS,
    transformGemsBoard,
    generateGemsPuzzle,
    mountGemsStage
  });
}
