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
        this.comparisonMode = false;
        this.comparisonPlanet = null;
        
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
        // If in comparison mode and clicking a different planet, set as comparison
        if (this.comparisonMode && this.currentPlanet && planet !== this.currentPlanet) {
            this.comparisonPlanet = planet;
            this.updateComparisonContent();
        } else {
            // Exit comparison mode if clicking same planet or new planet while not comparing
            this.exitComparisonMode();
            this.currentPlanet = planet;
            this.updateContent(planet);
        }
        this.panel.classList.remove('hidden');
    }
    
    /**
     * Hide the panel
     */
    hide() {
        this.panel.classList.add('hidden');
        this.exitComparisonMode();
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
     * Enter comparison mode
     */
    enterComparisonMode() {
        if (!this.currentPlanet) return;
        this.comparisonMode = true;
        this.comparisonPlanet = null;
        
        // Update UI to show "Select a second planet to compare"
        const content = this.panel.querySelector('.detail-panel-content');
        content.innerHTML = `
            <div class="comparison-prompt">
                <p>Click another planet to compare with <strong>${this.currentPlanet.name}</strong></p>
            </div>
        `;
    }
    
    /**
     * Exit comparison mode
     */
    exitComparisonMode() {
        this.comparisonMode = false;
        this.comparisonPlanet = null;
    }
    
    /**
     * Calculate comparison ratio between two values
     */
    calculateRatio(value1, value2) {
        const ratio = value1 / value2;
        return ratio.toFixed(2);
    }
    
    /**
     * Format comparison difference
     */
    formatComparison(planet1Value, planet2Value, unit = '') {
        const ratio = planet1Value / planet2Value;
        const diff = planet1Value - planet2Value;
        
        if (Math.abs(ratio - 1) < 0.01) {
            return 'Similar';
        } else if (ratio > 1) {
            return `${ratio.toFixed(2)}× larger${unit}`;
        } else {
            return `${(1/ratio).toFixed(2)}× smaller${unit}`;
        }
    }
    
    /**
     * Create comparison bar visualization
     */
    createComparisonBar(value1, value2, label) {
        const max = Math.max(value1, value2);
        const percent1 = (value1 / max) * 100;
        const percent2 = (value2 / max) * 100;
        
        return `
            <div class="comparison-bar-container">
                <div class="comparison-bar-label">${label}</div>
                <div class="comparison-bars">
                    <div class="comparison-bar-wrapper">
                        <div class="comparison-bar planet1" style="width: ${percent1}%"></div>
                    </div>
                    <div class="comparison-bar-wrapper">
                        <div class="comparison-bar planet2" style="width: ${percent2}%"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Update content for comparison mode
     */
    updateComparisonContent() {
        if (!this.currentPlanet || !this.comparisonPlanet) return;
        
        const p1 = this.currentPlanet;
        const p2 = this.comparisonPlanet;
        
        // Get raw values for comparisons
        const p1Diameter = (p1.size / 50) * 12742;
        const p2Diameter = (p2.size / 50) * 12742;
        const p1DistanceKm = p1.distance * 149597870.7;
        const p2DistanceKm = p2.distance * 149597870.7;
        
        const content = this.panel.querySelector('.detail-panel-content');
        content.innerHTML = `
            <div class="comparison-mode">
                <div class="comparison-header">
                    <h3>Planet Comparison</h3>
                    <button id="exit-comparison" class="exit-comparison-btn" title="Exit comparison">×</button>
                </div>
                
                <div class="comparison-cards">
                    <div class="planet-card planet1-card">
                        <h4>${p1.name}</h4>
                        <div class="planet-type">${p1.type}</div>
                    </div>
                    <div class="planet-card planet2-card">
                        <h4>${p2.name}</h4>
                        <div class="planet-type">${p2.type}</div>
                    </div>
                </div>
                
                <div class="comparison-stats">
                    <div class="comparison-stat-item">
                        <div class="stat-comparison-header">
                            <span class="stat-label">Diameter</span>
                            <span class="stat-difference">${this.formatComparison(p1Diameter, p2Diameter)}</span>
                        </div>
                        <div class="stat-values">
                            <span class="stat-value planet1-value">${this.formatDiameter(p1.size)}</span>
                            <span class="stat-value planet2-value">${this.formatDiameter(p2.size)}</span>
                        </div>
                        ${this.createComparisonBar(p1.size, p2.size, 'Size')}
                    </div>
                    
                    <div class="comparison-stat-item">
                        <div class="stat-comparison-header">
                            <span class="stat-label">Distance from Star</span>
                            <span class="stat-difference">${this.formatComparison(p1DistanceKm, p2DistanceKm)}</span>
                        </div>
                        <div class="stat-values">
                            <span class="stat-value planet1-value">${this.formatDistance(p1.distance)}</span>
                            <span class="stat-value planet2-value">${this.formatDistance(p2.distance)}</span>
                        </div>
                        ${this.createComparisonBar(p1.distance, p2.distance, 'Distance')}
                    </div>
                    
                    <div class="comparison-stat-item">
                        <div class="stat-comparison-header">
                            <span class="stat-label">Orbital Period</span>
                            <span class="stat-difference">${this.formatComparison(p1.orbitalPeriod, p2.orbitalPeriod)}</span>
                        </div>
                        <div class="stat-values">
                            <span class="stat-value planet1-value">${this.formatOrbitalPeriod(p1.orbitalPeriod)}</span>
                            <span class="stat-value planet2-value">${this.formatOrbitalPeriod(p2.orbitalPeriod)}</span>
                        </div>
                        ${this.createComparisonBar(p1.orbitalPeriod, p2.orbitalPeriod, 'Period')}
                    </div>
                    
                    <div class="comparison-stat-item">
                        <div class="stat-comparison-header">
                            <span class="stat-label">Surface Temperature</span>
                            <span class="stat-difference">${Math.abs(p1.temperature - p2.temperature)}K ${p1.temperature > p2.temperature ? 'hotter' : 'cooler'}</span>
                        </div>
                        <div class="stat-values">
                            <span class="stat-value planet1-value">${this.formatTemperature(p1.temperature)}</span>
                            <span class="stat-value planet2-value">${this.formatTemperature(p2.temperature)}</span>
                        </div>
                        ${this.createComparisonBar(p1.temperature, p2.temperature, 'Temperature')}
                    </div>
                    
                    <div class="comparison-stat-item">
                        <div class="stat-comparison-header">
                            <span class="stat-label">Atmosphere</span>
                        </div>
                        <div class="stat-values">
                            <span class="stat-value planet1-value">${p1.atmosphere}</span>
                            <span class="stat-value planet2-value">${p2.atmosphere}</span>
                        </div>
                    </div>
                    
                    <div class="comparison-stat-item">
                        <div class="stat-comparison-header">
                            <span class="stat-label">Terrain Type</span>
                        </div>
                        <div class="stat-values">
                            <span class="stat-value planet1-value">${p1.terrain}</span>
                            <span class="stat-value planet2-value">${p2.terrain}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add exit comparison button handler
        const exitBtn = document.getElementById('exit-comparison');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                this.exitComparisonMode();
                this.updateContent(this.currentPlanet);
            });
        }
        
        // Update footer button
        const footer = this.panel.querySelector('.detail-panel-footer');
        footer.innerHTML = `
            <button id="dismiss-panel-comparison" class="dismiss-btn">Dismiss</button>
        `;
        
        const dismissBtn = document.getElementById('dismiss-panel-comparison');
        dismissBtn.addEventListener('click', () => this.hide());
    }
    
    /**
     * Update the panel content with planet data
     */
    updateContent(planet) {
        // Reset to normal view
        const content = this.panel.querySelector('.detail-panel-content');
        content.innerHTML = `
            <div class="planet-description" id="planet-description">
                ${planet.description}
            </div>
            
            <div class="planet-stats">
                <h3>Planetary Statistics</h3>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Diameter</span>
                        <span class="stat-value" id="stat-diameter">${this.formatDiameter(planet.size)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Distance from Star</span>
                        <span class="stat-value" id="stat-distance">${this.formatDistance(planet.distance)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Orbital Period</span>
                        <span class="stat-value" id="stat-period">${this.formatOrbitalPeriod(planet.orbitalPeriod)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Surface Temperature</span>
                        <span class="stat-value" id="stat-temperature">${this.formatTemperature(planet.temperature)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Atmosphere</span>
                        <span class="stat-value" id="stat-atmosphere">${planet.atmosphere}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Terrain Type</span>
                        <span class="stat-value" id="stat-terrain">${planet.terrain}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Update name
        document.getElementById('planet-name').textContent = planet.name;
        
        // Update footer with Compare button
        const footer = this.panel.querySelector('.detail-panel-footer');
        footer.innerHTML = `
            <button id="compare-btn" class="compare-btn">Compare with Another Planet</button>
            <button id="dismiss-panel" class="dismiss-btn">Dismiss</button>
        `;
        
        // Bind new button handlers
        const compareBtn = document.getElementById('compare-btn');
        const dismissBtn = document.getElementById('dismiss-panel');
        
        compareBtn.addEventListener('click', () => this.enterComparisonMode());
        dismissBtn.addEventListener('click', () => this.hide());
    }
    
    /**
     * Get the currently displayed planet
     */
    getCurrentPlanet() {
        return this.currentPlanet;
    }
}
