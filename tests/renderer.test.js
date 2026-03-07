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
    
    describe('drawOrbits', () => {
        let ctx;
        
        beforeEach(() => {
            ctx = renderer.ctx;
            // Spy on canvas context methods
            vi.spyOn(ctx, 'beginPath');
            vi.spyOn(ctx, 'arc');
            vi.spyOn(ctx, 'stroke');
            vi.spyOn(ctx, 'createRadialGradient');
        });
        
        it('should draw orbit for each planet', () => {
            renderer.drawOrbits();
            
            // Should call arc once per planet
            expect(ctx.arc).toHaveBeenCalledTimes(solarSystem.planets.length);
        });
        
        it('should use radial gradient for fade effect', () => {
            renderer.drawOrbits();
            
            // Should create gradient for each planet
            expect(ctx.createRadialGradient).toHaveBeenCalledTimes(solarSystem.planets.length);
        });
        
        it('should scale line thickness with zoom level', () => {
            // Test at default scale (60)
            renderer.scale = 60;
            renderer.drawOrbits();
            const defaultLineWidth = ctx.lineWidth;
            
            // Test at higher zoom (more zoomed in)
            renderer.scale = 120;
            renderer.drawOrbits();
            const zoomedInLineWidth = ctx.lineWidth;
            
            // Line should be thicker when zoomed in
            expect(zoomedInLineWidth).toBeGreaterThan(defaultLineWidth);
            
            // Test at lower zoom (more zoomed out)
            renderer.scale = 30;
            renderer.drawOrbits();
            const zoomedOutLineWidth = ctx.lineWidth;
            
            // Line should be thinner when zoomed out
            expect(zoomedOutLineWidth).toBeLessThan(defaultLineWidth);
        });
        
        it('should clamp line width to reasonable bounds', () => {
            // Test extreme zoom out
            renderer.scale = 1;
            renderer.drawOrbits();
            expect(ctx.lineWidth).toBeGreaterThanOrEqual(0.5);
            
            // Test extreme zoom in
            renderer.scale = 500;
            renderer.drawOrbits();
            expect(ctx.lineWidth).toBeLessThanOrEqual(2.5);
        });
        
        it('should draw orbits at correct radius for each planet', () => {
            renderer.drawOrbits();
            
            // Check that each planet's orbit was drawn with correct radius
            solarSystem.planets.forEach((planet, index) => {
                const expectedRadius = planet.distance * renderer.scale;
                const callArgs = ctx.arc.mock.calls[index];
                
                // arc(x, y, radius, startAngle, endAngle)
                expect(callArgs[2]).toBeCloseTo(expectedRadius, 1);
            });
        });
        
        it('should draw orbits as complete circles', () => {
            renderer.drawOrbits();
            
            // Each orbit should be a full circle (0 to 2π)
            solarSystem.planets.forEach((planet, index) => {
                const callArgs = ctx.arc.mock.calls[index];
                
                // arc(x, y, radius, startAngle, endAngle)
                expect(callArgs[3]).toBe(0); // startAngle
                expect(callArgs[4]).toBe(Math.PI * 2); // endAngle
            });
        });
        
        it('should not throw errors when rendering orbits', () => {
            expect(() => renderer.drawOrbits()).not.toThrow();
        });
    });
});
