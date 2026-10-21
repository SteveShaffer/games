// Sonar Strike: Abyss Beats - Main Game Engine

// Game Constants & Configurations
const TRAVEL_TIME = 2.0; // Seconds it takes for a note to slide down the highway
const HIT_WINDOWS = {
  PERFECT: 0.05, // +- 50ms
  GREAT: 0.10,   // +- 100ms
  GOOD: 0.15,    // +- 150ms
};
const MISS_WINDOW = 0.20; // 200ms past the target line is a guaranteed miss

// Default Key/Gamepad Bindings
let bindings = {
  single: { type: 'key', code: 'Space', btnIndex: 0 },
  red: { type: 'key', code: 'KeyS', btnIndex: 2 },
  yellow: { type: 'key', code: 'KeyD', btnIndex: 3 },
  blue: { type: 'key', code: 'KeyK', btnIndex: 1 },
  green: { type: 'key', code: 'KeyL', btnIndex: 0 },
  kick: { type: 'key', code: 'Space', btnIndex: 4 }
};

// Map Game lanes to colors/types
const LANES_CONFIG = {
  single: [{ id: 'single', name: 'PING', class: 'target-single', color: 'var(--neon-cyan)', noteClass: 'note-single' }],
  multi: [
    { id: 'red', name: 'SNARE', class: 'target-red', color: 'var(--color-red)', noteClass: 'note-red' },
    { id: 'yellow', name: 'HI-HAT', class: 'target-yellow', color: 'var(--color-yellow)', noteClass: 'note-yellow' },
    { id: 'blue', name: 'TOM', class: 'target-blue', color: 'var(--color-blue)', noteClass: 'note-blue' },
    { id: 'green', name: 'CYMBAL', class: 'target-green', color: 'var(--color-green)', noteClass: 'note-green' }
  ]
};

// Global Audio States
let audioCtx = null;
let mainGainNode = null;
let delayNode = null;
let isMuted = false;

// Game State variables
let currentGameMode = 'single'; // 'single' or 'multi'
let currentSongId = 'trench';
let isPlaying = false;
let isPaused = false;
let startTime = 0;
let score = 0;
let combo = 0;
let maxCombo = 0;
let totalNotesSpawned = 0;
let hitsCount = { perfect: 0, great: 0, good: 0, miss: 0 };
let signalIntegrity = 100; // 0 to 100

// Lists for runtime nodes
let gameNotes = [];
let activeNotes = [];
let animFrameId = null;

// Gamepad polling states
let gamepadConnected = false;
let gamepadIndex = -1;
let prevGamepadState = [];

// WebHID polling states
let hidDevice = null;
let prevHidReport = null;

// WebUSB polling states
let usbDevice = null;
let activeBindingAction = null; // when calibrating, stores which action we are binding

// Sequencer & Beats State
let nextNoteTime = 0.0;
let scheduleAheadTime = 0.1; // schedule 100ms in advance
let lookahead = 25.0; // run scheduler every 25ms
let schedulerTimerId = null;
let currentStep = 0;

// Dynamic Level definitions
const SONGS = {
  trench: {
    bpm: 100,
    steps: 128,
    bassline: [36, 36, 39, 39, 41, 41, 43, 43, 36, 36, 39, 39, 41, 41, 34, 34], // MIDI notes
    beatPattern: { kick: [1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 1, 0, 0, 0, 1, 0] },
    // Step-based game notes (16th steps)
    notes: {
      single: [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120, 124],
      multi: [
        { step: 4, lane: 'red' }, { step: 8, lane: 'yellow' }, { step: 12, lane: 'red' }, { step: 16, lane: 'yellow' },
        { step: 20, lane: 'red' }, { step: 24, lane: 'yellow' }, { step: 28, lane: 'blue' }, { step: 32, lane: 'kick' },
        { step: 36, lane: 'red' }, { step: 40, lane: 'yellow' }, { step: 44, lane: 'red' }, { step: 48, lane: 'green' },
        { step: 52, lane: 'red' }, { step: 56, lane: 'yellow' }, { step: 60, lane: 'blue' }, { step: 64, lane: 'kick' },
        { step: 68, lane: 'red' }, { step: 72, lane: 'yellow' }, { step: 76, lane: 'red' }, { step: 80, lane: 'yellow' },
        { step: 84, lane: 'red' }, { step: 88, lane: 'yellow' }, { step: 92, lane: 'blue' }, { step: 96, lane: 'kick' },
        { step: 100, lane: 'red' }, { step: 104, lane: 'yellow' }, { step: 108, lane: 'red' }, { step: 112, lane: 'green' },
        { step: 116, lane: 'blue' }, { step: 120, lane: 'yellow' }, { step: 124, lane: 'kick' }
      ]
    }
  },
  kraken: {
    bpm: 120,
    steps: 128,
    bassline: [28, 28, 28, 28, 31, 31, 33, 33, 28, 28, 28, 28, 31, 31, 36, 34],
    beatPattern: { kick: [1, 0, 0, 1, 0, 1, 0, 0], snare: [0, 0, 1, 0, 0, 0, 1, 1] },
    notes: {
      single: [4, 6, 8, 12, 14, 16, 20, 22, 24, 28, 30, 32, 36, 38, 40, 44, 46, 48, 52, 54, 56, 60, 62, 64, 68, 70, 72, 76, 78, 80, 84, 86, 88, 92, 94, 96, 100, 102, 104, 108, 110, 112, 116, 118, 120, 124],
      multi: [
        { step: 4, lane: 'kick' }, { step: 6, lane: 'red' }, { step: 8, lane: 'yellow' }, { step: 12, lane: 'blue' },
        { step: 14, lane: 'red' }, { step: 16, lane: 'green' }, { step: 20, lane: 'kick' }, { step: 22, lane: 'red' },
        { step: 24, lane: 'yellow' }, { step: 28, lane: 'blue' }, { step: 30, lane: 'yellow' }, { step: 32, lane: 'green' },
        { step: 36, lane: 'kick' }, { step: 38, lane: 'red' }, { step: 40, lane: 'yellow' }, { step: 44, lane: 'blue' },
        { step: 46, lane: 'red' }, { step: 48, lane: 'green' }, { step: 52, lane: 'kick' }, { step: 54, lane: 'red' },
        { step: 56, lane: 'yellow' }, { step: 60, lane: 'blue' }, { step: 62, lane: 'yellow' }, { step: 64, lane: 'kick' },
        { step: 68, lane: 'red' }, { step: 70, lane: 'yellow' }, { step: 72, lane: 'blue' }, { step: 76, lane: 'green' },
        { step: 78, lane: 'red' }, { step: 80, lane: 'kick' }, { step: 84, lane: 'red' }, { step: 86, lane: 'yellow' },
        { step: 88, lane: 'blue' }, { step: 92, lane: 'green' }, { step: 94, lane: 'yellow' }, { step: 96, lane: 'kick' },
        { step: 100, lane: 'red' }, { step: 102, lane: 'red' }, { step: 104, lane: 'yellow' }, { step: 108, lane: 'blue' },
        { step: 110, lane: 'blue' }, { step: 112, lane: 'green' }, { step: 116, lane: 'kick' }, { step: 118, lane: 'red' },
        { step: 120, lane: 'yellow' }, { step: 124, lane: 'green' }
      ]
    }
  },
  escape: {
    bpm: 140,
    steps: 160,
    bassline: [33, 33, 33, 33, 33, 33, 33, 33, 29, 29, 29, 29, 31, 31, 31, 31],
    beatPattern: { kick: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1] },
    notes: {
      single: [4, 6, 8, 10, 12, 14, 16, 20, 22, 24, 26, 28, 30, 32, 36, 38, 40, 42, 44, 46, 48, 52, 54, 56, 58, 60, 62, 64, 68, 70, 72, 74, 76, 78, 80, 84, 86, 88, 90, 92, 94, 96, 100, 102, 104, 106, 108, 110, 112, 116, 118, 120, 122, 124, 126, 128, 132, 134, 136, 138, 140, 142, 144, 148, 150, 152, 156],
      multi: [
        { step: 4, lane: 'kick' }, { step: 6, lane: 'red' }, { step: 8, lane: 'yellow' }, { step: 10, lane: 'blue' },
        { step: 12, lane: 'red' }, { step: 14, lane: 'green' }, { step: 16, lane: 'kick' }, { step: 18, lane: 'kick' },
        { step: 20, lane: 'red' }, { step: 22, lane: 'yellow' }, { step: 24, lane: 'blue' }, { step: 26, lane: 'yellow' },
        { step: 28, lane: 'green' }, { step: 32, lane: 'kick' }, { step: 34, lane: 'red' }, { step: 36, lane: 'yellow' },
        { step: 38, lane: 'red' }, { step: 40, lane: 'blue' }, { step: 44, lane: 'green' }, { step: 48, lane: 'kick' },
        { step: 52, lane: 'red' }, { step: 54, lane: 'red' }, { step: 56, lane: 'yellow' }, { step: 58, lane: 'yellow' },
        { step: 60, lane: 'blue' }, { step: 62, lane: 'green' }, { step: 64, lane: 'kick' }, { step: 68, lane: 'yellow' },
        { step: 72, lane: 'red' }, { step: 76, lane: 'blue' }, { step: 80, lane: 'green' }, { step: 82, lane: 'red' },
        { step: 84, lane: 'kick' }, { step: 86, lane: 'kick' }, { step: 88, lane: 'yellow' }, { step: 90, lane: 'blue' },
        { step: 92, lane: 'red' }, { step: 96, lane: 'green' }, { step: 100, lane: 'kick' }, { step: 102, lane: 'red' },
        { step: 104, lane: 'yellow' }, { step: 108, lane: 'blue' }, { step: 112, lane: 'green' }, { step: 116, lane: 'kick' },
        { step: 120, lane: 'red' }, { step: 122, lane: 'red' }, { step: 124, lane: 'yellow' }, { step: 126, lane: 'yellow' },
        { step: 128, lane: 'blue' }, { step: 132, lane: 'green' }, { step: 136, lane: 'kick' }, { step: 140, lane: 'red' },
        { step: 144, lane: 'yellow' }, { step: 148, lane: 'blue' }, { step: 152, lane: 'green' }, { step: 156, lane: 'kick' }
      ]
    }
  }
};

