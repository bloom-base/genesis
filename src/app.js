/**
 * Main application entry point
 * Wires together generation, rendering, and interaction
 */

import { generateSolarSystem } from './generation.js';
import { SolarSystemRenderer } from './renderer.js';
import { DetailPanel } from './detailPanel.js';

class App {
    constructor() {
        this.canvas = document.getElementById('universe-canvas');
        this.detailPanel = new DetailPanel();
        
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
        // Handle mouse move for hover effects
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.renderer.updateHover(x, y);
        });
        
        // Handle click for planet selection
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const clickedPlanet = this.renderer.checkPlanetClick(x, y);
            if (clickedPlanet) {
                this.detailPanel.show(clickedPlanet);
            }
        });
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
