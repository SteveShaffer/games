// --------------------------------------------------------------------------
// MINI-GAME 11: CHESS (4x4 Tactical Royal Capture)
// --------------------------------------------------------------------------
const CHESS_PIECE_ICONS = {
  WN: '♘',
  WR: '♖',
  WB: '♗',
  BK: '♚',
  BR: '♜',
  BB: '♝',
  BN: '♞'
};

function getLegalChessMovesForPiece(type, pos, occupiedMap) {
  const r = Math.floor(pos / 4);
  const c = pos % 4;
  const moves = [];
  if (type === 'N') {
    const jumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    jumps.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
        moves.push(nr * 4 + nc);
      }
    });
  } else if (type === 'R' || type === 'B') {
    const dirs =
      type === 'R'
        ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
        : [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    dirs.forEach(([dr, dc]) => {
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
        const idx = nr * 4 + nc;
        moves.push(idx);
        if (occupiedMap[idx]) break;
        nr += dr;
        nc += dc;
      }
    });
  }
  return moves;
}

function computeBlackDangerSet(whiteList, blackList) {
  const occ = {};
  whiteList.forEach((w) => {
    occ[w.pos] = 'W';
  });
  blackList.forEach((b) => {
    if (b.alive) occ[b.pos] = 'B';
  });
  const danger = new Set();
  blackList.forEach((b) => {
    if (!b.alive || b.type === 'K') return;
    const attacked = getLegalChessMovesForPiece(b.type, b.pos, occ);
    attacked.forEach((sq) => danger.add(sq));
  });
  return danger;
}

function getSafeWhiteMoves(whiteList, blackList, wIdx) {
  const w = whiteList[wIdx];
  const occ = {};
  whiteList.forEach((wp) => {
    occ[wp.pos] = 'W';
  });
  blackList.forEach((bp) => {
    if (bp.alive) occ[bp.pos] = 'B';
  });
  const rawMoves = getLegalChessMovesForPiece(w.type, w.pos, occ);
  return rawMoves.filter((dest) => {
    if (whiteList.some((other, idx) => idx !== wIdx && other.pos === dest)) return false;
    const simWhite = whiteList.map((item, idx) =>
      idx === wIdx ? { ...item, pos: dest } : { ...item }
    );
    const simBlack = blackList.map((item) =>
      item.alive && item.pos === dest ? { ...item, alive: false } : { ...item }
    );
    const dangerAfter = computeBlackDangerSet(simWhite, simBlack);
    return !dangerAfter.has(dest);
  });
}

function solveChessBFS(initWhite, initBlack) {
  const encode = (wL, bL) =>
    `${wL.map((w) => w.pos).join(',')}|${bL.map((b) => (b.alive ? 1 : 0)).join('')}`;
  const startKey = encode(initWhite, initBlack);
  const dist = { [startKey]: 0 };
  const movesByKey = { [startKey]: [] };
  const queue = [{ wL: initWhite, bL: initBlack }];

  while (queue.length > 0) {
    const { wL, bL } = queue.shift();
    const k = encode(wL, bL);
    const d = dist[k];
    const king = bL.find((b) => b.type === 'K');
    if (!king.alive) {
      return {
        solvable: true,
        minMoves: d,
        moves: movesByKey[k],
        pathSquares: movesByKey[k].map((m) => m.dest)
      };
    }
    if (d >= 4) continue;
    for (let wi = 0; wi < wL.length; wi++) {
      const safeDests = getSafeWhiteMoves(wL, bL, wi);
      for (const dest of safeDests) {
        const nextW = wL.map((item, idx) =>
          idx === wi ? { ...item, pos: dest } : { ...item }
        );
        const nextB = bL.map((item) =>
          item.alive && item.pos === dest ? { ...item, alive: false } : { ...item }
        );
        const nk = encode(nextW, nextB);
        if (dist[nk] === undefined) {
          dist[nk] = d + 1;
          movesByKey[nk] = [...movesByKey[k], { whiteIdx: wi, dest }];
          queue.push({ wL: nextW, bL: nextB });
        }
      }
    }
  }
  return { solvable: false, minMoves: 3, moves: [], pathSquares: [] };
}

