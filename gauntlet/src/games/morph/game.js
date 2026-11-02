// --------------------------------------------------------------------------
// MINI-GAME 8: WORD MORPH (4-Letter Word Ladder)
// --------------------------------------------------------------------------
function mountMorphStage(stage, rng) {
  const wordSet = new Set(MORPH_WORDS);
  const validGuessSet = new Set([...MORPH_WORDS, ...MORPH_EXTRA_VALID_WORDS]);

  function getNeighbors(word) {
    const list = [];
    for (let pos = 0; pos < 4; pos++) {
      for (let code = 65; code <= 90; code++) {
        const ch = String.fromCharCode(code);
        if (ch === word[pos]) continue;
        const candidate = word.slice(0, pos) + ch + word.slice(pos + 1);
        if (wordSet.has(candidate)) list.push(candidate);
      }
    }
    return list;
  }

  // Deterministically pick a startWord & goalWord whose shortest path is 3 or 4 steps
  const shuffledWords = seededShuffle(MORPH_WORDS, rng);
  let startWord = 'COLD';
  let goalWord = 'WARM';
  let shortestPath = ['COLD', 'CORD', 'CARD', 'WARD', 'WARM'];

  for (let i = 0; i < Math.min(80, shuffledWords.length); i++) {
    const root = shuffledWords[i];
    const dist = { [root]: 0 };
    const parent = { [root]: null };
    const queue = [root];
    const candidatesAt3or4 = [];

    while (queue.length > 0) {
      const curr = queue.shift();
      const d = dist[curr];
      if (d >= 4) continue;
      const neighbors = getNeighbors(curr);
      for (const nxt of neighbors) {
        if (dist[nxt] === undefined) {
          dist[nxt] = d + 1;
          parent[nxt] = curr;
          queue.push(nxt);
          if (d + 1 === 3 || d + 1 === 4) {
            candidatesAt3or4.push(nxt);
          }
        }
      }
    }

    if (candidatesAt3or4.length > 0) {
      const pickedGoal = candidatesAt3or4[Math.floor(rng() * candidatesAt3or4.length)];
      startWord = root;
      goalWord = pickedGoal;
      const path = [];
      let trace = pickedGoal;
      while (trace) {
        path.unshift(trace);
        trace = parent[trace];
      }
      shortestPath = path;
      break;
    }
  }

  setStagePar(stage, shortestPath.length - 1);

  // If stage has boost, pick a letter from the intermediate shortest path words
  let bonusLetter = null;
  if (stage.hasBoost && shortestPath.length >= 3) {
    const midWord = shortestPath[Math.floor(shortestPath.length / 2)];
    for (let i = 0; i < 4; i++) {
      if (midWord[i] !== startWord[i]) {
        bonusLetter = midWord[i];
        break;
      }
    }
  }

  let chain = stage.savedState && Array.isArray(stage.savedState.chain) && stage.savedState.chain.length > 0
    ? stage.savedState.chain.slice()
    : [startWord];
  let selectedPos = stage.savedState && typeof stage.savedState.selectedPos === 'number'
    ? stage.savedState.selectedPos
    : 0;
  let bonusClaimed = Boolean(stage.savedState && stage.savedState.bonusClaimed);

  currentPuzzleDesc.innerHTML = bonusLetter
    ? `Change 1 letter at a time to morph <strong>${startWord}</strong> into <strong>${goalWord}</strong> (1 word = 1 turn). <span class="bonus-inline">⚡ Form a word using "${bonusLetter}" for +2⚡</span>`
    : `Change 1 letter at a time to morph <strong>${startWord}</strong> into <strong>${goalWord}</strong> (1 word step = 1 turn).`;
  setFeedback('Tap a letter slot (1–4) on your current word, then type or tap a new letter.');

  const widget = document.createElement('div');
  widget.className = 'morph-widget';
  puzzleBoardMount.appendChild(widget);

  function tryLetterInput(ch) {
    if (gauntletState.status !== 'in_progress') return;
    const currentWord = chain[chain.length - 1];
    if (ch === currentWord[selectedPos]) return;

    const nextWord =
      currentWord.slice(0, selectedPos) + ch + currentWord.slice(selectedPos + 1);

    if (chain.includes(nextWord)) {
      playErrorBuzz();
      setFeedback(`"${nextWord}" is already in your chain.`, 'warn');
      return;
    }

    if (!validGuessSet.has(nextWord)) {
      playErrorBuzz();
      setFeedback(`"${nextWord}" is not in the word list.`, 'warn');
      return;
    }

    chain.push(nextWord);
    spendTurn(1);

    if (bonusLetter && !bonusClaimed && nextWord.includes(bonusLetter)) {
      bonusClaimed = true;
      grantBonusTurns(2, `⚡ Bonus letter "${bonusLetter}" morphed!`);
    }

    // Auto-select next position that doesn't match goalWord
    for (let p = 0; p < 4; p++) {
      if (nextWord[p] !== goalWord[p]) {
        selectedPos = p;
        break;
      }
    }

    stage.savedState = {
      chain: chain.slice(),
      selectedPos,
      bonusClaimed
    };
    saveStateForActiveDate();

    renderMorph();

    if (nextWord === goalWord) {
      setFeedback(`Morphed ${startWord} → ${goalWord}!`, 'good');
      setTimeout(() => completeCurrentStage(), 380);
      return;
    }

    if (!checkOutOfTurnsAfterFailedMove()) {
      const matches = [0, 1, 2, 3].filter((i) => nextWord[i] === goalWord[i]).length;
      setFeedback(`${nextWord} (${matches}/4 letters match ${goalWord}).`, 'info');
    }
  }

  function renderMorph() {
    const currentWord = chain[chain.length - 1];

    widget.innerHTML = `
      <div class="morph-ladder">
        <div class="morph-Endpoints">
          <div class="morph-row">
            <span class="morph-row-label">Start</span>
            <div class="morph-word-tiles">
              ${startWord
                .split('')
                .map((ch) => `<div class="morph-tile locked">${ch}</div>`)
                .join('')}
            </div>
            <button type="button" class="secondary-btn" id="morphUndoBtn" style="padding:4px 8px;font-size:0.7rem;" ${
              chain.length <= 1 ? 'disabled' : ''
            }>↩ Undo</button>
          </div>
          <div class="morph-row">
            <span class="morph-row-label">Goal</span>
            <div class="morph-word-tiles">
              ${goalWord
                .split('')
                .map(
                  (ch, idx) =>
                    `<div class="morph-tile ${
                      currentWord[idx] === ch ? 'goal-match' : 'locked'
                    }">${ch}</div>`
                )
                .join('')}
            </div>
            <span class="morph-row-label">${shortestPath.length - 1} par</span>
          </div>
        </div>

        <div class="morph-history-chain">
          ${chain
            .map(
              (w, idx) =>
                `<span class="morph-step-pill ${idx === chain.length - 1 ? 'latest' : ''}">${w}</span>`
            )
            .join(' → ')}
        </div>

        <div class="morph-row" style="justify-content:center;gap:12px;">
          <span class="morph-row-label">Now</span>
          <div class="morph-word-tiles" id="morphActiveWord"></div>
        </div>
      </div>
      <div class="keyboard" id="morphKeyboard"></div>
    `;

    const activeWordEl = widget.querySelector('#morphActiveWord');
    for (let i = 0; i < 4; i++) {
      const tile = document.createElement('button');
      tile.type = 'button';
      const isGoalMatch = currentWord[i] === goalWord[i];
      tile.className = `morph-tile editable ${selectedPos === i ? 'selected-pos' : ''} ${
        isGoalMatch ? 'goal-match' : ''
      }`;
      tile.textContent = currentWord[i];
      tile.addEventListener('click', () => {
        playUiClick();
        selectedPos = i;
        renderMorph();
      });
      activeWordEl.appendChild(tile);
    }

    widget.querySelector('#morphUndoBtn').addEventListener('click', () => {
      if (chain.length > 1) {
        playUiClick();
        chain.pop();
        stage.savedState = {
          chain: chain.slice(),
          selectedPos,
          bonusClaimed
        };
        saveStateForActiveDate();
        renderMorph();
        setFeedback('Stepped back to previous word.', 'info');
      }
    });

    const kbEl = widget.querySelector('#morphKeyboard');
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    rows.forEach((rowStr) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      rowStr.split('').forEach((ch) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const isBonus = ch === bonusLetter && !bonusClaimed;
        btn.className = `kb-key ${isBonus ? 'bonus-letter' : ''}`;
        btn.textContent = ch;
        btn.addEventListener('click', () => tryLetterInput(ch));
        rowEl.appendChild(btn);
      });
      kbEl.appendChild(rowEl);
    });
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectedPos = (selectedPos + 3) % 4;
      renderMorph();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectedPos = (selectedPos + 1) % 4;
      renderMorph();
    } else if (e.key === 'Backspace' && chain.length > 1) {
      e.preventDefault();
      playUiClick();
      chain.pop();
      renderMorph();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      tryLetterInput(e.key.toUpperCase());
    }
  }

  window.addEventListener('keydown', onKeyDown);
  activeCleanupFn = () => window.removeEventListener('keydown', onKeyDown);

  renderMorph();
}

registerMiniGame({
  id: 'morph',
  name: 'Morph',
  shortName: 'Morph',
  emoji: '🔗',
  mount: mountMorphStage
});
