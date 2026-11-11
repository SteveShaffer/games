// --------------------------------------------------------------------------
// MINI-GAME 15: BRIDGES / ISLANDS (Procedural Hashi Island Bridge Network)
// --------------------------------------------------------------------------
const FALLBACK_BRIDGES = [
  {
    islands: [
      { id: 0, r: 0, c: 0 },
      { id: 1, r: 0, c: 4 },
      { id: 2, r: 2, c: 0 },
      { id: 3, r: 2, c: 2 },
      { id: 4, r: 2, c: 4 },
      { id: 5, r: 4, c: 2 },
      { id: 6, r: 4, c: 6 }
    ],
    edges: [
      { id: 'e0', r: 0, c: 2, a: 0, b: 1, dir: 'H', target: 1 },
      { id: 'e1', r: 1, c: 0, a: 0, b: 2, dir: 'V', target: 2 },
      { id: 'e2', r: 1, c: 4, a: 1, b: 4, dir: 'V', target: 1 },
      { id: 'e3', r: 2, c: 1, a: 2, b: 3, dir: 'H', target: 1 },
      { id: 'e4', r: 2, c: 3, a: 3, b: 4, dir: 'H', target: 2 },
      { id: 'e5', r: 3, c: 2, a: 3, b: 5, dir: 'V', target: 1 },
      { id: 'e6', r: 4, c: 4, a: 5, b: 6, dir: 'H', target: 1 }
    ]
  }
];

function generateProceduralBridges(prng) {
  const LATTICE = [];
  for (let lr = 0; lr < 4; lr++) {
    for (let lc = 0; lc < 4; lc++) {
      LATTICE.push({ lr, lc, r: lr * 2, c: lc * 2 });
    }
  }

  for (let att = 0; att < 150; att++) {
    const nIslands = 6 + Math.floor(prng() * 3); // 6, 7, or 8 islands
    const picked = seededShuffle(LATTICE, prng)
      .slice(0, nIslands)
      .map((p, id) => ({ id, ...p }));

    // All immediate orthogonal adjacent island pairs become playable bridge slots
    const allSlots = [];
    for (let i = 0; i < picked.length; i++) {
      for (let j = i + 1; j < picked.length; j++) {
        const A = picked[i];
        const B = picked[j];
        if (A.lr === B.lr && Math.abs(A.lc - B.lc) === 1) {
          allSlots.push({
            id: `e${allSlots.length}`,
            a: i,
            b: j,
            dir: 'H',
            r: A.r,
            c: (A.c + B.c) / 2,
            target: 0
          });
        } else if (A.lc === B.lc && Math.abs(A.lr - B.lr) === 1) {
          allSlots.push({
            id: `e${allSlots.length}`,
            a: i,
            b: j,
            dir: 'V',
            r: (A.r + B.r) / 2,
            c: A.c,
            target: 0
          });
        }
      }
    }
    if (allSlots.length < nIslands - 1) continue;

    // Check graph connectivity and build a spanning tree + optional cycle edges
    const parent = picked.map((_, i) => i);
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const shuffledSlots = seededShuffle(allSlots, prng);
    const activeSlots = [];
    for (const s of shuffledSlots) {
      const ra = find(s.a);
      const rb = find(s.b);
      if (ra !== rb) {
        parent[ra] = rb;
        activeSlots.push(s);
      } else if (prng() < 0.35) {
        activeSlots.push(s);
      }
    }
    const root0 = find(0);
    if (picked.some((_, i) => find(i) !== root0)) continue;

    activeSlots.forEach((s) => {
      s.target = prng() < 0.35 ? 2 : 1;
    });

    const totalTaps = allSlots.reduce((sum, s) => sum + s.target, 0);
    if (totalTaps < 6 || totalTaps > 10) continue;

    const targets = picked.map((isl) =>
      allSlots
        .filter((s) => s.a === isl.id || s.b === isl.id)
        .reduce((sum, s) => sum + s.target, 0)
    );
    if (targets.some((t) => t === 0)) continue;

    // Verify that the island degree targets have a UNIQUE solution across all playable slots
    let solutions = 0;
    const curDeg = Array(nIslands).fill(0);
    const remMax = Array(nIslands).fill(0);
    allSlots.forEach((s) => {
      remMax[s.a] += 2;
      remMax[s.b] += 2;
    });

    function dfs(idx) {
      if (solutions > 1) return;
      if (idx === allSlots.length) {
        if (curDeg.every((d, i) => d === targets[i])) solutions++;
        return;
      }
      const s = allSlots[idx];
      remMax[s.a] -= 2;
      remMax[s.b] -= 2;
      for (let v = 0; v <= 2; v++) {
        const na = curDeg[s.a] + v;
        const nb = curDeg[s.b] + v;
        if (
          na <= targets[s.a] &&
          nb <= targets[s.b] &&
          na + remMax[s.a] >= targets[s.a] &&
          nb + remMax[s.b] >= targets[s.b]
        ) {
          curDeg[s.a] = na;
          curDeg[s.b] = nb;
          dfs(idx + 1);
          curDeg[s.a] -= v;
          curDeg[s.b] -= v;
        }
      }
      remMax[s.a] += 2;
      remMax[s.b] += 2;
    }
    dfs(0);

    if (solutions === 1) {
      return { islands: picked, edges: allSlots };
    }
  }

  return FALLBACK_BRIDGES[0];
}

