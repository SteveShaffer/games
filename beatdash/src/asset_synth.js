/* Beat Dash - Procedural Chiptune Synthesizer */

class ChiptuneSynth {
    constructor() {}

    /**
     * Generates a chiptune audio buffer procedurally using OfflineAudioContext.
     * @param {number} trackIndex - Index of the demo track (0, 1, or 2)
     * @param {number} durationSeconds - Length of the song to generate (default 75s)
     * @param {number} sampleRate - Output audio sample rate (default 44100)
     * @returns {Promise<AudioBuffer>}
     */
    static generateTrack(trackIndex, durationSeconds = 75, sampleRate = 44100) {
        // Track settings
        const bpmList = [130, 142, 115];
        const namesList = ["Neon Drive", "Cyber Chase", "Pulse Runner"];
        const bpm = bpmList[trackIndex] || 130;
        const name = namesList[trackIndex] || "Neon Drive";

        const beatDuration = 60 / bpm; // duration of 1 beat in seconds
        const totalSamples = sampleRate * durationSeconds;
        
        // Create offline context
        // 1 channel is enough for analysis and lightweight mono audio playback
        const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);

        // Helper to generate white noise buffer (for snare and hi-hats)
        const noiseBufferSize = sampleRate * 2; // 2 seconds of noise
        const noiseBuffer = offlineCtx.createBuffer(1, noiseBufferSize, sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBufferSize; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }

        // --- SYNTH INSTRUMENTS ---

        // Kick Drum
        const playKick = (time) => {
            const osc = offlineCtx.createOscillator();
            const gainNode = offlineCtx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(offlineCtx.destination);
            
            // Pitch sweep: fast decay from 150Hz to 40Hz
            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
            
            // Gain envelope: fast punchy decay
            gainNode.gain.setValueAtTime(1.0, time);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
            
            osc.start(time);
            osc.stop(time + 0.16);
        };

