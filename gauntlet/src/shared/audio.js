// ============================================================================
// DAILY GAUNTLET — Shared Web Audio Synthesis Engine
// Respects global 'shaffer-games-muted' preference in localStorage
// ============================================================================

const MUTE_KEY = 'shaffer-games-muted';

let audioCtx = null;
let masterGain = null;
let isMuted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === 'true';

function initAudio() {
  if (audioCtx || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.22, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  } catch (err) {
    console.warn('Audio init warning:', err);
  }
}

function ensureAudioReady() {
  if (isMuted) return false;
  initAudio();
  if (!audioCtx) return false;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return true;
}

function playTone(freq, endFreq, duration, type = 'sine', gainVal = 0.1, delay = 0) {
  if (!ensureAudioReady()) return;
  const now = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq && endFreq !== freq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
  }
  gain.gain.setValueAtTime(gainVal, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + duration);
}

function playTurnTick() {
  playTone(360, 240, 0.07, 'triangle', 0.1);
}

function playUiClick() {
  playTone(540, 660, 0.05, 'sine', 0.07);
}

function playBonusChime() {
  playTone(523.25, 659.25, 0.12, 'sine', 0.12, 0);
  playTone(659.25, 783.99, 0.14, 'sine', 0.12, 0.08);
  playTone(1046.5, 1318.5, 0.24, 'triangle', 0.14, 0.16);
}

function playStageClearFanfare() {
  const notes = [440, 554.37, 659.25, 880];
  notes.forEach((n, idx) => {
    playTone(n, n * 1.01, 0.18, 'triangle', 0.12, idx * 0.07);
  });
}

function playErrorBuzz() {
  playTone(160, 110, 0.14, 'sawtooth', 0.08);
}

if (typeof module !== 'undefined' && module.exports) {
  Object.assign(module.exports, {
    MUTE_KEY,
    initAudio,
    ensureAudioReady,
    playTone,
    playTurnTick,
    playUiClick,
    playBonusChime,
    playStageClearFanfare,
    playErrorBuzz
  });
}
