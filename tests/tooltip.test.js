import { describe, it, expect, beforeEach } from 'vitest';
import { PlanetTooltip } from '../src/tooltip.js';
import { generatePlanet, createSeededRandom } from '../src/generation.js';

const TOOLTIP_HTML = `
    <div id="planet-tooltip" class="planet-tooltip hidden">
        <div class="tooltip-name"></div>
        <div class="tooltip-type"></div>
        <div class="tooltip-stat"></div>
    </div>
`;

describe('PlanetTooltip', () => {
    let tooltip;
    let mockPlanet;

    beforeEach(() => {
        document.body.innerHTML = TOOLTIP_HTML;
        tooltip = new PlanetTooltip();

        const random = createSeededRandom(42);
        mockPlanet = generatePlanet(random, 2, 42);
    });

    describe('initialization', () => {
        it('should find the tooltip DOM element', () => {
            expect(tooltip.el).toBeDefined();
        });

        it('should find name, type and stat sub-elements', () => {
            expect(tooltip.nameEl).toBeDefined();
            expect(tooltip.typeEl).toBeDefined();
            expect(tooltip.statEl).toBeDefined();
        });

        it('should start with no current planet', () => {
            expect(tooltip.currentPlanet).toBeNull();
        });

        it('should start hidden', () => {
            expect(tooltip.el.classList.contains('hidden')).toBe(true);
        });
    });

    describe('show()', () => {
        it('should remove the hidden class', () => {
            tooltip.show(mockPlanet, 100, 100);
            expect(tooltip.el.classList.contains('hidden')).toBe(false);
        });

        it('should set currentPlanet', () => {
            tooltip.show(mockPlanet, 100, 100);
            expect(tooltip.currentPlanet).toBe(mockPlanet);
        });

        it('should render the planet name', () => {
            tooltip.show(mockPlanet, 100, 100);
            expect(tooltip.nameEl.textContent).toBe(mockPlanet.name);
        });

        it('should render the planet type', () => {
            tooltip.show(mockPlanet, 100, 100);
            expect(tooltip.typeEl.textContent).toBe(mockPlanet.type);
        });

        it('should render the stat line', () => {
            tooltip.show(mockPlanet, 100, 100);
            expect(tooltip.statEl.textContent).toContain('K');
            expect(tooltip.statEl.textContent).toContain('°C');
        });

        it('should apply a CSS left/top position', () => {
            tooltip.show(mockPlanet, 200, 300);
            expect(tooltip.el.style.left).toBeTruthy();
            expect(tooltip.el.style.top).toBeTruthy();
        });
    });

    describe('hide()', () => {
        it('should add the hidden class', () => {
            tooltip.show(mockPlanet, 100, 100);
            tooltip.hide();
            expect(tooltip.el.classList.contains('hidden')).toBe(true);
        });

        it('should clear currentPlanet', () => {
            tooltip.show(mockPlanet, 100, 100);
            tooltip.hide();
            expect(tooltip.currentPlanet).toBeNull();
        });
    });

    describe('isVisibleFor()', () => {
        it('should return false when tooltip is hidden', () => {
            expect(tooltip.isVisibleFor(mockPlanet)).toBe(false);
        });

        it('should return true when tooltip is shown for the given planet', () => {
            tooltip.show(mockPlanet, 100, 100);
            expect(tooltip.isVisibleFor(mockPlanet)).toBe(true);
        });

        it('should return false for a different planet', () => {
            const random2 = createSeededRandom(99);
            const otherPlanet = generatePlanet(random2, 3, 99);
            tooltip.show(mockPlanet, 100, 100);
            expect(tooltip.isVisibleFor(otherPlanet)).toBe(false);
        });

        it('should return false after hide()', () => {
            tooltip.show(mockPlanet, 100, 100);
            tooltip.hide();
            expect(tooltip.isVisibleFor(mockPlanet)).toBe(false);
        });
    });

    describe('updatePosition()', () => {
        it('should set left and top style properties', () => {
            tooltip.updatePosition(400, 300);
            expect(tooltip.el.style.left).toMatch(/\d+px/);
            expect(tooltip.el.style.top).toMatch(/\d+px/);
        });

        it('should offset the tooltip from the cursor', () => {
            tooltip.updatePosition(400, 400);
            const left = parseInt(tooltip.el.style.left);
            // Default placement is to the right (+16 offset)
            expect(left).toBeGreaterThan(400);
        });

        it('should clamp to the left when near the right viewport edge', () => {
            // Simulate near the right edge (window.innerWidth defaults to 1024 in jsdom)
            tooltip.updatePosition(window.innerWidth - 10, 300);
            const left = parseInt(tooltip.el.style.left);
            // Should flip left of cursor
            expect(left).toBeLessThan(window.innerWidth - 10);
        });

        it('should clamp below cursor when near the top edge', () => {
            tooltip.updatePosition(400, 5);
            const top = parseInt(tooltip.el.style.top);
            // Should flip below cursor
            expect(top).toBeGreaterThan(5);
        });
    });

    describe('formatStat()', () => {
        it('should include the temperature in Kelvin', () => {
            const result = tooltip.formatStat(mockPlanet);
            expect(result).toContain(`${mockPlanet.temperature}K`);
        });

        it('should include a Celsius conversion', () => {
            const result = tooltip.formatStat(mockPlanet);
            expect(result).toContain('°C');
        });

        it('should prefix positive Celsius with a plus sign', () => {
            const warmPlanet = { ...mockPlanet, temperature: 400 }; // 127°C
            const result = tooltip.formatStat(warmPlanet);
            expect(result).toContain('+127°C');
        });

        it('should not prefix negative Celsius with plus sign', () => {
            const coldPlanet = { ...mockPlanet, temperature: 200 }; // -73°C
            const result = tooltip.formatStat(coldPlanet);
            expect(result).not.toContain('+');
            expect(result).toContain('-73°C');
        });
    });
});
