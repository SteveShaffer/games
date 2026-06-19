/* AquaSynth: Sonar Shield Game Engine */

// Instantiate Synthesizer
const synth = new AquaSynth();

// Game State variables
let gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    multiplier: 1,
    shields: 100,
    playMode: 'endless', // 'melody', 'endless', 'chord'
    currentSong: 'odeToJoy',
    songNoteIndex: 0,
    songTempoTimer: 0,
    lastSpawnTime: 0,
    spawnInterval: 2000, // ms between spawns
    difficultyMultiplier: 1.0,
    threats: [],
    particles: [],
    sonarBlasts: [], // active visual laser blasts
    midiOffset: 0, // dynamic transpose offset
    lastActiveMidiNote: null,
    highScores: {
        melody: 0,
        endless: 0,
        chord: 0
    }
};

// Key mappings for computer keyboard
const KEY_MAP = {
    // Lower Octave (C3 - B3)
    'KeyZ': 48,  // C3
    'KeyS': 49,  // C#3
    'KeyX': 50,  // D3
    'KeyD': 51,  // D#3
    'KeyC': 52,  // E3
    'KeyV': 53,  // F3
    'KeyG': 54,  // F#3
    'KeyB': 55,  // G3
    'KeyH': 56,  // G#3
    'KeyN': 57,  // A3
    'KeyJ': 58,  // A#3
    'KeyM': 59,  // B3
    // Upper Octave (C4 - C5)
    'KeyQ': 60,  // C4 (Middle C)
    'Digit2': 61, // C#4
    'KeyW': 62,  // D4
    'Digit3': 63, // D#4
    'KeyE': 64,  // E4
    'KeyR': 65,  // F4
    'Digit5': 66, // F#4
    'KeyT': 67,  // G4
    'Digit6': 68, // G#4
    'KeyY': 69,  // A4
    'Digit7': 70, // A#4
    'KeyU': 71,  // B4
    'KeyI': 72   // C5
};

// Reverse map for lighting up keys from MIDI/synth trigger
const NOTE_TO_KEY_ID = {};
for (const code in KEY_MAP) {
    NOTE_TO_KEY_ID[KEY_MAP[code]] = `key-${KEY_MAP[code]}`;
}

// Track computer keys currently held down to prevent browser repeat triggers
const pressedComputerKeys = new Set();

// Scale definitions for Endless mode
const PENTATONIC_SCALE = [48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72]; // C Major Pentatonic

// Predefined Melodies for Training
const MELODIES = {
    odeToJoy: {
        name: "Beethoven - Ode to Joy",
        difficulty: "Easy",
        tempo: 125, // BPM
        notes: [
            64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62,
            64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60,
            62, 62, 64, 60, 62, 64, 65, 64, 60, 62, 64, 65, 64, 62, 60, 62, 48,
            64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60
        ]
    },
    minuetG: {
        name: "Bach - Minuet in G",
        difficulty: "Medium",
        tempo: 105,
        notes: [
            67, 60, 62, 64, 65, 67, 60, 60, 69, 65, 67, 69, 71, 72, 60, 60,
            67, 60, 62, 64, 65, 67, 60, 60, 69, 65, 67, 69, 71, 72, 60, 60,
            69, 69, 71, 67, 69, 67, 65, 64, 62, 64, 65, 67, 69, 67, 60, 60
        ]
    },
    underSea: {
        name: "Subsea Shanty Theme",
        difficulty: "Medium",
        tempo: 140,
        notes: [
            48, 52, 55, 60, 64, 67, 72, 67, 64, 60, 55, 52, 48,
            50, 53, 57, 62, 65, 69, 65, 62, 57, 53, 50,
            52, 55, 59, 64, 67, 71, 67, 64, 59, 55, 52,
            53, 57, 60, 65, 69, 72, 69, 65, 60, 57, 53,
            55, 59, 62, 67, 71, 74, 71, 67, 62, 59, 55
        ]
    },
    synthwave: {
        name: "Synthwave Ride",
        difficulty: "Hard",
        tempo: 130,
        notes: [
            60, 63, 67, 70, 72, 70, 67, 63,
            58, 62, 65, 68, 70, 68, 65, 62,
            56, 60, 63, 67, 68, 67, 63, 60,
            58, 62, 65, 68, 70, 68, 65, 62,
            60, 60, 72, 72, 67, 67, 63, 63,
            58, 58, 70, 70, 65, 65, 62, 62,
            56, 56, 68, 68, 63, 63, 60, 60,
            55, 55, 67, 67, 62, 62, 59, 59
        ]
    }
};

// Chords list for Chord Storm mode
const CHORDS = [
    { name: "C Major", notes: [48, 52, 55] },
    { name: "A Minor", notes: [45, 48, 52] },
    { name: "F Major", notes: [41, 45, 48] },
    { name: "G Major", notes: [43, 47, 50] },
    { name: "D Minor", notes: [44, 48, 51] },
    { name: "E Minor", notes: [40, 43, 47] }
];

// Visual Settings for Canvas
let canvas, ctx;
let targetY; // Sonar Threshold target line Y
let laneWidth;
let pitchBendWarp = 0; // Pitch bend radial wobble offset
let modWheelGlow = 0;  // Mod wheel brightness override

// Load High Scores from LocalStorage
function loadHighScores() {
    const saved = localStorage.getItem('aquasynth_high_scores');
    if (saved) {
        try {
            gameState.highScores = JSON.parse(saved);
        } catch(e) {
            console.error("Failed to parse high scores", e);
        }
    }
}

