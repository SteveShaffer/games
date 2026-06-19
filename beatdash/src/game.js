/* Beat Dash - Core Game Engine & Audio Analyzer */

// --- GAME CONFIGURATION ---
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const GROUND_Y = 560;
const PLAYER_SIZE = 45;
const BLOCK_SIZE = 60;
const SPIKE_WIDTH = 50;
const SPIKE_HEIGHT = 56;

const SPEED_NORMAL = 420;       // Pixels per second (reduced from 480 for easier reactions)
const SPEED_BOOST = 540;        // Pixels per second (reduced from 680)
const SPEED_SLOW = 300;         // Pixels per second

const GRAVITY_CUBE = 0.65;       // Gravity acceleration per frame (increased to prevent glide and add snap)
const JUMP_IMPULSE = -14.4;     // Jump force (adjusted to maintain height with higher gravity)
const GRAVITY_SHIP = 0.4;       // Ship gravity
const THRUST_SHIP = -0.85;      // Ship flying thrust
const MAX_VY_SHIP = 8.5;        // Ship terminal velocity

// --- STATE MANAGEMENT ---
let audioCtx = null;
let currentAudioBuffer = null;
let audioSourceNode = null;
let audioStartTime = 0;
let audioPauseOffset = 0;
let isAudioPlaying = false;

// Game state variables
let gameState = "MENU"; // MENU, LOADING, PLAYING, PAUSED, CRASHED, VICTORY
let attemptCount = 0;
let levelDuration = 0; // Song duration in seconds
let levelWidth = 0; // Level length in pixels
let levelProgress = 0; // 0 to 1
let player = null;
let levelElements = [];
let particles = [];
let targetSpeed = SPEED_NORMAL;
let currentSpeed = SPEED_NORMAL;
let spikesCleared = 0;

// Visualizer & BG pulsing
let visualizerPeaks = new Float32Array(32);
let backgroundPulse = 0;
let currentBgHue = 270; // Start with purple
let targetBgHue = 270;
let colorPulseIntensity = 0;
let currentThemeColor = "#8f00ff";

// Preloaded demo tracks details
const DEMO_TRACKS = [
    { name: "Neon Drive", bpm: 130, style: "Synthwave", difficulty: "Normal" },
    { name: "Cyber Chase", bpm: 142, style: "Drum & Bass", difficulty: "Hard" },
    { name: "Pulse Runner", bpm: 115, style: "Chill Pop", difficulty: "Easy" }
];
let selectedDemoIndex = 0;

// --- DOM ELEMENTS ---
let canvas, ctx;
let menuScreen, gameScreen, uploadStatus, statusText;
let dropZone, fileInput, playBtn, demoTrackBtns;
let attemptVal, progressBar, progressText, pauseBtn;
let pauseOverlay, pauseTrackName, resumeBtn, restartBtn, menuBtn;
let deathOverlay, deathProgressPercent, deathRetryBtn, deathMenuBtn;
let victoryOverlay, victoryTrackName, victoryAttempts, victorySpikes, victoryMenuBtn;
let trackPreview, previewName, previewDifficulty;

// Key state tracking
const keys = {};

// --- INITIALIZATION ---
window.addEventListener("DOMContentLoaded", () => {
    initDOMElements();
    setupEventListeners();
    initCanvas();
    resetGame();
});

function initDOMElements() {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");

    menuScreen = document.getElementById("menuScreen");
    gameScreen = document.getElementById("gameScreen");
    uploadStatus = document.getElementById("uploadStatus");
    statusText = document.getElementById("statusText");

    dropZone = document.getElementById("dropZone");
    fileInput = document.getElementById("fileInput");
    playBtn = document.getElementById("playBtn");
    demoTrackBtns = document.querySelectorAll(".demo-track-btn");

    attemptVal = document.getElementById("attemptVal");
    progressBar = document.getElementById("progressBar");
    progressText = document.getElementById("progressText");
    pauseBtn = document.getElementById("pauseBtn");

    pauseOverlay = document.getElementById("pauseOverlay");
    pauseTrackName = document.getElementById("pauseTrackName");
    resumeBtn = document.getElementById("resumeBtn");
    restartBtn = document.getElementById("restartBtn");
    menuBtn = document.getElementById("menuBtn");

    deathOverlay = document.getElementById("deathOverlay");
    deathProgressPercent = document.getElementById("deathProgressPercent");
    deathRetryBtn = document.getElementById("deathRetryBtn");
    deathMenuBtn = document.getElementById("deathMenuBtn");

    victoryOverlay = document.getElementById("victoryOverlay");
    victoryTrackName = document.getElementById("victoryTrackName");
    victoryAttempts = document.getElementById("victoryAttempts");
    victorySpikes = document.getElementById("victorySpikes");
    victoryMenuBtn = document.getElementById("victoryMenuBtn");

    trackPreview = document.getElementById("trackPreview");
    previewName = document.getElementById("previewName");
    previewDifficulty = document.getElementById("previewDifficulty");
}

