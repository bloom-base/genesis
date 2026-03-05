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
                <div class="planet-search">
                    <input type="text" id="planet-search-input" class="planet-search-input" />
                    <div id="search-results" class="search-results hidden"></div>
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
    
    describe('planet search', () => {
        let mockSolarSystem;
        
        beforeEach(() => {
            // Create mock solar system with multiple planets
            const random = createSeededRandom(123);
            mockSolarSystem = {
                star: { name: 'Test Star' },
                planets: [
                    generatePlanet(random, 0, 123),
                    generatePlanet(random, 1, 123),
                    generatePlanet(random, 2, 123),
                    generatePlanet(random, 3, 123)
                ]
            };
            
            // Override planet names for easier testing
            mockSolarSystem.planets[0].name = 'Mercury Alpha';
            mockSolarSystem.planets[1].name = 'Venus Beta';
            mockSolarSystem.planets[2].name = 'Earth Prime';
            mockSolarSystem.planets[3].name = 'Mars Colony';
            
            detailPanel.setSolarSystem(mockSolarSystem);
        });
        
        it('should have search input and results elements', () => {
            expect(detailPanel.searchInput).toBeDefined();
            expect(detailPanel.searchResults).toBeDefined();
        });
        
        it('should filter planets by name (case-insensitive)', () => {
            const results = detailPanel.searchPlanets('earth');
            
            expect(results.length).toBe(1);
            expect(results[0].name).toBe('Earth Prime');
        });
        
        it('should match partial planet names', () => {
            const results = detailPanel.searchPlanets('a');
            
            expect(results.length).toBeGreaterThan(0);
            expect(results.some(p => p.name.toLowerCase().includes('a'))).toBe(true);
        });
        
        it('should return empty array for no matches', () => {
            const results = detailPanel.searchPlanets('xyz123');
            
            expect(results.length).toBe(0);
        });
        
        it('should return empty array when solar system is null', () => {
            detailPanel.setSolarSystem(null);
            const results = detailPanel.searchPlanets('earth');
            
            expect(results.length).toBe(0);
        });
        
        it('should display search results in DOM', () => {
            detailPanel.handleSearch('mars');
            
            expect(detailPanel.searchResults.classList.contains('hidden')).toBe(false);
            expect(detailPanel.searchResults.children.length).toBeGreaterThan(0);
        });
        
        it('should show "no results" message when nothing matches', () => {
            detailPanel.handleSearch('xyz123');
            
            expect(detailPanel.searchResults.classList.contains('hidden')).toBe(false);
            expect(detailPanel.searchResults.textContent).toContain('No planets found');
        });
        
        it('should hide results when search is empty', () => {
            detailPanel.handleSearch('mars');
            detailPanel.handleSearch('');
            
            expect(detailPanel.searchResults.classList.contains('hidden')).toBe(true);
        });
        
        it('should highlight current planet in results', () => {
            detailPanel.show(mockSolarSystem.planets[2]); // Earth Prime
            detailPanel.handleSearch('e');
            
            const items = detailPanel.searchResults.querySelectorAll('.search-result-item');
            const activeItem = Array.from(items).find(item => item.classList.contains('active'));
            
            expect(activeItem).toBeDefined();
            expect(activeItem.textContent).toBe('Earth Prime');
        });
        
        it('should update detail panel when search result is clicked', () => {
            detailPanel.handleSearch('venus');
            
            const firstResult = detailPanel.searchResults.querySelector('.search-result-item');
            firstResult.click();
            
            expect(detailPanel.getCurrentPlanet()).toBe(mockSolarSystem.planets[1]);
        });
        
        it('should clear search when result is clicked', () => {
            detailPanel.handleSearch('venus');
            
            const firstResult = detailPanel.searchResults.querySelector('.search-result-item');
            firstResult.click();
            
            expect(detailPanel.searchInput.value).toBe('');
            expect(detailPanel.searchResults.classList.contains('hidden')).toBe(true);
        });
        
        it('should clear search when panel is hidden', () => {
            detailPanel.show(mockPlanet);
            detailPanel.handleSearch('mars');
            detailPanel.hide();
            
            expect(detailPanel.searchInput.value).toBe('');
            expect(detailPanel.searchResults.classList.contains('hidden')).toBe(true);
        });
        
        it('should handle search input events', () => {
            const searchInput = detailPanel.searchInput;
            searchInput.value = 'mercury';
            searchInput.dispatchEvent(new Event('input'));
            
            expect(detailPanel.searchResults.classList.contains('hidden')).toBe(false);
        });
    });
});