// Save High Scores
function saveHighScore() {
    const currentMode = gameState.playMode;
    if (gameState.score > gameState.highScores[currentMode]) {
        gameState.highScores[currentMode] = gameState.score;
        localStorage.setItem('aquasynth_high_scores', JSON.stringify(gameState.highScores));
        logTerminal(`[SYSTEM] NEW HIGH SCORE FOR ${currentMode.toUpperCase()}: ${gameState.score}!`, "success");
    }
}

// Print lines into System Diagnostics Console
function logTerminal(message, type = "info") {
    const logBox = document.getElementById('terminal-logs');
    if (!logBox) return;

    const line = document.createElement('div');
    line.className = `log-line`;

    const now = new Date();
    const timeStr = `[${now.toTimeString().split(' ')[0]}]`;

    line.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-prefix">&gt;</span>
        <span class="log-${type}">${message}</span>
    `;

    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;

    // Limit log lines to 100 to save memory
    while (logBox.children.length > 100) {
        logBox.removeChild(logBox.firstChild);
    }
}

// Initialize Web MIDI API
function initMIDI() {
    const midiSelector = document.getElementById('select-midi-device');
    
    if (!navigator.requestMIDIAccess) {
        logTerminal("Web MIDI API not supported in this browser. Falling back to computer keys.", "warning");
        midiSelector.innerHTML = '<option>Not Supported (Fallback Active)</option>';
        return;
    }

    navigator.requestMIDIAccess()
        .then(midiAccess => {
            logTerminal("Web MIDI Access granted successfully.", "success");
            
            function updateMidiDevices() {
                const inputs = midiAccess.inputs.values();
                midiSelector.innerHTML = '';
                
                let count = 0;
                for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
                    count++;
                    const opt = document.createElement('option');
                    opt.value = input.value.id;
                    opt.text = `${input.value.name} (${input.value.manufacturer || 'USB'})`;
                    midiSelector.appendChild(opt);
                    
                    // Bind messages
                    input.value.onmidimessage = handleMidiMessage;
                    logTerminal(`Connected MIDI Input: ${input.value.name}`, "success");
                }
                
                if (count === 0) {
                    midiSelector.innerHTML = '<option>No MIDI devices detected</option>';
                    logTerminal("No physical MIDI devices detected. Awaiting USB connection...", "info");
                } else {
                    midiSelector.disabled = false;
                }
            }
            
            updateMidiDevices();
            midiAccess.onstatechange = (e) => {
                logTerminal(`MIDI Port Connection Status Change: ${e.port.name} is now ${e.port.state}`, "info");
                updateMidiDevices();
            };
        })
        .catch(err => {
            logTerminal(`Web MIDI Access denied: ${err}`, "error");
            midiSelector.innerHTML = '<option>Access Denied</option>';
        });
}

// Handle incoming MIDI messages
function handleMidiMessage(event) {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0];
    const type = status & 0xf0;
    const channel = status & 0x0f;
    const note = data[1];
    const velocity = data[2];

    switch(type) {
        case 0x90: // Note On
            if (velocity > 0) {
                handleNoteOn(note, velocity, "MIDI");
            } else {
                handleNoteOff(note);
            }
            break;
        case 0x80: // Note Off
            handleNoteOff(note);
            break;
        case 0xE0: // Pitch Bend
            // 14-bit value from 0 to 16383, centered at 8192
            const bendValue = ((data[2] << 7) + data[1]) - 8192;
            synth.setPitchBend(bendValue);
            pitchBendWarp = bendValue / 8192; // normalize -1..1
            
            // Log occasionally to prevent spam
            if (Math.abs(bendValue) > 100 && Math.random() < 0.15) {
                const cents = Math.round((bendValue / 8192) * 200);
                logTerminal(`[MIDI] Pitch Bend: ${cents > 0 ? '+' : ''}${cents} cents`, "info");
            }
            break;
        case 0xB0: // Control Change (CC)
            const ccNum = data[1];
            const ccVal = data[2];
            
            if (ccNum === 1) { // Modulation Wheel
                synth.setModulation(ccVal);
                modWheelGlow = ccVal / 127; // normalize 0..1
                
                if (Math.random() < 0.15) {
                    logTerminal(`[MIDI] Modulation CC#01: ${ccVal} / 127`, "info");
                }
            }
            break;
    }
}

// Translate MIDI note numbers to note names (e.g. 60 -> C4)
function getNoteName(noteNumber) {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(noteNumber / 12) - 1;
    const name = names[noteNumber % 12];
    return `${name}${octave}`;
}

// Convert MIDI note into relative 25-key column index (0-24)
function getLaneIndexForNote(note) {
    // Standard keyboard maps from C3 (48) to C5 (72)
    // Map dynamically based on active transposition offset
    const baseNote = 48 + gameState.midiOffset;
    
    // Check if the played note falls within the active 2-octave range
    if (note >= baseNote && note <= baseNote + 24) {
        return note - baseNote;
    }
    
    // Auto-transposition logic: if played note is outside, auto-transpose octaves!
    if (note >= 24 && note <= 108) {
        const octaveDiff = Math.floor((note - 48) / 12) * 12;
        gameState.midiOffset = octaveDiff;
        
        logTerminal(`[SYSTEM] Auto-transposing keyboard range to C${3 + octaveDiff/12} (MIDI notes ${48+octaveDiff}-${72+octaveDiff})`, "info");
        document.getElementById('transposition-display').innerText = `TRANSPOSITION: OCTAVE C${3 + octaveDiff/12}`;
        
        // Update key note labels in UI
        const keys = document.querySelectorAll('.key');
        keys.forEach(k => {
            const defaultNote = parseInt(k.getAttribute('data-note'));
            const transposedNote = defaultNote + octaveDiff;
            // Find key-note element inside key
            const noteTextNode = k.querySelector('.key-note');
            if (noteTextNode) {
                noteTextNode.innerText = getNoteName(transposedNote);
            }
        });

        // Try mapping again now that transposition offset is adjusted
        return note - (48 + octaveDiff);
    }
    
    // Fallback modulo mapping if extremely high/low notes are played
    return note % 25;
}

