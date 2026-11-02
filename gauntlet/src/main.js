// ============================================================================
// DAILY GAUNTLET — Main Application Shell, Stage Dispatcher & Bootstrap
// ============================================================================

if (nextStageBtn) {
  nextStageBtn.addEventListener('click', () => {
    playUiClick();
    if (gauntletState && gauntletState.isSingleGameSandbox) {
      startSingleGameSandbox(gauntletState.sandboxGameId, gauntletState.stages[0].hasBoost);
      return;
    }
    mountCurrentStage();
  });
}

function mountCurrentStage() {
  if (activeCleanupFn) {
    activeCleanupFn();
    activeCleanupFn = null;
  }

  if (gauntletState.status !== 'in_progress') {
    showEndOfRunSummary();
    return;
  }

  const idx = gauntletState.currentStageIndex;
  const stage = gauntletState.stages[idx];

  stageClearedCard.classList.add('hidden');
  runSummaryCard.classList.add('hidden');
  activePuzzleCard.classList.remove('hidden');

  currentStagePill.textContent = `STAGE ${idx + 1}/5`;
  currentPuzzleTitle.textContent = `${stage.emoji} ${stage.name}`;
  updateTopHud();
  renderStepper();

  puzzleBoardMount.innerHTML = '';
  const stageRng = createPRNG(`${gauntletState.seedKey}-stage-${stage.id}-${idx}`);

  const spec = getMiniGameSpec(stage.id);
  if (spec && typeof spec.mount === 'function') {
    spec.mount(stage, stageRng);
  }
}

// ============================================================================
// END OF GAUNTLET SUMMARY & SHAREABLE CLIPBOARD SCORE
// ============================================================================
function getStageRemainingTurnsList() {
  let running = INITIAL_TURNS;
  return gauntletState.stages.map((s) => {
    running = Math.max(0, running - s.turnsSpent + s.bonusEarned);
    const val =
      s.turnsRemainingAfter !== null && s.turnsRemainingAfter !== undefined
        ? s.turnsRemainingAfter
        : running;
    return { stage: s, remaining: val };
  });
}

function buildShareableText() {
  const items = getStageRemainingTurnsList();
  const trail = items
    .filter(({ stage }) => stage.status === 'cleared' || stage.status === 'failed')
    .map(({ stage, remaining }) =>
      stage.status === 'cleared' ? `${stage.emoji} ${remaining}` : `${stage.emoji} 💀`
    )
    .join(' → ');

  return `Daily Gauntlet #${gauntletState.dayNumber}\n${trail}\nhttps://games.shaffer.tech/gauntlet`;
}

function showEndOfRunSummary() {
  if (activeCleanupFn) {
    activeCleanupFn();
    activeCleanupFn = null;
  }

  activePuzzleCard.classList.add('hidden');
  stageClearedCard.classList.add('hidden');
  runSummaryCard.classList.remove('hidden');

  const clearedCount = gauntletState.stages.filter((s) => s.status === 'cleared').length;
  const isWon = gauntletState.status === 'won';

  summaryStatusBanner.textContent = isWon ? '🏆 GAUNTLET COMPLETE' : 'OUT OF TURNS';
  summaryStatusBanner.classList.toggle('failed', !isWon);

  summaryHeadline.textContent = isWon
    ? `${gauntletState.turnsRemaining} Turns Left!`
    : `Reached Stage ${gauntletState.currentStageIndex + 1}`;
  summarySubtext.textContent = isWon
    ? `You beat all 5 puzzles for ${gauntletState.dateStr}!`
    : 'You ran out of turns before finishing the gauntlet.';

  summaryStagesCleared.textContent = `${clearedCount}/${gauntletState.stages.length}`;
  summaryTurnsLeft.textContent = gauntletState.turnsRemaining;
  summaryBonusEarned.textContent = `+${gauntletState.totalBonusEarned}`;

  summaryStageList.innerHTML = '';
  const items = getStageRemainingTurnsList();
  items.forEach(({ stage: s, remaining }, idx) => {
    const row = document.createElement('div');
    row.className = 'summary-stage-row';
    let rightText = '🔒';
    const parSuffix = s.par ? ` (${s.turnsSpent}/${s.par} par)` : '';
    if (s.status === 'cleared') {
      rightText = `⚡ ${remaining} left${parSuffix}`;
    } else if (s.status === 'failed') {
      rightText = `💀 0 left${parSuffix}`;
    }
    row.innerHTML = `
      <span>${idx + 1}. ${s.emoji} ${s.name}</span>
      <span>${rightText}</span>
    `;
    summaryStageList.appendChild(row);
  });

  shareTextPreview.textContent = buildShareableText();
  updateTopHud();
  renderStepper();
}

