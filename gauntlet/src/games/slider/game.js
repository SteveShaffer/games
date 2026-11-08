// --------------------------------------------------------------------------
// MINI-GAME 5: TILE SLIDE (3x3 Number Slider)
// --------------------------------------------------------------------------
function getSliderNeighbors(idx) {
  const r = Math.floor(idx / 3);
  const c = idx % 3;
  const list = [];
  if (r > 0) list.push((r - 1) * 3 + c);
  if (r < 2) list.push((r + 1) * 3 + c);
  if (c > 0) list.push(r * 3 + (c - 1));
  if (c < 2) list.push(r * 3 + (c + 1));
  return list;
}

function findMinSliderMoves(startTiles) {
  const goalKey = '1,2,3,4,5,6,7,8,0';
  const startKey = startTiles.join(',');
  if (startKey === goalKey) return 0;
  const dist = { [startKey]: 0 };
  const queue = [startTiles.slice()];
  while (queue.length > 0) {
    const cur = queue.shift();
    const curKey = cur.join(',');
    const d = dist[curKey];
    if (d >= 12) continue;
    const z = cur.indexOf(0);
    for (const nb of getSliderNeighbors(z)) {
      const nxt = cur.slice();
      nxt[z] = nxt[nb];
      nxt[nb] = 0;
      const nKey = nxt.join(',');
      if (nKey === goalKey) return d + 1;
      if (dist[nKey] === undefined) {
        dist[nKey] = d + 1;
        queue.push(nxt);
      }
    }
  }
  return 8;
}

function generateSliderPuzzle(rng, hasBoost = false) {
  const tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  let emptyIdx = 8;
  let minSliderMoves = 6;
  for (let attempt = 0; attempt < 32; attempt++) {
    const cand = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    let curEmpty = 8;
    let prevEmpty = -1;
    const scrambleSteps = 7 + Math.floor(rng() * 4); // 7, 8, 9, or 10 steps (unlocks both even & odd empty positions)
    for (let step = 0; step < scrambleSteps; step++) {
      const neighbors = getSliderNeighbors(curEmpty).filter((n) => n !== prevEmpty);
      const pick = neighbors[Math.floor(rng() * neighbors.length)];
      cand[curEmpty] = cand[pick];
      cand[pick] = 0;
      prevEmpty = curEmpty;
      curEmpty = pick;
    }
    const d = findMinSliderMoves(cand);
    for (let i = 0; i < 9; i++) tiles[i] = cand[i];
    emptyIdx = curEmpty;
    minSliderMoves = d;
    if (d >= 5 && d <= 8) break;
  }

  const par = Math.max(1, Math.ceil(minSliderMoves / 2));
  const displacedTiles = tiles.filter((val, idx) => val !== 0 && val !== idx + 1);
  const bonusTileNum = hasBoost
    ? displacedTiles.length > 0
      ? displacedTiles[0]
      : 8
    : null;

  return { tiles, emptyIdx, minSliderMoves, bonusTileNum, par };
}

function mountSliderStage(stage, rng) {
  const puzzle = generateSliderPuzzle(rng, stage.hasBoost);
  lastMountedPuzzle = puzzle;
  const tiles = puzzle.tiles.slice();
  let emptyIdx = puzzle.emptyIdx;
  const getNeighbors = getSliderNeighbors;
  setStagePar(stage, puzzle.par);
  const bonusTileNum = puzzle.bonusTileNum;
  let bonusClaimed = Boolean(stage.savedState && stage.savedState.bonusClaimed);
  let halfStepCount = stage.savedState && typeof stage.savedState.halfStepCount === 'number'
    ? stage.savedState.halfStepCount
    : 0;
  if (stage.savedState && Array.isArray(stage.savedState.tiles) && stage.savedState.tiles.length === 9) {
    for (let i = 0; i < 9; i++) tiles[i] = stage.savedState.tiles[i];
    emptyIdx = tiles.indexOf(0);
  }

  currentPuzzleDesc.innerHTML = bonusTileNum
    ? `Order tiles <strong>1–8</strong> (every 2 slides = 1 turn). <span class="bonus-inline">⚡ Place #${bonusTileNum} home for +2 turns</span>`
    : 'Order tiles <strong>1–8</strong> with empty space at bottom-right (every 2 slides = 1 turn).';
  setFeedback('Tap any tile next to the empty space to slide it.');

  const wrapper = document.createElement('div');
  wrapper.className = 'slider-wrapper';
  puzzleBoardMount.appendChild(wrapper);

  function isSolved() {
    for (let i = 0; i < 8; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[8] === 0;
  }

  function trySlideTileAt(idx) {
    if (gauntletState.status !== 'in_progress') return;
    const neighbors = getNeighbors(emptyIdx);
    if (!neighbors.includes(idx)) return;

    const movedTileVal = tiles[idx];
    const targetSlotIdx = emptyIdx;
    tiles[emptyIdx] = movedTileVal;
    tiles[idx] = 0;
    emptyIdx = idx;

    halfStepCount++;
    if (halfStepCount >= 2) {
      halfStepCount = 0;
      spendTurn(1);
    } else {
      playUiClick();
    }

    if (bonusTileNum && !bonusClaimed && movedTileVal === bonusTileNum && targetSlotIdx === bonusTileNum - 1) {
      bonusClaimed = true;
      grantBonusTurns(2, `⚡ Tile #${bonusTileNum} placed!`);
    }

    stage.savedState = {
      tiles: tiles.slice(),
      emptyIdx,
      halfStepCount,
      bonusClaimed
    };
    saveStateForActiveDate();

    renderSlider();

    if (isSolved()) {
      setFeedback('Tiles aligned 1–8!', 'good');
      setTimeout(() => completeCurrentStage(), 380);
      return;
    }

    checkOutOfTurnsAfterFailedMove();
  }

  function renderSlider() {
    const movableSet = new Set(getNeighbors(emptyIdx));
    wrapper.innerHTML = `
      <div class="slider-step-meter">
        Slides this turn: ${halfStepCount} / 2
      </div>
      <div class="slider-grid" id="sliderGridBox"></div>
    `;
    const gridBox = wrapper.querySelector('#sliderGridBox');
    tiles.forEach((val, idx) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      if (val === 0) {
        cell.className = 'slider-tile empty';
        cell.disabled = true;
      } else {
        const inPlace = val === idx + 1;
        const isMovable = movableSet.has(idx);
        cell.className = `slider-tile ${inPlace ? 'in-place' : ''} ${isMovable ? 'movable' : ''}`;
        const bonusBadge =
          val === bonusTileNum && !bonusClaimed
            ? '<span style="font-size:0.55rem;color:var(--bonus-gold);font-weight:800;">+2⚡</span>'
            : '';
        cell.innerHTML = `<span>${val}</span>${bonusBadge}`;
        cell.addEventListener('click', () => trySlideTileAt(idx));
      }
      gridBox.appendChild(cell);
    });
  }

  renderSlider();
}

registerMiniGame({
  id: 'slider',
  name: 'Slide',
  shortName: 'Slide',
  emoji: '🔢',
  mount: mountSliderStage
});
