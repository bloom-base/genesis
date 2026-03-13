import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SolarSystemRenderer } from '../src/renderer.js';
import { generateSolarSystem } from '../src/generation.js';

describe('SolarSystemRenderer', () => {
    let canvas;
    let solarSystem;
    let renderer;
    
    beforeEach(() => {
        // Create a mock canvas
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        
        // Generate a test solar system
        solarSystem = generateSolarSystem(42);
        
        // Create renderer
        renderer = new SolarSystemRenderer(canvas, solarSystem);
    });
    
    describe('initialization', () => {
        it('should initialize with correct properties', () => {
            expect(renderer.canvas).toBe(canvas);
            expect(renderer.ctx).toBeDefined();
            expect(renderer.solarSystem).toBe(solarSystem);
            expect(renderer.scale).toBeGreaterThan(0);
            expect(renderer.centerX).toBeDefined();
            expect(renderer.centerY).toBeDefined();
        });
        
        it('should set center to middle of canvas', () => {
            expect(renderer.centerX).toBe(canvas.width / 2);
            expect(renderer.centerY).toBe(canvas.height / 2);
        });
    });
    
    describe('coordinate conversion', () => {
        it('should convert solar system coords to canvas coords', () => {
            const result = renderer.toCanvasCoords(0, 0);
            
            expect(result.x).toBe(renderer.centerX);
            expect(result.y).toBe(renderer.centerY);
        });
        
        it('should convert canvas coords to solar system coords', () => {
            const result = renderer.fromCanvasCoords(renderer.centerX, renderer.centerY);
            
            expect(result.x).toBeCloseTo(0, 5);
            expect(result.y).toBeCloseTo(0, 5);
        });
        
        it('should have inverse relationship between conversions', () => {
            const original = { x: 2.5, y: -1.3 };
            const canvas = renderer.toCanvasCoords(original.x, original.y);
            const converted = renderer.fromCanvasCoords(canvas.x, canvas.y);
            
            expect(converted.x).toBeCloseTo(original.x, 5);
            expect(converted.y).toBeCloseTo(original.y, 5);
        });
    });
    
    describe('getPlanetPosition', () => {
        it('should return position with x, y, and angle', () => {
            const planet = solarSystem.planets[0];
            const position = renderer.getPlanetPosition(planet);
            
            expect(position).toHaveProperty('x');
            expect(position).toHaveProperty('y');
            expect(position).toHaveProperty('angle');
        });
        
        it('should return position at correct distance from origin', () => {
            const planet = solarSystem.planets[0];
            const position = renderer.getPlanetPosition(planet);
            
            const distance = Math.sqrt(position.x * position.x + position.y * position.y);
            expect(distance).toBeCloseTo(planet.distance, 5);
        });
        
        it('should update position based on animation time', () => {
            const planet = solarSystem.planets[0];
            
            renderer.animationTime = 0;
            const pos1 = renderer.getPlanetPosition(planet);
            
            renderer.animationTime = 10000;
            const pos2 = renderer.getPlanetPosition(planet);
            
            // Position should change over time
            expect(pos1.angle).not.toEqual(pos2.angle);
        });
    });
    
    describe('checkPlanetClick', () => {
        it('should return null when clicking empty space', () => {
            const centerCanvas = renderer.toCanvasCoords(0, 0);
            const result = renderer.checkPlanetClick(centerCanvas.x, centerCanvas.y);
            
            expect(result).toBeNull();
        });
        
        it('should return planet when clicking on it', () => {
            const planet = solarSystem.planets[0];
            const pos = renderer.getPlanetPosition(planet);
            const canvasPos = renderer.toCanvasCoords(pos.x, pos.y);
            
            const result = renderer.checkPlanetClick(canvasPos.x, canvasPos.y);
            
            expect(result).toBe(planet);
        });
        
        it('should return null when clicking just outside planet', () => {
            const planet = solarSystem.planets[0];
            const pos = renderer.getPlanetPosition(planet);
            const canvasPos = renderer.toCanvasCoords(pos.x, pos.y);
            
            // Click just outside the planet radius
            const outsideX = canvasPos.x + planet.size / 2 + 5;
            const outsideY = canvasPos.y + planet.size / 2 + 5;
            
            const result = renderer.checkPlanetClick(outsideX, outsideY);
            
            expect(result).toBeNull();
        });
        
        it('should detect clicks on any planet', () => {
            // Test clicking on each planet
            for (const planet of solarSystem.planets) {
                const pos = renderer.getPlanetPosition(planet);
                const canvasPos = renderer.toCanvasCoords(pos.x, pos.y);
                
                const result = renderer.checkPlanetClick(canvasPos.x, canvasPos.y);
                
                expect(result).toBe(planet);
            }
        });
    });
    
    describe('updateHover', () => {
        it('should set hoveredPlanet when hovering over planet', () => {
            const planet = solarSystem.planets[0];
            const pos = renderer.getPlanetPosition(planet);
            const canvasPos = renderer.toCanvasCoords(pos.x, pos.y);
            
            renderer.updateHover(canvasPos.x, canvasPos.y);
            
            expect(renderer.hoveredPlanet).toBe(planet);
        });
        
        it('should clear hoveredPlanet when not hovering', () => {
            renderer.hoveredPlanet = solarSystem.planets[0];
            
            const centerCanvas = renderer.toCanvasCoords(0, 0);
            renderer.updateHover(centerCanvas.x, centerCanvas.y);
            
            expect(renderer.hoveredPlanet).toBeNull();
        });
        
        it('should change cursor style based on hover', () => {
            const planet = solarSystem.planets[0];
            const pos = renderer.getPlanetPosition(planet);
            const canvasPos = renderer.toCanvasCoords(pos.x, pos.y);
            
            renderer.updateHover(canvasPos.x, canvasPos.y);
            expect(canvas.style.cursor).toBe('pointer');
            
            const centerCanvas = renderer.toCanvasCoords(0, 0);
            renderer.updateHover(centerCanvas.x, centerCanvas.y);
            expect(canvas.style.cursor).toBe('default');
        });
    });
    
    describe('render', () => {
        it('should not throw errors when rendering', () => {
            expect(() => renderer.render(0)).not.toThrow();
        });
        
        it('should update animation time', () => {
            const initialTime = renderer.animationTime;
            renderer.render(16.67); // ~60fps frame
            
            expect(renderer.animationTime).toBe(initialTime + 16.67);
        });
        
        it('should handle zero deltaTime', () => {
            expect(() => renderer.render(0)).not.toThrow();
        });
    });
    
    describe('resize', () => {
        it('should update center coordinates on resize', () => {
            canvas.width = 1920;
            canvas.height = 1080;
            
            renderer.resize();
            
            expect(renderer.centerX).toBe(960);
            expect(renderer.centerY).toBe(540);
        });
    });
});

