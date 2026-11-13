// ============================================================================
// DAILY GAUNTLET — MINI-GAME: CUBE (2x2x2 Pocket Rubik's Cube)
// 6 faces, 4 stickers each (24 stickers total).
// Direct tap-on-the-cube controls: Tap row/column arrows or swipe on stickers.
// Every 2 spins = 1 turn (⚡). Par: 2 turns.
// ============================================================================

const CUBE_COLORS = [
  '#ffffff', // 0: U - White
  '#ffd500', // 1: D - Yellow
  '#009b48', // 2: F - Green
  '#0046ad', // 3: B - Blue
  '#ff5800', // 4: L - Orange
  '#b71234'  // 5: R - Red
];

const CUBE_FACE_NAMES = ['Top (U)', 'Bottom (D)', 'Front (F)', 'Back (B)', 'Left (L)', 'Right (R)'];
const CUBE_ALL_MOVES = ['U', "U'", 'D', "D'", 'F', "F'", 'B', "B'", 'L', "L'", 'R', "R'"];

// Mapping of face-relative physical tap directions to standard quarter-turns
const FACE_CONTROLS = [
  // 0: U (Up / Top)
  {
    face: 0,
    topRowLeft: 'B',
    topRowRight: "B'",
    bottomRowLeft: "F'",
    bottomRowRight: 'F',
    leftColUp: "L'",
    leftColDown: 'L',
    rightColUp: 'R',
    rightColDown: "R'",
    rotCW: 'U',
    rotCCW: "U'"
  },
  // 1: D (Down / Bottom)
  {
    face: 1,
    topRowLeft: 'F',
    topRowRight: "F'",
    bottomRowLeft: "B'",
    bottomRowRight: 'B',
    leftColUp: 'L',
    leftColDown: "L'",
    rightColUp: "R'",
    rightColDown: 'R',
    rotCW: 'D',
    rotCCW: "D'"
  },
  // 2: F (Front)
  {
    face: 2,
    topRowLeft: 'U',
    topRowRight: "U'",
    bottomRowLeft: "D'",
    bottomRowRight: 'D',
    leftColUp: "L'",
    leftColDown: 'L',
    rightColUp: 'R',
    rightColDown: "R'",
    rotCW: 'F',
    rotCCW: "F'"
  },
  // 3: B (Back)
  {
    face: 3,
    topRowLeft: 'U',
    topRowRight: "U'",
    bottomRowLeft: "D'",
    bottomRowRight: 'D',
    leftColUp: "R'",
    leftColDown: 'R',
    rightColUp: 'L',
    rightColDown: "L'",
    rotCW: 'B',
    rotCCW: "B'"
  },
  // 4: L (Left)
  {
    face: 4,
    topRowLeft: 'U',
    topRowRight: "U'",
    bottomRowLeft: "D'",
    bottomRowRight: 'D',
    leftColUp: "B'",
    leftColDown: 'B',
    rightColUp: 'F',
    rightColDown: "F'",
    rotCW: 'L',
    rotCCW: "L'"
  },
  // 5: R (Right)
  {
    face: 5,
    topRowLeft: 'U',
    topRowRight: "U'",
    bottomRowLeft: "D'",
    bottomRowRight: 'D',
    leftColUp: "F'",
    leftColDown: 'F',
    rightColUp: 'B',
    rightColDown: "B'",
    rotCW: 'R',
    rotCCW: "R'"
  }
];

function getSolvedCube() {
  const state = new Array(24);
  for (let f = 0; f < 6; f++) {
    for (let s = 0; s < 4; s++) {
      state[f * 4 + s] = f;
    }
  }
  return state;
}

function rotateFaceClockwise(s, offset) {
  const o0 = s[offset + 0];
  const o1 = s[offset + 1];
  const o2 = s[offset + 2];
  const o3 = s[offset + 3];
  s[offset + 0] = o2;
  s[offset + 1] = o0;
  s[offset + 2] = o3;
  s[offset + 3] = o1;
}

