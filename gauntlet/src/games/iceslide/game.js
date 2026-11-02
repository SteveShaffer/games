// --------------------------------------------------------------------------
// MINI-GAME 10: ICE SLIDE v2 (6x6 Rink with Cracked Ice & Interior Goal)
// --------------------------------------------------------------------------
function mountIceSlideStage(stage, rng) {
  const SIZE = 6;

  // Simulate sliding from idx in direction (dr, dc) given rock walls and cracked ice mask
  function simulateSlide(rockWalls, crackedList, frozenMask, startIdx, dr, dc) {
    let cr = Math.floor(startIdx / SIZE);
    let cc = startIdx % SIZE;
    let nextMask = frozenMask;
    const path = [];

    while (true) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
      const nIdx = nr * SIZE + nc;
      if (rockWalls[nIdx]) break;
      const cPos = crackedList.indexOf(nIdx);
      if (cPos !== -1 && (frozenMask & (1 << cPos)) !== 0) {
        // Cracked ice already froze into a rock barrier!
        break;
      }
      cr = nr;
      cc = nc;
      path.push(nIdx);
      if (cPos !== -1) {
        // Sliding onto/over cracked ice freezes it into a rock after this slide
        nextMask |= 1 << cPos;
      }
    }
    return { endIdx: cr * SIZE + cc, nextMask, path };
  }

  // Generate a 6x6 rink with 6 rocks + 2 cracked ice tiles where the goal is an INTERIOR tile
  // reachable only in 5-7 slides (every 2 slides = 1 turn)
  let rockWalls = Array(SIZE * SIZE).fill(false);
  let crackedList = [];
  let startIdx = 0;
  let goalIdx = 14;
  let bonusIdx = -1;
  let minSlidesToGoal = 6;

  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  for (let attempt = 0; attempt < 90; attempt++) {
    const candidateRocks = Array(SIZE * SIZE).fill(false);
    const allCells = seededShuffle(
      Array.from({ length: SIZE * SIZE }, (_, i) => i),
      rng
    );
    const sIdx = allCells[0];
    const rocks = allCells.slice(1, 7); // 6 rocks
    rocks.forEach((w) => {
      candidateRocks[w] = true;
    });
    // Pick 2 interior cells as cracked ice tiles (❄️ -> 🪨 after sliding across)
    const interiorFree = allCells
      .slice(7)
      .filter((idx) => {
        const r = Math.floor(idx / SIZE);
        const c = idx % SIZE;
        return r >= 1 && r <= SIZE - 2 && c >= 1 && c <= SIZE - 2;
      });
    const candCracked = interiorFree.slice(0, 2);

    // State-space BFS over (playerIdx, frozenMask)
    const startKey = `${sIdx}:0`;
    const dist = { [startKey]: 0 };
    const minSlidesToStopAtCell = { [sIdx]: 0 };
    const queue = [{ idx: sIdx, mask: 0 }];

    while (queue.length > 0) {
      const { idx, mask } = queue.shift();
      const d = dist[`${idx}:${mask}`];
      if (d >= 7) continue;

      for (const [dr, dc] of dirs) {
        const { endIdx, nextMask } = simulateSlide(
          candidateRocks,
          candCracked,
          mask,
          idx,
          dr,
          dc
        );
        if (endIdx === idx) continue;
        const nKey = `${endIdx}:${nextMask}`;
        if (dist[nKey] === undefined) {
          dist[nKey] = d + 1;
          if (
            minSlidesToStopAtCell[endIdx] === undefined ||
            d + 1 < minSlidesToStopAtCell[endIdx]
          ) {
            minSlidesToStopAtCell[endIdx] = d + 1;
          }
          queue.push({ idx: endIdx, mask: nextMask });
        }
      }
    }

    // Prefer interior goals that require 5 to 7 slides to STOP on (and aren't cracked ice)
    const goodGoals = Object.keys(minSlidesToStopAtCell)
      .map(Number)
      .filter((cell) => {
        const d = minSlidesToStopAtCell[cell];
        const r = Math.floor(cell / SIZE);
        const c = cell % SIZE;
        const isInterior = r >= 1 && r <= SIZE - 2 && c >= 1 && c <= SIZE - 2;
        return d >= 5 && d <= 7 && isInterior && !candCracked.includes(cell);
      });

    const fallbackGoals = Object.keys(minSlidesToStopAtCell)
      .map(Number)
      .filter((cell) => {
        const d = minSlidesToStopAtCell[cell];
        return d >= 4 && d <= 7 && !candCracked.includes(cell);
      });

    const chosenPool = goodGoals.length > 0 ? goodGoals : fallbackGoals;
    if (chosenPool.length > 0) {
      rockWalls = candidateRocks;
      crackedList = candCracked;
      startIdx = sIdx;
      goalIdx = chosenPool[0];
      minSlidesToGoal = minSlidesToStopAtCell[goalIdx] || 6;
      if (stage.hasBoost) {
        const bonusPool = Object.keys(minSlidesToStopAtCell)
          .map(Number)
          .filter(
            (cell) =>
              cell !== startIdx &&
              cell !== goalIdx &&
              !candCracked.includes(cell) &&
              minSlidesToStopAtCell[cell] >= 2
          );
        if (bonusPool.length > 0) {
          bonusIdx = bonusPool[bonusPool.length - 1];
        }
      }
      break;
    }
  }

  setStagePar(stage, Math.max(1, Math.ceil(minSlidesToGoal / 2)));

  let playerIdx = stage.savedState && typeof stage.savedState.playerIdx === 'number'
    ? stage.savedState.playerIdx
    : startIdx;
  let frozenMask = stage.savedState && typeof stage.savedState.frozenMask === 'number'
    ? stage.savedState.frozenMask
    : 0;
  let halfSlides = stage.savedState && typeof stage.savedState.halfSlides === 'number'
    ? stage.savedState.halfSlides
    : 0;
  let bonusClaimed = Boolean(stage.savedState && stage.savedState.bonusClaimed);

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Stop on 🏁 (every 2 slides = 1 turn). Cracked ice ❄️ freezes into rock 🪨 after you slide across it! <span class="bonus-inline">⚡ Slide over ⚡ for +2 turns</span>`
    : 'Stop on 🏁 (every 2 slides = 1 turn). Cracked ice ❄️ freezes into a solid rock 🪨 after you slide across it!';
  setFeedback('Sliding across 🏁 glides right past unless a wall or rock stops you on it.');

  const widget = document.createElement('div');
  widget.className = 'ice-widget';
  puzzleBoardMount.appendChild(widget);

  function resetRinkPosition() {
    if (gauntletState.status !== 'in_progress') return;
    if (playerIdx === startIdx && frozenMask === 0) return;
    playerIdx = startIdx;
    frozenMask = 0;
    halfSlides = 0;
    spendTurn(1);
    stage.savedState = { playerIdx, frozenMask, halfSlides, bonusClaimed };
    saveStateForActiveDate();
    renderIce();
    if (!checkOutOfTurnsAfterFailedMove()) {
      setFeedback('Rink reset to start position (cost 1⚡).', 'info');
    }
  }

  function moveDir(dr, dc) {
    if (gauntletState.status !== 'in_progress') return;
    const { endIdx, nextMask, path } = simulateSlide(
      rockWalls,
      crackedList,
      frozenMask,
      playerIdx,
      dr,
      dc
    );
    if (endIdx === playerIdx) {
      playErrorBuzz();
      return;
    }

    playerIdx = endIdx;
    frozenMask = nextMask;

    halfSlides++;
    if (halfSlides >= 2) {
      halfSlides = 0;
      spendTurn(1);
    } else {
      playUiClick();
    }

    if (bonusIdx !== -1 && !bonusClaimed && path.includes(bonusIdx)) {
      bonusClaimed = true;
      grantBonusTurns(2, '⚡ Ice Boost collected!');
    }

    stage.savedState = { playerIdx, frozenMask, halfSlides, bonusClaimed };
    saveStateForActiveDate();

    renderIce();

    if (playerIdx === goalIdx) {
      setFeedback('Stopped right on the goal flag!', 'good');
      setTimeout(() => completeCurrentStage(), 380);
      return;
    }

    if (halfSlides === 0) {
      if (!checkOutOfTurnsAfterFailedMove()) {
        if (path.includes(goalIdx)) {
          setFeedback('You slid right past 🏁! Use a rock or frozen ❄️ stopper to halt on it.', 'warn');
        }
      }
    } else if (path.includes(goalIdx)) {
      setFeedback('You slid right past 🏁! Find a stopper to halt on it.', 'warn');
    }
  }

  function renderIce() {
    widget.innerHTML = `
      <div class="waffle-step-meter">
        Slides this turn: ${halfSlides} / 2
        <button type="button" id="iceResetBtn" style="margin-left:8px;background:none;border:1px solid var(--border-color);border-radius:4px;padding:1px 6px;font-size:0.65rem;cursor:pointer;color:var(--text-muted);">↺ Reset Rink (1⚡)</button>
      </div>
      <div class="ice-board" id="iceBoardGrid"></div>
      <div class="ice-dpad">
        <div></div>
        <button type="button" class="dpad-btn" data-dir="up">▲</button>
        <div></div>
        <button type="button" class="dpad-btn" data-dir="left">◀</button>
        <button type="button" class="dpad-btn" data-dir="down">▼</button>
        <button type="button" class="dpad-btn" data-dir="right">▶</button>
      </div>
    `;

    const boardEl = widget.querySelector('#iceBoardGrid');
    const pr = Math.floor(playerIdx / SIZE);
    const pc = playerIdx % SIZE;

    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = document.createElement('div');
      const cPos = crackedList.indexOf(i);
      const isFrozenCracked = cPos !== -1 && (frozenMask & (1 << cPos)) !== 0;
      const isCracked = cPos !== -1 && !isFrozenCracked;
      const isWall = rockWalls[i] || isFrozenCracked;
      const isPlayer = i === playerIdx;
      const isGoal = i === goalIdx;
      const isBonus = i === bonusIdx && !bonusClaimed;

      cell.className = `ice-cell ${isWall ? 'wall' : ''} ${isCracked ? 'cracked' : ''} ${
        isGoal ? 'goal' : ''
      } ${isPlayer ? 'player' : ''}`;

      if (isPlayer) cell.textContent = '●';
      else if (isWall) cell.textContent = '🪨';
      else if (isGoal) cell.textContent = '🏁';
      else if (isBonus) cell.textContent = '⚡';
      else if (isCracked) cell.textContent = '❄️';

      cell.addEventListener('click', () => {
        const r = Math.floor(i / SIZE);
        const c = i % SIZE;
        if (r === pr && c < pc) moveDir(0, -1);
        else if (r === pr && c > pc) moveDir(0, 1);
        else if (c === pc && r < pr) moveDir(-1, 0);
        else if (c === pc && r > pr) moveDir(1, 0);
      });

      boardEl.appendChild(cell);
    }

    widget.querySelector('#iceResetBtn').addEventListener('click', resetRinkPosition);

    widget.querySelectorAll('.dpad-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = btn.getAttribute('data-dir');
        if (d === 'up') moveDir(-1, 0);
        if (d === 'down') moveDir(1, 0);
        if (d === 'left') moveDir(0, -1);
        if (d === 'right') moveDir(0, 1);
      });
    });
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      moveDir(-1, 0);
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      moveDir(1, 0);
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      moveDir(0, -1);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      moveDir(0, 1);
    }
  }

  window.addEventListener('keydown', onKeyDown);
  activeCleanupFn = () => window.removeEventListener('keydown', onKeyDown);

  renderIce();
}

registerMiniGame({
  id: 'iceslide',
  name: 'Ice',
  shortName: 'Ice',
  emoji: '🧊',
  mount: mountIceSlideStage
});