function setupEventListeners() {
    // Keyboard controls
    window.addEventListener("keydown", (e) => {
        keys[e.code] = true;
        
        // Prevent default spacebar scrolling
        if (e.code === "Space") e.preventDefault();

        // Pause hotkeys
        if ((e.code === "KeyP" || e.code === "Escape") && gameState === "PLAYING") {
            pauseGame();
        } else if ((e.code === "KeyP" || e.code === "Escape") && gameState === "PAUSED") {
            resumeGame();
        }

        // Quick restart on Space or R when crashed
        if ((e.code === "Space" || e.code === "KeyR") && gameState === "CRASHED") {
            restartLevel();
        }
    });

    window.addEventListener("keyup", (e) => {
        keys[e.code] = false;
    });

    // Tap/Click jump inputs (mouse & touch)
    const triggerJumpStart = (e) => {
        if (e.target.closest("#pauseBtn")) return;
        keys["JumpAction"] = true;
    };
    
    const triggerJumpEnd = () => {
        keys["JumpAction"] = false;
    };

    canvas.addEventListener("mousedown", triggerJumpStart);
    canvas.addEventListener("mouseup", triggerJumpEnd);
    canvas.addEventListener("touchstart", (e) => {
        if (e.target.closest("#pauseBtn")) return;
        triggerJumpStart(e);
        // Prevent double click zooms
        e.preventDefault();
    }, { passive: false });
    canvas.addEventListener("touchend", triggerJumpEnd);

    // File Drag and Drop
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file && (file.type === "audio/mp3" || file.type === "audio/mpeg" || file.name.endsWith(".mp3"))) {
            handleFileUpload(file);
        } else {
            alert("Please drop a valid MP3 file.");
        }
    });

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (file) handleFileUpload(file);
    });

    // UI Buttons
    playBtn.addEventListener("click", () => {
        if (currentAudioBuffer) {
            launchGame();
        } else {
            // If no user file, generate the selected demo track
            generateAndPlayDemoTrack();
        }
    });

    demoTrackBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            demoTrackBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedDemoIndex = parseInt(btn.dataset.track);
            
            // Clear any user uploaded track representation
            currentAudioBuffer = null;
            previewDifficulty.innerText = DEMO_TRACKS[selectedDemoIndex].difficulty;
            previewName.innerText = DEMO_TRACKS[selectedDemoIndex].name;
            trackPreview.classList.remove("hidden");
        });
    });

    resumeBtn.addEventListener("click", resumeGame);
    restartBtn.addEventListener("click", restartLevel);
    menuBtn.addEventListener("click", showMenu);
    
    pauseBtn.addEventListener("click", () => {
        if (gameState === "PLAYING") pauseGame();
    });

    deathRetryBtn.addEventListener("click", restartLevel);
    deathMenuBtn.addEventListener("click", showMenu);
    victoryMenuBtn.addEventListener("click", showMenu);
}

function initCanvas() {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
}

// --- SYNTH SOUND FX ---
function playSynthSound(type) {
    if (!audioCtx) return;
    
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === "jump") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.15);
        gainNode.gain.setValueAtTime(0.18, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.16);
    } 
    else if (type === "orb") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(900, now + 0.05);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.26);
    }
    else if (type === "pad") {
        osc.type = "square";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.13);
    }
    else if (type === "portal") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.3);
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
        
        osc.disconnect(gainNode);
        osc.connect(filter);
        filter.connect(gainNode);
        
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.005, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.31);
    }
    else if (type === "crash") {
        // Crash explosion noise sound
        const bufferSize = audioCtx.sampleRate * 0.4; // 0.4 seconds
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.35);
        
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
        
        noiseSource.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        
        noiseSource.start(now);
        noiseSource.stop(now + 0.4);
    }
}

// --- FILE UPLOAD & PRE-PROCESSING ---
function handleFileUpload(file) {
    initAudioContext();
    
    // UI Loading state
    uploadStatus.classList.remove("hidden");
    statusText.innerText = "Reading audio file...";
    
    const reader = new FileReader();
    reader.onload = function(e) {
        statusText.innerText = "Decoding MP3 data...";
        const arrayBuffer = e.target.result;
        
        audioCtx.decodeAudioData(arrayBuffer)
            .then(decodedBuffer => {
                currentAudioBuffer = decodedBuffer;
                statusText.innerText = "Analyzing beat profile...";
                
                // Perform Offline Audio Analysis
                setTimeout(() => {
                    analyzeAudioBuffer(currentAudioBuffer);
                    
                    uploadStatus.classList.add("hidden");
                    previewDifficulty.innerText = "Custom";
                    previewName.innerText = file.name.replace(".mp3", "");
                    trackPreview.classList.remove("hidden");
                    
                    // Trigger active state on launch button
                    playBtn.classList.add("btn-primary");
                }, 50);
            })
            .catch(err => {
                alert("Failed to decode audio. Please try another MP3.");
                uploadStatus.classList.add("hidden");
                console.error("Decode error: ", err);
            });
    };
    reader.readAsArrayBuffer(file);
}

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}

// --- OFFLINE AUDIO ANALYSIS (DSP) ---
function analyzeAudioBuffer(buffer) {
    const sampleRate = buffer.sampleRate;
    const rawData = buffer.getChannelData(0); // mono channel
    const len = rawData.length;
    
    // 1. Digital Filtering in JS
    // Fast 1st-order IIR Low-pass Filter (isolate bass < 150Hz)
    // Formula: y[n] = alpha * x[n] + (1 - alpha) * y[n-1]
    const alphaLP = 0.025;
    const lpData = new Float32Array(len);
    let lastLP = 0;
    for (let i = 0; i < len; i++) {
        lpData[i] = alphaLP * rawData[i] + (1 - alphaLP) * lastLP;
        lastLP = lpData[i];
    }
    
    // Fast 1st-order IIR High-pass Filter (isolate treble > 5000Hz)
    // Formula: y[n] = alpha * (y[n-1] + x[n] - x[n-1])
    const alphaHP = 0.65;
    const hpData = new Float32Array(len);
    let lastHP_x = 0;
    let lastHP_y = 0;
    for (let i = 0; i < len; i++) {
        hpData[i] = alphaHP * (lastHP_y + rawData[i] - lastHP_x);
        lastHP_x = rawData[i];
        lastHP_y = hpData[i];
    }
    
    // 2. Compute RMS Energies in ~46ms frames (2048 samples)
    const frameSize = 2048;
    const numFrames = Math.floor(len / frameSize);
    
    const bassEnergies = new Float32Array(numFrames);
    const trebleEnergies = new Float32Array(numFrames);
    const totalEnergies = new Float32Array(numFrames);
    
    for (let f = 0; f < numFrames; f++) {
        const startIdx = f * frameSize;
        let sumLP = 0;
        let sumHP = 0;
        let sumTotal = 0;
        
        for (let i = 0; i < frameSize; i++) {
            const valLP = lpData[startIdx + i];
            const valHP = hpData[startIdx + i];
            const valTotal = rawData[startIdx + i];
            
            sumLP += valLP * valLP;
            sumHP += valHP * valHP;
            sumTotal += valTotal * valTotal;
        }
        
        bassEnergies[f] = Math.sqrt(sumLP / frameSize);
        trebleEnergies[f] = Math.sqrt(sumHP / frameSize);
        totalEnergies[f] = Math.sqrt(sumTotal / frameSize);
    }
    
    // 3. Beat Detection & Onsets
    const bassBeats = detectBeats(bassEnergies, frameSize, sampleRate, 1.4, 0.22);
    const trebleBeats = detectBeats(trebleEnergies, frameSize, sampleRate, 1.4, 0.24);
    
    // 4. Generate level data
    levelDuration = buffer.duration;
    generateLevel(bassBeats, trebleBeats, totalEnergies, frameSize, sampleRate);
}

