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

        // Initialize renderer
        this.renderer = new SolarSystemRenderer(this.canvas, this.solarSystem);

        // Setup event listeners
        this.setupEventListeners();

        // Start animation loop
        this.lastTime = performance.now();
        this.animate();
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
