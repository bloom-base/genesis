/**
 * Genesis — Inventory UI
 *
 * Renders:
 *  • #hotbar           — 9-slot bar at the bottom of the HUD (always visible in-world)
 *  • #inventory-panel  — full inventory window (toggle with I / E)
 *
 * Drag-and-drop works between every slot pair (inventory ↔ inventory,
 * inventory ↔ hotbar, hotbar ↔ hotbar).
 *
 * Hovering an occupied slot shows a cursor-following tooltip with the item's
 * name, rarity, category, description, and any special properties.
 */

import { CATEGORIES, getItem, RARITY_COLORS } from './items.js';
import { HOTBAR_SIZE, INVENTORY_SIZE } from './inventory.js';
import { playItemMoveSound } from './audio.js';

// ── Category tab config ───────────────────────────────────────────────────────
const TABS = [
    { id: 'all',                    label: '📦', title: 'All items'   },
    { id: CATEGORIES.WEAPON,        label: '⚔️', title: 'Weapons'    },
    { id: CATEGORIES.CONSUMABLE,    label: '🧪', title: 'Consumables' },
    { id: CATEGORIES.MATERIAL,      label: '🪨', title: 'Materials'  },
    { id: CATEGORIES.SPELL,         label: '✨', title: 'Spells'     },
    { id: CATEGORIES.TOOL,          label: '⚙️', title: 'Tools'      },
];

// ── Tooltip offset from cursor (px) ──────────────────────────────────────────
const TOOLTIP_OFFSET_X = 14;
const TOOLTIP_OFFSET_Y = 14;

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

    // ── Floating tooltip ────────────────────────────────────────────────────

    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'floating-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltipEl);

    /** Currently hovered item id (null = hidden) */
    let tooltipItemId = null;

    /**
     * Position the floating tooltip near the cursor, clamped to the viewport.
     * @param {number} clientX
     * @param {number} clientY
     */
    function positionTooltip(clientX, clientY) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const tw = tooltipEl.offsetWidth;
        const th = tooltipEl.offsetHeight;

        // Default: bottom-right of cursor
        let x = clientX + TOOLTIP_OFFSET_X;
        let y = clientY + TOOLTIP_OFFSET_Y;

        // Flip left if it would overflow the right edge
        if (x + tw > vw - 4) x = clientX - tw - TOOLTIP_OFFSET_X;
        // Flip up if it would overflow the bottom
        if (y + th > vh - 4) y = clientY - th - TOOLTIP_OFFSET_Y;

        // Clamp to viewport
        x = Math.max(4, Math.min(x, vw - tw - 4));
        y = Math.max(4, Math.min(y, vh - th - 4));

        tooltipEl.style.left = `${x}px`;
        tooltipEl.style.top  = `${y}px`;
    }

    /**
     * Show the floating tooltip for a given item.
     * @param {import('./items.js').ItemDef} def
     * @param {number} count
     * @param {number} clientX
     * @param {number} clientY
     */
    function showTooltip(def, count, clientX, clientY) {
        const rc = RARITY_COLORS[def.rarity];
        const rarityLabel   = rc ? rc.label : def.rarity;
        const categoryLabel = def.category.charAt(0).toUpperCase() + def.category.slice(1);
        const colorHex      = rc ? rc.hex : '#fff';

        // Reset classes — keep only base + rarity
        tooltipEl.className = `floating-tooltip rarity-${def.rarity}`;

        let html =
            `<span class="tooltip-name" style="color:${colorHex}">${def.name}</span>` +
            `<span class="tooltip-rarity" style="color:${colorHex}">${rarityLabel}</span>` +
            `<span class="tooltip-category">${categoryLabel}</span>` +
            `<span class="tooltip-desc">${def.description}</span>`;

        // Special properties
        if (def.properties && def.properties.length > 0) {
            html += '<div class="tooltip-props">';
            for (const prop of def.properties) {
                html += `<span class="tooltip-prop"><span class="prop-label">${prop.label}:</span> <span class="prop-value">${prop.value}</span></span>`;
            }
            html += '</div>';
        }

        // Stack info for stackable items
        if (def.stackable && count > 1) {
            const max = def.maxStack || 99;
            html += `<span class="tooltip-stack">${count} / ${max}</span>`;
        }

        tooltipEl.innerHTML = html;
        tooltipEl.classList.add('visible');
        tooltipItemId = def.id;
        positionTooltip(clientX, clientY);
    }

    function hideTooltip() {
        tooltipEl.classList.remove('visible');
        tooltipItemId = null;
    }

    // ── Drag helpers ──────────────────────────────────────────────────────────

    function onDragStart(zone, index, e) {
        const slot = zone === 'hotbar'
            ? invSystem.hotbar[index]
            : invSystem.inventory[index];
        if (!slot) { e.preventDefault(); return; }
        dragState = { zone, index };
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('dragging');
        hideTooltip();
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
        playItemMoveSound();
        dragState = null;
    }

    function onDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        dragState = null;
    }

    // ── Slot hover handlers ─────────────────────────────────────────────────

    function onSlotMouseEnter(zone, index, e) {
        if (dragState) return; // no tooltip while dragging
        const slotData = zone === 'hotbar'
            ? invSystem.hotbar[index]
            : invSystem.inventory[index];
        if (!slotData) return;
        const def = getItem(slotData.itemId);
        if (!def) return;
        showTooltip(def, slotData.count, e.clientX, e.clientY);
    }

    function onSlotMouseMove(e) {
        if (tooltipItemId) {
            positionTooltip(e.clientX, e.clientY);
        }
    }

    function onSlotMouseLeave() {
        hideTooltip();
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
                const rc = RARITY_COLORS[def.rarity];

                el.classList.add(`rarity-${def.rarity}`);
                el.draggable = true;

                // Apply rarity background tint
                if (rc) {
                    el.style.background =
                        `radial-gradient(ellipse at center, ${rc.hex}18 0%, ${rc.hex}08 60%, transparent 100%), rgba(8,12,20,0.72)`;
                }

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

                // Hover tooltip handlers
                el.addEventListener('mouseenter', (e) => onSlotMouseEnter(zone, index, e));
                el.addEventListener('mousemove',  onSlotMouseMove);
                el.addEventListener('mouseleave', onSlotMouseLeave);

                // Drag handlers
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
        hideTooltip();              // clear stale tooltip on state change
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
        hideTooltip();
    }

    return { open, close, isOpen };
}
