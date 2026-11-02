// ============================================================================
// DAILY GAUNTLET — Shared State Persistence, HUD & Turn Pool Management
// ============================================================================

const STORAGE_KEY = 'shaffer-gauntlet-archive-v6';
const INITIAL_TURNS = 25;
const STAGES_PER_GAUNTLET = 5;
const BOOSTS_PER_GAUNTLET = 2;

let activeDateStr = formatDateYMD(new Date());
let gauntletState = null;
let activeCleanupFn = null;

function loadArchiveMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (err) {
    console.warn('Could not read gauntlet archive:', err);
  }
  return {};
}

function saveStateForActiveDate() {
  if (!gauntletState || gauntletState.isSandbox) return;
  try {
    const map = loadArchiveMap();
    map[gauntletState.dateStr] = gauntletState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Could not save gauntlet state:', err);
  }
}

function createFreshRunState(dateStr) {
  const seedKey = `daily-${dateStr}`;
  const orderRng = createPRNG(`${seedKey}-order`);
  const shuffledSpecs = seededShuffle(MINI_GAME_SPECS, orderRng).slice(0, STAGES_PER_GAUNTLET);

  // Deterministically pick exactly 2 stages out of the gauntlet to contain a turn boost
  const boostRng = createPRNG(`${seedKey}-boosts`);
  const stageIndices = shuffledSpecs.map((_, idx) => idx);
  const boostStageSet = new Set(seededShuffle(stageIndices, boostRng).slice(0, BOOSTS_PER_GAUNTLET));

  return {
    seedKey,
    dateStr,
    dayNumber: getDayNumberForDate(dateStr),
    turnsRemaining: INITIAL_TURNS,
    totalBonusEarned: 0,
    currentStageIndex: 0,
    status: 'in_progress', // 'in_progress' | 'won' | 'lost'
    stages: shuffledSpecs.map((spec, idx) => ({
      index: idx,
      id: spec.id,
      name: spec.name,
      shortName: spec.shortName,
      emoji: spec.emoji,
      hasBoost: boostStageSet.has(idx),
      turnsSpent: 0,
      bonusEarned: 0,
      turnsRemainingAfter: null,
      status: idx === 0 ? 'active' : 'locked'
    }))
  };
}

function loadOrInitToday() {
  activeDateStr = formatDateYMD(new Date());
  const map = loadArchiveMap();
  if (map[activeDateStr] && Array.isArray(map[activeDateStr].stages)) {
    gauntletState = map[activeDateStr];
    gauntletState.stages.forEach((st) => {
      const spec = getMiniGameSpec(st.id);
      if (spec) {
        st.name = spec.name;
        st.shortName = spec.shortName;
      }
    });
  } else {
    gauntletState = createFreshRunState(activeDateStr);
    saveStateForActiveDate();
  }
  mountCurrentStage();
}

// ============================================================================
// DOM REFERENCES & HUD RENDERING
// ============================================================================
const dailySeedBadge = typeof document !== 'undefined' ? document.getElementById('dailySeedBadge') : null;
const dailyDateLabel = typeof document !== 'undefined' ? document.getElementById('dailyDateLabel') : null;
const turnsRemainingValue = typeof document !== 'undefined' ? document.getElementById('turnsRemainingValue') : null;
const turnHudBox = typeof document !== 'undefined' ? document.getElementById('turnHudBox') : null;
const turnHealthFill = typeof document !== 'undefined' ? document.getElementById('turnHealthFill') : null;
const turnDeltaContainer = typeof document !== 'undefined' ? document.getElementById('turnDeltaContainer') : null;
const stageStepper = typeof document !== 'undefined' ? document.getElementById('stageStepper') : null;

const activePuzzleCard = typeof document !== 'undefined' ? document.getElementById('activePuzzleCard') : null;
const currentStagePill = typeof document !== 'undefined' ? document.getElementById('currentStagePill') : null;
const currentPuzzleTitle = typeof document !== 'undefined' ? document.getElementById('currentPuzzleTitle') : null;
const stageParValue = typeof document !== 'undefined' ? document.getElementById('stageParValue') : null;
const stageTurnsSpent = typeof document !== 'undefined' ? document.getElementById('stageTurnsSpent') : null;
const currentPuzzleDesc = typeof document !== 'undefined' ? document.getElementById('currentPuzzleDesc') : null;
const puzzleBoardMount = typeof document !== 'undefined' ? document.getElementById('puzzleBoardMount') : null;
const stageFeedbackBar = typeof document !== 'undefined' ? document.getElementById('stageFeedbackBar') : null;

const stageClearedCard = typeof document !== 'undefined' ? document.getElementById('stageClearedCard') : null;
const interstitialBadge = typeof document !== 'undefined' ? document.getElementById('interstitialBadge') : null;
const interstitialTitle = typeof document !== 'undefined' ? document.getElementById('interstitialTitle') : null;
const interstitialSummary = typeof document !== 'undefined' ? document.getElementById('interstitialSummary') : null;
const interstitialBonuses = typeof document !== 'undefined' ? document.getElementById('interstitialBonuses') : null;
const nextStageBtn = typeof document !== 'undefined' ? document.getElementById('nextStageBtn') : null;