function generateChessPuzzle(rng, hasBoost = false) {
  let initialWhite = [];
  let initialBlack = [];
  let minMoves = 2;
  let bonusSq = -1;
  let winningMoves = [];

  for (let att = 0; att < 120; att++) {
    const cells = seededShuffle(
      Array.from({ length: 16 }, (_, i) => i),
      rng
    );
    const wTypes = rng() < 0.5 ? ['N', 'R'] : ['N', 'B'];
    const bTypes = ['K', rng() < 0.5 ? 'R' : 'B', 'N'];
    const candW = [
      { id: 0, type: wTypes[0], pos: cells[0] },
      { id: 1, type: wTypes[1], pos: cells[1] }
    ];
    const candB = [
      { id: 0, type: 'K', pos: cells[2], alive: true },
      { id: 1, type: bTypes[1], pos: cells[3], alive: true },
      { id: 2, type: bTypes[2], pos: cells[4], alive: true }
    ];
    // Ensure white pieces don't start on a square already attacked by black
    const startDanger = computeBlackDangerSet(candW, candB);
    if (startDanger.has(candW[0].pos) || startDanger.has(candW[1].pos)) continue;

    const res = solveChessBFS(candW, candB);
    if (res.solvable && res.minMoves >= 2 && res.minMoves <= 3) {
      initialWhite = candW;
      initialBlack = candB;
      minMoves = res.minMoves;
      winningMoves = res.moves;
      if (hasBoost && res.pathSquares.length > 0) {
        bonusSq = res.pathSquares[0];
      }
      break;
    }
  }

  if (initialWhite.length === 0) {
    initialWhite = [
      { id: 0, type: 'N', pos: 12 },
      { id: 1, type: 'R', pos: 15 }
    ];
    initialBlack = [
      { id: 0, type: 'K', pos: 3, alive: true },
      { id: 1, type: 'R', pos: 2, alive: true },
      { id: 2, type: 'B', pos: 5, alive: true }
    ];
    minMoves = 2;
    winningMoves = [
      { whiteIdx: 0, dest: 6 },
      { whiteIdx: 0, dest: 3 }
    ];
    if (hasBoost) bonusSq = 6;
  }

  return {
    initialWhite,
    initialBlack,
    minMoves,
    bonusSq,
    winningMoves,
    pathSquares: winningMoves.map((m) => m.dest),
    par: minMoves
  };
}