// Initialize Application UI
document.addEventListener('DOMContentLoaded', () => {
  loadBindings();
  setupUIEventListeners();
  loadMuteState();
  initGamepadAPI();
});

// UI Event Listeners Setup
function setupUIEventListeners() {
  // Navigation
  document.getElementById('btn-select-single').addEventListener('click', () => {
    currentGameMode = 'single';
    showScreen('screen-mission-select');
  });

  document.getElementById('btn-select-multi').addEventListener('click', () => {
    currentGameMode = 'multi';
    showScreen('screen-mission-select');
  });

  document.getElementById('btn-open-calibration').addEventListener('click', () => {
    showScreen('screen-calibration');
    startCalibrationMonitor();
  });

  document.querySelectorAll('.btn-back-menu').forEach(btn => {
    btn.addEventListener('click', () => {
      stopCalibrationMonitor();
      if (isPlaying) quitGame();
      showScreen('screen-main-menu');
    });
  });

  // Mute Button
  const muteBtn = document.getElementById('btn-mute');
  muteBtn.addEventListener('click', () => {
    toggleMute();
  });

  // Song Cards Click
  document.querySelectorAll('.mission-card').forEach(card => {
    card.addEventListener('click', (e) => {
      currentSongId = card.getAttribute('data-song-id');
      startGame();
    });
  });

  // Gameplay Buttons
  document.getElementById('btn-pause').addEventListener('click', () => {
    pauseGame();
  });

  document.getElementById('btn-resume-game').addEventListener('click', () => {
    resumeGame();
  });

  document.getElementById('btn-restart-game').addEventListener('click', () => {
    restartGame();
  });

  document.getElementById('btn-quit-game').addEventListener('click', () => {
    quitGame();
    showScreen('screen-main-menu');
  });

  document.getElementById('btn-retry-mission').addEventListener('click', () => {
    startGame();
  });

  // Calibration Bindings
  document.querySelectorAll('.bind-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.getAttribute('data-action');
      startBinding(action);
    });
  });

  document.getElementById('btn-reset-bindings').addEventListener('click', () => {
    resetBindings();
  });

  const btnConnectHid = document.getElementById('btn-connect-hid');
  if (btnConnectHid) {
    btnConnectHid.addEventListener('click', () => {
      requestHidDevice();
    });
  }

  const btnConnectUsb = document.getElementById('btn-connect-usb');
  if (btnConnectUsb) {
    btnConnectUsb.addEventListener('click', () => {
      requestUsbDevice();
    });
  }

  const btnHeaderConnectUsb = document.getElementById('btn-header-connect-usb');
  if (btnHeaderConnectUsb) {
    btnHeaderConnectUsb.addEventListener('click', () => {
      requestUsbDevice();
    });
  }

  // Listen for binding cancel/escape keys
  document.addEventListener('keydown', (e) => {
    if (activeBindingAction) {
      if (e.key === 'Escape') {
        cancelBinding();
      } else {
        // Record keyboard bind
        recordKeyboardBind(activeBindingAction, e.code);
      }
      e.preventDefault();
    } else {
      // Normal game play keys
      if (isPlaying && !isPaused) {
        handleKeyPress(e.code);
      }
    }
  });
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(scr => {
    scr.classList.remove('active');
  });
  const activeScreen = document.getElementById(screenId);
  if (activeScreen) {
    activeScreen.classList.add('active');
  }
}

