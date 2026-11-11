// --------------------------------------------------------------------------
// MINI-GAME 2: DIGITS (Make the Target Number — Replaces Sonar Ping!)
// --------------------------------------------------------------------------
function findMinDigitsOps(nums, target) {
  if (nums.includes(target)) return 1;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      const a = Math.max(nums[i], nums[j]);
      const b = Math.min(nums[i], nums[j]);
      if (
        a + b === target ||
        a - b === target ||
        a * b === target ||
        (b > 0 && a % b === 0 && a / b === target)
      ) {
        return 1;
      }
    }
  }
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      const a = Math.max(nums[i], nums[j]);
      const b = Math.min(nums[i], nums[j]);
      const cands = [a + b, a * b];
      if (a - b > 0) cands.push(a - b);
      if (b > 0 && a % b === 0) cands.push(a / b);
      const rest = nums.filter((_, idx) => idx !== i && idx !== j);
      for (const val of cands) {
        const nextNums = [...rest, val];
        for (let x = 0; x < nextNums.length; x++) {
          for (let y = x + 1; y < nextNums.length; y++) {
            const p = Math.max(nextNums[x], nextNums[y]);
            const q = Math.min(nextNums[x], nextNums[y]);
            if (
              p + q === target ||
              p - q === target ||
              p * q === target ||
              (q > 0 && p % q === 0 && p / q === target)
            ) {
              return 2;
            }
          }
        }
      }
    }
  }
  return 3;
}

function generateDigitsPuzzle(rng, hasBoost = false) {
  // Generate 5 starting numbers and construct a guaranteed 2-3 step target
  const smallPool = seededShuffle([2, 3, 4, 5, 6, 7, 8, 9], rng);
  const bigPool = seededShuffle([10, 12, 15, 20, 25], rng);
  const baseNumbers = [smallPool[0], smallPool[1], smallPool[2], smallPool[3], bigPool[0]].sort(
    (a, b) => a - b
  );

  // Deterministically simulate 3 operations on a copy to pick a clean target (between 35 and 240)
  let targetNumber = 0;
  let bonusSourceIndex = 2;

  for (let attempt = 0; attempt < 25; attempt++) {
    let sim = baseNumbers.map((val, idx) => ({ val, hasBonus: idx === 2 }));
    bonusSourceIndex = 2;
    for (let step = 0; step < 3; step++) {
      const idxA = Math.floor(rng() * sim.length);
      let idxB = Math.floor(rng() * (sim.length - 1));
      if (idxB >= idxA) idxB++;
      const itemA = sim[idxA];
      const itemB = sim[idxB];
      const big = itemA.val >= itemB.val ? itemA : itemB;
      const small = itemA.val >= itemB.val ? itemB : itemA;

      const ops = ['+', '+'];
      if (big.val - small.val > 1) ops.push('-');
      if (big.val * small.val <= 180 && small.val > 1) ops.push('×', '×');
      const op = ops[Math.floor(rng() * ops.length)];

      let res = 0;
      if (op === '+') res = big.val + small.val;
      else if (op === '-') res = big.val - small.val;
      else if (op === '×') res = big.val * small.val;

      const nextSim = sim.filter((_, idx) => idx !== idxA && idx !== idxB);
      nextSim.push({ val: res, hasBonus: itemA.hasBonus || itemB.hasBonus });
      sim = nextSim;
    }
    const candidate = sim[sim.length - 1].val;
    if (
      candidate >= 28 &&
      !baseNumbers.includes(candidate) &&
      findMinDigitsOps(baseNumbers, candidate) >= 2
    ) {
      targetNumber = candidate;
      break;
    }
  }
  if (!targetNumber) {
    targetNumber = (baseNumbers[0] + baseNumbers[1]) * baseNumbers[3] + baseNumbers[4];
  }

  const minOps = findMinDigitsOps(baseNumbers, targetNumber);
  return {
    baseNumbers,
    targetNumber,
    bonusSourceIndex,
    hasBoost: Boolean(hasBoost),
    minOps,
    par: minOps
  };
}

