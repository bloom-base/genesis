import { describe, it, expect, beforeEach } from 'vitest';
import { DetailPanel } from '../src/detailPanel.js';
import { generatePlanet, createSeededRandom } from '../src/generation.js';

describe('DetailPanel', () => {
    let detailPanel;
    let mockPlanet;
    
    beforeEach(() => {
        // Setup DOM elements
        document.body.innerHTML = `
            <div id="detail-panel" class="detail-panel hidden">
                <div class="detail-panel-header">
                    <h2 id="planet-name">Planet Name</h2>
                    <button id="close-panel" class="close-btn">×</button>
                </div>
                <div class="detail-panel-content">
                    <div id="planet-description"></div>
                    <div class="planet-stats">
                        <div id="stat-diameter"></div>
                        <div id="stat-distance"></div>
                        <div id="stat-period"></div>
                        <div id="stat-temperature"></div>
                        <div id="stat-atmosphere"></div>
                        <div id="stat-terrain"></div>
                    </div>
                </div>
                <div class="detail-panel-footer">
                    <button id="dismiss-panel" class="dismiss-btn">Dismiss</button>
                </div>
            </div>
        `;
        
        detailPanel = new DetailPanel();
        
        // Create a mock planet
        const random = createSeededRandom(42);
        mockPlanet = generatePlanet(random, 2, 42);
    });
    
    describe('initialization', () => {
        it('should find all required DOM elements', () => {
            expect(detailPanel.panel).toBeDefined();
            expect(detailPanel.closeBtn).toBeDefined();
            expect(detailPanel.dismissBtn).toBeDefined();
        });
        
        it('should start with no current planet', () => {
            expect(detailPanel.currentPlanet).toBeNull();
        });
        
        it('should be hidden initially', () => {
            expect(detailPanel.isVisible()).toBe(false);
        });
    });
    
    describe('show and hide', () => {
        it('should show panel when show() is called', () => {
            detailPanel.show(mockPlanet);
            
            expect(detailPanel.isVisible()).toBe(true);
            expect(detailPanel.panel.classList.contains('hidden')).toBe(false);
        });
        
        it('should hide panel when hide() is called', () => {
            detailPanel.show(mockPlanet);
            detailPanel.hide();
            
            expect(detailPanel.isVisible()).toBe(false);
            expect(detailPanel.panel.classList.contains('hidden')).toBe(true);
        });
        
        it('should set currentPlanet when showing', () => {
            detailPanel.show(mockPlanet);
            
            expect(detailPanel.currentPlanet).toBe(mockPlanet);
        });
        
        it('should clear currentPlanet when hiding', () => {
            detailPanel.show(mockPlanet);
            detailPanel.hide();
            
            expect(detailPanel.currentPlanet).toBeNull();
        });
    });
    
    describe('button interactions', () => {
        it('should hide panel when close button is clicked', () => {
            detailPanel.show(mockPlanet);
            detailPanel.closeBtn.click();
            
            expect(detailPanel.isVisible()).toBe(false);
        });
        
        it('should hide panel when dismiss button is clicked', () => {
            detailPanel.show(mockPlanet);
            detailPanel.dismissBtn.click();
            
            expect(detailPanel.isVisible()).toBe(false);
        });
    });
    
    describe('updateContent', () => {
        it('should update planet name', () => {
            detailPanel.show(mockPlanet);
            
            const nameElement = document.getElementById('planet-name');
            expect(nameElement.textContent).toBe(mockPlanet.name);
        });
        
        it('should update planet description', () => {
            detailPanel.show(mockPlanet);
            
            const descElement = document.getElementById('planet-description');
            expect(descElement.textContent).toBe(mockPlanet.description);
        });
        
        it('should update all stats', () => {
            detailPanel.show(mockPlanet);
            
            expect(document.getElementById('stat-diameter').textContent).toBeTruthy();
            expect(document.getElementById('stat-distance').textContent).toBeTruthy();
            expect(document.getElementById('stat-period').textContent).toBeTruthy();
            expect(document.getElementById('stat-temperature').textContent).toBeTruthy();
            expect(document.getElementById('stat-atmosphere').textContent).toBeTruthy();
            expect(document.getElementById('stat-terrain').textContent).toBeTruthy();
        });
    });
    
    describe('formatTemperature', () => {
        it('should format temperature with Kelvin and Celsius', () => {
            const result = detailPanel.formatTemperature(300);
            
            expect(result).toContain('300K');
            expect(result).toContain('27°C');
        });
        
        it('should handle negative Celsius temperatures', () => {
            const result = detailPanel.formatTemperature(200);
            
            expect(result).toContain('200K');
            expect(result).toContain('-73°C');
        });
    });
    
    describe('formatDistance', () => {
        it('should format distance in AU for large distances', () => {
            const result = detailPanel.formatDistance(1.5);
            
            expect(result).toContain('1.50 AU');
            expect(result).toContain('km');
        });
        
        it('should format small distances in km only', () => {
            const result = detailPanel.formatDistance(0.05);
            
            expect(result).toContain('km');
            expect(result).not.toContain('AU');
        });
        
        it('should use locale string for large numbers', () => {
            const result = detailPanel.formatDistance(5);
            
            // Should have comma separators
            expect(result).toMatch(/[\d,]+/);
        });
    });
    
    describe('formatOrbitalPeriod', () => {
        it('should format short periods in days', () => {
            const result = detailPanel.formatOrbitalPeriod(88);
            
            expect(result).toContain('88 Earth days');
        });
        
        it('should format long periods in years', () => {
            const result = detailPanel.formatOrbitalPeriod(687);
            
            expect(result).toContain('Earth years');
            expect(result).toContain('days');
        });
        
        it('should handle very long periods', () => {
            const result = detailPanel.formatOrbitalPeriod(10000);
            
            expect(result).toContain('Earth years');
        });
    });
    
    describe('formatDiameter', () => {
        it('should format Earth-like planets specially', () => {
            const result = detailPanel.formatDiameter(50);
            
            expect(result).toContain('Earth-like');
        });
        
        it('should show Earth ratio for other sizes', () => {
            const result = detailPanel.formatDiameter(25);
            
            expect(result).toContain('0.50');
            expect(result).toContain('Earth');
        });
        
        it('should format large planets', () => {
            const result = detailPanel.formatDiameter(80);
            
            expect(result).toContain('1.60');
            expect(result).toContain('km');
        });
    });
    
    describe('getCurrentPlanet', () => {
        it('should return null when no planet is shown', () => {
            expect(detailPanel.getCurrentPlanet()).toBeNull();
        });
        
        it('should return current planet when one is shown', () => {
            detailPanel.show(mockPlanet);
            
            expect(detailPanel.getCurrentPlanet()).toBe(mockPlanet);
        });
    });
    
    describe('comparison mode', () => {
        let secondPlanet;
        
        beforeEach(() => {
            const random = createSeededRandom(123);
            secondPlanet = generatePlanet(random, 3, 123);
        });
        
        it('should start with comparison mode disabled', () => {
            expect(detailPanel.comparisonMode).toBe(false);
            expect(detailPanel.comparisonPlanet).toBeNull();
        });
        
        it('should enter comparison mode when compare button is clicked', () => {
            detailPanel.show(mockPlanet);
            
            const compareBtn = document.getElementById('compare-btn');
            expect(compareBtn).toBeDefined();
            
            compareBtn.click();
            
            expect(detailPanel.comparisonMode).toBe(true);
        });
        
        it('should show prompt when in comparison mode without second planet', () => {
            detailPanel.show(mockPlanet);
            detailPanel.enterComparisonMode();
            
            const prompt = document.querySelector('.comparison-prompt');
            expect(prompt).toBeDefined();
            expect(prompt.textContent).toContain(mockPlanet.name);
        });
        
        it('should set comparison planet when clicking second planet in comparison mode', () => {
            detailPanel.show(mockPlanet);
            detailPanel.enterComparisonMode();
            detailPanel.show(secondPlanet);
            
            expect(detailPanel.comparisonPlanet).toBe(secondPlanet);
            expect(detailPanel.currentPlanet).toBe(mockPlanet);
        });
        
        it('should display comparison view with both planets', () => {
            detailPanel.show(mockPlanet);
            detailPanel.enterComparisonMode();
            detailPanel.show(secondPlanet);
            
            const comparisonMode = document.querySelector('.comparison-mode');
            expect(comparisonMode).toBeDefined();
            
            const cards = document.querySelectorAll('.planet-card');
            expect(cards.length).toBe(2);
            
            expect(document.body.textContent).toContain(mockPlanet.name);
            expect(document.body.textContent).toContain(secondPlanet.name);
        });
        
        it('should exit comparison mode when exit button is clicked', () => {
            detailPanel.show(mockPlanet);
            detailPanel.enterComparisonMode();
            detailPanel.show(secondPlanet);
            
            const exitBtn = document.getElementById('exit-comparison');
            exitBtn.click();
            
            expect(detailPanel.comparisonMode).toBe(false);
            expect(detailPanel.comparisonPlanet).toBeNull();
        });
        
        it('should exit comparison mode when hiding panel', () => {
            detailPanel.show(mockPlanet);
            detailPanel.enterComparisonMode();
            detailPanel.show(secondPlanet);
            
            detailPanel.hide();
            
            expect(detailPanel.comparisonMode).toBe(false);
            expect(detailPanel.comparisonPlanet).toBeNull();
        });
        
        it('should exit comparison mode when clicking same planet', () => {
            detailPanel.show(mockPlanet);
            detailPanel.enterComparisonMode();
            detailPanel.show(mockPlanet);
            
            expect(detailPanel.comparisonMode).toBe(false);
        });
        
        it('should display comparison bars', () => {
            detailPanel.show(mockPlanet);
            detailPanel.enterComparisonMode();
            detailPanel.show(secondPlanet);
            
            const bars = document.querySelectorAll('.comparison-bar');
            expect(bars.length).toBeGreaterThan(0);
        });
        
        it('should show stat differences', () => {
            detailPanel.show(mockPlanet);
            detailPanel.enterComparisonMode();
            detailPanel.show(secondPlanet);
            
            const differences = document.querySelectorAll('.stat-difference');
            expect(differences.length).toBeGreaterThan(0);
        });
        
        it('should calculate ratio correctly', () => {
            const ratio = detailPanel.calculateRatio(100, 50);
            expect(ratio).toBe('2.00');
        });
        
        it('should format comparison for larger values', () => {
            const comparison = detailPanel.formatComparison(100, 50);
            expect(comparison).toContain('2.00×');
            expect(comparison).toContain('larger');
        });
        
        it('should format comparison for smaller values', () => {
            const comparison = detailPanel.formatComparison(50, 100);
            expect(comparison).toContain('2.00×');
            expect(comparison).toContain('smaller');
        });
        
        it('should format similar values', () => {
            const comparison = detailPanel.formatComparison(100, 100);
            expect(comparison).toBe('Similar');
        });
        
        it('should create comparison bars with correct percentages', () => {
            const barHtml = detailPanel.createComparisonBar(100, 50, 'Test');
            
            expect(barHtml).toContain('width: 100%');
            expect(barHtml).toContain('width: 50%');
            expect(barHtml).toContain('Test');
        });
    });
});