function applyCubeMove(state, move) {
  const next = state.slice();
  const times = move.endsWith("'") ? 3 : 1;
  const face = move[0];

  for (let t = 0; t < times; t++) {
    const s = next.slice();
    if (face === 'U') {
      rotateFaceClockwise(next, 0);
      next[21] = s[13]; next[20] = s[12];
      next[9] = s[21];  next[8] = s[20];
      next[17] = s[9];  next[16] = s[8];
      next[13] = s[17]; next[12] = s[16];
    } else if (face === 'D') {
      rotateFaceClockwise(next, 4);
      next[22] = s[10]; next[23] = s[11];
      next[14] = s[22]; next[15] = s[23];
      next[18] = s[14]; next[19] = s[15];
      next[10] = s[18]; next[11] = s[19];
    } else if (face === 'F') {
      rotateFaceClockwise(next, 8);
      next[20] = s[2];  next[22] = s[3];
      next[5] = s[20];  next[4] = s[22];
      next[19] = s[5];  next[17] = s[4];
      next[2] = s[19];  next[3] = s[17];
    } else if (face === 'B') {
      rotateFaceClockwise(next, 12);
      next[16] = s[1];  next[18] = s[0];
      next[6] = s[16];  next[7] = s[18];
      next[23] = s[6];  next[21] = s[7];
      next[1] = s[23];  next[0] = s[21];
    } else if (face === 'L') {
      rotateFaceClockwise(next, 16);
      next[8] = s[0];   next[10] = s[2];
      next[4] = s[8];   next[6] = s[10];
      next[15] = s[4];  next[13] = s[6];
      next[0] = s[15];  next[2] = s[13];
    } else if (face === 'R') {
      rotateFaceClockwise(next, 20);
      next[12] = s[3];  next[14] = s[1];
      next[7] = s[12];  next[5] = s[14];
      next[11] = s[7];  next[9] = s[5];
      next[3] = s[11];  next[1] = s[9];
    }
  }
  return next;
}

function isCubeSolved(state) {
  const seenColors = new Set();
  for (let f = 0; f < 6; f++) {
    const base = f * 4;
    const c = state[base];
    if (state[base + 1] !== c || state[base + 2] !== c || state[base + 3] !== c) {
      return false;
    }
    if (seenColors.has(c)) return false;
    seenColors.add(c);
  }
  return true;
}

function solveCubeBFS(startState) {
  const startKey = startState.join('');
  if (isCubeSolved(startState)) return { distance: 0, solution: [] };

  const visited = new Set([startKey]);
  const queue = [{ state: startState, path: [] }];

  while (queue.length > 0) {
    const { state, path } = queue.shift();
    if (path.length >= 5) continue;

    for (const m of CUBE_ALL_MOVES) {
      if (path.length > 0) {
        const last = path[path.length - 1];
        if (m[0] === last[0]) continue; // Skip redundant turns on same face
      }
      const nxt = applyCubeMove(state, m);
      const nextPath = [...path, m];
      if (isCubeSolved(nxt)) {
        return { distance: nextPath.length, solution: nextPath };
      }
      const nKey = nxt.join('');
      if (!visited.has(nKey) && nextPath.length < 4) {
        visited.add(nKey);
        queue.push({ state: nxt, path: nextPath });
      }
    }
  }
  return { distance: 4, solution: [] };
}

function generateCubePuzzle(rng, hasBoost = false) {
  const ALL_FACES = ['U', 'D', 'F', 'B', 'L', 'R'];
  let bestPuzzle = null;

  for (let attempt = 0; attempt < 32; attempt++) {
    let state = getSolvedCube();
    const scrambleMoves = [];
    let lastFace = '';

    for (let step = 0; step < 4; step++) {
      const validFaces = ALL_FACES.filter((f) => f !== lastFace);
      const face = validFaces[Math.floor(rng() * validFaces.length)];
      const isPrime = rng() < 0.5;
      const move = face + (isPrime ? "'" : '');
      scrambleMoves.push(move);
      state = applyCubeMove(state, move);
      lastFace = face;
    }

    const solver = solveCubeBFS(state);
    const par = Math.max(1, Math.ceil(solver.distance / 2));
    const cand = {
      state,
      scrambleMoves,
      solution: solver.solution,
      distance: solver.distance,
      par
    };

    if (solver.distance >= 3) {
      bestPuzzle = cand;
      break;
    }
    if (!bestPuzzle || cand.distance > bestPuzzle.distance) {
      bestPuzzle = cand;
    }
  }

  return bestPuzzle;
}

