/**
 * Main application entry point
 * Wires together generation, rendering, and interaction
 */

import { generateSolarSystem } from './generation.js';
import { SolarSystemRenderer } from './renderer.js';
import { DetailPanel } from './detailPanel.js';
import { PlanetTooltip } from './tooltip.js';

/**
 * Increments the localStorage visit counter and updates the footer display.
 */
function initVisitCounter() {
    const STORAGE_KEY = 'genesis_visit_count';
    const count = (parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0) + 1;
    localStorage.setItem(STORAGE_KEY, String(count));
    const el = document.getElementById('visit-counter');
    if (el) el.textContent = `Visits: ${count}`;
}

class App {
    constructor() {
        this.canvas = document.getElementById('universe-canvas');
        this.detailPanel = new DetailPanel();
        this.tooltip = new PlanetTooltip();

        initVisitCounter();

        // Generate solar system with a random seed
        const seed = Math.floor(Math.random() * 1000000);
        this.solarSystem = generateSolarSystem(seed);

        // Display the system name and metadata in the info bar
        this.updateSystemInfo();

        // Initialize renderer
        this.renderer = new SolarSystemRenderer(this.canvas, this.solarSystem);

        // Setup event listeners
        this.setupEventListeners();

        // Setup planet search
        this.setupSearch();

        // Start animation loop
        this.lastTime = performance.now();
        this.animate();
    }

    /**
     * Populate the system info bar with the generated system name and stats.
     */
    updateSystemInfo() {
        const { name, star, planets } = this.solarSystem;

        const nameEl = document.getElementById('system-name');
        if (nameEl) nameEl.textContent = name;

        const metaEl = document.getElementById('system-meta');
        if (metaEl) {
            const count = planets.length;
            metaEl.textContent =
                `${count} planet${count !== 1 ? 's' : ''} · ${star.spectralClass}-type star`;
        }
    }

    setupEventListeners() {
        // Mouse hover — update hover state and show/reposition tooltip
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.renderer.updateHover(x, y);

            const hovered = this.renderer.hoveredPlanet;
            if (hovered && !this.detailPanel.isVisible()) {
                this.tooltip.show(hovered, e.clientX, e.clientY);
            } else {
                this.tooltip.hide();
            }
        });

        // Mouse leaves canvas — clear hover and hide tooltip
        this.canvas.addEventListener('mouseleave', () => {
            this.renderer.updateHover(-1, -1);
            this.tooltip.hide();
        });

        // Click to open detail panel (desktop / pointer devices)
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const clickedPlanet = this.renderer.checkPlanetClick(x, y);
            if (clickedPlanet) {
                this.tooltip.hide();
                this.detailPanel.show(clickedPlanet);
            }
        });

        // Touch support:
        //   First tap on a planet  → show tooltip
        //   Second tap on same planet (tooltip visible) → open detail panel
        //   Tap on empty space → hide tooltip
        this.canvas.addEventListener('touchstart', (e) => {
            // Prevent the ghost click that would fire after touchend, so we
            // control panel opening ourselves via the two-tap flow.
            e.preventDefault();

            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            const tappedPlanet = this.renderer.checkPlanetClick(x, y);
            if (tappedPlanet) {
                if (this.tooltip.isVisibleFor(tappedPlanet)) {
                    // Second tap on same planet — open detail panel
                    this.tooltip.hide();
                    this.detailPanel.show(tappedPlanet);
                } else {
                    // First tap — show tooltip (close any open panel first)
                    this.detailPanel.hide();
                    this.tooltip.show(tappedPlanet, touch.clientX, touch.clientY);
                }
            } else {
                this.tooltip.hide();
            }
        }, { passive: false });
    }

    /**
     * Wire up the search input, clear button, and keyboard shortcuts.
     */
    setupSearch() {
        const input = document.getElementById('planet-search');
        const clearBtn = document.getElementById('search-clear');
        const matchCount = document.createElement('span');
        matchCount.className = 'search-match-count';
        matchCount.hidden = true;
        input.parentElement.insertBefore(matchCount, clearBtn);

        input.addEventListener('input', () => {
            const query = input.value.trim();
            clearBtn.hidden = query.length === 0;
            this._applySearch(query, matchCount);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this._clearSearch(input, clearBtn, matchCount);
                input.blur();
            } else if (e.key === 'Enter') {
                const matches = this._getSearchMatches(input.value.trim());
                if (matches.length > 0) {
                    this.renderer.centerCameraOn(matches[0]);
                }
            }
        });

        clearBtn.addEventListener('click', () => {
            this._clearSearch(input, clearBtn, matchCount);
            input.focus();
        });
    }

    /**
     * Return planets whose name or type contains the query substring (case-insensitive).
     */
    _getSearchMatches(query) {
        if (!query) return [];
        const lower = query.toLowerCase();
        return this.solarSystem.planets.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            p.type.toLowerCase().includes(lower)
        );
    }

    /**
     * Apply a search query: highlight matched planets and update the match-count badge.
     */
    _applySearch(query, matchCountEl) {
        if (!query) {
            this.renderer.setSearchHighlights([]);
            this.renderer.resetCamera();
            matchCountEl.hidden = true;
            return;
        }

        const matches = this._getSearchMatches(query);
        this.renderer.setSearchHighlights(matches);

        const total = this.solarSystem.planets.length;
        matchCountEl.textContent = `${matches.length}/${total}`;
        matchCountEl.hidden = false;
    }

    /**
     * Clear search state: empty the input, remove highlights, reset camera.
     */
    _clearSearch(input, clearBtn, matchCountEl) {
        input.value = '';
        clearBtn.hidden = true;
        matchCountEl.hidden = true;
        this.renderer.setSearchHighlights([]);
        this.renderer.resetCamera();
    }

    animate(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.renderer.render(deltaTime);

        requestAnimationFrame((time) => this.animate(time));
    }
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new App();
    });
} else {
    new App();
}
