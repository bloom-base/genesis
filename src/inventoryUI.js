/**
 * Genesis — Inventory UI
 *
 * Renders:
 *  • #hotbar           — 9-slot bar at the bottom of the HUD (always visible in-world)
 *  • #inventory-panel  — full inventory window (toggle with I / E)
 *
 * Drag-and-drop works between every slot pair (inventory ↔ inventory,
 * inventory ↔ hotbar, hotbar ↔ hotbar).
 */

import { CATEGORIES, getItem } from './items.js';
import { HOTBAR_SIZE, INVENTORY_SIZE } from './inventory.js';

// ── Rarity colour map ─────────────────────────────────────────────────────────
const RARITY_BORDER = {
    common:    'rgba(157,157,157,0.55)',
    uncommon:  'rgba(30,255,0,0.55)',
    rare:      'rgba(0,112,221,0.65)',
    epic:      'rgba(163,53,238,0.75)',
    legendary: 'rgba(255,128,0,0.85)',
};

// ── Category tab config ───────────────────────────────────────────────────────
const TABS = [
    { id: 'all',                    label: '📦', title: 'All items'   },
    { id: CATEGORIES.WEAPON,        label: '⚔️', title: 'Weapons'    },
    { id: CATEGORIES.CONSUMABLE,    label: '🧪', title: 'Consumables' },
    { id: CATEGORIES.MATERIAL,      label: '🪨', title: 'Materials'  },
    { id: CATEGORIES.SPELL,         label: '✨', title: 'Spells'     },
    { id: CATEGORIES.TOOL,          label: '⚙️', title: 'Tools'      },
];

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * @param {ReturnType<import('./inventory.js').createInventorySystem>} invSystem
 */
