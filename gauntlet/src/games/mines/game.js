// --------------------------------------------------------------------------
// MINI-GAME 13: MINES (4x4 Deterministic Minesweeper Logic)
// --------------------------------------------------------------------------
const MINES_CLUE_COLORS = ['#94a3b8', '#2563eb', '#16a34a', '#dc2626', '#7c3aed'];

function computeMineClues(mMask) {
  const clues = Array(16).fill(0);
  for (let i = 0; i < 16; i++) {
    if ((mMask & (1 << i)) !== 0) {
      clues[i] = -1;
      continue;
    }
    const r = Math.floor(i / 4);
    const c = i % 4;
    let cnt = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
          if ((mMask & (1 << (nr * 4 + nc))) !== 0) cnt++;
        }
      }
    }
    clues[i] = cnt;
  }
  return clues;
}

function generateMinesPuzzle(rng, hasBoost = false) {
  let mineMask = 0;
  let initialSafeRevealedMask = 0;
  let clues = [];

  for (let att = 0; att < 60; att++) {
    const cells = seededShuffle(
      Array.from({ length: 16 }, (_, i) => i),
      rng
    );
    const mines = cells.slice(0, 4);
    const safeCells = cells.slice(4);
    let mMask = 0;
    mines.forEach((idx) => {
      mMask |= 1 << idx;
    });
    const cArr = computeMineClues(mMask);

    // Reveal 9 safe clue cells (leaving 4 mines + 3 unrevealed safe decoys = 7 unrevealed tiles)
    // and check if those 9 revealed clues uniquely identify the 4 mines among the 7 unrevealed tiles!
    let revMask = 0;
    safeCells.slice(0, 9).forEach((idx) => {
      revMask |= 1 << idx;
    });

    const unrevealed = [];
    for (let i = 0; i < 16; i++) {
      if ((revMask & (1 << i)) === 0) unrevealed.push(i);
    }

    let validWays = 0;
    for (let sub = 0; sub < 1 << unrevealed.length; sub++) {
      let bCnt = 0;
      let candMask = 0;
      for (let b = 0; b < unrevealed.length; b++) {
        if ((sub >> b) & 1) {
          bCnt++;
          candMask |= 1 << unrevealed[b];
        }
      }
      if (bCnt !== 4) continue;
      const candClues = computeMineClues(candMask);
      let match = true;
      for (let i = 0; i < 16; i++) {
        if ((revMask & (1 << i)) !== 0 && candClues[i] !== cArr[i]) {
          match = false;
          break;
        }
      }
      if (match) validWays++;
    }

    if (validWays === 1) {
      mineMask = mMask;
      initialSafeRevealedMask = revMask;
      clues = cArr;
      break;
    }
  }

  if (!mineMask) {
    const cells = seededShuffle(
      Array.from({ length: 16 }, (_, i) => i),
      rng
    );
    cells.slice(0, 4).forEach((idx) => {
      mineMask |= 1 << idx;
    });
    cells.slice(4, 13).forEach((idx) => {
      initialSafeRevealedMask |= 1 << idx;
    });
    clues = computeMineClues(mineMask);
  }

  const mineIndices = [];
  for (let i = 0; i < 16; i++) {
    if ((mineMask & (1 << i)) !== 0) mineIndices.push(i);
  }
  const bonusMineIdx = hasBoost ? mineIndices[0] : -1;

  return {
    mineMask,
    initialSafeRevealedMask,
    clues,
    mineIndices,
    bonusMineIdx,
    par: 2
  };
}

