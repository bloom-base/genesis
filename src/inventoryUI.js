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

    // ── Drag ghost element ───────────────────────────────────────────────────

    const ghostEl = document.createElement('div');
    ghostEl.className = 'drag-ghost';
    ghostEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ghostEl);

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

    // ── Custom mouse-based drag helpers ─────────────────────────────────────

    /** Minimum px movement before a mousedown becomes a drag. */
    const DRAG_THRESHOLD = 4;
    /** Tracks whether we've passed the drag threshold and started dragging. */
    let dragStarted = false;
    /** mousedown origin for threshold check. */
    let dragOrigin = { x: 0, y: 0 };
    /** The DOM element of the slot being dragged. */
    let dragSourceEl = null;

    /**
     * Position the ghost element centered on the cursor.
     * @param {number} clientX
     * @param {number} clientY
     */
    function positionGhost(clientX, clientY) {
        ghostEl.style.left = `${clientX}px`;
        ghostEl.style.top  = `${clientY}px`;
    }

    /**
     * Show the drag ghost with the item's icon and rarity.
     * @param {import('./items.js').ItemDef} def
     * @param {number} count
     * @param {number} clientX
     * @param {number} clientY
     */
    function showGhost(def, count, clientX, clientY) {
        const rc = RARITY_COLORS[def.rarity];
        ghostEl.className = `drag-ghost visible rarity-${def.rarity}`;

        let html = `<span class="ghost-icon">${def.icon}</span>`;
        if (def.stackable && count > 1) {
            html += `<span class="ghost-count">${count}</span>`;
        }
        ghostEl.innerHTML = html;

        // Apply rarity background tint
        if (rc) {
            ghostEl.style.background =
                `radial-gradient(ellipse at center, ${rc.hex}28 0%, ${rc.hex}10 60%, rgba(8,12,20,0.92) 100%)`;
        } else {
            ghostEl.style.background = 'rgba(8,12,20,0.92)';
        }

        positionGhost(clientX, clientY);
    }

    function hideGhost() {
        ghostEl.classList.remove('visible');
        ghostEl.innerHTML = '';
    }

    /**
     * Find the .inv-slot element under the given cursor position,
     * excluding the ghost itself.
     * @param {number} clientX
     * @param {number} clientY
     * @returns {HTMLElement|null}
     */
    function getSlotAtPoint(clientX, clientY) {
        // Temporarily hide ghost so elementFromPoint can see through it
        ghostEl.style.pointerEvents = 'none';
        const el = document.elementFromPoint(clientX, clientY);
        if (!el) return null;
        return el.closest('.inv-slot');
    }

    /** Clear all .drag-over highlights. */
    function clearDragOverHighlights() {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    function onMouseDown(zone, index, e) {
        // Only respond to primary button
        if (e.button !== 0) return;
        const slot = zone === 'hotbar'
            ? invSystem.hotbar[index]
            : invSystem.inventory[index];
        if (!slot) return;

        dragState  = { zone, index };
        dragOrigin = { x: e.clientX, y: e.clientY };
        dragStarted = false;
        dragSourceEl = e.currentTarget;

        // Prevent text selection while dragging
        e.preventDefault();
    }

    function onMouseMove(e) {
        if (!dragState) return;

        // Check drag threshold before starting visual drag
        if (!dragStarted) {
            const dx = e.clientX - dragOrigin.x;
            const dy = e.clientY - dragOrigin.y;
            if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

            // Threshold met — begin visual drag
            dragStarted = true;
            hideTooltip();

            if (dragSourceEl) dragSourceEl.classList.add('dragging');

            const slotData = dragState.zone === 'hotbar'
                ? invSystem.hotbar[dragState.index]
                : invSystem.inventory[dragState.index];
            if (slotData) {
                const def = getItem(slotData.itemId);
                if (def) showGhost(def, slotData.count, e.clientX, e.clientY);
            }
        }

        positionGhost(e.clientX, e.clientY);

        // Highlight the slot under the cursor
        clearDragOverHighlights();
        const targetSlot = getSlotAtPoint(e.clientX, e.clientY);
        if (targetSlot && targetSlot !== dragSourceEl) {
            targetSlot.classList.add('drag-over');
        }
    }

    function onMouseUp(e) {
        if (!dragState) return;

        if (dragStarted) {
            // Find target slot under cursor
            const targetSlot = getSlotAtPoint(e.clientX, e.clientY);
            if (targetSlot) {
                const dstZone  = /** @type {'inventory'|'hotbar'} */ (targetSlot.dataset.zone);
                const dstIndex = parseInt(targetSlot.dataset.index, 10);

                if (dstZone && !isNaN(dstIndex) &&
                    !(dragState.zone === dstZone && dragState.index === dstIndex)) {
                    invSystem.moveItem(dragState.zone, dragState.index, dstZone, dstIndex);
                    playItemMoveSound();
                }
            }

            // Clean up visual states
            if (dragSourceEl) dragSourceEl.classList.remove('dragging');
            clearDragOverHighlights();
            hideGhost();
        }

        dragState    = null;
        dragStarted  = false;
        dragSourceEl = null;
    }

    // Global listeners for mousemove / mouseup (only needed on document)
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);

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
                el.classList.add('occupied');

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

                // Mouse-based drag handler
                el.addEventListener('mousedown', (e) => onMouseDown(zone, index, e));
            }
        }

        // Prevent native drag on all slots (we handle drag via mouse events)
        el.addEventListener('dragstart', (e) => e.preventDefault());

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
