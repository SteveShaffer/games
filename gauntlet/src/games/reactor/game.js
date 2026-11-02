// --------------------------------------------------------------------------
// MINI-GAME 3: FLIP GRID (3x3 Lights Out)
// --------------------------------------------------------------------------
function mountReactorStage(stage, rng) {
  setStagePar(stage, 4);
  const cells = Array(9).fill(true);
  const indices = seededShuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], rng);
  const scrambleMoves = indices.slice(0, 4);
  const bonusCellIdx = stage.hasBoost ? scrambleMoves[0] : -1;
  let bonusHarvested = false;

  function applyToggle(board, idx) {
    const r = Math.floor(idx / 3);
    const c = idx % 3;
    const targets = [
      [r, c],
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1]
    ];
    targets.forEach(([tr, tc]) => {
      if (tr >= 0 && tr < 3 && tc >= 0 && tc < 3) {
        const ti = tr * 3 + tc;
        board[ti] = !board[ti];
      }
    });
  }

  scrambleMoves.forEach((m) => applyToggle(cells, m));
  if (stage.savedState && Array.isArray(stage.savedState.cells) && stage.savedState.cells.length === 9) {
    for (let i = 0; i < 9; i++) cells[i] = Boolean(stage.savedState.cells[i]);
    bonusHarvested = Boolean(stage.savedState.bonusHarvested);
  }

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Turn all 9 tiles <strong>GREEN</strong> (1 tap = 1 turn). <span class="bonus-inline">⚡ Flip the +2⚡ tile for bonus turns</span>`
    : 'Turn all 9 tiles <strong>GREEN</strong>. Tapping a tile flips itself and its neighbors (1 tap = 1 turn).';
  setFeedback('Tap tiles until all 9 are green.');

  const gridEl = document.createElement('div');
  gridEl.className = 'reactor-grid';
  puzzleBoardMount.appendChild(gridEl);

  function renderGrid() {
    gridEl.innerHTML = '';
    cells.forEach((isLit, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `reactor-cell ${isLit ? 'lit' : ''}`;
      const isBonus = i === bonusCellIdx && !bonusHarvested;
      btn.innerHTML = `
        ${isBonus ? '<span class="reactor-bonus-badge">+2⚡</span>' : ''}
        <span class="reactor-core-icon">${isLit ? '✓' : '○'}</span>
        <span>${isLit ? 'ON' : 'OFF'}</span>
      `;
      btn.addEventListener('click', () => {
        if (gauntletState.status !== 'in_progress') return;
        applyToggle(cells, i);
        spendTurn(1);

        if (i === bonusCellIdx && !bonusHarvested) {
          bonusHarvested = true;
          grantBonusTurns(2, '⚡ Golden Tile flipped!');
        }

        stage.savedState = { cells: cells.slice(), bonusHarvested };
        saveStateForActiveDate();

        renderGrid();

        if (cells.every(Boolean)) {
          setFeedback('All 9 tiles lit!', 'good');
          setTimeout(() => completeCurrentStage(), 380);
          return;
        }

        if (!checkOutOfTurnsAfterFailedMove()) {
          const litCount = cells.filter(Boolean).length;
          setFeedback(`${litCount} of 9 tiles green.`, 'info');
        }
      });
      gridEl.appendChild(btn);
    });
  }

  renderGrid();
}

registerMiniGame({
  id: 'reactor',
  name: 'Flip',
  shortName: 'Flip',
  emoji: '🟩',
  mount: mountReactorStage
});