function mountDigitsStage(stage, rng) {
  const puzzle = generateDigitsPuzzle(rng, stage.hasBoost);
  lastMountedPuzzle = puzzle;
  const { baseNumbers, targetNumber, bonusSourceIndex } = puzzle;
  setStagePar(stage, puzzle.par);

  let currentTiles = [];
  let selectedTileId = null;
  let selectedOp = null;
  let bonusClaimed = Boolean(stage.savedState && stage.savedState.bonusClaimed);

  function resetTilesToStart() {
    currentTiles = baseNumbers.map((n, i) => ({
      id: `t-${i}-${Math.random()}`,
      val: n,
      hasBonus: Boolean(stage.hasBoost && i === bonusSourceIndex && !bonusClaimed)
    }));
    selectedTileId = null;
    selectedOp = null;
  }

  if (stage.savedState && Array.isArray(stage.savedState.currentTiles) && stage.savedState.currentTiles.length > 0) {
    currentTiles = stage.savedState.currentTiles.map((t) => ({ ...t }));
  } else {
    resetTilesToStart();
  }

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Combine numbers to make <strong>${targetNumber}</strong> (1 op = 1 turn). <span class="bonus-inline">⚡ Include ${baseNumbers[bonusSourceIndex]} for +2⚡</span>`
    : `Combine numbers to make <strong>${targetNumber}</strong> (1 operation = 1 turn).`;
  setFeedback('Tap a number, an operator (+ − × ÷), and a second number.');

  const widget = document.createElement('div');
  widget.className = 'digits-widget';
  puzzleBoardMount.appendChild(widget);

  function applyOperation(tileA, op, tileB) {
    const a = tileA.val;
    const b = tileB.val;
    if (op === '+') return a + b;
    if (op === '−') {
      if (a - b <= 0) return null;
      return a - b;
    }
    if (op === '×') return a * b;
    if (op === '÷') {
      if (b === 0 || a % b !== 0) return null;
      return a / b;
    }
    return null;
  }

  function renderDigits() {
    widget.innerHTML = `
      <div class="digits-target-box">
        <span class="digits-target-label">Target Number</span>
        <span class="digits-target-num">${targetNumber}</span>
      </div>
      <div class="digits-bubbles-grid" id="digitsBubblesGrid"></div>
      <div class="digits-ops-row" id="digitsOpsRow"></div>
      <div class="digits-utility-row">
        <button type="button" class="secondary-btn" id="digitsResetBtn">↺ Reset Numbers</button>
      </div>
    `;

    const bubblesGrid = widget.querySelector('#digitsBubblesGrid');
    currentTiles.forEach((tile) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isSel = tile.id === selectedTileId;
      btn.className = `digit-bubble ${isSel ? 'selected' : ''} ${
        tile.hasBonus && !bonusClaimed ? 'bonus-bubble' : ''
      }`;
      btn.innerHTML = `
        ${tile.hasBonus && !bonusClaimed ? '<span class="digit-bubble-badge">+2⚡</span>' : ''}
        <span>${tile.val}</span>
      `;
      btn.addEventListener('click', () => onTileClick(tile));
      bubblesGrid.appendChild(btn);
    });

    const opsRow = widget.querySelector('#digitsOpsRow');
    ['+', '−', '×', '÷'].forEach((op) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `op-btn ${selectedOp === op ? 'active' : ''}`;
      btn.textContent = op;
      btn.addEventListener('click', () => {
        if (gauntletState.status !== 'in_progress') return;
        if (!selectedTileId) {
          setFeedback('Select a number bubble first!', 'warn');
          return;
        }
        playUiClick();
        selectedOp = selectedOp === op ? null : op;
        renderDigits();
      });
      opsRow.appendChild(btn);
    });

    widget.querySelector('#digitsResetBtn').addEventListener('click', () => {
      playUiClick();
      resetTilesToStart();
      stage.savedState = { currentTiles: currentTiles.map((t) => ({ ...t })), bonusClaimed };
      saveStateForActiveDate();
      renderDigits();
      setFeedback('Numbers restored to starting values.');
    });
  }

  function onTileClick(clickedTile) {
    if (gauntletState.status !== 'in_progress') return;

    // Deselect if tapping the already selected tile
    if (selectedTileId === clickedTile.id) {
      playUiClick();
      selectedTileId = null;
      selectedOp = null;
      renderDigits();
      return;
    }

    // If no operator chosen yet, just switch selection to this tile
    if (!selectedTileId || !selectedOp) {
      playUiClick();
      selectedTileId = clickedTile.id;
      renderDigits();
      return;
    }

    // Perform operation: firstTile (selectedOp) clickedTile
    const firstTile = currentTiles.find((t) => t.id === selectedTileId);
    if (!firstTile) return;

    const resultVal = applyOperation(firstTile, selectedOp, clickedTile);
    if (resultVal === null) {
      playErrorBuzz();
      setFeedback('Only positive whole numbers are allowed!', 'warn');
      selectedOp = null;
      renderDigits();
      return;
    }

    const combinedBonus = firstTile.hasBonus || clickedTile.hasBonus;
    const expressionStr = `${firstTile.val} ${selectedOp} ${clickedTile.val} = ${resultVal}`;

    currentTiles = currentTiles.filter((t) => t.id !== firstTile.id && t.id !== clickedTile.id);
    const newTile = {
      id: `t-res-${Math.random()}`,
      val: resultVal,
      hasBonus: combinedBonus
    };
    currentTiles.push(newTile);
    selectedTileId = newTile.id;
    selectedOp = null;

    spendTurn(1);
    stage.savedState = { currentTiles: currentTiles.map((t) => ({ ...t })), bonusClaimed };
    saveStateForActiveDate();
    renderDigits();

    if (resultVal === targetNumber) {
      if (combinedBonus && !bonusClaimed) {
        bonusClaimed = true;
        grantBonusTurns(2, '⚡ Golden number used in target!');
      }
      setFeedback(`${expressionStr} — Target reached!`, 'good');
      setTimeout(() => completeCurrentStage(), 400);
      return;
    }

    if (!checkOutOfTurnsAfterFailedMove()) {
      setFeedback(expressionStr, 'info');
    }
  }

  renderDigits();
}

registerMiniGame({
  id: 'digits',
  name: 'Digits',
  shortName: 'Digits',
  emoji: '🧮',
  mount: mountDigitsStage
});
