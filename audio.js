// Tetris Music System - Korobeiniki Theme
// Uses Web Audio API to synthesize the classic Tetris melody

class TetrisAudio {
    constructor() {
        this.audioContext = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.isPlaying = false;
        this.isMuted = false;
        this.currentNoteIndex = 0;
        this.musicTimeout = null;

        // Korobeiniki melody - note frequencies and durations
        // Format: [frequency, duration in beats]
        this.melody = [
            // Line 1
            [659.25, 1], [493.88, 0.5], [523.25, 0.5], [587.33, 1], [523.25, 0.5], [493.88, 0.5],
            [440, 1], [440, 0.5], [523.25, 0.5], [659.25, 1], [587.33, 0.5], [523.25, 0.5],
            [493.88, 1.5], [523.25, 0.5], [587.33, 1], [659.25, 1],
            [523.25, 1], [440, 1], [440, 1], [0, 0.5],

            // Line 2
            [0, 0.5], [587.33, 1], [698.46, 0.5], [880, 1], [783.99, 0.5], [698.46, 0.5],
            [659.25, 1.5], [523.25, 0.5], [659.25, 1], [587.33, 0.5], [523.25, 0.5],
            [493.88, 1], [493.88, 0.5], [523.25, 0.5], [587.33, 1], [659.25, 1],
            [523.25, 1], [440, 1], [440, 1], [0, 1],

            // Line 3 (repeat with variation)
            [659.25, 2], [523.25, 2], [587.33, 2], [493.88, 2],
            [523.25, 2], [440, 2], [415.30, 2], [493.88, 2],
            [659.25, 2], [523.25, 2], [587.33, 2], [493.88, 2],
            [523.25, 1], [659.25, 1], [880, 2], [830.61, 4]
        ];

        this.tempo = 140; // BPM
        this.beatDuration = 60 / this.tempo;
    }

    init() {
        if (this.audioContext) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Master gain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.audioContext.destination);

        // Music gain (half volume of SFX)
        this.musicGain = this.audioContext.createGain();
        this.musicGain.gain.value = 0.3;
        this.musicGain.connect(this.masterGain);

        // SFX gain
        this.sfxGain = this.audioContext.createGain();
        this.sfxGain.gain.value = 0.6;
        this.sfxGain.connect(this.masterGain);
    }

    playNote(frequency, duration, startTime) {
        if (!this.audioContext || frequency === 0) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'square';
        oscillator.frequency.value = frequency;

        // ADSR envelope for retro 8-bit sound
        const attackTime = 0.01;
        const decayTime = 0.1;
        const sustainLevel = 0.4;
        const releaseTime = 0.1;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.8, startTime + attackTime);
        gainNode.gain.linearRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime);
        gainNode.gain.setValueAtTime(sustainLevel, startTime + duration - releaseTime);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.musicGain);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    startMusic() {
        if (!this.audioContext) this.init();
        if (this.isPlaying) return;

        // Resume audio context if suspended (needed for browsers that block autoplay)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isPlaying = true;
        this.currentNoteIndex = 0;
        this.playMelody();
    }

    playMelody() {
        if (!this.isPlaying || this.isMuted) return;

        const startTime = this.audioContext.currentTime;
        let timeOffset = 0;

        // Schedule multiple notes ahead
        for (let i = 0; i < 8 && this.currentNoteIndex + i < this.melody.length; i++) {
            const noteIndex = (this.currentNoteIndex + i) % this.melody.length;
            const [freq, beats] = this.melody[noteIndex];
            const duration = beats * this.beatDuration * 0.9;

            if (freq > 0) {
                this.playNote(freq, duration, startTime + timeOffset);
            }

            timeOffset += beats * this.beatDuration;
        }

        // Update index and schedule next batch
        this.currentNoteIndex = (this.currentNoteIndex + 8) % this.melody.length;

        // Schedule next batch of notes
        this.musicTimeout = setTimeout(() => {
            this.playMelody();
        }, timeOffset * 1000 * 0.9);
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.musicTimeout) {
            clearTimeout(this.musicTimeout);
            this.musicTimeout = null;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
        }
        if (this.isMuted) {
            this.stopMusic();
        } else if (!this.isPlaying) {
            this.startMusic();
        }
        return this.isMuted;
    }

    // Sound effects
    playMoveSound() {
        if (!this.audioContext || this.isMuted) return;
        this.playEffect(200, 0.05, 'sine');
    }

    playRotateSound() {
        if (!this.audioContext || this.isMuted) return;
        this.playEffect(300, 0.08, 'sine', 400);
    }

    playDropSound() {
        if (!this.audioContext || this.isMuted) return;
        this.playEffect(150, 0.15, 'triangle');
    }

    playLineClearSound() {
        if (!this.audioContext || this.isMuted) return;
        const now = this.audioContext.currentTime;
        this.playEffect(523.25, 0.1, 'square', 0, now);
        this.playEffect(659.25, 0.1, 'square', 0, now + 0.1);
        this.playEffect(783.99, 0.1, 'square', 0, now + 0.2);
        this.playEffect(1046.5, 0.2, 'square', 0, now + 0.3);
    }

    playGameOverSound() {
        if (!this.audioContext || this.isMuted) return;
        const now = this.audioContext.currentTime;
        this.playEffect(392, 0.3, 'sawtooth', 0, now);
        this.playEffect(349.23, 0.3, 'sawtooth', 0, now + 0.3);
        this.playEffect(329.63, 0.3, 'sawtooth', 0, now + 0.6);
        this.playEffect(293.66, 0.5, 'sawtooth', 0, now + 0.9);
    }

    playLevelUpSound() {
        if (!this.audioContext || this.isMuted) return;
        const now = this.audioContext.currentTime;
        for (let i = 0; i < 5; i++) {
            this.playEffect(440 + (i * 100), 0.08, 'square', 0, now + i * 0.08);
        }
    }

    playEffect(frequency, duration, type = 'sine', targetFreq = 0, startTime = null) {
        if (!this.audioContext) return;

        const time = startTime || this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, time);

        if (targetFreq > 0) {
            oscillator.frequency.linearRampToValueAtTime(targetFreq, time + duration);
        }

        gainNode.gain.setValueAtTime(0.3, time);
        gainNode.gain.linearRampToValueAtTime(0, time + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);

        oscillator.start(time);
        oscillator.stop(time + duration);
    }
}

// Global audio instance
const tetrisAudio = new TetrisAudio();