// Trigger Note On (sound, key visual, threat check)
function handleNoteOn(note, velocity = 100, source = "Key") {
    // Trigger synthesizer
    synth.noteOn(note, velocity);

    // Visual feedback on key
    const laneIdx = getLaneIndexForNote(note);
    const baseNote = 48 + gameState.midiOffset;
    const mappedNote = baseNote + laneIdx;
    
    // Find visual key elements
    const keyElement = document.getElementById(`key-${mappedNote - gameState.midiOffset + 48}`);
    if (keyElement) {
        keyElement.classList.add('active');
    }

    // Log note event in diagnostics
    logTerminal(`[${source}] Note ON: ${getNoteName(mappedNote)} (${note}) | Vel: ${velocity}`, "info");

    // Launch visual sonar blast up the lane
    createSonarBlast(laneIdx);

    // Check collision with falling threats in this lane
    if (gameState.isRunning) {
        checkThreatHit(laneIdx, mappedNote, velocity);
    }
}

// Trigger Note Off (release sound, key visual reset)
function handleNoteOff(note) {
    synth.noteOff(note);

    const laneIdx = getLaneIndexForNote(note);
    const baseNote = 48 + gameState.midiOffset;
    const mappedNote = baseNote + laneIdx;

    const keyElement = document.getElementById(`key-${mappedNote - gameState.midiOffset + 48}`);
    if (keyElement) {
        keyElement.classList.remove('active');
    }
}

// Create Sonar Laser Blast Visual
function createSonarBlast(laneIdx) {
    gameState.sonarBlasts.push({
        lane: laneIdx,
        opacity: 0.8,
        width: 15
    });
}

// Check if note hit a threat in the target window
function checkThreatHit(laneIdx, noteValue, velocity) {
    let hitFound = false;

    // Filter threats by lane
    for (let i = gameState.threats.length - 1; i >= 0; i--) {
        const t = gameState.threats[i];
        if (t.lane === laneIdx) {
            // Target zone boundary checks
            const dist = Math.abs(t.y - targetY);
            
            if (dist < 45) { // Hit window (approx +/- 45px)
                hitFound = true;
                
                // Calculate rating based on distance
                let rating = "GOOD";
                let points = 50;
                let ratingColor = varColor('cyan');
                
                if (dist < 15) {
                    rating = "PERFECT";
                    points = 100;
                    ratingColor = varColor('green');
                    gameState.multiplier = Math.min(10, gameState.multiplier + 1);
                } else {
                    gameState.multiplier = Math.max(1, Math.floor(gameState.multiplier * 0.5));
                }

                // Add points
                const totalPoints = points * gameState.multiplier;
                gameState.score += totalPoints;
                updateHUD();

                // Spawn score text popup
                spawnRatingText(t.lane, t.y, `${rating} +${totalPoints}`, ratingColor);

                // Spawn explosion particles
                spawnExplosion(t.lane, t.y, velocity);

                // Remove threat
                gameState.threats.splice(i, 1);
                logTerminal(`Sonar lock zapped threat: ${t.label}! Hit Rating: ${rating}`, "success");

                // If in melody mode, advance song
                if (gameState.playMode === 'melody') {
                    advanceMelodySong();
                }

                break; // only hit one threat per keystroke
            }
        }
    }

    if (!hitFound && gameState.playMode !== 'melody') {
        // Penalty for button mashing (loses multiplier)
        gameState.multiplier = 1;
        updateHUD();
    }
}

// Utility to retrieve CSS variable color hexes
function varColor(name) {
    switch(name) {
        case 'cyan': return '#00f2fe';
        case 'purple': return '#b927fc';
        case 'green': return '#00ff87';
        case 'red': return '#ff007f';
        default: return '#ffffff';
    }
}

// Spawn visual evaluation ratings above target line
function spawnRatingText(laneIdx, y, text, color) {
    const x = laneIdx * laneWidth + laneWidth / 2;
    gameState.particles.push({
        x: x,
        y: y,
        vx: 0,
        vy: -1.2,
        alpha: 1.0,
        text: text,
        color: color,
        life: 50,
        isText: true
    });
}

// Spawn bubble explosion particles
function spawnExplosion(laneIdx, y, velocity) {
    const x = laneIdx * laneWidth + laneWidth / 2;
    // Map note velocity to particle density (harder hits = bigger bursts!)
    const particleCount = Math.floor((velocity / 127) * 15) + 8;
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        
        gameState.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5, // drift upwards slightly
            size: Math.random() * 4 + 2,
            alpha: 1.0,
            color: gameState.playMode === 'chord' ? varColor('purple') : varColor('cyan'),
            life: Math.random() * 20 + 20,
            isText: false
        });
    }
}