function detectBeats(energyArray, frameSize, sampleRate, thresholdMultiplier, cooldownSeconds) {
    const beats = [];
    const windowSize = 25; // ~1.15 seconds local window
    const cooldownFrames = Math.round((cooldownSeconds * sampleRate) / frameSize);
    let lastBeatFrame = -cooldownFrames;
    
    for (let i = 0; i < energyArray.length; i++) {
        // Calculate rolling average
        const start = Math.max(0, i - windowSize);
        const end = Math.min(energyArray.length - 1, i + windowSize);
        let sum = 0;
        for (let j = start; j <= end; j++) {
            sum += energyArray[j];
        }
        const average = sum / (end - start + 1);
        
        // Criteria for beat:
        // - Local energy exceeds average * multiplier
        // - Local peak (greater than neighbors)
        // - Past cooldown
        const isPeak = energyArray[i] > (energyArray[i - 1] || 0) && energyArray[i] > (energyArray[i + 1] || 0);
        if (energyArray[i] > average * thresholdMultiplier && isPeak && (i - lastBeatFrame) >= cooldownFrames) {
            const time = (i * frameSize) / sampleRate;
            beats.push({
                time: time,
                intensity: energyArray[i] / (average || 0.001) // normalized intensity
            });
            lastBeatFrame = i;
        }
    }
    
    return beats;
}

// --- PROCEDURAL LEVEL GENERATOR ---
function generateLevel(bassBeats, trebleBeats, totalEnergies, frameSize, sampleRate) {
    levelElements = [];
    spikesCleared = 0;
    
    // 1. Calculate Intensity profile for mode portals
    const duration = levelDuration;
    const rollingWindowSec = 4;
    const windowFrames = Math.round((rollingWindowSec * sampleRate) / frameSize);
    
    const intensityProfile = []; // average total energy for 4-second blocks
    for (let f = 0; f < totalEnergies.length; f += windowFrames) {
        const end = Math.min(totalEnergies.length - 1, f + windowFrames);
        let sum = 0;
        for (let j = f; j < end; j++) {
            sum += totalEnergies[j];
        }
        intensityProfile.push({
            time: (f * frameSize) / sampleRate,
            avgEnergy: sum / (end - f + 1)
        });
    }
    
    // Sort energy values to find median for mode splits
    const sortedEnergies = intensityProfile.map(ip => ip.avgEnergy).sort((a, b) => a - b);
    const medianEnergy = sortedEnergies[Math.floor(sortedEnergies.length * 0.5)] || 0.1;
    
    // 2. Generate Mode Transitions (Portals)
    // High energy sections = Ship mode + High Speed, Low energy = Cube mode + Normal Speed
    const speedChanges = [];
    let currentMode = "cube";
    
    intensityProfile.forEach((section, index) => {
        if (section.time < 5) return; // Keep intro normal Cube
        if (section.time > duration - 6) return; // Keep outro normal Cube
        
        const isHighEnergy = section.avgEnergy > medianEnergy * 1.1;
        const targetMode = isHighEnergy ? "ship" : "cube";
        
        if (targetMode !== currentMode) {
            speedChanges.push({
                time: section.time,
                type: targetMode === "ship" ? "portal_ship" : "portal_cube"
            });
            currentMode = targetMode;
        }
    });

    // 3. Populate Obstacles using Beats
    const minObstacleSpacingSec = 0.38; // Rhythmic spacing sweet spot (decreased from 0.55)
    let lastObstacleTime = 2.0; // Start placing after 2 seconds
    
    // A. Bass beats -> Ground obstacles (Spikes, blocks)
    bassBeats.forEach(beat => {
        if (beat.time < lastObstacleTime + minObstacleSpacingSec) return;
        if (beat.time > duration - 5) return; // Clear finish area
        if (beat.intensity < 1.5) return; // Keep most kick drums, skip noise (lowered from 1.8)
        
        // Decide what to place based on intensity and mode at this time
        const modeAtTime = getModeAtTime(beat.time, speedChanges);
        
        if (modeAtTime === "cube") {
            const rand = Math.random();
            if (beat.intensity > 2.2 && rand > 0.6) {
                // Stack of blocks / small step
                placeElement(beat.time, "block", GROUND_Y - BLOCK_SIZE);
                if (rand > 0.85) {
                    placeElement(beat.time + 0.18, "spike", GROUND_Y - BLOCK_SIZE - SPIKE_HEIGHT);
                }
            } else if (beat.intensity > 1.85 && rand > 0.3) {
                // Solid Block
                placeElement(beat.time, "block", GROUND_Y - BLOCK_SIZE);
            } else {
                // Standard Ground Spike
                placeElement(beat.time, "spike", GROUND_Y - SPIKE_HEIGHT);
            }
        } else {
            // Ship mode ground obstacles (spikes on floor/ceiling)
            const rand = Math.random();
            if (rand > 0.7) {
                // Ground spike
                placeElement(beat.time, "spike", GROUND_Y - SPIKE_HEIGHT);
            } else if (rand > 0.4) {
                // Ceiling spike
                placeElement(beat.time, "ceiling_spike", 50);
            } else if (rand > 0.2) {
                // Hanging block
                placeElement(beat.time, "block", 220);
            }
        }
        
        lastObstacleTime = beat.time;
    });
    
    // B. Treble beats -> Floating structures, Jump Orbs & Jump Pads
    let lastTrebleTime = 2.0;
    const minTrebleSpacingSec = 0.55; // Spacing for floating parts (decreased from 0.8)
    trebleBeats.forEach(beat => {
        if (beat.time < lastTrebleTime + minTrebleSpacingSec) return;
        if (beat.time > duration - 6) return;
        if (beat.intensity < 1.45) return; // Keep high-frequency drum snaps (lowered from 1.75)
        
        const modeAtTime = getModeAtTime(beat.time, speedChanges);
        
        if (modeAtTime === "cube") {
            const rand = Math.random();
            if (rand > 0.7) {
                // Floating Jump Orb (allows air jumps)
                placeElement(beat.time, "orb", GROUND_Y - 170);
            } else if (rand > 0.4) {
                // Floating blocks to jump on
                placeElement(beat.time, "block", GROUND_Y - 120);
                placeElement(beat.time + 0.15, "block", GROUND_Y - 120);
            } else if (rand > 0.2) {
                // Jump pad (auto booster)
                placeElement(beat.time, "pad", GROUND_Y - 10); // slightly offsets into ground
            }
        } else {
            // Ship mode floating obstacles (narrow tunnels or rings)
            const rand = Math.random();
            if (rand > 0.65) {
                // Center block barrier
                placeElement(beat.time, "block", GROUND_Y - 280);
            }
        }
        
        lastTrebleTime = beat.time;
    });
    
    // 4. Place Mode Portals
    speedChanges.forEach(portal => {
        // Portal center Y coordinate
        const portalY = GROUND_Y - 180;
        placeElement(portal.time, portal.type, portalY);
        
        // Place a speed pad behind it for a visual push
        placeElement(portal.time + 0.1, "speed_boost", GROUND_Y - 10);
    });
    
    // 5. Place Finish Portal
    placeElement(duration - 3, "finish", GROUND_Y - 200);
    
    // Sort elements by x position
    levelElements.sort((a, b) => a.x - b.x);
    levelWidth = duration * SPEED_NORMAL; // Approximate default length representation
}