function mountChessStage(stage, rng) {
  const PIECE_ICONS = CHESS_PIECE_ICONS;
  const puzzle = generateChessPuzzle(rng, stage.hasBoost);
  lastMountedPuzzle = puzzle;
  setStagePar(stage, puzzle.par);

  const { initialWhite, initialBlack, minMoves, bonusSq } = puzzle;

  let whitePieces =
    stage.savedState && Array.isArray(stage.savedState.whitePieces)
      ? stage.savedState.whitePieces.map((w) => ({ ...w }))
      : initialWhite.map((w) => ({ ...w }));
  let blackPieces =
    stage.savedState && Array.isArray(stage.savedState.blackPieces)
      ? stage.savedState.blackPieces.map((b) => ({ ...b }))
      : initialBlack.map((b) => ({ ...b }));
  let bonusClaimed = Boolean(stage.savedState && stage.savedState.bonusClaimed);
  let selectedWhiteIdx = 0;

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Capture the Black King <strong>♚</strong> (1 move = 1 turn). Avoid red guarded squares (<strong>×</strong>) or capture the guard first! <span class="bonus-inline">⚡ Land on +2⚡ for bonus turns</span>`
    : 'Move your White pieces (♘/♖/♗) to capture the Black King <strong>♚</strong> (1 move = 1 turn). You cannot move onto red guarded squares (<strong>×</strong>).';
  setFeedback('Tap one of your White pieces, then tap a green highlighted square.');

  const widget = document.createElement('div');
  widget.className = 'mini-game-widget';
  puzzleBoardMount.appendChild(widget);

  function renderChess() {
    const dangerSet = computeBlackDangerSet(whitePieces, blackPieces);
    const validMoves = new Set(getSafeWhiteMoves(whitePieces, blackPieces, selectedWhiteIdx));

    widget.innerHTML = `
      <div class="waffle-step-meter">
        Goal: Capture ♚ in ${minMoves} moves
        <button type="button" id="chessResetBtn" style="margin-left:8px;background:none;border:1px solid var(--border-mid);border-radius:4px;padding:1px 6px;font-size:0.65rem;cursor:pointer;color:var(--text-muted);">↺ Reset</button>
      </div>
      <div class="chess-board" id="chessBoardGrid"></div>
    `;

    const boardEl = widget.querySelector('#chessBoardGrid');
    for (let sq = 0; sq < 16; sq++) {
      const r = Math.floor(sq / 4);
      const c = sq % 4;
      const isLight = (r + c) % 2 === 0;
      const wIdx = whitePieces.findIndex((w) => w.pos === sq);
      const bPiece = blackPieces.find((b) => b.alive && b.pos === sq);
      const isSel = wIdx === selectedWhiteIdx;
      const isValidDest = validMoves.has(sq);
      const isDanger = dangerSet.has(sq) && !isValidDest;
      const showBonus = sq === bonusSq && !bonusClaimed;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `chess-sq ${isLight ? 'light' : 'dark'} ${isSel ? 'selected' : ''} ${
        isValidDest ? 'valid-move' : ''
      } ${isDanger ? 'danger-zone' : ''}`;

      let iconHtml = '';
      if (wIdx !== -1) {
        iconHtml = `<span class="chess-piece-white">${PIECE_ICONS['W' + whitePieces[wIdx].type]}</span>`;
      } else if (bPiece) {
        iconHtml = `<span class="chess-piece-black">${PIECE_ICONS['B' + bPiece.type]}</span>`;
      }

      btn.innerHTML = `
        ${showBonus ? '<span class="reactor-bonus-badge">+2⚡</span>' : ''}
        ${iconHtml}
      `;

      btn.addEventListener('click', () => {
        if (gauntletState.status !== 'in_progress') return;
        if (wIdx !== -1) {
          playUiClick();
          selectedWhiteIdx = wIdx;
          renderChess();
          return;
        }
        if (!isValidDest) {
          if (dangerSet.has(sq)) {
            playErrorBuzz();
            setFeedback('That square is guarded by a Black piece!', 'warn');
          }
          return;
        }

        whitePieces[selectedWhiteIdx].pos = sq;
        let capturedPiece = null;
        blackPieces.forEach((b) => {
          if (b.alive && b.pos === sq) {
            b.alive = false;
            capturedPiece = b;
          }
        });

        spendTurn(1);

        if (sq === bonusSq && !bonusClaimed) {
          bonusClaimed = true;
          grantBonusTurns(2, '⚡ Golden Chess Square captured!');
        }

        stage.savedState = {
          whitePieces: whitePieces.map((w) => ({ ...w })),
          blackPieces: blackPieces.map((b) => ({ ...b })),
          bonusClaimed
        };
        saveStateForActiveDate();
        renderChess();

        if (capturedPiece && capturedPiece.type === 'K') {
          setFeedback('Checkmate! Black King captured!', 'good');
          setTimeout(() => completeCurrentStage(), 380);
          return;
        }

        if (!checkOutOfTurnsAfterFailedMove()) {
          if (capturedPiece) {
            setFeedback(`Captured Black ${PIECE_ICONS['B' + capturedPiece.type]}! Now strike ♚.`, 'good');
          } else {
            setFeedback('Piece repositioned — aim for ♚.', 'info');
          }
        }
      });

      boardEl.appendChild(btn);
    }

    widget.querySelector('#chessResetBtn').addEventListener('click', () => {
      playUiClick();
      whitePieces = initialWhite.map((w) => ({ ...w }));
      blackPieces = initialBlack.map((b) => ({ ...b }));
      selectedWhiteIdx = 0;
      stage.savedState = {
        whitePieces: whitePieces.map((w) => ({ ...w })),
        blackPieces: blackPieces.map((b) => ({ ...b })),
        bonusClaimed
      };
      saveStateForActiveDate();
      renderChess();
      setFeedback('Board reset to starting position.', 'info');
    });
  }

  renderChess();
}

registerMiniGame({
  id: 'chess',
  name: 'Chess',
  shortName: 'Chess',
  emoji: '♟️',
  mount: mountChessStage
});

if (typeof module !== 'undefined' && module.exports) {
  Object.assign(module.exports, {
    CHESS_PIECE_ICONS,
    getLegalChessMovesForPiece,
    computeBlackDangerSet,
    getSafeWhiteMoves,
    solveChessBFS,
    generateChessPuzzle,
    mountChessStage
  });
}
