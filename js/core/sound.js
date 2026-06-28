/* ========================================
 * PIXEL RAID — Sound System
 * 8-bit procedural audio via Web Audio API
 * ======================================== */

const Sound = {
    ctx: null,
    muted: false,
    volume: 0.3,
    initialized: false,

    init() {
        this.muted = localStorage.getItem('pixelraid_muted') === 'true';
        this.volume = parseFloat(localStorage.getItem('pixelraid_volume')) || 0.3;
        this._bindToggle();
    },

    _ensureCtx() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.initialized = true;
    },

    _bindToggle() {
        const btn = document.getElementById('btn-sound-toggle');
        if (btn) {
            btn.textContent = this.muted ? '🔇' : '🔊';
            btn.addEventListener('click', () => {
                this.muted = !this.muted;
                btn.textContent = this.muted ? '🔇' : '🔊';
                localStorage.setItem('pixelraid_muted', this.muted);
            });
        }
    },

    _playTone(freq, duration, type = 'square', vol = null) {
        if (this.muted) return;
        this._ensureCtx();
        const v = (vol !== null ? vol : this.volume);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(v, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    _playNoise(duration, vol = null) {
        if (this.muted) return;
        this._ensureCtx();
        const v = (vol !== null ? vol : this.volume) * 0.5;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(v, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
    },

    // ===== Game Sounds =====
    click() {
        this._playTone(800, 0.05, 'square', this.volume * 0.3);
    },

    attack() {
        this._playNoise(0.06, this.volume * 0.4);
        this._playTone(200, 0.08, 'sawtooth', this.volume * 0.3);
    },

    critical() {
        this._playTone(600, 0.05, 'square', this.volume * 0.5);
        setTimeout(() => this._playTone(900, 0.1, 'square', this.volume * 0.4), 50);
    },

    heal() {
        this._playTone(400, 0.1, 'sine', this.volume * 0.3);
        setTimeout(() => this._playTone(600, 0.15, 'sine', this.volume * 0.3), 100);
    },

    death() {
        this._playTone(400, 0.15, 'sawtooth', this.volume * 0.4);
        setTimeout(() => this._playTone(200, 0.2, 'sawtooth', this.volume * 0.3), 150);
        setTimeout(() => this._playTone(100, 0.3, 'sawtooth', this.volume * 0.2), 300);
    },

    victory() {
        const notes = [523, 659, 784]; // C5, E5, G5
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.2, 'square', this.volume * 0.4), i * 150);
        });
    },

    defeat() {
        const notes = [400, 300, 200];
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.25, 'sawtooth', this.volume * 0.3), i * 200);
        });
    },

    packOpen() {
        this._playNoise(0.15, this.volume * 0.3);
        setTimeout(() => this._playTone(300, 0.1, 'square', this.volume * 0.2), 100);
    },

    cardReveal(rarity) {
        const freqMap = { common: 400, rare: 600, epic: 800, legendary: 1000, mythic: 1200 };
        const freq = freqMap[rarity] || 400;
        this._playTone(freq, 0.15, 'square', this.volume * 0.4);
        setTimeout(() => this._playTone(freq * 1.5, 0.2, 'sine', this.volume * 0.3), 100);
    },

    levelUp() {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.15, 'square', this.volume * 0.4), i * 100);
        });
    },

    skill() {
        this._playTone(800, 0.05, 'sine', this.volume * 0.3);
        setTimeout(() => this._playTone(1200, 0.1, 'sine', this.volume * 0.4), 50);
    },
};