function mountMinesStage(stage, rng) {
  const puzzle = generateMinesPuzzle(rng, stage.hasBoost);
  lastMountedPuzzle = puzzle;
  setStagePar(stage, puzzle.par); // 4 hidden mines, every 2 flags = 1 turn -> Par 2

  const { mineMask, initialSafeRevealedMask, clues, bonusMineIdx } = puzzle;

  let actionMask =
    stage.savedState && typeof stage.savedState.actionMask === 'number'
      ? stage.savedState.actionMask
      : initialSafeRevealedMask;
  let halfFlags =
    stage.savedState && typeof stage.savedState.halfFlags === 'number'
      ? stage.savedState.halfFlags
      : 0;
  let bonusClaimed = Boolean(stage.savedState && stage.savedState.bonusClaimed);

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Use the revealed number clues to flag all <strong>4 hidden mines</strong> (2 flags = 1 turn; mis-flagging a safe tile wastes a move!). <span class="bonus-inline">⚡ Disarm the +2⚡ mine for +2 turns</span>`
    : 'Use the revealed number clues (8-directional) to flag all <strong>4 hidden mines</strong> (2 flags = 1 turn; mis-flagging a safe tile costs a move!).';
  setFeedback('Tap an unrevealed grey tile to plant a flag 🚩 on a mine.');

  const widget = document.createElement('div');
  widget.className = 'mini-game-widget';
  puzzleBoardMount.appendChild(widget);

  const CLUE_COLORS = MINES_CLUE_COLORS;

  function renderMines() {
    let disarmedCount = 0;
    for (let i = 0; i < 16; i++) {
      if ((mineMask & (1 << i)) !== 0 && (actionMask & (1 << i)) !== 0) disarmedCount++;
    }

    widget.innerHTML = `
      <div class="waffle-step-meter">
        Flags this turn: ${halfFlags} / 2 • Mines Disarmed: ${disarmedCount} / 4
      </div>
      <div class="grid-4x4-box" id="minesGridBox"></div>
    `;

    const gridEl = widget.querySelector('#minesGridBox');
    for (let i = 0; i < 16; i++) {
      const isActed = (actionMask & (1 << i)) !== 0;
      const isMine = (mineMask & (1 << i)) !== 0;
      const isMisflagged = isActed && !isMine && (initialSafeRevealedMask & (1 << i)) === 0;
      const showBonus = i === bonusMineIdx && !bonusClaimed && !isActed;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `mine-cell ${
        !isActed ? 'unrevealed' : isMine ? 'flagged' : isMisflagged ? 'misflagged' : ''
      }`;
      btn.disabled = isActed;

      let content = '';
      if (isActed) {
        if (isMine) {
          content = '🚩';
        } else {
          const cVal = clues[i];
          content = isMisflagged
            ? `<span title="Mis-flagged safe tile">✕${cVal}</span>`
            : `<span style="color:${CLUE_COLORS[cVal] || '#1e293b'};">${cVal}</span>`;
        }
      } else {
        content = '?';
      }

      btn.innerHTML = `
        ${showBonus ? '<span class="reactor-bonus-badge">+2⚡</span>' : ''}
        ${content}
      `;

      btn.addEventListener('click', () => {
        if (gauntletState.status !== 'in_progress' || isActed) return;
        actionMask |= 1 << i;
        halfFlags++;
        if (halfFlags >= 2) {
          halfFlags = 0;
          spendTurn(1);
        } else if (isMine) {
          playUiClick();
        } else {
          playErrorBuzz();
        }

        if (i === bonusMineIdx && isMine && !bonusClaimed) {
          bonusClaimed = true;
          grantBonusTurns(2, '⚡ Golden Mine disarmed!');
        }

        stage.savedState = { actionMask, halfFlags, bonusClaimed };
        saveStateForActiveDate();
        renderMines();

        if ((actionMask & mineMask) === mineMask) {
          setFeedback('All 4 mines safely disarmed!', 'good');
          setTimeout(() => completeCurrentStage(), 380);
          return;
        }

        if (halfFlags === 0 && checkOutOfTurnsAfterFailedMove()) return;
        setFeedback(
          isMine
            ? 'Mine disarmed! 🚩'
            : `Mis-flagged! That tile was safe (clue: ${clues[i]}) — wasted 1 move!`,
          isMine ? 'good' : 'warn'
        );
      });

      gridEl.appendChild(btn);
    }
  }

  renderMines();
}

registerMiniGame({
  id: 'mines',
  name: 'Mines',
  shortName: 'Mines',
  emoji: '💣',
  mount: mountMinesStage
});

if (typeof module !== 'undefined' && module.exports) {
  Object.assign(module.exports, {
    MINES_CLUE_COLORS,
    computeMineClues,
    generateMinesPuzzle,
    mountMinesStage
  });
}
