// --------------------------------------------------------------------------
// MINI-GAME 9: MASTERMIND (4-Peg Codebreaker)
// --------------------------------------------------------------------------
function mountMastermindStage(stage, rng) {
  setStagePar(stage, 4);
  const COLORS = [
    { id: 0, symbol: '●', label: 'Red' },
    { id: 1, symbol: '▲', label: 'Blue' },
    { id: 2, symbol: '■', label: 'Green' },
    { id: 3, symbol: '◆', label: 'Gold' },
    { id: 4, symbol: '★', label: 'Purple' },
    { id: 5, symbol: '✚', label: 'Orange' }
  ];

  // Secret code uses 4 distinct symbols (no duplicates)
  const secret = seededShuffle([0, 1, 2, 3, 4, 5], rng).slice(0, 4);

  const bonusColorId = stage.hasBoost ? secret[Math.floor(rng() * 4)] : -1;
  let bonusClaimed = Boolean(stage.savedState && stage.savedState.bonusClaimed);

  const guesses = stage.savedState && Array.isArray(stage.savedState.guesses)
    ? stage.savedState.guesses.slice()
    : [];
  let currentSlots = stage.savedState && Array.isArray(stage.savedState.currentSlots)
    ? stage.savedState.currentSlots.slice()
    : [null, null, null, null];
  let activeSlot = 0;

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Crack the 4-peg code — no duplicates (🟢 = exact spot, 🟡 = wrong spot; 1 guess = 1 turn). <span class="bonus-inline">⚡ Match the +2⚡ peg in its exact slot for +2 turns</span>`
    : 'Crack the 4-peg code from 6 symbols — no duplicates (🟢 = exact spot, 🟡 = wrong spot; 1 guess = 1 turn).';
  setFeedback('All 4 pegs are distinct (no duplicates). Feedback pips are not in positional order.');

  const widget = document.createElement('div');
  widget.className = 'mastermind-widget';
  puzzleBoardMount.appendChild(widget);

  function evaluateCode(guess, target) {
    let exact = 0;
    const guessRem = [];
    const targetRem = [];
    for (let i = 0; i < 4; i++) {
      if (guess[i] === target[i]) {
        exact++;
      } else {
        guessRem.push(guess[i]);
        targetRem.push(target[i]);
      }
    }
    let partial = 0;
    guessRem.forEach((g) => {
      const idx = targetRem.indexOf(g);
      if (idx !== -1) {
        partial++;
        targetRem.splice(idx, 1);
      }
    });
    return { exact, partial };
  }

  function submitGuess() {
    if (gauntletState.status !== 'in_progress') return;
    if (currentSlots.some((s) => s === null)) {
      playErrorBuzz();
      setFeedback('Fill all 4 slots before submitting!', 'warn');
      return;
    }

    const guess = currentSlots.slice();
    const result = evaluateCode(guess, secret);
    guesses.push({ guess, ...result });
    currentSlots = [null, null, null, null];
    activeSlot = 0;

    spendTurn(1);

    if (
      bonusColorId !== -1 &&
      !bonusClaimed &&
      guess.some((c, idx) => c === bonusColorId && secret[idx] === bonusColorId)
    ) {
      bonusClaimed = true;
      grantBonusTurns(2, '⚡ Bonus peg locked in exact position!');
    }

    stage.savedState = {
      guesses: guesses.slice(),
      currentSlots: currentSlots.slice(),
      bonusClaimed
    };
    saveStateForActiveDate();

    renderMastermind();

    if (result.exact === 4) {
      setFeedback('Secret code cracked!', 'good');
      setTimeout(() => completeCurrentStage(), 380);
      return;
    }

    if (!checkOutOfTurnsAfterFailedMove()) {
      setFeedback(`${result.exact} exact (🟢), ${result.partial} misplaced (🟡).`, 'info');
    }
  }

  function renderMastermind() {
    widget.innerHTML = `
      <div class="mm-history" id="mmHistoryList"></div>
      <div class="mm-controls-bottom">
        <div class="mm-palette" id="mmPaletteRow"></div>
        <button type="button" class="mm-submit-btn" id="mmSubmitBtn" ${
          currentSlots.some((s) => s === null) ? 'disabled' : ''
        }>Submit</button>
      </div>
    `;

    const historyEl = widget.querySelector('#mmHistoryList');
    const totalRows = Math.max(5, guesses.length + 1);
    let activeRowEl = null;

    for (let r = 0; r < totalRows; r++) {
      const item = guesses[r];
      const isCurrent = r === guesses.length;
      const row = document.createElement('div');
      row.className = `mm-row ${isCurrent ? 'active-row' : ''}`;
      if (isCurrent) activeRowEl = row;

      if (item) {
        const pips = [];
        for (let i = 0; i < item.exact; i++) pips.push('<span class="mm-pip exact"></span>');
        for (let i = 0; i < item.partial; i++) pips.push('<span class="mm-pip partial"></span>');
        while (pips.length < 4) pips.push('<span class="mm-pip"></span>');

        row.innerHTML = `
          <span class="mm-row-num">#${r + 1}</span>
          <div class="mm-guess-pegs">
            ${item.guess
              .map((cid) => `<div class="mm-peg mm-color-${cid}">${COLORS[cid].symbol}</div>`)
              .join('')}
          </div>
          <div class="mm-pips">${pips.join('')}</div>
        `;
      } else if (isCurrent) {
        row.innerHTML = `
          <span class="mm-row-num">#${r + 1}</span>
          <div class="mm-guess-pegs" id="mmActiveSlots"></div>
          <div class="mm-pips">
            <span class="mm-pip"></span><span class="mm-pip"></span><span class="mm-pip"></span><span class="mm-pip"></span>
          </div>
        `;
        const slotsEl = row.querySelector('#mmActiveSlots');
        for (let i = 0; i < 4; i++) {
          const val = currentSlots[i];
          const slotBtn = document.createElement('button');
          slotBtn.type = 'button';
          slotBtn.className = `mm-peg ${val !== null ? `mm-color-${val}` : ''} ${
            activeSlot === i ? 'active-slot' : ''
          }`;
          slotBtn.textContent = val !== null ? COLORS[val].symbol : '';
          slotBtn.addEventListener('click', () => {
            playUiClick();
            activeSlot = i;
            renderMastermind();
          });
          slotsEl.appendChild(slotBtn);
        }
      } else {
        row.innerHTML = `
          <span class="mm-row-num">#${r + 1}</span>
          <div class="mm-guess-pegs">
            <div class="mm-peg"></div><div class="mm-peg"></div><div class="mm-peg"></div><div class="mm-peg"></div>
          </div>
          <div class="mm-pips">
            <span class="mm-pip"></span><span class="mm-pip"></span><span class="mm-pip"></span><span class="mm-pip"></span>
          </div>
        `;
      }
      historyEl.appendChild(row);
    }

    if (activeRowEl && guesses.length >= 4) {
      activeRowEl.scrollIntoView({ block: 'nearest' });
    }

    widget.querySelector('#mmSubmitBtn').addEventListener('click', submitGuess);

    const paletteEl = widget.querySelector('#mmPaletteRow');
    COLORS.forEach((col) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const showBonus = col.id === bonusColorId && !bonusClaimed;
      btn.className = `mm-swatch mm-color-${col.id}`;
      btn.innerHTML = `
        ${showBonus ? '<span class="reactor-bonus-badge">+2⚡</span>' : ''}
        <span>${col.symbol}</span>
      `;
      btn.addEventListener('click', () => {
        if (gauntletState.status !== 'in_progress') return;
        playUiClick();
        // Since duplicates aren't allowed, clear this symbol if it was already placed in another slot
        const existingIdx = currentSlots.indexOf(col.id);
        if (existingIdx !== -1 && existingIdx !== activeSlot) {
          currentSlots[existingIdx] = null;
        }
        currentSlots[activeSlot] = col.id;
        const nextEmpty = currentSlots.findIndex((v, idx) => idx > activeSlot && v === null);
        if (nextEmpty !== -1) {
          activeSlot = nextEmpty;
        } else {
          const firstEmpty = currentSlots.findIndex((v) => v === null);
          if (firstEmpty !== -1) activeSlot = firstEmpty;
          else activeSlot = Math.min(3, activeSlot + 1);
        }
        renderMastermind();
      });
      paletteEl.appendChild(btn);
    });
  }

  renderMastermind();
}

registerMiniGame({
  id: 'mastermind',
  name: 'Code',
  shortName: 'Code',
  emoji: '🔐',
  mount: mountMastermindStage
});
