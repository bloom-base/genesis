/**
 * Minimal test runner to verify camera animation functionality
 * Used when npm install/vitest is unavailable
 */

import { CameraAnimator } from './src/cameraAnimation.js';

console.log('🧪 Running manual tests for CameraAnimator...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (error) {
        console.log(`✗ ${name}`);
        console.log(`  Error: ${error.message}`);
        failed++;
    }
}

function expect(value) {
    return {
        toBe(expected) {
            if (value !== expected) {
                throw new Error(`Expected ${expected}, got ${value}`);
            }
        },
        toBeGreaterThan(expected) {
            if (value <= expected) {
                throw new Error(`Expected ${value} to be greater than ${expected}`);
            }
        },
        toBeLessThan(expected) {
            if (value >= expected) {
                throw new Error(`Expected ${value} to be less than ${expected}`);
            }
        },
        toBeLessThanOrEqual(expected) {
            if (value > expected) {
                throw new Error(`Expected ${value} to be less than or equal to ${expected}`);
            }
        },
        toBeCloseTo(expected, precision = 2) {
            const diff = Math.abs(value - expected);
            const threshold = Math.pow(10, -precision);
            if (diff > threshold) {
                throw new Error(`Expected ${value} to be close to ${expected}`);
            }
        }
    };
}

// Mock globals for animation frame
let rafCallbacks = [];
let rafId = 0;
let now = 0;

global.requestAnimationFrame = (callback) => {
    rafCallbacks.push(callback);
    return ++rafId;
};

global.cancelAnimationFrame = (id) => {
    // Simple mock
};

global.performance = {
    now: () => now
};

function advanceTime(ms) {
    now += ms;
}

function executeFrame() {
    if (rafCallbacks.length > 0) {
        const callback = rafCallbacks[rafCallbacks.length - 1];
        callback(now);
    }
}

// ============ Tests ============

console.log('Testing CameraAnimator initialization...');
test('should initialize with default camera state', () => {
    const animator = new CameraAnimator();
    const camera = animator.getCamera();
    expect(camera.x).toBe(0);
    expect(camera.y).toBe(0);
    expect(camera.scale).toBe(1);
});

test('should not be animating initially', () => {
    const animator = new CameraAnimator();
    expect(animator.isAnimationInProgress()).toBe(false);
});

console.log('\nTesting setCamera...');
test('should immediately set camera position', () => {
    const animator = new CameraAnimator();
    animator.setCamera(100, 200, 2);
    const camera = animator.getCamera();
    expect(camera.x).toBe(100);
    expect(camera.y).toBe(200);
    expect(camera.scale).toBe(2);
});

console.log('\nTesting animateTo...');
test('should start animation', () => {
    rafCallbacks = [];
    const animator = new CameraAnimator();
    animator.animateTo({ x: 100, y: 100, scale: 2 }, 1000);
    expect(animator.isAnimationInProgress()).toBe(true);
    expect(rafCallbacks.length).toBeGreaterThan(0);
});

test('should reach target values at end of animation', () => {
    rafCallbacks = [];
    now = 0;
    const animator = new CameraAnimator();
    animator.animateTo({ x: 100, y: 200, scale: 2 }, 1000);
    
    advanceTime(1000);
    executeFrame();
    
    const camera = animator.getCamera();
    expect(camera.x).toBe(100);
    expect(camera.y).toBe(200);
    expect(camera.scale).toBe(2);
});

test('should call onComplete when animation finishes', () => {
    rafCallbacks = [];
    now = 0;
    const animator = new CameraAnimator();
    let completed = false;
    
    animator.animateTo({ x: 100, y: 100, scale: 2 }, 1000, null, () => {
        completed = true;
    });
    
    advanceTime(1000);
    executeFrame();
    
    expect(completed).toBe(true);
    expect(animator.isAnimationInProgress()).toBe(false);
});

console.log('\nTesting zoomToPlanet...');
test('should calculate correct zoom target', () => {
    rafCallbacks = [];
    now = 0;
    const animator = new CameraAnimator();
    const planet = {
        x: 100,
        y: 100,
        radius: 20
    };
    
    animator.zoomToPlanet(planet, 800, 600, 1000);
    expect(animator.isAnimationInProgress()).toBe(true);
    
    advanceTime(1000);
    executeFrame();
    
    const camera = animator.getCamera();
    expect(camera.scale).toBeGreaterThan(1);
});

test('should limit maximum zoom level', () => {
    rafCallbacks = [];
    now = 0;
    const animator = new CameraAnimator();
    const planet = {
        x: 10,
        y: 10,
        radius: 1
    };
    
    animator.zoomToPlanet(planet, 800, 600, 1000);
    
    advanceTime(1000);
    executeFrame();
    
    const camera = animator.getCamera();
    expect(camera.scale).toBeLessThanOrEqual(3.0);
});

console.log('\nTesting zoomToSystemView...');
test('should return to default camera position', () => {
    rafCallbacks = [];
    now = 0;
    const animator = new CameraAnimator();
    animator.setCamera(100, 100, 2);
    
    animator.zoomToSystemView(800, 600, 1000);
    
    advanceTime(1000);
    executeFrame();
    
    const camera = animator.getCamera();
    expect(camera.x).toBe(0);
    expect(camera.y).toBe(0);
    expect(camera.scale).toBe(1);
});

console.log('\nTesting cancelAnimation...');
test('should stop animation in progress', () => {
    rafCallbacks = [];
    const animator = new CameraAnimator();
    animator.animateTo({ x: 100, y: 100, scale: 2 }, 1000);
    expect(animator.isAnimationInProgress()).toBe(true);
    
    animator.cancelAnimation();
    expect(animator.isAnimationInProgress()).toBe(false);
});

console.log('\nTesting error handling...');
test('should handle invalid target in animateTo', () => {
    const animator = new CameraAnimator();
    const originalError = console.error;
    let errorCalled = false;
    console.error = () => { errorCalled = true; };
    
    animator.animateTo(null, 1000);
    console.error = originalError;
    
    expect(errorCalled).toBe(true);
});

test('should handle invalid scale in setCamera', () => {
    const animator = new CameraAnimator();
    const originalError = console.error;
    let errorCalled = false;
    console.error = () => { errorCalled = true; };
    
    animator.setCamera(0, 0, -1);
    console.error = originalError;
    
    expect(errorCalled).toBe(true);
});

test('should handle invalid planet in zoomToPlanet', () => {
    const animator = new CameraAnimator();
    const originalError = console.error;
    let errorCalled = false;
    console.error = () => { errorCalled = true; };
    
    animator.zoomToPlanet(null, 800, 600);
    console.error = originalError;
    
    expect(errorCalled).toBe(true);
});

// ============ Results ============

console.log('\n' + '='.repeat(50));
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));
