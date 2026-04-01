/**
 * Hotbar — 9-slot item/spell bar rendered at the bottom of the screen.
 *
 * Each slot holds null or an item/spell descriptor:
 *   {
 *     type:     'item' | 'spell',   // category
 *     id:       string,             // unique identifier
 *     name:     string,             // display name
 *     icon:     string,             // emoji or short glyph
 *     quantity: number | null,      // stack count (null = no counter)
 *     data:     object,             // arbitrary extra payload
 *   }
 */

const SLOT_COUNT = 9;

export function createHotbar() {
    // ── State ─────────────────────────────────────────────────────────────────
    /** @type {Array<HotbarItem|null>} */
    const slots = Array.from({ length: SLOT_COUNT }, () => null);
    let activeIndex = 0;

    // ── DOM refs ──────────────────────────────────────────────────────────────
    const container = document.getElementById('hotbar');
    const slotEls   = Array.from(container.querySelectorAll('.hotbar-slot'));

    // ── Render ────────────────────────────────────────────────────────────────
    function refreshDOM() {
        slotEls.forEach((el, i) => {
            el.classList.toggle('active', i === activeIndex);

            const iconEl  = el.querySelector('.hotbar-icon');
            const countEl = el.querySelector('.hotbar-count');
            const item    = slots[i];

            if (item) {
                iconEl.textContent  = item.icon ?? '';
                countEl.textContent = (item.quantity != null && item.quantity > 1)
                    ? String(item.quantity)
                    : '';
            } else {
                iconEl.textContent  = '';
                countEl.textContent = '';
            }
        });
    }

    // Initial render to apply the default active state.
    refreshDOM();

    // ── Public API ────────────────────────────────────────────────────────────
    return {
        /**
         * Select a slot by 0-based index (0–8).
         * @param {number} index
         */
        selectSlot(index) {
            if (index < 0 || index >= SLOT_COUNT) return;
            activeIndex = index;
            refreshDOM();
        },

        /**
         * Place an item/spell descriptor into a slot, or pass null to clear it.
         * @param {number} index
         * @param {HotbarItem|null} item
         */
        setItem(index, item) {
            if (index < 0 || index >= SLOT_COUNT) return;
            slots[index] = item;
            refreshDOM();
        },

        /**
         * Retrieve the item/spell in the given slot (0-based).
         * @param {number} index
         * @returns {HotbarItem|null}
         */
        getItem(index) {
            return slots[index] ?? null;
        },

        /** Returns the 0-based index of the currently selected slot. */
        getActiveIndex() {
            return activeIndex;
        },

        /** Returns the item/spell in the currently selected slot, or null. */
        getActiveItem() {
            return slots[activeIndex] ?? null;
        },

        /** Read-only view of all 9 slots. */
        get slots() {
            return slots;
        },
    };
}