if (copyShareBtn) {
  copyShareBtn.addEventListener('click', async () => {
    playUiClick();
    const text = buildShareableText();
    try {
      await navigator.clipboard.writeText(text);
      copyShareBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyShareBtn.textContent = 'Copy Score';
      }, 2000);
    } catch (err) {
      copyShareBtn.textContent = 'Select text above';
    }
  });
}

// ============================================================================
// HELP MODAL, LOCALHOST DEV SANDBOX, MIDNIGHT COUNTDOWN & AUDIO MUTE
// ============================================================================
const IS_LOCALHOST =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1' ||
    window.location.hostname === '' ||
    window.location.hostname.endsWith('.local'));

const devSandboxBtn = typeof document !== 'undefined' ? document.getElementById('devSandboxBtn') : null;
const devSandboxDialog = typeof document !== 'undefined' ? document.getElementById('devSandboxDialog') : null;
const closeDevSandboxBtn = typeof document !== 'undefined' ? document.getElementById('closeDevSandboxBtn') : null;
const devIncludeBoostCheckbox = typeof document !== 'undefined' ? document.getElementById('devIncludeBoostCheckbox') : null;
const devGamesGrid = typeof document !== 'undefined' ? document.getElementById('devGamesGrid') : null;
const devRandomGauntletBtn = typeof document !== 'undefined' ? document.getElementById('devRandomGauntletBtn') : null;
const devReturnDailyBtn = typeof document !== 'undefined' ? document.getElementById('devReturnDailyBtn') : null;

function startSingleGameSandbox(gameId, includeBoost) {
  const spec = getMiniGameSpec(gameId) || MINI_GAME_SPECS[0];
  const randCode = Math.floor(1000 + Math.random() * 9000);
  const seedKey = `sandbox-${gameId}-${Date.now()}-${randCode}`;

  gauntletState = {
    seedKey,
    dateStr: activeDateStr,
    dayNumber: randCode,
    isSandbox: true,
    isSingleGameSandbox: true,
    sandboxGameId: spec.id,
    sandboxLabel: `${spec.shortName} #${randCode}`,
    turnsRemaining: INITIAL_TURNS,
    totalBonusEarned: 0,
    currentStageIndex: 0,
    status: 'in_progress',
    stages: [
      {
        index: 0,
        id: spec.id,
        name: spec.name,
        shortName: spec.shortName,
        emoji: spec.emoji,
        hasBoost: Boolean(includeBoost),
        turnsSpent: 0,
        bonusEarned: 0,
        turnsRemainingAfter: null,
        status: 'active'
      }
    ]
  };
  mountCurrentStage();
}