        // Snare Drum (Noise + Pitch sweep)
        const playSnare = (time) => {
            // White Noise Component
            const noiseSource = offlineCtx.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            
            const noiseFilter = offlineCtx.createBiquadFilter();
            noiseFilter.type = "bandpass";
            noiseFilter.frequency.setValueAtTime(1000, time);
            noiseFilter.Q.setValueAtTime(1.5, time);
            
            const noiseGain = offlineCtx.createGain();
            
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(offlineCtx.destination);
            
            noiseGain.gain.setValueAtTime(0.6, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
            
            // Tone Component (pitch drop triangle for body)
            const osc = offlineCtx.createOscillator();
            osc.type = "triangle";
            const oscGain = offlineCtx.createGain();
            
            osc.connect(oscGain);
            oscGain.connect(offlineCtx.destination);
            
            osc.frequency.setValueAtTime(180, time);
            osc.frequency.linearRampToValueAtTime(100, time + 0.08);
            
            oscGain.gain.setValueAtTime(0.4, time);
            oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
            
            noiseSource.start(time);
            noiseSource.stop(time + 0.2);
            
            osc.start(time);
            osc.stop(time + 0.09);
        };

        // Hi-Hat
        const playHiHat = (time, volume = 0.25) => {
            const noiseSource = offlineCtx.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            
            const noiseFilter = offlineCtx.createBiquadFilter();
            noiseFilter.type = "highpass";
            noiseFilter.frequency.setValueAtTime(7000, time);
            
            const noiseGain = offlineCtx.createGain();
            
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(offlineCtx.destination);
            
            noiseGain.gain.setValueAtTime(volume, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
            
            noiseSource.start(time);
            noiseSource.stop(time + 0.06);
        };

        // Bass Synth (Warm triangle/saw bass)
        const playBass = (time, noteFrequency, duration) => {
            const osc = offlineCtx.createOscillator();
            // Cyber Chase uses a punchier sawtooth wave, others use triangle/saw blend
            osc.type = (trackIndex === 1) ? "sawtooth" : "triangle";
            
            const filter = offlineCtx.createBiquadFilter();
            filter.type = "lowpass";
            // Filter envelope: sweeps down slightly
            filter.frequency.setValueAtTime(trackIndex === 1 ? 700 : 450, time);
            filter.frequency.exponentialRampToValueAtTime(trackIndex === 1 ? 300 : 150, time + duration);
            
            const gainNode = offlineCtx.createGain();
            
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(offlineCtx.destination);
            
            // Bass gain envelope
            gainNode.gain.setValueAtTime(0.0, time);
            gainNode.gain.linearRampToValueAtTime(0.45, time + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);
            
            osc.frequency.setValueAtTime(noteFrequency, time);
            
            osc.start(time);
            osc.stop(time + duration);
        };

        // Lead Melodic Synth (Glowing pulse or triangle arps)
        const playLead = (time, noteFrequency, duration, volume = 0.2) => {
            const osc = offlineCtx.createOscillator();
            // Different wave types for leads
            osc.type = (trackIndex === 0) ? "sawtooth" : (trackIndex === 2 ? "triangle" : "sine");
            
            const filter = offlineCtx.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.setValueAtTime(trackIndex === 0 ? 1200 : 2000, time);
            
            const gainNode = offlineCtx.createGain();
            
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(offlineCtx.destination);
            
            // Lead envelope
            gainNode.gain.setValueAtTime(0.0, time);
            gainNode.gain.linearRampToValueAtTime(volume, time + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);
            
            // Subtle vibrato (frequency modulation)
            osc.frequency.setValueAtTime(noteFrequency, time);
            osc.frequency.linearRampToValueAtTime(noteFrequency * 1.01, time + duration * 0.5);
            osc.frequency.linearRampToValueAtTime(noteFrequency, time + duration);
            
            osc.start(time);
            osc.stop(time + duration);
        };

        // --- MELODIC DATA & SEQUENCERS ---
        
        // Frequencies for musical notes (C2 to C6)
        const notes = {
            // Bass octaves (Octave 1 and 2)
            E1: 41.20, G1: 49.00, A1: 55.00, C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
            C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00, A3: 220.00,
            // Lead octaves (Octave 4 and 5)
            C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00, B4: 493.88,
            C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00, B5: 987.77,
            C6: 1046.50
        };

        // Chord progressions (represented by roots)
        // 0: Neon Drive (Key of Am: Am - F - C - G)
        // 1: Cyber Chase (Key of Em: Em - C - D - Bm)
        // 2: Pulse Runner (Key of C: C - Em - F - G)
        const progressions = [
            [
                { root: "A", bass: ["A1", "A2"], lead: ["A4", "C5", "E5", "A5"] },
                { root: "F", bass: ["F1", "F2"], lead: ["F4", "A4", "C5", "F5"] },
                { root: "C", bass: ["C2", "C3"], lead: ["C4", "E4", "G4", "C5"] },
                { root: "G", bass: ["G1", "G2"], lead: ["G4", "B4", "D5", "G5"] }
            ],
            [
                { root: "E", bass: ["E1", "E2"], lead: ["E4", "G4", "B4", "E5"] },
                { root: "C", bass: ["C2", "C3"], lead: ["C4", "E4", "G4", "C5"] },
                { root: "D", bass: ["D2", "D3"], lead: ["D4", "F4", "A4", "D5"] }, // F# simplified to F
                { root: "B", bass: ["B1", "B2"], lead: ["B4", "D5", "F5", "B5"] }
            ],
            [
                { root: "C", bass: ["C2", "C3"], lead: ["C4", "E4", "G4", "C5"] },
                { root: "E", bass: ["E1", "E2"], lead: ["E4", "G4", "B4", "E5"] },
                { root: "F", bass: ["F1", "F2"], lead: ["F4", "A4", "C5", "F5"] },
                { root: "G", bass: ["G1", "G2"], lead: ["G4", "B4", "D5", "G5"] }
            ]
        ];

        const activeProgression = progressions[trackIndex] || progressions[0];

        // Let's schedule note-by-note over the entire duration
        let currentTime = 0.2; // Start after 0.2 seconds to allow audio initialization

        // Segment definitions:
        // 0s - 12s: Intro (simple bass + hihats)
        // 12s - 28s: Verse (drums + bass + soft lead)
        // 28s - 48s: Drop / Chorus (intense, full drums, fast melody, speed up)
        // 48s - 64s: Outro (decaying melody, fading drums)
        // 64s+: Fade out

        let stepIndex = 0;
        
        while (currentTime < durationSeconds - 1) {
            // Determine active section
            const chordIndex = Math.floor(currentTime / (beatDuration * 8)) % activeProgression.length;
            const currentChord = activeProgression[chordIndex];
            
            // Beat position inside a 4-beat bar (0 to 3)
            const barPosition = (currentTime / beatDuration) % 4;
            const step16th = Math.round(barPosition * 4) % 16; // 16th note index (0 to 15)

            // --- TRACK 0: NEON DRIVE (Synthwave - BPM 130) ---
            if (trackIndex === 0) {
                const isIntro = currentTime < 10;
                const isOutro = currentTime > 50;
                const isDrop = currentTime >= 22 && currentTime < 42;

                // Drum patterns
                // Kick on every beat
                if (step16th % 4 === 0 && !isOutro) {
                    playKick(currentTime);
                }
                // Snare on 2 and 4
                if ((step16th === 4 || step16th === 12) && !isIntro && !isOutro) {
                    playSnare(currentTime);
                }
                // Hi-Hats on offbeats (8th notes)
                if (step16th % 4 === 2 && !isOutro) {
                    playHiHat(currentTime, 0.15);
                }

                // Bassline: driving 8th notes
                if (step16th % 2 === 0) {
                    const bassNote = currentChord.bass[stepIndex % 2];
                    playBass(currentTime, notes[bassNote], beatDuration * 0.45);
                }

                // Lead Arpeggiator / Melodic pattern (16th notes or 8th notes)
                if (isDrop) {
                    // Fast arpeggiator in the drop (16th notes)
                    const arpNotes = currentChord.lead;
                    const arpNote = arpNotes[step16th % arpNotes.length];
                    playLead(currentTime, notes[arpNote], beatDuration * 0.22, 0.12);
                } else if (!isIntro && step16th % 4 === 0) {
                    // Melodic 1/4 notes in verse
                    const leadNotes = currentChord.lead;
                    const leadNote = leadNotes[(stepIndex >> 2) % leadNotes.length];
                    playLead(currentTime, notes[leadNote], beatDuration * 0.9, 0.15);
                }
            }

            // --- TRACK 1: CYBER CHASE (Drum & Bass - BPM 142) ---
            else if (trackIndex === 1) {
                const isIntro = currentTime < 8;
                const isOutro = currentTime > 55;
                const isDrop = currentTime >= 18 && currentTime < 48;

                // D&B drum patterns:
                // Kick on 1 and 2.5 (steps 0 and 10)
                if ((step16th === 0 || step16th === 10) && !isOutro) {
                    playKick(currentTime);
                }
                // Snare on 2 and 4 (steps 4 and 12)
                if ((step16th === 4 || step16th === 12) && !isIntro) {
                    playSnare(currentTime);
                }
                // Hi-Hats running fast 8th notes
                if (step16th % 2 === 0 && !isOutro) {
                    playHiHat(currentTime, step16th % 4 === 0 ? 0.2 : 0.1);
                }

                // Bassline: rapid syncopated 8th notes
                if (step16th % 2 === 0) {
                    const bassNote = currentChord.bass[0];
                    playBass(currentTime, notes[bassNote] * 1.5, beatDuration * 0.4);
                }

                // Intense arpeggio
                if (isDrop && step16th % 2 === 0) {
                    const arpNotes = currentChord.lead;
                    // Cyber chase has high pitch sweeps
                    const noteKey = arpNotes[(step16th / 2) % arpNotes.length];
                    playLead(currentTime, notes[noteKey] * (step16th >= 8 ? 2 : 1), beatDuration * 0.45, 0.08);
                }
            }

            // --- TRACK 2: PULSE RUNNER (Chill Pop - BPM 115) ---
            else {
                const isIntro = currentTime < 12;
                const isOutro = currentTime > 48;
                const isDrop = currentTime >= 24 && currentTime < 44;

                // Pop kick-snare:
                // Kick on 1 and 3 (steps 0 and 8)
                if ((step16th === 0 || step16th === 8) && !isOutro) {
                    playKick(currentTime);
                }
                // Snare on 2 and 4 (steps 4 and 12)
                if ((step16th === 4 || step16th === 12) && !isIntro) {
                    playSnare(currentTime);
                }
                // Hi-Hats on off-beats
                if (step16th % 4 === 2 && !isOutro) {
                    playHiHat(currentTime, 0.12);
                }

                // Chill bass: long 4th notes (steps 0, 4, 8, 12)
                if (step16th % 4 === 0) {
                    const bassNote = currentChord.bass[1];
                    playBass(currentTime, notes[bassNote], beatDuration * 0.8);
                }

                // Delicate chime lead
                if (!isIntro && step16th % 4 === 2) {
                    const leadNotes = currentChord.lead;
                    const chimeNote = leadNotes[stepIndex % leadNotes.length];
                    // Play an octave higher for chime effect (multiply freq by 2)
                    playLead(currentTime, notes[chimeNote] * 2, beatDuration * 0.35, 0.08);
                }
            }

            // Increment time by a 16th note step
            currentTime += beatDuration / 4;
            stepIndex++;
        }

        // Return a promise that resolves when the offline context completes rendering
        return offlineCtx.startRendering();
    }
}

// Attach to window so game.js can load it
window.ChiptuneSynth = ChiptuneSynth;
