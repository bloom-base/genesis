/**
 * Detail panel controller
 * Manages the display of planet information
 */

export class DetailPanel {
    constructor(panelId = 'detail-panel') {
        this.panel = document.getElementById(panelId);
        this.closeBtn = document.getElementById('close-panel');
        this.dismissBtn = document.getElementById('dismiss-panel');
        this.currentPlanet = null;
        
        // Bind close handlers
        this.closeBtn.addEventListener('click', () => this.hide());
        this.dismissBtn.addEventListener('click', () => this.hide());
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.panel.classList.contains('hidden')) {
                this.hide();
            }
        });
    }
    
    /**
     * Show the panel with planet information
     */
    show(planet) {
        this.currentPlanet = planet;
        this.updateContent(planet);
        this.panel.classList.remove('hidden');
    }
    
    /**
     * Hide the panel
     */
    hide() {
        this.panel.classList.add('hidden');
        this.currentPlanet = null;
    }
    
    /**
     * Check if panel is currently visible
     */
    isVisible() {
        return !this.panel.classList.contains('hidden');
    }
    
    /**
     * Format temperature with appropriate unit
     */
    formatTemperature(kelvin) {
        const celsius = Math.round(kelvin - 273);
        if (celsius > 0) {
            return `${kelvin}K (${celsius}°C)`;
        } else {
            return `${kelvin}K (${celsius}°C)`;
        }
    }
    
    /**
     * Format distance in AU or km
     */
    formatDistance(au) {
        const km = Math.round(au * 149597870.7); // AU to km
        if (au < 0.1) {
            return `${km.toLocaleString()} km`;
        } else {
            return `${au.toFixed(2)} AU (${km.toLocaleString()} km)`;
        }
    }
    
    /**
     * Format orbital period
     */
    formatOrbitalPeriod(days) {
        if (days < 365) {
            return `${days} Earth days`;
        } else {
            const years = (days / 365).toFixed(1);
            return `${years} Earth years (${days.toLocaleString()} days)`;
        }
    }
    
    /**
     * Format planet diameter
     */
    formatDiameter(size) {
        // Size is arbitrary units, convert to something meaningful
        // Assume size of 50 = Earth-like (12,742 km)
        const earthDiameter = 12742;
        const diameter = Math.round((size / 50) * earthDiameter);
        const earthRatio = (size / 50).toFixed(2);
        
        if (earthRatio == 1.00) {
            return `${diameter.toLocaleString()} km (Earth-like)`;
        } else if (earthRatio < 0.5) {
            return `${diameter.toLocaleString()} km (${earthRatio}× Earth)`;
        } else {
            return `${diameter.toLocaleString()} km (${earthRatio}× Earth)`;
        }
    }
    
    /**
     * Update the panel content with planet data
     */
    updateContent(planet) {
        // Update name
        document.getElementById('planet-name').textContent = planet.name;
        
        // Update description
        document.getElementById('planet-description').textContent = planet.description;
        
        // Update stats
        document.getElementById('stat-diameter').textContent = this.formatDiameter(planet.size);
        document.getElementById('stat-distance').textContent = this.formatDistance(planet.distance);
        document.getElementById('stat-period').textContent = this.formatOrbitalPeriod(planet.orbitalPeriod);
        document.getElementById('stat-temperature').textContent = this.formatTemperature(planet.temperature);
        document.getElementById('stat-atmosphere').textContent = planet.atmosphere;
        document.getElementById('stat-terrain').textContent = planet.terrain;
    }
    
    /**
     * Get the currently displayed planet
     */
    getCurrentPlanet() {
        return this.currentPlanet;
    }
}
