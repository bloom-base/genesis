/**
 * Tests for inventory item tooltip data — validates that item properties
 * are well-formed and that every item has the fields needed for rich tooltips.
 */

import { describe, it, expect } from 'vitest';
import { ITEMS, getItem, RARITY_COLORS, RARITIES } from '../src/items.js';

// ── Item tooltip data completeness ──────────────────────────────────────────

describe('Item tooltip fields', () => {
    it('every item has a non-empty name', () => {
        for (const [id, def] of Object.entries(ITEMS)) {
            expect(typeof def.name, `${id} name`).toBe('string');
            expect(def.name.length, `${id} name length`).toBeGreaterThan(0);
        }
    });

    it('every item has a non-empty description', () => {
        for (const [id, def] of Object.entries(ITEMS)) {
            expect(typeof def.description, `${id} description`).toBe('string');
            expect(def.description.length, `${id} description length`).toBeGreaterThan(0);
        }
    });

    it('every item has an icon', () => {
        for (const [id, def] of Object.entries(ITEMS)) {
            expect(typeof def.icon, `${id} icon`).toBe('string');
            expect(def.icon.length, `${id} icon length`).toBeGreaterThan(0);
        }
    });

    it('every item has a valid category string', () => {
        for (const [id, def] of Object.entries(ITEMS)) {
            expect(typeof def.category, `${id} category`).toBe('string');
            expect(def.category.length, `${id} category length`).toBeGreaterThan(0);
        }
    });
});

// ── Item properties validation ──────────────────────────────────────────────

describe('Item properties', () => {
    it('properties, when present, is an array of { label, value } objects', () => {
        for (const [id, def] of Object.entries(ITEMS)) {
            if (def.properties === undefined) continue;
            expect(Array.isArray(def.properties), `${id} properties is array`).toBe(true);
            for (const prop of def.properties) {
                expect(typeof prop.label, `${id} prop label`).toBe('string');
                expect(prop.label.length, `${id} prop label length`).toBeGreaterThan(0);
                expect(typeof prop.value, `${id} prop value`).toBe('string');
                expect(prop.value.length, `${id} prop value length`).toBeGreaterThan(0);
            }
        }
    });

    it('all weapons have properties', () => {
        for (const [id, def] of Object.entries(ITEMS)) {
            if (def.category !== 'weapon') continue;
            expect(def.properties, `${id} should have properties`).toBeDefined();
            expect(def.properties.length, `${id} properties length`).toBeGreaterThan(0);
        }
    });

    it('all spells have properties', () => {
        for (const [id, def] of Object.entries(ITEMS)) {
            if (def.category !== 'spell') continue;
            expect(def.properties, `${id} should have properties`).toBeDefined();
            expect(def.properties.length, `${id} properties length`).toBeGreaterThan(0);
        }
    });

    it('all consumables have properties', () => {
        for (const [id, def] of Object.entries(ITEMS)) {
            if (def.category !== 'consumable') continue;
            expect(def.properties, `${id} should have properties`).toBeDefined();
            expect(def.properties.length, `${id} properties length`).toBeGreaterThan(0);
        }
    });

    it('weapons have a Damage property', () => {
        for (const [id, def] of Object.entries(ITEMS)) {
            if (def.category !== 'weapon') continue;
            const hasDamage = def.properties.some(p => p.label === 'Damage');
            expect(hasDamage, `${id} should have Damage property`).toBe(true);
        }
    });

    it('spells have a Mana cost property', () => {
        for (const [id, def] of Object.entries(ITEMS)) {
            if (def.category !== 'spell') continue;
            const hasManaCost = def.properties.some(p => p.label === 'Mana cost');
            expect(hasManaCost, `${id} should have Mana cost property`).toBe(true);
        }
    });
});

// ── Tooltip data cross-references ───────────────────────────────────────────

describe('Tooltip rarity colour availability', () => {
    it('every item rarity has a matching colour for tooltip rendering', () => {
        for (const [id, def] of Object.entries(ITEMS)) {
            const rc = RARITY_COLORS[def.rarity];
            expect(rc, `${id} rarity "${def.rarity}" has no colour`).toBeDefined();
            expect(rc.hex, `${id} colour hex`).toMatch(/^#[0-9a-fA-F]{6}$/);
            expect(rc.label, `${id} colour label`).toBeTruthy();
        }
    });
});

// ── getItem lookup ──────────────────────────────────────────────────────────

describe('getItem for tooltip display', () => {
    it('returns full item data including properties for dragon_lance', () => {
        const item = getItem('dragon_lance');
        expect(item).not.toBeNull();
        expect(item.name).toBe('Dragon Lance');
        expect(item.rarity).toBe(RARITIES.LEGENDARY);
        expect(item.description).toBeTruthy();
        expect(item.properties).toBeDefined();
        expect(item.properties.length).toBeGreaterThanOrEqual(2);
    });

    it('returns full item data including properties for fireball', () => {
        const item = getItem('fireball');
        expect(item).not.toBeNull();
        expect(item.name).toBe('Fireball');
        expect(item.properties).toBeDefined();
        const dmgProp = item.properties.find(p => p.label === 'Damage');
        expect(dmgProp).toBeDefined();
        expect(dmgProp.value).toBe('25 Fire');
    });

    it('returns null for unknown items', () => {
        expect(getItem('nonexistent')).toBeNull();
    });
});
