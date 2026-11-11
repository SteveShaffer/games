// --------------------------------------------------------------------------
// MINI-GAME 14: KNIGHT (4x4 Chess Knight Star Collector)
// --------------------------------------------------------------------------
function getKnightNeighbors(pos, rockMask = 0) {
  const r = Math.floor(pos / 4);
  const c = pos % 4;
  const jumps = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];
  const res = [];
  jumps.forEach(([dr, dc]) => {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
      const nIdx = nr * 4 + nc;
      if ((rockMask & (1 << nIdx)) === 0) res.push(nIdx);
    }
  });
  return res;
}

function solveKnightBFS(sPos, sStars, rMask) {
  const startKey = `${sPos}:0`;
  const dist = { [startKey]: 0 };
  const pathByKey = { [startKey]: [sPos] };
  const queue = [{ pos: sPos, mask: 0 }];
  let solvedDist = null;
  let winningPath = [];

  while (queue.length > 0) {
    const { pos, mask } = queue.shift();
    const curKey = `${pos}:${mask}`;
    const d = dist[curKey];
    if (mask === 7) {
      solvedDist = d;
      winningPath = pathByKey[curKey];
      break;
    }
    if (d >= 7) continue;
    for (const nxt of getKnightNeighbors(pos, rMask)) {
      let nMask = mask;
      const sIdx = sStars.indexOf(nxt);
      if (sIdx !== -1) nMask |= 1 << sIdx;
      const nk = `${nxt}:${nMask}`;
      if (dist[nk] === undefined) {
        dist[nk] = d + 1;
        pathByKey[nk] = [...pathByKey[curKey], nxt];
        queue.push({ pos: nxt, mask: nMask });
      }
    }
  }
  return { solvable: solvedDist !== null, minJumps: solvedDist ?? 0, winningPath };
}

function generateKnightPuzzle(rng, hasBoost = false) {
  let startPos = 0;
  let starIndices = [3, 6, 15];
  let rockMask = 0;
  let minJumps = 4;
  let winningPath = [];

  for (let att = 0; att < 80; att++) {
    const cells = seededShuffle(
      Array.from({ length: 16 }, (_, i) => i),
      rng
    );
    const sPos = cells[0];
    const sStars = cells.slice(1, 4);
    const sRocks = cells.slice(4, 6);
    let rMask = 0;
    sRocks.forEach((idx) => {
      rMask |= 1 << idx;
    });

    const res = solveKnightBFS(sPos, sStars, rMask);
    if (res.solvable && res.minJumps >= 4 && res.minJumps <= 6) {
      startPos = sPos;
      starIndices = sStars;
      rockMask = rMask;
      minJumps = res.minJumps;
      winningPath = res.winningPath;
      break;
    }
  }

  const firstValidJumps = getKnightNeighbors(startPos, rockMask);
  const bonusSq =
    hasBoost && winningPath.length > 1
      ? winningPath[1]
      : hasBoost && firstValidJumps.length > 0
      ? firstValidJumps[0]
      : -1;

  return {
    startPos,
    starIndices,
    rockMask,
    minJumps,
    bonusSq,
    winningPath,
    par: Math.ceil(minJumps / 2)
  };
}

function mountKnightStage(stage, rng) {
  const puzzle = generateKnightPuzzle(rng, stage.hasBoost);
  lastMountedPuzzle = puzzle;
  setStagePar(stage, puzzle.par);

  const { startPos, starIndices, rockMask, minJumps, bonusSq } = puzzle;

  let knightPos =
    stage.savedState && typeof stage.savedState.knightPos === 'number'
      ? stage.savedState.knightPos
      : startPos;
  let starsMask =
    stage.savedState && typeof stage.savedState.starsMask === 'number'
      ? stage.savedState.starsMask
      : 0;
  let halfJumps =
    stage.savedState && typeof stage.savedState.halfJumps === 'number'
      ? stage.savedState.halfJumps
      : 0;
  let bonusClaimed = Boolean(stage.savedState && stage.savedState.bonusClaimed);

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Jump the Knight <strong>♞</strong> in L-shapes to collect all <strong>3 ⭐ stars</strong> (2 jumps = 1 turn). <span class="bonus-inline">⚡ Land on +2⚡ for +2 turns</span>`
    : 'Jump the Knight <strong>♞</strong> in L-shapes to collect all <strong>3 ⭐ stars</strong> avoiding rocks 🪨 (every 2 jumps = 1 turn).';
  setFeedback('Tap any green highlighted square to make an L-jump.');

  const widget = document.createElement('div');
  widget.className = 'mini-game-widget';
  puzzleBoardMount.appendChild(widget);

  function renderKnight() {
    const validNeighbors = new Set(getKnightNeighbors(knightPos, rockMask));
    const collectedCount = [0, 1, 2].filter((b) => (starsMask & (1 << b)) !== 0).length;

    widget.innerHTML = `
      <div class="waffle-step-meter">
        Jumps this turn: ${halfJumps} / 2 • Stars: ${collectedCount} / 3
      </div>
      <div class="chess-board" id="knightGridBox"></div>
    `;

    const boardEl = widget.querySelector('#knightGridBox');
    for (let sq = 0; sq < 16; sq++) {
      const r = Math.floor(sq / 4);
      const c = sq % 4;
      const isLight = (r + c) % 2 === 0;
      const isKnight = sq === knightPos;
      const isRock = (rockMask & (1 << sq)) !== 0;
      const starIdx = starIndices.indexOf(sq);
      const hasStar = starIdx !== -1 && (starsMask & (1 << starIdx)) === 0;
      const isValid = validNeighbors.has(sq);
      const showBonus = sq === bonusSq && !bonusClaimed && !isKnight;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `chess-sq ${isLight ? 'light' : 'dark'} ${isKnight ? 'selected' : ''} ${
        isValid ? 'valid-move' : ''
      }`;

      let sym = '';
      if (isKnight) sym = '♞';
      else if (isRock) sym = '🪨';
      else if (hasStar) sym = '⭐';

      btn.innerHTML = `
        ${showBonus ? '<span class="reactor-bonus-badge">+2⚡</span>' : ''}
        <span>${sym}</span>
      `;

      btn.addEventListener('click', () => {
        if (gauntletState.status !== 'in_progress' || !isValid) return;
        knightPos = sq;
        if (starIdx !== -1) {
          starsMask |= 1 << starIdx;
        }

        halfJumps++;
        if (halfJumps >= 2) {
          halfJumps = 0;
          spendTurn(1);
        } else {
          playUiClick();
        }

        if (sq === bonusSq && !bonusClaimed) {
          bonusClaimed = true;
          grantBonusTurns(2, '⚡ Golden Knight jump collected!');
        }

        stage.savedState = { knightPos, starsMask, halfJumps, bonusClaimed };
        saveStateForActiveDate();
        renderKnight();

        if (starsMask === 7) {
          setFeedback('All 3 stars collected!', 'good');
          setTimeout(() => completeCurrentStage(), 380);
          return;
        }

        if (halfJumps === 0) {
          checkOutOfTurnsAfterFailedMove();
        }
      });

      boardEl.appendChild(btn);
    }
  }

  renderKnight();
}

registerMiniGame({
  id: 'knight',
  name: 'Knight',
  shortName: 'Knight',
  emoji: '♞',
  mount: mountKnightStage
});

if (typeof module !== 'undefined' && module.exports) {
  Object.assign(module.exports, {
    getKnightNeighbors,
    solveKnightBFS,
    generateKnightPuzzle,
    mountKnightStage
  });
}