function getModeAtTime(time, speedChanges) {
    let mode = "cube";
    for (let i = 0; i < speedChanges.length; i++) {
        if (speedChanges[i].time <= time) {
            mode = speedChanges[i].type === "portal_ship" ? "ship" : "cube";
        } else {
            break;
        }
    }
    return mode;
}

function placeElement(time, type, y) {
    // We convert time directly to X using SPEED_NORMAL as base
    const x = time * SPEED_NORMAL;
    
    let w = BLOCK_SIZE;
    let h = BLOCK_SIZE;
    
    if (type === "spike" || type === "ceiling_spike") {
        w = SPIKE_WIDTH;
        h = SPIKE_HEIGHT;
    } else if (type === "orb") {
        w = 40;
        h = 40;
    } else if (type === "pad") {
        w = 50;
        h = 16;
    } else if (type.startsWith("portal_")) {
        w = 60;
        h = 160;
    } else if (type === "speed_boost") {
        w = 50;
        h = 14;
    } else if (type === "finish") {
        w = 80;
        h = 240;
    }
    
    levelElements.push({
        x: x,
        y: y,
        width: w,
        height: h,
        type: type,
        passed: false
    });
}

// --- LAUNCH GAME PLAYBACK ---
function generateAndPlayDemoTrack() {
    initAudioContext();
    
    uploadStatus.classList.remove("hidden");
    statusText.innerText = `Synthesizing '${DEMO_TRACKS[selectedDemoIndex].name}'...`;
    
    // Generate chiptune procedurally
    setTimeout(() => {
        ChiptuneSynth.generateTrack(selectedDemoIndex, 75, audioCtx.sampleRate)
            .then(audioBuffer => {
                currentAudioBuffer = audioBuffer;
                statusText.innerText = "Analyzing chiptune tracks...";
                
                setTimeout(() => {
                    analyzeAudioBuffer(currentAudioBuffer);
                    uploadStatus.classList.add("hidden");
                    launchGame();
                }, 50);
            })
            .catch(err => {
                alert("Synth generation failed.");
                uploadStatus.classList.add("hidden");
                console.error(err);
            });
    }, 50);
}

function launchGame() {
    gameState = "PLAYING";
    attemptCount = 1;
    audioPauseOffset = 0;
    
    menuScreen.classList.remove("active");
    menuScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    gameScreen.classList.add("active");
    
    initPlayer();
    startAudio();
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

function initPlayer() {
    player = {
        x: 180,
        y: GROUND_Y - PLAYER_SIZE,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        vy: 0,
        mode: "cube", // cube, ship
        angle: 0, // rotation angle for cube (degrees)
        alive: true,
        onGround: true,
        glowPulse: 0
    };
    
    currentSpeed = SPEED_NORMAL;
    targetSpeed = SPEED_NORMAL;
}

function startAudio() {
    if (!currentAudioBuffer) return;
    
    // Stop existing node if any
    stopAudio();
    
    audioSourceNode = audioCtx.createBufferSource();
    audioSourceNode.buffer = currentAudioBuffer;
    
    // Connect visualizer node
    const analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 64;
    
    audioSourceNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
    
    // Start playing
    audioStartTime = audioCtx.currentTime - audioPauseOffset;
    audioSourceNode.start(0, audioPauseOffset);
    isAudioPlaying = true;
    
    // Record visualizer updates
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function updateVisualizer() {
        if (!isAudioPlaying || gameState !== "PLAYING") return;
        analyserNode.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            visualizerPeaks[i] = dataArray[i] / 255;
            sum += dataArray[i];
        }
        
        // Calculate pulse intensity based on average volume
        backgroundPulse = sum / bufferLength / 255;
        
        // Cycle colors on major beat energy
        if (backgroundPulse > 0.65) {
            colorPulseIntensity = 1.0;
            targetBgHue = (targetBgHue + 35) % 360;
        }
        
        requestAnimationFrame(updateVisualizer);
    }
    
    updateVisualizer();
    
    // Handle natural song completion
    audioSourceNode.onended = () => {
        if (isAudioPlaying && player.alive) {
            triggerVictory();
        }
    };
}

function stopAudio() {
    if (audioSourceNode) {
        try {
            audioSourceNode.stop();
        } catch(e) {}
        audioSourceNode.disconnect();
        audioSourceNode = null;
    }
    isAudioPlaying = false;
}

// --- CORE GAME LOOP ---
let lastTime = 0;
function gameLoop(timestamp) {
    if (gameState !== "PLAYING" && gameState !== "CRASHED") return;
    
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    // Cap dt to prevent huge jumps (e.g. if tab goes out of focus)
    if (dt > 0.1) dt = 0.1;
    
    update(dt);
    render();
    
    requestAnimationFrame(gameLoop);
}

