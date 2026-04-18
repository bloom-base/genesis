/**
 * Genesis — Audio Manager
 *
 * Procedurally generated sound effects using the Web Audio API.
 * No external audio files needed — all sounds are synthesized from
 * oscillators, noise, and gain envelopes.
 *
 * Keeps sounds short, subtle, and non-intrusive.
 */

// ── Lazy AudioContext (created on first user gesture) ────────────────────────
let ctx = null;
let masterGain = null;

/** @type {number} 0–1 */
let masterVolume = 0.35;

/**
 * Ensure the AudioContext is initialised. Must be called from a user-gesture
 * callback (pointer-lock, click, keydown) before any sound plays.
 */
function ensureContext() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(ctx.destination);
    return ctx;
}

// ── Utility helpers ──────────────────────────────────────────────────────────

/** Random float in [lo, hi) */
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }

/**
 * Create a simple gain envelope that ramps up then fades out.
 * @returns {GainNode}
 */
function makeEnvelope(peak, attack, decay) {
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);
    g.connect(masterGain);
    return g;
}

// ── Footstep sounds ──────────────────────────────────────────────────────────

// Timing state for footstep cadence
let stepAccumulator = 0;
let lastStepWasLeft = false;

/** Interval between footstep sounds (seconds). */
const WALK_STEP_INTERVAL  = 0.42;
const SPRINT_STEP_INTERVAL = 0.28;

/**
 * Synthesise a single footstep — a short, filtered noise burst that sounds
 * like a soft thud on dirt/grass. Each step is slightly randomised so the
 * pattern never feels robotic.
 *
 * @param {number} speedFactor 0 = slow walk, 1 = sprint
 */
function playFootstep(speedFactor = 0) {
    if (!ctx) return;

    const t = ctx.currentTime;
    const volume = 0.12 + speedFactor * 0.10; // louder at sprint

    // ── Low thud (body of the footstep) ─────────────────────────────────────
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    // Randomise base frequency per step for variety
    osc.frequency.setValueAtTime(rand(55, 80), t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);

    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(volume, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);

    osc.connect(thudGain);
    thudGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.12);

    // ── High "scuff" noise layer ────────────────────────────────────────────
    const bufferSize = ctx.sampleRate * 0.06; // 60 ms of noise
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    // Bandpass filter to make it sound earthy
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = rand(800, 1400);
    filter.Q.value = 1.2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.08);
}

/**
 * Called every frame while the player is moving. Accumulates time and
 * triggers footstep sounds at a cadence based on movement speed.
 *
 * @param {number}  delta     frame delta in seconds
 * @param {boolean} isMoving  true if the player is pressing a movement key
 * @param {boolean} isSprinting
 */
export function updateFootsteps(delta, isMoving, isSprinting) {
    if (!ctx) return;

    if (!isMoving) {
        // Reset accumulator so the first step on resuming movement is immediate
        stepAccumulator = 0;
        return;
    }

    const interval = isSprinting ? SPRINT_STEP_INTERVAL : WALK_STEP_INTERVAL;
    stepAccumulator += delta;

    if (stepAccumulator >= interval) {
        stepAccumulator -= interval;
        const speedFactor = isSprinting ? 1 : 0;
        playFootstep(speedFactor);
        lastStepWasLeft = !lastStepWasLeft;
    }
}

// ── Spell cast sounds ────────────────────────────────────────────────────────

/**
 * Spell sound parameter presets keyed by spell id.
 * Each defines an oscillator tone + optional noise layer.
 */
const SPELL_SOUNDS = {
    fireball: {
        freq: 180, freqEnd: 90, type: 'sawtooth',
        duration: 0.25, volume: 0.18, filterFreq: 600,
    },
    frost_bolt: {
        freq: 1200, freqEnd: 800, type: 'sine',
        duration: 0.20, volume: 0.14, filterFreq: 2000,
    },
    lightning: {
        freq: 100, freqEnd: 40, type: 'square',
        duration: 0.15, volume: 0.16, filterFreq: 1200, noise: true,
    },
    nature_call: {
        freq: 440, freqEnd: 520, type: 'triangle',
        duration: 0.30, volume: 0.12, filterFreq: 900,
    },
    void_rift: {
        freq: 70, freqEnd: 35, type: 'sawtooth',
        duration: 0.40, volume: 0.20, filterFreq: 400, noise: true,
    },
};

/**
 * Play a spell-cast sound effect.
 * @param {string} spellId  one of the keys in SPELL_SOUNDS
 */
