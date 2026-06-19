/* AquaSynth: Resonant Subsea Polyphonic Synthesizer */

class SynthVoice {
    constructor(ctx, note, velocity, settings, destination) {
        this.ctx = ctx;
        this.note = note;
        this.velocity = velocity / 127; // Normalize velocity to 0..1
        this.settings = settings;

        // Calculate fundamental frequency from MIDI note
        this.freq = 440 * Math.pow(2, (note - 69) / 12);

        // Create voice nodes
        this.osc1 = ctx.createOscillator(); // Main oscillator
        this.osc2 = ctx.createOscillator(); // Sub oscillator for depth
        this.filter = ctx.createBiquadFilter();
        this.amp = ctx.createGain();

        // Configure main oscillator
        this.osc1.type = settings.waveform || 'sawtooth';
        this.osc1.frequency.setValueAtTime(this.freq, ctx.currentTime);

        // Configure sub oscillator (1 octave lower, detuned triangle for warmth)
        this.osc2.type = 'triangle';
        this.osc2.frequency.setValueAtTime(this.freq / 2, ctx.currentTime);
        // Slightly detuned to create a rich chorus effect
        this.osc2.detune.setValueAtTime(-8 + (settings.pitchBendCents || 0), ctx.currentTime);

        // Configure resonant filter
        this.filter.type = 'lowpass';
        this.filter.Q.setValueAtTime(settings.filterQ || 3, ctx.currentTime);

        // Connect nodes
        this.osc1.connect(this.filter);
        this.osc2.connect(this.filter);
        this.filter.connect(this.amp);
        this.amp.connect(destination);

        // Apply pitch bend detune if already active
        if (settings.pitchBendCents) {
            this.osc1.detune.setValueAtTime(settings.pitchBendCents, ctx.currentTime);
            this.osc2.detune.setValueAtTime(settings.pitchBendCents - 8, ctx.currentTime);
        }

        // Start oscillators immediately
        const now = ctx.currentTime;
        this.osc1.start(now);
        this.osc2.start(now);

        // Run Attack-Decay-Sustain phase
        this.trigger();
    }

    trigger() {
        const now = this.ctx.currentTime;
        
        // Target volume based on note velocity and master settings
        const targetVolume = this.velocity * (this.settings.voiceVolumeFraction || 0.4);
        
        // Start from zero amplitude
        this.amp.gain.setValueAtTime(0, now);

        // Attack phase
        const attackTime = Math.max(0.002, this.settings.attack || 0.05);
        this.amp.gain.linearRampToValueAtTime(targetVolume, now + attackTime);

        // Decay phase
        const decayTime = Math.max(0.01, this.settings.decay || 0.15);
        const sustainLevel = targetVolume * (this.settings.sustain || 0.6);
        this.amp.gain.exponentialRampToValueAtTime(Math.max(sustainLevel, 0.0001), now + attackTime + decayTime);

        // Resonant Filter Envelope Sweep
        const baseCutoff = this.settings.filterCutoff || 1000;
        const modWheelCutoff = this.settings.filterModOffset || 0;
        const totalCutoff = Math.min(20000, Math.max(20, baseCutoff + modWheelCutoff));

        const filterEnvAmount = this.settings.filterEnvAmt || 2500; // env modulation depth
        const filterAttack = Math.max(0.005, this.settings.filterAttack || 0.08);

        this.filter.frequency.setValueAtTime(totalCutoff, now);
        // Sweep filter cutoff upwards on attack
        const peakCutoff = Math.min(20000, totalCutoff + (filterEnvAmount * this.velocity));
        this.filter.frequency.exponentialRampToValueAtTime(peakCutoff, now + filterAttack);
        // Decay back to sustained filter level
        this.filter.frequency.exponentialRampToValueAtTime(totalCutoff, now + filterAttack + decayTime);
    }

    updateFilterCutoff(baseCutoff, modWheelOffset) {
        const now = this.ctx.currentTime;
        const totalCutoff = Math.min(20000, Math.max(20, baseCutoff + modWheelOffset));
        // Smooth transition to prevent audio clicks
        this.filter.frequency.setTargetAtTime(totalCutoff, now, 0.05);
    }

    updatePitchBend(cents) {
        const now = this.ctx.currentTime;
        this.osc1.detune.setTargetAtTime(cents, now, 0.02);
        this.osc2.detune.setTargetAtTime(cents - 8, now, 0.02);
    }

    release() {
        const now = this.ctx.currentTime;
        const releaseTime = Math.max(0.01, this.settings.release || 0.3);

        // Cancel scheduled gain changes and release from current level
        this.amp.gain.cancelScheduledValues(now);
        this.amp.gain.setValueAtTime(this.amp.gain.value, now);
        this.amp.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

        // Stop oscillators when release completes
        const stopTime = now + releaseTime;
        this.osc1.stop(stopTime);
        this.osc2.stop(stopTime);
    }
}