// --- UPDATE MECHANICS ---
function update(dt) {
    if (!player.alive) {
        updateParticles(dt);
        return;
    }
    
    // 1. Sync horizontal speed and placement with audio clock!
    if (isAudioPlaying) {
        const audioElapsed = audioCtx.currentTime - audioStartTime;
        
        // Linearly shift speed to match speed boosters
        currentSpeed += (targetSpeed - currentSpeed) * 0.1;
        
        // Exact player position determined by elapsed audio context time
        // This ensures the level moves exactly in sync with the beats!
        player.x = audioElapsed * SPEED_NORMAL + 180;
        levelProgress = audioElapsed / levelDuration;
        if (levelProgress > 1.0) levelProgress = 1.0;
    }
    
    // 2. Physics & Controls
    const jumpPressed = keys["Space"] || keys["ArrowUp"] || keys["KeyW"] || keys["JumpAction"];
    
    if (player.mode === "cube") {
        // JUMP! (Checked using ground status from previous frame)
        if (jumpPressed && player.onGround) {
            player.vy = JUMP_IMPULSE;
            player.onGround = false;
            playSynthSound("jump");
            spawnJumpDust();
        }
        
        // Apply Gravity
        player.vy += GRAVITY_CUBE;
        player.y += player.vy;
        player.onGround = false;
        
        // Rotate in mid-air
        if (!player.onGround) {
            player.angle += 8.0; // Degrees per frame (adjusted for faster spin over snappier jumps)
        } else {
            // Snap angle to nearest 90 degrees when landing
            const snapAngle = Math.round(player.angle / 90) * 90;
            player.angle += (snapAngle - player.angle) * 0.35;
        }
    } 
    else if (player.mode === "ship") {
        // Fly upward on thrust
        if (jumpPressed) {
            player.vy += THRUST_SHIP;
        } else {
            player.vy += GRAVITY_SHIP;
        }
        
        // Clamp speed
        if (player.vy > MAX_VY_SHIP) player.vy = MAX_VY_SHIP;
        if (player.vy < -MAX_VY_SHIP) player.vy = -MAX_VY_SHIP;
        
        player.y += player.vy;
        
        // Soft bounding to screen top and ground ceiling
        if (player.y < 50) {
            player.y = 50;
            player.vy = 0;
        }
        if (player.y > GROUND_Y - player.height) {
            player.y = GROUND_Y - player.height;
            player.vy = 0;
            player.onGround = true;
        }
        
        // Tilts according to vertical speed
        const targetAngle = player.vy * 4;
        player.angle += (targetAngle - player.angle) * 0.2;
    }
    
    // Ground bounds check (cube mode fall)
    if (player.y > GROUND_Y - player.height) {
        player.y = GROUND_Y - player.height;
        player.vy = 0;
        player.onGround = true;
    }
    
    // 3. Collision Processing
    checkCollisions();
    
    // 4. Particles & VFX
    updateParticles(dt);
    spawnTrailParticles();
    
    // Interpolate HUD background colors dynamically
    currentBgHue += (targetBgHue - currentBgHue) * 0.05;
    colorPulseIntensity *= 0.95;
    currentThemeColor = `hsl(${currentBgHue}, 100%, ${50 + colorPulseIntensity * 15}%)`;
    
    // Update HTML overlay metrics
    progressBar.style.width = `${levelProgress * 100}%`;
    progressText.innerText = `${Math.floor(levelProgress * 100)}%`;
}

function checkCollisions() {
    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;
    
    // We only need to check elements within the camera view
    const viewLeft = player.x - 300;
    const viewRight = player.x + CANVAS_WIDTH;
    
    for (let i = 0; i < levelElements.length; i++) {
        const el = levelElements[i];
        
        // Skip off-screen elements
        if (el.x + el.width < viewLeft) continue;
        if (el.x > viewRight) break; // Elements are sorted
        
        // Check standard overlapping collision
        if (px + pw > el.x && px < el.x + el.width && py + ph > el.y && py < el.y + el.height) {
            
            // --- COLLISION LOGIC BY TYPE ---
            
            if (el.type === "spike") {
                // Precise triangle-based collision mapping (simple polygon checks)
                // If it hits the center base, player dies
                const playerBottom = py + ph;
                const playerRight = px + pw;
                
                // Allow a margin of error (increased for easier, fairer spike collisions)
                if (playerRight > el.x + 13 && px < el.x + el.width - 13 && playerBottom > el.y + 15) {
                    triggerDeath();
                    return;
                }
            } 
            else if (el.type === "ceiling_spike") {
                // Increased margin of error
                if (px + pw > el.x + 13 && px < el.x + el.width - 13 && py < el.y + el.height - 15) {
                    triggerDeath();
                    return;
                }
            }
            else if (el.type === "block") {
                // AABB Collision Resolution
                const playerPrevX = player.x - (currentSpeed * 0.016); // Estimating prev coordinate
                
                // Land on top
                const overlapY = Math.min(py + ph - el.y, el.y + el.height - py);
                const overlapX = Math.min(px + pw - el.x, el.x + el.width - px);
                
                if (overlapY < overlapX) {
                    if (player.vy >= 0 && py + ph - el.y < 25) { // Increased from 18 for much easier landings
                        // Landing
                        player.y = el.y - ph;
                        player.vy = 0;
                        player.onGround = true;
                    } else if (py < el.y + el.height && el.y + el.height - py < 25) { // Increased from 18
                        // Bonk head
                        player.y = el.y + el.height;
                        player.vy = 0;
                    }
                } else {
                    // Front Crash = Death
                    if (px + pw > el.x && px < el.x + el.width) {
                        triggerDeath();
                        return;
                    }
                }
            } 
            else if (el.type === "orb") {
                // Orb: mid-air click activates extra jump boost
                const jumpPressed = keys["Space"] || keys["ArrowUp"] || keys["KeyW"] || keys["JumpAction"];
                // Only allow single activation per orb
                if (jumpPressed && !el.passed) {
                    player.vy = JUMP_IMPULSE * 0.95;
                    el.passed = true;
                    playSynthSound("orb");
                    spawnOrbExplosion(el.x + el.width/2, el.y + el.height/2);
                }
            } 
            else if (el.type === "pad") {
                // Pad: auto catapult trigger
                player.vy = JUMP_IMPULSE * 1.25;
                playSynthSound("pad");
                spawnOrbExplosion(el.x + el.width/2, el.y + el.height);
            } 
            else if (el.type === "portal_ship") {
                if (player.mode !== "ship") {
                    player.mode = "ship";
                    targetSpeed = SPEED_BOOST;
                    playSynthSound("portal");
                    spawnFlashRing(el.x + el.width/2, el.y + el.height/2, "#ff007f");
                }
            } 
            else if (el.type === "portal_cube") {
                if (player.mode !== "cube") {
                    player.mode = "cube";
                    targetSpeed = SPEED_NORMAL;
                    player.angle = 0;
                    playSynthSound("portal");
                    spawnFlashRing(el.x + el.width/2, el.y + el.height/2, "#00f0ff");
                }
            } 
            else if (el.type === "speed_boost") {
                if (!el.passed) {
                    colorPulseIntensity = 1.0;
                    targetBgHue = (targetBgHue + 90) % 360;
                    el.passed = true;
                    playSynthSound("pad");
                }
            }
            else if (el.type === "finish") {
                triggerVictory();
                return;
            }
        }
        
        // Track spikes cleared for victory statistics
        if (el.x + el.width < px && !el.passed) {
            el.passed = true;
            if (el.type === "spike" || el.type === "ceiling_spike") {
                spikesCleared++;
            }
        }
    }
}