// Global Mute Handler (Syncs with Shaffer Family Portal Mute state)
function loadMuteState() {
  isMuted = localStorage.getItem('shaffer-games-muted') === 'true';
  updateMuteUI();
}

function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem('shaffer-games-muted', isMuted);
  updateMuteUI();
  if (mainGainNode) {
    mainGainNode.gain.value = isMuted ? 0 : 0.8;
  }
}

function updateMuteUI() {
  const muteBtn = document.getElementById('btn-mute');
  if (isMuted) {
    muteBtn.classList.add('muted');
    muteBtn.style.opacity = '0.5';
    muteBtn.style.borderStyle = 'dashed';
  } else {
    muteBtn.classList.remove('muted');
    muteBtn.style.opacity = '1.0';
    muteBtn.style.borderStyle = 'solid';
  }
}

// ----------------- WEB AUDIO SYNTHESIZER -----------------
function initAudio() {
  if (audioCtx) return;
  
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  mainGainNode = audioCtx.createGain();
  mainGainNode.gain.value = isMuted ? 0 : 0.8;
  mainGainNode.connect(audioCtx.destination);
  
  // Set up global echo delay line for thematic subsea radar feel
  delayNode = audioCtx.createDelay(2.0);
  delayNode.delayTime.value = 0.35; // 350ms delay
  
  const delayFeedback = audioCtx.createGain();
  delayFeedback.gain.value = 0.4;
  
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  
  delayNode.connect(mainGainNode);
}

// Synth KICK (Sub-bass thud)
function playSynthKick(time) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(mainGainNode);
  
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.15);
  
  gain.gain.setValueAtTime(1.0, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
  
  osc.start(time);
  osc.stop(time + 0.35);
}

// Synth SNARE (Banded noise click)
function playSynthSnare(time) {
  if (!audioCtx) return;
  
  // Noise Buffer
  const bufferSize = audioCtx.sampleRate * 0.2; // 200ms
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.7, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(mainGainNode);
  
  // Sine fundamental hit
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, time);
  osc.frequency.linearRampToValueAtTime(120, time + 0.08);
  oscGain.gain.setValueAtTime(0.5, time);
  oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
  
  osc.connect(oscGain);
  oscGain.connect(mainGainNode);
  
  noise.start(time);
  noise.stop(time + 0.2);
  osc.start(time);
  osc.stop(time + 0.1);
}

// Synth TOM (Medium hollow thud)
function playSynthTom(time) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(mainGainNode);
  
  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(65, time + 0.2);
  
  gain.gain.setValueAtTime(0.8, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
  
  osc.start(time);
  osc.stop(time + 0.28);
}

// Synth HI-HAT (Short metal scrape)
function playSynthHiHat(time) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  filter.type = 'highpass';
  filter.frequency.value = 8000;
  
  osc.type = 'square';
  osc.frequency.setValueAtTime(10000, time);
  
  gain.gain.setValueAtTime(0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(mainGainNode);
  
  osc.start(time);
  osc.stop(time + 0.06);
}

// Synth CYMBAL (Metal splash crashing)
function playSynthCymbal(time) {
  if (!audioCtx) return;
  
  // White noise generator
  const bufferSize = audioCtx.sampleRate * 0.8;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6500;
  
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.5, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.7);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(mainGainNode);
  
  noise.start(time);
  noise.stop(time + 0.85);
}

// Thematic Submarine SONAR PING (High metallic echo ping)
function playSonarPing(time) {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, time);
  
  gain.gain.setValueAtTime(0.9, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 1.2);
  
  osc.connect(gain);
  // Send to main output AND delay node for underwater echo reflections
  gain.connect(mainGainNode);
  gain.connect(delayNode);
  
  osc.start(time);
  osc.stop(time + 1.3);
}

// Backing Sequencer Bassline note
function playBassSynth(time, pitch) {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(midiToFreq(pitch), time);
  
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, time);
  filter.frequency.exponentialRampToValueAtTime(80, time + 0.25);
  
  gain.gain.setValueAtTime(0.35, time);
  gain.gain.exponentialRampToValueAtTime(0.005, time + 0.3);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(mainGainNode);
  
  osc.start(time);
  osc.stop(time + 0.35);
}

function midiToFreq(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// ----------------- SEQUENCER ENGINE -----------------
function scheduler() {
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
    scheduleNextBeat(currentStep, nextNoteTime);
    incrementStep();
  }
  schedulerTimerId = setTimeout(scheduler, lookahead);
}

function scheduleNextBeat(step, time) {
  const song = SONGS[currentSongId];
  
  // Play dynamic bass rhythm backing track
  const bassIdx = step % song.bassline.length;
  const pitch = song.bassline[bassIdx];
  // Play bass note on steps divisible by 2 (eighth notes)
  if (step % 2 === 0) {
    playBassSynth(time, pitch);
  }
  
  // Play backing drum sequences to keep energy high
  const beatIdx = step % 8;
  const pat = song.beatPattern;
  if (pat.kick[beatIdx]) {
    playSynthKick(time);
  }
  if (pat.snare[beatIdx]) {
    playSynthSnare(time);
  }
  
  // Check if we hit the end of the song
  if (step >= song.steps) {
    endGame();
  }
}

function incrementStep() {
  const song = SONGS[currentSongId];
  const secondsPerBeat = 60.0 / song.bpm;
  const stepDuration = 0.25 * secondsPerBeat; // 16th notes
  
  nextNoteTime += stepDuration;
  currentStep++;
}

// ----------------- GAME MECHANICS -----------------
function startGame() {
  initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  showScreen('screen-gameplay');
  
  // Reset States
  isPlaying = true;
  isPaused = false;
  score = 0;
  combo = 0;
  maxCombo = 0;
  signalIntegrity = 100;
  hitsCount = { perfect: 0, great: 0, good: 0, miss: 0 };
  activeNotes = [];
  
  document.getElementById('hud-score').innerText = '000,000';
  document.getElementById('hud-combo').innerText = '0';
  document.getElementById('hud-multiplier').innerText = '1X MULTIPLIER';
  document.getElementById('hud-hit-rating').innerText = 'READY...';
  document.getElementById('hud-hit-rating').className = 'hud-rating text-cyan';
  updateAccuracyDisplay();
  updateHealthBar();
  
  // Setup Board HTML Structure dynamically based on Mode
  setupHighwayBoard();

  // Load note chart based on song selection
  loadNoteChart();

  // Schedule start
  startTime = audioCtx.currentTime + 1.0; // 1s buffer before music/scrolling starts
  nextNoteTime = startTime;
  currentStep = 0;
  
  scheduler();
  
  // Start game animation loop
  animFrameId = requestAnimationFrame(gameLoop);
}