// Handle UI element changes
function bindUIControls() {
    // Mode Selects
    const modeSelect = document.getElementById('select-play-mode');
    const songSelectGroup = document.getElementById('song-select-group');
    const songSelect = document.getElementById('select-song');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayDesc = document.getElementById('overlay-desc');
    const songCard = document.getElementById('song-info-card');

    modeSelect.addEventListener('change', (e) => {
        gameState.playMode = e.target.value;
        logTerminal(`[SYSTEM] Switched system operation to: ${gameState.playMode.toUpperCase()}`, "info");

        if (gameState.playMode === 'melody') {
            songSelectGroup.style.display = 'flex';
            songCard.style.display = 'block';
            updateSongInfo();
            overlayTitle.innerText = "Melody Mode";
            overlayDesc.innerText = "Learn melodies by hitting notes as they cross the sonar threshold. Perfect for training fingers.";
        } else {
            songSelectGroup.style.display = 'none';
            songCard.style.display = 'none';
            if (gameState.playMode === 'endless') {
                overlayTitle.innerText = "Endless Mode";
                overlayDesc.innerText = "Defend against randomly spawning threat frequencies. Locked to C major Pentatonic scale so whatever you play sounds great!";
            } else {
                overlayTitle.innerText = "Chord Storm";
                overlayDesc.innerText = "Ultimate challenge: Bio-luminescent clusters descend. Press 3 keys at the same time to match the chord and wipe them out!";
            }
        }
        resetGame();
    });

    songSelect.addEventListener('change', (e) => {
        gameState.currentSong = e.target.value;
        updateSongInfo();
        resetGame();
    });

    function updateSongInfo() {
        const song = MELODIES[gameState.currentSong];
        document.getElementById('song-info-name').innerText = song.name;
        document.getElementById('song-info-difficulty').innerText = `Difficulty: ${song.difficulty} (Tempo: ${song.tempo} BPM)`;
    }

    // Waveform buttons selection
    const waveButtons = document.querySelectorAll('.wave-btn');
    waveButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            waveButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const wave = btn.getAttribute('data-wave');
            synth.setWaveform(wave);
            logTerminal(`[SYNTH] Waveform output set to: ${wave.toUpperCase()}`, "info");
        });
    });

    // Slider inputs
    function bindSlider(id, targetSetting, displayId, multiplier = 1, suffix = '') {
        const slider = document.getElementById(id);
        const display = document.getElementById(displayId);
        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            synth.settings[targetSetting] = val;
            display.innerText = `${(val * multiplier).toFixed(multiplier === 1 ? 2 : 0)}${suffix}`;
        });
    }

    bindSlider('slider-attack', 'attack', 'val-attack', 1, 's');
    bindSlider('slider-decay', 'decay', 'val-decay', 1, 's');
    bindSlider('slider-sustain', 'sustain', 'val-sustain', 100, '%');
    bindSlider('slider-release', 'release', 'val-release', 1, 's');

    bindSlider('slider-cutoff', 'filterCutoff', 'val-cutoff', 1, 'Hz');
    bindSlider('slider-q', 'filterQ', 'val-q', 1, '');
    bindSlider('slider-envamt', 'filterEnvAmt', 'val-envamt', 1, 'Hz');

    // Echo Sliders
    document.getElementById('slider-delayfb').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        synth.setDelayFeedback(val);
        document.getElementById('val-delayfb').innerText = `${Math.round(val * 100)}%`;
    });

    document.getElementById('slider-delaytime').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        synth.setDelayTime(val / 1000);
        document.getElementById('val-delaytime').innerText = `${val}ms`;
    });

    // Volume Slider
    document.getElementById('slider-volume').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        synth.setVolume(val / 100);
        document.getElementById('val-volume').innerText = `${val}%`;
    });

    // Start / Restart button action
    const startBtn = document.getElementById('btn-start-game');
    startBtn.addEventListener('click', () => {
        synth.init(); // ensure Web Audio Context starts
        
        if (!gameState.isRunning) {
            startGame();
        } else if (gameState.isPaused) {
            resumeGame();
        } else {
            resetGame();
        }
    });

    // Setup clicks on on-screen visual keys (mouse fallback)
    const onScreenKeys = document.querySelectorAll('.key');
    onScreenKeys.forEach(k => {
        const defaultNote = parseInt(k.getAttribute('data-note'));
        
        // Touch/Mouse trigger noteOn
        const onStart = (e) => {
            e.preventDefault();
            const targetNote = defaultNote + gameState.midiOffset;
            handleNoteOn(targetNote, 100, "Touch");
        };

        const onEnd = (e) => {
            e.preventDefault();
            const targetNote = defaultNote + gameState.midiOffset;
            handleNoteOff(targetNote);
        };

        k.addEventListener('mousedown', onStart);
        k.addEventListener('mouseup', onEnd);
        k.addEventListener('mouseleave', onEnd);

        k.addEventListener('touchstart', onStart, {passive: false});
        k.addEventListener('touchend', onEnd, {passive: false});
    });
}

// Bind Computer Keyboard Events
function bindKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
        // Ignore inputs into text fields if we ever add them
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        
        const note = KEY_MAP[e.code];
        if (note && !pressedComputerKeys.has(e.code)) {
            pressedComputerKeys.add(e.code);
            
            // Apply octave transpose offset if we are playing fallback keys
            const transposedNote = note + gameState.midiOffset;
            handleNoteOn(transposedNote, 95, "Keyboard");
        }

        // Spacebar to pause
        if (e.code === 'Space' && gameState.isRunning) {
            e.preventDefault();
            togglePause();
        }
    });

    window.addEventListener('keyup', (e) => {
        const note = KEY_MAP[e.code];
        if (note) {
            pressedComputerKeys.delete(e.code);
            const transposedNote = note + gameState.midiOffset;
            handleNoteOff(transposedNote);
        }
    });
}