// --- DEATH & RECOVERY SYSTEMS ---
function triggerDeath() {
    player.alive = false;
    stopAudio();
    playSynthSound("crash");
    
    // Shake screen and explode player
    spawnDeathExplosion();
    gameState = "CRASHED";
    
    // Auto-restart level after 1 second (no menu overlay)
    setTimeout(() => {
        if (gameState !== "CRASHED") return;
        restartLevel();
    }, 1000);
}

function triggerVictory() {
    stopAudio();
    gameState = "VICTORY";
    
    victoryTrackName.innerText = currentAudioBuffer ? (previewName.innerText) : "Neon Drive";
    victoryAttempts.innerText = attemptCount;
    victorySpikes.innerText = spikesCleared;
    
    victoryOverlay.classList.remove("hidden");
}

function restartLevel() {
    // Hide panels
    deathOverlay.classList.add("hidden");
    pauseOverlay.classList.add("hidden");
    victoryOverlay.classList.add("hidden");
    
    attemptCount++;
    attemptVal.innerText = attemptCount;
    
    // Reset player position & elements
    initPlayer();
    levelProgress = 0;
    spikesCleared = 0;
    particles = [];
    
    levelElements.forEach(el => {
        el.passed = false;
    });
    
    audioPauseOffset = 0;
    gameState = "PLAYING";
    
    startAudio();
}

function pauseGame() {
    if (gameState !== "PLAYING") return;
    
    gameState = "PAUSED";
    isAudioPlaying = false;
    
    // Calculate precise current pause time
    audioPauseOffset = audioCtx.currentTime - audioStartTime;
    if (audioSourceNode) {
        try {
            audioSourceNode.stop();
        } catch(e) {}
    }
    
    pauseTrackName.innerText = previewName.innerText;
    pauseOverlay.classList.remove("hidden");
}

function resumeGame() {
    if (gameState !== "PAUSED") return;
    
    pauseOverlay.classList.add("hidden");
    gameState = "PLAYING";
    
    startAudio();
}

function showMenu() {
    stopAudio();
    gameState = "MENU";
    
    // Hide screens & layers
    gameScreen.classList.remove("active");
    gameScreen.classList.add("hidden");
    
    deathOverlay.classList.add("hidden");
    pauseOverlay.classList.add("hidden");
    victoryOverlay.classList.add("hidden");
    
    menuScreen.classList.remove("hidden");
    menuScreen.classList.add("active");
}

// --- PARTICLE PHYSICS SYSTEM ---
function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.gravity) {
            p.vy += p.gravity;
        }
        
        p.alpha -= p.decay;
        p.size *= p.shrink || 1.0;
        p.angle += p.spin || 0;
        
        if (p.alpha <= 0 || p.size <= 0.2) {
            particles.splice(i, 1);
        }
    }
}

function spawnTrailParticles() {
    if (!player.alive) return;
    
    // Spawn rate based on speed
    const density = player.mode === "ship" ? 2 : 1;
    
    for (let i = 0; i < density; i++) {
        // Offset particle slightly behind player
        const px = player.x - 5;
        const py = player.y + PLAYER_SIZE/2 + (Math.random() * 20 - 10);
        
        particles.push({
            x: px,
            y: py,
            vx: -currentSpeed * 0.05 + (Math.random() * 2 - 1),
            vy: (Math.random() * 2 - 1),
            size: Math.random() * 6 + 4,
            alpha: 0.8,
            decay: 0.035,
            color: player.mode === "ship" ? "#ff007f" : "#00f0ff"
        });
    }
}

function spawnJumpDust() {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: player.x + PLAYER_SIZE/2 + (Math.random() * 20 - 10),
            y: GROUND_Y,
            vx: (Math.random() * 6 - 5) - currentSpeed * 0.02,
            vy: -(Math.random() * 2 + 1),
            size: Math.random() * 4 + 3,
            alpha: 0.7,
            decay: 0.04,
            color: "#ffffff"
        });
    }
}

function spawnOrbExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 5 + 3,
            alpha: 1.0,
            decay: 0.04,
            color: "#ffe600" // glowing yellow
        });
    }
}

function spawnFlashRing(x, y, color) {
    particles.push({
        type: "ring",
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        size: 20, // radius
        shrink: 1.15, // scales up!
        alpha: 1.0,
        decay: 0.06,
        color: color
    });
}

function spawnDeathExplosion() {
    const cx = player.x + PLAYER_SIZE/2;
    const cy = player.y + PLAYER_SIZE/2;
    
    // Neon blast waves
    for (let j = 0; j < 3; j++) {
        spawnFlashRing(cx, cy, j === 0 ? "#ff007f" : (j === 1 ? "#8f00ff" : "#00f0ff"));
    }
    
    // Radial glowing chunk particles
    for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 4;
        particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.15,
            size: Math.random() * 8 + 4,
            alpha: 1.0,
            decay: 0.02,
            spin: Math.random() * 0.2 - 0.1,
            color: Math.random() > 0.5 ? "#ff007f" : "#8f00ff"
        });
    }
}