function generateIslandsPuzzle(rng, hasBoost = false) {
  const tpl = generateProceduralBridges(rng);
  const islandTargets = tpl.islands.map((isl) =>
    tpl.edges
      .filter((e) => e.a === isl.id || e.b === isl.id)
      .reduce((s, e) => s + e.target, 0)
  );
  const totalBridgeTaps = tpl.edges.reduce((s, e) => s + e.target, 0);
  const bonusIslandId = hasBoost ? tpl.islands[Math.floor(tpl.islands.length / 2)].id : -1;

  return {
    template: tpl,
    islands: tpl.islands,
    edges: tpl.edges,
    islandTargets,
    totalBridgeTaps,
    bonusIslandId,
    par: Math.ceil(totalBridgeTaps / 2)
  };
}

function mountIslandsStage(stage, rng) {
  // 7x7 display grid where even (r,c) in {0,2,4,6} are a 4x4 Island Lattice,
  // and odd/even cells between orthogonally adjacent islands are playable Bridge Slots.
  const puzzle = generateIslandsPuzzle(rng, stage.hasBoost);
  lastMountedPuzzle = puzzle;
  setStagePar(stage, puzzle.par);

  const { template: tpl, islandTargets, totalBridgeTaps, bonusIslandId } = puzzle;

  let edgeVals =
    stage.savedState && stage.savedState.edgeVals
      ? { ...stage.savedState.edgeVals }
      : Object.fromEntries(tpl.edges.map((e) => [e.id, 0]));
  let halfBridges =
    stage.savedState && typeof stage.savedState.halfBridges === 'number'
      ? stage.savedState.halfBridges
      : 0;
  let bonusClaimed = Boolean(stage.savedState && stage.savedState.bonusClaimed);

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Connect islands with bridges (1 or 2 per slot) so every island matches its number (2 bridge taps = 1 turn). <span class="bonus-inline">⚡ Complete the +2⚡ island for +2 turns</span>`
    : 'Tap dashed slots between islands to build 1 or 2 bridges until every island matches its required count (2 taps = 1 turn).';
  setFeedback('Not every dashed slot needs a bridge! Islands turn green when satisfied.');

  const widget = document.createElement('div');
  widget.className = 'mini-game-widget';
  puzzleBoardMount.appendChild(widget);

  function getIslandCurrentCount(islId) {
    return tpl.edges
      .filter((e) => e.a === islId || e.b === islId)
      .reduce((s, e) => s + (edgeVals[e.id] || 0), 0);
  }

  function renderIslands() {
    widget.innerHTML = `
      <div class="waffle-step-meter">Bridge taps this turn: ${halfBridges} / 2 • Par: ${totalBridgeTaps} taps</div>
      <div class="islands-board" id="islandsGridBox"></div>
    `;

    const boardEl = widget.querySelector('#islandsGridBox');
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isl = tpl.islands.find((x) => x.r === r && x.c === c);
        if (isl) {
          const cur = getIslandCurrentCount(isl.id);
          const req = islandTargets[isl.id];
          const isDone = cur === req;
          const isOver = cur > req;
          const showBonus = isl.id === bonusIslandId && !bonusClaimed;
          const div = document.createElement('div');
          div.className = `island-node ${isDone ? 'done' : isOver ? 'over' : ''} ${showBonus ? 'bonus-island' : ''}`;
          div.innerHTML = `
            ${showBonus ? '<span class="reactor-bonus-badge">+2⚡</span>' : ''}
            <span>${req}</span>
          `;
          boardEl.appendChild(div);
          continue;
        }

        const edge = tpl.edges.find((e) => e.r === r && e.c === c);
        if (edge) {
          const val = edgeVals[edge.id] || 0;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `bridge-slot ${val > 0 ? 'active-bridge' : ''}`;
          btn.setAttribute('data-edge-id', edge.id);
          let sym = '+';
          if (val === 1) sym = edge.dir === 'H' ? '━' : '┃';
          else if (val === 2) sym = edge.dir === 'H' ? '═' : '║';
          btn.textContent = sym;

          btn.addEventListener('click', () => {
            if (gauntletState.status !== 'in_progress') return;
            edgeVals[edge.id] = ((edgeVals[edge.id] || 0) + 1) % 3;
            halfBridges++;
            if (halfBridges >= 2) {
              halfBridges = 0;
              spendTurn(1);
            } else {
              playUiClick();
            }

            if (
              bonusIslandId !== -1 &&
              !bonusClaimed &&
              getIslandCurrentCount(bonusIslandId) === islandTargets[bonusIslandId]
            ) {
              bonusClaimed = true;
              grantBonusTurns(2, '⚡ Golden Island connected!');
            }

            stage.savedState = { edgeVals: { ...edgeVals }, halfBridges, bonusClaimed };
            saveStateForActiveDate();
            renderIslands();

            if (tpl.islands.every((x) => getIslandCurrentCount(x.id) === islandTargets[x.id])) {
              setFeedback('All islands connected!', 'good');
              setTimeout(() => completeCurrentStage(), 380);
              return;
            }

            if (halfBridges === 0) {
              checkOutOfTurnsAfterFailedMove();
            }
          });

          boardEl.appendChild(btn);
          continue;
        }

        const empty = document.createElement('div');
        boardEl.appendChild(empty);
      }
    }
  }

  renderIslands();
}

registerMiniGame({
  id: 'islands',
  name: 'Bridges',
  shortName: 'Bridges',
  emoji: '🌉',
  mount: mountIslandsStage
});

if (typeof module !== 'undefined' && module.exports) {
  Object.assign(module.exports, {
    FALLBACK_BRIDGES,
    generateProceduralBridges,
    generateIslandsPuzzle,
    mountIslandsStage
  });
}