// Setup Canvas click listener for direct mobile touch fallback
function bindCanvasTouches() {
    const handleCanvasClick = (e) => {
        if (!gameState.isRunning || gameState.isPaused) return;

        const rect = canvas.getBoundingClientRect();
        
        // Handle touch points vs mouse clicks
        const xVal = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : null);
        const yVal = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);
        
        if (xVal === null || yVal === null) return;

        // Convert page coordinates to relative canvas scale
        const relativeX = ((xVal - rect.left) / rect.width) * canvas.width;
        const relativeY = ((yVal - rect.top) / rect.height) * canvas.height;

        // Try zapping the threat tapped directly
        let tappedThreat = null;
        
        for (let i = gameState.threats.length - 1; i >= 0; i--) {
            const t = gameState.threats[i];
            const threatX = t.lane * laneWidth + laneWidth / 2;
            const threatY = t.y;
            
            // Check bounding radius (approx 45px tap radius)
            const dx = relativeX - threatX;
            const dy = relativeY - threatY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 45) {
                tappedThreat = t;
                break;
            }
        }

        if (tappedThreat) {
            logTerminal(`[TOUCH] Direct tap on threat detected in lane ${tappedThreat.lane + 1}!`, "info");
            // Simulate playing the corresponding note
            const baseNote = 48 + gameState.midiOffset;
            const targetNote = baseNote + tappedThreat.lane;
            
            handleNoteOn(targetNote, 110, "TouchDirect");
            setTimeout(() => {
                handleNoteOff(targetNote);
            }, 150);
        }
    };

    canvas.addEventListener('mousedown', handleCanvasClick);
    canvas.addEventListener('touchstart', (e) => {
        handleCanvasClick(e);
        e.preventDefault(); // prevent double clicking simulation on touch screens
    }, {passive: false});
}

// Start Game Play Loop
function startGame() {
    gameState.isRunning = true;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.multiplier = 1;
    gameState.shields = 100;
    gameState.threats = [];
    gameState.particles = [];
    gameState.songNoteIndex = 0;
    gameState.lastSpawnTime = Date.now();
    gameState.difficultyMultiplier = 1.0;
    
    updateHUD();
    
    // Hide overlay screen
    document.getElementById('overlay-screen').style.display = 'none';
    document.getElementById('btn-start-game').innerText = "RESTART SONAR";
    
    logTerminal(`[SYSTEM] SONAR SHIELD ENGAGED. Threat mode: ${gameState.playMode.toUpperCase()}`, "success");
    if (gameState.playMode === 'melody') {
        const song = MELODIES[gameState.currentSong];
        logTerminal(`[TRAINER] Training started for: ${song.name}`, "info");
    }
}

// Pause Game Loop
function togglePause() {
    if (!gameState.isRunning) return;

    if (gameState.isPaused) {
        resumeGame();
    } else {
        gameState.isPaused = true;
        document.getElementById('overlay-screen').style.display = 'flex';
        document.getElementById('overlay-title').innerText = "SYSTEM PAUSED";
        document.getElementById('overlay-desc').innerText = "Sonar arrays temporarily suspended. Press Space or button to reactivate shield sweeps.";
        document.getElementById('btn-start-game').innerText = "RESUME SONAR";
        logTerminal("[SYSTEM] Sonar shield operations paused.", "warning");
    }
}

function resumeGame() {
    gameState.isPaused = false;
    document.getElementById('overlay-screen').style.display = 'none';
    document.getElementById('btn-start-game').innerText = "RESTART SONAR";
    logTerminal("[SYSTEM] Sonar shield operations resumed.", "success");
}

// Reset Game State
function resetGame() {
    gameState.isRunning = false;
    gameState.isPaused = false;
    gameState.threats = [];
    gameState.particles = [];
    gameState.score = 0;
    gameState.shields = 100;
    gameState.multiplier = 1;
    updateHUD();
    
    document.getElementById('overlay-screen').style.display = 'flex';
    document.getElementById('btn-start-game').innerText = "INITIALIZE SYSTEM";
    
    // Set appropriate text
    const modeSelect = document.getElementById('select-play-mode');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayDesc = document.getElementById('overlay-desc');
    
    if (gameState.playMode === 'melody') {
        overlayTitle.innerText = "Melody Mode";
        overlayDesc.innerText = "Learn melodies by hitting notes as they cross the sonar threshold. Perfect for training fingers.";
    } else if (gameState.playMode === 'endless') {
        overlayTitle.innerText = "Endless Mode";
        overlayDesc.innerText = "Defend against randomly spawning threat frequencies. Locked to C major Pentatonic scale so whatever you play sounds great!";
    } else {
        overlayTitle.innerText = "Chord Storm";
        overlayDesc.innerText = "Ultimate challenge: Bio-luminescent clusters descend. Press 3 keys at the same time to match the chord and wipe them out!";
    }
    
    logTerminal("[SYSTEM] Sonar diagnostics reset. Ready to initialize.", "info");
}