function setupHighwayBoard() {
  const board = document.getElementById('rhythm-board');
  const strikeBar = document.getElementById('strike-bar');
  board.innerHTML = '';
  strikeBar.innerHTML = '';

  if (currentGameMode === 'single') {
    board.className = 'rhythm-board single-lane-mode';
    
    // Add single lane
    const laneDiv = document.createElement('div');
    laneDiv.className = 'lane lane-single';
    laneDiv.innerHTML = `<div id="flash-single" class="lane-active-flash"></div>`;
    board.appendChild(laneDiv);

    // Add target zone
    const targetDiv = document.createElement('div');
    targetDiv.className = 'target-zone target-single';
    targetDiv.id = 'target-single';
    targetDiv.innerHTML = `<div class="target-circle"></div>`;
    strikeBar.appendChild(targetDiv);
    
  } else {
    board.className = 'rhythm-board multi-lane-mode';
    
    // Create 4 lanes (Red, Yellow, Blue, Green)
    LANES_CONFIG.multi.forEach(lane => {
      const laneDiv = document.createElement('div');
      laneDiv.className = `lane lane-${lane.id}`;
      laneDiv.innerHTML = `<div id="flash-${lane.id}" class="lane-active-flash"></div>`;
      board.appendChild(laneDiv);

      const targetDiv = document.createElement('div');
      targetDiv.className = `target-zone ${lane.class}`;
      targetDiv.id = `target-${lane.id}`;
      targetDiv.innerHTML = `<div class="target-circle"></div>`;
      strikeBar.appendChild(targetDiv);
    });

    // Add Orange Kick target indicator bar overlay (top of strike zone)
    const kickBar = document.createElement('div');
    kickBar.id = 'target-kick-indicator';
    kickBar.className = 'kick-target-indicator';
    strikeBar.appendChild(kickBar);
  }
}

function loadNoteChart() {
  const song = SONGS[currentSongId];
  const secondsPerBeat = 60.0 / song.bpm;
  const stepDuration = 0.25 * secondsPerBeat; // 16th note steps
  
  gameNotes = [];
  
  if (currentGameMode === 'single') {
    song.notes.single.forEach(step => {
      const hitTime = step * stepDuration;
      gameNotes.push({
        lane: 'single',
        type: 'single',
        hitTime: hitTime,
        spawned: false,
        dom: null
      });
    });
  } else {
    song.notes.multi.forEach(noteDef => {
      const hitTime = noteDef.step * stepDuration;
      gameNotes.push({
        lane: noteDef.lane,
        type: noteDef.lane,
        hitTime: hitTime,
        spawned: false,
        dom: null
      });
    });
  }

  totalNotesSpawned = gameNotes.length;
}

// Main Frame Animation Game Loop
function gameLoop() {
  if (!isPlaying || isPaused) return;

  const audioTime = audioCtx.currentTime;
  const elapsed = audioTime - startTime;
  
  // Update Mini Radar display sweep
  updateMiniRadar(audioTime);

  // Poll Gamepads for hits
  pollGamepadInput();

  const boardHeight = document.getElementById('rhythm-board').clientHeight;

  // Process Notes Spawning & Scrolling
  for (let i = 0; i < gameNotes.length; i++) {
    const note = gameNotes[i];
    
    // Spawn note visual DOM element if in timing window
    if (!note.spawned && elapsed >= note.hitTime - TRAVEL_TIME) {
      spawnNoteDOM(note);
    }
  }

  // Update positions of active visual notes
  for (let i = activeNotes.length - 1; i >= 0; i--) {
    const note = activeNotes[i];
    const noteTimeRelative = note.hitTime - elapsed; // time remaining until target hit
    
    if (noteTimeRelative < -MISS_WINDOW) {
      // MISSED!
      handleMiss(note);
      activeNotes.splice(i, 1);
      continue;
    }

    if (note.dom) {
      // Calculate scroll progress percentage (0.0 to 1.0)
      const progress = 1.0 - (noteTimeRelative / TRAVEL_TIME);
      // Map progress to absolute pixels (Top offset from rhythm board)
      const topOffset = progress * boardHeight;
      note.dom.style.top = `${topOffset}px`;
    }
  }

  animFrameId = requestAnimationFrame(gameLoop);
}

function spawnNoteDOM(note) {
  note.spawned = true;
  
  const board = document.getElementById('rhythm-board');
  const noteDiv = document.createElement('div');
  
  let noteClass = 'rhythm-note';
  let laneIndex = 0;
  
  if (currentGameMode === 'single') {
    noteClass += ' note-single';
    noteDiv.style.width = '90%';
  } else {
    if (note.type === 'kick') {
      noteClass += ' note-kick';
    } else {
      const idx = LANES_CONFIG.multi.findIndex(l => l.id === note.type);
      if (idx !== -1) {
        noteClass += ` ${LANES_CONFIG.multi[idx].noteClass}`;
        laneIndex = idx;
      }
    }
  }

  noteDiv.className = noteClass;
  noteDiv.style.top = '0px';

  // For regular drum notes, center inside their matching column
  if (currentGameMode === 'multi' && note.type !== 'kick') {
    const laneWidth = board.clientWidth / 4;
    noteDiv.style.left = `${(laneIndex * laneWidth) + (laneWidth * 0.1)}px`;
    noteDiv.style.width = `${laneWidth * 0.8}px`;
  }
  
  board.appendChild(noteDiv);
  note.dom = noteDiv;
  activeNotes.push(note);
}

// Handle trigger strikes
function triggerStrike(action) {
  // Visual trigger flash
  flashTargetZone(action);

  // Play matching audio response instantly
  playDrumSynthSound(action);

  if (!isPlaying || isPaused) return;

  // Search active screen notes for hits in this action lane/type
  const elapsed = audioCtx.currentTime - startTime;
  let targetNoteIdx = -1;
  let minDiff = 999.0;

  for (let i = 0; i < activeNotes.length; i++) {
    const note = activeNotes[i];
    
    // Check matching lane/type
    if (note.type === action || (currentGameMode === 'single' && action === 'single')) {
      const diff = Math.abs(elapsed - note.hitTime);
      if (diff < minDiff && diff <= HIT_WINDOWS.GOOD) {
        minDiff = diff;
        targetNoteIdx = i;
      }
    }
  }

  if (targetNoteIdx !== -1) {
    const note = activeNotes[targetNoteIdx];
    evaluateHitAccuracy(minDiff);
    
    // Create visual hit particles at note position
    createExplosion(note);

    // Remove note
    if (note.dom) note.dom.remove();
    activeNotes.splice(targetNoteIdx, 1);
  }
}

function flashTargetZone(action) {
  const flash = document.getElementById(`flash-${action}`);
  const target = document.getElementById(`target-${action}`);
  const kickInd = document.getElementById('target-kick-indicator');
  
  if (action === 'kick' && kickInd) {
    kickInd.classList.add('active');
    setTimeout(() => kickInd.classList.remove('active'), 80);
    return;
  }

  if (flash) {
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 100);
  }
  if (target) {
    target.classList.add('active');
    setTimeout(() => target.classList.remove('active'), 100);
  }
}

