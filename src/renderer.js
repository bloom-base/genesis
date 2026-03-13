import { CameraAnimator } from './cameraAnimation.js';

/**
 * Canvas renderer for the solar system
 * Handles drawing planets, orbits, and click detection
 */
export class SolarSystemRenderer {
    constructor(canvas, solarSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.solarSystem = solarSystem;
        this.scale = 60; // Pixels per AU (base scale)
        this.centerX = 0;
        this.centerY = 0;
        this.hoveredPlanet = null;
        this.animationTime = 0;
        this.cameraAnimator = new CameraAnimator();
        
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
     * Check if interactions should be blocked (during camera animation)
     */
    isInteractionBlocked() {
        return this.cameraAnimator.isAnimationInProgress();
    }

    /**
     * Get the camera animator instance
     */
    getCameraAnimator() {
        return this.cameraAnimator;
    }

    /**
     * Zoom camera to focus on a planet
     */
    zoomToPlanet(planet, onComplete) {
        // Calculate planet's world position
        const planetWorldPos = {
            x: planet.x,
            y: planet.y,
            radius: planet.radius * this.scale
        };
        
        this.cameraAnimator.zoomToPlanet(
            planetWorldPos,
            this.canvas.width,
            this.canvas.height,
            800, // duration
            () => this.render(0), // re-render each frame
            onComplete
        );
    }

    /**
     * Zoom camera back to system view
     */
    zoomToSystemView(onComplete) {
        this.cameraAnimator.zoomToSystemView(
            this.canvas.width,
            this.canvas.height,
            800, // duration
            () => this.render(0), // re-render each frame
            onComplete
        );
    }
    
    /**
     * Convert solar system coordinates (AU) to canvas coordinates (pixels)
     */
    toCanvasCoords(x, y) {
        const camera = this.cameraAnimator.getCamera();
        const effectiveScale = this.scale * camera.scale;
        return {
            x: this.centerX + camera.x + x * effectiveScale,
            y: this.centerY + camera.y + y * effectiveScale
        };
    }
    
    /**
     * Convert canvas coordinates to solar system coordinates
     */
    fromCanvasCoords(canvasX, canvasY) {
        const camera = this.cameraAnimator.getCamera();
        const effectiveScale = this.scale * camera.scale;
        return {
            x: (canvasX - this.centerX - camera.x) / effectiveScale,
            y: (canvasY - this.centerY - camera.y) / effectiveScale
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
        const camera = this.cameraAnimator.getCamera();
        this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.15)';
        this.ctx.lineWidth = 1;
        
        this.solarSystem.planets.forEach(planet => {
            const center = this.toCanvasCoords(0, 0);
            const radius = planet.distance * this.scale * camera.scale;
            
            this.ctx.beginPath();
            this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        });
    }
    
    /**
     * Draw a single planet
     */
    drawPlanet(planet, isHovered = false) {
        const pos = this.getPlanetPosition(planet);
        const canvasPos = this.toCanvasCoords(pos.x, pos.y);
        const radius = planet.size / 2;
        
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
        
        const lightColor = `rgb(${Math.min(255, planet.color.r + 40)}, ${Math.min(255, planet.color.g + 40)}, ${Math.min(255, planet.color.b + 40)})`;
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
        // Block hover updates during animation
        if (this.isInteractionBlocked()) {
            return;
        }
        
        this.hoveredPlanet = this.checkPlanetClick(canvasX, canvasY);
        this.canvas.style.cursor = this.hoveredPlanet ? 'pointer' : 'default';
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
