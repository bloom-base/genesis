/**
 * Seeded Perlin noise — pure JS, no dependencies.
 *
 * Usage:
 *   const { noise2d, fbm } = createNoise(seed);
 *   const h = fbm(x * scale, z * scale, octaves);
 */
export function createNoise(seed) {
    // Build a shuffled permutation table from the seed.
    const base = new Uint8Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;

    // Linear-congruential RNG seeded deterministically.
    let s = (seed ^ 0xdeadbeef) >>> 0;
    function lcg() {
        s = (Math.imul(s, 1664525) + 1013904223) | 0;
        return (s >>> 0) / 0x100000000;
    }

    // Fisher-Yates shuffle.
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(lcg() * (i + 1));
        const tmp = base[i];
        base[i] = base[j];
        base[j] = tmp;
    }

    // Double the table to avoid index wrapping.
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = base[i & 255];

    // ── Perlin helpers ──────────────────────────────────────────────────────
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(t, a, b) { return a + t * (b - a); }

    // 2-D gradient function — maps hash to one of 8 directions.
    function grad(hash, x, y) {
        const h = hash & 7;
        const u = h < 4 ? x : y;
        const v = h < 4 ? y : x;
        return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }

    /**
     * Classic 2-D Perlin noise.
     * @param {number} x
     * @param {number} y
     * @returns {number} value in roughly [-1, 1]
     */
    function noise2d(x, y) {
        const xi = Math.floor(x) & 255;
        const yi = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const u = fade(xf);
        const v = fade(yf);

        const aa = perm[perm[xi]     + yi];
        const ab = perm[perm[xi]     + yi + 1];
        const ba = perm[perm[xi + 1] + yi];
        const bb = perm[perm[xi + 1] + yi + 1];

        return lerp(v,
            lerp(u, grad(aa, xf,     yf),     grad(ba, xf - 1, yf)),
            lerp(u, grad(ab, xf,     yf - 1), grad(bb, xf - 1, yf - 1))
        );
    }

    /**
     * Fractal Brownian Motion — sums multiple noise octaves for natural detail.
     * @param {number} x
     * @param {number} y
     * @param {number} [octaves=6]      Number of noise layers.
     * @param {number} [persistence=0.5] Amplitude decay per octave.
     * @param {number} [lacunarity=2.0]  Frequency scale per octave.
     * @returns {number} value in roughly [-1, 1]
     */
    function fbm(x, y, octaves = 6, persistence = 0.5, lacunarity = 2.0) {
        let value = 0;
        let amplitude = 1.0;
        let frequency = 1.0;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value    += noise2d(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude  *= persistence;
            frequency  *= lacunarity;
        }

        return value / maxValue;
    }

    return { noise2d, fbm };
}
