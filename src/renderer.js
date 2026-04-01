/**
 * Canvas renderer for the solar system
 * Handles drawing planets, orbits, and click detection
 */

export class SolarSystemRenderer {
    constructor(canvas, solarSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.solarSystem = solarSystem;
        this.scale = 60; // Pixels per AU
        this.centerX = 0;
        this.centerY = 0;
        this.hoveredPlanet = null;
        this.animationTime = 0;

        /** Set of planets that match the current search query */
        this.highlightedPlanets = new Set();

        /** Camera pan offset in pixels (used to centre on a specific planet) */
        this.cameraOffsetX = 0;
        this.cameraOffsetY = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }
    
    /**
     * Convert solar system coordinates (AU) to canvas coordinates (pixels)
     */
    toCanvasCoords(x, y) {
        return {
            x: this.centerX + x * this.scale + this.cameraOffsetX,
            y: this.centerY + y * this.scale + this.cameraOffsetY
        };
    }
    
    /**
     * Convert canvas coordinates to solar system coordinates
     */
    fromCanvasCoords(canvasX, canvasY) {
        return {
            x: (canvasX - this.centerX) / this.scale,
            y: (canvasY - this.centerY) / this.scale
        };
    }
    
    /**
     * Get planet position based on orbital parameters
     */
    getPlanetPosition(planet) {
        // Simplified orbital motion - constant angular velocity
        const angle = planet.angle + (this.animationTime * 0.0001 / planet.distance);
        const x = Math.cos(angle) * planet.distance;
        const y = Math.sin(angle) * planet.distance;
        return { x, y, angle };
    }
    
    /**
     * Draw a star at the center
     */
    drawStar() {
        const star = this.solarSystem.star;
        const pos = this.toCanvasCoords(0, 0);
        
        // Glow effect
        const gradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, star.radius * 2);
        gradient.addColorStop(0, `rgba(${star.color.r}, ${star.color.g}, ${star.color.b}, 0.8)`);
        gradient.addColorStop(0.3, `rgba(${star.color.r}, ${star.color.g}, ${star.color.b}, 0.4)`);
        gradient.addColorStop(1, 'rgba(255, 230, 150, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, star.radius * 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Star core
        this.ctx.fillStyle = `rgb(${star.color.r}, ${star.color.g}, ${star.color.b})`;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, star.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    /**
     * Draw orbital paths
     */
    drawOrbits() {
        this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.15)';
        this.ctx.lineWidth = 1;
        
        this.solarSystem.planets.forEach(planet => {
            const center = this.toCanvasCoords(0, 0);
            const radius = planet.distance * this.scale;
            
            this.ctx.beginPath();
            this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        });
    }
    
    /**
     * Calculate glow intensity for a planet based on its proximity to the star.
     * Returns a value between 0 (farthest orbit) and 1 (closest orbit),
     * with a subtle sine-wave pulse layered on top for a breathing effect.
     */
    getStarProximityGlow(planet) {
        const planets = this.solarSystem.planets;
        const distances = planets.map(p => p.distance);
        const minDist = Math.min(...distances);
        const maxDist = Math.max(...distances);

        // Normalise distance to [0,1] then invert so closer = higher base intensity
        const distRange = maxDist - minDist;
        const baseIntensity = distRange > 0
            ? 1 - (planet.distance - minDist) / distRange
            : 0.5;

        // Subtle breathing pulse — frequency varies slightly so each planet feels unique
        const pulseFreq = 0.0006 + baseIntensity * 0.0004;
        const pulse = Math.sin(this.animationTime * pulseFreq) * 0.12;

        return Math.max(0, Math.min(1, baseIntensity + pulse));
    }

