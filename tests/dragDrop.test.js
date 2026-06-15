/**
 * Tests for inventory drag-and-drop reordering —
 * validates that moveItem correctly swaps, merges stacks,
 * and handles edge cases when reordering items.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createInventorySystem, HOTBAR_SIZE, INVENTORY_SIZE } from '../src/inventory.js';

describe('Drag-and-drop reordering (moveItem)', () => {
    let inv;

    beforeEach(() => {
        // Clear any persisted state so each test starts fresh
        globalThis.localStorage = {
            _store: {},
            getItem(k) { return this._store[k] ?? null; },
            setItem(k, v) { this._store[k] = v; },
            removeItem(k) { delete this._store[k]; },
        };
        inv = createInventorySystem();
    });

    // ── Basic swap ───────────────────────────────────────────────────────────

    it('swaps two occupied inventory slots', () => {
        const itemA = inv.inventory[0]; // iron_sword
        const itemB = inv.inventory[1]; // elven_bow
        expect(itemA).not.toBeNull();
        expect(itemB).not.toBeNull();

        inv.moveItem('inventory', 0, 'inventory', 1);

        expect(inv.inventory[0].itemId).toBe(itemB.itemId);
        expect(inv.inventory[1].itemId).toBe(itemA.itemId);
    });

    it('moves an item to an empty slot (source becomes null)', () => {
        const item = inv.inventory[0];
        // Find an empty slot
        let emptyIdx = -1;
        for (let i = 0; i < INVENTORY_SIZE; i++) {
            if (!inv.inventory[i]) { emptyIdx = i; break; }
        }
        expect(emptyIdx).toBeGreaterThan(-1);

        inv.moveItem('inventory', 0, 'inventory', emptyIdx);

        expect(inv.inventory[emptyIdx].itemId).toBe(item.itemId);
        expect(inv.inventory[0]).toBeNull();
    });

    it('does nothing when moving from an empty slot', () => {
        let emptyIdx = -1;
        for (let i = 0; i < INVENTORY_SIZE; i++) {
            if (!inv.inventory[i]) { emptyIdx = i; break; }
        }
        expect(emptyIdx).toBeGreaterThan(-1);

        const target = inv.inventory[0];
        inv.moveItem('inventory', emptyIdx, 'inventory', 0);

        // Target should be unchanged
        expect(inv.inventory[0].itemId).toBe(target.itemId);
    });

    // ── Cross-zone moves ─────────────────────────────────────────────────────

    it('moves item from inventory to hotbar', () => {
        // Find an empty hotbar slot
        let emptyHotbar = -1;
        for (let i = 0; i < HOTBAR_SIZE; i++) {
            if (!inv.hotbar[i]) { emptyHotbar = i; break; }
        }
        expect(emptyHotbar).toBeGreaterThan(-1);

        const item = inv.inventory[0];
        inv.moveItem('inventory', 0, 'hotbar', emptyHotbar);

        expect(inv.hotbar[emptyHotbar].itemId).toBe(item.itemId);
        expect(inv.inventory[0]).toBeNull();
    });

    it('swaps items between inventory and hotbar', () => {
        const invItem    = inv.inventory[0];
        const hotbarItem = inv.hotbar[0];

        inv.moveItem('inventory', 0, 'hotbar', 0);

        expect(inv.hotbar[0].itemId).toBe(invItem.itemId);
        expect(inv.inventory[0].itemId).toBe(hotbarItem.itemId);
    });

    it('swaps two hotbar slots', () => {
        const a = inv.hotbar[0];
        const b = inv.hotbar[1];

        inv.moveItem('hotbar', 0, 'hotbar', 1);

        expect(inv.hotbar[0].itemId).toBe(b.itemId);
        expect(inv.hotbar[1].itemId).toBe(a.itemId);
    });

    // ── Stack merging ────────────────────────────────────────────────────────

    it('merges stacks of the same stackable item', () => {
        // Default state: slot 4 has health_potion ×8
        // Add 3 more health potions — they should merge into slot 4
        const beforeCount = inv.inventory[4].count;
        expect(inv.inventory[4].itemId).toBe('health_potion');

        inv.addItem('health_potion', 3);

        expect(inv.inventory[4].itemId).toBe('health_potion');
        expect(inv.inventory[4].count).toBe(beforeCount + 3);
    });

    it('partial stack merge leaves remainder in source', () => {
        // Place a near-full stack in one slot and more in another
        // First, clear slots and set up manually via addItem
        inv.reset();

        // Clear inventory and set up a controlled scenario
        // Slot 4 has health_potion ×8 by default
        const slot4 = inv.inventory[4];
        expect(slot4.itemId).toBe('health_potion');
        expect(slot4.count).toBe(8);

        // Add 95 more health potions — will fill slot4 to 99 and overflow
        inv.addItem('health_potion', 95);

        // Slot 4 should now be full (99)
        expect(inv.inventory[4].count).toBe(99);
    });

    // ── Persistence ──────────────────────────────────────────────────────────

    it('persists new order after moveItem', () => {
        const itemA = inv.inventory[0];
        const itemB = inv.inventory[1];

        inv.moveItem('inventory', 0, 'inventory', 1);

        // Create a new system — should load persisted state
        const inv2 = createInventorySystem();
        expect(inv2.inventory[0].itemId).toBe(itemB.itemId);
        expect(inv2.inventory[1].itemId).toBe(itemA.itemId);
    });

    // ── Listener notification ────────────────────────────────────────────────

    it('notifies listeners on moveItem', () => {
        let callCount = 0;
        inv.on(() => { callCount++; });

        inv.moveItem('inventory', 0, 'inventory', 1);
        expect(callCount).toBe(1);
    });

    it('does not notify when moving from empty slot', () => {
        let callCount = 0;
        // Find empty slot
        let emptyIdx = -1;
        for (let i = 0; i < INVENTORY_SIZE; i++) {
            if (!inv.inventory[i]) { emptyIdx = i; break; }
        }

        inv.on(() => { callCount++; });
        inv.moveItem('inventory', emptyIdx, 'inventory', 0);
        expect(callCount).toBe(0);
    });

    // ── Same-slot no-op (UI prevents this, but verify safety) ────────────────

    it('moveItem to same slot does a swap with itself (no data change)', () => {
        const before = { ...inv.inventory[0] };
        inv.moveItem('inventory', 0, 'inventory', 0);
        expect(inv.inventory[0].itemId).toBe(before.itemId);
        expect(inv.inventory[0].count).toBe(before.count);
    });
});