function playDrumSynthSound(action) {
  const time = audioCtx.currentTime;
  switch (action) {
    case 'single':
      playSonarPing(time);
      break;
    case 'red':
      playSynthSnare(time);
      break;
    case 'yellow':
      playSynthHiHat(time);
      break;
    case 'blue':
      playSynthTom(time);
      break;
    case 'green':
      playSynthCymbal(time);
      break;
    case 'kick':
      playSynthKick(time);
      break;
  }
}

// Evaluate Hit timing window
function evaluateHitAccuracy(diff) {
  let rating = 'MISS';
  let scoreGain = 0;
  let statusClass = 'text-red';

  if (diff <= HIT_WINDOWS.PERFECT) {
    rating = 'PERFECT';
    scoreGain = 250;
    hitsCount.perfect++;
    statusClass = 'text-cyan';
  } else if (diff <= HIT_WINDOWS.GREAT) {
    rating = 'GREAT';
    scoreGain = 150;
    hitsCount.great++;
    statusClass = 'text-green';
  } else if (diff <= HIT_WINDOWS.GOOD) {
    rating = 'GOOD';
    scoreGain = 50;
    hitsCount.good++;
    statusClass = 'text-yellow';
  }

  combo++;
  if (combo > maxCombo) maxCombo = combo;
  
  // Calculate multiplier: every 10 notes increases multiplier (max 4x)
  const multiplier = Math.min(4, Math.floor(combo / 10) + 1);
  score += scoreGain * multiplier;

  // Visual text overlay popup
  triggerRatingPopup(rating, statusClass);

  // Update HUD
  document.getElementById('hud-score').innerText = String(score).padStart(6, '0');
  document.getElementById('hud-combo').innerText = combo;
  document.getElementById('hud-multiplier').innerText = `${multiplier}X MULTIPLIER`;
  
  const multText = document.getElementById('hud-multiplier');
  if (multiplier > 1) {
    multText.className = 'hud-subvalue font-mono text-purple blinking-text';
  } else {
    multText.className = 'hud-subvalue font-mono text-dim';
  }

  // Restore signal integrity health on hit
  signalIntegrity = Math.min(100, signalIntegrity + 2);
  updateHealthBar();
  updateAccuracyDisplay();
}

function handleMiss(note) {
  hitsCount.miss++;
  combo = 0;
  
  // Reduce signal integrity on miss
  signalIntegrity = Math.max(0, signalIntegrity - 8);
  updateHealthBar();
  updateAccuracyDisplay();
  
  triggerRatingPopup('MISS', 'text-red');
  
  document.getElementById('hud-combo').innerText = '0';
  document.getElementById('hud-multiplier').innerText = '1X MULTIPLIER';
  document.getElementById('hud-multiplier').className = 'hud-subvalue font-mono text-dim';

  if (note.dom) note.dom.remove();

  // Fail if hull integrity hits 0
  if (signalIntegrity <= 0) {
    endGame(true);
  }
}

function triggerRatingPopup(text, textClass) {
  const ratingDiv = document.getElementById('hud-hit-rating');
  ratingDiv.innerText = text;
  ratingDiv.className = `hud-rating ${textClass}`;

  // Spawn visual floating text node over board center
  const container = document.querySelector('.highway-container');
  const popup = document.createElement('div');
  popup.className = `rating-popup ${textClass}`;
  popup.innerText = text;
  popup.style.left = '50%';
  popup.style.top = '70%';
  popup.style.transform = 'translate(-50%, -50%)';
  
  container.appendChild(popup);
  setTimeout(() => popup.remove(), 500);
}

function createExplosion(note) {
  const board = document.getElementById('rhythm-board');
  const boardRect = board.getBoundingClientRect();
  const noteRect = note.dom.getBoundingClientRect();
  
  const x = noteRect.left - boardRect.left + (noteRect.width / 2);
  const y = noteRect.top - boardRect.top + (noteRect.height / 2);
  
  const particlesCount = 8;
  const colors = {
    red: 'var(--color-red)',
    yellow: 'var(--color-yellow)',
    blue: 'var(--color-blue)',
    green: 'var(--color-green)',
    kick: 'var(--color-kick)',
    single: 'var(--neon-cyan)'
  };
  const color = colors[note.type] || 'white';

  for (let i = 0; i < particlesCount; i++) {
    const part = document.createElement('div');
    part.className = 'hit-particle';
    part.style.backgroundColor = color;
    part.style.boxShadow = `0 0 8px ${color}`;
    part.style.left = `${x}px`;
    part.style.top = `${y}px`;
    
    // Spread math values passed to keyframes CSS variable values
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 60;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;
    part.style.setProperty('--dx', `${dx}px`);
    part.style.setProperty('--dy', `${dy}px`);

    board.appendChild(part);
    setTimeout(() => part.remove(), 400);
  }
}

// HUD updates
function updateAccuracyDisplay() {
  const hits = hitsCount.perfect + hitsCount.great + hitsCount.good;
  const total = hits + hitsCount.miss;
  const acc = total === 0 ? 100 : (hits / total) * 100;
  
  document.getElementById('hud-accuracy').innerText = `ACC: ${acc.toFixed(1)}%`;
}

function updateHealthBar() {
  const bar = document.getElementById('signal-health-bar');
  const label = document.getElementById('signal-strength-text');
  bar.style.width = `${signalIntegrity}%`;
  
  if (signalIntegrity > 50) {
    bar.className = 'signal-bar';
    label.className = 'hud-mono text-cyan';
    label.innerText = `${signalIntegrity}% SECURE`;
  } else {
    bar.className = 'signal-bar warning';
    label.className = 'hud-mono text-red blinking-text';
    if (signalIntegrity <= 25) {
      label.innerText = `CRITICAL DETONATION WARNING: ${signalIntegrity}%`;
    } else {
      label.innerText = `WEAK SIGNAL INTEGRITY: ${signalIntegrity}%`;
    }
  }
}

function updateMiniRadar(audioTime) {
  const blipBox = document.querySelector('.radar-blips-container');
  if (!blipBox) return;

  // Periodically add mini glowing green radar blips
  if (Math.floor(audioTime) % 3 === 0 && blipBox.children.length < 5) {
    const blip = document.createElement('div');
    blip.className = 'mini-blip';
    blip.style.left = `${10 + Math.random() * 80}%`;
    blip.style.top = `${10 + Math.random() * 80}%`;
    blipBox.appendChild(blip);
    
    setTimeout(() => {
      blip.remove();
    }, 2500);
  }
}

// Pauses, resumes, and exits missions
function pauseGame() {
  if (!isPlaying || isPaused) return;
  isPaused = true;
  
  // Pause audio context
  audioCtx.suspend();
  clearTimeout(schedulerTimerId);
  cancelAnimationFrame(animFrameId);
  
  document.getElementById('pause-overlay').classList.add('active');
}

