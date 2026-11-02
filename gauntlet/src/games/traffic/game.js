// --------------------------------------------------------------------------
// MINI-GAME 7: TRAFFIC JAM (6x6 Rush Hour Sliding Puzzle — 100% BFS-Verified)
// --------------------------------------------------------------------------
const TRAFFIC_PUZZLES = [
  // Puzzle 1 (BFS optimal: 7 moves)
  [
    { id: 'X', r: 2, c: 0, len: 2, dir: 'H', color: 'hero' },
    { id: 'A', r: 1, c: 2, len: 2, dir: 'V', color: 'car-0' },
    { id: 'B', r: 0, c: 1, len: 3, dir: 'H', color: 'truck-0' },
    { id: 'C', r: 3, c: 2, len: 3, dir: 'H', color: 'truck-1' },
    { id: 'D', r: 0, c: 4, len: 3, dir: 'V', color: 'truck-0' },
    { id: 'E', r: 4, c: 1, len: 2, dir: 'V', color: 'car-1' },
    { id: 'F', r: 4, c: 3, len: 2, dir: 'H', color: 'car-2' },
    { id: 'G', r: 1, c: 5, len: 2, dir: 'V', color: 'car-3' }
  ],
  // Puzzle 2 (BFS optimal: 7 moves)
  [
    { id: 'X', r: 2, c: 0, len: 2, dir: 'H', color: 'hero' },
    { id: 'A', r: 0, c: 0, len: 2, dir: 'V', color: 'car-0' },
    { id: 'B', r: 5, c: 2, len: 2, dir: 'H', color: 'car-1' },
    { id: 'C', r: 1, c: 2, len: 3, dir: 'V', color: 'truck-0' },
    { id: 'D', r: 0, c: 4, len: 2, dir: 'H', color: 'car-2' },
    { id: 'E', r: 4, c: 0, len: 3, dir: 'H', color: 'truck-1' },
    { id: 'F', r: 4, c: 5, len: 2, dir: 'V', color: 'car-3' },
    { id: 'G', r: 3, c: 4, len: 2, dir: 'V', color: 'car-0' }
  ],
  // Puzzle 3 (BFS optimal: 7 moves)
  [
    { id: 'X', r: 2, c: 0, len: 2, dir: 'H', color: 'hero' },
    { id: 'A', r: 5, c: 4, len: 2, dir: 'H', color: 'car-0' },
    { id: 'B', r: 0, c: 4, len: 3, dir: 'V', color: 'truck-0' },
    { id: 'C', r: 2, c: 2, len: 3, dir: 'V', color: 'truck-1' },
    { id: 'D', r: 3, c: 0, len: 2, dir: 'H', color: 'car-1' },
    { id: 'E', r: 0, c: 0, len: 2, dir: 'H', color: 'car-2' },
    { id: 'F', r: 4, c: 3, len: 2, dir: 'H', color: 'car-3' },
    { id: 'G', r: 1, c: 1, len: 2, dir: 'H', color: 'car-0' }
  ],
  // Puzzle 4 (BFS optimal: 7 moves)
  [
    { id: 'X', r: 2, c: 1, len: 2, dir: 'H', color: 'hero' },
    { id: 'A', r: 4, c: 3, len: 3, dir: 'H', color: 'truck-0' },
    { id: 'B', r: 4, c: 1, len: 2, dir: 'H', color: 'car-0' },
    { id: 'C', r: 1, c: 1, len: 3, dir: 'H', color: 'truck-1' },
    { id: 'D', r: 3, c: 0, len: 2, dir: 'V', color: 'car-1' },
    { id: 'E', r: 1, c: 5, len: 3, dir: 'V', color: 'truck-0' },
    { id: 'F', r: 0, c: 2, len: 3, dir: 'H', color: 'truck-1' },
    { id: 'G', r: 5, c: 3, len: 2, dir: 'H', color: 'car-2' },
    { id: 'H', r: 1, c: 4, len: 2, dir: 'V', color: 'car-3' }
  ],
  // Puzzle 5 (BFS optimal: 7 moves)
  [
    { id: 'X', r: 2, c: 0, len: 2, dir: 'H', color: 'hero' },
    { id: 'A', r: 2, c: 2, len: 2, dir: 'V', color: 'car-0' },
    { id: 'B', r: 1, c: 2, len: 3, dir: 'H', color: 'truck-0' },
    { id: 'C', r: 3, c: 3, len: 2, dir: 'H', color: 'car-1' },
    { id: 'D', r: 2, c: 5, len: 2, dir: 'V', color: 'car-2' },
    { id: 'E', r: 4, c: 2, len: 2, dir: 'V', color: 'car-3' },
    { id: 'F', r: 4, c: 3, len: 3, dir: 'H', color: 'truck-1' },
    { id: 'G', r: 5, c: 3, len: 2, dir: 'H', color: 'car-0' }
  ],
  // Puzzle 6 (BFS optimal: 9 moves)
  [
    { id: 'X', r: 2, c: 1, len: 2, dir: 'H', color: 'hero' },
    { id: 'A', r: 5, c: 4, len: 2, dir: 'H', color: 'car-0' },
    { id: 'B', r: 4, c: 1, len: 2, dir: 'H', color: 'car-1' },
    { id: 'C', r: 0, c: 5, len: 3, dir: 'V', color: 'truck-0' },
    { id: 'D', r: 3, c: 0, len: 2, dir: 'V', color: 'car-2' },
    { id: 'E', r: 0, c: 1, len: 3, dir: 'H', color: 'truck-1' },
    { id: 'F', r: 0, c: 4, len: 3, dir: 'V', color: 'truck-0' },
    { id: 'G', r: 4, c: 3, len: 2, dir: 'H', color: 'car-3' },
    { id: 'H', r: 1, c: 3, len: 2, dir: 'V', color: 'car-0' }
  ],
  // Puzzle 7 (BFS optimal: 8 moves)
  [
    { id: 'X', r: 2, c: 0, len: 2, dir: 'H', color: 'hero' },
    { id: 'A', r: 5, c: 4, len: 2, dir: 'H', color: 'car-0' },
    { id: 'B', r: 0, c: 4, len: 3, dir: 'V', color: 'truck-0' },
    { id: 'C', r: 0, c: 2, len: 2, dir: 'V', color: 'car-1' },
    { id: 'D', r: 3, c: 0, len: 2, dir: 'H', color: 'car-2' },
    { id: 'E', r: 5, c: 2, len: 2, dir: 'H', color: 'car-3' },
    { id: 'F', r: 4, c: 1, len: 2, dir: 'V', color: 'car-0' },
    { id: 'G', r: 4, c: 3, len: 3, dir: 'H', color: 'truck-1' }
  ],
  // Puzzle 8 (BFS optimal: 8 moves)
  [
    { id: 'X', r: 2, c: 0, len: 2, dir: 'H', color: 'hero' },
    { id: 'A', r: 1, c: 5, len: 3, dir: 'V', color: 'truck-0' },
    { id: 'B', r: 1, c: 2, len: 2, dir: 'V', color: 'car-0' },
    { id: 'C', r: 1, c: 4, len: 2, dir: 'V', color: 'car-1' },
    { id: 'D', r: 4, c: 3, len: 3, dir: 'H', color: 'truck-1' },
    { id: 'E', r: 2, c: 3, len: 2, dir: 'V', color: 'car-2' },
    { id: 'F', r: 5, c: 3, len: 2, dir: 'H', color: 'car-3' },
    { id: 'G', r: 4, c: 2, len: 2, dir: 'V', color: 'car-0' }
  ],
  // Puzzle 9 (BFS optimal: 8 moves)
  [
    { id: 'X', r: 2, c: 1, len: 2, dir: 'H', color: 'hero' },
    { id: 'A', r: 4, c: 2, len: 2, dir: 'H', color: 'car-0' },
    { id: 'B', r: 3, c: 1, len: 3, dir: 'V', color: 'truck-0' },
    { id: 'C', r: 1, c: 1, len: 3, dir: 'H', color: 'truck-1' },
    { id: 'D', r: 0, c: 5, len: 3, dir: 'V', color: 'truck-0' },
    { id: 'E', r: 5, c: 2, len: 2, dir: 'H', color: 'car-1' },
    { id: 'F', r: 0, c: 1, len: 2, dir: 'H', color: 'car-2' },
    { id: 'G', r: 4, c: 4, len: 2, dir: 'H', color: 'car-3' },
    { id: 'H', r: 3, c: 4, len: 2, dir: 'H', color: 'car-0' }
  ],
  // Puzzle 10 (BFS optimal: 10 moves)
  [
    { id: 'X', r: 2, c: 0, len: 2, dir: 'H', color: 'hero' },
    { id: 'A', r: 1, c: 2, len: 3, dir: 'V', color: 'truck-0' },
    { id: 'B', r: 1, c: 3, len: 2, dir: 'V', color: 'car-0' },
    { id: 'C', r: 2, c: 5, len: 3, dir: 'V', color: 'truck-1' },
    { id: 'D', r: 0, c: 1, len: 2, dir: 'V', color: 'car-1' },
    { id: 'E', r: 1, c: 4, len: 2, dir: 'V', color: 'car-2' },
    { id: 'F', r: 4, c: 1, len: 3, dir: 'H', color: 'truck-0' },
    { id: 'G', r: 4, c: 0, len: 2, dir: 'V', color: 'car-3' }
  ],
  // Puzzle 11 (BFS optimal: 8 moves)
  [
    { id: 'X', r: 2, c: 0, len: 2, dir: 'H', color: 'hero' },
    { id: 'A', r: 5, c: 2, len: 3, dir: 'H', color: 'truck-0' },
    { id: 'B', r: 0, c: 4, len: 2, dir: 'H', color: 'car-0' },
    { id: 'C', r: 0, c: 0, len: 3, dir: 'H', color: 'truck-1' },
    { id: 'D', r: 1, c: 2, len: 3, dir: 'H', color: 'truck-0' },
    { id: 'E', r: 4, c: 0, len: 2, dir: 'V', color: 'car-1' },
    { id: 'F', r: 2, c: 2, len: 3, dir: 'V', color: 'truck-1' },
    { id: 'G', r: 3, c: 5, len: 3, dir: 'V', color: 'truck-0' }
  ],
  // Puzzle 12 (BFS optimal: 9 moves)
  [
    { id: 'X', r: 2, c: 0, len: 2, dir: 'H', color: 'hero' },
    { id: 'A', r: 2, c: 2, len: 2, dir: 'V', color: 'car-0' },
    { id: 'B', r: 0, c: 2, len: 2, dir: 'V', color: 'car-1' },
    { id: 'C', r: 0, c: 4, len: 3, dir: 'V', color: 'truck-0' },
    { id: 'D', r: 0, c: 3, len: 2, dir: 'V', color: 'car-2' },
    { id: 'E', r: 4, c: 5, len: 2, dir: 'V', color: 'car-3' },
    { id: 'F', r: 4, c: 3, len: 2, dir: 'H', color: 'car-0' },
    { id: 'G', r: 3, c: 0, len: 2, dir: 'V', color: 'car-1' }
  ]
];

