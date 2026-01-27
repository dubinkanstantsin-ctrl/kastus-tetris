// Tetris Sound Effects System
// Uses Web Audio API for retro game sounds

class TetrisAudio {
    constructor() {
        this.audioContext = null;
        this.sfxGain = null;
        this.isMuted = false;
    }

    init() {
        if (this.audioContext) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Master gain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.4;
        this.masterGain.connect(this.audioContext.destination);

        // SFX gain
        this.sfxGain = this.audioContext.createGain();
        this.sfxGain.gain.value = 0.6;
        this.sfxGain.connect(this.masterGain);
    }

    // Stub methods for music (no longer used)
    startMusic() {
        if (!this.audioContext) this.init();
        // Resume audio context if suspended
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    stopMusic() {
        // No music to stop
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : 0.4;
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