class AquaSynth {
    constructor() {
        this.ctx = null;
        this.activeVoices = {};
        
        // Synth configuration settings
        this.settings = {
            waveform: 'sawtooth',
            attack: 0.03,
            decay: 0.18,
            sustain: 0.5,
            release: 0.25,
            
            filterCutoff: 1200,
            filterQ: 4.0,
            filterEnvAmt: 2500,
            filterAttack: 0.06,
            filterModOffset: 0, // modulation wheel CC offset
            
            voiceVolumeFraction: 0.35,
            pitchBendCents: 0,
            pitchBendRange: 2.0, // pitch bend range in semitones (+/- 2 semitones)
            delayFeedback: 0.35,
            delayTime: 0.3 // 300ms echo
        };

        this.masterVolume = 0.8;
        this.isMuted = false;
    }

    init() {
        if (this.ctx) return;

        // Create AudioContext
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();

        // Node Chain Setup
        // summing node for all active voices
        this.voiceSumNode = this.ctx.createGain();
        this.voiceSumNode.gain.value = 1.0;

        // Echo/Delay Line setup
        this.delayNode = this.ctx.createDelay(2.0); // max delay 2 seconds
        this.delayFeedbackNode = this.ctx.createGain();
        this.delaySendNode = this.ctx.createGain(); // wet send

        this.delayNode.delayTime.value = this.settings.delayTime;
        this.delayFeedbackNode.gain.value = this.settings.delayFeedback;
        this.delaySendNode.gain.value = 0.4; // 40% send amount

        // Connect feedback delay loop
        this.delayNode.connect(this.delayFeedbackNode);
        this.delayFeedbackNode.connect(this.delayNode);

        // Visualizer Analyser Node
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;

        // Master Gain Control
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0.0 : this.masterVolume;

        // Connections:
        // sumNode -> dry -> analyser
        this.voiceSumNode.connect(this.analyser);
        
        // sumNode -> wet send -> delayNode -> analyser
        this.voiceSumNode.connect(this.delaySendNode);
        this.delaySendNode.connect(this.delayNode);
        this.delayNode.connect(this.analyser);

        // analyser -> master gain -> speakers
        this.analyser.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    noteOn(note, velocity = 100) {
        this.init();
        this.resume();

        // If note is already playing, release it first
        if (this.activeVoices[note]) {
            this.activeVoices[note].release();
        }

        // Spawn a new voice
        const voice = new SynthVoice(this.ctx, note, velocity, this.settings, this.voiceSumNode);
        this.activeVoices[note] = voice;
    }

    noteOff(note) {
        if (!this.ctx) return;

        const voice = this.activeVoices[note];
        if (voice) {
            voice.release();
            delete this.activeVoices[note];
        }
    }

    setPitchBend(bendValue) {
        // MIDI pitch bend goes from -8192 to 8191
        // Convert to detuning in cents
        const semitones = (bendValue / 8192) * this.settings.pitchBendRange;
        const cents = semitones * 100;
        this.settings.pitchBendCents = cents;

        // Update all active voices detune values in real-time
        for (const note in this.activeVoices) {
            this.activeVoices[note].updatePitchBend(cents);
        }
    }

    setModulation(modValue) {
        // MIDI CC Modulation goes from 0 to 127
        // Map to low-pass filter cutoff frequency offset (0Hz to 4000Hz sweep)
        const offset = (modValue / 127) * 4000;
        this.settings.filterModOffset = offset;

        // Update all active voice filter cutoffs in real-time
        for (const note in this.activeVoices) {
            this.activeVoices[note].updateFilterCutoff(this.settings.filterCutoff, offset);
        }
    }

    setWaveform(type) {
        this.settings.waveform = type;
    }

    setDelayFeedback(value) {
        this.settings.delayFeedback = value;
        if (this.delayFeedbackNode) {
            const now = this.ctx.currentTime;
            this.delayFeedbackNode.gain.setTargetAtTime(value, now, 0.05);
        }
    }

    setDelayTime(value) {
        this.settings.delayTime = value;
        if (this.delayNode) {
            const now = this.ctx.currentTime;
            this.delayNode.delayTime.setTargetAtTime(value, now, 0.1);
        }
    }

    setVolume(value) {
        this.masterVolume = value;
        if (this.masterGain) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0 : value, now, 0.05);
        }
    }

    setMute(isMuted) {
        this.isMuted = isMuted;
        if (this.masterGain) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.setTargetAtTime(isMuted ? 0.0 : this.masterVolume, now, 0.05);
        }
    }

    getAnalyserData() {
        if (!this.analyser) return null;
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);
        return dataArray;
    }
}

// Attach synth to window for global access
window.AquaSynth = AquaSynth;