function solveTrafficBFS(initialCars, maxQueue = 1800) {
  const encode = (st) => st.map((c) => `${c.r},${c.c}`).join('|');
  const getGrid = (st) => {
    const g = Array(36).fill(null);
    for (const c of st) {
      for (let k = 0; k < c.len; k++) {
        const rr = c.dir === 'V' ? c.r + k : c.r;
        const cc = c.dir === 'H' ? c.c + k : c.c;
        g[rr * 6 + cc] = c.id;
      }
    }
    return g;
  };
  const startKey = encode(initialCars);
  const dist = { [startKey]: 0 };
  const movedSetByKey = { [startKey]: new Set() };
  const queue = [initialCars];
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const curKey = encode(cur);
    const d = dist[curKey];
    if (cur[0].c === 4) {
      return { solvable: true, minMoves: d, usedCarIds: Array.from(movedSetByKey[curKey]) };
    }
    if (d >= 11 || queue.length > maxQueue) continue;
    const g = getGrid(cur);
    for (let i = 0; i < cur.length; i++) {
      const car = cur[i];
      for (const sign of [-1, 1]) {
        for (let step = 1; step <= 4; step++) {
          let ok = true;
          for (let s = 1; s <= step; s++) {
            const tc = car.dir === 'H' ? (sign > 0 ? car.c + car.len - 1 + s : car.c - s) : car.c;
            const tr = car.dir === 'V' ? (sign > 0 ? car.r + car.len - 1 + s : car.r - s) : car.r;
            if (tr < 0 || tr >= 6 || tc < 0 || tc >= 6 || g[tr * 6 + tc] !== null) {
              ok = false;
              break;
            }
          }
          if (!ok) break;
          const next = cur.map((x) => ({ ...x }));
          if (car.dir === 'H') next[i].c += sign * step;
          else next[i].r += sign * step;
          const k = encode(next);
          if (dist[k] === undefined) {
            dist[k] = d + 1;
            const nextUsed = new Set(movedSetByKey[curKey]);
            if (car.id !== 'X') nextUsed.add(car.id);
            movedSetByKey[k] = nextUsed;
            queue.push(next);
          }
        }
      }
    }
  }
  return {
    solvable: false,
    minMoves: 7,
    usedCarIds: initialCars.filter((c) => c.id !== 'X').map((c) => c.id)
  };
}

