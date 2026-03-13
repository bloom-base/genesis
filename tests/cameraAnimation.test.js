import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CameraAnimator } from '../src/cameraAnimation.js';

describe('CameraAnimator', () => {
    let animator;
    let rafCallbacks = [];
    let rafId = 0;
    
    beforeEach(() => {
        animator = new CameraAnimator();
        
        // Mock requestAnimationFrame
        rafCallbacks = [];
        rafId = 0;
        global.requestAnimationFrame = vi.fn((callback) => {
            rafCallbacks.push(callback);
            return ++rafId;
        });
        
        global.cancelAnimationFrame = vi.fn((id) => {
            // Simple mock implementation
        });
        
        // Mock performance.now
        let now = 0;
        global.performance = {
            now: vi.fn(() => now)
        };
        
        // Helper to advance time
        global.advanceTime = (ms) => {
            now += ms;
        };
    });
    
    afterEach(() => {
        vi.restoreAllMocks();
    });
    
    describe('initialization', () => {
        it('should initialize with default camera state', () => {
            const camera = animator.getCamera();
            expect(camera.x).toBe(0);
            expect(camera.y).toBe(0);
            expect(camera.scale).toBe(1);
        });
        
        it('should not be animating initially', () => {
            expect(animator.isAnimationInProgress()).toBe(false);
        });
    });
    
    describe('getCamera', () => {
        it('should return a copy of camera state', () => {
            const camera1 = animator.getCamera();
            const camera2 = animator.getCamera();
            expect(camera1).toEqual(camera2);
            expect(camera1).not.toBe(camera2);
        });
    });
    
    describe('setCamera', () => {
        it('should immediately set camera position', () => {
            animator.setCamera(100, 200, 2);
            const camera = animator.getCamera();
            expect(camera.x).toBe(100);
            expect(camera.y).toBe(200);
            expect(camera.scale).toBe(2);
        });
        
        it('should cancel any ongoing animation', () => {
            animator.animateTo({ x: 100, y: 100, scale: 2 }, 1000);
            expect(animator.isAnimationInProgress()).toBe(true);
            
            animator.setCamera(50, 50, 1.5);
            expect(animator.isAnimationInProgress()).toBe(false);
        });
    });
    
    describe('cancelAnimation', () => {
        it('should stop animation in progress', () => {
            animator.animateTo({ x: 100, y: 100, scale: 2 }, 1000);
            expect(animator.isAnimationInProgress()).toBe(true);
            
            animator.cancelAnimation();
            expect(animator.isAnimationInProgress()).toBe(false);
        });
        
        it('should call cancelAnimationFrame', () => {
            animator.animateTo({ x: 100, y: 100, scale: 2 }, 1000);
            animator.cancelAnimation();
            expect(global.cancelAnimationFrame).toHaveBeenCalled();
        });
    });
    
    describe('animateTo', () => {
        it('should start animation', () => {
            animator.animateTo({ x: 100, y: 100, scale: 2 }, 1000);
            expect(animator.isAnimationInProgress()).toBe(true);
            expect(global.requestAnimationFrame).toHaveBeenCalled();
        });
        
        it('should call onUpdate callback during animation', () => {
            const onUpdate = vi.fn();
            animator.animateTo({ x: 100, y: 100, scale: 2 }, 1000, onUpdate);
            
            // Execute first frame
            const callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(500); // 50% through animation
            callback(performance.now());
            
            expect(onUpdate).toHaveBeenCalled();
        });
        
        it('should interpolate camera values over time', () => {
            animator.animateTo({ x: 100, y: 200, scale: 2 }, 1000);
            
            // Execute animation at 50% progress
            const callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(500);
            callback(performance.now());
            
            const camera = animator.getCamera();
            // Due to easing, value won't be exactly 50
            expect(camera.x).toBeGreaterThan(0);
            expect(camera.x).toBeLessThan(100);
            expect(camera.y).toBeGreaterThan(0);
            expect(camera.scale).toBeGreaterThan(1);
        });
        
        it('should reach target values at end of animation', () => {
            animator.animateTo({ x: 100, y: 200, scale: 2 }, 1000);
            
            // Execute animation at 100% progress
            const callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(1000);
            callback(performance.now());
            
            const camera = animator.getCamera();
            expect(camera.x).toBe(100);
            expect(camera.y).toBe(200);
            expect(camera.scale).toBe(2);
        });
        
        it('should call onComplete when animation finishes', () => {
            const onComplete = vi.fn();
            animator.animateTo({ x: 100, y: 100, scale: 2 }, 1000, null, onComplete);
            
            // Execute animation to completion
            const callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(1000);
            callback(performance.now());
            
            expect(onComplete).toHaveBeenCalled();
            expect(animator.isAnimationInProgress()).toBe(false);
        });
        
        it('should request animation frame until complete', () => {
            animator.animateTo({ x: 100, y: 100, scale: 2 }, 1000);
            
            const initialCallCount = rafCallbacks.length;
            
            // Execute first frame (not complete)
            let callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(100);
            callback(performance.now());
            
            // Should have requested another frame
            expect(rafCallbacks.length).toBeGreaterThan(initialCallCount);
        });
    });
    
    describe('zoomToPlanet', () => {
        it('should calculate correct target position and scale', () => {
            const planet = {
                x: 100,
                y: 100,
                radius: 20
            };
            
            const onComplete = vi.fn();
            animator.zoomToPlanet(planet, 800, 600, 1000, null, onComplete);
            
            // Animation should start
            expect(animator.isAnimationInProgress()).toBe(true);
            
            // Execute animation to completion
            const callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(1000);
            callback(performance.now());
            
            const camera = animator.getCamera();
            // Camera should have zoomed in (scale > 1)
            expect(camera.scale).toBeGreaterThan(1);
            expect(onComplete).toHaveBeenCalled();
        });
        
        it('should limit maximum zoom level', () => {
            const planet = {
                x: 10,
                y: 10,
                radius: 1 // Very small planet
            };
            
            animator.zoomToPlanet(planet, 800, 600, 1000);
            
            // Execute to completion
            const callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(1000);
            callback(performance.now());
            
            const camera = animator.getCamera();
            // Scale should be capped at 3.0
            expect(camera.scale).toBeLessThanOrEqual(3.0);
        });
        
        it('should center planet in viewport', () => {
            const planet = {
                x: 100,
                y: 50,
                radius: 10
            };
            
            const canvasWidth = 800;
            const canvasHeight = 600;
            
            animator.zoomToPlanet(planet, canvasWidth, canvasHeight, 1000);
            
            // Execute to completion
            const callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(1000);
            callback(performance.now());
            
            const camera = animator.getCamera();
            // Planet should be centered (accounting for scale)
            const expectedX = -planet.x * camera.scale + canvasWidth / 2;
            const expectedY = -planet.y * camera.scale + canvasHeight / 2;
            
            expect(camera.x).toBeCloseTo(expectedX);
            expect(camera.y).toBeCloseTo(expectedY);
        });
    });
    
    describe('zoomToSystemView', () => {
        it('should return to default camera position', () => {
            // First zoom to something
            animator.setCamera(100, 100, 2);
            
            const onComplete = vi.fn();
            animator.zoomToSystemView(800, 600, 1000, null, onComplete);
            
            // Execute to completion
            const callback = rafCallbacks[rafCallbacks.length - 1];
            global.advanceTime(1000);
            callback(performance.now());
            
            const camera = animator.getCamera();
            expect(camera.x).toBe(0);
            expect(camera.y).toBe(0);
            expect(camera.scale).toBe(1);
            expect(onComplete).toHaveBeenCalled();
        });
    });
});