function resumeGame() {
  if (!isPlaying || !isPaused) return;
  isPaused = false;
  
  // Resume audio
  audioCtx.resume();
  document.getElementById('pause-overlay').classList.remove('active');
  
  // Restart scheduler loop
  scheduler();
  animFrameId = requestAnimationFrame(gameLoop);
}

function restartGame() {
  document.getElementById('pause-overlay').classList.remove('active');
  clearTimeout(schedulerTimerId);
  cancelAnimationFrame(animFrameId);
  
  // Clean notes
  activeNotes.forEach(note => {
    if (note.dom) note.dom.remove();
  });
  activeNotes = [];
  
  startGame();
}

function quitGame() {
  isPlaying = false;
  isPaused = false;
  clearTimeout(schedulerTimerId);
  cancelAnimationFrame(animFrameId);
  
  activeNotes.forEach(note => {
    if (note.dom) note.dom.remove();
  });
  activeNotes = [];
  
  document.getElementById('pause-overlay').classList.remove('active');
}

function endGame(failed = false) {
  isPlaying = false;
  clearTimeout(schedulerTimerId);
  cancelAnimationFrame(animFrameId);

  // Clear visual notes
  activeNotes.forEach(note => {
    if (note.dom) note.dom.remove();
  });
  activeNotes = [];

  // Show Results Screen
  showScreen('screen-results');
  
  const title = document.getElementById('results-title');
  if (failed) {
    title.innerText = 'MISSION FAILED: HULL COMPROMISED';
    title.className = 'screen-title text-red';
  } else {
    title.innerText = 'MISSION COMPLETED';
    title.className = 'screen-title text-green';
  }

  const hits = hitsCount.perfect + hitsCount.great + hitsCount.good;
  const total = hits + hitsCount.miss;
  const acc = total === 0 ? 100 : (hits / total) * 100;

  document.getElementById('res-score').innerText = score;
  document.getElementById('res-accuracy').innerText = `${acc.toFixed(1)}%`;
  document.getElementById('res-max-combo').innerText = maxCombo;
  document.getElementById('res-perfect').innerText = hitsCount.perfect;
  document.getElementById('res-great').innerText = hitsCount.great;
  document.getElementById('res-good').innerText = hitsCount.good;
  document.getElementById('res-miss').innerText = hitsCount.miss;
}

// ----------------- KEYBOARD & GAMEPAD DRIVERS -----------------
function handleKeyPress(code) {
  if (currentGameMode === 'single') {
    if (code === bindings.single.code) {
      triggerStrike('single');
    }
  } else {
    if (code === bindings.red.code) triggerStrike('red');
    else if (code === bindings.yellow.code) triggerStrike('yellow');
    else if (code === bindings.blue.code) triggerStrike('blue');
    else if (code === bindings.green.code) triggerStrike('green');
    else if (code === bindings.kick.code) triggerStrike('kick');
  }
}

// Gamepad API Implementation
function initGamepadAPI() {
  window.addEventListener("gamepadconnected", (e) => {
    gamepadConnected = true;
    gamepadIndex = e.gamepad.index;
    updateGamepadStatusDisplay(`Gamepad Connected: ${e.gamepad.id}`);
    updateMonitorButtonsCount(e.gamepad.buttons.length);
  });

  window.addEventListener("gamepaddisconnected", (e) => {
    if (e.gamepad.index === gamepadIndex) {
      gamepadConnected = false;
      gamepadIndex = -1;
      updateGamepadStatusDisplay("No Gamepads Detected. Press any button on your drum controller or use WebHID.");
      document.getElementById('live-buttons-monitor').innerHTML = '';
    }
  });

  // Check if gamepad is already plugged in before load
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < gps.length; i++) {
    if (gps[i]) {
      gamepadConnected = true;
      gamepadIndex = i;
      updateGamepadStatusDisplay(`Gamepad Connected: ${gps[i].id}`);
      updateMonitorButtonsCount(gps[i].buttons.length);
      break;
    }
  }

  // WebHID Auto-reconnect checks for paired devices
  if (navigator.hid) {
    navigator.hid.getDevices().then(devices => {
      if (devices && devices.length > 0) {
        console.log("Auto-connecting previously paired WebHID device:", devices[0].productName);
        connectHidDevice(devices[0]);
      }
    }).catch(err => console.warn("Failed checking paired HID devices:", err));
  }

  // WebUSB Auto-reconnect checks for paired devices
  if (navigator.usb) {
    navigator.usb.getDevices().then(devices => {
      if (devices && devices.length > 0) {
        console.log("Auto-connecting previously paired WebUSB device:", devices[0].productName);
        connectUsbDevice(devices[0]);
      }
    }).catch(err => console.warn("Failed checking paired USB devices:", err));

    // Listen for WebUSB hot-unplugs
    navigator.usb.addEventListener('disconnect', (e) => {
      if (usbDevice && e.device === usbDevice) {
        usbDevice = null;
        updateGamepadStatusDisplay("USB Device Disconnected.");
        updateUsbStatusHeader(false);
      }
    });
  }

  // Listen for WebHID hot-unplugs
  if (navigator.hid) {
    navigator.hid.addEventListener('disconnect', (e) => {
      if (hidDevice && e.device === hidDevice) {
        hidDevice = null;
        updateGamepadStatusDisplay("WebHID Device Disconnected.");
        updateUsbStatusHeader(false);
      }
    });
  }
}

function updateGamepadStatusDisplay(text) {
  const display = document.getElementById('gamepad-status');
  if (display) {
    display.innerText = text;
  }
}

function updateUsbStatusHeader(connected, name = '') {
  const statusSpan = document.getElementById('hud-usb-status');
  const connectBtn = document.getElementById('btn-header-connect-usb');
  
  if (statusSpan) {
    if (connected) {
      const displayName = name.length > 15 ? name.slice(0, 12) + '...' : name;
      statusSpan.innerText = `USB: ${displayName.toUpperCase()}`;
      statusSpan.style.color = 'var(--neon-green)';
      statusSpan.style.textShadow = '0 0 8px var(--neon-green)';
    } else {
      statusSpan.innerText = 'USB: DISCONNECTED';
      statusSpan.style.color = '';
      statusSpan.style.textShadow = '';
    }
  }
  
  if (connectBtn) {
    if (connected) {
      connectBtn.style.display = 'none';
    } else {
      connectBtn.style.display = 'inline-block';
    }
  }
}

function updateMonitorButtonsCount(btnCount) {
  const container = document.getElementById('live-buttons-monitor');
  if (!container) return;
  
  container.innerHTML = '';
  for (let i = 0; i < btnCount; i++) {
    const indicator = document.createElement('div');
    indicator.className = 'btn-indicator';
    indicator.id = `monitor-btn-${i}`;
    indicator.innerText = i;
    container.appendChild(indicator);
  }
}