function mountCubeStage(stage, rng) {
  const puzzle = generateCubePuzzle(rng, stage.hasBoost);
  lastMountedPuzzle = puzzle;
  setStagePar(stage, puzzle.par);

  let state = puzzle.state.slice();
  let moveHistory = [];
  let halfStepCount = 0;
  let bonusClaimed = false;

  if (stage.savedState && Array.isArray(stage.savedState.state) && stage.savedState.state.length === 24) {
    state = stage.savedState.state.slice();
    moveHistory = Array.isArray(stage.savedState.moveHistory) ? stage.savedState.moveHistory.slice() : [];
    halfStepCount = typeof stage.savedState.halfStepCount === 'number' ? stage.savedState.halfStepCount : 0;
    bonusClaimed = Boolean(stage.savedState.bonusClaimed);
  }

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Solve the <strong>2×2 Cube</strong>: solid colors on all 6 faces (every 2 spins = 1 turn). <span class="bonus-inline">⚡ Solve for +2 turns</span>`
    : `Solve the <strong>2×2 Cube</strong>: solid colors on all 6 faces (every 2 spins = 1 turn).`;

  setFeedback('Tap arrows directly on the cube rows & columns to spin them. Drag background to orbit.');

  // Camera angles
  let rotX = -24;
  let rotY = -36;

  const wrapper = document.createElement('div');
  wrapper.className = 'cube-wrapper';
  puzzleBoardMount.appendChild(wrapper);

  // 3D Scene Viewport
  const sceneEl = document.createElement('div');
  sceneEl.className = 'cube-scene';
  sceneEl.setAttribute('role', 'region');
  sceneEl.setAttribute('aria-label', '3D Rubik\'s Cube. Tap arrows on rows & columns to spin, or drag background to orbit.');
  wrapper.appendChild(sceneEl);

  const cubeEl = document.createElement('div');
  cubeEl.className = 'cube-3d';
  sceneEl.appendChild(cubeEl);

  function updateCubeTransform() {
    cubeEl.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }
  updateCubeTransform();

  // Drag-to-orbit pointer controls (only triggered on empty background)
  let isDraggingCamera = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let startRotX = rotX;
  let startRotY = rotY;

  function onCameraDown(e) {
    isDraggingCamera = true;
    startPointerX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    startPointerY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    startRotX = rotX;
    startRotY = rotY;
    if (sceneEl.setPointerCapture && e.pointerId !== undefined) {
      try { sceneEl.setPointerCapture(e.pointerId); } catch (_) {}
    }
  }

  function onCameraMove(e) {
    if (!isDraggingCamera) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    const dx = clientX - startPointerX;
    const dy = clientY - startPointerY;
    rotY = startRotY + dx * 0.7;
    rotX = Math.max(-85, Math.min(85, startRotX - dy * 0.7));
    updateCubeTransform();
  }

  function onCameraUp(e) {
    isDraggingCamera = false;
    if (sceneEl.releasePointerCapture && e.pointerId !== undefined) {
      try { sceneEl.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  }

  sceneEl.addEventListener('pointermove', onCameraMove);
  sceneEl.addEventListener('pointerup', onCameraUp);
  sceneEl.addEventListener('pointercancel', onCameraUp);

  function handleSpin(move) {
    if (gauntletState.status !== 'in_progress') return;

    state = applyCubeMove(state, move);
    moveHistory.push(move);
    renderStickers();

    halfStepCount++;
    if (halfStepCount >= 2) {
      halfStepCount = 0;
      spendTurn(1);
    } else {
      playUiClick();
    }

    // Persist mid-stage progress
    stage.savedState = {
      state: state.slice(),
      moveHistory: moveHistory.slice(),
      halfStepCount,
      bonusClaimed
    };
    saveStateForActiveDate();

    if (isCubeSolved(state)) {
      if (stage.hasBoost && !bonusClaimed) {
        bonusClaimed = true;
        stage.savedState.bonusClaimed = true;
        grantBonusTurns(2, '⚡ Cube Solved Boost!');
      }
      setFeedback('Cube Solved! Solid colors on all faces!', 'good');
      setTimeout(() => completeCurrentStage(), 400);
      return;
    }

    if (halfStepCount === 1) {
      setFeedback(`Spun ${move} (1/2 turn). Next spin costs 1⚡.`, 'info');
    } else {
      checkOutOfTurnsAfterFailedMove();
    }
  }

  function createArrowBtn(extraClasses, move, symbol, label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `cube-tap-arrow cube-spin-btn ${extraClasses}`;
    btn.setAttribute('data-move', move);
    btn.setAttribute('aria-label', `${label} (${move})`);
    btn.setAttribute('title', `${label} (${move})`);
    btn.textContent = symbol;
    btn.addEventListener('click', (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      handleSpin(move);
    });
    return btn;
  }

  // Build 6 Faces of the 3D Cube with on-cube interactive arrows
  const FACE_CLASSES = ['face-u', 'face-d', 'face-f', 'face-b', 'face-l', 'face-r'];
  const stickerElements = [];

  for (let f = 0; f < 6; f++) {
    const faceDiv = document.createElement('div');
    faceDiv.className = `cube-face ${FACE_CLASSES[f]}`;
    faceDiv.setAttribute('data-face', f);

    const ctrl = FACE_CONTROLS[f];

    // 2x2 grid of stickers
    const stickersGrid = document.createElement('div');
    stickersGrid.className = 'cube-stickers-grid';
    for (let s = 0; s < 4; s++) {
      const idx = f * 4 + s;
      const row = Math.floor(s / 2);
      const col = s % 2;
      const stickerDiv = document.createElement('div');
      stickerDiv.className = 'cube-sticker';
      stickerDiv.setAttribute('data-index', idx);
      stickerDiv.setAttribute('data-face', f);
      stickerDiv.setAttribute('data-row', row);
      stickerDiv.setAttribute('data-col', col);
      stickerDiv.addEventListener('click', (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        highlightSticker(stickerDiv);
      });
      stickersGrid.appendChild(stickerDiv);
      stickerElements[idx] = stickerDiv;
    }
    faceDiv.appendChild(stickersGrid);

    // Row Arrows: Top Row (Row 0)
    const arrowTopLeft = createArrowBtn('row-arrow arrow-left top', ctrl.topRowLeft, '◀', 'Slide top row left');
    const arrowTopRight = createArrowBtn('row-arrow arrow-right top', ctrl.topRowRight, '▶', 'Slide top row right');

    // Row Arrows: Bottom Row (Row 1)
    const arrowBtmLeft = createArrowBtn('row-arrow arrow-left bottom', ctrl.bottomRowLeft, '◀', 'Slide bottom row left');
    const arrowBtmRight = createArrowBtn('row-arrow arrow-right bottom', ctrl.bottomRowRight, '▶', 'Slide bottom row right');

    // Col Arrows: Left Col (Col 0)
    const arrowLeftUp = createArrowBtn('col-arrow arrow-up left', ctrl.leftColUp, '▲', 'Slide left column up');
    const arrowLeftDown = createArrowBtn('col-arrow arrow-down left', ctrl.leftColDown, '▼', 'Slide left column down');

    // Col Arrows: Right Col (Col 1)
    const arrowRightUp = createArrowBtn('col-arrow arrow-up right', ctrl.rightColUp, '▲', 'Slide right column up');
    const arrowRightDown = createArrowBtn('col-arrow arrow-down right', ctrl.rightColDown, '▼', 'Slide right column down');

    // Center Rotate Badge
    const centerBadge = document.createElement('div');
    centerBadge.className = 'cube-face-center';
    const rotCCWBtn = createArrowBtn('face-rot-btn rot-ccw', ctrl.rotCCW, '↶', 'Rotate face counter-clockwise');
    const rotCWBtn = createArrowBtn('face-rot-btn rot-cw', ctrl.rotCW, '↷', 'Rotate face clockwise');
    centerBadge.appendChild(rotCCWBtn);
    centerBadge.appendChild(rotCWBtn);

    faceDiv.appendChild(arrowTopLeft);
    faceDiv.appendChild(arrowTopRight);
    faceDiv.appendChild(arrowBtmLeft);
    faceDiv.appendChild(arrowBtmRight);
    faceDiv.appendChild(arrowLeftUp);
    faceDiv.appendChild(arrowLeftDown);
    faceDiv.appendChild(arrowRightUp);
    faceDiv.appendChild(arrowRightDown);
    faceDiv.appendChild(centerBadge);

    cubeEl.appendChild(faceDiv);
  }

  // Interactive sticker selection & swipe on cube
  let stickerPointerStart = null;

  function clearActiveSticker() {
    wrapper.querySelectorAll('.cube-sticker.selected-sticker').forEach((el) => {
      el.classList.remove('selected-sticker');
    });
    wrapper.querySelectorAll('.cube-tap-arrow.pulse-arrow').forEach((el) => {
      el.classList.remove('pulse-arrow');
    });
  }

  function highlightSticker(stickerEl) {
    clearActiveSticker();
    stickerEl.classList.add('selected-sticker');
    const f = parseInt(stickerEl.getAttribute('data-face'), 10);
    const row = parseInt(stickerEl.getAttribute('data-row'), 10);
    const col = parseInt(stickerEl.getAttribute('data-col'), 10);
    const faceEl = stickerEl.closest ? stickerEl.closest('.cube-face') : stickerEl.parentNode;
    if (!faceEl) return;

    const rowSelector = row === 0 ? '.top' : '.bottom';
    const colSelector = col === 0 ? '.left' : '.right';
    faceEl.querySelectorAll(`.row-arrow${rowSelector}`).forEach((a) => a.classList.add('pulse-arrow'));
    faceEl.querySelectorAll(`.col-arrow${colSelector}`).forEach((a) => a.classList.add('pulse-arrow'));

    setFeedback('Tile selected: tap glowing arrows on its row/column, or swipe to slide!', 'info');
  }

  sceneEl.addEventListener('pointerdown', (e) => {
    const arrow = e.target.closest ? e.target.closest('.cube-tap-arrow') : null;
    if (arrow) return; // Handled directly by arrow click

    const sticker = e.target.closest ? e.target.closest('.cube-sticker') : (e.target.classList && e.target.classList.contains('cube-sticker') ? e.target : null);
    if (sticker) {
      stickerPointerStart = {
        sticker,
        x: e.clientX || (e.touches && e.touches[0].clientX) || 0,
        y: e.clientY || (e.touches && e.touches[0].clientY) || 0
      };
      return;
    }

    // Otherwise drag empty background to orbit camera
    onCameraDown(e);
  });

  sceneEl.addEventListener('pointerup', (e) => {
    if (stickerPointerStart) {
      const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX) || 0;
      const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY) || 0;
      const dx = clientX - stickerPointerStart.x;
      const dy = clientY - stickerPointerStart.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 12) {
        highlightSticker(stickerPointerStart.sticker);
      } else if (dist >= 18) {
        // Swipe gesture on sticker
        const sticker = stickerPointerStart.sticker;
        const f = parseInt(sticker.getAttribute('data-face'), 10);
        const row = parseInt(sticker.getAttribute('data-row'), 10);
        const col = parseInt(sticker.getAttribute('data-col'), 10);
        const ctrl = FACE_CONTROLS[f];
        if (ctrl) {
          if (Math.abs(dx) >= Math.abs(dy)) {
            const move = dx < 0
              ? (row === 0 ? ctrl.topRowLeft : ctrl.bottomRowLeft)
              : (row === 0 ? ctrl.topRowRight : ctrl.bottomRowRight);
            if (move) handleSpin(move);
          } else {
            const move = dy < 0
              ? (col === 0 ? ctrl.leftColUp : ctrl.rightColUp)
              : (col === 0 ? ctrl.leftColDown : ctrl.rightColDown);
            if (move) handleSpin(move);
          }
        }
      }
      stickerPointerStart = null;
      return;
    }
    onCameraUp(e);
  });

  // Tap-on-Cube Hint Badge
  const hintEl = document.createElement('div');
  hintEl.className = 'cube-hint-pill';
  hintEl.innerHTML = `<span>👆 Tap arrows on rows & columns to spin • Drag background to orbit</span>`;
  wrapper.appendChild(hintEl);

  // Camera Quick-View Toolbar
  const camRow = document.createElement('div');
  camRow.className = 'cube-cam-row';
  camRow.innerHTML = `
    <span class="cube-cam-label">View:</span>
    <button type="button" class="cube-cam-btn" data-cam="front">Front</button>
    <button type="button" class="cube-cam-btn" data-cam="top">Top</button>
    <button type="button" class="cube-cam-btn" data-cam="right">Right</button>
    <button type="button" class="cube-cam-btn" data-cam="left">Left</button>
    <button type="button" class="cube-cam-btn" data-cam="back">Back</button>
    <button type="button" class="cube-cam-btn" data-cam="bottom">Bottom</button>
    <button type="button" class="cube-cam-btn cube-cam-reset" data-cam="reset" title="Default 3D Angle">3D</button>
  `;
  wrapper.appendChild(camRow);

  camRow.querySelectorAll('.cube-cam-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      playUiClick();
      const cam = btn.getAttribute('data-cam');
      if (cam === 'front') { rotX = 0; rotY = 0; }
      else if (cam === 'top') { rotX = -90; rotY = 0; }
      else if (cam === 'right') { rotX = 0; rotY = -90; }
      else if (cam === 'left') { rotX = 0; rotY = 90; }
      else if (cam === 'back') { rotX = 0; rotY = 180; }
      else if (cam === 'bottom') { rotX = 90; rotY = 0; }
      else if (cam === 'reset') { rotX = -24; rotY = -36; }
      updateCubeTransform();
    });
  });

  // Flat Unfolded 2D Mini-Map
  const netContainer = document.createElement('div');
  netContainer.className = 'cube-net-container';
  netContainer.setAttribute('title', 'Unfolded 2D net preview of all 6 faces');
  netContainer.innerHTML = `
    <div class="cube-net-grid">
      <div class="cube-net-cell empty"></div>
      <div class="cube-net-cell" data-net-face="0" title="Top (U)"></div>
      <div class="cube-net-cell empty"></div>
      <div class="cube-net-cell empty"></div>

      <div class="cube-net-cell" data-net-face="4" title="Left (L)"></div>
      <div class="cube-net-cell" data-net-face="2" title="Front (F)"></div>
      <div class="cube-net-cell" data-net-face="5" title="Right (R)"></div>
      <div class="cube-net-cell" data-net-face="3" title="Back (B)"></div>

      <div class="cube-net-cell empty"></div>
      <div class="cube-net-cell" data-net-face="1" title="Bottom (D)"></div>
      <div class="cube-net-cell empty"></div>
      <div class="cube-net-cell empty"></div>
    </div>
  `;
  wrapper.appendChild(netContainer);

  const netCells = netContainer.querySelectorAll('.cube-net-cell[data-net-face]');
  const netStickers = [];
  netCells.forEach((cell) => {
    const rawFace = cell.getAttribute('data-net-face');
    const f = parseInt(rawFace, 10);
    const subGrid = document.createElement('div');
    subGrid.className = 'cube-net-subgrid';
    for (let s = 0; s < 4; s++) {
      const dot = document.createElement('div');
      dot.className = 'cube-net-dot';
      subGrid.appendChild(dot);
      netStickers[f * 4 + s] = dot;
    }
    cell.appendChild(subGrid);
  });

  function renderStickers() {
    for (let i = 0; i < 24; i++) {
      const colorVal = state[i];
      const hex = CUBE_COLORS[colorVal] || '#888';
      if (stickerElements[i]) {
        stickerElements[i].style.backgroundColor = hex;
        stickerElements[i].setAttribute('data-color', colorVal);
      }
      if (netStickers[i]) {
        netStickers[i].style.backgroundColor = hex;
      }
    }
  }

  renderStickers();

  activeCleanupFn = () => {
    sceneEl.removeEventListener('pointermove', onCameraMove);
    sceneEl.removeEventListener('pointerup', onCameraUp);
    sceneEl.removeEventListener('pointercancel', onCameraUp);
  };
}

registerMiniGame({
  id: 'cube',
  name: 'Cube',
  shortName: 'Cube',
  emoji: '🎲',
  mount: mountCubeStage
});

if (typeof module !== 'undefined' && module.exports) {
  Object.assign(module.exports, {
    CUBE_COLORS,
    CUBE_FACE_NAMES,
    CUBE_ALL_MOVES,
    FACE_CONTROLS,
    getSolvedCube,
    applyCubeMove,
    isCubeSolved,
    solveCubeBFS,
    generateCubePuzzle,
    mountCubeStage
  });
}