// Trigger Game Over
function triggerGameOver() {
    gameState.isRunning = false;
    
    saveHighScore();
    
    const overlay = document.getElementById('overlay-screen');
    overlay.style.display = 'flex';
    document.getElementById('overlay-title').innerText = "HULL BREACHED";
    document.getElementById('overlay-title').className = "overlay-title purple";
    
    document.getElementById('overlay-desc').innerHTML = `
        <div style="font-size: 1.1rem; color: #fff; margin-bottom: 8px;">FINAL SCORE: ${gameState.score.toLocaleString()}</div>
        All shields depleted. Submarine sonar array was overwhelmed by subsea threats.
    `;
    
    document.getElementById('btn-start-game').innerText = "REINITIALIZE SYSTEM";
    logTerminal(`[HULL CRITICAL] Shield systems offline! Breach occurred. Final score: ${gameState.score}`, "error");
}

// Update Scores & Shields in HUD UI
function updateHUD() {
    document.getElementById('score-display').innerText = gameState.score.toLocaleString('en-US', { minimumIntegerDigits: 6, useGrouping: true });
    
    const shieldFill = document.getElementById('shield-bar');
    if (shieldFill) {
        shieldFill.style.width = `${gameState.shields}%`;
        
        // Color shifts based on health status
        shieldFill.className = 'shield-bar-fill';
        if (gameState.shields <= 25) {
            shieldFill.classList.add('danger');
        } else if (gameState.shields <= 50) {
            shieldFill.classList.add('warning');
        }
    }
}

// Sequencer: Advance song notes in Melody Trainer
function advanceMelodySong() {
    gameState.songNoteIndex++;
    const song = MELODIES[gameState.currentSong];
    
    if (gameState.songNoteIndex >= song.notes.length) {
        // Song Completed!
        logTerminal(`[CONGRATULATIONS] You successfully completed: ${song.name}!`, "success");
        gameState.score += 5000; // completion bonus
        gameState.songNoteIndex = 0; // loop
        updateHUD();
    }
}

// Spawn biological creatures (threats)
function spawnThreat() {
    if (!gameState.isRunning || gameState.isPaused) return;

    // Endless mode spawns
    if (gameState.playMode === 'endless') {
        const lane = Math.floor(Math.random() * 25);
        const baseNote = 48 + gameState.midiOffset;
        const note = baseNote + lane;
        
        // Threat speeds scale slowly with score (boosted for spacing)
        const speed = Math.random() * 1.5 + 3.2 + (gameState.score / 10000);
        
        const types = ['jellyfish', 'mine', 'eel'];
        const type = types[Math.floor(Math.random() * types.length)];

        gameState.threats.push({
            lane: lane,
            note: note,
            y: -30,
            speed: speed,
            type: type,
            pulse: Math.random() * 100,
            label: getNoteName(note)
        });
    }
    
    // Chord storm spawns
    else if (gameState.playMode === 'chord') {
        const chord = CHORDS[Math.floor(Math.random() * CHORDS.length)];
        
        logTerminal(`[CHORD DETECTED] Incoming cluster: ${chord.name}!`, "warning");

        // Spawn multiple threats representing the chord
        chord.notes.forEach(noteOffset => {
            const note = noteOffset + gameState.midiOffset;
            const lane = getLaneIndexForNote(note);
            
            gameState.threats.push({
                lane: lane,
                note: note,
                y: -30,
                speed: 2.8 + (gameState.score / 15000), // uniform faster speed for chords (boosted)
                type: 'mine', // mines representation for cluster
                pulse: 0,
                label: getNoteName(note)
            });
        });
    }
}

// Melody Mode note spawner based on song ticks
function tickMelodySpawner() {
    if (!gameState.isRunning || gameState.isPaused || gameState.playMode !== 'melody') return;

    const song = MELODIES[gameState.currentSong];
    const ticksPerMinute = song.tempo * 2; // spawn a note every 8th note
    const spawnTimerInterval = (60000 / ticksPerMinute); // in milliseconds

    const now = Date.now();
    if (now - gameState.songTempoTimer > spawnTimerInterval) {
        gameState.songTempoTimer = now;
        
        // Spawn active song note at next index
        const totalSongNotes = song.notes.length;
        // Determine index of note to spawn
        // We look ahead slightly so notes travel to target line
        const lookAheadIndex = (gameState.songNoteIndex + gameState.threats.length) % totalSongNotes;
        const note = song.notes[lookAheadIndex];
        
        const lane = getLaneIndexForNote(note);
        
        gameState.threats.push({
            lane: lane,
            note: note,
            y: -30,
            speed: 4.8, // fixed speed so timing remains rhythmic (boosted for spacing)
            type: 'jellyfish',
            pulse: 0,
            label: getNoteName(note)
        });
    }
}

