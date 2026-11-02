// --------------------------------------------------------------------------
// MINI-GAME 1: WORDLE (5-Letter Word Guess)
// --------------------------------------------------------------------------
function mountWordleStage(stage, rng) {
  setStagePar(stage, 4);
  const targetWord = WORDLE_TARGETS[Math.floor(rng() * WORDLE_TARGETS.length)];
  const bonusPool = 'BCDFGHJKLMNPQRSTVWXYZ'.split('').filter((c) => !targetWord.includes(c));
  const bonusLetter = stage.hasBoost ? bonusPool[Math.floor(rng() * bonusPool.length)] : null;
  let bonusClaimed = Boolean(stage.savedState && stage.savedState.bonusClaimed);

  currentPuzzleDesc.innerHTML = bonusLetter
    ? `Guess the 5-letter word (1 guess = 1 turn). <span class="bonus-inline">⚡ Use "${bonusLetter}" for +2 turns</span>`
    : 'Guess the 5-letter word (1 guess = 1 turn).';
  setFeedback('Type a 5-letter word and press ENTER.');

  const guesses = stage.savedState && Array.isArray(stage.savedState.guesses)
    ? stage.savedState.guesses.slice()
    : [];
  let currentInput = '';
  const minVisibleRows = 6;

  const widgetEl = document.createElement('div');
  widgetEl.className = 'wordle-widget';

  const boardEl = document.createElement('div');
  boardEl.className = 'wordle-board';

  const kbEl = document.createElement('div');
  kbEl.className = 'wordle-keyboard';

  widgetEl.appendChild(boardEl);
  widgetEl.appendChild(kbEl);
  puzzleBoardMount.appendChild(widgetEl);

  const keyStates = stage.savedState && stage.savedState.keyStates
    ? { ...stage.savedState.keyStates }
    : {};

  function evaluateGuess(guess, target) {
    const result = Array(5).fill('absent');
    const targetChars = target.split('');
    const guessChars = guess.split('');

    for (let i = 0; i < 5; i++) {
      if (guessChars[i] === targetChars[i]) {
        result[i] = 'correct';
        targetChars[i] = null;
        guessChars[i] = null;
      }
    }
    for (let i = 0; i < 5; i++) {
      if (guessChars[i] !== null) {
        const foundIdx = targetChars.indexOf(guessChars[i]);
        if (foundIdx !== -1) {
          result[i] = 'present';
          targetChars[foundIdx] = null;
        }
      }
    }
    return result;
  }

  function renderWordleUI() {
    boardEl.innerHTML = '';
    const totalRows = Math.max(minVisibleRows, guesses.length + 1);
    let activeRowEl = null;

    for (let r = 0; r < totalRows; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'wordle-row';
      const submitted = guesses[r];
      const isCurrent = r === guesses.length;
      if (isCurrent) activeRowEl = rowEl;

      for (let c = 0; c < 5; c++) {
        const cell = document.createElement('div');
        cell.className = 'wordle-cell';
        if (submitted) {
          cell.textContent = submitted.word[c];
          cell.classList.add(submitted.eval[c]);
        } else if (isCurrent && currentInput[c]) {
          cell.textContent = currentInput[c];
          cell.classList.add('filled');
        }
        rowEl.appendChild(cell);
      }
      boardEl.appendChild(rowEl);
    }

    if (activeRowEl && guesses.length >= minVisibleRows - 1) {
      requestAnimationFrame(() => {
        activeRowEl.scrollIntoView({ block: 'nearest' });
      });
    }

    const rows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
    ];
    kbEl.innerHTML = '';
    rows.forEach((r) => {
      const rEl = document.createElement('div');
      rEl.className = 'kb-row';
      r.forEach((k) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'kb-key';
        if (k === 'ENTER' || k === '⌫') btn.classList.add('wide');
        if (keyStates[k]) btn.classList.add(keyStates[k]);
        if (k === bonusLetter && !bonusClaimed) btn.classList.add('bonus-letter');
        btn.textContent = k;
        btn.addEventListener('click', () => handleKeyInput(k));
        rEl.appendChild(btn);
      });
      kbEl.appendChild(rEl);
    });
  }

  function handleKeyInput(key) {
    if (gauntletState.status !== 'in_progress') return;
    if (key === '⌫' || key === 'BACKSPACE') {
      if (currentInput.length > 0) {
        currentInput = currentInput.slice(0, -1);
        playUiClick();
        renderWordleUI();
      }
      return;
    }
    if (key === 'ENTER') {
      if (currentInput.length < 5) {
        playErrorBuzz();
        setFeedback('Enter a 5-letter word first!', 'warn');
        return;
      }
      if (!WORDLE_VALID_SET.has(currentInput)) {
        playErrorBuzz();
        setFeedback(`"${currentInput}" is not in the word list.`, 'warn');
        return;
      }

      const guessWord = currentInput;
      currentInput = '';
      const evalResult = evaluateGuess(guessWord, targetWord);
      guesses.push({ word: guessWord, eval: evalResult });

      for (let i = 0; i < 5; i++) {
        const ch = guessWord[i];
        const st = evalResult[i];
        const prev = keyStates[ch];
        if (st === 'correct' || (st === 'present' && prev !== 'correct') || (!prev && st === 'absent')) {
          keyStates[ch] = st;
        }
      }

      spendTurn(1);

      if (bonusLetter && !bonusClaimed && guessWord.includes(bonusLetter)) {
        bonusClaimed = true;
        grantBonusTurns(2, `⚡ Golden "${bonusLetter}" used!`);
      }

      stage.savedState = {
        guesses: guesses.slice(),
        keyStates: { ...keyStates },
        bonusClaimed
      };
      saveStateForActiveDate();

      renderWordleUI();

      if (guessWord === targetWord) {
        setFeedback(`Spot on! The word was ${targetWord}.`, 'good');
        setTimeout(() => completeCurrentStage(), 400);
        return;
      }

      if (!checkOutOfTurnsAfterFailedMove()) {
        const greens = evalResult.filter((e) => e === 'correct').length;
        const yellows = evalResult.filter((e) => e === 'present').length;
        setFeedback(`${greens} green, ${yellows} yellow.`, 'info');
      }
      return;
    }

    if (/^[A-Z]$/.test(key) && currentInput.length < 5) {
      currentInput += key;
      playUiClick();
      renderWordleUI();
    }
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toUpperCase();
    if (k === 'ENTER' || k === 'BACKSPACE' || /^[A-Z]$/.test(k)) {
      e.preventDefault();
      handleKeyInput(k);
    }
  }

  window.addEventListener('keydown', onKeyDown);
  activeCleanupFn = () => window.removeEventListener('keydown', onKeyDown);

  renderWordleUI();
}

registerMiniGame({
  id: 'wordle',
  name: 'Word',
  shortName: 'Word',
  emoji: '🔤',
  mount: mountWordleStage
});