    /**
     * Draw a single planet
     */
    drawPlanet(planet, isHovered = false) {
        const pos = this.getPlanetPosition(planet);
        const canvasPos = this.toCanvasCoords(pos.x, pos.y);
        const radius = planet.size / 2;

        // --- Search highlight glow ---
        // Drawn beneath the star-proximity glow so the warm tint still shows on top.
        if (this.highlightedPlanets.has(planet)) {
            const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 0.003);
            const hlRadius = radius * (2.6 + pulse * 0.9);
            const hlOpacity = 0.22 + pulse * 0.33;

            const hlGrad = this.ctx.createRadialGradient(
                canvasPos.x, canvasPos.y, radius * 0.5,
                canvasPos.x, canvasPos.y, hlRadius
            );
            hlGrad.addColorStop(0, `rgba(100, 220, 255, ${hlOpacity.toFixed(3)})`);
            hlGrad.addColorStop(1, 'rgba(100, 220, 255, 0)');

            this.ctx.fillStyle = hlGrad;
            this.ctx.beginPath();
            this.ctx.arc(canvasPos.x, canvasPos.y, hlRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // Bright cyan ring
            const ringAlpha = (0.55 + pulse * 0.45).toFixed(3);
            this.ctx.strokeStyle = `rgba(100, 220, 255, ${ringAlpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(canvasPos.x, canvasPos.y, radius + 5, 0, Math.PI * 2);
            this.ctx.stroke();

            // Name label always visible while highlighted
            this.ctx.fillStyle = 'rgba(140, 230, 255, 0.95)';
            this.ctx.font = '13px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(planet.name, canvasPos.x, canvasPos.y - radius - 8);
        }

        // --- Star proximity glow ---
        // A warm halo whose size and opacity intensify as the planet nears its star.
        const glowIntensity = this.getStarProximityGlow(planet);
        const star = this.solarSystem.star;

        // Blend star colour with the planet's own colour for a believable warm tint
        const glowR = Math.round(star.color.r * 0.55 + planet.color.r * 0.45);
        const glowG = Math.round(star.color.g * 0.55 + planet.color.g * 0.45);
        const glowB = Math.round(star.color.b * 0.55 + planet.color.b * 0.45);

        // Glow disc grows from 1.8× to 3.2× the planet's radius
        const glowRadius = radius * (1.8 + glowIntensity * 1.4);
        const glowOpacity = 0.08 + glowIntensity * 0.32; // 0.08 → 0.40

        const proximityGlow = this.ctx.createRadialGradient(
            canvasPos.x, canvasPos.y, radius * 0.4,
            canvasPos.x, canvasPos.y, glowRadius
        );
        proximityGlow.addColorStop(0, `rgba(${glowR}, ${glowG}, ${glowB}, ${glowOpacity.toFixed(3)})`);
        proximityGlow.addColorStop(1, `rgba(${glowR}, ${glowG}, ${glowB}, 0)`);

        this.ctx.fillStyle = proximityGlow;
        this.ctx.beginPath();
        this.ctx.arc(canvasPos.x, canvasPos.y, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Hover glow
        if (isHovered) {
            const glowGradient = this.ctx.createRadialGradient(
                canvasPos.x, canvasPos.y, radius,
                canvasPos.x, canvasPos.y, radius * 2
            );
            glowGradient.addColorStop(0, `rgba(${planet.color.r}, ${planet.color.g}, ${planet.color.b}, 0.3)`);
            glowGradient.addColorStop(1, `rgba(${planet.color.r}, ${planet.color.g}, ${planet.color.b}, 0)`);
            
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(canvasPos.x, canvasPos.y, radius * 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Planet gradient for 3D effect
        const gradient = this.ctx.createRadialGradient(
            canvasPos.x - radius / 3,
            canvasPos.y - radius / 3,
            radius / 4,
            canvasPos.x,
            canvasPos.y,
            radius
        );
        
        // Proximity-driven brightness boost: up to +25 RGB on the highlight
        const brightBoost = Math.round(glowIntensity * 25);
        const lightColor = `rgb(${Math.min(255, planet.color.r + 40 + brightBoost)}, ${Math.min(255, planet.color.g + 40 + brightBoost)}, ${Math.min(255, planet.color.b + 40 + brightBoost)})`;
        const darkColor = `rgb(${Math.max(0, planet.color.r - 40)}, ${Math.max(0, planet.color.g - 40)}, ${Math.max(0, planet.color.b - 40)})`;
        
        gradient.addColorStop(0, lightColor);
        gradient.addColorStop(0.7, `rgb(${planet.color.r}, ${planet.color.g}, ${planet.color.b})`);
        gradient.addColorStop(1, darkColor);
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(canvasPos.x, canvasPos.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Outline
        this.ctx.strokeStyle = isHovered ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = isHovered ? 2 : 1;
        this.ctx.stroke();
        
        // Label on hover
        if (isHovered) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(planet.name, canvasPos.x, canvasPos.y + radius + 20);
        }
    }
    
    /**
     * Draw stars background
     */
    drawStarfield() {
        // Simple starfield for ambience
        this.ctx.fillStyle = '#fff';
        const starCount = 200;
        const seed = this.solarSystem.seed;
        
        for (let i = 0; i < starCount; i++) {
            const x = ((seed + i * 123) % this.canvas.width);
            const y = ((seed + i * 456) % this.canvas.height);
            const size = ((seed + i * 789) % 3) / 2;
            const opacity = 0.3 + ((seed + i * 234) % 70) / 100;
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    /**
     * Check if a point is inside a planet
     */
    checkPlanetClick(canvasX, canvasY) {
        for (const planet of this.solarSystem.planets) {
            const pos = this.getPlanetPosition(planet);
            const canvasPos = this.toCanvasCoords(pos.x, pos.y);
            const radius = planet.size / 2;
            
            const distance = Math.sqrt(
                Math.pow(canvasX - canvasPos.x, 2) +
                Math.pow(canvasY - canvasPos.y, 2)
            );
            
            if (distance <= radius) {
                return planet;
            }
        }
        
        return null;
    }
    
    /**
     * Update hover state based on mouse position
     */
    updateHover(canvasX, canvasY) {
        this.hoveredPlanet = this.checkPlanetClick(canvasX, canvasY);
        this.canvas.style.cursor = this.hoveredPlanet ? 'pointer' : 'default';
    }
    
    /**
     * Update the set of planets that should be highlighted by the search feature.
     * Pass an empty array (or call with no argument) to clear all highlights.
     */
    setSearchHighlights(planets = []) {
        this.highlightedPlanets = new Set(planets);
    }

    /**
     * Animate the camera to centre on the given planet's current position.
     * The view snaps immediately (no tween) for simplicity.
     */
    centerCameraOn(planet) {
        const pos = this.getPlanetPosition(planet);
        this.cameraOffsetX = -pos.x * this.scale;
        this.cameraOffsetY = -pos.y * this.scale;
    }

    /**
     * Reset the camera back to the default centred-on-star position.
     */
    resetCamera() {
        this.cameraOffsetX = 0;
        this.cameraOffsetY = 0;
    }

    /**
     * Render the complete scene
     */
    render(deltaTime = 0) {
        this.animationTime += deltaTime;
        
        // Clear canvas
        this.ctx.fillStyle = '#0a0e27';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background stars
        this.drawStarfield();
        
        // Draw orbits
        this.drawOrbits();
        
        // Draw star
        this.drawStar();
        
        // Draw planets
        this.solarSystem.planets.forEach(planet => {
            const isHovered = this.hoveredPlanet === planet;
            this.drawPlanet(planet, isHovered);
        });
    }
}
