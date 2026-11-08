// --------------------------------------------------------------------------
// MINI-GAME 4: PAIRS (3x4 Memory Match)
// --------------------------------------------------------------------------
function generateMemoryPuzzle(rng, hasBoost = false) {
  const sixthSymbol = hasBoost ? '⚡' : '🌙';
  const symbols = ['🍎', '⭐', '🍀', '💎', '🔥', sixthSymbol];
  const shuffledSymbols = seededShuffle([...symbols, ...symbols], rng);
  return { symbols, shuffledSymbols, par: 7 };
}

function mountMemoryStage(stage, rng) {
  const puzzle = generateMemoryPuzzle(rng, stage.hasBoost);
  lastMountedPuzzle = puzzle;
  setStagePar(stage, puzzle.par);
  const hasResumedMemory = Boolean(
    (stage.savedState && Array.isArray(stage.savedState.matchedIndices)) || stage.turnsSpent > 0
  );
  const matchedSet = new Set(
    stage.savedState && Array.isArray(stage.savedState.matchedIndices)
      ? stage.savedState.matchedIndices
      : []
  );
  const deck = puzzle.shuffledSymbols.map((sym, idx) => ({
    idx,
    symbol: sym,
    isBonus: Boolean(stage.hasBoost && sym === '⚡'),
    flipped: !hasResumedMemory,
    matched: matchedSet.has(idx)
  }));

  let isPreviewing = !hasResumedMemory;
  let selectedIndices = [];
  let lockBoard = !hasResumedMemory;

  currentPuzzleDesc.innerHTML = stage.hasBoost
    ? `Memorize the cards, then match all 6 pairs (1 pair flip = 1 turn). <span class="bonus-inline">⚡ Match ⚡ pair for +2 turns</span>`
    : 'Memorize the cards during the preview, then match all 6 pairs (1 pair flip = 1 turn).';
  setFeedback('👀 Previewing cards — memorize their spots!', 'warn');

  const gridEl = document.createElement('div');
  gridEl.className = 'memory-grid';
  puzzleBoardMount.appendChild(gridEl);

  function renderCards() {
    gridEl.innerHTML = '';
    deck.forEach((card, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const showFace = isPreviewing || card.flipped || card.matched;
      btn.className = `memory-card ${showFace ? 'flipped' : ''} ${card.matched ? 'matched' : ''} ${
        card.isBonus ? 'bonus-card' : ''
      }`;
      btn.innerHTML = showFace
        ? `<span>${card.symbol}</span>`
        : `<span class="memory-card-back">?</span>`;

      btn.addEventListener('click', () => onCardClick(i));
      gridEl.appendChild(btn);
    });
  }

  function onCardClick(i) {
    if (gauntletState.status !== 'in_progress' || lockBoard || isPreviewing) return;
    const card = deck[i];
    if (card.flipped || card.matched) return;

    playUiClick();
    card.flipped = true;
    selectedIndices.push(i);
    renderCards();

    if (selectedIndices.length === 2) {
      lockBoard = true;
      const [firstIdx, secondIdx] = selectedIndices;
      const firstCard = deck[firstIdx];
      const secondCard = deck[secondIdx];

      spendTurn(1);

      if (firstCard.symbol === secondCard.symbol) {
        firstCard.matched = true;
        secondCard.matched = true;
        selectedIndices = [];
        lockBoard = false;

        if (firstCard.isBonus) {
          grantBonusTurns(2, '⚡ Golden Pair matched!');
        } else {
          setFeedback(`Matched ${firstCard.symbol}!`, 'good');
        }

        stage.savedState = {
          matchedIndices: deck.filter((c) => c.matched).map((c) => c.idx)
        };
        saveStateForActiveDate();

        renderCards();

        if (deck.every((c) => c.matched)) {
          setTimeout(() => completeCurrentStage(), 380);
        }
      } else {
        setTimeout(() => {
          firstCard.flipped = false;
          secondCard.flipped = false;
          selectedIndices = [];
          lockBoard = false;
          renderCards();
          if (!checkOutOfTurnsAfterFailedMove()) {
            setFeedback('Not a match — try another pair.', 'info');
          }
        }, 600);
      }
    }
  }

  renderCards();
  if (isPreviewing) {
    const previewTimer = setTimeout(() => {
      deck.forEach((c) => {
        c.flipped = false;
      });
      isPreviewing = false;
      lockBoard = false;
      renderCards();
      setFeedback('Flip two cards at a time to match all 6 pairs.');
    }, 1500);

    activeCleanupFn = () => clearTimeout(previewTimer);
  } else {
    setFeedback('Flip two cards at a time to match all 6 pairs.');
  }
}

registerMiniGame({
  id: 'memory',
  name: 'Pairs',
  shortName: 'Pairs',
  emoji: '🃏',
  mount: mountMemoryStage
});