const runSummaryCard = typeof document !== 'undefined' ? document.getElementById('runSummaryCard') : null;
const summaryStatusBanner = typeof document !== 'undefined' ? document.getElementById('summaryStatusBanner') : null;
const summaryHeadline = typeof document !== 'undefined' ? document.getElementById('summaryHeadline') : null;
const summarySubtext = typeof document !== 'undefined' ? document.getElementById('summarySubtext') : null;
const summaryStagesCleared = typeof document !== 'undefined' ? document.getElementById('summaryStagesCleared') : null;
const summaryTurnsLeft = typeof document !== 'undefined' ? document.getElementById('summaryTurnsLeft') : null;
const summaryBonusEarned = typeof document !== 'undefined' ? document.getElementById('summaryBonusEarned') : null;
const summaryStageList = typeof document !== 'undefined' ? document.getElementById('summaryStageList') : null;
const shareTextPreview = typeof document !== 'undefined' ? document.getElementById('shareTextPreview') : null;
const copyShareBtn = typeof document !== 'undefined' ? document.getElementById('copyShareBtn') : null;

function showTurnDeltaAnimation(delta) {
  if (!delta || !turnDeltaContainer || !turnHudBox) return;
  const el = document.createElement('div');
  el.className = `turn-delta-float ${delta > 0 ? 'positive' : 'negative'}`;
  el.textContent = delta > 0 ? `+${delta}⚡` : `${delta}⚡`;
  turnDeltaContainer.appendChild(el);
  setTimeout(() => el.remove(), 900);

  if (delta > 0) {
    turnHudBox.classList.add('bonus-pulse');
    setTimeout(() => turnHudBox.classList.remove('bonus-pulse'), 450);
  } else if (delta < 0) {
    turnHudBox.classList.remove('damage-hit');
    void turnHudBox.offsetWidth;
    turnHudBox.classList.add('damage-hit');
    setTimeout(() => turnHudBox.classList.remove('damage-hit'), 280);
  }
}

function updateTopHud() {
  if (!gauntletState || !dailySeedBadge || !dailyDateLabel) return;
  if (gauntletState.isSandbox) {
    dailySeedBadge.textContent = 'SANDBOX';
    dailyDateLabel.textContent = gauntletState.sandboxLabel || 'Random Seed';
  } else {
    dailySeedBadge.textContent = `#${gauntletState.dayNumber}`;
    dailyDateLabel.textContent = formatShortDate(gauntletState.dateStr);
  }

  const turns = gauntletState.turnsRemaining;
  turnsRemainingValue.textContent = turns;
  const fillPct = Math.max(0, Math.min(100, (turns / INITIAL_TURNS) * 100));
  if (turnHealthFill) {
    turnHealthFill.style.width = `${fillPct}%`;
  }
  turnHudBox.classList.toggle('mid-turns', turns > 5 && turns <= 12);
  turnHudBox.classList.toggle('low-turns', turns <= 5);

  const activeStage = gauntletState.stages[gauntletState.currentStageIndex];
  if (activeStage) {
    stageTurnsSpent.textContent = activeStage.turnsSpent;
    if (stageParValue && activeStage.par) {
      stageParValue.textContent = activeStage.par;
    }
  }
}

function setStagePar(stage, parTurns) {
  stage.par = parTurns;
  if (stageParValue) {
    stageParValue.textContent = parTurns;
  }
}

function renderStepper() {
  if (!stageStepper || !gauntletState) return;
  stageStepper.innerHTML = '';
  gauntletState.stages.forEach((st, idx) => {
    const node = document.createElement('div');
    let stateClass = '';
    if (st.status === 'cleared') stateClass = 'completed';
    else if (st.status === 'failed') stateClass = 'failed';
    else if (idx === gauntletState.currentStageIndex && gauntletState.status === 'in_progress') {
      stateClass = 'active';
    }
    node.className = `step-node ${stateClass}`;

    let subText = st.emoji;
    if (st.status === 'cleared') subText = `⚡ ${st.turnsRemainingAfter ?? ''}`;
    else if (st.status === 'failed') subText = 'Out';

    const boostBadge =
      st.hasBoost && st.status !== 'cleared'
        ? '<span class="step-checkpoint-badge">+2⚡</span>'
        : '';

    node.innerHTML = `
      ${boostBadge}
      <div class="step-title">${idx + 1}. ${st.shortName || st.name}</div>
      <div class="step-sub">${subText}</div>
    `;
    stageStepper.appendChild(node);
  });
}

function setFeedback(message, tone = 'info') {
  if (!stageFeedbackBar) return;
  stageFeedbackBar.textContent = message;
  stageFeedbackBar.className = 'feedback-pill';
  if (tone === 'good') stageFeedbackBar.classList.add('good');
  if (tone === 'warn') stageFeedbackBar.classList.add('warn');
  if (tone === 'bad') stageFeedbackBar.classList.add('bad');
}