// Update game loop physics (threat positions, collisions, particle counts)
function updateGame() {
    const now = Date.now();
    
    // Endless/Chord Mode spawning timer
    if (gameState.playMode !== 'melody') {
        // dynamic intervals scaling down as score increases
        const interval = Math.max(800, gameState.spawnInterval - (gameState.score / 10));
        if (now - gameState.lastSpawnTime > interval) {
            gameState.lastSpawnTime = now;
            spawnThreat();
        }
    } else {
        // Melody mode rhythmic ticker
        tickMelodySpawner();
    }

    // Update threats
    for (let i = gameState.threats.length - 1; i >= 0; i--) {
        const t = gameState.threats[i];
        t.y += t.speed;
        t.pulse += 0.08;

        // Check if threat crossed the submarine hull bottom threshold
        if (t.y > canvas.height - 35) {
            // Deduct shields
            const damage = gameState.playMode === 'chord' ? 10 : 15;
            gameState.shields = Math.max(0, gameState.shields - damage);
            gameState.multiplier = 1;
            updateHUD();

            logTerminal(`[HULL WARNING] Sonar missed threat frequency! Shield damage: -${damage}`, "warning");
            
            // Spark warning particle bursts
            spawnExplosion(t.lane, canvas.height - 40, 50);

            // Remove threat
            gameState.threats.splice(i, 1);

            if (gameState.shields <= 0) {
                triggerGameOver();
            }
        }
    }

    // Update sonar beam laser blasts fading out
    for (let i = gameState.sonarBlasts.length - 1; i >= 0; i--) {
        const sb = gameState.sonarBlasts[i];
        sb.opacity -= 0.08;
        sb.width *= 0.9;
        if (sb.opacity <= 0) {
            gameState.sonarBlasts.splice(i, 1);
        }
    }

    // Update floating particles
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const p = gameState.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / 50;

        if (p.life <= 0) {
            gameState.particles.splice(i, 1);
        }
    }
}