export function playSpellCast(spellId) {
    if (!ctx) return;

    const preset = SPELL_SOUNDS[spellId];
    if (!preset) return;

    const t = ctx.currentTime;

    // ── Tone oscillator ─────────────────────────────────────────────────────
    const osc = ctx.createOscillator();
    osc.type = preset.type;
    osc.frequency.setValueAtTime(preset.freq, t);
    osc.frequency.exponentialRampToValueAtTime(preset.freqEnd, t + preset.duration);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(preset.volume, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + preset.duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = preset.filterFreq;

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + preset.duration + 0.05);

    // ── Optional noise layer (for crackling / whoosh) ───────────────────────
    if (preset.noise) {
        const nLen = Math.floor(ctx.sampleRate * preset.duration);
        const buf  = ctx.createBuffer(1, nLen, ctx.sampleRate);
        const d    = buf.getChannelData(0);
        for (let i = 0; i < nLen; i++) d[i] = (Math.random() * 2 - 1);

        const src = ctx.createBufferSource();
        src.buffer = buf;

        const nf = ctx.createBiquadFilter();
        nf.type = 'bandpass';
        nf.frequency.value = preset.filterFreq * 0.8;
        nf.Q.value = 0.8;

        const ng = ctx.createGain();
        ng.gain.setValueAtTime(preset.volume * 0.35, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + preset.duration);

        src.connect(nf);
        nf.connect(ng);
        ng.connect(masterGain);
        src.start(t);
        src.stop(t + preset.duration + 0.05);
    }
}

/**
 * Play a spell impact / explosion sound — lower pitched, more percussive.
 * @param {string} spellId
 */
export function playSpellImpact(spellId) {
    if (!ctx) return;

    const preset = SPELL_SOUNDS[spellId];
    if (!preset) return;

    const t = ctx.currentTime;

    // Low boom
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(preset.freq * 0.5, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.20);

    const g = ctx.createGain();
    g.gain.setValueAtTime(preset.volume * 0.8, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.30);

    // Noise burst
    const nLen = Math.floor(ctx.sampleRate * 0.12);
    const buf  = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const d    = buf.getChannelData(0);
    for (let i = 0; i < nLen; i++) d[i] = (Math.random() * 2 - 1);

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const ng = ctx.createGain();
    ng.gain.setValueAtTime(preset.volume * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 500;

    src.connect(flt);
    flt.connect(ng);
    ng.connect(masterGain);
    src.start(t);
    src.stop(t + 0.20);
}

// ── Inventory / UI sounds ────────────────────────────────────────────────────

/**
 * Short click sound for hotbar slot selection.
 */
export function playSelectSound() {
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1100, t + 0.02);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.08);
}

/**
 * Soft "thunk" for moving / dropping an item in the inventory.
 */
export function playItemMoveSound() {
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(rand(300, 400), t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.06);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.10);
}

/**
 * Gentle open / close sound for inventory panel.
 * @param {boolean} opening  true = opening, false = closing
 */
export function playInventoryToggle(opening) {
    if (!ctx) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';

    if (opening) {
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.08);
    } else {
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.linearRampToValueAtTime(400, t + 0.08);
    }

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.10);

    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
}

// ── Item pickup sound ────────────────────────────────────────────────────

/**
 * Subtle 'whoosh' sound when an item is collected from the ground.
 * Rising sweep + soft noise burst for a satisfying pickup feel.
 */
export function playPickupSound() {
    if (!ctx) return;
    const t = ctx.currentTime;

    // Rising shimmer tone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.12);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.09, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.20);

    // Second harmonic for richness
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(900, t);
    osc2.frequency.exponentialRampToValueAtTime(1800, t + 0.10);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.04, t);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc2.connect(osc2Gain);
    osc2Gain.connect(masterGain);
    osc2.start(t);
    osc2.stop(t + 0.16);

    // Soft noise whoosh layer
    const nLen = Math.floor(ctx.sampleRate * 0.15);
    const buf  = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const d    = buf.getChannelData(0);
    for (let i = 0; i < nLen; i++) d[i] = (Math.random() * 2 - 1);

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = 2000;
    flt.Q.value = 0.6;

    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.05, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    src.connect(flt);
    flt.connect(ng);
    ng.connect(masterGain);
    src.start(t);
    src.stop(t + 0.18);
}

// ── Ambient wind (very subtle background) ────────────────────────────────────

let windSource = null;

/**
 * Start a very quiet wind ambience loop using filtered noise.
 * Called once after the AudioContext is ready.
 */
function startAmbientWind() {
    if (!ctx || windSource) return;

    // Create a long noise buffer (2 seconds, looped)
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    // Smooth noise — average consecutive samples for a softer sound
    d[0] = Math.random() * 2 - 1;
    for (let i = 1; i < len; i++) {
        d[i] = d[i - 1] * 0.98 + (Math.random() * 2 - 1) * 0.02;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 300;
    flt.Q.value = 0.5;

    const g = ctx.createGain();
    g.gain.value = 0.025; // barely audible

    src.connect(flt);
    flt.connect(g);
    g.connect(masterGain);
    src.start();

    windSource = { src, gain: g };
}

// ── Initialise (call on first user gesture) ──────────────────────────────────

/**
 * Initialise the audio system. Must be called from a user gesture handler
 * (e.g. click, keydown) to satisfy browser autoplay restrictions.
 */
export function initAudio() {
    if (ctx) return; // already initialised
    ensureContext();
    startAmbientWind();
}

/**
 * Set master volume.
 * @param {number} v  0–1
 */
export function setMasterVolume(v) {
    masterVolume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = masterVolume;
}
