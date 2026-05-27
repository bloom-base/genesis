/**
 * Tests for the item rarity system — colour definitions, helpers,
 * and validation that every item has a valid rarity tier.
 */

import { describe, it, expect } from 'vitest';
import {
    RARITIES,
    RARITY_COLORS,
    getRarityColor,
    ITEMS,
    getItem,
} from '../src/items.js';

// ── RARITY_COLORS structure ──────────────────────────────────────────────────

describe('RARITY_COLORS', () => {
    it('defines a colour entry for every RARITIES value', () => {
        for (const key of Object.values(RARITIES)) {
            expect(RARITY_COLORS).toHaveProperty(key);
        }
    });

    it('each entry has hex, label, order, and glow fields', () => {
        for (const [key, val] of Object.entries(RARITY_COLORS)) {
            expect(val.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
            expect(typeof val.label).toBe('string');
            expect(val.label.length).toBeGreaterThan(0);
            expect(typeof val.order).toBe('number');
            expect(typeof val.glow).toBe('boolean');
        }
    });

    it('orders increase from common to legendary', () => {
        const tiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        for (let i = 1; i < tiers.length; i++) {
            expect(RARITY_COLORS[tiers[i]].order)
                .toBeGreaterThan(RARITY_COLORS[tiers[i - 1]].order);
        }
    });

    it('only rare, epic, and legendary have glow enabled', () => {
        expect(RARITY_COLORS.common.glow).toBe(false);
        expect(RARITY_COLORS.uncommon.glow).toBe(false);
        expect(RARITY_COLORS.rare.glow).toBe(true);
        expect(RARITY_COLORS.epic.glow).toBe(true);
        expect(RARITY_COLORS.legendary.glow).toBe(true);
    });

    it('has exactly 5 tiers', () => {
        expect(Object.keys(RARITY_COLORS)).toHaveLength(5);
    });
});

// ── getRarityColor helper ────────────────────────────────────────────────────

describe('getRarityColor', () => {
    it('returns the correct colour object for each tier', () => {
        expect(getRarityColor('common')).toBe(RARITY_COLORS.common);
        expect(getRarityColor('legendary')).toBe(RARITY_COLORS.legendary);
    });

    it('returns null for an unknown rarity', () => {
        expect(getRarityColor('mythic')).toBeNull();
        expect(getRarityColor('')).toBeNull();
        expect(getRarityColor(undefined)).toBeNull();
    });
});

// ── Item catalogue rarity integrity ──────────────────────────────────────────

describe('Item rarity integrity', () => {
    const validRarities = new Set(Object.values(RARITIES));

    it('every item has a valid rarity string', () => {
        for (const [id, def] of Object.entries(ITEMS)) {
            expect(validRarities.has(def.rarity),
                `${id} has invalid rarity "${def.rarity}"`)
                .toBe(true);
        }
    });

    it('every item rarity maps to a RARITY_COLORS entry', () => {
        for (const [id, def] of Object.entries(ITEMS)) {
            const rc = getRarityColor(def.rarity);
            expect(rc, `${id} rarity "${def.rarity}" has no colour`).not.toBeNull();
            expect(rc.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
    });

    it('getItem returns definitions with consistent rarity', () => {
        const item = getItem('dragon_lance');
        expect(item).not.toBeNull();
        expect(item.rarity).toBe(RARITIES.LEGENDARY);

        const rc = getRarityColor(item.rarity);
        expect(rc.label).toBe('Legendary');
        expect(rc.glow).toBe(true);
    });

    it('all five rarity tiers are represented in the item catalogue', () => {
        const raritiesInUse = new Set(
            Object.values(ITEMS).map(d => d.rarity)
        );
        for (const r of Object.values(RARITIES)) {
            expect(raritiesInUse.has(r),
                `No items with rarity "${r}" in catalogue`)
                .toBe(true);
        }
    });
});