export function createInventoryUI(invSystem) {

    // DOM refs
    const hotbarEl       = document.getElementById('hotbar');
    const panelEl        = document.getElementById('inventory-panel');
    const gridEl         = document.getElementById('inventory-grid');
    const panelHotbarEl  = document.getElementById('inv-panel-hotbar');
    const tabBarEl       = document.getElementById('inventory-tabs');
    const closeBtn       = document.getElementById('inventory-close');
    const selectedNameEl = document.getElementById('selected-item-name');

    let activeCategory = 'all';

    /** @type {{ zone: 'inventory'|'hotbar', index: number } | null} */
    let dragState = null;

    // ── Drag helpers ──────────────────────────────────────────────────────────

    function onDragStart(zone, index, e) {
        const slot = zone === 'hotbar'
            ? invSystem.hotbar[index]
            : invSystem.inventory[index];
        if (!slot) { e.preventDefault(); return; }
        dragState = { zone, index };
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('dragging');
    }

    function onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
    }

    function onDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    function onDrop(zone, index, e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        if (!dragState) return;
        if (dragState.zone === zone && dragState.index === index) return;
        invSystem.moveItem(dragState.zone, dragState.index, zone, index);
        dragState = null;
    }

    function onDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        dragState = null;
    }

    // ── Slot builder ──────────────────────────────────────────────────────────

    /**
     * Build a single inventory/hotbar slot element.
     *
     * @param {'inventory'|'hotbar'} zone
     * @param {number}               index
     * @param {import('./inventory.js').MaybeSlot} slotData
     * @param {{ keyHint?: boolean }} [opts]
     * @returns {HTMLElement}
     */
    function buildSlot(zone, index, slotData, { keyHint = false } = {}) {
        const el = document.createElement('div');
        el.className = 'inv-slot';
        el.dataset.zone  = zone;
        el.dataset.index = String(index);

        // Highlight the active hotbar slot
        if (zone === 'hotbar' && index === invSystem.selectedHotbarSlot) {
            el.classList.add('selected');
        }

        if (slotData) {
            const def = getItem(slotData.itemId);
            if (def) {
                el.classList.add(`rarity-${def.rarity}`);
                el.draggable = true;

                // Icon
                const iconEl = document.createElement('span');
                iconEl.className = 'slot-icon';
                iconEl.textContent = def.icon;
                el.appendChild(iconEl);

                // Stack count
                if (def.stackable && slotData.count > 1) {
                    const countEl = document.createElement('span');
                    countEl.className = 'slot-count';
                    countEl.textContent = slotData.count;
                    el.appendChild(countEl);
                }

                // Native tooltip
                const rarityLabel    = def.rarity.charAt(0).toUpperCase()    + def.rarity.slice(1);
                const categoryLabel  = def.category.charAt(0).toUpperCase()  + def.category.slice(1);
                el.title = `${def.name}\n${rarityLabel} · ${categoryLabel}\n${def.description}`;

                el.addEventListener('dragstart', (e) => onDragStart(zone, index, e));
                el.addEventListener('dragend',   onDragEnd);
            }
        }

        el.addEventListener('dragover',  onDragOver);
        el.addEventListener('dragleave', onDragLeave);
        el.addEventListener('drop',      (e) => onDrop(zone, index, e));

        // 1–9 key hint badge (hotbar only)
        if (keyHint) {
            const keyEl = document.createElement('span');
            keyEl.className = 'slot-key';
            keyEl.textContent = index + 1;
            el.appendChild(keyEl);
        }

        return el;
    }

    // ── Render functions ──────────────────────────────────────────────────────

    function renderHotbar() {
        hotbarEl.innerHTML = '';
        for (let i = 0; i < HOTBAR_SIZE; i++) {
            hotbarEl.appendChild(buildSlot('hotbar', i, invSystem.hotbar[i], { keyHint: true }));
        }
    }

    function renderPanelHotbar() {
        panelHotbarEl.innerHTML = '';
        for (let i = 0; i < HOTBAR_SIZE; i++) {
            panelHotbarEl.appendChild(buildSlot('hotbar', i, invSystem.hotbar[i], { keyHint: true }));
        }
    }

    function renderInventoryGrid() {
        gridEl.innerHTML = '';
        for (let i = 0; i < INVENTORY_SIZE; i++) {
            const slot = invSystem.inventory[i];
            const el   = buildSlot('inventory', i, slot);

            // Dim slots that don't match the active category filter
            if (activeCategory !== 'all' && slot) {
                const def = getItem(slot.itemId);
                if (!def || def.category !== activeCategory) {
                    el.classList.add('filtered');
                }
            }

            gridEl.appendChild(el);
        }
    }

    function updateSelectedItemName() {
        if (!selectedNameEl) return;
        const slot = invSystem.getSelectedItem();
        if (slot) {
            const def = getItem(slot.itemId);
            selectedNameEl.textContent = def ? def.name : '';
            selectedNameEl.style.opacity = '1';
            // Fade out after 2 s
            clearTimeout(selectedNameEl._fadeTimer);
            selectedNameEl._fadeTimer = setTimeout(() => {
                selectedNameEl.style.opacity = '0';
            }, 2000);
        } else {
            selectedNameEl.textContent = '';
            selectedNameEl.style.opacity = '0';
        }
    }

    // ── Category tabs ─────────────────────────────────────────────────────────

    function buildCategoryTabs() {
        tabBarEl.innerHTML = '';
        for (const tab of TABS) {
            const btn = document.createElement('button');
            btn.className = 'inv-tab' + (tab.id === activeCategory ? ' active' : '');
            btn.title     = tab.title;
            btn.innerHTML = tab.label;
            btn.addEventListener('click', () => {
                activeCategory = tab.id;
                tabBarEl.querySelectorAll('.inv-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderInventoryGrid();
            });
            tabBarEl.appendChild(btn);
        }
    }

    // ── Close handlers ────────────────────────────────────────────────────────

    closeBtn.addEventListener('click', () => {
        panelEl.dispatchEvent(new CustomEvent('request-close'));
    });

    // Clicking the dark backdrop behind the window closes the panel
    panelEl.addEventListener('click', (e) => {
        if (e.target === panelEl) {
            panelEl.dispatchEvent(new CustomEvent('request-close'));
        }
    });

    // ── Subscribe to state ────────────────────────────────────────────────────

    invSystem.on(() => {
        renderHotbar();
        updateSelectedItemName();
        if (isOpen()) {
            renderInventoryGrid();
            renderPanelHotbar();
        }
    });

    // ── Initial render ────────────────────────────────────────────────────────

    buildCategoryTabs();
    renderHotbar();
    updateSelectedItemName();

    // ── Public API ────────────────────────────────────────────────────────────

    function isOpen() {
        return panelEl.style.display === 'flex';
    }

    function open() {
        panelEl.style.display = 'flex';
        renderInventoryGrid();
        renderPanelHotbar();
    }

    function close() {
        panelEl.style.display = 'none';
    }

    return { open, close, isOpen };
}