// Canvas rendering calls
function drawGame() {
    if (!ctx) return;

    // Clear Canvas
    ctx.fillStyle = '#020713';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Pitch Bend screen wobbly warp effect
    const warpOffset = Math.sin(Date.now() * 0.05) * pitchBendWarp * 12;

    // Draw lane backgrounds first
    const blackKeyLanes = [1, 3, 6, 8, 10, 13, 15, 18, 20, 22];
    for (let i = 0; i < 25; i++) {
        const x = i * laneWidth + warpOffset;
        const isBlackKey = blackKeyLanes.includes(i);
        
        // Base lane background color (High contrast white vs black lanes)
        if (isBlackKey) {
            ctx.fillStyle = 'rgba(2, 6, 17, 0.85)'; // solid deep dark navy/indigo background for black keys
        } else {
            ctx.fillStyle = 'rgba(0, 242, 254, 0.04)'; // visible glowing cyan tint for white keys
        }
        
        // Highlight lane if active note is pressed (Much stronger glow)
        const baseNote = 48 + gameState.midiOffset;
        const note = baseNote + i;
        if (synth.activeVoices[note]) {
            ctx.fillStyle = isBlackKey ? 'rgba(185, 39, 252, 0.28)' : 'rgba(0, 242, 254, 0.22)';
        }
        
        ctx.fillRect(x, 0, laneWidth, canvas.height);
    }

    // Draw grid lanes (25 lanes) with color-coded dividers
    for (let i = 1; i < 25; i++) {
        const x = i * laneWidth + warpOffset;
        const isBorderingBlackKey = blackKeyLanes.includes(i - 1) || blackKeyLanes.includes(i);
        
        if (isBorderingBlackKey) {
            ctx.strokeStyle = 'rgba(185, 39, 252, 0.35)'; // Purple borders around black key lanes
            ctx.lineWidth = 1.5;
        } else {
            ctx.strokeStyle = 'rgba(0, 242, 254, 0.18)'; // Cyan borders between white key lanes
            ctx.lineWidth = 1.0;
        }
        
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Draw lane label text at the bottom of the canvas
    for (let i = 0; i < 25; i++) {
        const x = i * laneWidth + laneWidth / 2 + warpOffset;
        const isBlackKey = blackKeyLanes.includes(i);
        
        // Find computer key shortcut and note name
        const baseNote = 48 + gameState.midiOffset;
        const note = baseNote + i;
        
        // Find key in KEY_MAP
        let keyChar = '';
        for (const code in KEY_MAP) {
            if (KEY_MAP[code] === (note - gameState.midiOffset)) {
                keyChar = code.replace('Key', '').replace('Digit', '');
                break;
            }
        }
        
        const noteName = getNoteName(note);
        
        // Text styling
        ctx.textAlign = 'center';
        ctx.font = 'bold 9px "Share Tech Mono", monospace';
        
        if (synth.activeVoices[note]) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = isBlackKey ? 'rgba(185, 39, 252, 0.65)' : 'rgba(0, 242, 254, 0.55)';
        }
        
        // Draw shortcut character
        ctx.fillText(keyChar, x, canvas.height - 20);
        
        // Draw note name (smaller)
        ctx.font = '7px "Share Tech Mono", monospace';
        if (!synth.activeVoices[note]) {
            ctx.fillStyle = isBlackKey ? 'rgba(185, 39, 252, 0.45)' : 'rgba(0, 242, 254, 0.35)';
        }
        ctx.fillText(noteName, x, canvas.height - 8);
    }

    // Draw Sonar Threshold target boundary line
    const glowAmt = Math.sin(Date.now() * 0.01) * 3 + 5;
    ctx.strokeStyle = `rgba(0, 242, 254, ${0.15 + modWheelGlow * 0.35})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = glowAmt;
    ctx.shadowColor = varColor('cyan');
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(canvas.width, targetY);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Draw active sonar laser blasts
    gameState.sonarBlasts.forEach(sb => {
        const x = sb.lane * laneWidth + laneWidth / 2 + warpOffset;
        
        // Draw beam glow
        const grad = ctx.createLinearGradient(x - sb.width/2, 0, x + sb.width/2, 0);
        grad.addColorStop(0, 'rgba(0, 242, 254, 0.0)');
        grad.addColorStop(0.5, `rgba(0, 242, 254, ${sb.opacity})`);
        grad.addColorStop(1, 'rgba(0, 242, 254, 0.0)');
        
        ctx.fillStyle = grad;
        ctx.fillRect(x - sb.width * 2, 0, sb.width * 4, targetY);
    });

    // Draw Web Audio Live wave overlay along target line
    drawAudioWave();

    // Draw threats (Sea creatures)
    gameState.threats.forEach(t => {
        const x = t.lane * laneWidth + laneWidth / 2 + warpOffset;
        const sizePulse = Math.sin(t.pulse) * 4;
        const radius = 16 + sizePulse;

        ctx.save();
        ctx.translate(x, t.y);

        // Highlight if inside target hit window
        const isNearTarget = Math.abs(t.y - targetY) < 45;
        
        // Colors
        let glowColor = varColor('cyan');
        if (gameState.playMode === 'chord') {
            glowColor = varColor('purple');
        } else if (isNearTarget) {
            glowColor = varColor('green');
        }

        ctx.shadowBlur = isNearTarget ? 15 : 6;
        ctx.shadowColor = glowColor;

        if (t.type === 'jellyfish') {
            // Draw glowing subsea jellyfish
            const sway = Math.sin(t.pulse) * 8;
            
            // Bell dome cap
            ctx.fillStyle = isNearTarget ? 'rgba(0, 255, 135, 0.75)' : 'rgba(0, 242, 254, 0.65)';
            ctx.beginPath();
            ctx.arc(sway, 0, radius, Math.PI, 0);
            ctx.fill();

            // Tentacles paths
            ctx.strokeStyle = isNearTarget ? 'rgba(0, 255, 135, 0.6)' : 'rgba(0, 242, 254, 0.5)';
            ctx.lineWidth = 2;
            for (let j = -2; j <= 2; j++) {
                const tx = sway + j * 5;
                ctx.beginPath();
                ctx.moveTo(tx, 0);
                // sway sine tentacles
                ctx.quadraticCurveTo(tx + Math.sin(t.pulse + j) * 8, 12, tx + Math.cos(t.pulse) * 4, 25);
                ctx.stroke();
            }
        } 
        
        else if (t.type === 'mine') {
            // Draw depth mine (chord mode target)
            ctx.fillStyle = isNearTarget ? 'rgba(0, 255, 135, 0.8)' : 'rgba(185, 39, 252, 0.75)';
            
            // Spike spikes
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 3;
            for (let j = 0; j < 8; j++) {
                const ang = (j / 8) * Math.PI * 2 + t.pulse * 0.2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(ang) * (radius + 6), Math.sin(ang) * (radius + 6));
                ctx.stroke();
            }
            
            // Core sphere
            ctx.beginPath();
            ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
            ctx.fill();
        } 
        
        else {
            // Draw electric eel target
            ctx.fillStyle = isNearTarget ? 'rgba(0, 255, 135, 0.8)' : 'rgba(255, 0, 127, 0.7)';
            
            // Zigzag body shape
            ctx.beginPath();
            ctx.moveTo(-10, -5);
            ctx.lineTo(5, Math.sin(t.pulse) * 6);
            ctx.lineTo(15, -Math.sin(t.pulse) * 6);
            ctx.lineTo(10, 8);
            ctx.closePath();
            ctx.fill();
            
            // Glowing head
            ctx.beginPath();
            ctx.arc(-10, -5, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw note names helper overlays (e.g. C4)
        ctx.shadowBlur = 0; // reset
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.label, 0, -radius - 8);

        ctx.restore();
    });

    // Draw particle bursts
    gameState.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        
        if (p.isText) {
            ctx.fillStyle = p.color;
            ctx.font = 'bold 12px "Orbitron", sans-serif';
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
}

// Draw Live Web Audio Oscillator wave overlay
function drawAudioWave() {
    const data = synth.getAnalyserData();
    if (!data) return;

    ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const sliceWidth = canvas.width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
        // scale visual wave data centered on target line
        const v = data[i] / 128.0; // 0..2
        const y = targetY + (v - 1.0) * 45; // amplitude offset

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    ctx.lineTo(canvas.width, targetY);
    ctx.stroke();
}

// Adjust canvas viewport sizing dynamically
function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    
    // Set actual rendering dimensions based on bounding element
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Reset lane measurements
    laneWidth = canvas.width / 25;
    targetY = canvas.height - 70;
}

// Main Frame loop updates
function frameStep() {
    if (gameState.isRunning && !gameState.isPaused) {
        updateGame();
    }
    
    drawGame();
    
    requestAnimationFrame(frameStep);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Resize immediately and register listener
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Load saved high scores
    loadHighScores();

    // Bind controls & triggers
    bindUIControls();
    bindKeyboardEvents();
    bindCanvasTouches();

    // Initialize Web MIDI interface
    initMIDI();

    // Start rendering frame steps
    requestAnimationFrame(frameStep);

    // Apply pitch bend wrap wrapper effects
    setInterval(() => {
        const wrapper = document.getElementById('warp-wrapper');
        if (wrapper && Math.abs(pitchBendWarp) > 0.05) {
            // Apply wobbly screen translation
            const angle = Date.now() * 0.06;
            const xShift = Math.sin(angle) * pitchBendWarp * 8;
            wrapper.style.transform = `translateX(${xShift}px)`;
            // Slight screen coloring hue shifts
            wrapper.style.filter = `hue-rotate(${pitchBendWarp * 15}deg)`;
        } else if (wrapper) {
            wrapper.style.transform = '';
            wrapper.style.filter = '';
        }
    }, 40);
});