// --- GRAPHICS RENDERING PIPELINE ---
function render() {
    // Clear viewport
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 1. Draw glowing background grid
    drawBackground();
    
    // 2. Camera translation logic
    ctx.save();
    // Offset camera viewport horizontally to keep player centered on screen
    const cameraX = player.x - 180;
    ctx.translate(-cameraX, 0);
    
    // Draw obstacles
    drawLevelElements();
    
    // Draw player
    if (player.alive) {
        drawPlayer();
    }
    
    // Draw particles inside the world coordinate space
    drawParticles();
    
    ctx.restore();
    
    // 3. Render real-time Equalizer visualizer bars on screen margins
    drawVisualizerHUD();
}

function drawBackground() {
    // Interpolated background color with pulse shifts
    const pulseAmt = backgroundPulse * 0.15;
    ctx.fillStyle = `hsl(${currentBgHue}, 60%, ${6 + pulseAmt * 10}%)`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Grid Lines moving leftward
    ctx.strokeStyle = `hsla(${currentBgHue}, 100%, 50%, ${0.05 + backgroundPulse * 0.08})`;
    ctx.lineWidth = 1;
    
    const gridSize = 60;
    const cameraShiftX = player.x % gridSize;
    
    // Vertical grid lines
    for (let x = -gridSize; x < CANVAS_WIDTH + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - cameraShiftX, 0);
        ctx.lineTo(x - cameraShiftX, GROUND_Y);
        ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = 0; y < GROUND_Y; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
    }
    
    // Draw Ground base outline
    ctx.fillStyle = "#0c0a18";
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    
    // Ground neon grid divider line
    ctx.strokeStyle = currentThemeColor;
    ctx.lineWidth = 4;
    ctx.shadowColor = currentThemeColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();
    
    // Reset shadow blur
    ctx.shadowBlur = 0;
    
    // Ground fill grid decoration
    ctx.strokeStyle = `rgba(255, 255, 255, 0.03)`;
    ctx.lineWidth = 1;
    for (let x = -gridSize; x < CANVAS_WIDTH + gridSize; x += gridSize / 2) {
        ctx.beginPath();
        ctx.moveTo(x - cameraShiftX, GROUND_Y);
        ctx.lineTo(x - cameraShiftX - 100, CANVAS_HEIGHT);
        ctx.stroke();
    }
}

