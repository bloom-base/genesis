/**
 * Integration tests for camera animation with renderer
 */

import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
    <body>
        <canvas id="canvas" width="800" height="600"></canvas>
    </body>
    </html>
`);

global.window = dom.window;
global.document = dom.window.document;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;

// Mock canvas context
HTMLCanvasElement.prototype.getContext = function() {
    return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        globalAlpha: 1,
        fillRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        moveTo: () => {},
        lineTo: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        scale: () => {},
        createRadialGradient: () => ({
            addColorStop: () => {}
        })
    };
};

// Mock resize event
global.addEventListener = () => {};

import { SolarSystemRenderer } from './src/renderer.js';

console.log('🧪 Running integration tests...\n');

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
        toBeDefined() {
            if (value === undefined || value === null) {
                throw new Error(`Expected value to be defined, got ${value}`);
            }
        },
        toBeNull() {
            if (value !== null) {
                throw new Error(`Expected null, got ${value}`);
            }
        }
    };
}

// Mock animation frame
let rafCallbacks = [];
let rafId = 0;
let now = 0;

global.requestAnimationFrame = (callback) => {
    rafCallbacks.push(callback);
    return ++rafId;
};

global.cancelAnimationFrame = () => {};
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

// Create test solar system
const solarSystem = {
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

console.log('Testing renderer integration...');

test('renderer should have camera animator', () => {
    const canvas = document.getElementById('canvas');
    const renderer = new SolarSystemRenderer(canvas, solarSystem);
    const animator = renderer.getCameraAnimator();
    expect(animator).toBeDefined();
});

test('renderer should not be blocked initially', () => {
    const canvas = document.getElementById('canvas');
    const renderer = new SolarSystemRenderer(canvas, solarSystem);
    expect(renderer.isInteractionBlocked()).toBe(false);
});

test('renderer should be blocked during animation', () => {
    rafCallbacks = [];
    const canvas = document.getElementById('canvas');
    const renderer = new SolarSystemRenderer(canvas, solarSystem);
    const planet = solarSystem.planets[0];
    
    renderer.zoomToPlanet(planet);
    expect(renderer.isInteractionBlocked()).toBe(true);
});

test('renderer should unblock after animation completes', () => {
    rafCallbacks = [];
    now = 0;
    const canvas = document.getElementById('canvas');
    const renderer = new SolarSystemRenderer(canvas, solarSystem);
    const planet = solarSystem.planets[0];
    
    renderer.zoomToPlanet(planet);
    
    advanceTime(800);
    executeFrame();
    
    expect(renderer.isInteractionBlocked()).toBe(false);
});

test('coordinate transforms should apply camera state', () => {
    const canvas = document.getElementById('canvas');
    const renderer = new SolarSystemRenderer(canvas, solarSystem);
    const animator = renderer.getCameraAnimator();
    
    animator.setCamera(100, 50, 2);
    
    const coords = renderer.toCanvasCoords(0, 0);
    expect(coords.x).toBe(renderer.centerX + 100);
    expect(coords.y).toBe(renderer.centerY + 50);
});

test('hover should not update during animation', () => {
    rafCallbacks = [];
    const canvas = document.getElementById('canvas');
    const renderer = new SolarSystemRenderer(canvas, solarSystem);
    const planet = solarSystem.planets[0];
    
    renderer.zoomToPlanet(planet);
    renderer.updateHover(400, 300);
    
    expect(renderer.hoveredPlanet).toBeNull();
});

console.log('\n' + '='.repeat(50));
console.log(`Integration Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
    process.exit(1);
} else {
    console.log('\n✅ All integration tests passed!');
    process.exit(0);
}