function startRandomFullSandboxGauntlet() {
  const randCode = Math.floor(1000 + Math.random() * 9000);
  const seedKey = `sandbox-full-${Date.now()}-${randCode}`;
  const orderRng = createPRNG(`${seedKey}-order`);
  const shuffledSpecs = seededShuffle(MINI_GAME_SPECS, orderRng).slice(0, STAGES_PER_GAUNTLET);
  const boostRng = createPRNG(`${seedKey}-boosts`);
  const stageIndices = shuffledSpecs.map((_, idx) => idx);
  const boostStageSet = new Set(
    seededShuffle(stageIndices, boostRng).slice(0, BOOSTS_PER_GAUNTLET)
  );

  gauntletState = {
    seedKey,
    dateStr: activeDateStr,
    dayNumber: randCode,
    isSandbox: true,
    isSingleGameSandbox: false,
    sandboxLabel: `Random 5 #${randCode}`,
    turnsRemaining: INITIAL_TURNS,
    totalBonusEarned: 0,
    currentStageIndex: 0,
    status: 'in_progress',
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
  mountCurrentStage();
}

if (IS_LOCALHOST && devSandboxBtn && devSandboxDialog) {
  devSandboxBtn.classList.remove('hidden');

  MINI_GAME_SPECS.forEach((spec) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dev-game-btn';
    btn.innerHTML = `<span>${spec.emoji}</span><span>${spec.name}</span>`;
    btn.addEventListener('click', () => {
      playUiClick();
      devSandboxDialog.close();
      startSingleGameSandbox(spec.id, devIncludeBoostCheckbox.checked);
    });
    devGamesGrid.appendChild(btn);
  });

  devSandboxBtn.addEventListener('click', () => {
    playUiClick();
    devSandboxDialog.showModal();
  });

  closeDevSandboxBtn.addEventListener('click', () => {
    playUiClick();
    devSandboxDialog.close();
  });

  devRandomGauntletBtn.addEventListener('click', () => {
    playUiClick();
    devSandboxDialog.close();
    startRandomFullSandboxGauntlet();
  });

  devReturnDailyBtn.addEventListener('click', () => {
    playUiClick();
    devSandboxDialog.close();
    loadOrInitToday();
  });
}

const helpDialog = typeof document !== 'undefined' ? document.getElementById('helpDialog') : null;
const helpModalBtn = typeof document !== 'undefined' ? document.getElementById('helpModalBtn') : null;
const closeHelpBtn = typeof document !== 'undefined' ? document.getElementById('closeHelpBtn') : null;
const gotItHelpBtn = typeof document !== 'undefined' ? document.getElementById('gotItHelpBtn') : null;

if (helpModalBtn && helpDialog) {
  helpModalBtn.addEventListener('click', () => {
    playUiClick();
    helpDialog.showModal();
  });
}
if (closeHelpBtn && helpDialog) {
  closeHelpBtn.addEventListener('click', () => {
    playUiClick();
    helpDialog.close();
  });
}
if (gotItHelpBtn && helpDialog) {
  gotItHelpBtn.addEventListener('click', () => {
    playUiClick();
    helpDialog.close();
  });
}

// Light-dismiss fallback for browsers without native closedBy support
if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
  [helpDialog, devSandboxDialog].filter(Boolean).forEach((dlg) => {
    dlg.addEventListener('click', (event) => {
      if (event.target !== dlg) return;
      const rect = dlg.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (isDialogContent) return;
      dlg.close();
    });
  });
}

// Countdown clock to local midnight
function updateCountdownClock() {
  const now = new Date();
  const todayNowStr = formatDateYMD(now);
  if (todayNowStr !== activeDateStr) {
    loadOrInitToday();
    return;
  }
  const el = typeof document !== 'undefined' ? document.getElementById('nextDailyCountdown') : null;
  if (!el) return;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const diffMs = Math.max(0, tomorrow - now);
  const hrs = String(Math.floor(diffMs / 3600000)).padStart(2, '0');
  const mins = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, '0');
  const secs = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, '0');
  el.textContent = `Next: ${hrs}:${mins}:${secs}`;
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  setInterval(updateCountdownClock, 1000);
  updateCountdownClock();
}

// Global Mute Toggle
const soundToggleBtn = typeof document !== 'undefined' ? document.getElementById('soundToggleBtn') : null;
const volumeIcon = typeof document !== 'undefined' ? document.getElementById('volumeIcon') : null;

function updateMuteIcon() {
  if (!volumeIcon || !soundToggleBtn) return;
  if (isMuted) {
    volumeIcon.innerHTML =
      '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
    soundToggleBtn.style.color = 'var(--danger-red)';
  } else {
    volumeIcon.innerHTML =
      '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
    soundToggleBtn.style.color = 'var(--text-main)';
  }
}

if (soundToggleBtn) {
  updateMuteIcon();
  soundToggleBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    localStorage.setItem(MUTE_KEY, isMuted ? 'true' : 'false');
    updateMuteIcon();
    if (!isMuted) playUiClick();
  });
}

// Boot today's gauntlet when running in browser DOM
if (typeof document !== 'undefined' && puzzleBoardMount) {
  loadOrInitToday();
}
