/**
 * Genesis — Inventory & Hotbar state manager.
 *
 * Manages 36-slot inventory (4 rows × 9 cols) + 9-slot hotbar.
 * State is persisted to localStorage on every change.
 */

import { getItem } from './items.js';

const LS_KEY = 'genesis_inventory_v1';

export const HOTBAR_SIZE    = 9;
export const INVENTORY_ROWS = 4;
export const INVENTORY_COLS = 9;
export const INVENTORY_SIZE = INVENTORY_ROWS * INVENTORY_COLS; // 36

/**
 * @typedef {{ itemId: string, count: number }} Slot
 * @typedef {Slot | null} MaybeSlot
 */

// ── Starter kit ──────────────────────────────────────────────────────────────
// Give every new player a sampler across all item categories.
function buildDefaultState() {
    const inventory = Array(INVENTORY_SIZE).fill(null);
    const hotbar    = Array(HOTBAR_SIZE).fill(null);

    // Inventory — row 0
    inventory[0]  = { itemId: 'iron_sword',    count: 1 };
    inventory[1]  = { itemId: 'elven_bow',     count: 1 };
    inventory[2]  = { itemId: 'fireball',      count: 1 };
    inventory[3]  = { itemId: 'frost_bolt',    count: 1 };
    inventory[4]  = { itemId: 'health_potion', count: 8 };
    inventory[5]  = { itemId: 'mana_potion',   count: 4 };
    inventory[6]  = { itemId: 'bread',         count: 10 };
    inventory[7]  = { itemId: 'torch',         count: 6 };
    inventory[8]  = { itemId: 'mushroom',      count: 5 };
    // Inventory — row 1
    inventory[9]  = { itemId: 'wood',          count: 32 };
    inventory[10] = { itemId: 'stone',         count: 16 };
    inventory[11] = { itemId: 'iron_ore',      count: 8  };
    inventory[12] = { itemId: 'crystal',       count: 3  };
    inventory[13] = { itemId: 'moonstone',     count: 1  };
    inventory[14] = { itemId: 'golden_apple',  count: 1  };
    inventory[15] = { itemId: 'stardust',      count: 2  };
    inventory[16] = { itemId: 'map_fragment',  count: 3  };
    inventory[17] = { itemId: 'compass',       count: 1  };
    // Inventory — row 2
    inventory[18] = { itemId: 'pickaxe',       count: 1  };
    inventory[19] = { itemId: 'axe',           count: 1  };
    inventory[20] = { itemId: 'lightning',     count: 1  };
    inventory[21] = { itemId: 'nature_call',   count: 1  };
    inventory[22] = { itemId: 'void_rift',     count: 1  };
    inventory[23] = { itemId: 'shadow_dagger', count: 1  };
    inventory[24] = { itemId: 'dragon_lance',  count: 1  };

    // Pre-fill hotbar with a sensible loadout
    hotbar[0] = { itemId: 'iron_sword',    count: 1 };
    hotbar[1] = { itemId: 'elven_bow',     count: 1 };
    hotbar[2] = { itemId: 'fireball',      count: 1 };
    hotbar[3] = { itemId: 'health_potion', count: 8 };
    hotbar[4] = { itemId: 'torch',         count: 6 };

    return { inventory, hotbar, selectedHotbarSlot: 0 };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function ensureSize(arr, size) {
    const out = Array(size).fill(null);
    for (let i = 0; i < Math.min(arr.length, size); i++) {
        out[i] = arr[i] ?? null;
    }
    return out;
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create and return an inventory system instance.
 * Loads persisted state from localStorage (or defaults on first visit / corrupt data).
 */
export function createInventorySystem() {
    let state = loadState();
    const listeners = new Set();

    // ── Persistence ────────────────────────────────────────────────────────

    function loadState() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    inventory:          ensureSize(parsed.inventory ?? [], INVENTORY_SIZE),
                    hotbar:             ensureSize(parsed.hotbar    ?? [], HOTBAR_SIZE),
                    selectedHotbarSlot: parsed.selectedHotbarSlot   ?? 0,
                };
            }
        } catch {
            // Corrupt or missing — fall through to defaults.
        }
        return buildDefaultState();
    }

    function saveState() {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(state));
        } catch {
            // Storage quota exceeded or private-browsing — silent fail.
        }
    }

    function notify() {
        saveState();
        for (const fn of listeners) fn(state);
    }

    // ── Mutations ─────────────────────────────────────────────────────────

    /**
     * Move (or swap) an item between any two slots.
     * If src and dst hold the same stackable item, merge stacks first.
     *
     * @param {'inventory'|'hotbar'} srcZone
     * @param {number}               srcIdx
     * @param {'inventory'|'hotbar'} dstZone
     * @param {number}               dstIdx
     */
    function moveItem(srcZone, srcIdx, dstZone, dstIdx) {
        const srcArr = srcZone === 'hotbar' ? state.hotbar : state.inventory;
        const dstArr = dstZone === 'hotbar' ? state.hotbar : state.inventory;

        const srcSlot = srcArr[srcIdx];
        if (!srcSlot) return; // nothing to drag

        const dstSlot = dstArr[dstIdx];

        // Attempt stack merge when both slots hold the same stackable item.
        if (
            dstSlot &&
            dstSlot.itemId === srcSlot.itemId &&
            getItem(srcSlot.itemId)?.stackable
        ) {
            const def       = getItem(srcSlot.itemId);
            const maxStack  = def.maxStack ?? 99;
            const canAdd    = maxStack - dstSlot.count;
            const transfer  = Math.min(srcSlot.count, canAdd);

            if (transfer > 0) {
                dstArr[dstIdx] = { itemId: dstSlot.itemId, count: dstSlot.count + transfer };
                const leftover = srcSlot.count - transfer;
                srcArr[srcIdx] = leftover > 0 ? { itemId: srcSlot.itemId, count: leftover } : null;
                notify();
                return;
            }
        }

        // Otherwise do a plain swap.
        srcArr[srcIdx] = dstSlot;
        dstArr[dstIdx] = srcSlot;
        notify();
    }

    /**
     * Add `count` units of `itemId` to the inventory.
     * Stacks into existing slots first, then fills empty ones.
     * Returns any leftover count that couldn't fit.
     *
     * @param {string} itemId
     * @param {number} [count=1]
     * @returns {number} leftover (0 if everything fit)
     */
    function addItem(itemId, count = 1) {
        const def = getItem(itemId);
        if (!def) return count;

        let remaining = count;

        if (def.stackable) {
            const maxStack = def.maxStack ?? 99;
            for (let i = 0; i < state.inventory.length && remaining > 0; i++) {
                const slot = state.inventory[i];
                if (slot && slot.itemId === itemId && slot.count < maxStack) {
                    const add = Math.min(remaining, maxStack - slot.count);
                    state.inventory[i] = { itemId, count: slot.count + add };
                    remaining -= add;
                }
            }
        }

        for (let i = 0; i < state.inventory.length && remaining > 0; i++) {
            if (!state.inventory[i]) {
                const maxStack = def.stackable ? (def.maxStack ?? 99) : 1;
                const place    = Math.min(remaining, maxStack);
                state.inventory[i] = { itemId, count: place };
                remaining -= place;
            }
        }

        notify();
        return remaining;
    }

    /**
     * Select a hotbar slot by index (0-based).
     * @param {number} index  0–8
     */
    function selectHotbarSlot(index) {
        const clamped = Math.max(0, Math.min(HOTBAR_SIZE - 1, index));
        if (clamped === state.selectedHotbarSlot) return;
        state.selectedHotbarSlot = clamped;
        notify();
    }

    /** @returns {MaybeSlot} */
    function getSelectedItem() {
        return state.hotbar[state.selectedHotbarSlot] ?? null;
    }

    /**
     * Subscribe to state changes.
     * @param {(state: object) => void} fn
     * @returns {() => void} unsubscribe
     */
    function on(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    /** Reset to the default starter kit. */
    function reset() {
        state = buildDefaultState();
        notify();
    }

    return {
        get inventory()          { return state.inventory; },
        get hotbar()             { return state.hotbar;    },
        get selectedHotbarSlot() { return state.selectedHotbarSlot; },
        moveItem,
        addItem,
        selectHotbarSlot,
        getSelectedItem,
        on,
        reset,
    };
}