// ============================================================================
// TURN DEDUCTION, BONUS AWARD & STAGE TRANSITION LOGIC
// ============================================================================
function spendTurn(amount = 1) {
  if (gauntletState.status !== 'in_progress') return false;
  const stage = gauntletState.stages[gauntletState.currentStageIndex];
  stage.turnsSpent += amount;
  gauntletState.turnsRemaining = Math.max(0, gauntletState.turnsRemaining - amount);
  playTurnTick();
  showTurnDeltaAnimation(-amount);
  updateTopHud();
  renderStepper();
  saveStateForActiveDate();
  return true;
}

function checkOutOfTurnsAfterFailedMove() {
  if (gauntletState.turnsRemaining <= 0 && gauntletState.status === 'in_progress') {
    const stage = gauntletState.stages[gauntletState.currentStageIndex];
    stage.status = 'failed';
    stage.turnsRemainingAfter = 0;
    gauntletState.status = 'lost';
    playErrorBuzz();
    saveStateForActiveDate();
    renderStepper();
    setTimeout(() => {
      showEndOfRunSummary();
    }, 450);
    return true;
  }
  return false;
}

function grantBonusTurns(amount, reasonText) {
  if (amount <= 0) return;
  const stage = gauntletState.stages[gauntletState.currentStageIndex];
  stage.bonusEarned += amount;
  gauntletState.turnsRemaining += amount;
  gauntletState.totalBonusEarned += amount;
  playBonusChime();
  showTurnDeltaAnimation(amount);
  updateTopHud();
  saveStateForActiveDate();
  if (reasonText) {
    setFeedback(`${reasonText} (+${amount}⚡)`, 'good');
  }
}

function completeCurrentStage() {
  if (activeCleanupFn) {
    activeCleanupFn();
    activeCleanupFn = null;
  }

  const idx = gauntletState.currentStageIndex;
  const stage = gauntletState.stages[idx];
  stage.status = 'cleared';
  stage.turnsRemainingAfter = gauntletState.turnsRemaining;

  playStageClearFanfare();
  updateTopHud();
  renderStepper();

  if (gauntletState.isSingleGameSandbox) {
    activePuzzleCard.classList.add('hidden');
    runSummaryCard.classList.add('hidden');
    stageClearedCard.classList.remove('hidden');

    interstitialBadge.textContent = 'SANDBOX PUZZLE CLEARED';
    interstitialTitle.textContent = `${stage.emoji} ${stage.name} Solved!`;
    const sandboxParNote = stage.par ? ` (Par ${stage.par})` : '';
    interstitialSummary.textContent = `Solved in ${stage.turnsSpent} turn${
      stage.turnsSpent === 1 ? '' : 's'
    }${sandboxParNote} • ${gauntletState.turnsRemaining} turns remaining.`;

    interstitialBonuses.innerHTML = '';
    if (stage.bonusEarned > 0) {
      const pill = document.createElement('div');
      pill.className = 'bonus-pill';
      pill.innerHTML = `<span>⚡ Stage Boost Collected</span><strong>+${stage.bonusEarned}⚡</strong>`;
      interstitialBonuses.appendChild(pill);
    }

    nextStageBtn.textContent = `🎲 New Random ${stage.name} →`;
    return;
  }

  if (idx >= gauntletState.stages.length - 1) {
    gauntletState.status = 'won';
    saveStateForActiveDate();
    showEndOfRunSummary();
    return;
  }

  gauntletState.currentStageIndex = idx + 1;
  gauntletState.stages[idx + 1].status = 'active';
  saveStateForActiveDate();

  activePuzzleCard.classList.add('hidden');
  runSummaryCard.classList.add('hidden');
  stageClearedCard.classList.remove('hidden');

  interstitialBadge.textContent = `STAGE ${idx + 1} OF ${gauntletState.stages.length} CLEARED`;
  interstitialTitle.textContent = `${stage.emoji} ${stage.name} Solved!`;
  const parNote = stage.par ? ` (Par ${stage.par})` : '';
  interstitialSummary.textContent = `Finished in ${stage.turnsSpent} turn${stage.turnsSpent === 1 ? '' : 's'}${parNote}. You have ${gauntletState.turnsRemaining} turns left.`;

  interstitialBonuses.innerHTML = '';
  if (stage.bonusEarned > 0) {
    const pill = document.createElement('div');
    pill.className = 'bonus-pill';
    pill.innerHTML = `<span>⚡ Stage Boost Collected</span><strong>+${stage.bonusEarned}⚡</strong>`;
    interstitialBonuses.appendChild(pill);
  }

  const nextStage = gauntletState.stages[idx + 1];
  nextStageBtn.textContent = `Stage ${idx + 2}: ${nextStage.emoji} ${nextStage.name} →`;
}

if (typeof module !== 'undefined' && module.exports) {
  Object.assign(module.exports, {
    STORAGE_KEY,
    INITIAL_TURNS,
    STAGES_PER_GAUNTLET,
    BOOSTS_PER_GAUNTLET,
    createFreshRunState,
    setStagePar,
    spendTurn,
    checkOutOfTurnsAfterFailedMove,
    grantBonusTurns,
    completeCurrentStage
  });
}
