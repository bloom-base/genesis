/**
 * Tests for the seeded Perlin noise implementation.
 * Pure-JS module — no Three.js dependency, runs in Node/jsdom without issues.
 */

import { describe, it, expect } from 'vitest';
import { createNoise } from '../src/noise.js';

describe('createNoise', () => {
    it('returns an object with noise2d and fbm functions', () => {
        const n = createNoise(42);
        expect(typeof n.noise2d).toBe('function');
        expect(typeof n.fbm).toBe('function');
    });

    it('produces deterministic output for the same seed', () => {
        const a = createNoise(42);
        const b = createNoise(42);
        // Many sample points — all must match exactly.
        for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
                expect(a.noise2d(x * 0.7, y * 0.3)).toBe(b.noise2d(x * 0.7, y * 0.3));
                expect(a.fbm(x * 0.5, y * 0.4, 5)).toBe(b.fbm(x * 0.5, y * 0.4, 5));
            }
        }
    });

    it('produces different output for different seeds', () => {
        const a = createNoise(42);
        const b = createNoise(99);
        // Very unlikely for both to return the same value at (0.5, 0.5).
        expect(a.noise2d(0.5, 0.5)).not.toBe(b.noise2d(0.5, 0.5));
    });

    it('noise2d stays within [-1, 1]', () => {
        const noise = createNoise(7);
        for (let i = 0; i < 200; i++) {
            const v = noise.noise2d(i * 0.137, i * 0.093);
            expect(v).toBeGreaterThanOrEqual(-1);
            expect(v).toBeLessThanOrEqual(1);
        }
    });

    it('fbm stays within [-1, 1] with default parameters', () => {
        const noise = createNoise(7);
        for (let i = 0; i < 200; i++) {
            const v = noise.fbm(i * 0.137, i * 0.093);
            expect(v).toBeGreaterThanOrEqual(-1);
            expect(v).toBeLessThanOrEqual(1);
        }
    });

    it('fbm returns a finite number', () => {
        const noise = createNoise(42);
        const v = noise.fbm(1.23, 4.56);
        expect(Number.isFinite(v)).toBe(true);
    });

    it('fbm respects the octaves parameter (more octaves → more detail)', () => {
        // Different octave counts must yield different values at the same coords.
        // Use a coordinate far from integer corners to avoid the zero-crossing degenerate case.
        const noise = createNoise(42);
        const v4 = noise.fbm(1.37, 2.71, 4);
        const v8 = noise.fbm(1.37, 2.71, 8);
        expect(v4).not.toBe(v8);
    });

    it('works at integer coordinates without NaN', () => {
        const noise = createNoise(42);
        for (let x = 0; x <= 5; x++) {
            for (let y = 0; y <= 5; y++) {
                expect(Number.isFinite(noise.noise2d(x, y))).toBe(true);
                expect(Number.isFinite(noise.fbm(x, y))).toBe(true);
            }
        }
    });

    it('works at negative coordinates', () => {
        const noise = createNoise(42);
        const v = noise.fbm(-3.5, -2.1);
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
    });
});