function generateProceduralTrafficBoard(rng) {
  const carColors = ['car-0', 'car-1', 'car-2', 'car-3'];
  const truckColors = ['truck-0', 'truck-1'];

  for (let att = 0; att < 55; att++) {
    const grid = Array(36).fill(null);
    const tryPlace = (r, c, len, dir, id) => {
      for (let k = 0; k < len; k++) {
        const rr = dir === 'V' ? r + k : r;
        const cc = dir === 'H' ? c + k : c;
        if (rr < 0 || rr >= 6 || cc < 0 || cc >= 6 || grid[rr * 6 + cc] !== null) {
          return false;
        }
      }
      for (let k = 0; k < len; k++) {
        const rr = dir === 'V' ? r + k : r;
        const cc = dir === 'H' ? c + k : c;
        grid[rr * 6 + cc] = id;
      }
      return true;
    };

    const heroC = rng() < 0.75 ? 0 : 1;
    tryPlace(2, heroC, 2, 'H', 'X');
    const cand = [{ id: 'X', r: 2, c: heroC, len: 2, dir: 'H', color: 'hero' }];
    let carColorIdx = 0;
    let truckColorIdx = 0;

    // Place 2 vertical blockers across row 2 to the right of X
    for (let b = 0; b < 2; b++) {
      const c = heroC + 2 + Math.floor(rng() * (4 - heroC));
      const len = rng() < 0.4 ? 3 : 2;
      const rOpts = len === 2 ? [1, 2] : [0, 1, 2];
      const r = rOpts[Math.floor(rng() * rOpts.length)];
      const id = String.fromCharCode(64 + cand.length);
      if (tryPlace(r, c, len, 'V', id)) {
        const color =
          len === 3
            ? truckColors[truckColorIdx++ % truckColors.length]
            : carColors[carColorIdx++ % carColors.length];
        cand.push({ id, r, c, len, dir: 'V', color });
      }
    }

    // Place 5-6 additional vehicles (never placing another H vehicle on row 2)
    const targetCount = 8 + (rng() < 0.35 ? 1 : 0);
    for (let t = 0; t < 36 && cand.length < targetCount; t++) {
      const dir = rng() < 0.5 ? 'V' : 'H';
      const len = rng() < 0.3 ? 3 : 2;
      const r = dir === 'V' ? Math.floor(rng() * (7 - len)) : Math.floor(rng() * 6);
      const c = dir === 'H' ? Math.floor(rng() * (7 - len)) : Math.floor(rng() * 6);
      if (dir === 'H' && r === 2) continue;
      const id = String.fromCharCode(64 + cand.length);
      if (tryPlace(r, c, len, dir, id)) {
        const color =
          len === 3
            ? truckColors[truckColorIdx++ % truckColors.length]
            : carColors[carColorIdx++ % carColors.length];
        cand.push({ id, r, c, len, dir, color });
      }
    }

    const bfs = solveTrafficBFS(cand, 750);
    if (bfs.solvable && bfs.minMoves >= 6 && bfs.minMoves <= 10) {
      return { template: cand, minMoves: bfs.minMoves, usedCarIds: bfs.usedCarIds };
    }
  }

  const fallback = TRAFFIC_PUZZLES[Math.floor(rng() * TRAFFIC_PUZZLES.length)].map((v) => ({
    ...v
  }));
  const bfs = solveTrafficBFS(fallback, 2200);
  return { template: fallback, minMoves: bfs.minMoves, usedCarIds: bfs.usedCarIds };
}