// ----------------- WEBUSB RAW DRIVER MODULE -----------------
async function requestUsbDevice() {
  if (!navigator.usb) {
    updateGamepadStatusDisplay("WebUSB API is not supported in this browser. Please use Google Chrome, Edge, or Opera.");
    return;
  }

  try {
    // Prompt Chrome USB chooser (empty filters shows all devices)
    const device = await navigator.usb.requestDevice({ filters: [] });
    if (device) {
      connectUsbDevice(device);
    }
  } catch (error) {
    console.error("WebUSB device selection failed:", error);
    updateGamepadStatusDisplay(`WebUSB Error: ${error.message}`);
  }
}

async function connectUsbDevice(device) {
  try {
    if (usbDevice) {
      await usbDevice.close();
    }
    usbDevice = device;
    
    await device.open();
    await device.selectConfiguration(1);

    // Find the first interface and Interrupt IN endpoint
    let interfaceNumber = 0;
    let endpointNumber = 1;
    let found = false;

    // Scan alternates dynamically for an Interrupt IN endpoint
    for (const conf of device.configurations) {
      for (const iface of conf.interfaces) {
        for (const alt of iface.alternates) {
          for (const ep of alt.endpoints) {
            if (ep.direction === 'in' && ep.type === 'interrupt') {
              interfaceNumber = iface.interfaceNumber;
              endpointNumber = ep.endpointNumber;
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }
      if (found) break;
    }

    await device.claimInterface(interfaceNumber);
    
    // Check if the device is a Harmonix or Rock Band drum controller
    const isHarmonix = device.productName && (
      device.productName.toLowerCase().includes('harmonix') || 
      device.productName.toLowerCase().includes('drum') || 
      device.productName.toLowerCase().includes('rock band')
    );

    if (isHarmonix) {
      bindings.red = { type: 'webusb', byteIndex: 3, bitMask: 0x20, isAnalog: false };
      bindings.yellow = { type: 'webusb', byteIndex: 3, bitMask: 0x80, isAnalog: false };
      bindings.blue = { type: 'webusb', byteIndex: 3, bitMask: 0x40, isAnalog: false };
      bindings.green = { type: 'webusb', byteIndex: 3, bitMask: 0x10, isAnalog: false };
      bindings.kick = { type: 'webusb', byteIndex: 3, bitMask: 0x01, isAnalog: false };
      bindings.single = { type: 'webusb', byteIndex: 3, bitMask: 0x20, isAnalog: false }; // Red Snare default for 1-trigger
      saveBindings();
      updateBindingsUI();
      updateGamepadStatusDisplay(`WebUSB Connected: ${device.productName} (Auto-Mapped!)`);
    } else {
      updateGamepadStatusDisplay(`WebUSB Connected: ${device.productName}`);
    }
    
    // Update Global Header USB indicator
    updateUsbStatusHeader(true, device.productName);
    
    // Clear live monitor and display instructions
    const container = document.getElementById('live-buttons-monitor');
    if (container) {
      container.innerHTML = '<div class="help-text" style="grid-column: span 8; text-align: center; color: var(--neon-cyan);">Ready. Strike any drum pad/trigger to view raw USB reports.</div>';
    }

    // Start reading loop
    readUsbLoop(device, endpointNumber);

  } catch (err) {
    console.error("Failed to connect WebUSB:", err);
    updateGamepadStatusDisplay(`Failed to Connect WebUSB: ${err.message}`);
  }
}

async function readUsbLoop(device, endpointNumber) {
  try {
    const result = await device.transferIn(endpointNumber, 32);
    if (result.status === 'ok') {
      // Feed WebUSB transfer buffer directly into handleHidInputReport
      handleHidInputReport({ data: { buffer: result.data.buffer } });
    }
    if (device.opened) {
      readUsbLoop(device, endpointNumber);
    }
  } catch (err) {
    if (device.opened) {
      console.error("WebUSB transfer error:", err);
      // Wait briefly before retrying to prevent hot looping on error
      setTimeout(() => {
        if (device.opened) readUsbLoop(device, endpointNumber);
      }, 100);
    }
  }
}

// ----------------- WEBHID DIRECT DRIVER MODULE -----------------
async function requestHidDevice() {
  if (!navigator.hid) {
    updateGamepadStatusDisplay("WebHID API is not supported in this browser. Please use Google Chrome, Edge, or Opera.");
    return;
  }

  try {
    // Prompt Chrome USB HID chooser
    const devices = await navigator.hid.requestDevice({ filters: [] });
    if (devices && devices.length > 0) {
      connectHidDevice(devices[0]);
    }
  } catch (error) {
    console.error("WebHID device selection failed:", error);
    updateGamepadStatusDisplay(`WebHID Error: ${error.message}`);
  }
}

function connectHidDevice(device) {
  if (hidDevice) {
    hidDevice.close();
  }
  hidDevice = device;

  device.open().then(() => {
    updateGamepadStatusDisplay(`WebHID Connected: ${device.productName}`);
    device.addEventListener('inputreport', handleHidInputReport);
    
    // Update Global Header USB indicator
    updateUsbStatusHeader(true, device.productName);
    
    // Setup byte badges grid placeholder instructions
    const container = document.getElementById('live-buttons-monitor');
    if (container) {
      container.innerHTML = '<div class="help-text" style="grid-column: span 8; text-align: center; color: var(--neon-cyan);">Ready. Strike any drum pad/trigger to view raw USB reports.</div>';
    }
  }).catch(err => {
    console.error("Failed to open WebHID device:", err);
    updateGamepadStatusDisplay(`Failed to Open Device: ${err.message}`);
  });
}

function handleHidInputReport(event) {
  const data = new Uint8Array(event.data.buffer);

  // 1. Update Diagnostics monitor byte view
  updateHidMonitorUI(data);

  // 2. Perform Binding capture if active
  if (activeBindingAction) {
    detectHidBinding(data);
  }

  // 3. Process gameplay triggers
  if (isPlaying && !isPaused) {
    checkHidGameplayTriggers(data);
  }

  // Cache report data
  prevHidReport = new Uint8Array(data);
}

function updateHidMonitorUI(data) {
  const container = document.getElementById('live-buttons-monitor');
  if (!container) return;

  // Initialize byte display grid if needed
  if (!container.querySelector('.hid-byte-badge') || container.children.length !== data.length) {
    container.innerHTML = '';
    for (let i = 0; i < data.length; i++) {
      const badge = document.createElement('div');
      badge.className = 'btn-indicator hid-byte-badge';
      badge.id = `hid-byte-${i}`;
      badge.innerText = `B${i}:00`;
      badge.style.fontSize = '9px';
      container.appendChild(badge);
    }
  }

  // Highlight changed bytes in grid
  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    const prevVal = prevHidReport ? prevHidReport[i] : 0;
    const badge = document.getElementById(`hid-byte-${i}`);
    
    if (badge) {
      const hexVal = val.toString(16).padStart(2, '0').toUpperCase();
      badge.innerText = `B${i}:${hexVal}`;
      if (val !== prevVal) {
        badge.classList.add('pressed');
        setTimeout(() => badge.classList.remove('pressed'), 120);
      }
    }
  }
}

function detectHidBinding(data) {
  if (!prevHidReport) return;

  const bindType = usbDevice ? 'webusb' : 'webhid';

  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    const prevVal = prevHidReport[i];

    if (val !== prevVal) {
      if (val > prevVal) {
        // High transition
        const diff = val ^ prevVal;
        const bitMask = diff & val; // Identify which bits flipped 0 -> 1

        if (bitMask > 0) {
          // Digital byte mask bind
          recordWebHidBind(activeBindingAction, {
            type: bindType,
            byteIndex: i,
            bitMask: bitMask,
            isAnalog: false
          });
          return;
        } else {
          // Analog change (triggers/pressure levels going up)
          recordWebHidBind(activeBindingAction, {
            type: bindType,
            byteIndex: i,
            threshold: Math.max(10, val - 10),
            isAnalog: true
          });
          return;
        }
      }
    }
  }
}

function checkHidGameplayTriggers(data) {
  if (!prevHidReport) return;

  const actions = currentGameMode === 'single' ? ['single'] : ['red', 'yellow', 'blue', 'green', 'kick'];

  actions.forEach(action => {
    const bind = bindings[action];
    if (bind && bind.type === 'webhid') {
      const byteIndex = bind.byteIndex;
      const currentVal = data[byteIndex];
      const prevVal = prevHidReport[byteIndex] || 0;

      if (bind.isAnalog) {
        const threshold = bind.threshold;
        // Trigger on crossing analog threshold going up
        if (currentVal >= threshold && prevVal < threshold) {
          triggerStrike(action);
        }
      } else {
        const mask = bind.bitMask;
        // Trigger on rising edge of the bitmask
        if ((currentVal & mask) === mask && (prevVal & mask) !== mask) {
          triggerStrike(action);
        }
      }
    }
  });
}

function recordWebHidBind(action, bindData) {
  bindings[action] = bindData;
  saveBindings();
  updateBindingsUI();
  cancelBinding();
}

// Poll controller buttons once per animation frame in game loop and calibration loop
function pollGamepadInput() {
  if (!gamepadConnected || gamepadIndex === -1) return;

  const gamepad = navigator.getGamepads()[gamepadIndex];
  if (!gamepad) return;

  // Poll button states
  const btnCount = gamepad.buttons.length;
  for (let i = 0; i < btnCount; i++) {
    const isPressed = gamepad.buttons[i].pressed;
    const wasPressed = prevGamepadState[i] || false;

    // Detect pressed transition
    if (isPressed && !wasPressed) {
      handleGamepadButtonPress(i);
    }
    
    // Update live monitor display in calibration deck screen if visible
    const indicator = document.getElementById(`monitor-btn-${i}`);
    if (indicator) {
      if (isPressed) {
        indicator.classList.add('pressed');
      } else {
        indicator.classList.remove('pressed');
      }
    }

    prevGamepadState[i] = isPressed;
  }
}

function handleGamepadButtonPress(btnIndex) {
  if (activeBindingAction) {
    recordGamepadBind(activeBindingAction, btnIndex);
    return;
  }

  // Map Gamepad Button press events to drum actions
  if (currentGameMode === 'single') {
    if (bindings.single.type === 'gamepad' && btnIndex === bindings.single.btnIndex) {
      triggerStrike('single');
    }
  } else {
    if (bindings.red.type === 'gamepad' && btnIndex === bindings.red.btnIndex) triggerStrike('red');
    else if (bindings.yellow.type === 'gamepad' && btnIndex === bindings.yellow.btnIndex) triggerStrike('yellow');
    else if (bindings.blue.type === 'gamepad' && btnIndex === bindings.blue.btnIndex) triggerStrike('blue');
    else if (bindings.green.type === 'gamepad' && btnIndex === bindings.green.btnIndex) triggerStrike('green');
    else if (bindings.kick.type === 'gamepad' && btnIndex === bindings.kick.btnIndex) triggerStrike('kick');
  }
}

// ----------------- CALIBRATION BINDER CODES -----------------
let calMonitorId = null;

function startCalibrationMonitor() {
  initGamepadAPI();
  function calLoop() {
    pollGamepadInput();
    calMonitorId = requestAnimationFrame(calLoop);
  }
  calLoop();
}

function stopCalibrationMonitor() {
  if (calMonitorId) {
    cancelAnimationFrame(calMonitorId);
    calMonitorId = null;
  }
}

function startBinding(action) {
  activeBindingAction = action;
  
  const overlay = document.getElementById('bind-overlay');
  overlay.classList.add('active');
}

function cancelBinding() {
  activeBindingAction = null;
  document.getElementById('bind-overlay').classList.remove('active');
}

function recordKeyboardBind(action, keyCode) {
  bindings[action] = {
    type: 'key',
    code: keyCode
  };
  
  saveBindings();
  updateBindingsUI();
  cancelBinding();
}

function recordGamepadBind(action, btnIndex) {
  bindings[action] = {
    type: 'gamepad',
    btnIndex: btnIndex
  };
  
  saveBindings();
  updateBindingsUI();
  cancelBinding();
}

function saveBindings() {
  localStorage.setItem('sonarstrike-bindings', JSON.stringify(bindings));
}

function loadBindings() {
  const saved = localStorage.getItem('sonarstrike-bindings');
  if (saved) {
    try {
      bindings = JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to parse saved bindings, using defaults", e);
    }
  }
  updateBindingsUI();
}

function resetBindings() {
  bindings = {
    single: { type: 'key', code: 'Space', btnIndex: 0 },
    red: { type: 'key', code: 'KeyS', btnIndex: 2 },
    yellow: { type: 'key', code: 'KeyD', btnIndex: 3 },
    blue: { type: 'key', code: 'KeyK', btnIndex: 1 },
    green: { type: 'key', code: 'KeyL', btnIndex: 0 },
    kick: { type: 'key', code: 'Space', btnIndex: 4 }
  };
  saveBindings();
  updateBindingsUI();
}

function updateBindingsUI() {
  for (const action in bindings) {
    const bindVal = document.getElementById(`val-${action}`);
    if (bindVal) {
      const bind = bindings[action];
      if (bind.type === 'key') {
        // Strip out Key prefix for cleaner representation
        const keyName = bind.code.replace('Key', '');
        bindVal.innerText = `Key (${keyName})`;
      } else if (bind.type === 'gamepad') {
        bindVal.innerText = `Gamepad (Btn ${bind.btnIndex})`;
      } else if (bind.type === 'webhid') {
        if (bind.isAnalog) {
          bindVal.innerText = `WebHID (Byte ${bind.byteIndex} > ${bind.threshold})`;
        } else {
          const maskHex = bind.bitMask.toString(16).toUpperCase();
          bindVal.innerText = `WebHID (Byte ${bind.byteIndex} & 0x${maskHex})`;
        }
      }
    }
  }
}