describe('SolarSystemRenderer - Camera Animation', () => {
    let canvas;
    let renderer;
    let solarSystem;
    let rafCallbacks;
    let rafId;
    
    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        
        solarSystem = {
            planets: [
                {
                    name: 'TestPlanet',
                    distance: 1.0,
                    radius: 0.05,
                    speed: 0.5,
                    color: '#ff0000',
                    angle: 0,
                    x: 1.0,
                    y: 0
                }
            ]
        };
        
        renderer = new SolarSystemRenderer(canvas, solarSystem);
        
        // Mock requestAnimationFrame
        rafCallbacks = [];
        rafId = 0;
        global.requestAnimationFrame = vi.fn((callback) => {
            rafCallbacks.push(callback);
            return ++rafId;
        });
        
        global.cancelAnimationFrame = vi.fn();
        
        // Mock performance.now
        let now = 0;
        global.performance = {
            now: vi.fn(() => now)
        };
        
        global.advanceTime = (ms) => {
            now += ms;
        };
    });
    
    afterEach(() => {
        vi.restoreAllMocks();
    });
    
    describe('getCameraAnimator', () => {
        it('should return camera animator instance', () => {
            const animator = renderer.getCameraAnimator();
            expect(animator).toBeDefined();
            expect(animator.getCamera).toBeDefined();
        });
    });
    
    describe('isInteractionBlocked', () => {
        it('should return false when not animating', () => {
            expect(renderer.isInteractionBlocked()).toBe(false);
        });
        
        it('should return true during animation', () => {
            const planet = solarSystem.planets[0];
            renderer.zoomToPlanet(planet);
            expect(renderer.isInteractionBlocked()).toBe(true);
        });
        
        it('should return false after animation completes', () => {
            const planet = solarSystem.planets[0];
            renderer.zoomToPlanet(planet);
            
            // Execute animation to completion
            const callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(800);
            callback(performance.now());
            
            expect(renderer.isInteractionBlocked()).toBe(false);
        });
    });
    
    describe('zoomToPlanet', () => {
        it('should start camera animation', () => {
            const planet = solarSystem.planets[0];
            const onComplete = vi.fn();
            
            renderer.zoomToPlanet(planet, onComplete);
            
            expect(renderer.isInteractionBlocked()).toBe(true);
            expect(global.requestAnimationFrame).toHaveBeenCalled();
        });
        
        it('should call onComplete callback when animation finishes', () => {
            const planet = solarSystem.planets[0];
            const onComplete = vi.fn();
            
            renderer.zoomToPlanet(planet, onComplete);
            
            // Execute animation to completion
            const callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(800);
            callback(performance.now());
            
            expect(onComplete).toHaveBeenCalled();
        });
        
        it('should trigger re-render during animation', () => {
            const planet = solarSystem.planets[0];
            const renderSpy = vi.spyOn(renderer, 'render');
            
            renderer.zoomToPlanet(planet);
            
            // Execute one animation frame
            const callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(100);
            callback(performance.now());
            
            expect(renderSpy).toHaveBeenCalled();
        });
    });
    
    describe('zoomToSystemView', () => {
        it('should animate back to default view', () => {
            const onComplete = vi.fn();
            
            renderer.zoomToSystemView(onComplete);
            
            expect(renderer.isInteractionBlocked()).toBe(true);
            
            // Execute animation to completion
            const callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(800);
            callback(performance.now());
            
            const camera = renderer.getCameraAnimator().getCamera();
            expect(camera.x).toBe(0);
            expect(camera.y).toBe(0);
            expect(camera.scale).toBe(1);
            expect(onComplete).toHaveBeenCalled();
        });
    });
    
    describe('toCanvasCoords with camera', () => {
        it('should apply camera translation', () => {
            const animator = renderer.getCameraAnimator();
            animator.setCamera(100, 50, 1);
            
            const coords = renderer.toCanvasCoords(0, 0);
            
            expect(coords.x).toBe(renderer.centerX + 100);
            expect(coords.y).toBe(renderer.centerY + 50);
        });
        
        it('should apply camera scale', () => {
            const animator = renderer.getCameraAnimator();
            animator.setCamera(0, 0, 2);
            
            const coords = renderer.toCanvasCoords(1, 0);
            
            // With scale 2, 1 AU should be 2 * baseScale pixels from center
            expect(coords.x).toBe(renderer.centerX + 1 * renderer.scale * 2);
        });
    });
    
    describe('fromCanvasCoords with camera', () => {
        it('should convert back from canvas coords with camera transform', () => {
            const animator = renderer.getCameraAnimator();
            animator.setCamera(100, 50, 2);
            
            const worldCoords = { x: 1.5, y: 2.0 };
            const canvasCoords = renderer.toCanvasCoords(worldCoords.x, worldCoords.y);
            const backToWorld = renderer.fromCanvasCoords(canvasCoords.x, canvasCoords.y);
            
            expect(backToWorld.x).toBeCloseTo(worldCoords.x);
            expect(backToWorld.y).toBeCloseTo(worldCoords.y);
        });
    });
    
    describe('updateHover during animation', () => {
        it('should not update hover state during animation', () => {
            const planet = solarSystem.planets[0];
            const pos = renderer.getPlanetPosition(planet);
            const canvasPos = renderer.toCanvasCoords(pos.x, pos.y);
            
            // Start animation
            renderer.zoomToPlanet(planet);
            
            // Try to hover
            renderer.updateHover(canvasPos.x, canvasPos.y);
            
            // Hover should not be set during animation
            expect(renderer.hoveredPlanet).toBeNull();
        });
        
        it('should update hover state after animation completes', () => {
            const planet = solarSystem.planets[0];
            
            // Start and complete animation
            renderer.zoomToPlanet(planet);
            const callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(800);
            callback(performance.now());
            
            // Now hover should work
            const pos = renderer.getPlanetPosition(planet);
            const canvasPos = renderer.toCanvasCoords(pos.x, pos.y);
            renderer.updateHover(canvasPos.x, canvasPos.y);
            
            expect(renderer.hoveredPlanet).toBe(planet);
        });
    });
});