function mountTrafficStage(stage, rng) {
  const { template, minMoves, usedCarIds } = generateProceduralTrafficBoard(rng);
  let cars = template.map((v) => ({ ...v }));
  setStagePar(stage, Math.max(1, Math.ceil(minMoves / 2)));
  const bonusPool = usedCarIds.length > 0 ? usedCarIds : cars.filter((c) => c.id !== 'X').map((c) => c.id);
  const bonusCarId = stage.hasBoost
    ? bonusPool[Math.floor(rng() * bonusPool.length)]
    : null;

  let selectedId = 'X';
  let halfMoves = stage.savedState && typeof stage.savedState.halfMoves === 'number'
    ? stage.savedState.halfMoves
    : 0;
  let lastMovedCarId = stage.savedState ? stage.savedState.lastMovedCarId || null : null;
  let bonusClaimed = Boolean(stage.savedState && stage.savedState.bonusClaimed);
  if (stage.savedState && Array.isArray(stage.savedState.cars)) {
    cars = stage.savedState.cars.map((v) => ({ ...v }));
  }

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Slide blocking cars out of the way so the Red Car 🚗 reaches the right EXIT (2 moves = 1 turn). <span class="bonus-inline">⚡ Move the +2⚡ vehicle for +2 turns</span>`
    : 'Slide blocking vehicles so the Red Car 🚗 escapes out the right EXIT (every 2 vehicle moves = 1 turn).';
  setFeedback('Tap a vehicle to select it, then tap an empty lane cell or arrow button.');

  const widget = document.createElement('div');
  widget.className = 'traffic-widget';
  puzzleBoardMount.appendChild(widget);

  function getOccupancyGrid() {
    const grid = Array(36).fill(null);
    cars.forEach((car) => {
      for (let k = 0; k < car.len; k++) {
        const r = car.dir === 'V' ? car.r + k : car.r;
        const c = car.dir === 'H' ? car.c + k : car.c;
        grid[r * 6 + c] = car.id;
      }
    });
    return grid;
  }

  function canSlideStep(car, delta) {
    const grid = getOccupancyGrid();
    if (car.dir === 'H') {
      const targetC = delta > 0 ? car.c + car.len : car.c - 1;
      if (targetC < 0 || targetC >= 6) return false;
      return grid[car.r * 6 + targetC] === null;
    } else {
      const targetR = delta > 0 ? car.r + car.len : car.r - 1;
      if (targetR < 0 || targetR >= 6) return false;
      return grid[targetR * 6 + car.c] === null;
    }
  }

  function slideCar(carId, steps) {
    if (gauntletState.status !== 'in_progress') return;
    const car = cars.find((c) => c.id === carId);
    if (!car || steps === 0) return;
    const sign = steps > 0 ? 1 : -1;
    let moved = 0;
    for (let i = 0; i < Math.abs(steps); i++) {
      if (canSlideStep(car, sign)) {
        if (car.dir === 'H') car.c += sign;
        else car.r += sign;
        moved++;
      } else {
        break;
      }
    }

    if (moved === 0) {
      playErrorBuzz();
      return;
    }

    // Consecutive slides of the SAME vehicle only count as 1 vehicle move!
    if (lastMovedCarId !== car.id) {
      lastMovedCarId = car.id;
      halfMoves++;
      if (halfMoves >= 2) {
        halfMoves = 0;
        spendTurn(1);
      } else {
        playUiClick();
      }
    } else {
      playUiClick();
    }

    if (bonusCarId && car.id === bonusCarId && !bonusClaimed) {
      bonusClaimed = true;
      grantBonusTurns(2, '⚡ Golden Vehicle moved!');
    }

    stage.savedState = {
      cars: cars.map((v) => ({ ...v })),
      halfMoves,
      lastMovedCarId,
      bonusClaimed
    };
    saveStateForActiveDate();

    renderTraffic();

    const hero = cars.find((c) => c.id === 'X');
    if (hero.c === 4) {
      setFeedback('Red Car escaped the gridlock!', 'good');
      setTimeout(() => completeCurrentStage(), 380);
      return;
    }

    if (halfMoves === 0) {
      checkOutOfTurnsAfterFailedMove();
    }
  }

  function renderTraffic() {
    const selCar = cars.find((c) => c.id === selectedId) || cars[0];
    const negLabel = selCar.dir === 'H' ? '◀ Left' : '▲ Up';
    const posLabel = selCar.dir === 'H' ? 'Right ▶' : 'Down ▼';

    widget.innerHTML = `
      <div class="waffle-step-meter">
        Moves this turn: ${halfMoves} / 2 • Par: ${minMoves} moves
        <button type="button" id="trafficResetBtn" style="margin-left:6px;background:none;border:1px solid var(--border-mid);border-radius:4px;padding:1px 6px;font-size:0.65rem;cursor:pointer;color:var(--text-muted);">↺ Reset (1⚡)</button>
      </div>
      <div class="traffic-board-wrap">
        <div class="traffic-board" id="trafficGrid"></div>
        <div class="traffic-exit-marker">EXIT ▶</div>
      </div>
      <div class="traffic-controls">
        <button type="button" class="traffic-move-btn" id="trafficNegBtn" ${
          !canSlideStep(selCar, -1) ? 'disabled' : ''
        }>${negLabel}</button>
        <button type="button" class="traffic-move-btn" id="trafficPosBtn" ${
          !canSlideStep(selCar, 1) ? 'disabled' : ''
        }>${posLabel}</button>
      </div>
    `;

    widget.querySelector('#trafficResetBtn').addEventListener('click', () => {
      if (gauntletState.status !== 'in_progress') return;
      cars = template.map((v) => ({ ...v }));
      halfMoves = 0;
      lastMovedCarId = null;
      spendTurn(1);
      stage.savedState = {
        cars: cars.map((v) => ({ ...v })),
        halfMoves,
        lastMovedCarId,
        bonusClaimed
      };
      saveStateForActiveDate();
      renderTraffic();
      if (!checkOutOfTurnsAfterFailedMove()) {
        setFeedback('Traffic lot reset to initial positions (cost 1⚡).', 'info');
      }
    });

    const occGrid = getOccupancyGrid();
    const reachableCells = new Set();
    if (selCar) {
      for (const sign of [-1, 1]) {
        for (let step = 1; step <= 4; step++) {
          const tc =
            selCar.dir === 'H'
              ? sign > 0
                ? selCar.c + selCar.len - 1 + step
                : selCar.c - step
              : selCar.c;
          const tr =
            selCar.dir === 'V'
              ? sign > 0
                ? selCar.r + selCar.len - 1 + step
                : selCar.r - step
              : selCar.r;
          if (tr < 0 || tr >= 6 || tc < 0 || tc >= 6 || occGrid[tr * 6 + tc] !== null) {
            break;
          }
          reachableCells.add(tr * 6 + tc);
        }
      }
    }

    const boardEl = widget.querySelector('#trafficGrid');
    for (let i = 0; i < 36; i++) {
      const r = Math.floor(i / 6);
      const c = i % 6;
      const cell = document.createElement('div');
      const isReachable = reachableCells.has(i);
      cell.className = `traffic-cell ${isReachable ? 'valid-dest' : ''}`;
      cell.style.gridRow = `${r + 1}`;
      cell.style.gridColumn = `${c + 1}`;
      cell.addEventListener('click', () => {
        if (!selCar) return;
        if (selCar.dir === 'H' && r === selCar.r) {
          if (c < selCar.c) slideCar(selCar.id, c - selCar.c);
          else if (c >= selCar.c + selCar.len) slideCar(selCar.id, c - (selCar.c + selCar.len - 1));
        } else if (selCar.dir === 'V' && c === selCar.c) {
          if (r < selCar.r) slideCar(selCar.id, r - selCar.r);
          else if (r >= selCar.r + selCar.len) slideCar(selCar.id, r - (selCar.r + selCar.len - 1));
        }
      });
      boardEl.appendChild(cell);
    }

    cars.forEach((car) => {
      const el = document.createElement('button');
      el.type = 'button';
      const isSel = car.id === selectedId;
      const showBonus = car.id === bonusCarId && !bonusClaimed;
      el.className = `traffic-car ${car.color} ${isSel ? 'selected' : ''}`;
      el.style.gridRow = `${car.r + 1} / span ${car.dir === 'V' ? car.len : 1}`;
      el.style.gridColumn = `${car.c + 1} / span ${car.dir === 'H' ? car.len : 1}`;
      el.innerHTML = `
        ${showBonus ? '<span class="reactor-bonus-badge">+2⚡</span>' : ''}
        <span>${car.id === 'X' ? '🚗' : car.dir === 'H' ? '↔' : '↕'}</span>
      `;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        playUiClick();
        selectedId = car.id;
        renderTraffic();
      });
      boardEl.appendChild(el);
    });

    widget.querySelector('#trafficNegBtn').addEventListener('click', () => {
      slideCar(selCar.id, -1);
    });
    widget.querySelector('#trafficPosBtn').addEventListener('click', () => {
      slideCar(selCar.id, 1);
    });
  }

  function onKeyDown(e) {
    const selCar = cars.find((c) => c.id === selectedId);
    if (!selCar) return;
    if ((e.key === 'ArrowLeft' || e.key === 'a') && selCar.dir === 'H') {
      e.preventDefault();
      slideCar(selCar.id, -1);
    } else if ((e.key === 'ArrowRight' || e.key === 'd') && selCar.dir === 'H') {
      e.preventDefault();
      slideCar(selCar.id, 1);
    } else if ((e.key === 'ArrowUp' || e.key === 'w') && selCar.dir === 'V') {
      e.preventDefault();
      slideCar(selCar.id, -1);
    } else if ((e.key === 'ArrowDown' || e.key === 's') && selCar.dir === 'V') {
      e.preventDefault();
      slideCar(selCar.id, 1);
    }
  }

  window.addEventListener('keydown', onKeyDown);
  activeCleanupFn = () => window.removeEventListener('keydown', onKeyDown);

  renderTraffic();
}

registerMiniGame({
  id: 'traffic',
  name: 'Jam',
  shortName: 'Jam',
  emoji: '🚗',
  mount: mountTrafficStage
});