function drawPlayer() {
    ctx.save();
    
    // Translate and rotate around the player's center point
    const cx = player.x + PLAYER_SIZE/2;
    const cy = player.y + PLAYER_SIZE/2;
    ctx.translate(cx, cy);
    ctx.rotate((player.angle * Math.PI) / 180);
    
    // Draw neon trail/cube color shadow glow
    ctx.shadowColor = player.mode === "ship" ? "#ff007f" : "#00f0ff";
    ctx.shadowBlur = 12 + backgroundPulse * 15;
    
    if (player.mode === "cube") {
        // Draw main cube face
        ctx.fillStyle = "#050409";
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 4;
        
        ctx.fillRect(-PLAYER_SIZE/2, -PLAYER_SIZE/2, PLAYER_SIZE, PLAYER_SIZE);
        ctx.strokeRect(-PLAYER_SIZE/2, -PLAYER_SIZE/2, PLAYER_SIZE, PLAYER_SIZE);
        
        // Inner glowing face detailing (eyes/mouth retro style)
        ctx.fillStyle = "#00f0ff";
        ctx.fillRect(-12, -12, 8, 8); // eye 1
        ctx.fillRect(4, -12, 8, 8);  // eye 2
        
        // Smiling mouth
        ctx.fillRect(-10, 4, 20, 4);
        ctx.fillRect(-10, 0, 4, 4);
        ctx.fillRect(6, 0, 4, 4);
    } 
    else if (player.mode === "ship") {
        // Spaceship shape
        ctx.fillStyle = "#050409";
        ctx.strokeStyle = "#ff007f";
        ctx.lineWidth = 3.5;
        
        ctx.beginPath();
        // Nose cone
        ctx.moveTo(PLAYER_SIZE/2, 0);
        // Wing top
        ctx.lineTo(-PLAYER_SIZE/2 + 5, -PLAYER_SIZE/3);
        // Tail top
        ctx.lineTo(-PLAYER_SIZE/2, -PLAYER_SIZE/2);
        // Engine back
        ctx.lineTo(-PLAYER_SIZE/3, 0);
        // Tail bottom
        ctx.lineTo(-PLAYER_SIZE/2, PLAYER_SIZE/2);
        // Wing bottom
        ctx.lineTo(-PLAYER_SIZE/2 + 5, PLAYER_SIZE/3);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
        
        // Glowing cockpit dome
        ctx.fillStyle = "#ff007f";
        ctx.beginPath();
        ctx.arc(0, -2, 6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawLevelElements() {
    const px = player.x;
    const viewLeft = px - 300;
    const viewRight = px + CANVAS_WIDTH;
    
    for (let i = 0; i < levelElements.length; i++) {
        const el = levelElements[i];
        
        // Skip elements outside camera bounds
        if (el.x + el.width < viewLeft) continue;
        if (el.x > viewRight) break;
        
        ctx.save();
        
        if (el.type === "spike") {
            // Triangle Spike (ground)
            ctx.fillStyle = "rgba(12, 10, 24, 0.85)";
            ctx.strokeStyle = "#ff3c3c";
            ctx.lineWidth = 3.5;
            ctx.shadowColor = "#ff3c3c";
            ctx.shadowBlur = 10 + backgroundPulse * 10;
            
            ctx.beginPath();
            ctx.moveTo(el.x, el.y + el.height);
            ctx.lineTo(el.x + el.width/2, el.y);
            ctx.lineTo(el.x + el.width, el.y + el.height);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } 
        else if (el.type === "ceiling_spike") {
            // Triangle Spike (ceiling pointing down)
            ctx.fillStyle = "rgba(12, 10, 24, 0.85)";
            ctx.strokeStyle = "#ff3c3c";
            ctx.lineWidth = 3.5;
            ctx.shadowColor = "#ff3c3c";
            ctx.shadowBlur = 10 + backgroundPulse * 10;
            
            ctx.beginPath();
            ctx.moveTo(el.x, el.y);
            ctx.lineTo(el.x + el.width/2, el.y + el.height);
            ctx.lineTo(el.x + el.width, el.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        else if (el.type === "block") {
            // Square solid block
            ctx.fillStyle = "rgba(22, 18, 45, 0.85)";
            ctx.strokeStyle = "#00f0ff";
            ctx.lineWidth = 3;
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 8;
            
            // Draw block body
            ctx.fillRect(el.x, el.y, el.width, el.height);
            ctx.strokeRect(el.x, el.y, el.width, el.height);
            
            // X decorative lines in block center
            ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(el.x + 5, el.y + 5);
            ctx.lineTo(el.x + el.width - 5, el.y + el.height - 5);
            ctx.moveTo(el.x + el.width - 5, el.y + 5);
            ctx.lineTo(el.x + 5, el.y + el.height - 5);
            ctx.stroke();
        } 
        else if (el.type === "orb") {
            // Glowing Jump Orb
            const cx = el.x + el.width/2;
            const cy = el.y + el.height/2;
            const r = el.width/2;
            
            ctx.shadowColor = "#ffe600";
            ctx.shadowBlur = 15 + backgroundPulse * 12;
            ctx.strokeStyle = "#ffe600";
            ctx.lineWidth = 3;
            
            // Pulsing ring
            const pulseRadius = r + Math.sin(Date.now() * 0.015) * 4;
            ctx.beginPath();
            ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Center core
            ctx.fillStyle = "rgba(255, 230, 0, 0.4)";
            ctx.beginPath();
            ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
            ctx.fill();
        } 
        else if (el.type === "pad") {
            // Ground Jump Pad
            ctx.fillStyle = "#ffe600";
            ctx.shadowColor = "#ffe600";
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            ctx.roundRect(el.x, el.y, el.width, el.height, [6, 6, 0, 0]);
            ctx.fill();
            
            // Glowing upward arrow inside pad
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(el.x + el.width/2, el.y + el.height - 3);
            ctx.lineTo(el.x + el.width/2, el.y + 3);
            ctx.moveTo(el.x + el.width/2 - 6, el.y + 8);
            ctx.lineTo(el.x + el.width/2, el.y + 3);
            ctx.lineTo(el.x + el.width/2 + 6, el.y + 8);
            ctx.stroke();
        } 
        else if (el.type === "portal_ship") {
            // Ship Portal (Vertical arch pink color)
            drawPortalArch(el, "#ff007f", "rgba(255, 0, 127, 0.35)");
        } 
        else if (el.type === "portal_cube") {
            // Cube Portal (Vertical arch cyan color)
            drawPortalArch(el, "#00f0ff", "rgba(0, 240, 255, 0.35)");
        } 
        else if (el.type === "speed_boost") {
            // Speed boost chevron arrows on ground
            ctx.fillStyle = currentThemeColor;
            ctx.shadowColor = currentThemeColor;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.roundRect(el.x, el.y, el.width, el.height, 4);
            ctx.fill();
        }
        else if (el.type === "finish") {
            // Large victory neon gate
            ctx.strokeStyle = "#00f0ff";
            ctx.lineWidth = 8;
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 25;
            
            ctx.beginPath();
            ctx.moveTo(el.x, el.y);
            ctx.lineTo(el.x, el.y + el.height);
            ctx.stroke();
            
            // Glowing check pattern in the background gate
            ctx.fillStyle = "rgba(0, 240, 255, 0.08)";
            ctx.fillRect(el.x, el.y, el.width, el.height);
            
            ctx.fillStyle = "#00f0ff";
            ctx.font = "bold 20px 'Space Grotesk'";
            ctx.fillText("FINISH", el.x + 10, el.y + el.height/2);
        }
        
        ctx.restore();
    }
}

function drawPortalArch(portal, borderHex, fillHex) {
    const cx = portal.x + portal.width/2;
    const cy = portal.y + portal.height/2;
    
    ctx.shadowColor = borderHex;
    ctx.shadowBlur = 18 + backgroundPulse * 10;
    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 5;
    
    // Arch path
    ctx.beginPath();
    ctx.roundRect(portal.x, portal.y, portal.width, portal.height, 30);
    ctx.stroke();
    
    // Swirling inside core
    ctx.fillStyle = fillHex;
    ctx.beginPath();
    ctx.ellipse(cx, cy, portal.width/3, portal.height/2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Portal label tags
    ctx.fillStyle = borderHex;
    ctx.font = "bold 13px 'Space Grotesk'";
    ctx.textAlign = "center";
    ctx.fillText(portal.type === "portal_ship" ? "SHIP" : "CUBE", cx, portal.y - 12);
}

function drawParticles() {
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        
        if (p.type === "ring") {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            
            // Draw particle square or circles
            if (p.spin) {
                // Spinning block particles
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size/2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}

function drawVisualizerHUD() {
    // We render visualizer peaks as glowing bars overlaying screen left/right bounds
    const numBars = 16;
    const barHeight = 8;
    const padding = 6;
    
    ctx.save();
    
    for (let i = 0; i < numBars; i++) {
        // Scale peak data smoothly
        const val = visualizerPeaks[i % visualizerPeaks.length] || 0;
        const width = 15 + val * 160;
        
        ctx.fillStyle = `hsla(${(currentBgHue - 40 + i * 8) % 360}, 100%, 50%, 0.45)`;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        
        // Draw Left Equalizer Bar
        ctx.fillRect(0, 140 + i * (barHeight + padding), width, barHeight);
        
        // Draw Right Equalizer Bar
        ctx.fillRect(CANVAS_WIDTH - width, 140 + i * (barHeight + padding), width, barHeight);
    }
    
    ctx.restore();
}

// Reset state
function resetGame() {
    gameState = "MENU";
    attemptCount = 0;
    levelProgress = 0;
    spikesCleared = 0;
    particles = [];
}
