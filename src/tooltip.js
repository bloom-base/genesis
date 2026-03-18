/**
 * Planet tooltip controller
 * Shows quick stats when hovering or tapping a planet
 */

export class PlanetTooltip {
    constructor() {
        this.el = document.getElementById('planet-tooltip');
        this.nameEl = this.el.querySelector('.tooltip-name');
        this.typeEl = this.el.querySelector('.tooltip-type');
        this.statEl = this.el.querySelector('.tooltip-stat');
        this.currentPlanet = null;
    }

    /**
     * Show the tooltip for a planet near the given client coordinates
     */
    show(planet, clientX, clientY) {
        this.currentPlanet = planet;
        this.nameEl.textContent = planet.name;
        this.typeEl.textContent = planet.type;
        this.statEl.textContent = this.formatStat(planet);
        this.updatePosition(clientX, clientY);
        this.el.classList.remove('hidden');
    }

    /**
     * Hide the tooltip
     */
    hide() {
        this.el.classList.add('hidden');
        this.currentPlanet = null;
    }

    /**
     * Update the tooltip position to follow the cursor/touch point
     */
    updatePosition(clientX, clientY) {
        const offset = 16;
        const margin = 8;
        // Use fixed estimates so positioning works before/during first show
        const estimatedWidth = 160;
        const estimatedHeight = 82;

        let x = clientX + offset;
        let y = clientY - estimatedHeight - offset;

        // Flip horizontally if too close to right edge
        if (x + estimatedWidth > window.innerWidth - margin) {
            x = clientX - estimatedWidth - offset;
        }
        // Flip vertically if too close to top edge
        if (y < margin) {
            y = clientY + offset;
        }
        // Clamp bottom edge
        if (y + estimatedHeight > window.innerHeight - margin) {
            y = window.innerHeight - estimatedHeight - margin;
        }

        this.el.style.left = `${x}px`;
        this.el.style.top = `${y}px`;
    }

    /**
     * Check if the tooltip is currently visible for a specific planet
     */
    isVisibleFor(planet) {
        return this.currentPlanet === planet && !this.el.classList.contains('hidden');
    }

    /**
     * Format the key stat line shown in the tooltip.
     * Shows temperature for all planet types as it is universally meaningful.
     */
    formatStat(planet) {
        const celsius = Math.round(planet.temperature - 273);
        const sign = celsius >= 0 ? '+' : '';
        return `${planet.temperature}K (${sign}${celsius}°C)`;
    }
}
